"""
risk_engine.py - Risk scoring and final report generation for IntelliCredit.

Responsibilities:
  - Consume fraud flags from gst_bank_analyzer and extracted PDF data.
  - Apply a weighted scoring model to compute a composite risk score (0-100).
  - Map the score to a risk level: Low / Moderate / High.
  - Assemble and return the final structured JSON credit-risk report.

Scoring model (hackathon version – easily extensible):
  +40  Revenue inflation detected
  +40  Circular trading detected
  +10  Dense sub-graph (shell entity network) detected
  +20  High contingent liabilities mentioned in PDF
  +15  Legal cases / litigation mentioned in PDF
  +10  NPA / default / fraud keywords found in PDF
   +5  Per additional risk flag from PDF (capped at 15 pts total)
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Scoring weights
# ---------------------------------------------------------------------------

WEIGHT_REVENUE_INFLATION = 40
WEIGHT_CIRCULAR_TRADING = 40
WEIGHT_DENSE_SUBGRAPH = 10
WEIGHT_HIGH_LIABILITIES = 20
WEIGHT_LEGAL_CASES = 15
WEIGHT_NPA_KEYWORDS = 10
WEIGHT_PER_PDF_FLAG = 5
MAX_PDF_FLAG_POINTS = 15   # cap on the per-flag contribution

# Risk level thresholds
LEVEL_HIGH_THRESHOLD = 60
LEVEL_MODERATE_THRESHOLD = 30

# Keywords that imply serious credit risk found in PDF extraction
HIGH_SEVERITY_PDF_KEYWORDS = {
    "npa", "non-performing", "default", "fraud", "winding up",
    "insolvency", "criminal complaint",
}

MEDIUM_SEVERITY_PDF_KEYWORDS = {
    "overdue", "restructured", "moratorium", "guarantee invoked",
    "cheque bounce", "drt", "arbitration",
}


# ---------------------------------------------------------------------------
# Score computation helpers
# ---------------------------------------------------------------------------

def _score_fraud_flags(fraud_flags: List[Dict[str, Any]]) -> tuple[int, List[str]]:
    """
    Convert fraud flags (from gst_bank_analyzer) into a partial score.

    Returns (score_contribution, list_of_flag_names).
    """
    score = 0
    notes: List[str] = []

    for flag in fraud_flags:
        flag_type = flag.get("flag", "")
        if flag_type == "REVENUE_INFLATION":
            score += WEIGHT_REVENUE_INFLATION
            notes.append(f"Revenue inflation (ratio={flag.get('ratio', '?')}x): +{WEIGHT_REVENUE_INFLATION} pts")
        elif flag_type == "CIRCULAR_TRADING":
            score += WEIGHT_CIRCULAR_TRADING
            notes.append(f"Circular trading ({flag.get('cycle_count', '?')} cycles): +{WEIGHT_CIRCULAR_TRADING} pts")
        elif flag_type == "DENSE_SUBGRAPH":
            score += WEIGHT_DENSE_SUBGRAPH
            notes.append(f"Dense entity sub-graph detected: +{WEIGHT_DENSE_SUBGRAPH} pts")

    return score, notes


def _score_pdf_signals(pdf_data: Dict[str, Any]) -> tuple[int, List[str]]:
    """
    Analyse the extracted PDF data for risk indicators.

    Returns (score_contribution, list_of_scoring_notes).
    """
    score = 0
    notes: List[str] = []

    # ---- Contingent liabilities ----------------------------------------
    if pdf_data.get("contingent_liabilities"):
        score += WEIGHT_HIGH_LIABILITIES
        notes.append(f"Contingent liabilities present: +{WEIGHT_HIGH_LIABILITIES} pts")

    # ---- Legal / litigation --------------------------------------------
    if pdf_data.get("legal_cases"):
        score += WEIGHT_LEGAL_CASES
        notes.append(f"Legal cases / litigation mentioned: +{WEIGHT_LEGAL_CASES} pts")

    # ---- Risk flags from PDF (keywords found by extractor) -------------
    risk_flags: List[str] = pdf_data.get("risk_flags", [])
    if isinstance(risk_flags, list):
        # Check for high-severity keywords
        for flag in risk_flags:
            if flag.lower() in HIGH_SEVERITY_PDF_KEYWORDS:
                score += WEIGHT_NPA_KEYWORDS
                notes.append(f"High-severity keyword '{flag}': +{WEIGHT_NPA_KEYWORDS} pts")
                break  # count once

        # Per-flag points (capped)
        per_flag_pts = min(len(risk_flags) * WEIGHT_PER_PDF_FLAG, MAX_PDF_FLAG_POINTS)
        if per_flag_pts > 0:
            score += per_flag_pts
            notes.append(f"{len(risk_flags)} risk keyword(s) from PDF: +{per_flag_pts} pts")

    return score, notes


# ---------------------------------------------------------------------------
# Public API: risk score computation
# ---------------------------------------------------------------------------

def compute_risk_score(
    pdf_data: Dict[str, Any],
    gst_bank_analysis: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compute a composite risk score from all available signals.

    Args:
        pdf_data:          Dict from extractor.extract_financial_data().
        gst_bank_analysis: Dict from gst_bank_analyzer.analyze_gst_vs_bank().

    Returns:
        {
          "score":      int (0-100, capped),
          "level":      "Low" | "Moderate" | "High",
          "flags":      [list of scoring note strings],
          "breakdown":  {component: pts, ...}
        }
    """
    fraud_flags = gst_bank_analysis.get("fraud_flags", [])

    fraud_score, fraud_notes = _score_fraud_flags(fraud_flags)
    pdf_score, pdf_notes = _score_pdf_signals(pdf_data)

    total_score = min(fraud_score + pdf_score, 100)  # cap at 100

    # Risk level mapping
    if total_score >= LEVEL_HIGH_THRESHOLD:
        level = "High"
    elif total_score >= LEVEL_MODERATE_THRESHOLD:
        level = "Moderate"
    else:
        level = "Low"

    all_notes = fraud_notes + pdf_notes
    logger.info("Risk score: %d (%s) | %d signals", total_score, level, len(all_notes))

    return {
        "score": total_score,
        "level": level,
        "flags": all_notes,
        "breakdown": {
            "fraud_detection_score": fraud_score,
            "pdf_signal_score": pdf_score,
        },
    }


# ---------------------------------------------------------------------------
# Report assembly
# ---------------------------------------------------------------------------

def generate_report(
    company: str,
    financial_commitments: Dict[str, Any],
    gst_analysis: Dict[str, Any],
    bank_analysis: Dict[str, Any],
    fraud_flags: List[Any],
    risk_score: int,
    risk_level: str,
) -> Dict[str, Any]:
    """
    Assemble the final structured credit-risk report.

    Args:
        company:               Company name (from form input).
        financial_commitments: Extracted PDF data dict.
        gst_analysis:          GST summary dict.
        bank_analysis:         Bank summary dict.
        fraud_flags:           Combined list of fraud flag dicts and scoring notes.
        risk_score:            Composite integer score.
        risk_level:            "Low" / "Moderate" / "High".

    Returns:
        A JSON-serialisable dict matching the required report schema.
    """
    return {
        "company": company,
        "financial_commitments": financial_commitments,
        "gst_analysis": gst_analysis,
        "bank_analysis": bank_analysis,
        "fraud_flags": fraud_flags,
        "risk_score": risk_score,
        "risk_level": risk_level,
    }
