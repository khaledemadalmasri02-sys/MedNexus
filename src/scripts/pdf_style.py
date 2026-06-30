#!/usr/bin/env python3
"""
Universal PDF Style Module — Reference Style (Orthopedic Summary Handbook)

Features:
- 24-color palette for chapters
- Chapter banners (Ch2+), Chapter 1 starts directly with body text
- Section headers with accent rule (no colored bar)
- Sub-section headers with accent rule
- Content boxes (KTP, MCQ, IMPORTANT, OSCE) — colored header + tinted body
- Question boxes — Q/A/E format, light gray background
- Professional tables — colored header, zebra stripes, outer border
- Cover page — UPPERCASE title, • feature lines, edition at bottom, NO author/date
- TOC — "TABLE OF CONTENTS", "Chapter N      Title" with indent
- Two-pass build for correct TOC page numbers
- Simple footer — centered page number only
- Auto font discovery (DejaVu, Helvetica fallback)

Page: A4, margins 18/18/18/22mm, usable width ~174mm
Font: DejaVu preferred, Helvetica fallback
"""

import os
import re
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageTemplate, Frame, HRFlowable, KeepTogether, Flowable, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont


# ═══════════════════════════════════════════════════════════════════════════
# 24-COLOR PALETTE
# ═══════════════════════════════════════════════════════════════════════════

DEFAULT_COLORS = [
    "#1A5276",  # 0: Deep Blue
    "#117A65",  # 1: Teal
    "#7D3C98",  # 2: Purple
    "#C0392B",  # 3: Red
    "#D4AC0D",  # 4: Gold
    "#2E86C1",  # 5: Sky Blue
    "#27AE60",  # 6: Green
    "#E67E22",  # 7: Orange
    "#8E44AD",  # 8: Violet
    "#16A085",  # 9: Emerald
    "#F39C12",  # 10: Amber
    "#2C3E50",  # 11: Dark Blue
    "#E74C3C",  # 12: Bright Red
    "#3498DB",  # 13: Light Blue
    "#2ECC71",  # 14: Light Green
    "#9B59B6",  # 15: Amethyst
    "#F1C40F",  # 16: Yellow
    "#E91E63",  # 17: Pink
    "#00BCD4",  # 18: Cyan
    "#FF5722",  # 19: Deep Orange
    "#607D8B",  # 20: Blue Gray
    "#795548",  # 21: Brown
    "#4CAF50",  # 22: Material Green
    "#FF9800",  # 23: Material Orange
]

# Content box specific colors
BOX_KTP = "#2196F3"
BOX_KTP_BG = "#E3F2FD"
BOX_MCQ = "#F44336"
BOX_MCQ_BG = "#FFEBEE"
BOX_IMPORTANT = "#FFC107"
BOX_IMPORTANT_BG = "#FFF8E1"
BOX_OSCE = "#4CAF50"
BOX_OSCE_BG = "#E8F5E9"


def get_color(index: int) -> Color:
    """Get color from palette by index (wraps around)."""
    hex_color = DEFAULT_COLORS[index % len(DEFAULT_COLORS)]
    return HexColor(hex_color)


def tint_color(hex_color: str, tint_percent: float = 0.1) -> Color:
    """Create a tinted version of a color (for backgrounds)."""
    c = HexColor(hex_color)
    r, g, b = c.red, c.green, c.blue
    r = int(r + (1 - r) * (1 - tint_percent))
    g = int(g + (1 - g) * (1 - tint_percent))
    b = int(b + (1 - b) * (1 - tint_percent))
    return Color(r, g, b)


# ═══════════════════════════════════════════════════════════════════════════
# FONT DISCOVERY AND REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════

FONTS_REGISTERED = False


