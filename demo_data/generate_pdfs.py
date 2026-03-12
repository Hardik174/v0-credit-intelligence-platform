"""
generate_pdfs.py - One-time demo PDF generator for IntelliCredit.

Converts the text documents in demo_data/ into actual PDF files that can be
uploaded to the /upload/pdf endpoint. Run this script once before the demo.

Requirements (run once):
    pip install reportlab

Usage:
    python demo_data/generate_pdfs.py
    # Outputs:
    #   demo_data/sanction_letter.pdf
    #   demo_data/annual_report_extract.pdf
"""

from pathlib import Path

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    from reportlab.lib import colors
except ImportError:
    print(
        "ERROR: reportlab is not installed.\n"
        "Install it with:  pip install reportlab\n"
        "Then re-run this script."
    )
    raise SystemExit(1)

BASE_DIR = Path(__file__).parent


def _build_pdf_from_text(txt_path: Path, pdf_path: Path, title: str) -> None:
    """
    Convert a plain-text document into a formatted A4 PDF.

    Args:
        txt_path: Path to the source .txt file.
        pdf_path: Output .pdf file path.
        title:    Document title shown in PDF metadata.
    """
    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title=title,
        author="IntelliCredit Demo Data",
    )

    styles = getSampleStyleSheet()
    # Custom styles
    body_style = ParagraphStyle(
        "BodyCustom",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=11,
        spaceAfter=2,
        textColor=colors.black,
    )
    heading_style = ParagraphStyle(
        "HeadingCustom",
        parent=styles["Heading2"],
        fontName="Courier-Bold",
        fontSize=9,
        leading=13,
        spaceBefore=6,
        spaceAfter=3,
        textColor=colors.black,
    )

    story = []
    raw_text = txt_path.read_text(encoding="utf-8")

    for line in raw_text.splitlines():
        # Escape XML special chars that would break Paragraph rendering
        escaped = (
            line.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
        )

        if not escaped.strip():
            story.append(Spacer(1, 3 * mm))
        elif set(escaped.strip()) <= {"═", "─", "─", "━", "=", "-"}:
            # Horizontal rule lines
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.gray))
        elif escaped.strip().startswith("SECTION") or escaped.strip().startswith("══"):
            story.append(Paragraph(escaped, heading_style))
        else:
            story.append(Paragraph(escaped, body_style))

    doc.build(story)
    print(f"  ✓ Created: {pdf_path.name}  ({pdf_path.stat().st_size // 1024} KB)")


def main():
    documents = [
        (
            BASE_DIR / "sanction_letter.txt",
            BASE_DIR / "sanction_letter.pdf",
            "Loan Sanction Letter – Union Bank of India – Ramesh Steel",
        ),
        (
            BASE_DIR / "annual_report_extract.txt",
            BASE_DIR / "annual_report_extract.pdf",
            "Annual Report Extract FY 2022-23 – Ramesh Steel & Fabrications",
        ),
    ]

    print("IntelliCredit – Demo PDF Generator")
    print("=" * 45)
    for txt_path, pdf_path, title in documents:
        if not txt_path.exists():
            print(f"  SKIP: {txt_path.name} not found")
            continue
        print(f"  Generating {pdf_path.name} ...")
        _build_pdf_from_text(txt_path, pdf_path, title)

    print()
    print("Done! Upload the generated PDFs to:")
    print("  POST /upload/pdf  or  POST /analyze (pdf_file field)")
    print()
    print("Use the CSVs directly:")
    print("  demo_data/demo_gst_returns.csv  → gst_file")
    print("  demo_data/demo_bank_statement.csv → bank_file")


if __name__ == "__main__":
    main()
