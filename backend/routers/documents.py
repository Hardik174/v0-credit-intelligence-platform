"""
routers/documents.py – Stage 2 & 3: Document Upload + Classification

Exposes:
  POST /upload-documents/{session_id}    – Stage 2
  POST /classify-documents/{session_id}  – Stage 3

Shares the session store and classification logic from credit_ingestor.
"""

import logging
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.credit_ingestor import config
from backend.credit_ingestor.classifier import classify_many
from backend.credit_ingestor.sessions import SessionStatus, store

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Document Management"])

ALLOWED_TYPES = {
    "application/pdf",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _require_session(session_id: str):
    session = store.get(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found. Call POST /entity-onboard first.",
        )
    return session


def _save_file(file: UploadFile, session_id: str) -> Path:
    dest_dir = config.UPLOAD_DIR / "sessions" / session_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / f"{uuid.uuid4().hex}_{file.filename}"
    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    return dest_path


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class ClassificationOverrideRequest(BaseModel):
    """Optional manual type overrides: { "filename.pdf": "Annual Report" }"""
    overrides: Dict[str, str] = {}


# ---------------------------------------------------------------------------
# Stage 2 – Document Upload
# ---------------------------------------------------------------------------

@router.post(
    "/upload-documents/{session_id}",
    summary="Stage 2 – Upload documents for a session",
)
async def upload_documents(
    session_id: str,
    files: List[UploadFile] = File(..., description="PDF, CSV, or Excel files"),
):
    """
    Upload one or more financial documents to an existing session.

    Accepted formats: PDF, CSV, XLS, XLSX.
    Files are saved under ``uploads/sessions/<session_id>/``.
    Classification happens in Stage 3.
    """
    session = _require_session(session_id)

    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    saved: List[Dict[str, Any]] = []
    rejected: List[Dict[str, str]] = []

    for f in files:
        if f.content_type not in ALLOWED_TYPES:
            rejected.append({
                "filename": f.filename,
                "reason": (
                    f"Unsupported content type '{f.content_type}'. "
                    "Accepted: PDF, CSV, Excel (.xlsx/.xls)."
                ),
            })
            continue

        saved_path = _save_file(f, session_id)
        size = saved_path.stat().st_size
        session.uploaded_files[f.filename] = {
            "path": str(saved_path),
            "size": size,
            "content_type": f.content_type,
        }
        saved.append({"filename": f.filename, "size_bytes": size})
        logger.info("Saved '%s' (%d B) → session %s", f.filename, size, session_id)

    if not saved:
        raise HTTPException(
            status_code=400,
            detail={"message": "All files were rejected.", "rejected": rejected},
        )

    session.status = SessionStatus.FILES_UPLOADED
    store.save(session)

    return JSONResponse(content={
        "session_id": session_id,
        "status": session.status.value,
        "uploaded": saved,
        "rejected": rejected,
        "total_files_in_session": len(session.uploaded_files),
        "next_step": f"POST /classify-documents/{session_id}",
    })


# ---------------------------------------------------------------------------
# Stage 3 – Document Classification
# ---------------------------------------------------------------------------

@router.post(
    "/classify-documents/{session_id}",
    summary="Stage 3 – Auto-classify uploaded documents",
)
async def classify_documents(
    session_id: str,
    body: ClassificationOverrideRequest = ClassificationOverrideRequest(),
):
    """
    Run the 3-layer document classifier on all uploaded files.

    Layers (first confident match wins):
      1. Filename pattern matching  (fast, no disk I/O)
      2. Content keyword search     (reads first 4 000 chars)
      3. LLM via Groq Llama3        (only if GROQ_API_KEY is set)

    Supply ``overrides`` to force a specific type for any filename:
      ``{ "overrides": { "myfile.xlsx": "GST Returns" } }``
    """
    session = _require_session(session_id)

    if not session.uploaded_files:
        raise HTTPException(
            status_code=400,
            detail="No documents uploaded yet. Call POST /upload-documents first.",
        )

    files_map: Dict[str, str] = {
        fname: meta["path"] for fname, meta in session.uploaded_files.items()
    }

    classification = classify_many(
        files=files_map,
        api_key=config.GROQ_API_KEY,
        overrides=body.overrides,
    )

    session.classification = classification
    session.status = SessionStatus.CLASSIFIED
    store.save(session)

    mode = "llm+heuristic" if config.GROQ_API_KEY else "heuristic"
    logger.info(
        "Classified %d doc(s) | session=%s | mode=%s | %s",
        len(classification), session_id, mode, classification,
    )

    return JSONResponse(content={
        "session_id": session_id,
        "status": session.status.value,
        "classification": classification,
        "classification_mode": mode,
        "next_step": f"POST /extract-data/{session_id}",
    })
