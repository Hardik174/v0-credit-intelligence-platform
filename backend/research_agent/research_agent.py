from .schemas import ResearchOutput
from .news_collector import collect_news
from .macro_collector import get_macro_indicators
from .litigation_checker import check_litigation
from .insight_generator import generate_insight


def run_research(entity):

    output = ResearchOutput()

    output.entity = entity

    news = collect_news(entity)

    litigation = check_litigation(entity)

    macro = get_macro_indicators()

    insight = generate_insight(entity, news, litigation)

    output.latest_research = news

    output.macro_indicators = macro

    output.risk_signals = {
        "litigation_cases": litigation,
        "negative_news": len(news),
        "regulatory_alerts": 1,
        "sector_risk": "medium"
    }

    output.ai_insight_summary = insight

    return output.to_dict()