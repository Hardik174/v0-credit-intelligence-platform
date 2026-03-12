"""
extractor.py - LLM-based financial data extractor for IntelliCredit.

Responsibilities:
  - Receive raw PDF text.
  - Send it to an LLM (Groq Llama3 by default) with a structured extraction prompt.
  - Parse the LLM response into a clean JSON dict.
  - Fall back to regex-based heuristic extraction if no LLM key is configured.

The LLM integration is pluggable: set the GROQ_API_KEY environment variable
to enable real LLM calls, otherwise the system uses the regex fallback so the
pipeline still works end-to-end during the hackathon without API access.
"""

import json
import logging
import re
from typing import Any, Dict

# config handles .env loading AND exposes all settings as typed constants.
# Import early so os.environ is already populated before anything else reads it.
from . import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Output schema – every field the pipeline expects downstream
# ---------------------------------------------------------------------------

EMPTY_EXTRACTION: Dict[str, Any] = {
    "loan_amount": None,
    "lender": None,
    "sanction_limit": None,
    "contingent_liabilities": None,
    "legal_cases": None,
    "guarantees": None,
    "risk_flags": [],
}

# ---------------------------------------------------------------------------
# LLM prompt template
# ---------------------------------------------------------------------------

EXTRACTION_PROMPT_TEMPLATE = """
You are a financial document analyst. Extract the following information from the
provided text and return ONLY a valid JSON object with exactly these keys:

{{
  "loan_amount": "<string or null>",
  "lender": "<string or null>",
  "sanction_limit": "<string or null>",
  "contingent_liabilities": "<string or null>",
  "legal_cases": "<string or null>",
  "guarantees": "<string or null>",
  "risk_flags": ["<list of short risk descriptions, empty if none>"]
}}

Rules:
- Extract monetary values with their currency and unit (e.g. "INR 50 Crore").
- For legal_cases, briefly describe any litigation or notice mentioned.
- For risk_flags, include any red-flag phrases: NPA, default, overdue, winding
  up, insolvency, guarantee invoked, restructured, etc.
- If a field is not present in the text, set its value to null.
- Return ONLY the JSON. No explanation text.

DOCUMENT TEXT:
{text}
"""


# ---------------------------------------------------------------------------
# Groq LLM client (optional – falls back gracefully)
# ---------------------------------------------------------------------------

def _call_groq_llm(text: str) -> str:
    """
    Send the extraction prompt to Groq's Llama3 model.

    Reads all settings from config.py (which in turn reads from .env /
    environment variables). Raises clear errors if the key is missing or
    the groq package is not installed.

    Raises:
        ImportError: If the groq package is not installed.
        ValueError: If GROQ_API_KEY is empty at call time.
        Exception: On any API error.
    """
    try:
        from groq import Groq  # type: ignore  # optional dependency
    except ImportError as exc:
        raise ImportError(
            "The 'groq' package is required for LLM extraction. "
            "Install it with: pip install groq"
        ) from exc

    if not config.GROQ_API_KEY:
        raise ValueError(
            "GROQ_API_KEY is not set. "
            "Add it to your .env file or set it as an environment variable. "
            "See .env.example for instructions."
        )

    client = Groq(api_key=config.GROQ_API_KEY)
    # Honour the configurable character budget
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(text=text[:config.PDF_TEXT_CHAR_LIMIT])

    response = client.chat.completions.create(
        model=config.GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=config.GROQ_TEMPERATURE,
        max_tokens=config.GROQ_MAX_TOKENS,
    )
    return response.choices[0].message.content


# ---------------------------------------------------------------------------
# Regex-based heuristic fallback
# ---------------------------------------------------------------------------

# Patterns to catch common financial document phrasing
_AMOUNT_PATTERN = re.compile(
    r"(?:INR|Rs\.?|₹)?\s*(\d[\d,\.]*)\s*(?:crore|lakh|million|cr\.?|lac)?",
    re.IGNORECASE,
)

_RISK_KEYWORDS = [
    "npa", "non-performing", "default", "overdue", "winding up",
    "insolvency", "guarantee invoked", "restructured", "moratorium",
    "fraud", "drt", "debt recovery tribunal", "legal notice",
    "arbitration", "criminal complaint", "cheque bounce",
]


