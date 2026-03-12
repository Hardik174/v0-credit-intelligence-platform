"""
parser.py - Document parsing module for IntelliCredit.

Responsibilities:
  - Extract raw text from PDF files using pdfplumber.
  - Load and normalise GST return CSV/Excel files using pandas.
  - Load and normalise bank statement CSV/Excel files using pandas.

Each function returns either a string (PDF) or a pandas DataFrame (tabular data).
"""

import logging
from pathlib import Path
from typing import Optional

import pandas as pd
import pdfplumber

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# PDF parsing
# ---------------------------------------------------------------------------

def parse_pdf(file_path: str) -> str:
    """
    Extract all text content from a PDF file.

    Uses pdfplumber which handles multi-column layouts and scanned-style PDFs
    better than PyPDF2 for financial documents.

    Args:
        file_path: Absolute or relative path to the PDF file.

    Returns:
        A single string containing all extracted text, pages separated by
        a newline marker.

    Raises:
        FileNotFoundError: If the file does not exist.
        RuntimeError: If pdfplumber fails to open the file.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    pages_text = []
    try:
        with pdfplumber.open(str(path)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                pages_text.append(f"--- Page {i} ---\n{text}")
    except Exception as exc:
        raise RuntimeError(f"Failed to parse PDF '{file_path}': {exc}") from exc

    full_text = "\n".join(pages_text)
    logger.info("Extracted %d chars from %s (%d pages)", len(full_text), path.name, len(pages_text))
    return full_text


# ---------------------------------------------------------------------------
# GST return parser
# ---------------------------------------------------------------------------

# Canonical column names the rest of the pipeline expects.
GST_REQUIRED_COLUMNS = {
    "gstin",           # seller/filer GSTIN
    "invoice_number",
    "invoice_value",
    "buyer_gstin",
    "invoice_date",
}

# Flexible aliases: maps possible raw header names → canonical name
GST_COLUMN_ALIASES = {
    "gstin": ["gstin", "seller_gstin", "supplier_gstin", "filer_gstin"],
    "invoice_number": ["invoice_number", "invoice_no", "inv_no", "invoice#"],
    "invoice_value": ["invoice_value", "value", "amount", "taxable_value", "invoice_amount"],
    "buyer_gstin": ["buyer_gstin", "buyer gstin", "recipient_gstin", "customer_gstin"],
    "invoice_date": ["invoice_date", "date", "inv_date", "transaction_date"],
}


def _normalise_columns(df: pd.DataFrame, alias_map: dict) -> pd.DataFrame:
    """Rename raw DataFrame columns to canonical names using an alias map."""
    # Lower-case and strip whitespace from column names first
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    rename_map = {}
    for canonical, aliases in alias_map.items():
        for alias in aliases:
            if alias in df.columns:
                rename_map[alias] = canonical
                break
    return df.rename(columns=rename_map)


def parse_gst_file(file_path: str) -> pd.DataFrame:
    """
    Load a GST returns file (CSV or Excel) and return a normalised DataFrame.

    Expected canonical columns after normalisation:
        gstin, invoice_number, invoice_value, buyer_gstin, invoice_date

    Rows with missing invoice_value are dropped. invoice_date is coerced to
    datetime; invoice_value to numeric.

    Args:
        file_path: Path to the CSV or Excel GST file.

    Returns:
        Normalised pandas DataFrame.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If no recognised columns are found.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"GST file not found: {file_path}")

    # Load based on extension
    if path.suffix.lower() in {".xlsx", ".xls"}:
        df = pd.read_excel(path, dtype=str)
    else:
        df = pd.read_csv(path, dtype=str)

    df = _normalise_columns(df, GST_COLUMN_ALIASES)

    # Validate that at least the key columns survived
    missing = GST_REQUIRED_COLUMNS - set(df.columns)
    if missing:
        logger.warning("GST file is missing columns: %s", missing)

    # Type coercions
    if "invoice_value" in df.columns:
        df["invoice_value"] = pd.to_numeric(df["invoice_value"], errors="coerce")
        df.dropna(subset=["invoice_value"], inplace=True)

    if "invoice_date" in df.columns:
        df["invoice_date"] = pd.to_datetime(df["invoice_date"], errors="coerce")

    df.reset_index(drop=True, inplace=True)
    logger.info("Loaded GST file: %d rows, %d columns", len(df), len(df.columns))
    return df


# ---------------------------------------------------------------------------
# Bank statement parser
# ---------------------------------------------------------------------------

BANK_REQUIRED_COLUMNS = {"date", "description", "credit", "debit", "balance"}

BANK_COLUMN_ALIASES = {
    "date": ["date", "transaction_date", "txn_date", "value_date", "posting_date"],
    "description": [
        "description", "narration", "particulars", "remarks",
        "transaction_remarks", "details",
    ],
    "credit": ["credit", "credit_amount", "deposit", "deposits", "cr"],
    "debit": ["debit", "debit_amount", "withdrawal", "withdrawals", "dr"],
    "balance": ["balance", "closing_balance", "running_balance", "available_balance"],
}


def parse_bank_file(file_path: str) -> pd.DataFrame:
    """
    Load a bank statement file (CSV or Excel) and return a normalised DataFrame.

    Expected canonical columns after normalisation:
        date, description, credit, debit, balance

    credit/debit/balance are coerced to numeric. Rows where BOTH credit and
    debit are NaN are dropped (likely header/footer noise).

    Args:
        file_path: Path to the CSV or Excel bank statement file.

    Returns:
        Normalised pandas DataFrame.

    Raises:
        FileNotFoundError: If the file does not exist.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Bank file not found: {file_path}")

    if path.suffix.lower() in {".xlsx", ".xls"}:
        df = pd.read_excel(path, dtype=str)
    else:
        df = pd.read_csv(path, dtype=str)

    df = _normalise_columns(df, BANK_COLUMN_ALIASES)

    missing = BANK_REQUIRED_COLUMNS - set(df.columns)
    if missing:
        logger.warning("Bank file is missing columns: %s", missing)

    # Type coercions
    for col in ["credit", "debit", "balance"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # Drop rows that are entirely noise (no credit, no debit)
    if "credit" in df.columns and "debit" in df.columns:
        df.dropna(subset=["credit", "debit"], how="all", inplace=True)

    # Fill NaN credits/debits with 0 for arithmetic
    df["credit"] = df.get("credit", pd.Series(dtype=float)).fillna(0)
    df["debit"] = df.get("debit", pd.Series(dtype=float)).fillna(0)

    df.reset_index(drop=True, inplace=True)
    logger.info("Loaded bank file: %d rows, %d columns", len(df), len(df.columns))
    return df
