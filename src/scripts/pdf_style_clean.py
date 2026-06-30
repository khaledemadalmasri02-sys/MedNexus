#!/usr/bin/env python3
"""Universal PDF Style Module for Professional Medical Exam PDFs."""

import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import Color, HexColor, white, black
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageTemplate, Frame, HRFlowable, KeepTogether, Flowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

DEFAULT_COLORS = [
    "#1A5276", "#117A65", "#7D3C98", "#C0392B",
    "#D4AC0D", "#2E86C1", "#27AE60", "#E67E22",
    "#8E44AD", "#16A085", "#F39C12", "#2C3E50",
    "#E74C3C", "#3498DB", "#2ECC71", "#9B59B6",
    "#F1C40F", "#E91E63", "#00BCD4", "#FF5722",
    "#607D8B", "#795548", "#4CAF50", "#FF9800",
]

FONTS_REGISTERED = False

def get_color(index):
    return HexColor(DEFAULT_COLORS[index % len(DEFAULT_COLORS)])

def tint_color(hex_color, tint_percent=0.1):
    c = HexColor(hex_color)
    r, g, b = c.red, c.green, c.blue
    r = int(r + (1 - r) * (1 - tint_percent))
    g = int(g + (1 - g) * (1 - tint_percent))
    b = int(b + (1 - b) * (1 - tint_percent))
    return Color(r, g, b)

def register_fonts():
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
            if "dejavu" in f.lower() and f.lower().endswith(".ttf"):
                font_paths.append(root)
                break
    font_files = {"DejaVu": None, "DejaVu-Bold": None, "DejaVu-Italic": None, "DejaVu-BoldItalic": None, "DejaVuSerif-Bold": None}
    for font_dir in font_paths:
        if not os.path.exists(font_dir):
            continue
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
    for name, path in font_files.items():
        if path and os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
            except Exception:
                pass
    FONTS_REGISTERED = True

def get_font_name(base_name):
    register_fonts()
    available = pdfmetrics.getRegisteredFontNames()
    if base_name in available:
        return base_name
    fallbacks = {"DejaVu": "Helvetica", "DejaVu-Bold": "Helvetica-Bold", "DejaVu-Italic": "Helvetica-Oblique", "DejaVu-BoldItalic": "Helvetica-BoldOblique", "DejaVuSerif-Bold": "Helvetica-Bold"}
    return fallbacks.get(base_name, "Helvetica")

