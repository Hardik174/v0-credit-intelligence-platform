from services.ingestion_service import get_financial_analysis
from services.research_service import run_research
from credit_engine.credit_engine import compute_credit_decision

def get_credit_decision(session_id: str):
    financial_data = get_financial_analysis(session_id)
    financial_analysis = financial_data.get("financial_analysis", {})
    internal_risk_score = financial_analysis.get("risk_score", 50)
    risk_level = financial_analysis.get("risk_level", "Moderate")
    fraud_flags = financial_analysis.get("fraud_flags", [])
    
    research = run_research(session_id)
    credit_decision_external = compute_credit_decision(research)
    external_risk_score = credit_decision_external.get("risk_score", 0)
    
    fraud_penalty = len(fraud_flags) * 15
    final_risk_score = min(100, int(internal_risk_score * 0.5 + external_risk_score * 0.5 + fraud_penalty))
    
    if final_risk_score < 40:
        decision = "approve"
        grade = "A"
    elif final_risk_score < 70:
        decision = "review"
        grade = "BBB"
    else:
        decision = "reject"
        grade = "BB"
        
    confidence_score = max(0.1, 1.0 - (final_risk_score / 100))
    
    reasoning = credit_decision_external.get("reasoning", [])
    if fraud_flags:
        reasoning.append(f"Detected {len(fraud_flags)} fraud flags.")
    reasoning.append(f"Internal financial risk level: {risk_level}")
    
    return {
        "decision": decision,
        "loan_recommendation": decision.upper(),
        "risk_score": final_risk_score,
        "risk_grade": grade,
        "confidence_score": confidence_score,
        "reasoning": reasoning
    }
