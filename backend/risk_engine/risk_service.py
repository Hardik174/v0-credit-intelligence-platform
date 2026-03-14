import requests

DATA_INGESTOR_URL = ""


def calculate_risk(session_id: str):

    # 1️⃣ Financial data
    financial = requests.get(
        f"{DATA_INGESTOR_URL}/financial-analysis/{session_id}"
    ).json()

    # 2️⃣ Research signals
    research = requests.get(
        f"{DATA_INGESTOR_URL}/api/research/{session_id}"
    ).json()

    financial_analysis = financial.get("financial_analysis", {})

    fraud_flags = financial_analysis.get("fraud_flags", [])

    base_risk_score = financial_analysis.get("risk_score", 50)

    litigation = research["risk_signals"]["litigation_cases"]

    negative_news = research["risk_signals"]["negative_news"]

    # 3️⃣ Risk score calculation
    external_risk = len(litigation) * 10 + negative_news * 2

    final_score = min(100, base_risk_score + external_risk)

    # 4️⃣ Risk grading
    if final_score > 70:
        grade = "BB"
        recommendation = "REJECT"
    elif final_score > 40:
        grade = "BBB"
        recommendation = "REVIEW"
    else:
        grade = "A"
        recommendation = "APPROVE"

    reasoning = []

    if fraud_flags:
        reasoning.append("Financial fraud signals detected")

    if litigation:
        reasoning.append("Litigation exposure detected")

    if negative_news:
        reasoning.append("Negative news sentiment present")

    return {
        "loan_recommendation": recommendation,
        "risk_score": final_score,
        "risk_grade": grade,
        "reasoning": reasoning
    }