def register_fonts():
    """Auto-discover and register DejaVu fonts, fallback to Helvetica."""
    global FONTS_REGISTERED
    if FONTS_REGISTERED:
        return

    font_paths = [
        "/usr/share/fonts/truetype/dejavu",
        "/usr/share/fonts/TTF",
        "/usr/share/fonts",
        "/System/Library/Fonts",
        "/Library/Fonts",
        os.path.expanduser("~/.fonts"),
        os.path.expanduser("~/Library/Fonts"),
        "C:/Windows/Fonts",
    ]

    for root, dirs, files in os.walk("/usr/share/fonts"):
        for f in files:
            if f.lower().startswith("dejavu") and f.lower().endswith(".ttf"):
                font_paths.append(root)
                break

    font_files = {
        "DejaVu": None,
        "DejaVu-Bold": None,
        "DejaVu-Italic": None,
        "DejaVu-BoldItalic": None,
        "DejaVuSerif-Bold": None,
    }

    for font_dir in font_paths:
        if not os.path.exists(font_dir):
            continue
        try:
            for f in os.listdir(font_dir):
                fpath = os.path.join(font_dir, f)
                if not os.path.isfile(fpath):
                    continue
                fname = f.lower()
                if "dejavu" in fname and fname.endswith(".ttf"):
                    if "bold" in fname and "italic" in fname:
                        font_files["DejaVu-BoldItalic"] = fpath
                    elif "bold" in fname and "serif" not in fname:
                        font_files["DejaVu-Bold"] = fpath
                    elif "italic" in fname and "serif" not in fname:
                        font_files["DejaVu-Italic"] = fpath
                    elif "serif" in fname and "bold" in fname:
                        font_files["DejaVuSerif-Bold"] = fpath
                    elif "bold" not in fname and "italic" not in fname and "serif" not in fname:
                        font_files["DejaVu"] = fpath
        except Exception:
            pass

    for name, path in font_files.items():
        if path and os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
            except Exception:
                pass

    FONTS_REGISTERED = True
    return font_files


def get_font_name(base_name: str) -> str:
    """Get font name with fallback."""
    register_fonts()
    available_fonts = pdfmetrics.getRegisteredFontNames()
    if base_name in available_fonts:
        return base_name
    fallbacks = {
        "DejaVu": "Helvetica",
        "DejaVu-Bold": "Helvetica-Bold",
        "DejaVu-Italic": "Helvetica-Oblique",
        "DejaVu-BoldItalic": "Helvetica-BoldOblique",
        "DejaVuSerif-Bold": "Helvetica-Bold",
    }
    return fallbacks.get(base_name, "Helvetica")


# ═══════════════════════════════════════════════════════════════════════════
# STYLE DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════════

