"""
PDF Report Generator — Generates LUMINA Mitigation Reports as PDF.

Uses fpdf2 (pure Python, no system dependencies) to produce
professional, branded PDF reports from mitigation report data.
"""

from fpdf import FPDF
from datetime import datetime
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class LuminaPDF(FPDF):
    """Custom PDF class with LUMINA branding."""

    def header(self):
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(30, 41, 59)
        self.cell(0, 15, "LUMINA", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(100, 116, 139)
        self.cell(0, 6, "Cyber Defense Platform  |  Mitigation Report", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(59, 130, 246)
        self.set_line_width(0.5)
        self.line(10, self.get_y() + 3, 200, self.get_y() + 3)
        self.ln(10)

    def footer(self):
        self.set_y(-20)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(148, 163, 184)
        self.cell(
            0, 10,
            f"Generated on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}  |  Page {self.page_no()}/{{nb}}  |  CONFIDENTIAL",
            align="C",
        )

    def section_title(self, title: str):
        self.ln(4)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(30, 41, 59)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(226, 232, 240)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def body_text(self, text: str):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(51, 65, 85)
        self.multi_cell(0, 6, text)
        self.ln(3)


def generate_mitigation_pdf(data: Dict[str, Any]) -> bytes:
    """Generate a PDF report from mitigation report data. Returns raw PDF bytes."""
    pdf = LuminaPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=25)

    # Risk level colors
    risk_colors = {
        "CRITICAL": (239, 68, 68),
        "HIGH": (249, 115, 22),
        "MODERATE": (245, 158, 11),
        "LOW": (34, 197, 94),
    }

    # 1. Overall Risk Score
    risk_score = data.get("overall_risk_score", 0)
    risk_level = data.get("overall_risk_level", "UNKNOWN")
    color = risk_colors.get(risk_level, (100, 116, 139))

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*color)
    pdf.cell(0, 12, f"Overall Risk: {risk_score}/100  [{risk_level}]", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    generated = data.get("generated_at", datetime.utcnow().isoformat())
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(0, 6, f"Report generated: {generated}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # 2. Executive Summary
    pdf.section_title("Executive Summary")
    pdf.body_text(data.get("executive_summary", "No summary available."))

    # 3. Threat Breakdown Table
    pdf.section_title("Threat Breakdown by Category")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(241, 245, 249)
    pdf.set_text_color(51, 65, 85)

    col_widths = [35, 28, 28, 30, 28, 35]
    headers = ["Category", "Total", "High Risk", "Medium Risk", "Low Risk", "Trend"]
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 8, h, border=1, fill=True, align="C")
    pdf.ln()

    pdf.set_font("Helvetica", "", 9)
    for row in data.get("threat_breakdown", []):
        pdf.cell(col_widths[0], 8, str(row.get("category", "")).title(), border=1)
        pdf.cell(col_widths[1], 8, str(row.get("total_incidents", 0)), border=1, align="C")
        pdf.cell(col_widths[2], 8, str(row.get("high_risk_count", 0)), border=1, align="C")
        pdf.cell(col_widths[3], 8, str(row.get("medium_risk_count", 0)), border=1, align="C")
        pdf.cell(col_widths[4], 8, str(row.get("low_risk_count", 0)), border=1, align="C")
        trend = str(row.get("trend", "stable")).title()
        pdf.cell(col_widths[5], 8, trend, border=1, align="C")
        pdf.ln()
    pdf.ln(4)

    # 4. Mitigation Recommendations
    pdf.section_title("Mitigation Recommendations")
    priority_colors = {
        "critical": (239, 68, 68),
        "high": (249, 115, 22),
        "medium": (245, 158, 11),
        "low": (34, 197, 94),
    }

    for i, rec in enumerate(data.get("recommendations", []), 1):
        priority = rec.get("priority", "medium")
        p_color = priority_colors.get(priority, (100, 116, 139))

        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*p_color)
        pdf.cell(0, 8, f"{i}. [{priority.upper()}] {rec.get('title', '')}", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(71, 85, 105)
        category = rec.get("category", "")
        desc = rec.get("description", "")
        pdf.multi_cell(0, 5, f"    Category: {category}  |  {desc}")
        pdf.ln(3)

    # 5. Risk Trend Analysis
    pdf.section_title("Risk Trend Analysis")
    pdf.body_text(data.get("risk_trend_analysis", "Insufficient data for trend analysis."))

    return pdf.output()
