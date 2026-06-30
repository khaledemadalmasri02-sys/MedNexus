from __future__ import annotations

from rich.console import Group
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

from ..engine import BaseStyle
from ..parser import ContentBlock


class AcademicStyle(BaseStyle):
    name = "academic"

    def _render_header(self, block: ContentBlock) -> Text | Rule:
        if block.level == 1:
            return Text(block.content, style="bold reverse deep_sky_blue4")
        return Text(block.content, style="bold underline white")

    def _render_paragraph(self, block: ContentBlock) -> Text:
        return Text(block.content, style="white")

    def _render_list(self, block: ContentBlock) -> Text:
        lines = []
        for i, item in enumerate(block.items, 1):
            num = Text(f"{i}. ", style="bold bright_white")
            body = Text(item, style="white")
            lines.append(num + body)
        return Text("\n").join(lines)

    def _render_table(self, block: ContentBlock) -> Table:
        table = Table(
            box=None,
            show_edge=False,
            pad_edge=False,
            show_header=True,
            header_style="bold white on blue",
            row_styles=None,
            expand=True,
        )
        for header in block.headers:
            table.add_column(header, style="white", no_wrap=False)
        for row in block.rows:
            while len(row) < len(block.headers):
                row.append("")
            table.add_row(*row[: len(block.headers)])
        return table
