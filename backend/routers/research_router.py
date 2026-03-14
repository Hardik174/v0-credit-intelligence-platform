from fastapi import APIRouter
from services.research_service import run_research

router = APIRouter(prefix="/api/research", tags=["Research"])

@router.get("/{session_id}")
def get_research(session_id: str):
    return run_research(session_id)
