from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ContentBlock:
    type: str
    content: str
    level: int = 0
    items: List[str] = field(default_factory=list)
    rows: List[List[str]] = field(default_factory=list)
    headers: List[str] = field(default_factory=list)
    box_type: str = ""
    choices: List[str] = field(default_factory=list)
    answer: str = ""
    explanation: str = ""


class ContentParser:
    BOX_HEADERS = {
        "KEY TEACHING POINTS": "ktp",
        "MCQ TRAPS": "mcq",
        "IMPORTANT": "important",
        "OSCE PEARLS": "osce",
    }

    def __init__(self, raw_text: str):
        self.lines = raw_text.strip().splitlines()
        self.blocks: List[ContentBlock] = []

    def parse(self) -> List[ContentBlock]:
        self.blocks = []
        i = 0
        while i < len(self.lines):
            line = self.lines[i]
            stripped = line.strip()

            if not stripped:
                i += 1
                continue

            if self._is_table_start(i):
                block, i = self._parse_table(i)
                self.blocks.append(block)
            elif self._is_header(stripped):
                level = self._header_level(stripped)
                self.blocks.append(ContentBlock(
                    type="header",
                    content=stripped.lstrip("#").strip(),
                    level=level,
                ))
                i += 1
            elif self._is_box_header(stripped):
                box_type = self._box_type(stripped)
                items = []
                i += 1
                while i < len(self.lines) and self._is_bullet(self.lines[i].strip()):
                    items.append(self._clean_bullet(self.lines[i].strip()))
                    i += 1
                self.blocks.append(ContentBlock(
                    type="box_list",
                    content=stripped,
                    items=items,
                    box_type=box_type,
                ))
            elif self._is_question_start(stripped):
                question_text = stripped
                choices = []
                answer = ""
                explanation = ""
                i += 1
                while i < len(self.lines):
                    q_line = self.lines[i].strip()
                    if re.match(r"^[A-Da-d]\)", q_line):
                        choices.append(re.sub(r"^[A-Da-d]\)\s*", "", q_line).strip())
                        i += 1
                    elif q_line.upper().startswith("ANSWER:"):
                        answer = re.sub(r"^ANSWER:\s*", "", q_line, flags=re.IGNORECASE).strip()
                        i += 1
                    elif q_line.upper().startswith("EXPLANATION:"):
                        explanation = re.sub(r"^EXPLANATION:\s*", "", q_line, flags=re.IGNORECASE).strip()
                        i += 1
                    elif not q_line:
                        i += 1
                        break
                    else:
                        break
                self.blocks.append(ContentBlock(
                    type="question",
                    content=question_text,
                    choices=choices,
                    answer=answer,
                    explanation=explanation,
                ))
            elif self._is_bullet(stripped):
                items = []
                while i < len(self.lines) and self._is_bullet(self.lines[i].strip()):
                    items.append(self._clean_bullet(self.lines[i].strip()))
                    i += 1
                self.blocks.append(ContentBlock(
                    type="list",
                    content="",
                    items=items,
                ))
            else:
                paragraph_lines = []
                while (
                    i < len(self.lines)
                    and self.lines[i].strip()
                    and not self._is_header(self.lines[i].strip())
                    and not self._is_bullet(self.lines[i].strip())
                    and not self._is_table_start(i)
                    and not self._is_box_header(self.lines[i].strip())
                    and not self._is_question_start(self.lines[i].strip())
                ):
                    paragraph_lines.append(self.lines[i].strip())
                    i += 1
                if paragraph_lines:
                    self.blocks.append(ContentBlock(
                        type="paragraph",
                        content=" ".join(paragraph_lines),
                    ))

        return self.blocks

    def _is_header(self, line: str) -> bool:
        return bool(re.match(r"^#{1,6}\s", line))

    def _header_level(self, line: str) -> int:
        match = re.match(r"^(#{1,6})\s", line)
        return len(match.group(1)) if match else 1

    def _is_bullet(self, line: str) -> bool:
        return bool(re.match(r"^[-*•]\s", line) or re.match(r"^\d+[.)]\s", line))

    def _clean_bullet(self, line: str) -> str:
        return re.sub(r"^[-*•]\s|^\d+[.)]\s", "", line).strip()

    def _is_table_start(self, index: int) -> bool:
        if index + 1 >= len(self.lines):
            return False
        line = self.lines[index].strip()
        next_line = self.lines[index + 1].strip()
        if "|" not in line:
            return False
        return bool(re.match(r"^[\s|:-]+$", next_line))

    def _parse_table(self, index: int) -> tuple[ContentBlock, int]:
        header_line = self.lines[index].strip()
        headers = [c.strip() for c in header_line.split("|") if c.strip()]
        index += 2
        rows = []
        while index < len(self.lines) and "|" in self.lines[index]:
            row_line = self.lines[index].strip()
            if not row_line or re.match(r"^[\s|:-]+$", row_line):
                index += 1
                continue
            cells = [c.strip() for c in row_line.split("|")]
            cells = cells[1:-1] if cells and not cells[0] else cells
            if cells:
                rows.append(cells)
            index += 1
        return ContentBlock(
            type="table",
            content="",
            headers=headers,
            rows=rows,
        ), index

    def _is_box_header(self, line: str) -> bool:
        upper = line.upper().rstrip(":")
        return upper in self.BOX_HEADERS

    def _box_type(self, line: str) -> str:
        upper = line.upper().rstrip(":")
        return self.BOX_HEADERS.get(upper, "unknown")

    def _is_question_start(self, line: str) -> bool:
        return bool(re.match(r"^Q:\s*", line, re.IGNORECASE))
