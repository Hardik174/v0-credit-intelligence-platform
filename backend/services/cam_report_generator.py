"""
services/cam_report_generator.py – Credit Assessment Memorandum (CAM) Generator

Assembles a complete CAM report from session data, research insights,
and heuristic SWOT analysis. No external LLM dependency – degrades
gracefully if the Research Agent is unavailable.

Output schema
─────────────
{
  "session_id":         str,
  "generated_at":       ISO-8601 timestamp,
  "entity_profile":     { company_name, cin, pan, sector, turnover },
  "loan_details":       { loan_type, loan_amount, tenure, interest_rate },
  "financial_summary":  {
      "gst_analysis":          { total_invoice_value, invoice_count, … },
      "bank_analysis":         { total_credit_inflow, total_debit_outflow, … },
      "financial_commitments": { loan_amount, lender, contingent_liabilities, … }
  },
  "fraud_signals":      [ { flag, description, … } ],
  "research_insights":  { latest_research, sector_trends, macro_indicators,
                          risk_signals, ai_insight_summary },
  "risk_score":         int (0-100),
  "risk_level":         "Low" | "Moderate" | "High",
  "swot_analysis":      { strengths, weaknesses, opportunities, threats },
  "recommendation":     str
}
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import HTTPException

from services.ingestion_service import get_session

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# SWOT heuristic generator
# ---------------------------------------------------------------------------

def _generate_swot(
    entity_profile: Dict[str, Any],
    financial_analysis: Dict[str, Any],
    research: Dict[str, Any],
) -> Dict[str, List[str]]:
    """
    Build a SWOT analysis from structured financial signals.
    All logic is deterministic and data-driven – no LLM required.
    """
    fraud_flags: List[Dict[str, Any]] = financial_analysis.get("fraud_flags", [])
    flag_names: set = {f.get("flag", "") for f in fraud_flags}
    risk_score: int = financial_analysis.get("risk_score", 0)
    gst: Dict[str, Any] = financial_analysis.get("gst_analysis", {})
    bank: Dict[str, Any] = financial_analysis.get("bank_analysis", {})
    commitments: Dict[str, Any] = financial_analysis.get("financial_commitments", {})
    sector: str = entity_profile.get("sector", "").lower()
    risk_signals: Dict[str, Any] = research.get("risk_signals", {})

    # ── Strengths ──────────────────────────────────────────────────────────
    strengths: List[str] = []
    inv_val = gst.get("total_invoice_value", 0)
    inv_count = gst.get("invoice_count", 0)
    if inv_val > 0:
        strengths.append(
            f"Active GST billing: {inv_count} invoices totalling "
            f"₹{inv_val / 1e5:,.1f} L demonstrates trading activity."
        )
    unique_buyers = gst.get("unique_buyers", 0)
    if unique_buyers >= 5:
        strengths.append(
            f"Diversified customer base with {unique_buyers} unique GSTIN buyers "
            "reduces revenue concentration risk."
        )
    net_flow = bank.get("net_flow", 0)
    if net_flow > 0:
        strengths.append(
            f"Positive net cash flow (₹{net_flow / 1e5:,.1f} L) "
            "indicates operational liquidity."
        )
    if not fraud_flags:
        strengths.append(
            "No fraud signals detected in GST or bank statement data."
        )
    if risk_score <= 30:
        strengths.append("Low composite risk score supports loan eligibility.")
    if not commitments.get("legal_cases"):
        strengths.append("No active legal cases identified in submitted documents.")
    if not strengths:
        strengths.append("Entity is registered, active, and has submitted documentation.")

    # ── Weaknesses ─────────────────────────────────────────────────────────
    weaknesses: List[str] = []
    if "REVENUE_INFLATION" in flag_names:
        for ff in fraud_flags:
            if ff.get("flag") == "REVENUE_INFLATION":
                ratio = ff.get("ratio") or "N/A"
                weaknesses.append(
                    f"Revenue inflation flag: GST declared revenue is "
                    f"{ratio}× the actual bank credit inflow – may indicate "
                    "book inflation or cash sales not reflected in banking."
                )
                break
    if "CIRCULAR_TRADING" in flag_names:
        for ff in fraud_flags:
            if ff.get("flag") == "CIRCULAR_TRADING":
                weaknesses.append(
                    f"Circular trading: {ff.get('cycle_count', 'multiple')} "
                    "transaction cycles detected among counterparty GSTINs."
                )
                break
    if "DENSE_SUBGRAPH" in flag_names:
        weaknesses.append(
            "Dense inter-company trading network identified – potential "
            "shell-entity exposure."
        )
    if commitments.get("contingent_liabilities"):
        weaknesses.append(
            f"Contingent liabilities disclosed: {commitments['contingent_liabilities']} "
            "– off-balance-sheet exposure may affect debt serviceability."
        )
    if commitments.get("legal_cases"):
        weaknesses.append(
            f"Legal proceedings noted: {commitments['legal_cases']}."
        )
    rf = [r.lower() for r in commitments.get("risk_flags", [])]
    if any(k in rf for k in ("npa", "drt", "default", "fraud", "winding up")):
        weaknesses.append(
            "High-severity keywords (NPA / DRT / default / fraud) found in "
            "submitted documents – requires enhanced due diligence."
        )
    if not weaknesses:
        weaknesses.append(
            "No material weaknesses identified from the data provided."
        )

    # ── Opportunities ───────────────────────────────────────────────────────
    opportunities: List[str] = []
    if any(k in sector for k in ("steel", "metal", "fabricat")):
        opportunities.append(
            "Steel / metals sector is benefiting from a multi-year infrastructure "
            "capex cycle; timely credit could support capacity expansion."
        )
    elif any(k in sector for k in ("pharma", "health")):
        opportunities.append(
            "Healthcare / pharma sector shows resilient demand growth "
            "driven by domestic consumption and export opportunities."
        )
    elif any(k in sector for k in ("tech", "software", "it")):
        opportunities.append(
            "Technology sector growth driven by enterprise digital transformation – "
            "strong secular tailwinds."
        )
    elif any(k in sector for k in ("agri", "food")):
        opportunities.append(
            "Agri / food processing sector backed by government PLI schemes; "
            "credit can enable scale-up."
        )
    else:
        opportunities.append(
            "Industry growth opportunities can be captured with structured "
            "working-capital financing."
        )
    opportunities.append(
        "Formalisation of supply chains under GST regime improves "
        "credit visibility and lender confidence."
    )
    if unique_buyers < 10:
        opportunities.append(
            "Scope for customer base diversification to reduce revenue "
            "concentration and improve credit risk profile."
        )
    opportunities.append(
        "Potential to graduate from working capital to term loan / CAPEX credit "
        "upon consistent performance."
    )

    # ── Threats ─────────────────────────────────────────────────────────────
    threats: List[str] = []
    threats.append(
        "Interest rate volatility under current monetary-policy cycle may "
        "elevate debt servicing costs."
    )
    threats.append(
        "Macro risks: inflationary pressures and global supply-chain disruptions "
        "could compress margins."
    )
    lit_cases = risk_signals.get("litigation_cases", 0)
    neg_news = risk_signals.get("negative_news", 0)
    if lit_cases > 0:
        threats.append(
            f"{lit_cases} litigation event(s) detected in public domain – "
            "adverse outcomes could affect operations and reputation."
        )
    if neg_news > 3:
        threats.append(
            f"{neg_news} negative news mentions detected; sustained negative "
            "sentiment may impact business relationships."
        )
    if "REVENUE_INFLATION" in flag_names or "CIRCULAR_TRADING" in flag_names:
        threats.append(
            "Regulatory risk: active fraud signals may attract GST / SFIO / "
            "Income Tax scrutiny."
        )
    if risk_score >= 60:
        threats.append(
            "High risk score signals elevated probability of default; "
            "credit should be subject to strict covenants and monitoring."
        )

    return {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "opportunities": opportunities,
        "threats": threats,
    }


# ---------------------------------------------------------------------------
# Recommendation generator
# ---------------------------------------------------------------------------

def _recommendation(risk_score: int, risk_level: str, flag_names: set) -> str:
    critical_flags = flag_names & {"REVENUE_INFLATION", "CIRCULAR_TRADING"}

    if risk_score <= 30 and not critical_flags:
        return (
            "APPROVE – Low Risk. "
            "No material fraud signals. Proceed with standard sanction process."
        )
    if risk_score <= 45 and not critical_flags:
        return (
            "CONDITIONAL APPROVAL – Moderate Risk. "
            "Enhanced documentation, collateral review, and quarterly monitoring "
            "recommended before final sanction."
        )
    if risk_score <= 60:
        return (
            "REFER TO CREDIT COMMITTEE – Elevated Risk. "
            "Fraud indicators or significant liabilities detected. "
            "Independent verification of GST data and bank statements required."
        )
    if risk_score <= 80:
        return (
            "HIGH-RISK HOLD – Reject or Restructure. "
            f"Risk score {risk_score}/100 with {len(critical_flags)} critical "
            "fraud flag(s). Loan should not be sanctioned without independent audit."
        )
    return (
        "REJECT – Very High Risk. "
        f"Risk score {risk_score}/100. Critical fraud patterns detected "
        f"({', '.join(critical_flags) or 'multiple signals'}). "
        "Loan application rejected pending forensic review."
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_cam_report(session_id: str) -> Dict[str, Any]:
    """
    Assemble and return the CAM report for a fully extracted session.

    Raises HTTP 400 if extraction has not been completed.
    """
    session = get_session(session_id)

    if session.financial_analysis is None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Session '{session_id}' extraction not complete "
                f"(status: {session.status.value}). "
                "Run POST /extract-data first."
            ),
        )

    fa_output: Dict[str, Any] = session.financial_analysis
    entity_profile: Dict[str, Any] = fa_output.get("entity_profile", session.entity_profile)
    loan_details: Dict[str, Any] = fa_output.get("loan_details", session.loan_details)
    financial_analysis: Dict[str, Any] = fa_output.get("financial_analysis", {})

    risk_score: int = financial_analysis.get("risk_score", 0)
    risk_level: str = financial_analysis.get("risk_level", "Unknown")
    fraud_flags: List[Dict[str, Any]] = financial_analysis.get("fraud_flags", [])
    flag_names: set = {f.get("flag", "") for f in fraud_flags}

    # ── Research Agent integration (non-fatal) ────────────────────────────
    research_insights: Dict[str, Any] = {}
    try:
        from services.research_service import run_research
        research_insights = run_research(session_id)
        logger.info("Research insights fetched for session %s", session_id)
    except Exception as exc:
        logger.warning(
            "Research Agent unavailable for session %s: %s – continuing without.",
            session_id, exc,
        )
        research_insights = {
            "ai_insight_summary": "Research Agent not available.",
            "risk_signals": {"litigation_cases": 0, "negative_news": 0, "sector_risk": "unknown"},
        }

    # ── SWOT ─────────────────────────────────────────────────────────────
    swot = _generate_swot(entity_profile, financial_analysis, research_insights)

    # ── Recommendation ───────────────────────────────────────────────────
    recommendation = _recommendation(risk_score, risk_level, flag_names)

    logger.info(
        "CAM generated | session=%s | score=%d | level=%s | rec=%s",
        session_id, risk_score, risk_level, recommendation.split("–")[0].strip(),
    )

    return {
        "session_id": session_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "entity_profile": entity_profile,
        "loan_details": loan_details,
        "financial_summary": {
            "gst_analysis": financial_analysis.get("gst_analysis", {}),
            "bank_analysis": financial_analysis.get("bank_analysis", {}),
            "financial_commitments": financial_analysis.get("financial_commitments", {}),
        },
        "fraud_signals": fraud_flags,
        "research_insights": research_insights,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "swot_analysis": swot,
        "recommendation": recommendation,
    }
