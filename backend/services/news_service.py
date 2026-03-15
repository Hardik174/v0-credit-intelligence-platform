"""
services/news_service.py – Fast Google News RSS fetcher

Uses feedparser only – NO newspaper3k downloads (which cause 30-50s hangs).
Sentiment is determined with a lightweight keyword classifier.

Usage:
    from services.news_service import fetch_company_news
    articles = fetch_company_news("Tata Power")
"""

import logging
from datetime import datetime
from urllib.parse import quote

import feedparser

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Keyword-based sentiment classifier
# ---------------------------------------------------------------------------
_POSITIVE = frozenset({
    "growth", "profit", "revenue", "expansion", "record", "launch", "award",
    "milestone", "partnership", "upgrade", "strong", "increase", "innovative",
    "win", "wins", "approval", "approved", "recovery", "turnaround",
})
_NEGATIVE = frozenset({
    "fraud", "loss", "penalty", "lawsuit", "decline", "default", "bankruptcy",
    "scam", "investigation", "scandal", "controversy", "recall", "npa",
    "debt", "crisis", "downgrade", "risk", "concerns", "drop", "falls",
})


def _classify_sentiment(text: str) -> str:
    words = text.lower().split()
    pos = sum(1 for w in words if w.strip(".,!?") in _POSITIVE)
    neg = sum(1 for w in words if w.strip(".,!?") in _NEGATIVE)
    if neg > pos:
        return "Negative"
    if pos > neg:
        return "Positive"
    return "Neutral"


# ---------------------------------------------------------------------------
# Main fetch function
# ---------------------------------------------------------------------------

def fetch_company_news(company_name: str, max_articles: int = 6) -> list:
    """
    Fetch recent news for a company from Google News RSS.

    Parameters
    ----------
    company_name : str   Legal entity name or brand name.
    max_articles : int   Maximum articles to return (default 6).

    Returns
    -------
    list  of dicts: headline, source, published (ISO-8601), summary, sentiment, url
    """
    try:
        query = quote(f"{company_name} financial India")
        rss_url = (
            f"https://news.google.com/rss/search"
            f"?q={query}&hl=en-IN&gl=IN&ceid=IN:en"
        )
        feed = feedparser.parse(rss_url)

        if not feed.entries:
            logger.info("No Google News results for '%s' — using fallback.", company_name)
            return _fallback_news(company_name)

        articles = []
        for entry in feed.entries[:max_articles]:
            title = entry.get("title", "").strip()
            if not title:
                continue

            # feedparser gives us RSS summary (usually the article snippet)
            raw_summary = entry.get("summary", "")
            # Strip HTML tags from summary
            import re
            summary = re.sub(r"<[^>]+>", "", raw_summary).strip()[:400] or title

            # Source name
            source_obj = entry.get("source", {})
            if isinstance(source_obj, dict):
                source = source_obj.get("title", "Google News")
            else:
                source = getattr(source_obj, "title", "Google News")

            # Published timestamp
            published = datetime.utcnow().isoformat() + "Z"
            if entry.get("published_parsed"):
                try:
                    published = datetime(*entry.published_parsed[:6]).isoformat() + "Z"
                except Exception:
                    pass

            sentiment = _classify_sentiment(f"{title} {summary}")

            articles.append({
                "headline": title,
                "source": source,
                "published": published,
                "summary": summary,
                "sentiment": sentiment,
                "url": entry.get("link", "#"),
            })

        return articles if articles else _fallback_news(company_name)

    except Exception as exc:
        logger.warning("fetch_company_news error for '%s': %s", company_name, exc)
        return _fallback_news(company_name)


# ---------------------------------------------------------------------------
# Fallback articles (shown when RSS feed fails or returns nothing)
# ---------------------------------------------------------------------------

def _fallback_news(company_name: str) -> list:
    now = datetime.utcnow().isoformat() + "Z"
    return [
        {
            "headline": f"{company_name}: Q4 revenue up 12% YoY driven by domestic demand",
            "source": "Business Standard (Demo)",
            "published": now,
            "summary": (
                f"{company_name} reported a 12% year-on-year revenue increase in Q4, "
                "driven by strong domestic demand and operational efficiency improvements. "
                "Management has maintained its full-year guidance."
            ),
            "sentiment": "Positive",
            "url": "#",
        },
        {
            "headline": f"CRISIL affirms AA rating outlook for {company_name}",
            "source": "CRISIL (Demo)",
            "published": now,
            "summary": (
                "Rating agency affirmed stable outlook citing consistent cash flows, "
                "manageable debt levels, and strong track record of debt servicing."
            ),
            "sentiment": "Positive",
            "url": "#",
        },
        {
            "headline": "Sector outlook revised to cautious amid global headwinds",
            "source": "Economic Times (Demo)",
            "published": now,
            "summary": (
                "Rising input costs, elevated inflation, and global supply-chain disruptions "
                "have prompted analysts to revise the sector outlook to cautious for H1."
            ),
            "sentiment": "Neutral",
            "url": "#",
        },
    ]
