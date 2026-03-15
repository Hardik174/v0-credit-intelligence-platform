"""
routers/cam_router.py – Unified CAM Report Endpoint

Exposes:
  GET /api/cam-report/{id}           → JSON CAM  (session-first, company fallback)
  GET /api/cam-report/{id}/download  → PDF download (session-first, company fallback)

The ``id`` path parameter is resolved as follows:
  1. Try as a pipeline session ID  → uses real extracted financial data
     (risk_score, fraud_flags, gst_analysis, bank_analysis from credit ingestor)
  2. If session not found         → treat as a company name and generate a
     news-driven standalone CAM via cam_service.py
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from services.cam_builder import build_cam_report
from services.cam_service import generate_cam_by_company

router = APIRouter(prefix="/api/cam-report", tags=["CAM Report"])


@router.get(
    "/{id}",
    summary="Generate CAM report (session-first, company-name fallback)",
)
def get_cam_report(
    id: str,
    sector: str = Query(default="General", description="Industry sector (used for standalone mode)"),
    loan_type: str = Query(default="Working Capital", description="Facility type"),
    loan_amount: str = Query(default="TBD", description="Requested loan amount"),
    tenure: str = Query(default="TBD", description="Loan tenure"),
    interest_rate: str = Query(default="TBD", description="Interest rate"),
):
    """
    Generate a Credit Assessment Memorandum.

    **Resolution order:**

    1. ``id`` treated as a **pipeline session ID** → returns a CAM built from
       real extracted financial data (GST, bank, fraud flags, risk score).
       This is the authoritative path – risk_score and fraud_signals are never
       overridden.

    2. If no matching session is found → ``id`` treated as a **company name**
       and a standalone news-driven CAM is generated.  Useful for demo mode.
    """
    try:
        return build_cam_report(id)
    except Exception:
        pass

    return generate_cam_by_company(
        company_name=id,
        sector=sector,
        loan_type=loan_type,
        loan_amount=loan_amount,
        tenure=tenure,
        interest_rate=interest_rate,
    )


@router.get(
    "/{id}/download",
    summary="Download CAM report as PDF (session-first, company-name fallback)",
    response_class=FileResponse,
)
def download_cam_pdf(id: str, sector: str = Query(default="General")):
    """
    Generate and stream a professional bank-style PDF CAM report.

    The ``id`` path parameter is resolved with the same session-first logic
    as the JSON endpoint above.

    Returns **HTTP 503** if reportlab is not installed.
    Returns **HTTP 404** if id is unknown and cannot be treated as a company name.
    """
    from pathlib import Path
    import tempfile
    from services.cam_pdf_generator import REPORTLAB_AVAILABLE, _build_pdf, generate_cam_pdf

    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="PDF generation requires reportlab. Install with: pip install reportlab",
        )

    # ── Attempt 1: session-based PDF (real extracted data) ───────────────────
    try:
        pdf_path = generate_cam_pdf(id)
        safe = id[:20].replace(" ", "_")
        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=f"CAM_Report_{safe}.pdf",
            headers={"Content-Disposition": f'attachment; filename="CAM_Report_{safe}.pdf"'},
        )
    except Exception:
        pass  # session missing or not extracted → fall through

    # ── Attempt 2: standalone news-driven company PDF ─────────────────────────
    report = generate_cam_by_company(company_name=id, sector=sector)
    pdf_dir = Path(tempfile.gettempdir()) / "intellicredit_cam_pdfs"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    safe = id[:30].replace(" ", "_")
    pdf_path = pdf_dir / f"cam_{safe}.pdf"
    _build_pdf(report, pdf_path)
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"CAM_{safe}.pdf",
        headers={"Content-Disposition": f'attachment; filename="CAM_{safe}.pdf"'},
    )