def get_styles(chapter_color: Color = None):
    """Get all paragraph styles for the document."""
    register_fonts()

    if chapter_color is None:
        chapter_color = get_color(0)

    font = get_font_name
    styles = getSampleStyleSheet()

    def add_style(name, **kwargs):
        if name not in styles:
            styles.add(ParagraphStyle(name, **kwargs))

    # ── Cover Page ──
    add_style("CoverTitle",
        fontName=font("DejaVuSerif-Bold"), fontSize=28, leading=36,
        alignment=TA_CENTER, textColor=HexColor("#1A5276"), spaceAfter=6 * mm)
    add_style("CoverSubtitle",
        fontName=font("DejaVu"), fontSize=13, leading=18,
        alignment=TA_CENTER, textColor=HexColor("#757575"), spaceAfter=4 * mm)
    add_style("CoverFeature",
        fontName=font("DejaVu"), fontSize=10, leading=14,
        alignment=TA_CENTER, textColor=HexColor("#424242"), spaceAfter=2 * mm)
    add_style("CoverEdition",
        fontName=font("DejaVu-Bold"), fontSize=11, leading=14,
        alignment=TA_CENTER, textColor=HexColor("#C0392B"), spaceAfter=10 * mm)

    # ── Chapter Banner (inside colored bar) ──
    add_style("ChapterTitle",
        fontName=font("DejaVuSerif-Bold"), fontSize=22, leading=26,
        alignment=TA_LEFT, textColor=white, spaceAfter=1)
    add_style("ChapterSubtitle",
        fontName=font("DejaVu-Italic"), fontSize=11, leading=14,
        alignment=TA_LEFT, textColor=white, spaceAfter=2)
    add_style("ChapterNumber",
        fontName=font("DejaVu"), fontSize=9, leading=12,
        alignment=TA_LEFT, textColor=white)

    # ── Section Header (no colored bar, just text + accent rule) ──
    add_style("SectionHeader",
        fontName=font("DejaVu-Bold"), fontSize=12, leading=16,
        alignment=TA_LEFT, textColor=chapter_color, spaceBefore=6 * mm)

    # ── Sub-Section Header ──
    add_style("SubSectionHeader",
        fontName=font("DejaVu-Bold"), fontSize=12, leading=16,
        alignment=TA_LEFT, textColor=chapter_color)

    # ── Body Text ──
    add_style("BodyText",
        fontName=font("DejaVu"), fontSize=10, leading=15,
        alignment=TA_JUSTIFY, textColor=HexColor("#212121"), spaceAfter=3)
    add_style("BodyBold",
        fontName=font("DejaVu-Bold"), fontSize=10, leading=15,
        alignment=TA_JUSTIFY, textColor=HexColor("#212121"), spaceAfter=3)

    # ── Bullet Points ──
    add_style("Bullet1",
        fontName=font("DejaVu"), fontSize=10, leading=15,
        alignment=TA_LEFT, textColor=HexColor("#212121"),
        leftIndent=15, spaceAfter=3, bulletIndent=5)
    add_style("Bullet2",
        fontName=font("DejaVu"), fontSize=10, leading=15,
        alignment=TA_LEFT, textColor=HexColor("#212121"),
        leftIndent=30, spaceAfter=3, bulletIndent=20)

    # ── Content Box ──
    add_style("BoxTitle",
        fontName=font("DejaVu-Bold"), fontSize=11, leading=14,
        alignment=TA_CENTER, textColor=white)
    add_style("BoxBody",
        fontName=font("DejaVu"), fontSize=9.5, leading=13,
        alignment=TA_JUSTIFY, textColor=HexColor("#212121"), spaceAfter=2)

    # ── Question Box ──
    add_style("QuestionText",
        fontName=font("DejaVu-Bold"), fontSize=10, leading=14,
        alignment=TA_LEFT, textColor=HexColor("#212121"))
    add_style("AnswerText",
        fontName=font("DejaVu-Bold"), fontSize=10, leading=14,
        alignment=TA_LEFT, textColor=HexColor("#2E7D32"))
    add_style("ExplanationText",
        fontName=font("DejaVu-Italic"), fontSize=9, leading=12,
        alignment=TA_LEFT, textColor=HexColor("#37474F"))

    # ── Table ──
    add_style("TableCaption",
        fontName=font("DejaVu-Bold"), fontSize=9.5, leading=13,
        alignment=TA_LEFT, textColor=chapter_color, spaceAfter=2)
    add_style("TableHeader",
        fontName=font("DejaVu-Bold"), fontSize=8.5, leading=11,
        alignment=TA_CENTER, textColor=white)
    add_style("TableBody",
        fontName=font("DejaVu"), fontSize=9, leading=12,
        alignment=TA_LEFT, textColor=HexColor("#212121"))

    # ── TOC ──
    add_style("TOCTitle",
        fontName=font("DejaVu-Bold"), fontSize=20, leading=24,
        alignment=TA_CENTER, textColor=HexColor("#1A5276"), spaceAfter=12 * mm)
    add_style("TOCEntry",
        fontName=font("DejaVu"), fontSize=11, leading=16,
        alignment=TA_LEFT, textColor=HexColor("#212121"), spaceAfter=3 * mm,
        leftIndent=10 * mm)

    # ── Footer ──
    add_style("Footer",
        fontName=font("DejaVu"), fontSize=8, leading=10,
        alignment=TA_CENTER, textColor=HexColor("#9E9E9E"))

    return styles


# ═══════════════════════════════════════════════════════════════════════════
# CHAPTER MARKER (for TOC)
# ═══════════════════════════════════════════════════════════════════════════

class ChapMarker(Flowable):
    """Invisible flowable that records chapter start page for TOC."""
    def __init__(self, chapter_num: int, chapter_title: str):
        Flowable.__init__(self)
        self.chapter_num = chapter_num
        self.chapter_title = chapter_title
        self.width = 0
        self.height = 0
    def draw(self):
        pass


# ═══════════════════════════════════════════════════════════════════════════
# CHAPTER BANNER (Chapter 2+)
# ═══════════════════════════════════════════════════════════════════════════

def chapter_banner(chapter_num: int, title: str, subtitle: str = "",
                   color_index: int = 0, question_count: int = None):
    """
    Create a professional chapter banner — full-width colored bar.

    Chapter number and title on the SAME line, left-aligned inside the bar.
    Subtitle on the next line (also inside bar), white italic 11pt.
    2px colored rule below the bar.
    """
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []

    # Single-row banner: "Chapter N    Title"
    chapter_label = f"<b>Chapter {chapter_num}</b>    {title}"
    banner_data = [[Paragraph(chapter_label, styles["ChapterTitle"])]]

    if subtitle:
        banner_data.append([Paragraph(subtitle, styles["ChapterSubtitle"])])

    col_width = 174 * mm
    banner_table = Table(banner_data, colWidths=[col_width])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    elements.append(banner_table)

    # 2px colored rule below the bar
    elements.append(HRFlowable(
        width="100%",
        thickness=2,
        color=color,
        spaceAfter=6 * mm,
        spaceBefore=0,
    ))

    return elements


