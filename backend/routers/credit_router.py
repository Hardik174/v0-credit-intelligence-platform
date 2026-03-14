from fastapi import APIRouter
from services.credit_service import get_credit_decision

router = APIRouter(prefix="/api/credit-decision", tags=["Credit Decision"])

@router.get("/{session_id}")
def get_credit(session_id: str):
    return get_credit_decision(session_id)
