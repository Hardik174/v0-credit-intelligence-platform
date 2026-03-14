from services.ingestion_service import get_financial_analysis
from .news_collector import collect_news
from .litigation_checker import check_litigation
from .insight_generator import generate_insight
from datetime import datetime
import uuid

def run_research(session_id: str):
    try:
        financial_data = get_financial_analysis(session_id)
    except Exception as e:
        return {"error": str(e)}

    entity_profile = financial_data.get("entity_profile", {})
    company_name = entity_profile.get("company_name", "Unknown Company")
    sector = entity_profile.get("sector", "Unknown")

    raw_news = collect_news(company_name)
    litigation = check_litigation(company_name)
    insight = generate_insight(company_name, raw_news, litigation)
    
    # Map to frontend UI format
    latest_research = []
    
    # Add Insight string as a card
    if insight:
        latest_research.append({
            "id": f"res_{str(uuid.uuid4())[:8]}",
            "entityId": session_id,
            "category": "AI Insight",
            "headline": "AI Research Summary",
            "summary": insight,
            "source": "IntelliCredit Agent",
            "sentiment": "Neutral",
            "publishedAt": datetime.utcnow().isoformat() + "Z",
            "url": "#"
        })
        
    for i, item in enumerate(raw_news):
        latest_research.append({
            "id": f"res_{session_id}_{i}",
            "entityId": session_id,
            "category": "News",
            "headline": item.get("title", "No Title"),
            "summary": item.get("summary", "No Summary"),
            "source": item.get("source", "Unknown"),
            "sentiment": "Neutral",  # Would use FinBERT in production
            "publishedAt": datetime.utcnow().isoformat() + "Z",
            "url": item.get("url", "#")
        })

    # Return required formats
    return {
        "entity": company_name,
        "sector": sector,
        "latest_research": latest_research,
        "sector_trends": [
            { "month": 'Jul', "sectorIndex": 82, "entityPerformance": 78 },
            { "month": 'Aug', "sectorIndex": 85, "entityPerformance": 82 },
            { "month": 'Sep', "sectorIndex": 83, "entityPerformance": 85 },
            { "month": 'Oct', "sectorIndex": 88, "entityPerformance": 87 },
            { "month": 'Nov', "sectorIndex": 86, "entityPerformance": 90 },
            { "month": 'Dec', "sectorIndex": 90, "entityPerformance": 92 },
            { "month": 'Jan', "sectorIndex": 92, "entityPerformance": 88 },
        ],
        "macro_indicators": [
            { "name": 'GDP Growth Rate', "value": 7.0, "change": 0.3, "trend": 'up' },
            { "name": 'Repo Rate', "value": 6.5, "change": 0, "trend": 'stable' },
            { "name": 'Inflation (CPI)', "value": 5.7, "change": -0.2, "trend": 'down' },
            { "name": 'Steel Price Index', "value": 112.5, "change": 2.3, "trend": 'up' },
            { "name": 'USD/INR', "value": 83.12, "change": 0.15, "trend": 'up' },
            { "name": 'Industrial Production', "value": 5.8, "change": 0.5, "trend": 'up' },
        ],
        "risk_signals": {
            "litigation_cases": litigation,
            "negative_news": len(raw_news),
            "sector_risk": "medium"
        },
        "ai_insight_summary": insight
    }