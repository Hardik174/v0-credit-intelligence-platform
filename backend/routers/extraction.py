"""
routers/extraction.py – Stage 4: Data Extraction & Fraud Detection

Exposes POST /extract-data/{session_id}.

Delegates the heavy lifting to credit_ingestor._run_extraction_pipeline
via the services layer.
"""

import json
import logging
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from credit_ingestor import config
from credit_ingestor.sessions import SessionStatus, store
from services.ingestion_service import run_extraction_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Extraction"])


def _require_session(session_id: str):
    session = store.get(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found. Call POST /entity-onboard first.",
        )
    return session


@router.post(
    "/extract-data/{session_id}",
    summary="Stage 4 – Run extraction, fraud detection, and risk scoring",
)
async def extract_data(session_id: str):
    """
    Execute the full financial extraction pipeline on classified documents:

    - ``parse_pdf`` → raw text from all PDF-type documents
    - ``extract_financial_data`` → LLM / heuristic extraction of commitments
    - ``parse_gst_file`` + ``parse_bank_file`` → normalised tabular data
    - ``analyze_gst_vs_bank`` → revenue inflation + circular trading detection
    - ``compute_risk_score`` → composite 0-100 risk score

    Returns the complete ``FullAnalysisResponse`` schema:
    ``{ entity_profile, loan_details, financial_analysis }``
    """
    session = _require_session(session_id)

    if not session.classification:
        raise HTTPException(
            status_code=400,
            detail=(
                "Documents have not been classified yet. "
                "Call POST /classify-documents first."
            ),
        )

    output = run_extraction_pipeline(session)

    session.financial_analysis = output
    session.status = SessionStatus.EXTRACTED
    store.save(session)

    # Persist report to disk
    safe_name = (
        session.entity_profile.get("company_name", session_id)
        .replace(" ", "_").replace("/", "-")
    )
    config.OUTPUT_DIR.mkdir(exist_ok=True)
    report_path = config.OUTPUT_DIR / f"{uuid.uuid4().hex}_{safe_name}_report.json"
    with report_path.open("w") as rf:
        json.dump(output, rf, indent=2)

    logger.info(
        "Extraction complete | session=%s | company='%s' | score=%d | level=%s",
        session_id,
        session.entity_profile.get("company_name", ""),
        output["financial_analysis"]["risk_score"],
        output["financial_analysis"]["risk_level"],
    )

    return JSONResponse(
        content={"session_id": session_id, "status": session.status.value, **output}
    )
