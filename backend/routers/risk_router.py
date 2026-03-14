from fastapi import APIRouter
from services.risk_service import calculate_risk

router = APIRouter(prefix="/api/risk-analysis", tags=["Risk Analysis"])

@router.get("/{session_id}")
def get_risk_analysis(session_id: str):
    return calculate_risk(session_id)
