"""
routers/onboarding.py – Stage 1: Entity Onboarding

Exposes POST /entity-onboard at the root level (no /api/ingestor prefix).
Shares the same credit_ingestor session store so sessions created here
are visible to all downstream routers.
"""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.credit_ingestor.sessions import store

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Onboarding"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class LoanDetails(BaseModel):
    loan_type: str
    loan_amount: str
    tenure: str
    interest_rate: str


class EntityOnboardRequest(BaseModel):
    company_name: str
    cin: str
    pan: str
    sector: str
    turnover: str
    loan_details: LoanDetails


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/entity-onboard",
    summary="Register entity and open a credit pipeline session",
    status_code=201,
)
async def entity_onboard(request: EntityOnboardRequest):
    """
    Stage 1 – Register the borrower entity and loan application details.

    Creates an in-memory session keyed by a UUID ``session_id``.
    Pass this ID to every subsequent stage endpoint.
    """
    entity_profile = {
        "company_name": request.company_name,
        "cin": request.cin,
        "pan": request.pan,
        "sector": request.sector,
        "turnover": request.turnover,
    }
    loan_details = request.loan_details.model_dump()

    session = store.create(
        entity_profile=entity_profile,
        loan_details=loan_details,
    )

    logger.info(
        "Entity onboarded | session=%s | company='%s'",
        session.session_id,
        request.company_name,
    )

    return JSONResponse(
        status_code=201,
        content={
            "session_id": session.session_id,
            "status": session.status.value,
            "entity_profile": entity_profile,
            "loan_details": loan_details,
            "next_step": f"POST /upload-documents/{session.session_id}",
        },
    )