def get_styles(chapter_color=None):
    register_fonts()
    if chapter_color is None:
        chapter_color = get_color(0)
    styles = getSampleStyleSheet()
    def add_style(name, **kwargs):
        if name not in styles:
            styles.add(ParagraphStyle(name, **kwargs))
    add_style("CoverTitle", fontName=get_font_name("DejaVuSerif-Bold"), fontSize=32, leading=40, alignment=TA_CENTER, textColor=chapter_color, spaceAfter=10)
    add_style("CoverSubtitle", fontName=get_font_name("DejaVu"), fontSize=13, leading=18, alignment=TA_CENTER, textColor=HexColor("#757575"), spaceAfter=6)
    add_style("CoverAuthor", fontName=get_font_name("DejaVu"), fontSize=15, leading=20, alignment=TA_CENTER, textColor=HexColor("#424242"), spaceAfter=10)
    add_style("CoverInfo", fontName=get_font_name("DejaVu"), fontSize=10, leading=14, alignment=TA_CENTER, textColor=HexColor("#9E9E9E"), spaceAfter=4)
    add_style("CoverEdition", fontName=get_font_name("DejaVu-Bold"), fontSize=12, leading=16, alignment=TA_CENTER, textColor=HexColor("#C0392B"), spaceAfter=10)
    add_style("ChapterTitle", fontName=get_font_name("DejaVuSerif-Bold"), fontSize=22, leading=28, alignment=TA_CENTER, textColor=white, spaceAfter=2)
    add_style("ChapterSubtitle", fontName=get_font_name("DejaVu-Italic"), fontSize=11, leading=14, alignment=TA_CENTER, textColor=white, spaceAfter=2)
    add_style("ChapterNumber", fontName=get_font_name("DejaVu"), fontSize=9, leading=12, alignment=TA_LEFT, textColor=white)
    add_style("SectionHeader", fontName=get_font_name("DejaVu-Bold"), fontSize=12, leading=16, alignment=TA_LEFT, textColor=white)
    add_style("SubSectionHeader", fontName=get_font_name("DejaVu-Bold"), fontSize=12, leading=16, alignment=TA_LEFT, textColor=chapter_color)
    add_style("BodyText", fontName=get_font_name("DejaVu"), fontSize=10, leading=15, alignment=TA_JUSTIFY, textColor=HexColor("#212121"), spaceAfter=3)
    add_style("BodyBold", fontName=get_font_name("DejaVu-Bold"), fontSize=10, leading=15, alignment=TA_JUSTIFY, textColor=HexColor("#212121"), spaceAfter=3)
    add_style("Bullet1", fontName=get_font_name("DejaVu"), fontSize=10, leading=15, alignment=TA_LEFT, textColor=HexColor("#212121"), leftIndent=15, spaceAfter=3, bulletIndent=5)
    add_style("Bullet2", fontName=get_font_name("DejaVu"), fontSize=10, leading=15, alignment=TA_LEFT, textColor=HexColor("#212121"), leftIndent=30, spaceAfter=3, bulletIndent=20)
    add_style("BoxTitle", fontName=get_font_name("DejaVu-Bold"), fontSize=11, leading=14, alignment=TA_CENTER, textColor=white)
    add_style("BoxBody", fontName=get_font_name("DejaVu"), fontSize=9.5, leading=13, alignment=TA_JUSTIFY, textColor=HexColor("#212121"), spaceAfter=2)
    add_style("QuestionText", fontName=get_font_name("DejaVu-Bold"), fontSize=10, leading=14, alignment=TA_LEFT, textColor=HexColor("#212121"))
    add_style("AnswerText", fontName=get_font_name("DejaVu-Bold"), fontSize=10, leading=14, alignment=TA_LEFT, textColor=HexColor("#2E7D32"))
    add_style("ExplanationText", fontName=get_font_name("DejaVu-Italic"), fontSize=9, leading=12, alignment=TA_LEFT, textColor=HexColor("#37474F"))
    add_style("SlideRef", fontName=get_font_name("DejaVu-Italic"), fontSize=9, leading=12, alignment=TA_LEFT, textColor=HexColor("#E65100"))
    add_style("TableHeader", fontName=get_font_name("DejaVu-Bold"), fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=white)
    add_style("TableBody", fontName=get_font_name("DejaVu"), fontSize=9, leading=12, alignment=TA_LEFT, textColor=HexColor("#212121"))
    add_style("TOCTitle", fontName=get_font_name("DejaVuSerif-Bold"), fontSize=24, leading=30, alignment=TA_CENTER, textColor=chapter_color, spaceAfter=20)
    add_style("TOCEntry", fontName=get_font_name("DejaVu"), fontSize=11, leading=16, alignment=TA_LEFT, textColor=HexColor("#212121"), spaceAfter=4)
    add_style("TOCEntryBold", fontName=get_font_name("DejaVu-Bold"), fontSize=11, leading=16, alignment=TA_LEFT, textColor=HexColor("#212121"), spaceAfter=4)
    add_style("Footer", fontName=get_font_name("DejaVu"), fontSize=8, leading=10, alignment=TA_CENTER, textColor=HexColor("#95A5A6"))
    return styles

class ChapMarker(Flowable):
    def __init__(self, chapter_num, chapter_title):
        Flowable.__init__(self)
        self.chapter_num = chapter_num
        self.chapter_title = chapter_title
        self.width = 0
        self.height = 0
    def draw(self):
        pass

def chapter_banner(chapter_num, title, subtitle="", color_index=0, question_count=None):
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []
    banner_data = []
    banner_data.append([Paragraph(f"Chapter {chapter_num}", styles["ChapterNumber"])])
    banner_data.append([Paragraph(title, styles["ChapterTitle"])])
    if subtitle:
        banner_data.append([Paragraph(subtitle, styles["ChapterSubtitle"])])
    banner_table = Table(banner_data, colWidths=[140 * mm])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(banner_table)
    elements.append(HRFlowable(width="100%", thickness=2, color=color, spaceAfter=8, spaceBefore=2))
    if question_count:
        badge_data = [[Paragraph(f"{question_count} Questions", styles["ChapterNumber"])]]
        badge_table = Table(badge_data, colWidths=[40 * mm])
        badge_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), color),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(badge_table)
    return elements

def section_header(title, color_index=0):
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []
    header_data = [[Paragraph(title, styles["SectionHeader"])]]
    header_table = Table(header_data, colWidths=[140 * mm])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 2 * mm))
    return elements

def sub_header(title, color_index=0):
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []
    elements.append(Paragraph(title, styles["SubSectionHeader"]))
    accent_width = 140 * mm * 0.35
    elements.append(HRFlowable(width=accent_width, thickness=1.5, color=color, spaceAfter=4, spaceBefore=1))
    return elements

