import logging

logger = logging.getLogger(__name__)


def generate_insight(entity, articles, litigation_cases):

    combined_text = ""
    for a in articles:
        combined_text += a.get("summary", "") + "\n"

    # Try Ollama first; fall back to rule-based summary if unavailable
    try:
        import ollama
        prompt = f"""
You are a credit risk analyst.

Entity: {entity}

Recent news:
{combined_text}

Litigation cases detected: {litigation_cases}

Generate a short credit intelligence summary highlighting:
- sector risks
- legal risks
- operational outlook
- potential credit concerns

Keep it under 120 words.
"""
        response = ollama.chat(
            model="qwen2.5:3b",
            messages=[{"role": "user", "content": prompt}]
        )
        return response["message"]["content"]

    except Exception as exc:
        logger.warning("Ollama unavailable (%s). Using rule-based insight.", exc)
        return _rule_based_insight(entity, articles, litigation_cases)


def _rule_based_insight(entity: str, articles: list, litigation_cases) -> str:
    """Fallback credit intelligence summary when Ollama is not available."""
    lit_count = len(litigation_cases) if isinstance(litigation_cases, list) else int(litigation_cases or 0)
    news_count = len(articles)

    neg_keywords = {"fraud", "loss", "penalty", "lawsuit", "decline", "default", "bankruptcy"}
    pos_keywords = {"growth", "profit", "expansion", "award", "launch", "revenue", "partnership"}
    neg = sum(1 for a in articles if any(k in a.get("summary", "").lower() for k in neg_keywords))
    pos = sum(1 for a in articles if any(k in a.get("summary", "").lower() for k in pos_keywords))

    sentiment = "Mixed" if neg > 0 and pos > 0 else ("Positive" if pos > 0 else ("Negative" if neg > 0 else "Neutral"))

    litigation_note = (
        f"There are {lit_count} active litigation/regulatory events noted in the public domain, "
        "which may pose legal and reputational risk. "
        if lit_count > 0
        else "No significant litigation events detected. "
    )

    return (
        f"{entity} has {news_count} recent news article(s) with overall {sentiment} media sentiment. "
        f"{litigation_note}"
        "Sector and macroeconomic indicators show moderate growth outlook with inflationary pressures. "
        "Credit underwriters should review the latest financial statements and GST returns "
        "to validate declared revenue against banking transactions before sanctioning."
    )
