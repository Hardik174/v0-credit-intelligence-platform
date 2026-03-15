"""
services/cam_pdf_generator.py – CAM Report PDF Generator

Generates a structured PDF from a CAMReportResponse dict using reportlab.

Usage:
    from services.cam_pdf_generator import generate_cam_pdf
    pdf_path = generate_cam_pdf(session_id)   # returns Path to generated PDF
    # serve with FastAPI FileResponse(pdf_path, media_type="application/pdf")

Requires: pip install reportlab
"""

import os
import tempfile
from pathlib import Path
from typing import Any, Dict

from fastapi import HTTPException
from credit_ingestor import config
from services.cam_builder import build_cam_report

# ---------------------------------------------------------------------------
# PDF output directory  (configurable; defaults to /tmp on Vercel)
# ---------------------------------------------------------------------------
_PDF_OUTPUT_DIR = config.OUTPUT_DIR
_PDF_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Attempt reportlab import – raise a clear error if not installed
# ---------------------------------------------------------------------------
try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        HRFlowable,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def _fmt(value: Any) -> str:
    """Format numeric values in Indian lakh/crore notation."""
    if value is None:
        return "N/A"
    try:
        n = float(value)
    except (TypeError, ValueError):
        return str(value)
    if n >= 1e7:
        return f"\u20b9{n / 1e7:.2f} Cr"
    if n >= 1e5:
        return f"\u20b9{n / 1e5:.2f} L"
    return f"\u20b9{n:,.0f}"


def generate_cam_pdf(session_id: str) -> Path:
    """
    Build a CAM report PDF for the given session and return its file path.

    Raises HTTPException(503) if reportlab is not installed.
    Raises HTTPException(400) if extraction has not been completed.
    """
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail=(
                "PDF generation requires reportlab. "
                "Install it with: pip install reportlab"
            ),
        )

    report: Dict[str, Any] = build_cam_report(session_id)

    pdf_path = _PDF_OUTPUT_DIR / f"cam_report_{session_id}.pdf"
    _build_pdf(report, pdf_path)
    return pdf_path


# ---------------------------------------------------------------------------
# Internal PDF builder
# ---------------------------------------------------------------------------

