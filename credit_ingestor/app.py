"""
app.py - FastAPI server and API endpoints for IntelliCredit Data Ingestor Pipeline.

Endpoints
─────────
Legacy (unchanged):
  GET  /health                       Liveness probe
  POST /upload/pdf                   Upload + immediately parse one PDF
  POST /upload/gst                   Upload + preview one GST CSV/Excel
  POST /upload/bank                  Upload + preview one Bank CSV/Excel
  POST /analyze                      Ad-hoc single-request full pipeline

New multi-stage workflow:
  POST /entity-onboard               Stage 1 - register company + loan details
  POST /upload-documents/{sid}       Stage 2 - bulk document upload
  POST /classify-documents/{sid}     Stage 3 - auto-classify + manual overrides
  POST /extract-data/{sid}           Stage 4 - run full extraction & fraud pipeline
  GET  /financial-analysis/{sid}     Export structured analysis for downstream modules
"""

import json
import logging
import shutil
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

# config must be imported first - it triggers .env loading via python-dotenv
# and exposes typed constants for all settings (API keys, paths, thresholds).
from . import config

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .classifier import DOCUMENT_TYPES, classify_many
from .extractor import extract_financial_data
from .gst_bank_analyzer import analyze_gst_vs_bank
from .parser import parse_bank_file, parse_gst_file, parse_pdf
from .risk_engine import compute_risk_score, generate_report
from .sessions import SessionStatus, store

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic request models (new endpoints only)
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


class ClassificationOverrideRequest(BaseModel):
    """Optional manual overrides: {original_filename: document_type_label}"""
    overrides: Dict[str, str] = {}


