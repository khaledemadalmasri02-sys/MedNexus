#!/usr/bin/env python3
"""
Clinical PDF Generator — Reference Style (Orthopedic Summary Handbook)
Generates clean, reference-style PDFs using the pdf_style module.

Visual Specification:
  - Cover: UPPERCASE title, subtitle with • separators, feature lines, edition. NO author/date/version
  - TOC: "TABLE OF CONTENTS", "Chapter N      Title" entries
  - Chapter 1: NO banner — starts directly with body text
  - Chapter 2+: Full-width colored bar, "Chapter N    Title" on same line, subtitle below, 2px rule
  - Section headers: plain text + accent rule (no colored bar)
  - Content boxes: KTP/MCQ/IMPORTANT/OSCE with colored header + tinted body
  - Tables: colored header, zebra stripes, outer border, caption above
  - Questions: Q/A/E format, light gray bg, green answer
  - Footer: simple centered page number

AI Output Format Expected (post SKILL.md v2):
  - ## Section headers for major sections
  - ### Sub-section headers
  - KEY TEACHING POINTS: / - bullet (no ## prefix)
  - MCQ TRAPS: / - bullet
  - IMPORTANT: / - bullet
  - OSCE PEARLS: / - bullet
  - Table: Title / Header | Header / Row | Row (no |---| separator)
  - Q: text / A) ... / B) ... / ... / Answer: X / Explanation: text
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from pdf_style import (
    PDFBuilder, TwoPassPDFBuilder, get_styles, get_color,
    chapter_banner, section_header, sub_header,
    content_box, key_teaching_points, mcq_traps, important_box, osce_pearls,
    question_box, professional_table, cover_page, toc_page,
    body_paragraph, bullet_item, draw_footer, draw_footer_with_title,
    register_fonts, DEFAULT_COLORS, ChapMarker,
    BOX_KTP, BOX_MCQ, BOX_IMPORTANT, BOX_OSCE,
    BOX_KTP_BG, BOX_MCQ_BG, BOX_IMPORTANT_BG, BOX_OSCE_BG,
    preserve_reportlab_xml,
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageTemplate, Frame, HRFlowable, KeepTogether, Flowable, PageBreak
)


# ═══════════════════════════════════════════════════════════════════════════
# TEXT CLEANING UTILITIES
# ═══════════════════════════════════════════════════════════════════════════

def clean_ai_text(text: str) -> str:
    """Strip AI-generation artifacts from text while preserving <b></b> XML."""
    if not text:
        return ""

    # Strip "CHAPTER: N — Title" lines — builder adds banners automatically
    text = re.sub(r'^CHAPTER\s*:\s*\d+\s*[—–-]\s*.+', '', text, flags=re.MULTILINE | re.IGNORECASE)
    text = re.sub(r'^Chapter\s+\d+\s*[—–-]\s*.+', '', text, flags=re.MULTILINE | re.IGNORECASE)

    # Strip SECTION:, SUBSECTION:, SUBTITLE: prefix labels from any line
    text = re.sub(r'^(SECTION|SUBSECTION|SUBTITLE)\s*:\s*', '', text, flags=re.MULTILINE | re.IGNORECASE)

    # Strip --- horizontal rules
    text = re.sub(r'^-{3,}\s*$', '', text, flags=re.MULTILINE)

    # Strip standalone "Chapter N" marker lines (mid-page noise)
    text = re.sub(r'^Chapter\s+\d+\s*$', '', text, flags=re.MULTILINE)

    # Strip > ■ **Test Alert**: pseudo-box markers
    text = re.sub(r'^>\s*[■►]\s*', '', text, flags=re.MULTILINE)

    # Collapse multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def clean_title(text: str) -> str:
    """Clean a chapter/section title — strip all prefixes and fix line breaks."""
    if not text:
        return ""
    text = re.sub(r'\s+/\s+', ' ', text)
    text = re.sub(r'^CHAPTER\s*:\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^Chapter\s+\d+\s*[—–-]\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^\d+\s*[—–-]\s*', '', text)
    text = re.sub(r'^SECTION\s*:\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^SUBSECTION\s*:\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^SUBTITLE\s*:\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^#+\s*', '', text)
    # Don't strip <b> tags from titles — they're intentional
    return text.strip()


def check_box_colored(text: str, box_hex: str, bg_hex: str) -> str:
    """Wrap colored content box markers — for backward compatibility."""
    return text


# ═══════════════════════════════════════════════════════════════════════════
# STRUCTURED TABLE PARSER (new format: "Table: Title" + pipe-separated rows)
# ═══════════════════════════════════════════════════════════════════════════

def parse_structured_tables(text: str) -> tuple:
    """
    Parse the new table format:
      Table: Characteristic Rashes and Their Systemic Associations
      Skin Lesion | Key Features | Systemic Associations
      Erythema multiforme | Target lesions | HSV

    Returns (cleaned_text, list of (title, headers, rows) tuples)
    """
    tables = []
    lines = text.split('\n')
    output_lines = []
    i = 0

    while i < len(lines):
        stripped = lines[i].strip()

        # Detect "Table: Title" line
        table_match = re.match(r'^Table:\s*(.+)$', stripped)
        if table_match:
            table_title = table_match.group(1).strip()
            # Next line should be headers
            if i + 1 < len(lines):
                header_line = lines[i + 1].strip()
                if '|' in header_line:
                    headers = [h.strip() for h in header_line.split('|')]
                    rows = []
                    j = i + 2
                    while j < len(lines):
                        row_line = lines[j].strip()
                        if '|' in row_line and not re.match(r'^\s*\|?[\s\-:|]+\|?\s*$', row_line):
                            cells = [c.strip() for c in row_line.split('|')]
                            rows.append(cells)
                            j += 1
                        else:
                            break
                    if headers and rows:
                        tables.append((table_title, headers, rows))
                    i = j
                    continue
        output_lines.append(lines[i])
        i += 1

    return '\n'.join(output_lines), tables


# ═══════════════════════════════════════════════════════════════════════════
# CONTENT BOX PARSER (new format)
# ═══════════════════════════════════════════════════════════════════════════

# Box header patterns (ALL CAPS, no ## prefix)
BOX_PATTERNS = {
    'ktp': re.compile(r'^(KEY TEACHING POINTS|KTP)\s*:?\s*$', re.IGNORECASE),
    'mcq': re.compile(r'^(MCQ TRAPS|MCQ TRAPS & PITFALLS|COMMON MISTAKES|PITFALLS)\s*:?\s*$', re.IGNORECASE),
    'important': re.compile(r'^(IMPORTANT|IMPORTANT NOTES|KEY NOTES)\s*:?\s*$', re.IGNORECASE),
    'osce': re.compile(r'^(OSCE PEARLS|OSCE|CLINICAL PEARLS)\s*:?\s*$', re.IGNORECASE),
}

ALL_BOX_PATTERN = re.compile(
    r'^(KEY TEACHING POINTS|KTP|MCQ TRAPS|MCQ TRAPS & PITFALLS|COMMON MISTAKES|'
    r'PITFALLS|IMPORTANT|IMPORTANT NOTES|KEY NOTES|OSCE PEARLS|OSCE|CLINICAL PEARLS)\s*:?\s*$',
    re.IGNORECASE
)


def parse_content_boxes(content: str) -> list:
    """
    Parse section content into structured elements.
    Returns list of element dicts with keys:
      type: 'paragraph' | 'bullet' | 'ktp' | 'mcq' | 'important' | 'osce' |
            'question' | 'table' | 'subsection'
      data: type-specific data
    """
    elements = []
    content = clean_ai_text(content)

    lines = content.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i].strip()

        if not line:
            i += 1
            continue

        # Detect content box headers (standalone ALL CAPS)
        box_type = None
        for btype, pattern in BOX_PATTERNS.items():
            if pattern.match(line):
                box_type = btype
                break

        if box_type:
            box_lines = []
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                if ALL_BOX_PATTERN.match(next_line):
                    break
                if next_line.startswith(('## ', '### ')):
                    break
                if not next_line:
                    k = j + 1
                    while k < len(lines) and not lines[k].strip():
                        k += 1
                    if k < len(lines):
                        next_meaningful = lines[k].strip()
                        if not next_meaningful.startswith('-'):
                            break
                    j += 1
                    continue
                if next_line.startswith('-'):
                    box_lines.append(next_line)
                    j += 1
                    continue
                break

            items = [re.sub(r'^-\s*', '', bl).strip() for bl in box_lines]
            items = [it for it in items if it]

            if items:
                elements.append({'type': box_type, 'data': items})
            i = j
            continue

        # Detect subsection headers
        if line.startswith('### '):
            sub_title = clean_title(line.lstrip('#').strip())
            if sub_title:
                elements.append({'type': 'subsection', 'data': sub_title})
            i += 1
            continue

        if line.startswith('## '):
            sub_title = clean_title(line.lstrip('#').strip())
            if sub_title:
                elements.append({'type': 'subsection', 'data': sub_title})
            i += 1
            continue

        # Detect ALL CAPS subsection headers
        if re.match(r'^[A-Z][A-Z\s—–\-]{3,}$', line) and len(line) > 5:
            cleaned = line.strip('—–- ').strip()
            if not ALL_BOX_PATTERN.match(cleaned):
                elements.append({'type': 'subsection', 'data': cleaned})
            i += 1
            continue

        # Detect Q: questions (new format)
        q_match = re.match(r'^Q:\s*(.*)', line, re.IGNORECASE)
        if q_match:
            q_text = q_match.group(1).strip()
            choices = []
            answer = ''
            explanation = ''
            j = i + 1

            while j < len(lines):
                next_line = lines[j].strip()

                choice_match = re.match(r'^([A-E])\)\s*(.*)', next_line)
                if choice_match:
                    choices.append(choice_match.group(2).strip())
                    j += 1
                    continue

                ans_match = re.match(r'^Answer:\s*(.*)', next_line, re.IGNORECASE)
                if ans_match:
                    answer = ans_match.group(1).strip()
                    j += 1
                    continue

                exp_match = re.match(r'^Explanation:\s*(.*)', next_line, re.IGNORECASE)
                if exp_match:
                    explanation = exp_match.group(1).strip()
                    j += 1
                    continue

                if next_line.startswith(('Q:', '## ', '### ', 'Table:')):
                    break

                j += 1

            elements.append({
                'type': 'question',
                'data': {
                    'question': q_text,
                    'choices': choices,
                    'answer': answer,
                    'explanation': explanation,
                }
            })
            i = j
            continue

        # Detect bullet lines
        if line.startswith('- '):
            bullet_text = line[2:].strip()
            if bullet_text:
                elements.append({'type': 'bullet', 'data': bullet_text})
            i += 1
            continue

        # Regular paragraph
        if line:
            elements.append({'type': 'paragraph', 'data': line})
        i += 1

    return elements


# ═══════════════════════════════════════════════════════════════════════════
# CHAPTER PARSING
# ═══════════════════════════════════════════════════════════════════════════

def parse_summary_to_chapters(summary: dict) -> list:
    """
    Parse AI-generated summary into structured chapters.
    Groups sections into logical chapters based on topic boundaries.
    """
    chapters = []
    sections = summary.get("sections", [])
    title = summary.get("title", "Clinical Summary")

    if not sections:
        raw = summary.get("content", "")
        chapter_blocks = re.split(r'CHAPTER\s*:\s*\d+\s*[—–-]\s*', raw, flags=re.IGNORECASE)
        if len(chapter_blocks) > 1:
            for idx, block in enumerate(chapter_blocks):
                block = block.strip()
                if not block:
                    continue
                lines = block.split('\n', 1)
                ch_title = clean_title(lines[0].strip()) if lines else f"Chapter {idx + 1}"
                ch_content = lines[1] if len(lines) > 1 else block
                chapters.append({
                    "number": idx + 1,
                    "title": ch_title,
                    "subtitle": "",
                    "sections": [{"name": ch_title, "content": ch_content}]
                })
        else:
            chapters.append({
                "number": 1,
                "title": title,
                "subtitle": "",
                "sections": [{"name": "Summary", "content": raw}]
            })
        return chapters

    # Group sections into chapters — detect chapter boundaries
    current_chapter = None
    chapter_num = 0

    for section in sections:
        sec_name = section.get("name", "")
        sec_body = section.get("body", "")

        is_chapter_start = False
        ch_title = clean_title(sec_name)

        if re.match(r'^CHAPTER\s*:', sec_name, re.IGNORECASE) or \
           re.match(r'^Chapter\s+\d+', sec_name) or \
           (len(sec_body) > 500 and not current_chapter):
            is_chapter_start = True

        if is_chapter_start or current_chapter is None:
            chapter_num += 1
            current_chapter = {
                "number": chapter_num,
                "title": ch_title,
                "subtitle": "",
                "sections": []
            }
            chapters.append(current_chapter)

        if current_chapter:
            current_chapter["sections"].append({
                "name": ch_title,
                "content": sec_body
            })

    if not chapters and sections:
        chapters.append({
            "number": 1,
            "title": title,
            "subtitle": "",
            "sections": [{"name": clean_title(s.get("name", "")), "content": s.get("body", "")} for s in sections]
        })

    return chapters


# ═══════════════════════════════════════════════════════════════════════════
# COVER PAGE BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def make_cover(builder, title: str, subtitle: str, feature_lines: list,
               edition: str = "", source_info: str = ""):
    """Build a reference-style cover page. NO author, NO date, NO generator credits."""
    register_fonts()
    styles = get_styles()

    story = []
    story.append(Spacer(1, 35 * mm))

    # Title — UPPERCASE for short titles
    display_title = title.upper() if len(title) <= 40 else title
    story.append(Paragraph(display_title, styles["CoverTitle"]))

    # Subtitle with • separators
    if subtitle:
        story.append(Paragraph(subtitle, styles["CoverSubtitle"]))

    # Source info
    if source_info:
        story.append(Spacer(1, 6 * mm))
        src_style = ParagraphStyle(
            "CoverSource", parent=styles["CoverSubtitle"],
            fontSize=11, textColor=HexColor("#424242"),
        )
        story.append(Paragraph(source_info, src_style))

    # Feature lines
    if feature_lines:
        story.append(Spacer(1, 10 * mm))
        for line in feature_lines:
            story.append(Paragraph(f"• {line}", styles["CoverFeature"]))

    # Edition at bottom
    if edition:
        story.append(Spacer(1, 15 * mm))
        story.append(Paragraph(edition, styles["CoverEdition"]))

    story.append(Spacer(1, 20 * mm))

    for flowable in story:
        builder.story.append(flowable)
    builder.story.append(PageBreak())


# ═══════════════════════════════════════════════════════════════════════════
# TOC PAGE BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def make_toc(builder, chapters: list):
    """Build a clean TOC page. Format: Chapter N      Title"""
    register_fonts()
    styles = get_styles()

    story = []
    story.append(Paragraph("TABLE OF CONTENTS", styles["TOCTitle"]))
    story.append(Spacer(1, 6 * mm))

    for ch in chapters:
        ch_num = ch["number"]
        ch_title = ch["title"]
        entry_text = f"<b>Chapter {ch_num}</b>    {ch_title}"
        story.append(Paragraph(entry_text, styles["TOCEntry"]))

    story.append(PageBreak())

    for flowable in story:
        builder.story.append(flowable)


# ═══════════════════════════════════════════════════════════════════════════
# MAIN PDF GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def create_clinical_pdf(summary: dict, output_path: str,
                        author: str = "", color_index: int = 0):
    """
    Generate a professional clinical PDF from summary data.
    Uses PDFBuilder.
    """
    register_fonts()

    title = summary.get("title", "Clinical Summary")
    chapters = parse_summary_to_chapters(summary)

    emit("stage", {"stage": "building_pdf", "message": f"Building clinical PDF with {len(chapters)} chapters..."})

    builder = PDFBuilder(
        output_path=output_path,
        title=title,
        color_index=color_index
    )

    # ── Cover Page ──
    emit("stage", {"stage": "adding_cover", "message": "Creating cover page..."})

    feature_lines = []
    for ch in chapters[:8]:
        feature_lines.append(ch["title"])
    feature_lines.append(f"{len(chapters)} Chapters  •  Premium Tables  •  Key Teaching Points")
    feature_lines.append("OSCE Pearls  •  MCQ Traps  •  High-Yield Facts")

    make_cover(
        builder,
        title=title,
        subtitle="Board-Review Quality  •  Comprehensive Academic Reference",
        feature_lines=feature_lines,
        edition="2025 Edition"
    )

    # ── TOC ──
    emit("stage", {"stage": "adding_toc", "message": "Building table of contents..."})
    make_toc(builder, chapters)

    # ── Chapters ──
    for chapter in chapters:
        emit("stage", {
            "stage": "adding_chapter",
            "message": f"Adding Chapter {chapter['number']}: {chapter['title']}"
        })

        ch_num = chapter["number"]
        ch_title = chapter["title"]
        ch_color = (color_index + ch_num - 1) % 24

        # Chapter 1: NO banner. Chapter 2+: colored banner.
        if ch_num > 1:
            builder.add_chapter(
                chapter_num=ch_num,
                title=ch_title,
                subtitle=chapter.get("subtitle", ""),
                content=[]
            )

        # Process sections
        for section in chapter["sections"]:
            sec_name = clean_title(section["name"])
            sec_content = section["content"]

            if sec_name:
                builder.add_section(sec_name)

            # Parse structured tables from content
            cleaned_content, tables = parse_structured_boxes_and_tables(sec_content)

            # Parse content into structured elements
            elements = parse_content_boxes(cleaned_content)

            # Add any tables that were extracted
            for table_title, headers, rows in tables:
                elements.append({
                    'type': 'table',
                    'data': {'title': table_title, 'headers': headers, 'rows': rows}
                })

            # Render elements
            for elem in elements:
                etype = elem['type']
                edata = elem['data']

                if etype == 'paragraph':
                    builder.add_paragraph(edata)

                elif etype == 'bullet':
                    builder.add_bullet(edata, level=1)

                elif etype == 'subsection':
                    builder.add_subsection(edata)

                elif etype == 'ktp':
                    builder.add_content_box("KTP", edata)

                elif etype == 'mcq':
                    builder.add_content_box("MCQ", edata)

                elif etype == 'important':
                    builder.add_content_box("IMPORTANT", edata)

                elif etype == 'osce':
                    builder.add_content_box("OSCE", edata)

                elif etype == 'question':
                    builder.add_question(
                        question=edata['question'],
                        choices=edata.get('choices', []),
                        answer=edata.get('answer', ''),
                        explanation=edata.get('explanation', ''),
                    )

                elif etype == 'table':
                    if isinstance(edata, dict) and 'headers' in edata:
                        builder.add_table_with_color(
                            edata['headers'], edata['rows'],
                            ch_color, caption=edata.get('title', '')
                        )

            builder.story.append(Spacer(1, 3 * mm))

    # ── Build PDF ──
    emit("stage", {"stage": "finalizing", "message": "Finalizing PDF..."})
    builder.build()

    emit("complete", {
        "output": output_path,
        "style": "clinical",
        "chapters": len(chapters),
        "title": title
    })


def parse_structured_boxes_and_tables(content: str) -> tuple:
    """Extract structured tables from content, return cleaned content + tables list."""
    tables = []
    lines = content.split('\n')
    output_lines = []
    i = 0

    while i < len(lines):
        stripped = lines[i].strip()
        table_match = re.match(r'^Table:\s*(.+)$', stripped)
        if table_match:
            table_title = table_match.group(1).strip()
            if i + 1 < len(lines):
                header_line = lines[i + 1].strip()
                if '|' in header_line:
                    headers = [h.strip() for h in header_line.split('|')]
                    rows = []
                    j = i + 2
                    while j < len(lines):
                        row_line = lines[j].strip()
                        if '|' in row_line and not re.match(r'^\s*\|?[\s\-:|]+\|?\s*$', row_line):
                            cells = [c.strip() for c in row_line.split('|')]
                            rows.append(cells)
                            j += 1
                        else:
                            break
                    if headers and rows:
                        tables.append((table_title, headers, rows))
                    i = j
                    continue
        output_lines.append(lines[i])
        i += 1

    return '\n'.join(output_lines), tables


def create_handbook_pdf(summary: dict, output_path: str,
                        author: str = "", color_index: int = 0):
    """Generate a handbook-style PDF with KTP/MCQ/IMPORTANT/OSCE boxes."""
    register_fonts()

    title = summary.get("title", "Clinical Handbook")
    content = summary.get("content", "")
    sections = summary.get("sections", [])

    emit("stage", {"stage": "building_handbook", "message": "Building handbook PDF..."})

    builder = PDFBuilder(
        output_path=output_path,
        title=title,
        color_index=color_index
    )

    make_cover(
        builder,
        title=title,
        subtitle="Clinical Handbook — Comprehensive Review",
        feature_lines=[
            "Key Teaching Points & MCQ Traps",
            "OSCE Pearls • High-Yield Facts • Clinical Tables",
        ],
        edition="2025 Edition"
    )

    for i, section in enumerate(sections):
        sec_name = clean_title(section.get("name", ""))
        sec_body = section.get("body", "")

        if sec_name:
            builder.add_section(sec_name)

        cleaned_content, tables = parse_structured_boxes_and_tables(sec_body)
        elements = parse_content_boxes(cleaned_content)

        for table_title, headers, rows in tables:
            elements.append({
                'type': 'table',
                'data': {'title': table_title, 'headers': headers, 'rows': rows}
            })

        for elem in elements:
            etype = elem['type']
            edata = elem['data']

            if etype == 'paragraph':
                builder.add_paragraph(edata)
            elif etype == 'bullet':
                builder.add_bullet(edata, level=1)
            elif etype == 'subsection':
                builder.add_subsection(edata)
            elif etype == 'ktp':
                builder.add_content_box("KTP", edata)
            elif etype == 'mcq':
                builder.add_content_box("MCQ", edata)
            elif etype == 'important':
                builder.add_content_box("IMPORTANT", edata)
            elif etype == 'osce':
                builder.add_content_box("OSCE", edata)
            elif etype == 'question':
                builder.add_question(
                    question=edata['question'],
                    choices=edata.get('choices', []),
                    answer=edata.get('answer', ''),
                    explanation=edata.get('explanation', ''),
                )
            elif etype == 'table':
                if isinstance(edata, dict) and 'headers' in edata:
                    builder.add_table(edata['headers'], edata['rows'], caption=edata.get('title', ''))

        builder.story.append(Spacer(1, 3 * mm))

    builder.build()

    emit("complete", {
        "output": output_path,
        "style": "clinical-handbook",
        "title": title
    })


# ═══════════════════════════════════════════════════════════════════════════
# PIPELINE
# ═══════════════════════════════════════════════════════════════════════════

def emit(event_type: str, data: dict):
    """Write a JSON-line event to stdout for the backend to stream."""
    payload = json.dumps({"type": event_type, **data})
    print(payload, flush=True)


def run_pipeline(files: list, style: str, output: str, chunk_size: int,
                 api_key: str, api_base: str, generate_audio: bool = False):
    """Run the full summary pipeline with clinical PDF generation."""
    total = len(files)
    all_text = []
    all_file_names = []

    # ── Stage 1: Extracting ──
    for chunk_start in range(0, total, chunk_size):
        chunk = files[chunk_start:chunk_start + chunk_size]
        emit("stage", {
            "stage": "extracting",
            "message": f"Processing files {chunk_start + 1}-{min(chunk_start + chunk_size, total)} of {total}",
        })
        for i, f in enumerate(chunk):
            fname = os.path.basename(f)
            all_file_names.append(fname)
            emit("file_progress", {"file": fname, "index": chunk_start + i, "total": total, "status": "extracting"})
            try:
                from summary_builder import extract_text, correct_text
                text = extract_text(f)
                all_text.append(text)
            except ImportError:
                with open(f, 'r', encoding='utf-8', errors='replace') as fh:
                    all_text.append(fh.read())
            emit("file_progress", {"file": fname, "index": chunk_start + i, "total": total, "status": "done"})

    # ── Stage 2: Correcting ──
    emit("stage", {"stage": "correcting", "message": "Correcting extracted text..."})
    combined = "\n\n".join(all_text)
    try:
        from summary_builder import correct_text
        corrected = correct_text(combined)
    except ImportError:
        corrected = combined
    emit("progress", {"percent": 15, "message": "Text correction complete"})

    # ── Stage 3: AI Explaining ──
    emit("stage", {"stage": "ai_explaining", "message": "AI explaining key concepts..."})
    try:
        from summary_builder import ai_explain, load_skill
        skill = load_skill("clinical-summary")
        skill_body = skill["body"] if skill else ""
        explained = ai_explain(corrected, api_key, api_base, style, skill_body)
    except ImportError:
        explained = corrected
    emit("progress", {"percent": 30, "message": "AI explanation complete"})

    # ── Stage 4: AI Enhancing ──
    emit("stage", {"stage": "ai_enhancing", "message": "AI enhancing content..."})
    try:
        from summary_builder import ai_enhance
        enhanced = ai_enhance(corrected, explained, api_key, api_base, style, skill_body)
    except ImportError:
        enhanced = explained
    emit("progress", {"percent": 50, "message": "AI enhancement complete"})

    # ── Stage 5: AI Writing PDF Content ──
    emit("stage", {"stage": "ai_writing_pdf", "message": "AI writing PDF content..."})
    try:
        from summary_builder import ai_write_pdf
        summary = ai_write_pdf(enhanced, api_key, api_base, style, skill_body)
    except ImportError:
        summary = {"content": enhanced, "sections": [], "title": "Clinical Summary"}
    emit("progress", {"percent": 70, "message": "AI PDF content written"})

    # ── Stage 6: Building Clinical PDF ──
    emit("stage", {"stage": "building_pdf", "message": "Building professional clinical PDF..."})
    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
    try:
        create_clinical_pdf(summary, output, author="")
        emit("progress", {"percent": 85, "message": "PDF generation complete"})
    except Exception as e:
        emit("warning", {"message": f"Clinical PDF generation failed: {e}. Falling back to summary builder."})
        try:
            from summary_builder import generate_pdf
            generate_pdf(summary, style, output)
            emit("progress", {"percent": 85, "message": "PDF generation complete (fallback)"})
        except Exception as e2:
            emit("error", {"message": f"PDF generation failed: {e2}"})
            raise

    # ── Stage 7: TTS Audio (optional) ──
    audio_path = None
    if generate_audio:
        emit("stage", {"stage": "generating_audio", "message": "Generating audio summary..."})
        audio_path = output.replace(".pdf", ".mp3")
        try:
            from summary_builder import generate_tts
            tts_success = generate_tts(summary["content"], audio_path)
            if tts_success:
                emit("progress", {"percent": 95, "message": "Audio summary generated"})
            else:
                audio_path = None
                emit("warning", {"message": "TTS audio generation failed"})
        except ImportError:
            emit("warning", {"message": "TTS not available"})

    # ── Complete ──
    emit("progress", {"percent": 100, "message": "Summary generation complete"})
    emit("complete", {
        "output": output,
        "style": style,
        "audio": audio_path,
        "title": summary.get("title", "Clinical Summary"),
        "sections_count": len(summary.get("sections", [])),
    })


# ═══════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Clinical PDF Generator")
    parser.add_argument("--files", required=True, help="Comma-separated file paths")
    parser.add_argument("--style", default="clinical", help="Style template name")
    parser.add_argument("--output", required=True, help="Output PDF path")
    parser.add_argument("--chunk-size", type=int, default=3, help="Files per chunk")
    parser.add_argument("--api-key", default="", help="OpenRouter API key")
    parser.add_argument("--api-base", default="https://openrouter.ai/api/v1", help="API base URL")
    parser.add_argument("--generate-audio", action="store_true", help="Generate TTS audio summary")
    parser.add_argument("--author", default="", help="Author name")
    parser.add_argument("--color-index", type=int, default=0, help="Starting color index")
    parser.add_argument("--mode", default="clinical",
                        choices=["clinical", "handbook", "pipeline"],
                        help="PDF style mode")
    args = parser.parse_args()

    if args.mode == "pipeline":
        files = [f.strip() for f in args.files.split(",") if f.strip()]
        if not files:
            emit("error", {"message": "No files provided"})
            sys.exit(1)
        run_pipeline(
            files, args.style, args.output, args.chunk_size,
            args.api_key, args.api_base,
            generate_audio=args.generate_audio,
        )
    elif args.mode == "handbook":
        if not os.path.exists(args.files):
            emit("error", {"message": f"Input file not found: {args.files}"})
            sys.exit(1)
        with open(args.files, "r") as f:
            summary = json.load(f)
        create_handbook_pdf(summary, args.output, args.author, args.color_index)
    else:
        if not os.path.exists(args.files):
            emit("error", {"message": f"Input file not found: {args.files}"})
            sys.exit(1)
        with open(args.files, "r") as f:
            summary = json.load(f)
        create_clinical_pdf(summary, args.output, args.author, args.color_index)


if __name__ == "__main__":
    main()