def content_box(title, content, box_type="KTP", color_index=0):
    box_colors = {"KTP": "#2196F3", "MCQ": "#F44336", "IMPORTANT": "#FFC107", "OSCE": "#4CAF50"}
    border_color = HexColor(box_colors.get(box_type, "#2196F3"))
    bg_color = tint_color(box_colors.get(box_type, "#2196F3"), 0.1)
    styles = get_styles()
    elements = []
    content_lines = content.strip().split('\n')
    box_data = []
    box_data.append([Paragraph(title, styles["BoxTitle"])])
    for line in content_lines:
        line = line.strip()
        if line:
            box_data.append([Paragraph(line, styles["BoxBody"])])
    box_table = Table(box_data, colWidths=[135 * mm])
    box_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), border_color),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('BACKGROUND', (0, 1), (-1, -1), bg_color),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOX', (0, 0), (-1, -1), 1.5, border_color),
        ('LINEBELOW', (0, 0), (-1, 0), 0, border_color),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(box_table)
    elements.append(Spacer(1, 4 * mm))
    return elements

def key_teaching_points(content):
    return content_box("KEY TEACHING POINTS", content, "KTP")

def mcq_traps(content):
    return content_box("MCQ TRAPS & PITFALLS", content, "MCQ")

def important_box(content):
    return content_box("IMPORTANT", content, "IMPORTANT")

def osce_pearls(content):
    return content_box("OSCE PEARLS", content, "OSCE")

def question_box(question, answer, explanation="", slide_ref="", choices=None):
    styles = get_styles()
    elements = []
    q_data = []
    q_data.append([Paragraph(f"Q: {question}", styles["QuestionText"])])
    if choices:
        for i, choice in enumerate(choices):
            choice_letter = chr(65 + i)
            q_data.append([Paragraph(f"   {choice_letter}. {choice}", styles["BodyText"])])
    q_data.append([Paragraph(f"Answer: {answer}", styles["AnswerText"])])
    if explanation:
        q_data.append([Paragraph(f"Explanation: {explanation}", styles["ExplanationText"])])
    if slide_ref:
        q_data.append([Paragraph(f"▶ Slide: {slide_ref}", styles["SlideRef"])])
    q_table = Table(q_data, colWidths=[135 * mm])
    q_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, HexColor("#D5D8DC")),
        ('BACKGROUND', (0, 0), (-1, 0), HexColor("#F2F3F4")),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(q_table)
    elements.append(Spacer(1, 1.5 * mm))
    return elements

def professional_table(headers, rows, color_index=0):
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []
    table_data = []
    header_cells = [Paragraph(h, styles["TableHeader"]) for h in headers]
    table_data.append(header_cells)
    for row in rows:
        row_cells = [Paragraph(str(cell), styles["TableBody"]) for cell in row]
        table_data.append(row_cells)
    num_cols = len(headers)
    col_width = 140 * mm / num_cols
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
            style_commands.append(('BACKGROUND', (0, i), (-1, i), HexColor("#F8F9F9")))
    table.setStyle(TableStyle(style_commands))
    elements.append(table)
    elements.append(Spacer(1, 4 * mm))
    return elements

def cover_page(title, subtitle="", author="", info_lines=None, edition="", color_index=0):
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []
    elements.append(Spacer(1, 40 * mm))
    elements.append(Paragraph(title, styles["CoverTitle"]))
    if subtitle:
        elements.append(Paragraph(subtitle, styles["CoverSubtitle"]))
    if author:
        elements.append(Paragraph(author, styles["CoverAuthor"]))
    elements.append(Spacer(1, 10 * mm))
    accent_width = 140 * mm * 0.5
    elements.append(HRFlowable(width=accent_width, thickness=2, color=color, spaceAfter=10, spaceBefore=5))
    if info_lines:
        for line in info_lines:
            elements.append(Paragraph(line, styles["CoverInfo"]))
    if edition:
        elements.append(Spacer(1, 15 * mm))
        elements.append(Paragraph(edition, styles["CoverEdition"]))
    elements.append(Spacer(1, 60 * mm))
    return elements

def toc_page(toc_entries, color_index=0):
    color = get_color(color_index)
    styles = get_styles(color)
    elements = []
    elements.append(Paragraph("Table of Contents", styles["TOCTitle"]))
    elements.append(Spacer(1, 10 * mm))
    for chapter_num, title, page_num in toc_entries:
        entry_text = f"Chapter {chapter_num}: {title}"
        elements.append(Paragraph(entry_text, styles["TOCEntry"]))
        elements.append(Paragraph(f"  Page {page_num}", styles["CoverInfo"]))
    return elements

def body_paragraph(text, style="BodyText"):
    styles = get_styles()
    return Paragraph(text, styles[style])

def bullet_item(text, level=1):
    styles = get_styles()
    style_name = f"Bullet{level}"
    bullet_char = "•" if level == 1 else "◦"
    return Paragraph(f"{bullet_char} {text}", styles[style_name])

def draw_footer(canvas, doc, title=""):
    canvas.saveState()
    canvas.setStrokeColor(HexColor("#BDC3C7"))
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 22 * mm, 192 * mm, 22 * mm)
    canvas.setFont(get_font_name("DejaVu"), 8)
    canvas.setFillColor(HexColor("#95A5A6"))
    page_num = canvas.getPageNumber()
    canvas.drawCentredString(105 * mm, 15 * mm, str(page_num))
    if title:
        canvas.drawRightString(190 * mm, 15 * mm, title)
    canvas.restoreState()

