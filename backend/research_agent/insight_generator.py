import ollama


def generate_insight(entity, articles, litigation_cases):

    combined_text = ""

    for a in articles:
        combined_text += a["summary"] + "\n"

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