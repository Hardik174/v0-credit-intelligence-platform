"""
main.py – IntelliCredit Platform API

Entry point: uvicorn main:app --reload

Router layout
─────────────

Root-level endpoints (pipeline stages):
  POST /entity-onboard                    ← routers.onboarding
  POST /upload-documents/{session_id}     ← routers.documents
  POST /classify-documents/{session_id}   ← routers.documents
  POST /extract-data/{session_id}         ← routers.extraction
  GET  /financial-analysis/{session_id}   ← routers.analysis
  GET  /generate-cam-report/{session_id}  ← routers.cam_report  (real pipeline data)
  GET  /download-cam/{session_id}         ← routers.cam_report  (PDF, real pipeline data)
  POST /run-full-credit-analysis          ← routers.pipeline

Unified CAM endpoint (session-first, company fallback):
  GET  /api/cam-report/{session_id}          ← real pipeline CAM if session exists
  GET  /api/cam-report/{session_id}/download ← real pipeline PDF if session exists
  (Both fall back to standalone news-driven CAM when session_id is a company name)

Legacy /api/ingestor/* endpoints (backward compat – unchanged):
  All credit_ingestor routes remain accessible under /api/ingestor/

Downstream intelligence routes:
  GET  /api/research/{session_id}         ← routers.research_router
  GET  /api/research-insights/{company}   ← routers.research_router (standalone)
  GET  /api/risk-analysis/{session_id}    ← routers.risk_router
  GET  /api/credit-decision/{session_id}  ← routers.credit_router

System:
  GET  /                                  ← service info + health
  GET  /api/health                        ← JSON liveness probe
  GET  /docs                              ← Swagger UI (auto-generated)
  GET  /redoc                             ← ReDoc (auto-generated)
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── New root-level routers ────────────────────────────────────────────────────
from backend.routers.onboarding import router as onboarding_router
from backend.routers.documents import router as documents_router
from backend.routers.extraction import router as extraction_router
from backend.routers.analysis import router as analysis_router
from backend.routers.cam_report import router as cam_report_router
from backend.routers.pipeline import router as pipeline_router

from backend.routers.ingestor_router import router as ingestor_router
from backend.routers.research_router import router as research_router, insights_router as research_insights_router
from backend.routers.risk_router import router as risk_router
from backend.routers.credit_router import router as credit_router
from backend.routers.cam_router import router as cam_router

os.makedirs("uploads", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="IntelliCredit Platform API",
    description=(
        "AI-driven corporate credit intelligence platform. "
        "Multi-stage document ingestion, GST/bank cross-analysis, "
        "fraud detection, risk scoring, and CAM report generation."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

_raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
_allow_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
_allow_all = "*" in _allow_origins

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"] if _allow_all else _allow_origins,
  # Browsers reject wildcard origin + credentials. Keep this false for "*" mode.
  allow_credentials=not _allow_all,
  allow_methods=["*"],
  allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Mount: root-level routes (new architecture – PART 6 endpoints)
# ---------------------------------------------------------------------------

app.include_router(onboarding_router)   # POST /entity-onboard
app.include_router(documents_router)    # POST /upload-documents/{sid}
                                        # POST /classify-documents/{sid}
app.include_router(extraction_router)   # POST /extract-data/{sid}
app.include_router(analysis_router)     # GET  /financial-analysis/{sid}
app.include_router(cam_report_router)   # GET  /generate-cam-report/{sid}
                                        # GET  /download-cam/{sid}
app.include_router(pipeline_router)     # POST /run-full-credit-analysis

# ---------------------------------------------------------------------------
# Mount: legacy + downstream routers (backward compatible – DO NOT REMOVE)
# ---------------------------------------------------------------------------

app.include_router(ingestor_router)              # /api/ingestor/*  (all legacy stages)
app.include_router(research_router)              # /api/research/{session_id}
app.include_router(research_insights_router)     # /api/research-insights/{company}
app.include_router(risk_router)                  # /api/risk-analysis/{session_id}
app.include_router(credit_router)                # /api/credit-decision/{session_id}
app.include_router(cam_router)                   # /api/cam-report/{company}

# ---------------------------------------------------------------------------
# System endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["System"], summary="Service info")
def root():
    """Service identification and health check for load-balancers."""
    return {
        "service": "Credit Intelligence Platform",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health", tags=["System"], summary="JSON liveness probe")
def health():
    """Lightweight liveness probe for load-balancers and monitoring tools."""
    return {"status": "ok"}
