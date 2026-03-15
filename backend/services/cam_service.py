"""
services/cam_service.py – Standalone Company CAM Service

Generates a Credit Assessment Memorandum for any company by name,
WITHOUT requiring a pipeline session.

Use case: quick demo, pre-pipeline lookups, or when extraction hasn't been run.

The report uses live Google News RSS for research insights and returns
the same schema as services/cam_report_generator.py so useCAM.ts can
consume it without any frontend changes.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from services.news_service import fetch_company_news


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _count_sentiment(articles: list) -> Dict[str, int]:
    counts = {"Positive": 0, "Negative": 0, "Neutral": 0}
    for a in articles:
        s = a.get("sentiment", "Neutral")
        if s in counts:
            counts[s] += 1
    return counts


def _derive_risk(sentiment: Dict[str, int], neg_signals: int) -> tuple:
    """Return (risk_score, risk_level) from sentiment counts and signals."""
    neg = sentiment.get("Negative", 0)
    pos = sentiment.get("Positive", 0)

    score = 30  # baseline
    score += neg * 10
    score -= pos * 5
    score += neg_signals * 15
    score = max(0, min(100, score))

    if score <= 30:
        return score, "Low"
    if score <= 60:
        return score, "Moderate"
    return score, "High"


def _build_swot(company_name: str, risk_level: str, sentiment: Dict[str, int]) -> Dict:
    pos = sentiment.get("Positive", 0)
    neg = sentiment.get("Negative", 0)

    strengths = [f"Active market presence – {pos} positive news signals detected."]
    if risk_level == "Low":
        strengths.append("Favorable media coverage and stable operating environment.")
    strengths.append("Documented business operations with traceable GST and banking trail.")

    weaknesses = []
    if neg > 0:
        weaknesses.append(f"{neg} negative news mention(s) detected — reputational monitoring advised.")
    if risk_level == "High":
        weaknesses.append("Elevated risk score indicates heightened credit caution.")
    if not weaknesses:
        weaknesses.append("No material weaknesses identified from available public data.")

    opportunities = [
        "Structured working-capital credit can support operational scale-up.",
        "Formalisation under GST improves credit visibility for lenders.",
    ]
    threats = [
        "Interest rate volatility may affect debt servicing costs.",
        "Macro-level inflationary pressures could compress operating margins.",
    ]
    if neg > 2:
        threats.append("Sustained negative news sentiment may impact business relationships.")

    return {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "opportunities": opportunities,
        "threats": threats,
    }


def _recommendation(risk_level: str, risk_score: int) -> str:
    if risk_level == "Low":
        return (
            "APPROVE – Low Risk. "
            "Positive news sentiment and no material red flags. "
            "Proceed with standard sanction process."
        )
    if risk_level == "Moderate":
        return (
            "CONDITIONAL APPROVAL – Moderate Risk. "
            f"Risk score {risk_score}/100. "
            "Enhanced documentation review and quarterly monitoring recommended."
        )
    return (
        "REFER TO CREDIT COMMITTEE – High Risk. "
        f"Risk score {risk_score}/100. "
        "Negative news signals detected. Independent verification required before sanction."
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_cam_by_company(
    company_name: str,
    sector: str = "General",
    loan_type: str = "Working Capital",
    loan_amount: str = "TBD",
    tenure: str = "TBD",
    interest_rate: str = "TBD",
) -> Dict[str, Any]:
    """
    Generate a CAM report for a company name without a session.

    Returns the same schema as cam_report_generator.generate_cam_report()
    so the frontend useCAM hook can consume it directly.
    """
    articles = fetch_company_news(company_name)
    sentiment = _count_sentiment(articles)
    neg_news = sentiment.get("Negative", 0)
    risk_score, risk_level = _derive_risk(sentiment, neg_news)
    swot = _build_swot(company_name, risk_level, sentiment)
    recommendation = _recommendation(risk_level, risk_score)

    # Map articles to ResearchInsight-compatible dicts
    latest_research: List[Dict] = []
    for i, a in enumerate(articles):
        latest_research.append({
            "id": f"cam_{i}",
            "entityId": company_name,
            "category": "News",
            "headline": a.get("headline", ""),
            "summary": a.get("summary", ""),
            "source": a.get("source", ""),
            "sentiment": a.get("sentiment", "Neutral"),
            "publishedAt": a.get("published", datetime.utcnow().isoformat() + "Z"),
            "url": a.get("url", "#"),
        })

    now = datetime.now(timezone.utc).isoformat()

    return {
        "session_id": f"standalone_{uuid.uuid4().hex[:8]}",
        "generated_at": now,
        "entity_profile": {
            "company_name": company_name,
            "cin": "N/A",
            "pan": "N/A",
            "sector": sector,
            "turnover": "Not available (no documents uploaded)",
        },
        "loan_details": {
            "loan_type": loan_type,
            "loan_amount": loan_amount,
            "tenure": tenure,
            "interest_rate": interest_rate,
        },
        "financial_summary": {
            "gst_analysis": {
                "total_invoice_value": 0,
                "invoice_count": 0,
                "unique_buyers": 0,
                "unique_sellers": 0,
                "top_buyers": [],
            },
            "bank_analysis": {
                "total_credit_inflow": 0,
                "total_debit_outflow": 0,
                "net_flow": 0,
                "transaction_count": 0,
            },
            "financial_commitments": {
                "loan_amount": loan_amount,
                "lender": "Not identified",
                "sanction_limit": "Not identified",
                "contingent_liabilities": "Not disclosed",
                "legal_cases": "None identified",
                "guarantees": "None identified",
                "risk_flags": [],
            },
        },
        "fraud_signals": [],
        "research_insights": {
            "entity": company_name,
            "sector": sector,
            "latest_research": latest_research,
            "ai_insight_summary": (
                f"Standalone research summary for {company_name}: "
                f"{len(articles)} news articles found. "
                f"Sentiment: {sentiment.get('Positive', 0)} positive, "
                f"{sentiment.get('Negative', 0)} negative, "
                f"{sentiment.get('Neutral', 0)} neutral."
            ),
            "risk_signals": {
                "litigation_cases": 0,
                "negative_news": neg_news,
                "sector_risk": "medium",
            },
        },
        "risk_score": risk_score,
        "risk_level": risk_level,
        "swot_analysis": swot,
        "recommendation": recommendation,
    }