# ---------------------------------------------------------------------------
# Lifespan: startup validation
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(application: FastAPI):
    """Run config validation on startup so the operator knows what is enabled."""
    status = config.validate_config()
    llm_status = "ENABLED" if status["llm_enabled"] else "DISABLED (heuristic mode)"
    logger.info("=== IntelliCredit startup ===")
    logger.info("LLM extraction: %s", llm_status)
    if status["warnings"]:
        for w in status["warnings"]:
            logger.warning("CONFIG WARNING: %s", w)
    config.UPLOAD_DIR.mkdir(exist_ok=True)
    config.OUTPUT_DIR.mkdir(exist_ok=True)
    yield
    logger.info("IntelliCredit shutdown.")


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="IntelliCredit - Data Ingestor API",
    description=(
        "Corporate credit intelligence: multi-stage entity onboarding, "
        "document ingestion, fraud detection, and risk scoring."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS – allow the Next.js frontend at localhost:3000
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_PDF_TYPES = {"application/pdf"}
ALLOWED_TABLE_TYPES = {
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
ALL_ALLOWED_TYPES = ALLOWED_PDF_TYPES | ALLOWED_TABLE_TYPES


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _save_upload(file: UploadFile, subfolder: str) -> Path:
    """Persist an uploaded file to uploads/<subfolder>/ and return its path."""
    dest_dir = config.UPLOAD_DIR / subfolder
    dest_dir.mkdir(parents=True, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{file.filename}"
    dest_path = dest_dir / unique_name
    with dest_path.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)
    return dest_path


def _require_session(session_id: str):
    """Return session or raise 404 with a descriptive message."""
    session = store.get(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=f"Session '{session_id}' not found. Call POST /entity-onboard first.",
        )
    return session


def _build_financial_output(
    entity_profile: Dict[str, Any],
    loan_details: Dict[str, Any],
    financial_commitments: Dict[str, Any],
    gst_analysis: Dict[str, Any],
    bank_analysis: Dict[str, Any],
    fraud_flags: List[Any],
    risk_score: int,
    risk_level: str,
) -> Dict[str, Any]:
    """
    Assemble the shared output schema consumed by the Research Agent and
    Recommendation Engine.
    """
    return {
        "entity_profile": entity_profile,
        "loan_details": loan_details,
        "financial_analysis": {
            "financial_commitments": financial_commitments,
            "gst_analysis": gst_analysis,
            "bank_analysis": bank_analysis,
            "fraud_flags": fraud_flags,
            "risk_score": risk_score,
            "risk_level": risk_level,
        },
    }


def _run_extraction_pipeline(session) -> Dict[str, Any]:
    """
    Execute the full extraction + fraud detection pipeline for a session.

    Document-to-role mapping by classification label:
      PDF roles     : Annual Report, Sanction Letter, Legal Notice, ALM,
                      Borrowing Profile, Portfolio Data, Unknown
                      -> all text is concatenated, one extract_financial_data() call
      GST Returns   -> first file found -> parse_gst_file()
      Bank Statement-> first file found -> parse_bank_file()

    Calls only existing module functions; no extraction logic is duplicated here.
    """
    PDF_ROLES = {
        "Annual Report",
        "Sanction Letter",
        "Legal Notice",
        "ALM",
        "Borrowing Profile",
        "Portfolio Data",
        "Unknown",
    }

    pdf_texts: List[str] = []
    gst_path: Optional[str] = None
    bank_path: Optional[str] = None

    for filename, doc_type in session.classification.items():
        if filename not in session.uploaded_files:
            continue
        saved_path = session.uploaded_files[filename]["path"]

        if doc_type in PDF_ROLES:
            try:
                pdf_texts.append(parse_pdf(saved_path))
            except Exception as exc:
                logger.warning("PDF parse failed for '%s': %s", filename, exc)
        elif doc_type == "GST Returns" and gst_path is None:
            gst_path = saved_path
        elif doc_type == "Bank Statement" and bank_path is None:
            bank_path = saved_path

    # Stage A: PDF text extraction + LLM/heuristic extraction
    combined_text = "\n\n".join(pdf_texts)
    pdf_extracted = extract_financial_data(combined_text) if combined_text.strip() else {}

    # Stage B: Tabular parsing
    gst_df = parse_gst_file(gst_path) if gst_path else None
    bank_df = parse_bank_file(bank_path) if bank_path else None

    # Stage C: GST vs Bank cross-analysis + fraud detection
    gst_bank_analysis: Dict[str, Any] = {}
    if gst_df is not None or bank_df is not None:
        gst_bank_analysis = analyze_gst_vs_bank(gst_df, bank_df)

    # Stage D: Composite risk scoring
    risk_result = compute_risk_score(pdf_extracted, gst_bank_analysis)

    return _build_financial_output(
        entity_profile=session.entity_profile,
        loan_details=session.loan_details,
        financial_commitments=pdf_extracted,
        gst_analysis=gst_bank_analysis.get("gst_summary", {}),
        bank_analysis=gst_bank_analysis.get("bank_summary", {}),
        fraud_flags=gst_bank_analysis.get("fraud_flags", []),
        risk_score=risk_result["score"],
        risk_level=risk_result["level"],
    )


# ===========================================================================
#  LEGACY ENDPOINTS  (preserved exactly - no logic changes)
# ===========================================================================

@app.get("/health", tags=["System"])
def health_check():
    """Liveness probe. Returns LLM enablement status and active session count."""
    return {
        "status": "ok",
        "service": "IntelliCredit Data Ingestor",
        "version": "2.0.0",
        "llm_enabled": bool(config.GROQ_API_KEY),
        "groq_model": config.GROQ_MODEL if config.GROQ_API_KEY else None,
        "active_sessions": store.count(),
    }


@app.post("/upload/pdf", tags=["Legacy - Single Upload"])
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a single PDF and immediately extract financial data from it."""
    if file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
    saved_path = _save_upload(file, "pdfs")
    raw_text = parse_pdf(str(saved_path))
    extracted = extract_financial_data(raw_text)
    return JSONResponse(content={
        "file": file.filename,
        "extraction_mode": "llm" if config.GROQ_API_KEY else "heuristic",
        "extracted_data": extracted,
    })


@app.post("/upload/gst", tags=["Legacy - Single Upload"])
async def upload_gst(file: UploadFile = File(...)):
    """Upload a single GST returns CSV/Excel and preview normalised records."""
    if file.content_type not in ALLOWED_TABLE_TYPES:
        raise HTTPException(status_code=400, detail="Only CSV/Excel files are accepted.")
    saved_path = _save_upload(file, "gst")
    gst_df = parse_gst_file(str(saved_path))
    return JSONResponse(content={
        "file": file.filename,
        "records": len(gst_df),
        "sample": gst_df.head(5).to_dict(orient="records"),
    })


@app.post("/upload/bank", tags=["Legacy - Single Upload"])
async def upload_bank(file: UploadFile = File(...)):
    """Upload a single bank statement CSV/Excel and preview normalised records."""
    if file.content_type not in ALLOWED_TABLE_TYPES:
        raise HTTPException(status_code=400, detail="Only CSV/Excel files are accepted.")
    saved_path = _save_upload(file, "bank")
    bank_df = parse_bank_file(str(saved_path))
    return JSONResponse(content={
        "file": file.filename,
        "records": len(bank_df),
        "sample": bank_df.head(5).to_dict(orient="records"),
    })


@app.post("/analyze", tags=["Legacy - Ad-hoc Analysis"])
async def analyze(
    company_name: str = Form(...),
    pdf_file: UploadFile = File(None),
    gst_file: UploadFile = File(None),
    bank_file: UploadFile = File(None),
):
    """
    Ad-hoc single-request full pipeline (all stages in one call).
    Submit company_name + up to 3 files and receive a complete risk report.
    """
    if not any([pdf_file, gst_file, bank_file]):
        raise HTTPException(status_code=400, detail="Provide at least one file.")

    pdf_extracted: Dict[str, Any] = {}
    gst_df = None
    bank_df = None

    if pdf_file:
        if pdf_file.content_type not in ALLOWED_PDF_TYPES:
            raise HTTPException(status_code=400, detail="pdf_file must be a PDF.")
        pdf_path = _save_upload(pdf_file, "pdfs")
        raw_text = parse_pdf(str(pdf_path))
        pdf_extracted = extract_financial_data(raw_text)

    if gst_file:
        if gst_file.content_type not in ALLOWED_TABLE_TYPES:
            raise HTTPException(status_code=400, detail="gst_file must be CSV/Excel.")
        gst_path = _save_upload(gst_file, "gst")
        gst_df = parse_gst_file(str(gst_path))

    if bank_file:
        if bank_file.content_type not in ALLOWED_TABLE_TYPES:
            raise HTTPException(status_code=400, detail="bank_file must be CSV/Excel.")
        bank_path = _save_upload(bank_file, "bank")
        bank_df = parse_bank_file(str(bank_path))

    gst_bank_analysis: Dict[str, Any] = {}
    if gst_df is not None and bank_df is not None:
        gst_bank_analysis = analyze_gst_vs_bank(gst_df, bank_df)
    elif gst_df is not None:
        gst_bank_analysis = analyze_gst_vs_bank(gst_df, None)
    elif bank_df is not None:
        gst_bank_analysis = analyze_gst_vs_bank(None, bank_df)

    risk_result = compute_risk_score(pdf_extracted, gst_bank_analysis)

    report = generate_report(
        company=company_name,
        financial_commitments=pdf_extracted,
        gst_analysis=gst_bank_analysis.get("gst_summary", {}),
        bank_analysis=gst_bank_analysis.get("bank_summary", {}),
        fraud_flags=gst_bank_analysis.get("fraud_flags", []),
        risk_score=risk_result["score"],
        risk_level=risk_result["level"],
    )

    safe_name = company_name.replace(" ", "_").replace("/", "-")
    report_path = config.OUTPUT_DIR / f"{uuid.uuid4().hex}_{safe_name}_report.json"
    with report_path.open("w") as rf:
        json.dump(report, rf, indent=2)

    logger.info(
        "Report generated | company='%s' | score=%d | level=%s | file=%s",
        company_name, risk_result["score"], risk_result["level"], report_path.name,
    )
    return JSONResponse(content=report)


# ===========================================================================
#  STAGE 1 - Entity Onboarding
# ===========================================================================

@app.post("/entity-onboard", tags=["Stage 1 - Entity Onboarding"])
async def entity_onboard(request: EntityOnboardRequest):
    """
    Register a new company and loan details and open a pipeline session.

    Creates a session_id that must be passed to all subsequent stage endpoints.
    Sessions are held in memory for the duration of the server process.

    Example request body:
      {
        "company_name": "Ramesh Steel & Fabrications Pvt Ltd",
        "cin": "U27100MH2011PTC218847",
        "pan": "AABCR1234F",
        "sector": "Manufacturing - Steel",
        "turnover": "INR 48.5 Crore",
        "loan_details": {
          "loan_type": "Working Capital Term Loan",
          "loan_amount": "INR 8 Crore",
          "tenure": "5 years",
          "interest_rate": "11.25% p.a."
        }
      }
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
        session.session_id, request.company_name,
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


# ===========================================================================
#  STAGE 2 - Document Upload
# ===========================================================================

@app.post("/upload-documents/{session_id}", tags=["Stage 2 - Document Upload"])
async def upload_documents(
    session_id: str,
    files: List[UploadFile] = File(...),
):
    """
    Upload one or more documents for an existing session.

    Accepts PDF, CSV, and Excel files. All files are saved under
    uploads/sessions/<session_id>/ and recorded in the session.
    Document classification happens in the next stage.

    Supported document categories (auto-detected in Stage 3):
      Annual Reports, GST Returns, Bank Statements, Sanction Letters,
      Shareholding Patterns, ALM, Borrowing Profile, Portfolio Data,
      Legal Notices.
    """
    session = _require_session(session_id)

    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    saved: List[Dict[str, Any]] = []
    rejected: List[Dict[str, str]] = []

    for file in files:
        if file.content_type not in ALL_ALLOWED_TYPES:
            rejected.append({
                "filename": file.filename,
                "reason": (
                    f"Unsupported content type '{file.content_type}'. "
                    "Accepted: PDF, CSV, Excel (.xlsx/.xls)."
                ),
            })
            continue

        saved_path = _save_upload(file, f"sessions/{session_id}")
        size = saved_path.stat().st_size
        session.uploaded_files[file.filename] = {
            "path": str(saved_path),
            "size": size,
            "content_type": file.content_type,
        }
        saved.append({"filename": file.filename, "size_bytes": size})
        logger.info("Saved '%s' (%d B) to session %s", file.filename, size, session_id)

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


# ===========================================================================
#  STAGE 3 - Document Classification
# ===========================================================================

@app.post("/classify-documents/{session_id}", tags=["Stage 3 - Document Classification"])
async def classify_documents(
    session_id: str,
    body: ClassificationOverrideRequest = ClassificationOverrideRequest(),
):
    """
    Auto-classify all uploaded documents for this session.

    Three-layer classification (stops at first confident match):
      1. Filename pattern matching  - fast, zero I/O
      2. Content keyword search     - reads first 4000 chars of file
      3. LLM via Groq Llama3        - only if GROQ_API_KEY is set

    Manual overrides (optional, supplied in request body):
      {"overrides": {"shareholding_q4.xlsx": "Shareholding Pattern"}}

    Recognised document types:
      Annual Report | GST Returns | Bank Statement | Sanction Letter
      Shareholding Pattern | ALM | Borrowing Profile | Portfolio Data
      Legal Notice | Unknown

    Calling this endpoint again with new overrides will re-classify the session.
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

    logger.info(
        "Classified %d doc(s) for session %s | %s",
        len(classification), session_id, classification,
    )

    return JSONResponse(content={
        "session_id": session_id,
        "status": session.status.value,
        "classification": classification,
        "classification_mode": "llm+heuristic" if config.GROQ_API_KEY else "heuristic",
        "next_step": f"POST /extract-data/{session_id}",
    })


# ===========================================================================
#  STAGE 4 - Extraction Pipeline
# ===========================================================================

@app.post("/extract-data/{session_id}", tags=["Stage 4 - Extraction & Analysis"])
async def extract_data(session_id: str):
    """
    Run the full extraction and fraud-detection pipeline on the classified
    documents for this session.

    Reuses existing module functions with no logic duplication:
      parser.parse_pdf               -> PDF text extraction
      extractor.extract_financial_data -> LLM / heuristic extraction
      parser.parse_gst_file          -> GST normalisation
      parser.parse_bank_file         -> Bank normalisation
      gst_bank_analyzer.analyze_gst_vs_bank -> Revenue inflation + circular trading
      risk_engine.compute_risk_score -> Composite 0-100 risk score
      risk_engine.generate_report    -> Report assembly

    Returns the shared output schema used by Research Agent + Recommendation Engine.
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

    output = _run_extraction_pipeline(session)

    session.financial_analysis = output
    session.status = SessionStatus.EXTRACTED
    store.save(session)

    # Persist to disk
    safe_name = (
        session.entity_profile.get("company_name", session_id)
        .replace(" ", "_").replace("/", "-")
    )
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

    return JSONResponse(content={"session_id": session_id, "status": session.status.value, **output})


# ===========================================================================
#  EXPORT - Financial Analysis for downstream modules
# ===========================================================================

@app.get("/financial-analysis/{session_id}", tags=["Export - Downstream Integration"])
async def get_financial_analysis(session_id: str):
    """
    Return the structured financial analysis for a completed session.

    Designed to be polled by:
      Research Agent         - reads entity_profile, financial_commitments, fraud_flags
      Recommendation Engine  - reads risk_score, risk_level, loan_details

    Returns HTTP 400 if extraction has not been run yet for this session.

    Output schema:
      {
        "entity_profile":     { company_name, cin, pan, sector, turnover },
        "loan_details":        { loan_type, loan_amount, tenure, interest_rate },
        "financial_analysis": {
          "financial_commitments": { loan_amount, lender, sanction_limit, ... },
          "gst_analysis":          { total_invoice_value, invoice_count, ... },
          "bank_analysis":         { total_credit_inflow, total_debit_outflow, ... },
          "fraud_flags":           [ { flag, description, ... }, ... ],
          "risk_score":            <int 0-100>,
          "risk_level":            "Low | Moderate | High"
        }
      }
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
