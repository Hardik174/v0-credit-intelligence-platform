"""
models/credit_analysis.py – Shared Pydantic data model for the credit pipeline.

This module defines the canonical schema used across all pipeline stages:

  Stage 1 — POST /entity-onboard
      → EntityProfile, LoanDetails

  Stage 4 — POST /extract-data
      → FinancialAnalysis  (gst_analysis, bank_analysis, fraud_flags, risk_score)

  Research Agent — run_research()
      → ResearchInsights   (news, litigation, sector risk)

  CAM Builder — build_cam_report()
      → Reads CreditAnalysis, produces the final CAM dict

All fields have safe defaults so partial data never causes KeyError / AttributeError.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Entity and loan profiles
# ---------------------------------------------------------------------------


class EntityProfile(BaseModel):
    company_name: str = ""
    cin: str = ""
    pan: str = ""
    sector: str = ""
    turnover: str = ""


class LoanDetails(BaseModel):
    loan_type: str = "Working Capital"
    loan_amount: str = "TBD"
    tenure: str = "TBD"
    interest_rate: str = "TBD"


# ---------------------------------------------------------------------------
# Financial data (from credit_ingestor Stage 4)
# ---------------------------------------------------------------------------


class GSTAnalysis(BaseModel):
    """Output from gst_bank_analyzer._summarise_gst()"""

    total_invoice_value: float = 0.0
    invoice_count: int = 0
    unique_buyers: int = 0
    unique_sellers: int = 0
    top_buyers: List[Dict[str, Any]] = Field(default_factory=list)


class BankAnalysis(BaseModel):
    """Output from gst_bank_analyzer._summarise_bank()"""

    total_credit_inflow: float = 0.0
    total_debit_outflow: float = 0.0
    net_flow: float = 0.0
    transaction_count: int = 0


class FraudSignal(BaseModel):
    """One entry from gst_bank_analyzer.analyze_gst_vs_bank() fraud_flags list."""

    flag: str  # REVENUE_INFLATION | CIRCULAR_TRADING | DENSE_SUBGRAPH
    description: str = ""
    ratio: Optional[float] = None       # REVENUE_INFLATION only
    cycle_count: Optional[int] = None   # CIRCULAR_TRADING only


class FinancialCommitments(BaseModel):
    """Extracted from PDF documents via extractor.py (LLM or regex heuristic)."""

    loan_amount: Optional[str] = None
    lender: Optional[str] = None
    sanction_limit: Optional[str] = None
    contingent_liabilities: Optional[str] = None
    legal_cases: Optional[str] = None
    guarantees: Optional[str] = None
    risk_flags: List[str] = Field(default_factory=list)


class FinancialAnalysis(BaseModel):
    """
    Complete output from Stage 4 (POST /extract-data).

    This is the authoritative source of risk_score and fraud_flags.
    Never override these with values from external services.
    """

    gst_analysis: GSTAnalysis = Field(default_factory=GSTAnalysis)
    bank_analysis: BankAnalysis = Field(default_factory=BankAnalysis)
    financial_commitments: FinancialCommitments = Field(default_factory=FinancialCommitments)

    # Fraud detection output from gst_bank_analyzer
    fraud_flags: List[FraudSignal] = Field(default_factory=list)

    # Composite risk score from credit_ingestor/risk_engine.py
    risk_score: int = 0          # 0–100
    risk_level: str = "Unknown"  # Low | Moderate | High


# ---------------------------------------------------------------------------
# Research insights (from research_agent)
# ---------------------------------------------------------------------------


class ResearchRiskSignals(BaseModel):
    litigation_cases: int = 0
    negative_news: int = 0
    sector_risk: str = "unknown"


class ResearchInsights(BaseModel):
    """Output from research_service.run_research() enriched with news & litigation."""

    ai_insight_summary: str = ""
    risk_signals: ResearchRiskSignals = Field(default_factory=ResearchRiskSignals)
    latest_research: Dict[str, Any] = Field(default_factory=dict)
    sector_trends: Dict[str, Any] = Field(default_factory=dict)
    macro_indicators: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Top-level pipeline model
# ---------------------------------------------------------------------------


class CreditAnalysis(BaseModel):
    """
    Complete pipeline data model.

    Populated progressively across all four pipeline stages and used by
    cam_builder.build_cam_report() to generate the final CAM report.

    All four inner models have safe defaults so callers can construct a
    partial CreditAnalysis without triggering validation errors.
    """

    entity_profile: EntityProfile = Field(default_factory=EntityProfile)
    loan_details: LoanDetails = Field(default_factory=LoanDetails)
    financial_analysis: FinancialAnalysis = Field(default_factory=FinancialAnalysis)
    research_insights: ResearchInsights = Field(default_factory=ResearchInsights)
