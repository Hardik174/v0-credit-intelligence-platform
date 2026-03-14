def compute_credit_decision(research_output):

    risk_score = 0
    reasoning = []

    negative_news = research_output["risk_signals"]["negative_news"]
    litigation_cases = len(research_output["risk_signals"]["litigation_cases"])
    sector_risk = research_output["risk_signals"]["sector_risk"]

    if negative_news > 3:
        risk_score += 25
        reasoning.append("High negative media sentiment")

    if litigation_cases > 0:
        risk_score += 20
        reasoning.append("Active litigation exposure")

    if sector_risk == "medium":
        risk_score += 15
        reasoning.append("Moderate sector risk")

    if sector_risk == "high":
        risk_score += 30
        reasoning.append("High sector risk")

    risk_score = min(risk_score, 100)

    if risk_score < 30:
        recommendation = "APPROVE"
        grade = "A"

    elif risk_score < 60:
        recommendation = "REVIEW"
        grade = "BBB"

    else:
        recommendation = "REJECT"
        grade = "BB"

    return {
        "loan_recommendation": recommendation,
        "risk_score": risk_score,
        "risk_grade": grade,
        "reasoning": reasoning
    }