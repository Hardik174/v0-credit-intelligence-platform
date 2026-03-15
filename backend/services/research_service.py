from research_agent.research_service import (
    run_research as engine_run_research,
    run_research_by_company as engine_run_research_by_company,
)


def run_research(session_id: str):
    return engine_run_research(session_id)


def run_research_by_company(company_name: str, sector: str = "General"):
    return engine_run_research_by_company(company_name, sector)
