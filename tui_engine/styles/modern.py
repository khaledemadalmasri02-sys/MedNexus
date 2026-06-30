from __future__ import annotations

from rich.console import Group
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

from ..engine import BaseStyle
from ..parser import ContentBlock


class ModernStyle(BaseStyle):
    name = "modern"

    def _render_header(self, block: ContentBlock) -> Text:
        return Text(block.content, style="bold bright_magenta")

    def _render_paragraph(self, block: ContentBlock) -> Panel:
        return Panel(
            Text(block.content, style="white"),
            border_style="cyan",
            padding=(1, 2),
        )

    def _render_list(self, block: ContentBlock) -> Panel:
        lines = []
        for i, item in enumerate(block.items, 1):
            num = Text(f"  {i}. ", style="bold black on light_cyan")
            body = Text(item, style="bright_yellow")
            lines.append(num + body)
        content = Text("\n").join(lines)
        return Panel(
            content,
            border_style="cyan",
            padding=(1, 2),
        )

    def _render_table(self, block: ContentBlock) -> Table:
        table = Table(
            box=None,
            show_edge=True,
            pad_edge=False,
            show_header=True,
            header_style="bold white on magenta",
            row_styles=["on grey15", "on grey23"],
            expand=True,
        )
        for header in block.headers:
            table.add_column(header, style="white", no_wrap=False)
        for row in block.rows:
            while len(row) < len(block.headers):
                row.append("")
            table.add_row(*row[: len(block.headers)])
        return table
