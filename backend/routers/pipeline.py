"""
routers/pipeline.py – Single Orchestration Endpoint

Exposes POST /run-full-credit-analysis

Accepts entity data + documents in one multipart/form-data call and
executes all 7 pipeline stages internally, returning a complete
{ session_id, risk_score, risk_level, cam_report } response.

Stages
──────
  1. Entity Onboarding       → create session
  2. Document Upload         → save files
  3. Document Classification → 3-layer classifier
  4. Data Extraction         → LLM + heuristic + fraud detection
  5. Financial Analysis      → risk score assembly
  6. Research Agent          → news + litigation + macro (non-fatal)
  7. CAM Generation          → full structured report
"""

import logging
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from backend.credit_ingestor import config
from backend.credit_ingestor.classifier import classify_many
from backend.credit_ingestor.sessions import SessionStatus, store
from backend.services.cam_report_generator import generate_cam_report
from backend.services.ingestion_service import run_extraction_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Pipeline"])

ALLOWED_TYPES = {
    "application/pdf",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _save_file(file: UploadFile, session_id: str) -> Path:
    dest_dir = config.UPLOAD_DIR / "sessions" / session_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"{uuid.uuid4().hex}_{file.filename}"
    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    return dest_path


@router.post(
    "/run-full-credit-analysis",
    summary="Run the complete credit underwriting pipeline in a single call",
)
async def run_full_credit_analysis(
    # ── Entity details ────────────────────────────────────────────────────
    company_name: str = Form(..., description="Legal company name"),
    cin: str = Form(default="", description="Corporate Identification Number"),
    pan: str = Form(default="", description="PAN of the entity"),
    sector: str = Form(default="", description="Industry / sector"),
    turnover: str = Form(default="", description="Annual turnover (e.g. 'INR 48 Cr')"),
    # ── Loan details ──────────────────────────────────────────────────────
    loan_type: str = Form(default="Working Capital", description="Type of credit facility"),
    loan_amount: str = Form(default="", description="Requested loan amount"),
    tenure: str = Form(default="", description="Loan tenure (e.g. '5 years')"),
    interest_rate: str = Form(default="", description="Indicative interest rate"),
    # ── Documents ─────────────────────────────────────────────────────────
    files: Optional[List[UploadFile]] = File(
        default=None,
        description="PDF, CSV, or Excel financial documents (optional)",
    ),
):
    """
    **Single-call orchestration endpoint.**

    Upload entity details and financial documents; receive a complete
    CAM report with risk score, fraud signals, SWOT, and recommendation.

    All seven pipeline stages run synchronously in-process.
    The ``session_id`` is returned so you can retrieve individual stage
    results later via the separate stage endpoints.
    """

    # ── Stage 1: Entity Onboarding ────────────────────────────────────────
    entity_profile: Dict[str, Any] = {
        "company_name": company_name,
        "cin": cin,
        "pan": pan,
        "sector": sector,
        "turnover": turnover,
    }
    loan_details: Dict[str, Any] = {
        "loan_type": loan_type,
        "loan_amount": loan_amount,
        "tenure": tenure,
        "interest_rate": interest_rate,
    }
    session = store.create(entity_profile=entity_profile, loan_details=loan_details)
    session_id = session.session_id
    logger.info("Pipeline | Stage 1 complete | session=%s | company='%s'", session_id, company_name)

    # ── Stage 2: Document Upload ──────────────────────────────────────────
    if files:
        for f in files:
            if f.content_type not in ALLOWED_TYPES:
                logger.warning("Pipeline | Rejected '%s' (%s)", f.filename, f.content_type)
                continue
            saved_path = _save_file(f, session_id)
            session.uploaded_files[f.filename] = {
                "path": str(saved_path),
                "size": saved_path.stat().st_size,
                "content_type": f.content_type,
            }
        session.status = SessionStatus.FILES_UPLOADED
        store.save(session)
        logger.info(
            "Pipeline | Stage 2 complete | %d file(s) saved | session=%s",
            len(session.uploaded_files), session_id,
        )

    # ── Stage 3: Document Classification ─────────────────────────────────
    if session.uploaded_files:
        files_map: Dict[str, str] = {
            fname: meta["path"] for fname, meta in session.uploaded_files.items()
        }
        classification = classify_many(
            files=files_map,
            api_key=config.GROQ_API_KEY,
            overrides={},
        )
        session.classification = classification
        session.status = SessionStatus.CLASSIFIED
        store.save(session)
        logger.info("Pipeline | Stage 3 complete | session=%s | %s", session_id, classification)
    else:
        # No documents – use an empty classification so extraction can still run
        session.classification = {}
        session.status = SessionStatus.CLASSIFIED
        store.save(session)
        logger.info("Pipeline | Stage 3 skipped (no files) | session=%s", session_id)

    # ── Stage 4: Data Extraction + Fraud Detection ────────────────────────
    try:
        output = run_extraction_pipeline(session)
        session.financial_analysis = output
        session.status = SessionStatus.EXTRACTED
        store.save(session)
        logger.info(
            "Pipeline | Stage 4 complete | score=%d | level=%s | session=%s",
            output["financial_analysis"]["risk_score"],
            output["financial_analysis"]["risk_level"],
            session_id,
        )
    except Exception as exc:
        logger.error("Pipeline | Stage 4 failed | session=%s | %s", session_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Extraction pipeline failed: {exc}",
        ) from exc

    # ── Stages 5-7: Research Agent + CAM Generation ───────────────────────
    try:
        cam = generate_cam_report(session_id)
    except Exception as exc:
        logger.error("Pipeline | CAM generation failed | session=%s | %s", session_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"CAM generation failed: {exc}",
        ) from exc

    logger.info(
        "Pipeline | Complete | session=%s | score=%d | rec='%s'",
        session_id,
        cam["risk_score"],
        cam["recommendation"][:50],
    )

    return JSONResponse(content={
        "session_id": session_id,
        "risk_score": cam["risk_score"],
        "risk_level": cam["risk_level"],
        "download_url": f"/download-cam/{session_id}",
        "cam_report": cam,
    })
