"""
routers/analysis.py – Financial Analysis Export

Exposes GET /financial-analysis/{session_id}.

Returns the structured FullAnalysisResponse for downstream modules
(Research Agent, Recommendation Engine, CAM Generator).
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from backend.credit_ingestor.sessions import store

router = APIRouter(tags=["Financial Analysis"])


def _require_session(session_id: str):
    session = store.get(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found. Call POST /entity-onboard first.",
        )
    return session


@router.get(
    "/financial-analysis/{session_id}",
    summary="Retrieve structured financial analysis for a completed session",
)
async def get_financial_analysis(session_id: str):
    """
    Return the full ``FullAnalysisResponse`` for a session that has completed
    Stage 4 (extract-data).

    Designed to be consumed by:
    - Research Agent   → entity_profile, fraud_flags
    - Risk Engine      → risk_score, risk_level
    - CAM Generator    → full report assembly

    Returns **HTTP 400** if extraction has not been run yet.
    """
    session = _require_session(session_id)

    if session.financial_analysis is None:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Session '{session_id}' has not completed extraction yet. "
                f"Current status: '{session.status.value}'. "
                "Call POST /extract-data first."
            ),
        )

    return JSONResponse(content=session.financial_analysis)