def _build_pdf(report: Dict[str, Any], output_path: Path) -> None:
    ep = report.get("entity_profile", {})
    ld = report.get("loan_details", {})
    fs = report.get("financial_summary", {})
    gst = fs.get("gst_analysis", {})
    bank = fs.get("bank_analysis", {})
    fc = fs.get("financial_commitments", {})
    fraud_signals = report.get("fraud_signals", [])
    risk_score = report.get("risk_score", 0)
    risk_level = report.get("risk_level", "N/A")
    recommendation = report.get("recommendation", "")
    swot = report.get("swot_analysis", {})

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    style_title = ParagraphStyle(
        "CAMTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=colors.HexColor("#1e3a5f"),
        spaceAfter=4,
    )
    style_h1 = ParagraphStyle(
        "CAMH1",
        parent=styles["Heading1"],
        fontSize=13,
        textColor=colors.HexColor("#1e3a5f"),
        spaceBefore=14,
        spaceAfter=4,
    )
    style_h2 = ParagraphStyle(
        "CAMH2",
        parent=styles["Heading2"],
        fontSize=11,
        textColor=colors.HexColor("#2d5986"),
        spaceBefore=8,
        spaceAfter=3,
    )
    style_body = ParagraphStyle(
        "CAMBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        spaceAfter=4,
    )
    style_bullet = ParagraphStyle(
        "CAMBullet",
        parent=style_body,
        leftIndent=12,
        bulletIndent=4,
    )

    tbl_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f7f9fc"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d9e0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ])

    elements = []

    # ── Title block ──────────────────────────────────────────────────────────
    elements.append(Paragraph("Credit Assessment Memorandum", style_title))
    elements.append(
        Paragraph(
            f"{ep.get('company_name', 'N/A')}  |  Session: {report.get('session_id', 'N/A')}",
            style_body,
        )
    )
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1e3a5f")))
    elements.append(Spacer(1, 0.3 * cm))

    # ── 1. Entity Profile ────────────────────────────────────────────────────
    elements.append(Paragraph("1. Entity Profile", style_h1))
    ep_data = [
        ["Field", "Details"],
        ["Company Name", ep.get("company_name", "N/A")],
        ["CIN", ep.get("cin", "N/A")],
        ["PAN", ep.get("pan", "N/A")],
        ["Sector", ep.get("sector", "N/A")],
        ["Annual Turnover", ep.get("turnover", "N/A")],
    ]
    elements.append(Table(ep_data, colWidths=[5 * cm, 12 * cm], style=tbl_style))

    # ── 2. Loan Details ──────────────────────────────────────────────────────
    elements.append(Paragraph("2. Loan Facility Requested", style_h1))
    ld_data = [
        ["Parameter", "Value"],
        ["Loan Type", ld.get("loan_type", "N/A")],
        ["Loan Amount", ld.get("loan_amount", "N/A")],
        ["Tenure", ld.get("tenure", "N/A")],
        ["Interest Rate", ld.get("interest_rate", "N/A")],
    ]
    elements.append(Table(ld_data, colWidths=[5 * cm, 12 * cm], style=tbl_style))

    # ── 3. Financial Summary ──────────────────────────────────────────────────
    elements.append(Paragraph("3. Financial Summary", style_h1))
    elements.append(Paragraph("GST Analysis", style_h2))
    gst_data = [
        ["Metric", "Value"],
        ["Total Invoice Value", _fmt(gst.get("total_invoice_value"))],
        ["Invoice Count", str(gst.get("invoice_count", "N/A"))],
        ["Unique Buyers", str(gst.get("unique_buyers", "N/A"))],
    ]
    elements.append(Table(gst_data, colWidths=[8 * cm, 9 * cm], style=tbl_style))
    elements.append(Spacer(1, 0.2 * cm))
    elements.append(Paragraph("Bank Statement Analysis", style_h2))
    bank_data = [
        ["Metric", "Value"],
        ["Total Credit Inflow", _fmt(bank.get("total_credit_inflow"))],
        ["Total Debit Outflow", _fmt(bank.get("total_debit_outflow"))],
        ["Net Cash Flow", _fmt(bank.get("net_flow"))],
        ["Transaction Count", str(bank.get("transaction_count", "N/A"))],
    ]
    elements.append(Table(bank_data, colWidths=[8 * cm, 9 * cm], style=tbl_style))

    # ── 4. Risk Assessment ───────────────────────────────────────────────────
    elements.append(Paragraph("4. Risk Assessment", style_h1))
    risk_color = (
        colors.HexColor("#16a34a") if risk_score <= 30
        else colors.HexColor("#ca8a04") if risk_score <= 60
        else colors.HexColor("#dc2626")
    )
    risk_style = ParagraphStyle(
        "RiskScore",
        parent=style_body,
        textColor=risk_color,
        fontSize=12,
        fontName="Helvetica-Bold",
    )
    elements.append(
        Paragraph(f"Overall Risk Score: {risk_score}/100  |  Level: {risk_level}", risk_style)
    )
    elements.append(Spacer(1, 0.2 * cm))
    if fraud_signals:
        elements.append(Paragraph("Fraud Signals Detected:", style_h2))
        for fs_item in fraud_signals:
            flag = fs_item.get("flag", "Unknown") if isinstance(fs_item, dict) else str(fs_item)
            desc = fs_item.get("description", "") if isinstance(fs_item, dict) else ""
            elements.append(Paragraph(f"\u2022 <b>{flag}</b>: {desc}", style_bullet))
    else:
        elements.append(Paragraph("\u2714 No fraud signals detected.", style_body))

    # ── 5. SWOT Analysis ─────────────────────────────────────────────────────
    elements.append(Paragraph("5. SWOT Analysis", style_h1))
    for quadrant, label in [
        ("strengths", "Strengths"),
        ("weaknesses", "Weaknesses"),
        ("opportunities", "Opportunities"),
        ("threats", "Threats"),
    ]:
        items = swot.get(quadrant, [])
        elements.append(Paragraph(label, style_h2))
        if items:
            for item in items:
                elements.append(Paragraph(f"\u2022 {item}", style_bullet))
        else:
            elements.append(Paragraph("N/A", style_body))

    # ── 6. Recommendation ───────────────────────────────────────────────────
    elements.append(Paragraph("6. Recommendation", style_h1))
    elements.append(Paragraph(recommendation, style_body))

    # ── Footer ───────────────────────────────────────────────────────────────
    elements.append(Spacer(1, 0.5 * cm))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#9ca3af")))
    elements.append(
        Paragraph(
            f"Generated by IntelliCredit Platform  |  {report.get('generated_at', '')}",
            ParagraphStyle("Footer", parent=style_body, textColor=colors.HexColor("#6b7280"), fontSize=8),
        )
    )

    doc.build(elements)
