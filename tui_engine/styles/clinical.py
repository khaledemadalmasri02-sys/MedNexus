from __future__ import annotations

from rich.console import Group
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

from ..engine import BaseStyle
from ..parser import ContentBlock


class ClinicalStyle(BaseStyle):
    name = "clinical"

    def _render_header(self, block: ContentBlock) -> Text:
        return Text(block.content, style="bold #1A5276")

    def _render_paragraph(self, block: ContentBlock) -> Text:
        return Text(block.content, style="grey50")

    def _render_list(self, block: ContentBlock) -> Group:
        lines = []
        for item in block.items:
            lines.append(Text(f"  • {item}", style="grey50"))
        return Group(*lines)

    def _render_table(self, block: ContentBlock) -> Table:
        table = Table(
            box=None,
            show_edge=True,
            pad_edge=False,
            show_header=True,
            header_style="bold white on #1A5276",
            row_styles=["on grey23", ""],
            expand=True,
        )
        for header in block.headers:
            table.add_column(header, style="grey50", no_wrap=False)
        for row in block.rows:
            while len(row) < len(block.headers):
                row.append("")
            table.add_row(*row[: len(block.headers)])
        return table
