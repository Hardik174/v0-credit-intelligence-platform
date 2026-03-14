"""
classifier.py - Document type classification for IntelliCredit.

Three-layer classification cascade (stops at the first confident match):

  Layer 1 – Filename pattern matching
            Fast regex on the original filename. No disk I/O beyond stat.
            Catches well-named files like "annual_report_2023.pdf" immediately.

  Layer 2 – Content keyword matching
            Reads the first PDF_SNIFF_CHARS characters (or first 20 rows for
            tabular files) and searches for financial keyword patterns.
            Reliable for standard Indian financial document formats.

  Layer 3 – LLM classification (optional)
            Only invoked when layers 1 and 2 both return None and a Groq API
            key is available.  Keeps the pipeline offline-capable by default.

Public API:
    classify_document(filename, file_path, api_key="") -> str
    classify_many(files_dict, api_key="", overrides=None) -> dict[str, str]
"""

import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Recognised document type labels (shared with the rest of the pipeline)
# ---------------------------------------------------------------------------

DOCUMENT_TYPES: set = {
    "Annual Report",
    "GST Returns",
    "Bank Statement",
    "Sanction Letter",
    "Shareholding Pattern",
    "ALM",
    "Borrowing Profile",
    "Portfolio Data",
    "Legal Notice",
    "Unknown",
}

# How many characters to read for content-based classification
_CONTENT_SNIFF_CHARS = 4000

# ---------------------------------------------------------------------------
# Layer 1 – Filename patterns (case-insensitive regex)
# ---------------------------------------------------------------------------

_FILENAME_RULES: List[Tuple[str, str]] = [
    (r"annual[_\s\-]?report", "Annual Report"),
    (r"\bar[\s_\-]?\d{2,4}\b",  "Annual Report"),
    (r"gstr?[\s_\-]?\d",        "GST Returns"),
    (r"gst[_\s\-]return",       "GST Returns"),
    (r"gst[_\s\-]data",         "GST Returns"),
    (r"bank[_\s\-]?stat",       "Bank Statement"),
    (r"account[_\s\-]?stat",    "Bank Statement"),
    (r"passbook",               "Bank Statement"),
    (r"ledger",                 "Bank Statement"),
    (r"sanction[_\s\-]?letter", "Sanction Letter"),
    (r"sanction[_\s\-]?doc",    "Sanction Letter"),
    (r"credit[_\s\-]?letter",   "Sanction Letter"),
    (r"sharehold",              "Shareholding Pattern"),
    (r"promoter[_\s\-]?hold",   "Shareholding Pattern"),
    (r"\balm\b",                "ALM"),
    (r"asset[_\s\-]?liab",      "ALM"),
    (r"borrow[_\s\-]?profile",  "Borrowing Profile"),
    (r"debt[_\s\-]?profile",    "Borrowing Profile"),
    (r"portfolio[_\s\-]?(cut|data|perf)", "Portfolio Data"),
    (r"collection[_\s\-]?data", "Portfolio Data"),
    (r"legal[_\s\-]?notice",    "Legal Notice"),
    (r"notice[_\s\-]?drt",      "Legal Notice"),
    (r"litigation",             "Legal Notice"),
]


def _classify_by_filename(filename: str) -> Optional[str]:
    """Return doc type from filename pattern or None if no rule matches."""
    name_lower = Path(filename).name.lower()
    for pattern, doc_type in _FILENAME_RULES:
        if re.search(pattern, name_lower):
            return doc_type
    return None


# ---------------------------------------------------------------------------
# Layer 2 – Content keyword patterns (case-insensitive regex)
# ---------------------------------------------------------------------------