def _heuristic_extract(text: str) -> Dict[str, Any]:
    """
    Regex and keyword-based extraction used when no LLM is available.

    This is intentionally simple – good enough for demo purposes.
    """
    result = dict(EMPTY_EXTRACTION)  # shallow copy

    text_lower = text.lower()

    # ---- Loan amount --------------------------------------------------
    # Look for "loan amount", "term loan", "facility" followed by a number
    loan_match = re.search(
        r"(?:loan\s+amount|term\s+loan|credit\s+facility|sanctioned\s+amount)"
        r"[^\d]{0,30}([\d,\.]+\s*(?:crore|lakh|cr|lac)?)",
        text_lower,
    )
    if loan_match:
        result["loan_amount"] = loan_match.group(1).strip()

    # ---- Sanction limit -----------------------------------------------
    sanction_match = re.search(
        r"(?:sanction(?:ed)?\s+limit|drawing\s+power|credit\s+limit)"
        r"[^\d]{0,30}([\d,\.]+\s*(?:crore|lakh|cr|lac)?)",
        text_lower,
    )
    if sanction_match:
        result["sanction_limit"] = sanction_match.group(1).strip()

    # ---- Lender name --------------------------------------------------
    lender_match = re.search(
        r"(?:lender|bank|financer|nbfc)[:\s]+([A-Za-z &\.]{3,50})",
        text,
        re.IGNORECASE,
    )
    if lender_match:
        result["lender"] = lender_match.group(1).strip()

    # ---- Contingent liabilities ---------------------------------------
    liab_match = re.search(
        r"(?:contingent\s+liabilit(?:y|ies))[^\d]{0,30}([\d,\.]+\s*(?:crore|lakh|cr|lac)?)",
        text_lower,
    )
    if liab_match:
        result["contingent_liabilities"] = liab_match.group(1).strip()

    # ---- Guarantees ---------------------------------------------------
    guar_match = re.search(
        r"(?:guarantee(?:s|d)?|bank\s+guarantee)[:\s]+([^\n]{0,100})",
        text,
        re.IGNORECASE,
    )
    if guar_match:
        result["guarantees"] = guar_match.group(1).strip()

    # ---- Legal cases --------------------------------------------------
    legal_match = re.search(
        r"(?:legal\s+notice|litigation|court\s+case|arbitration|drt)[:\s]+([^\n]{0,150})",
        text,
        re.IGNORECASE,
    )
    if legal_match:
        result["legal_cases"] = legal_match.group(1).strip()

    # ---- Risk flags ---------------------------------------------------
    flags = [kw for kw in _RISK_KEYWORDS if kw in text_lower]
    result["risk_flags"] = list(set(flags))

    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_financial_data(text: str) -> Dict[str, Any]:
    """
    Extract structured financial data from raw document text.

    Tries Groq LLM extraction first; falls back to heuristic regex extraction
    if GROQ_API_KEY is not set or if the LLM call fails.

    Args:
        text: Raw text extracted from a PDF document.

    Returns:
        Dict matching the EMPTY_EXTRACTION schema with populated values.
    """
    if not text or not text.strip():
        logger.warning("Empty text passed to extractor – returning empty result.")
        return dict(EMPTY_EXTRACTION)

    groq_key = config.GROQ_API_KEY

    if groq_key:
        # ---- LLM path -------------------------------------------------
        try:
            raw_response = _call_groq_llm(text)
            # Strip markdown code fences if the model added them
            cleaned = re.sub(r"```(?:json)?", "", raw_response).strip()
            extracted = json.loads(cleaned)
            # Ensure all expected keys exist
            for key in EMPTY_EXTRACTION:
                extracted.setdefault(key, EMPTY_EXTRACTION[key])
            logger.info("LLM extraction succeeded.")
            return extracted
        except json.JSONDecodeError as exc:
            logger.warning("LLM returned non-JSON; falling back to heuristics. %s", exc)
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM call failed (%s); falling back to heuristics.", exc)

    # ---- Heuristic fallback ------------------------------------------
    logger.info("Using heuristic extraction (no GROQ_API_KEY set or LLM failed).")
    return _heuristic_extract(text)
