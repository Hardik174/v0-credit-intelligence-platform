"""
routers/cam_report.py – CAM Report Generation (session-based)

Exposes:
  GET /generate-cam-report/{session_id}  →  JSON CAM report (real pipeline data)
  GET /download-cam/{session_id}         →  PDF download

Delegates to services/cam_builder.py (build_cam_report) and
services/cam_pdf_generator.py (generate_cam_pdf).

The CAM data is assembled EXCLUSIVELY from the session's extracted financial
outputs, ensuring that the risk_score, fraud_signals, and recommendation
always reflect the actual ingestor pipeline results.
"""

from fastapi import APIRouter
from fastapi.responses import FileResponse

from backend.services.cam_builder import build_cam_report
from backend.services.cam_pdf_generator import generate_cam_pdf

router = APIRouter(tags=["CAM Report"])


@router.get(
    "/generate-cam-report/{session_id}",
    summary="Generate a Credit Assessment Memorandum from real pipeline data",
)
async def get_cam_report(session_id: str):
    """
    Assemble and return the full CAM report for a session that has completed
    Stage 4 (POST /extract-data).

    The CAM is built from **real pipeline outputs only**:
    - GST analysis, bank analysis, fraud flags, and risk score come directly
      from the credit ingestor extraction stored in the session.
    - Research insights (news, litigation) are fetched from the Research Agent
      (non-fatal — a stub is used if the agent is unavailable).
    - Fraud signals are never overridden or replaced with placeholder values.

    Returns **HTTP 404** if the session does not exist.
    Returns **HTTP 400** if extraction has not been completed yet.
    """
    return build_cam_report(session_id)


@router.get(
    "/download-cam/{session_id}",
    summary="Download the CAM report as a PDF (session-based)",
    response_class=FileResponse,
)
async def download_cam_pdf(session_id: str):
    """
    Generate and stream a professional bank-style PDF CAM report.

    The PDF is built from the same real pipeline data as the JSON endpoint
    and covers: Entity Profile, Loan Details, Financial Summary,
    Risk Assessment, SWOT Analysis, and Recommendation.

    Returns **HTTP 503** if reportlab is not installed.
    Returns **HTTP 404** if the session does not exist.
    Returns **HTTP 400** if extraction has not been completed.
    """
    pdf_path = generate_cam_pdf(session_id)
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"CAM_Report_{session_id[:8]}.pdf",
    )