_CONTENT_RULES: List[Tuple[str, str]] = [
    # Annual Report keywords
    (
        r"directors?\s+report|auditors?\s+report|balance\s+sheet"
        r"|profit\s+.{0,5}\s*loss|notes\s+to\s+accounts|annual\s+report",
        "Annual Report",
    ),
    # GST Returns keywords
    (
        r"\bgstin\b|gstr-?[13]b?|invoice\s+value|taxable\s+value"
        r"|\bcgst\b|\bsgst\b|\bigst\b|buyer\s+gstin|seller\s+gstin",
        "GST Returns",
    ),
    # Bank Statement keywords
    (
        r"account\s+number|\bifsc\b|\bmicr\b|chq\.?\s*no"
        r"|transaction\s+id|opening\s+balance|closing\s+balance"
        r"|credit\s+amount|debit\s+amount|narration",
        "Bank Statement",
    ),
    # Sanction Letter keywords
    (
        r"sanction\s+limit|loan\s+sanctioned|sanctioned\s+amount"
        r"|rate\s+of\s+interest|repayment\s+schedule"
        r"|collateral|hypothecation|primary\s+security",
        "Sanction Letter",
    ),
    # Shareholding Pattern
    (
        r"folio\s+no|depository|pledged\s+shares|promoter\s+holding"
        r"|percentage\s+of\s+shares|demat|nsdl|cdsl",
        "Shareholding Pattern",
    ),
    # ALM
    (
        r"maturity\s+bucket|\balm\b|rate\s+sensitive"
        r"|net\s+interest\s+margin|asset.{0,10}liabilit",
        "ALM",
    ),
    # Borrowing Profile
    (
        r"credit\s+rating|\bcrr\b|outstanding\s+loan|consortium"
        r"|credit\s+facilit|working\s+capital\s+limit|cc\s+limit",
        "Borrowing Profile",
    ),
    # Portfolio Data
    (
        r"npa\s+ratio|portfolio\s+quality|\bpar\b"
        r"|collection\s+efficiency|vintage\s+analysis|dpd",
        "Portfolio Data",
    ),
    # Legal Notice
    (
        r"debt\s+recovery\s+tribunal|\bdrt\b|writ\s+petition"
        r"|legal\s+notice|notice\s+under\s+section|arbitration\s+notice",
        "Legal Notice",
    ),
]


