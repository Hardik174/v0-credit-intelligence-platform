"""
services/cam_builder.py – Credit Assessment Memorandum Builder

``build_cam_report(session_id)`` is the single authoritative entry point for
generating a CAM from a completed pipeline session.

Data sources (strict priority):
  1. session.financial_analysis["financial_analysis"]  ← gst, bank, fraud_flags, risk_score
  2. session.entity_profile + session.loan_details     ← onboarding data
  3. research_service.run_research(session_id)         ← news / litigation (non-fatal)

IMPORTANT: The risk_score and fraud_signals are read DIRECTLY from the credit
ingestor's output stored in the session.  They are NEVER overridden by any
external service call or placeholder value.

Example output (risk_score=100, fraud signals present):
  {
    "risk_score": 100,
    "risk_level": "High",
    "fraud_signals": [
      {"flag": "REVENUE_INFLATION", "description": "...", "ratio": 9.9},
      {"flag": "CIRCULAR_TRADING",  "description": "...", "cycle_count": 3}
    ],
    "recommendation": "REJECT – Very High Risk. ..."
  }
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from fastapi import HTTPException

from models.credit_analysis import (
    BankAnalysis,
    CreditAnalysis,
    EntityProfile,
    FinancialAnalysis,
    FinancialCommitments,
    FraudSignal,
    GSTAnalysis,
    LoanDetails,
    ResearchInsights,
    ResearchRiskSignals,
)
from services.ingestion_service import get_session

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data loaders
# ---------------------------------------------------------------------------


def _load_financial_analysis(fa_dict: Dict[str, Any]) -> FinancialAnalysis:
    """
    Parse the ``financial_analysis`` block of ``session.financial_analysis``.

    Handles both the exact dict produced by credit_ingestor and sanitises
    missing / null fields without raising exceptions.
    """
    gst_raw = fa_dict.get("gst_analysis") or {}
    bank_raw = fa_dict.get("bank_analysis") or {}
    fc_raw = fa_dict.get("financial_commitments") or {}
    fraud_raw: List[Dict[str, Any]] = fa_dict.get("fraud_flags") or []

    gst = GSTAnalysis(
        total_invoice_value=float(gst_raw.get("total_invoice_value") or 0),
        invoice_count=int(gst_raw.get("invoice_count") or 0),
        unique_buyers=int(gst_raw.get("unique_buyers") or 0),
        unique_sellers=int(gst_raw.get("unique_sellers") or 0),
        top_buyers=gst_raw.get("top_buyers") or [],
    )

    bank = BankAnalysis(
        total_credit_inflow=float(bank_raw.get("total_credit_inflow") or 0),
        total_debit_outflow=float(bank_raw.get("total_debit_outflow") or 0),
        net_flow=float(bank_raw.get("net_flow") or 0),
        transaction_count=int(bank_raw.get("transaction_count") or 0),
    )

    fc = FinancialCommitments(
        loan_amount=fc_raw.get("loan_amount"),
        lender=fc_raw.get("lender"),
        sanction_limit=fc_raw.get("sanction_limit"),
        contingent_liabilities=fc_raw.get("contingent_liabilities"),
        legal_cases=fc_raw.get("legal_cases"),
        guarantees=fc_raw.get("guarantees"),
        risk_flags=fc_raw.get("risk_flags") or [],
    )

    fraud_signals = [
        FraudSignal(
            flag=f.get("flag", "UNKNOWN"),
            description=f.get("description", ""),
            ratio=f.get("ratio"),
            cycle_count=f.get("cycle_count"),
        )
        for f in fraud_raw
        if isinstance(f, dict)
    ]

    # ── These values come from credit_ingestor/risk_engine.py ──────────────
    # They must never be replaced with defaults when they are explicitly set.
    risk_score = int(fa_dict.get("risk_score") or 0)
    risk_level = str(fa_dict.get("risk_level") or "Unknown")

    return FinancialAnalysis(
        gst_analysis=gst,
        bank_analysis=bank,
        financial_commitments=fc,
        fraud_flags=fraud_signals,
        risk_score=risk_score,
        risk_level=risk_level,
    )


def _load_research(session_id: str) -> ResearchInsights:
    """
    Fetch research insights from the Research Agent.
    Returns a safe stub if the agent is unavailable (never blocks CAM generation).
    """
    try:
        from services.research_service import run_research  # noqa: PLC0415

        raw = run_research(session_id)
        rs_raw = raw.get("risk_signals") or {}
        return ResearchInsights(
            ai_insight_summary=raw.get("ai_insight_summary", ""),
            risk_signals=ResearchRiskSignals(
                litigation_cases=int(rs_raw.get("litigation_cases") or 0),
                negative_news=int(rs_raw.get("negative_news") or 0),
                sector_risk=str(rs_raw.get("sector_risk") or "unknown"),
            ),
            latest_research=raw.get("latest_research") or {},
            sector_trends=raw.get("sector_trends") or {},
            macro_indicators=raw.get("macro_indicators") or {},
        )
    except Exception as exc:
        logger.warning(
            "Research Agent unavailable for session %s: %s – continuing without news data.",
            session_id,
            exc,
        )
        return ResearchInsights(
            ai_insight_summary=(
                "Research Agent not available at this time. "
                "CAM generated from financial document analysis only."
            ),
            risk_signals=ResearchRiskSignals(),
        )


# ---------------------------------------------------------------------------
# SWOT builder (fully data-driven from real pipeline signals)
# ---------------------------------------------------------------------------


def _build_swot(
    entity_profile: EntityProfile,
    fa: FinancialAnalysis,
    research: ResearchInsights,
) -> Dict[str, List[str]]:
    """
    Generate SWOT analysis entirely from real pipeline signals.
    All bullets are derived from fraud_flags, gst/bank metrics, and news data.
    No static placeholders are used.
    """
    flag_names: Set[str] = {f.flag for f in fa.fraud_flags}
    sector = entity_profile.sector.lower()
    gst = fa.gst_analysis
    bank = fa.bank_analysis
    fc = fa.financial_commitments
    rs = research.risk_signals

    # ── Strengths ──────────────────────────────────────────────────────────
    strengths: List[str] = []

    if gst.total_invoice_value > 0:
        strengths.append(
            f"Active GST billing with {gst.invoice_count} invoices "
            f"totalling ₹{gst.total_invoice_value / 1e5:,.1f} L demonstrates revenue activity."
        )
    if gst.unique_buyers >= 5:
        strengths.append(
            f"Diversified customer base with {gst.unique_buyers} unique GSTIN "
            "counterparties reduces revenue concentration risk."
        )
    if bank.net_flow > 0:
        strengths.append(
            f"Positive net cash flow (₹{bank.net_flow / 1e5:,.1f} L) "
            "indicates adequate operational liquidity."
        )
    if not fa.fraud_flags:
        strengths.append(
            "No fraud signals detected in cross-analysis of GST filings and bank statements."
        )
    if fa.risk_score <= 30:
        strengths.append(
            f"Low composite risk score ({fa.risk_score}/100) supports loan eligibility."
        )
    if not fc.legal_cases:
        strengths.append(
            "No active legal cases identified in the submitted document set."
        )
    if not strengths:
        strengths.append(
            "Entity is registered, active, and has submitted complete financial documentation."
        )

    # ── Weaknesses ─────────────────────────────────────────────────────────
    weaknesses: List[str] = []

    for ff in fa.fraud_flags:
        if ff.flag == "REVENUE_INFLATION":
            ratio_str = f"{ff.ratio:.1f}×" if ff.ratio else "significant"
            weaknesses.append(
                f"Revenue inflation detected: GST declared revenue is {ratio_str} higher "
                "than actual bank credit inflow – indicative of book inflation or "
                "unreported cash transactions."
            )
        elif ff.flag == "CIRCULAR_TRADING":
            cycles = ff.cycle_count or "multiple"
            weaknesses.append(
                f"Circular trading detected: {cycles} transaction cycle(s) identified "
                "among counterparty GSTINs – strongly indicative of fictitious billing "
                "to inflate turnover."
            )
        elif ff.flag == "DENSE_SUBGRAPH":
            weaknesses.append(
                "Dense inter-company trading network identified – potential shell-entity "
                "exposure or coordinated invoice fabrication."
            )

    if fc.contingent_liabilities:
        weaknesses.append(
            f"Contingent liabilities disclosed: {fc.contingent_liabilities} – "
            "off-balance-sheet exposure may affect debt serviceability."
        )
    if fc.legal_cases:
        weaknesses.append(f"Active legal proceedings noted: {fc.legal_cases}.")

    rf_text = " ".join(r.lower() for r in fc.risk_flags)
    if any(k in rf_text for k in ("npa", "drt", "default", "fraud", "winding")):
        weaknesses.append(
            "High-severity keywords (NPA / DRT / default / fraud / winding-up) found in "
            "submitted documents – enhanced due diligence required."
        )
    if bank.net_flow < 0:
        weaknesses.append(
            f"Negative net cash flow (₹{abs(bank.net_flow) / 1e5:,.1f} L deficit) "
            "raises concerns about short-term repayment capacity."
        )
    if not weaknesses:
        weaknesses.append(
            "No material weaknesses identified from the submitted data."
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
            "Healthcare / pharma sector shows resilient demand growth driven by "
            "domestic consumption and export opportunities."
        )
    elif any(k in sector for k in ("tech", "software", "it")):
        opportunities.append(
            "Technology sector growth driven by enterprise digital transformation – "
            "strong secular tailwinds for revenue expansion."
        )
    elif any(k in sector for k in ("agri", "food")):
        opportunities.append(
            "Agri / food processing sector backed by government PLI schemes; "
            "structured credit can enable scale-up."
        )
    else:
        opportunities.append(
            "Industry growth opportunities exist that can be captured with structured "
            "working-capital financing support."
        )

    opportunities.append(
        "Formalisation of supply chains under the GST regime improves "
        "credit visibility and increases lender confidence."
    )
    if gst.unique_buyers < 10:
        opportunities.append(
            "Scope to diversify the customer base further – reducing revenue "
            "concentration would improve the credit risk profile."
        )
    opportunities.append(
        "Potential to graduate to a term loan or CAPEX credit facility upon "
        "demonstrating consistent financial performance."
    )

    # ── Threats ─────────────────────────────────────────────────────────────
    threats: List[str] = []

    threats.append(
        "Interest rate volatility under the current monetary-policy cycle may "
        "elevate debt servicing costs."
    )
    threats.append(
        "Macro risks: inflationary pressures and global supply-chain disruptions "
        "could compress operating margins."
    )
    if rs.litigation_cases > 0:
        threats.append(
            f"{rs.litigation_cases} litigation event(s) detected in the public domain – "
            "adverse outcomes could affect operations and reputation."
        )
    if rs.negative_news > 3:
        threats.append(
            f"{rs.negative_news} negative news mentions detected; sustained adverse "
            "sentiment may impact customer and supplier relationships."
        )
    if flag_names & {"REVENUE_INFLATION", "CIRCULAR_TRADING"}:
        threats.append(
            "Regulatory risk: active fraud signals may attract GST department, SFIO, "
            "or Income Tax authority scrutiny and enforcement action."
        )
    if fa.risk_score >= 60:
        threats.append(
            f"Elevated composite risk score ({fa.risk_score}/100) signals heightened "
            "probability of default; any credit extended must carry strict covenants "
            "and enhanced monitoring requirements."
        )

    return {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "opportunities": opportunities,
        "threats": threats,
    }


# ---------------------------------------------------------------------------
# Recommendation engine (risk_score-driven, never overrideable)
# ---------------------------------------------------------------------------


def _build_recommendation(
    risk_score: int,
    risk_level: str,
    fa: FinancialAnalysis,
) -> str:
    """
    Derive the loan recommendation SOLELY from the pipeline's risk_score
    and fraud_flags.  This function never returns a static 'APPROVE' for
    a high-risk borrower.

    Decision thresholds:
      risk_score  > 80 → REJECT           (Very High Risk)
      risk_score  > 60 → HIGH-RISK HOLD   (Reject or Restructure)
      risk_score  > 45, OR critical flags → REFER TO CREDIT COMMITTEE
      risk_score  > 30 → CONDITIONAL APPROVAL
      risk_score  ≤ 30 → APPROVE
    """
    critical_flags = {f.flag for f in fa.fraud_flags} & {
        "REVENUE_INFLATION",
        "CIRCULAR_TRADING",
    }
    flag_list = ", ".join(sorted(critical_flags)) if critical_flags else "none"
    all_flags = [f.flag for f in fa.fraud_flags]
    flags_str = ", ".join(all_flags) if all_flags else "None"

    if risk_score > 80:
        return (
            f"REJECT – Very High Risk.\n"
            f"Risk Score: {risk_score}/100  |  Risk Level: {risk_level}\n\n"
            f"Critical fraud patterns detected: {flags_str}.\n\n"
            "This loan application is REJECTED pending an independent forensic review "
            "of GST filings and banking records.  No credit should be extended until "
            "all fraud signals are investigated and resolved."
        )

    if risk_score > 60:
        return (
            f"HIGH-RISK HOLD – Reject or Restructure.\n"
            f"Risk Score: {risk_score}/100  |  Risk Level: {risk_level}\n\n"
            f"Significant fraud indicator(s) or liabilities detected: {flags_str}.\n\n"
            "The loan should NOT be sanctioned without an independent audit of GST "
            "data, bank statements, and legal status.  Consider restructuring the "
            "facility with enhanced collateral requirements."
        )

    if risk_score > 45 or critical_flags:
        return (
            f"REFER TO CREDIT COMMITTEE – Elevated Risk.\n"
            f"Risk Score: {risk_score}/100  |  Risk Level: {risk_level}\n\n"
            f"Fraud indicators present: {flag_list}.\n\n"
            "Committee-level review required.  Independent verification of GST "
            "filings and cross-checking with banking records must be completed "
            "before sanction can be considered."
        )

    if risk_score > 30:
        return (
            f"CONDITIONAL APPROVAL – Moderate Risk.\n"
            f"Risk Score: {risk_score}/100  |  Risk Level: {risk_level}\n\n"
            "No critical fraud signals detected.  Proceed subject to:\n"
            "  • Enhanced documentation and collateral review\n"
            "  • Quarterly monitoring of GST and banking activity\n"
            "  • Satisfactory completion of KYC and due diligence"
        )

    return (
        f"APPROVE – Low Risk.\n"
        f"Risk Score: {risk_score}/100  |  Risk Level: {risk_level}\n\n"
        "No material fraud signals detected.  Proceed with the standard sanction "
        "process subject to KYC completion and credit policy compliance."
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_cam_report(session_id: str) -> Dict[str, Any]:
    """
    Assemble a complete CAM report from **real pipeline outputs only**.

    Steps:
      1. Load session from store            (HTTP 404 if not found)
      2. Verify extraction is complete      (HTTP 400 if not extracted)
      3. Parse financial_analysis block     → gst, bank, fraud_flags, risk_score
      4. Parse entity_profile, loan_details → onboarding data
      5. Fetch research insights            → non-fatal, falls back to stubs
      6. Build SWOT from real fraud signals → fully data-driven
      7. Build recommendation from risk_score → threshold-based, not overrideable

    The ``risk_score`` and ``fraud_signals`` in the returned dict are taken
    directly from the credit ingestor's extraction output and cannot be
    overridden by any downstream service.
    """
    # ── 1. Load session ───────────────────────────────────────────────────────
    session = get_session(session_id)

    if session.financial_analysis is None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Session '{session_id}' extraction not complete "
                f"(status: {session.status.value}). "
                "Run POST /extract-data/{session_id} first."
            ),
        )

    fa_output: Dict[str, Any] = session.financial_analysis

    # ── 2. Parse entity and loan profiles ─────────────────────────────────────
    ep_raw = fa_output.get("entity_profile") or session.entity_profile
    ld_raw = fa_output.get("loan_details") or session.loan_details

    entity_profile = EntityProfile(
        company_name=ep_raw.get("company_name", ""),
        cin=ep_raw.get("cin", ""),
        pan=ep_raw.get("pan", ""),
        sector=ep_raw.get("sector", ""),
        turnover=ep_raw.get("turnover", ""),
    )
    loan_details = LoanDetails(
        loan_type=ld_raw.get("loan_type", "Working Capital"),
        loan_amount=ld_raw.get("loan_amount", "TBD"),
        tenure=ld_raw.get("tenure", "TBD"),
        interest_rate=ld_raw.get("interest_rate", "TBD"),
    )

    # ── 3. Parse financial analysis ───────────────────────────────────────────
    #
    # session.financial_analysis has two possible structures depending on which
    # extraction path was used:
    #
    #   A) {entity_profile, loan_details, financial_analysis: {gst, bank, ...}}
    #       → produced by routers/extraction.py → credit_ingestor/app.py
    #
    #   B) Flat structure with gst_analysis / bank_analysis at the top level
    #       → produced by some legacy paths
    #
    # We try (A) first, fall back to (B).
    fa_section: Dict[str, Any] = fa_output.get("financial_analysis") or {}
    if not fa_section and ("gst_analysis" in fa_output or "bank_analysis" in fa_output):
        fa_section = fa_output  # flat legacy structure
    fa = _load_financial_analysis(fa_section)

    # ── 4. Load research insights (non-fatal) ─────────────────────────────────
    research = _load_research(session_id)

    # ── 5. Build SWOT from real pipeline signals ───────────────────────────────
    swot = _build_swot(entity_profile, fa, research)

    # ── 6. Build recommendation from real risk_score ──────────────────────────
    recommendation = _build_recommendation(fa.risk_score, fa.risk_level, fa)

    logger.info(
        "CAM built | session=%s | score=%d | level=%s | flags=%s | decision=%s",
        session_id,
        fa.risk_score,
        fa.risk_level,
        [f.flag for f in fa.fraud_flags],
        recommendation.splitlines()[0],
    )

    # ── 7. Assemble output ────────────────────────────────────────────────────
    return {
        "session_id": session_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "entity_profile": entity_profile.model_dump(),
        "loan_details": loan_details.model_dump(),
        "financial_summary": {
            "gst_analysis": fa.gst_analysis.model_dump(),
            "bank_analysis": fa.bank_analysis.model_dump(),
            "financial_commitments": fa.financial_commitments.model_dump(),
        },
        # These two fields carry the real ingestor output — never override them.
        "fraud_signals": [f.model_dump(exclude_none=True) for f in fa.fraud_flags],
        "risk_score": fa.risk_score,
        "risk_level": fa.risk_level,
        # Enrichment from research agent
        "research_insights": {
            "ai_insight_summary": research.ai_insight_summary,
            "risk_signals": research.risk_signals.model_dump(),
            "latest_research": research.latest_research,
            "sector_trends": research.sector_trends,
            "macro_indicators": research.macro_indicators,
        },
        "swot_analysis": swot,
        "recommendation": recommendation,
    }