class PDFBuilder:
    def __init__(self, output_path, title="", color_index=0):
        self.output_path = output_path
        self.title = title
        self.color_index = color_index
        self.color = get_color(color_index)
        self.styles = get_styles(self.color)
        self.story = []
        self.chapters = []
        self.markers = []

    def add_chapter(self, chapter_num, title, subtitle="", content=None):
        marker = ChapMarker(chapter_num, title)
        self.markers.append(marker)
        self.story.append(marker)
        banner_elements = chapter_banner(chapter_num, title, subtitle, color_index=self.color_index + chapter_num)
        self.story.extend(banner_elements)
        if content:
            self.story.extend(content)

    def add_section(self, title):
        self.story.extend(section_header(title, self.color_index))

    def add_subsection(self, title):
        self.story.extend(sub_header(title, self.color_index))

    def add_paragraph(self, text, style="BodyText"):
        self.story.append(Paragraph(text, self.styles[style]))

    def add_bullet(self, text, level=1):
        self.story.append(bullet_item(text, level))

    def add_content_box(self, title, content, box_type="KTP"):
        self.story.extend(content_box(title, content, box_type, self.color_index))

    def add_question(self, question, answer, explanation="", slide_ref="", choices=None):
        self.story.extend(question_box(question, answer, explanation, slide_ref, choices))

    def add_table(self, headers, rows):
        self.story.extend(professional_table(headers, rows, self.color_index))

    def add_cover(self, title, subtitle="", author="", info_lines=None, edition=""):
        self.story.extend(cover_page(title, subtitle, author, info_lines, edition, self.color_index))

    def add_toc(self, toc_entries):
        self.story.extend(toc_page(toc_entries, self.color_index))

    def build(self):
        doc = SimpleDocTemplate(
            self.output_path, pagesize=A4,
            leftMargin=18 * mm, rightMargin=18 * mm,
            topMargin=18 * mm, bottomMargin=22 * mm,
        )
        frame = Frame(18 * mm, 22 * mm, 174 * mm, 257 * mm, id='normal', showBoundary=0)
        template = PageTemplate(id='main', frames=frame, onPage=lambda canvas, doc: draw_footer(canvas, doc, self.title))
        doc.addPageTemplates([template])
        doc.build(self.story)
        return self.output_path

class TwoPassPDFBuilder:
    def __init__(self, output_path, title="", color_index=0):
        self.output_path = output_path
        self.title = title
        self.color_index = color_index
        self.color = get_color(color_index)
        self.styles = get_styles(self.color)
        self.story = []
        self.chapter_markers = []

    def add_chapter(self, chapter_num, title, subtitle="", content=None):
        marker = ChapMarker(chapter_num, title)
        self.chapter_markers.append((chapter_num, title, len(self.story)))
        self.story.append(marker)
        self.story.extend(chapter_banner(chapter_num, title, subtitle, color_index=self.color_index + chapter_num))
        if content:
            self.story.extend(content)

    def add_section(self, title):
        self.story.extend(section_header(title, self.color_index))

    def add_subsection(self, title):
        self.story.extend(sub_header(title, self.color_index))

    def add_paragraph(self, text, style="BodyText"):
        self.story.append(Paragraph(text, self.styles[style]))

    def add_bullet(self, text, level=1):
        self.story.append(bullet_item(text, level))

    def add_content_box(self, title, content, box_type="KTP"):
        self.story.extend(content_box(title, content, box_type, self.color_index))

    def add_question(self, question, answer, explanation="", slide_ref="", choices=None):
        self.story.extend(question_box(question, answer, explanation, slide_ref, choices))

    def add_table(self, headers, rows):
        self.story.extend(professional_table(headers, rows, self.color_index))

    def add_cover(self, title, subtitle="", author="", info_lines=None, edition=""):
        self.story.extend(cover_page(title, subtitle, author, info_lines, edition, self.color_index))

    def build(self):
        doc = SimpleDocTemplate(
            self.output_path, pagesize=A4,
            leftMargin=18 * mm, rightMargin=18 * mm,
            topMargin=18 * mm, bottomMargin=22 * mm,
        )
        frame = Frame(18 * mm, 22 * mm, 174 * mm, 257 * mm, id='normal')
        template = PageTemplate(id='main', frames=frame, onPage=lambda canvas, doc: draw_footer(canvas, doc, self.title))
        doc.addPageTemplates([template])
        doc.build(self.story)
        return self.output_path

def clean_text(text):
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'-\s+', '', text)
    return text.strip()

def escape_xml(text):
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    return text

register_fonts()