# ═══════════════════════════════════════════════════════════════════════════
# SECTION HEADER (no colored bar, text + accent rule)
# ═══════════════════════════════════════════════════════════════════════════

def section_header(title: str, color_index: int = 0):
    """
    Create a section header: bold 12pt chapter color text with colored accent rule below.
    No colored background bar. Accent rule: 35% width, 1.5px thick, left-aligned.
    4mm space after.
    """
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []

    elements.append(Paragraph(title, styles["SectionHeader"]))

    accent_width = 174 * mm * 0.35
    elements.append(HRFlowable(
        width=accent_width,
        thickness=1.5,
        color=color,
        spaceAfter=4 * mm,
        spaceBefore=1,
    ))

    return elements


# ═══════════════════════════════════════════════════════════════════════════
# SUB-SECTION HEADER
# ═══════════════════════════════════════════════════════════════════════════

def sub_header(title: str, color_index: int = 0):
    """
    Create a sub-section header: bold 12pt chapter color with accent rule.
    Accent rule: 35% width, 1.5px thick.
    """
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []

    elements.append(Paragraph(title, styles["SubSectionHeader"]))

    accent_width = 174 * mm * 0.35
    elements.append(HRFlowable(
        width=accent_width,
        thickness=1.5,
        color=color,
        spaceAfter=4 * mm,
        spaceBefore=1,
    ))

    return elements


# ═══════════════════════════════════════════════════════════════════════════
# CONTENT BOXES
# ═══════════════════════════════════════════════════════════════════════════

# Box color maps
BOX_COLORS = {
    "KTP": (HexColor(BOX_KTP), HexColor(BOX_KTP_BG)),
    "MCQ": (HexColor(BOX_MCQ), HexColor(BOX_MCQ_BG)),
    "IMPORTANT": (HexColor(BOX_IMPORTANT), HexColor(BOX_IMPORTANT_BG)),
    "OSCE": (HexColor(BOX_OSCE), HexColor(BOX_OSCE_BG)),
}

BOX_TITLES = {
    "KTP": "KEY TEACHING POINTS",
    "MCQ": "MCQ TRAPS & PITFALLS",
    "IMPORTANT": "IMPORTANT",
    "OSCE": "OSCE PEARLS",
}


