from services.ingestion_service import get_financial_analysis

def calculate_risk(session_id: str):
    financial_data = get_financial_analysis(session_id)
    financial_analysis = financial_data.get("financial_analysis", {})
    
    fraud_flags = financial_analysis.get("fraud_flags", [])
    risk_score = financial_analysis.get("risk_score", 50)
    
    overall_score = risk_score
    if fraud_flags:
        overall_score = min(100, overall_score + len(fraud_flags) * 10)
        
    financial_factors = [
        {
            "name": "Base Financial Score", 
            "impact": "Medium", 
            "description": f"Internal financial score of {risk_score}/100"
        }
    ]
    
    fraud_factors = []
    for flag in fraud_flags:
        desc = "Fraud alert triggered"
        impact = "High"
        
        if isinstance(flag, dict):
            name = flag.get("flag", "Fraud Risk")
            desc = flag.get("description", desc)
        else:
            name = "Fraud Alert"
            desc = str(flag)
            
        fraud_factors.append({
            "name": name,
            "impact": impact,
            "description": desc
        })
        
    categories = [
        {
            "name": "Financial Risk", 
            "score": risk_score, 
            "explanation": "Derived from core financial statement metrics.",
            "factors": financial_factors
        },
        {
            "name": "Operational Risk", 
            "score": len(fraud_flags) * 15, 
            "explanation": "Based on anomalies, circular trading, and transaction patterns.",
            "factors": fraud_factors if fraud_flags else [{"name": "Transaction patterns", "impact": "Low", "description": "No significant operational anomalies detected."}]
        }
    ]
    
    gst_summary = financial_analysis.get("gst_analysis", {})
    bank_summary = financial_analysis.get("bank_analysis", {})
    
    key_indicators = []
    
    if isinstance(gst_summary, dict) and "total_invoice_value" in gst_summary:
        val = gst_summary["total_invoice_value"]
        key_indicators.append({
            "name": "GST Invoice Value", 
            "value": val,
            "threshold": 1000000,
            "status": "safe" if val > 1000000 else "warning"
        })
        
    if isinstance(bank_summary, dict) and "total_credit_inflow" in bank_summary:
        val = bank_summary["total_credit_inflow"]
        key_indicators.append({
            "name": "Bank Credit Inflow", 
            "value": val,
            "threshold": 500000,
            "status": "safe" if val > 500000 else "warning"
        })
        
    if isinstance(gst_summary, dict) and "unique_buyers" in gst_summary:
        val = gst_summary["unique_buyers"]
        key_indicators.append({
            "name": "Unique Buyers", 
            "value": val,
            "threshold": 3,
            "status": "safe" if val >= 3 else "danger"
        })
        
    ai_reasoning = "Risk calculated based on financial extraction and fraud detection models."
    if fraud_flags:
        ai_reasoning += f" Detected {len(fraud_flags)} fraud flags."
        
    return {
        "entityId": session_id,
        "overallScore": overall_score,
        "categories": categories,
        "keyIndicators": key_indicators,
        "aiReasoning": ai_reasoning,
        "generatedAt": "now"
    }
