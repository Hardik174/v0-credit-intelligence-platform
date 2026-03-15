from fastapi import APIRouter
from services.research_service import run_research, run_research_by_company

router = APIRouter(prefix="/api/research", tags=["Research"])

# Standalone company-based endpoint (no session required)
insights_router = APIRouter(prefix="/api", tags=["Research"])


@router.get("/{session_id}", summary="Research insights for a pipeline session")
def get_research(session_id: str):
    """
    Fetch research insights (news, litigation, macro, sector trends) for a
    session that has been onboarded. Company name is taken from the session's
    entity profile.
    """
    return run_research(session_id)


@insights_router.get(
    "/research-insights/{company}",
    summary="Research insights by company name (no session required)",
)
def get_research_by_company(company: str, sector: str = "General"):
    """
    Standalone research endpoint – fetch live news, macro indicators, and
    sector trends for any company name without first creating a session.

    Useful for quick lookups or when the pipeline has not yet been run.

    Example: `GET /api/research-insights/Tata%20Power?sector=Power`
    """
    return run_research_by_company(company_name=company, sector=sector)
