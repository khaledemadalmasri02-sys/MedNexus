from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List

from rich.console import Console, Group
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table
from rich.text import Text

from .parser import ContentBlock, ContentParser


class BaseStyle(ABC):
    name: str = "base"

    def __init__(self, console: Console | None = None):
        self.console = console or Console()

    def render(self, raw_text: str) -> Group:
        parser = ContentParser(raw_text)
        blocks = parser.parse()
        rendered: List = []
        for block in blocks:
            method = getattr(self, f"_render_{block.type}", self._render_paragraph)
            result = method(block)
            if isinstance(result, list):
                rendered.extend(result)
            else:
                rendered.append(result)
        return Group(*rendered)

    @abstractmethod
    def _render_header(self, block: ContentBlock) -> Text | Panel:
        ...

    @abstractmethod
    def _render_paragraph(self, block: ContentBlock) -> Text:
        ...

    @abstractmethod
    def _render_list(self, block: ContentBlock) -> Text | Panel:
        ...

    @abstractmethod
    def _render_table(self, block: ContentBlock) -> Table:
        ...