def content_box(title: str, items: list, box_type: str = "KTP"):
    """
    Create a styled content box with colored header bar and tinted body.

    Args:
        title: Box title (e.g. "KEY TEACHING POINTS")
        items: List of bullet point strings
        box_type: KTP, MCQ, IMPORTANT, or OSCE

    Returns:
        List of flowables
    """
    border_color, bg_color = BOX_COLORS.get(box_type, (HexColor(BOX_KTP), HexColor(BOX_KTP_BG)))
    styles = get_styles()
    elements = []

    box_data = []
    box_data.append([Paragraph(title, styles["BoxTitle"])])

    for item in items:
        clean_item = item.strip().lstrip('•-* ').strip()
        if clean_item:
            box_data.append([Paragraph(clean_item, styles["BoxBody"])])

    if len(box_data) < 2:
        return elements

    col_width = 165 * mm
    box_table = Table(box_data, colWidths=[col_width])
    box_table.setStyle(TableStyle([
        # Title bar
        ('BACKGROUND', (0, 0), (-1, 0), border_color),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        # Body
        ('BACKGROUND', (0, 1), (-1, -1), bg_color),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        # Border
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('LINEBELOW', (0, 0), (-1, 0), 0, border_color),
        # Alignment
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    elements.append(box_table)
    elements.append(Spacer(1, 4 * mm))

    return elements


def key_teaching_points(items: list):
    return content_box("KEY TEACHING POINTS", items, "KTP")


def mcq_traps(items: list):
    return content_box("MCQ TRAPS & PITFALLS", items, "MCQ")


def important_box(items: list):
    return content_box("IMPORTANT", items, "IMPORTANT")


def osce_pearls(items: list):
    return content_box("OSCE PEARLS", items, "OSCE")


# ═══════════════════════════════════════════════════════════════════════════
# QUESTION BOX (Reference Style)
# ═══════════════════════════════════════════════════════════════════════════

def question_box(question: str, choices: list, answer: str, explanation: str = ""):
    """
    Create a past-paper style question box.
    Light gray background header, indented options, green answer, italic explanation.
    Border: light gray (#D5D8DC), 0.5px.
    Space after: 1.5mm.
    """
    styles = get_styles()
    elements = []

    q_data = []
    q_data.append([Paragraph(f"<b>Q: {question}</b>", styles["QuestionText"])])

    for i, choice in enumerate(choices):
        choice_letter = chr(65 + i)
        q_data.append([Paragraph(f"    {choice_letter}. {choice}", styles["BodyText"])])

    if answer:
        q_data.append([Paragraph(f"<b>Answer: {answer}</b>", styles["AnswerText"])])

    if explanation:
        q_data.append([Paragraph(f"<i>Explanation: {explanation}</i>", styles["ExplanationText"])])

    col_width = 165 * mm
    q_table = Table(q_data, colWidths=[col_width])
    q_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, HexColor("#D5D8DC")),
        ('BACKGROUND', (0, 0), (-1, 0), HexColor("#F2F3F4")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    elements.append(q_table)
    elements.append(Spacer(1, 1.5 * mm))

    return elements


# ═══════════════════════════════════════════════════════════════════════════
# PROFESSIONAL TABLE
# ═══════════════════════════════════════════════════════════════════════════

def professional_table(headers: list, rows: list, color_index: int = 0, caption: str = ""):
    """
    Create a professional styled table.
    Caption: above table, bold, chapter color, 9.5pt.
    Header: chapter color bg, white text, centered, 8.5pt.
    Body: white / #F5F5F5 zebra stripes, 9pt.
    Grid: #BDBDBD 0.5px, outer border chapter color 0.8px.
    """
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []

    if caption:
        elements.append(Paragraph(f"<b>{caption}</b>", styles["TableCaption"]))

    table_data = []
    header_cells = [Paragraph(h, styles["TableHeader"]) for h in headers]
    table_data.append(header_cells)

    for row in rows:
        row_cells = [Paragraph(str(cell), styles["TableBody"]) for cell in row]
        table_data.append(row_cells)

    num_cols = len(headers)
    col_width = 165 * mm / num_cols
    col_widths = [col_width] * num_cols

    table = Table(table_data, colWidths=col_widths, repeatRows=1)

    style_commands = [
        ('BACKGROUND', (0, 0), (-1, 0), color),
        ('TOPPADDING', (0, 0), (-1, 0), 5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor("#BDBDBD")),
        ('BOX', (0, 0), (-1, -1), 0.8, color),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]

    for i in range(1, len(table_data)):
        if i % 2 == 0:
            style_commands.append(('BACKGROUND', (0, i), (-1, i), HexColor("#F5F5F5")))

    table.setStyle(TableStyle(style_commands))
    elements.append(table)
    elements.append(Spacer(1, 4 * mm))

    return elements


# ═══════════════════════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════════════════════

def cover_page(title: str, subtitle: str = "", feature_lines: list = None,
               edition: str = "", source_info: str = ""):
    """
    Create a reference-style cover page.

    - Title: UPPERCASE (if short), 28-32pt, centered, dark blue (#1A5276)
    - Subtitle: 13pt, gray (#757575), • separators
    - Source info: e.g. "Based on Jordan University Orthopedic Curriculum"
    - Feature lines: each on own line, • prefix, centered, dark gray
    - Edition: bottom, red (#C0392B), centered
    - NO author, NO "OWL Medical Education", NO "Generated by", NO date/version
    """
    styles = get_styles()
    elements = []

    # Top spacer — push content toward middle
    elements.append(Spacer(1, 35 * mm))

    # Title: UPPERCASE for short titles
    display_title = title.upper() if len(title) <= 40 else title
    elements.append(Paragraph(display_title, styles["CoverTitle"]))

    # Subtitle
    if subtitle:
        elements.append(Paragraph(subtitle, styles["CoverSubtitle"]))

    # Source info (e.g. "Based on Jordan University Orthopedic Curriculum")
    if source_info:
        elements.append(Spacer(1, 6 * mm))
        src_style = ParagraphStyle(
            "CoverSource", parent=styles["CoverSubtitle"],
            fontSize=11, textColor=HexColor("#424242"),
        )
        elements.append(Paragraph(source_info, src_style))

    # Feature lines block
    if feature_lines:
        elements.append(Spacer(1, 10 * mm))
        for line in feature_lines:
            elements.append(Paragraph(f"• {line}", styles["CoverFeature"]))

    # Edition at bottom
    if edition:
        elements.append(Spacer(1, 15 * mm))
        elements.append(Paragraph(edition, styles["CoverEdition"]))

    elements.append(Spacer(1, 20 * mm))

    return elements


# ═══════════════════════════════════════════════════════════════════════════
# TOC PAGE
# ═══════════════════════════════════════════════════════════════════════════

def toc_page(toc_entries: list):
    """
    Create a table of contents page.
    Format: Chapter N      Title         page_num
    Title: "TABLE OF CONTENTS", 20pt, bold, centered, dark blue
    Entries: left-aligned with indent, 11pt
    NO dotted leaders needed — just spacing
    """
    styles = get_styles()
    elements = []

    elements.append(Paragraph("TABLE OF CONTENTS", styles["TOCTitle"]))
    elements.append(Spacer(1, 6 * mm))

    for chapter_num, title, page_num in toc_entries:
        entry_text = f"<b>Chapter {chapter_num}</b>    {title}"
        if page_num is not None:
            entry_text += f"    {page_num}"
        elements.append(Paragraph(entry_text, styles["TOCEntry"]))

    return elements


# ═══════════════════════════════════════════════════════════════════════════
# BODY TEXT HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def body_paragraph(text: str, style: str = "BodyText"):
    styles = get_styles()
    return Paragraph(text, styles[style])


def bullet_item(text: str, level: int = 1):
    styles = get_styles()
    style_name = f"Bullet{level}"
    bullet_char = "•" if level == 1 else "◦"
    return Paragraph(f"{bullet_char} {sanitize_reportlab_xml(text)}", styles[style_name])


# ═══════════════════════════════════════════════════════════════════════════
# FOOTER DRAW FUNCTION — Simple centered page number only
# ═══════════════════════════════════════════════════════════════════════════

def draw_footer(canvas, doc):
    """Draw simple centered page number footer. ~15mm from bottom."""
    canvas.saveState()
    page_num = canvas.getPageNumber()
    canvas.setFont(get_font_name("DejaVu"), 8)
    canvas.setFillColor(HexColor("#9E9E9E"))
    canvas.drawCentredString(105 * mm, 15 * mm, str(page_num))
    canvas.restoreState()


def draw_footer_with_title(canvas, doc, title: str = ""):
    """Draw footer with page number + optional doc title. ~15mm from bottom."""
    canvas.saveState()
    canvas.setFont(get_font_name("DejaVu"), 8)
    canvas.setFillColor(HexColor("#9E9E9E"))
    page_num = canvas.getPageNumber()
    canvas.drawCentredString(105 * mm, 15 * mm, str(page_num))
    if title:
        canvas.drawRightString(190 * mm, 15 * mm, title)
    canvas.restoreState()


# ═══════════════════════════════════════════════════════════════════════════
# PDF BUILDER CLASS
# ═══════════════════════════════════════════════════════════════════════════

class PDFBuilder:
    """Single-pass PDF builder."""

    def __init__(self, output_path: str, title: str = "", color_index: int = 0):
        self.output_path = output_path
        self.title = title
        self.color_index = color_index
        self.story = []
        self.styles = get_styles()
        self._toc_entries = []

    def add_section(self, title: str):
        self.story.extend(section_header(title, self.color_index))

    def add_subsection(self, title: str):
        self.story.extend(sub_header(title, self.color_index))

    def add_paragraph(self, text: str, style: str = "BodyText"):
        self.story.append(Paragraph(sanitize_reportlab_xml(text), self.styles[style]))

    def add_bullet(self, text: str, level: int = 1):
        self.story.append(bullet_item(sanitize_reportlab_xml(text), level))

    def add_content_box(self, box_type: str, items: list):
        type_map = {
            "KTP": key_teaching_points,
            "MCQ": mcq_traps,
            "IMPORTANT": important_box,
            "OSCE": osce_pearls,
        }
        fn = type_map.get(box_type, key_teaching_points)
        self.story.extend(fn(items))

    def add_question(self, question: str, choices: list, answer: str, explanation: str = ""):
        self.story.extend(question_box(question, choices, answer, explanation))

    def add_table(self, headers: list, rows: list, caption: str = ""):
        self.story.extend(professional_table(headers, rows, self.color_index, caption))

    def add_table_with_color(self, headers: list, rows: list, color_index: int, caption: str = ""):
        self.story.extend(professional_table(headers, rows, color_index, caption))

    def add_cover(self, title: str, subtitle: str = "", feature_lines: list = None,
                  edition: str = "", source_info: str = ""):
        self.story.extend(cover_page(title, subtitle, feature_lines, edition, source_info))

    def add_toc(self, toc_entries: list):
        self.story.extend(toc_page(toc_entries))

    def build(self):
        doc = SimpleDocTemplate(
            self.output_path,
            pagesize=A4,
            leftMargin=18 * mm, rightMargin=18 * mm,
            topMargin=18 * mm, bottomMargin=22 * mm,
        )
        frame = Frame(18 * mm, 22 * mm, 174 * mm, 257 * mm, id='normal', showBoundary=0)
        template = PageTemplate(
            id='main', frames=frame,
            onPage=lambda canvas, doc: draw_footer_with_title(canvas, doc, self.title),
        )
        doc.addPageTemplates([template])
        doc.build(self.story)
        return self.output_path


# ═══════════════════════════════════════════════════════════════════════════
# TWO-PASS BUILDER (for TOC with correct page numbers)
# ═══════════════════════════════════════════════════════════════════════════

class TwoPassPDFBuilder:
    """Two-pass PDF builder for accurate TOC page numbers."""

    def __init__(self, output_path: str, title: str = "", color_index: int = 0):
        self.output_path = output_path
        self.title = title
        self.color_index = color_index
        self.color = get_color(color_index)
        self.styles = get_styles(self.color)
        self.story = []
        self.chapter_markers = []

    def add_chapter(self, chapter_num: int, title: str, subtitle: str = "", content: list = None):
        marker = ChapMarker(chapter_num, title)
        self.chapter_markers.append((chapter_num, title, len(self.story)))
        self.story.append(marker)

        if chapter_num > 1:
            banner = chapter_banner(
                chapter_num, title, subtitle,
                color_index=self.color_index + chapter_num - 1
            )
            self.story.extend(banner)
        else:
            self.story.append(Spacer(1, 4 * mm))

        if content:
            self.story.extend(content)

    def add_section(self, title: str):
        self.story.extend(section_header(title, self.color_index))

    def add_subsection(self, title: str):
        self.story.extend(sub_header(title, self.color_index))

    def add_paragraph(self, text: str, style: str = "BodyText"):
        self.story.append(Paragraph(sanitize_reportlab_xml(text), self.styles[style]))

    def add_bullet(self, text: str, level: int = 1):
        self.story.append(bullet_item(sanitize_reportlab_xml(text), level))

    def add_content_box(self, box_type: str, items: list):
        type_map = {
            "KTP": key_teaching_points,
            "MCQ": mcq_traps,
            "IMPORTANT": important_box,
            "OSCE": osce_pearls,
        }
        fn = type_map.get(box_type, key_teaching_points)
        self.story.extend(fn(items))

    def add_question(self, question: str, choices: list, answer: str, explanation: str = ""):
        self.story.extend(question_box(question, choices, answer, explanation))

    def add_table(self, headers: list, rows: list, caption: str = ""):
        self.story.extend(professional_table(headers, rows, self.color_index, caption))

    def add_table_with_color(self, headers: list, rows: list, color_index: int, caption: str = ""):
        self.story.extend(professional_table(headers, rows, color_index, caption))

    def add_cover(self, title: str, subtitle: str = "", feature_lines: list = None,
                  edition: str = "", source_info: str = ""):
        self.story.extend(cover_page(title, subtitle, feature_lines, edition, source_info))

    def add_toc(self, toc_entries: list):
        self.story.extend(toc_page(toc_entries))

    def build(self):
        # Pass 1: Build to get page numbers
        temp_path = self.output_path + ".temp.pdf"
        doc1 = SimpleDocTemplate(
            temp_path, pagesize=A4,
            leftMargin=18 * mm, rightMargin=18 * mm,
            topMargin=18 * mm, bottomMargin=22 * mm,
        )
        frame1 = Frame(18 * mm, 22 * mm, 174 * mm, 257 * mm, id='normal')
        doc1.addPageTemplates([PageTemplate(id='main', frames=frame1)])
        doc1.build(self.story)

        # Get page numbers for chapters
        chapter_pages = self._get_chapter_pages(temp_path)

        # Build final TOC entries with actual page numbers
        toc_entries = []
        for ch_num, ch_title, marker_idx in self.chapter_markers:
            page = chapter_pages.get(ch_num, None)
            toc_entries.append((ch_num, ch_title, page))

        # Pass 2: Rebuild story with corrected TOC
        original_story = self.story[:]

        # Find the index where "TABLE OF CONTENTS" appears
        toc_start = None
        for idx, item in enumerate(original_story):
            if isinstance(item, Paragraph):
                text = item.text if hasattr(item, 'text') else str(item)
                if 'TABLE OF CONTENTS' in str(text):
                    toc_start = idx
                    break

        # Find where TOC ends: look for the next non-TOC element
        if toc_start is not None:
            toc_end = toc_start
            for idx in range(toc_start, len(original_story)):
                item = original_story[idx]
                if isinstance(item, (ChapMarker,)):
                    toc_end = idx
                    break
                if isinstance(item, Table) and idx > toc_start + 2:
                    toc_end = idx
                    break
            else:
                toc_end = len(original_story)
        else:
            toc_start = 0
            toc_end = 0

        # Build new story: before TOC + corrected TOC + after TOC
        new_story = original_story[:toc_start]
        new_story.extend(toc_page(toc_entries))
        new_story.extend(original_story[toc_end:])

        # Pass 2: final build with footer
        doc2 = SimpleDocTemplate(
            self.output_path, pagesize=A4,
            leftMargin=18 * mm, rightMargin=18 * mm,
            topMargin=18 * mm, bottomMargin=22 * mm,
        )
        frame2 = Frame(18 * mm, 22 * mm, 174 * mm, 257 * mm, id='normal')
        template2 = PageTemplate(
            id='main', frames=frame2,
            onPage=lambda canvas, doc: draw_footer_with_title(canvas, doc, self.title),
        )
        doc2.addPageTemplates([template2])
        doc2.build(new_story)

        if os.path.exists(temp_path):
            os.remove(temp_path)

        return self.output_path

    def _get_chapter_pages(self, pdf_path: str) -> dict:
        """Get chapter start pages from a built PDF. Returns {chapter_num: page_num}."""
        pages = {}
        try:
            import fitz
            doc = fitz.open(pdf_path)
            for page_num in range(len(doc)):
                text = doc[page_num].get_text()
                for ch_num, ch_title, _ in self.chapter_markers:
                    # Check for banner text on this page
                    if f"Chapter {ch_num}" in text and ch_title[:30] in text:
                        pages[ch_num] = page_num + 1
            doc.close()
        except Exception:
            for ch_num, ch_title, marker_idx in self.chapter_markers:
                pages[ch_num] = ch_num + 2
        return pages


# ═══════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'-\s+', '', text)
    return text.strip()


def escape_xml(text: str) -> str:
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    return text


def preserve_reportlab_xml(text: str) -> str:
    """
    Escape XML special chars but preserve ReportLab <b>, <i>, <u>, <sup>, <sub>, <br/> tags.
    """
    if not text:
        return text
    # Temporarily replace reportlab tags
    preserved = []
    tag_pattern = re.compile(r'<(/?)(b|i|u|sup|sub|br|font|para|a|link|nobr|ul|ol|li|blockquote|code|pre)(\s[^>]*)?/?>')
    idx = 0
    for m in tag_pattern.finditer(text):
        chunk = text[idx:m.start()]
        chunk = chunk.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        preserved.append(chunk)
        preserved.append(m.group(0))
        idx = m.end()
    remaining = text[idx:]
    remaining = remaining.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    preserved.append(remaining)
    return ''.join(preserved)


def sanitize_reportlab_xml(text: str) -> str:
    """
    Fix common AI-generated ReportLab XML tag malformations before parsing.

    Delegates to the shared html_sanitizer module which provides a more
    complete fixer (HTML-parser-based, handles nesting, converts <strong>
    to <b>, <em> to <i>, escapes bare angle brackets, etc.).

    Kept as a module-level alias for backward compatibility — every import
    of ``pdf_style.sanitize_reportlab_xml`` continues to work.
    """
    try:
        from html_sanitizer import sanitize_reportlab_xml as _sanitize
        return _sanitize(text)
    except ImportError:
        pass

    if not text:
        return text

    for tag in ('b', 'i', 'u', 'sup', 'sub', 'font', 'nobr', 'code', 'pre', 'blockquote', 'link'):
        colon_close = re.compile(r'<' + tag + r'(\s[^>]*)?>([^<]*?):' + tag + r'>')
        text = colon_close.sub(r'<' + tag + r'\1>\2</' + tag + r'>', text)

    for tag in ('b', 'i', 'u', 'sup', 'sub', 'font', 'nobr', 'code', 'pre', 'blockquote'):
        opens = len(re.findall(r'<' + tag + r'(\s[^>]*)?>', text))
        closes = len(re.findall(r'</' + tag + r'>', text))
        if opens > closes:
            text += ('</' + tag + '>') * (opens - closes)

    for tag in ('b', 'i', 'u', 'sup', 'sub', 'font', 'nobr', 'code', 'pre', 'blockquote', 'link'):
        opens = len(re.findall(r'<' + tag + r'(\s[^>]*)?>', text))
        closes = len(re.findall(r'</' + tag + r'>', text))
        if closes > opens:
            excess = closes - opens
            for _ in range(excess):
                text = re.sub(r'</' + tag + r'>(?=[^<]*$)', '', text)

    return text


register_fonts()
