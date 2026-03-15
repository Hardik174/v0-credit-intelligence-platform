import logging
import uuid
from datetime import datetime

from services.ingestion_service import get_financial_analysis

logger = logging.getLogger(__name__)

# ── Shared sector/macro data ─────────────────────────────────────────────────
_SECTOR_TRENDS = [
    {"month": "Jul", "sectorIndex": 82, "entityPerformance": 78},
    {"month": "Aug", "sectorIndex": 85, "entityPerformance": 82},
    {"month": "Sep", "sectorIndex": 83, "entityPerformance": 85},
    {"month": "Oct", "sectorIndex": 88, "entityPerformance": 87},
    {"month": "Nov", "sectorIndex": 86, "entityPerformance": 90},
    {"month": "Dec", "sectorIndex": 90, "entityPerformance": 92},
    {"month": "Jan", "sectorIndex": 92, "entityPerformance": 88},
]

_MACRO_INDICATORS = [
    {"name": "GDP Growth Rate",       "value": 7.0,   "change": 0.3,  "trend": "up"},
    {"name": "Repo Rate",             "value": 6.5,   "change": 0.0,  "trend": "stable"},
    {"name": "Inflation (CPI)",       "value": 5.7,   "change": -0.2, "trend": "down"},
    {"name": "Steel Price Index",     "value": 112.5, "change": 2.3,  "trend": "up"},
    {"name": "USD/INR",               "value": 83.12, "change": 0.15, "trend": "up"},
    {"name": "Industrial Production", "value": 5.8,   "change": 0.5,  "trend": "up"},
]


def _fetch_news_safe(company_name: str) -> list:
    """
    Fetch news using the fast feedparser-only service.
    Falls back to the legacy newspaper3k collector on error.
    """
    try:
        from services.news_service import fetch_company_news
        return fetch_company_news(company_name)
    except Exception as exc:
        logger.warning("news_service failed (%s). Trying legacy collector.", exc)

    try:
        from .news_collector import collect_news
        raw = collect_news(company_name)
        # Normalise legacy format → news_service format
        return [
            {
                "headline": a.get("title", ""),
                "source": a.get("source", "Unknown"),
                "published": datetime.utcnow().isoformat() + "Z",
                "summary": a.get("summary", a.get("title", "")),
                "sentiment": "Neutral",
                "url": a.get("url", "#"),
            }
            for a in raw
        ]
    except Exception as exc2:
        logger.warning("Legacy news collector also failed (%s). Using fallback.", exc2)
        return []


def _check_litigation_safe(company_name: str):
    try:
        from .litigation_checker import check_litigation
        return check_litigation(company_name)
    except Exception as exc:
        logger.warning("Litigation check failed (%s).", exc)
        return []


def _build_research_response(
    company_name: str,
    sector: str,
    entity_id: str,
    news_articles: list,
    litigation,
    insight: str,
) -> dict:
    lit_count = len(litigation) if isinstance(litigation, list) else int(litigation or 0)
    latest_research = []

    if insight:
        latest_research.append({
            "id": f"res_{str(uuid.uuid4())[:8]}",
            "entityId": entity_id,
            "category": "AI Insight",
            "headline": "AI Research Summary",
            "summary": insight,
            "source": "IntelliCredit Agent",
            "sentiment": "Neutral",
            "publishedAt": datetime.utcnow().isoformat() + "Z",
            "url": "#",
        })

    for i, article in enumerate(news_articles):
        latest_research.append({
            "id": f"res_{entity_id}_{i}",
            "entityId": entity_id,
            "category": "News",
            "headline": article.get("headline", article.get("title", "No Title")),
            "summary": article.get("summary", "No summary available."),
            "source": article.get("source", "Unknown"),
            "sentiment": article.get("sentiment", "Neutral"),
            "publishedAt": article.get("published", datetime.utcnow().isoformat() + "Z"),
            "url": article.get("url", "#"),
        })

    return {
        "entity": company_name,
        "sector": sector,
        "latest_research": latest_research,
        "sector_trends": _SECTOR_TRENDS,
        "macro_indicators": _MACRO_INDICATORS,
        "risk_signals": {
            "litigation_cases": litigation,
            "negative_news": len(news_articles),
            "sector_risk": "medium",
        },
        "ai_insight_summary": insight,
    }


def run_research(session_id: str) -> dict:
    """Run research for a session. Returns structured data with fallbacks on any failure."""
    try:
        financial_data = get_financial_analysis(session_id)
    except Exception as exc:
        logger.error("get_financial_analysis failed for session %s: %s", session_id, exc)
        return {"error": str(exc)}

    entity_profile = financial_data.get("entity_profile", {})
    company_name = entity_profile.get("company_name", "Unknown Company")
    sector = entity_profile.get("sector", "Unknown")

    news_articles = _fetch_news_safe(company_name)
    litigation = _check_litigation_safe(company_name)

    try:
        from .insight_generator import generate_insight
        insight = generate_insight(company_name, news_articles, litigation)
    except Exception as exc:
        logger.warning("generate_insight failed (%s).", exc)
        insight = f"Research summary for {company_name}: No automated insight available."

    return _build_research_response(
        company_name=company_name,
        sector=sector,
        entity_id=session_id,
        news_articles=news_articles,
        litigation=litigation,
        insight=insight,
    )


def run_research_by_company(company_name: str, sector: str = "General") -> dict:
    """
    Standalone research by company name — no session required.
    Used by GET /api/research-insights/{company}.
    """
    company_id = f"standalone_{company_name[:20].replace(' ', '_')}"

    news_articles = _fetch_news_safe(company_name)
    litigation = _check_litigation_safe(company_name)

    try:
        from .insight_generator import generate_insight
        insight = generate_insight(company_name, news_articles, litigation)
    except Exception as exc:
        logger.warning("generate_insight failed (%s).", exc)
        insight = f"Research summary for {company_name}: No automated insight available."

    return _build_research_response(
        company_name=company_name,
        sector=sector,
        entity_id=company_id,
        news_articles=news_articles,
        litigation=litigation,
        insight=insight,
    )
