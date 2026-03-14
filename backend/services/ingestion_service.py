from fastapi import HTTPException
from credit_ingestor.sessions import store

def get_session(session_id: str):
    session = store.get(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found. Call POST /entity-onboard first.",
        )
    return session

def get_financial_analysis(session_id: str):
    session = get_session(session_id)
    if session.financial_analysis is None:
        raise HTTPException(
            status_code=400,
            detail="Session has not completed extraction yet."
        )
    return session.financial_analysis

def get_entity_profile(session_id: str):
    session = get_session(session_id)
    return session.entity_profile

def get_loan_details(session_id: str):
    session = get_session(session_id)
    return session.loan_details