def _read_content_snippet(file_path: str) -> str:
    """
    Extract a text snippet from a file for content-based classification.

    Handles PDF, Excel, CSV, and plain-text files.  Returns an empty string
    on any read error so classification can fall through gracefully.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()

    try:
        if suffix == ".pdf":
            import pdfplumber  # type: ignore  # already a project dependency
            text_parts = []
            with pdfplumber.open(str(path)) as pdf:
                for page in pdf.pages[:3]:          # first 3 pages are sufficient
                    text_parts.append(page.extract_text() or "")
                    if sum(len(t) for t in text_parts) >= _CONTENT_SNIFF_CHARS:
                        break
            return "".join(text_parts)[:_CONTENT_SNIFF_CHARS]

        if suffix in {".xlsx", ".xls"}:
            import pandas as pd  # type: ignore
            df = pd.read_excel(path, nrows=20, dtype=str)
            flat = " ".join(str(v) for v in df.values.flatten() if v and str(v) != "nan")
            # Also include column headers – they're very informative
            headers = " ".join(str(c) for c in df.columns)
            return (headers + " " + flat)[:_CONTENT_SNIFF_CHARS]

        if suffix == ".csv":
            with open(path, encoding="utf-8", errors="ignore") as fh:
                return fh.read(_CONTENT_SNIFF_CHARS)

        # Plain text / other
        with open(path, encoding="utf-8", errors="ignore") as fh:
            return fh.read(_CONTENT_SNIFF_CHARS)

    except Exception as exc:
        logger.warning("Content sniff failed for '%s': %s", path.name, exc)
        return ""


def _classify_by_content(text: str) -> Optional[str]:
    """Return doc type from content keywords or None if no rule matches."""
    text_lower = text.lower()
    for pattern, doc_type in _CONTENT_RULES:
        if re.search(pattern, text_lower):
            return doc_type
    return None


# ---------------------------------------------------------------------------
# Layer 3 – LLM classification (optional, Groq Llama3)
# ---------------------------------------------------------------------------

_LLM_TYPE_LIST = ", ".join(sorted(DOCUMENT_TYPES - {"Unknown"}))

_LLM_PROMPT_TEMPLATE = (
    "You are a financial document classifier for Indian corporate credit analysis.\n"
    "Classify the document described below into EXACTLY ONE of these types:\n"
    f"{_LLM_TYPE_LIST}\n\n"
    "Filename: {{filename}}\n\n"
    "Content snippet (first 2000 chars):\n{{snippet}}\n\n"
    "Reply with ONLY the document type label. No explanation."
)


def _classify_by_llm(filename: str, snippet: str, api_key: str) -> Optional[str]:
    """Call Groq Llama3 to classify a document. Returns a label or None on failure."""
    try:
        from groq import Groq  # type: ignore  # optional dependency
    except ImportError:
        logger.debug("groq package not installed; LLM classification skipped.")
        return None

    prompt = _LLM_PROMPT_TEMPLATE.replace("{{filename}}", filename).replace(
        "{{snippet}}", snippet[:2000]
    )

    try:
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=20,
        )
        label = resp.choices[0].message.content.strip()

        # Direct match
        if label in DOCUMENT_TYPES:
            return label
        # Case-insensitive fallback
        for dt in DOCUMENT_TYPES:
            if dt.lower() == label.lower():
                return dt
        logger.warning("LLM returned unrecognised label '%s' for '%s'", label, filename)
    except Exception as exc:
        logger.warning("LLM classification call failed for '%s': %s", filename, exc)

    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_document(
    filename: str,
    file_path: str,
    api_key: str = "",
) -> str:
    """
    Classify a single document using a 3-layer cascade.

    Args:
        filename:  Original uploaded filename (used for pattern matching).
        file_path: Absolute path on disk (used for content reading + LLM).
        api_key:   Groq API key; if empty, LLM step is skipped.

    Returns:
        One of the DOCUMENT_TYPES labels.  Falls back to "Unknown".
    """
    # Layer 1 – filename
    result = _classify_by_filename(filename)
    if result:
        logger.info("'%s' classified by filename → %s", filename, result)
        return result

    # Layer 2 – content
    snippet = _read_content_snippet(file_path)
    result = _classify_by_content(snippet)
    if result:
        logger.info("'%s' classified by content → %s", filename, result)
        return result

    # Layer 3 – LLM (optional)
    if api_key and snippet:
        result = _classify_by_llm(filename, snippet, api_key)
        if result:
            logger.info("'%s' classified by LLM → %s", filename, result)
            return result

    logger.info("'%s' could not be classified → Unknown", filename)
    return "Unknown"


def classify_many(
    files: Dict[str, str],                    # {original_filename: saved_file_path}
    api_key: str = "",
    overrides: Optional[Dict[str, str]] = None,
) -> Dict[str, str]:
    """
    Classify multiple documents and apply optional manual overrides.

    Args:
        files:     Mapping of original_filename → absolute path on disk.
        api_key:   Groq API key for LLM fallback (pass config.GROQ_API_KEY).
        overrides: User-supplied {filename: doc_type} corrections. Invalid
                   doc_type values in overrides are ignored and auto-classify
                   is used instead.

    Returns:
        Dict mapping each original filename to its document type label.
    """
    overrides = overrides or {}
    result: Dict[str, str] = {}

    for filename, path in files.items():
        if filename in overrides:
            override_type = overrides[filename]
            if override_type in DOCUMENT_TYPES:
                logger.info("Manual override: '%s' → %s", filename, override_type)
                result[filename] = override_type
                continue
            else:
                logger.warning(
                    "Override type '%s' for '%s' is not a recognised label – "
                    "falling back to auto-classification.",
                    override_type, filename,
                )
        result[filename] = classify_document(filename, path, api_key)

    return result
