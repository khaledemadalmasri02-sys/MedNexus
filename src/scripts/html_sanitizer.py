#!/usr/bin/env python3
"""
HTML / XML Sanitizer for PDF Generation Pipeline
=================================================

Corrects malformed markup in two contexts:

1. **Full HTML documents** — produced by _create_styled_html() and passed to
   wkhtmltopdf / pandoc.  Handles unclosed/mismatched heading, paragraph,
   bold, italic, list, and structural tags.

2. **ReportLab XML fragments** — fed to reportlab.platypus.Paragraph().
   These use a tiny XML subset (<b>, <i>, <u>, <sup>, <sub>, <br/>,
   <font>, <nobr>, <a>, <link>, <para>).  The existing sanitize_reportlab_xml()
   in pdf_style.py delegates to the shared helpers here so both pipelines
   benefit from the same correctness guarantees.

Public API
----------
    sanitize_html_for_shell(text) -> str
        Fix a full-HTML string for wkhtmltopdf / pandoc consumption.

    sanitize_reportlab_xml(text) -> str
        Fix a ReportLab XML fragment so Paragraph() won't raise.

Both functions are idempotent and safe to call multiple times.
"""

from __future__ import annotations

import re
from html.parser import HTMLParser


# ═══════════════════════════════════════════════════════════════════════════
# REPORTLAB XML TAG SET
# ═══════════════════════════════════════════════════════════════════════════

REPORTLAB_INLINE_TAGS: frozenset[str] = frozenset({
    "b", "i", "u", "sup", "sub", "strike", "span",
    "font", "nobr", "super", "a", "link", "anchor",
    "para", "br", "img",
})

REPORTLAB_SELF_CLOSING: frozenset[str] = frozenset({
    "br", "img",
})

REPORTLAB_BLOCK_TAGS: frozenset[str] = frozenset({
    "para", "blockquote", "ul", "ol", "li", "code", "pre",
})


# ═══════════════════════════════════════════════════════════════════════════
# LOW-LEVEL TOKENISER  (shared by both sanitizers)
# ═══════════════════════════════════════════════════════════════════════════

_TAG_RE = re.compile(
    r"(</?[a-zA-Z][a-zA-Z0-9_-]*(?:\s[^>]*)?/?>)"
    r"|"
    r"(&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;)"
)


def _tokenize(text: str) -> list[tuple[str, str]]:
    """
    Split *text* into ``("tag", "<html>")`` / ``("entity", "&amp;")`` /
    ``("text", "hello"``) triples.
    """
    tokens: list[tuple[str, str]] = []
    pos = 0
    for m in _TAG_RE.finditer(text):
        if m.start() > pos:
            tokens.append(("text", text[pos:m.start()]))
        chunk = m.group(0)
        if chunk.startswith("&"):
            tokens.append(("entity", chunk))
        else:
            tokens.append(("tag", chunk))
        pos = m.end()
    if pos < len(text):
        tokens.append(("text", text[pos:]))
    return tokens


# ═══════════════════════════════════════════════════════════════════════════
# SHARED: fix the most common AI-generated colon-closing pattern
# ═══════════════════════════════════════════════════════════════════════════

_COLON_CLOSE_RE = re.compile(
    r"<(b|i|u|sup|sub|strike|font|nobr|para|blockquote|code|pre|span|link|a|anchor|ul|ol|li)(\s[^>]*)?>"
    r"([^<]*?)"
    r":\1>",
    re.IGNORECASE,
)


def fix_colon_closing_tags(text: str) -> str:
    """
    Replace AI-generated colon-style closing tags with proper XML closing tags.

    Pattern: ``<b>text:b>``  →  ``<b>text</b>``
    Works for every tag in REPORTLAB_INLINE_TAGS, REPORTLAB_BLOCK_TAGS, and
    _HTML_FLOW_TAGS so both the ReportLab and full-HTML paths benefit.
    """
    tag_list = "|".join(
        sorted(
            REPORTLAB_INLINE_TAGS | REPORTLAB_BLOCK_TAGS | _HTML_FLOW_TAGS
            - REPORTLAB_SELF_CLOSING - _HTML_SELF_CLOSING,
            key=len, reverse=True,
        )
    )
    pattern = (
        r"<(" + tag_list + r")(\s[^>]*)?>"
        r"([^<]*?)"
        r":\1>"
    )
    return re.sub(pattern, r"<\1\2>\3</\1>", text, flags=re.IGNORECASE)


# ═══════════════════════════════════════════════════════════════════════════
# REPORTLAB XML SANITIZER
# ═══════════════════════════════════════════════════════════════════════════

class _ReportLabXMLFixer(HTMLParser):
    """
    Walk the token stream produced by _tokenize() and:

    1. Fix colon-closing tags       ``<b>text:b>`` → ``<b>text</b>``
    2. Escape bare ``<`` / ``>`` that are not part of ReportLab tags.
    3. Close unclosed inline tags.
    4. Strip stray closing tags with no opener.
    5. Convert common HTML tags to ReportLab equivalents:
          <strong> → <b>   <em> → <i>
    6. Remove tags that ReportLab does not understand at all.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self._output: list[str] = []
        self._stack: list[str] = []          # open tag names (lowercased)

    # -- helpers ----------------------------------------------------------

    def _is_reportlab_tag(self, name: str) -> bool:
        return name.lower() in REPORTLAB_INLINE_TAGS | REPORTLAB_BLOCK_TAGS

    def _is_self_closing(self, name: str) -> bool:
        return name.lower() in REPORTLAB_SELF_CLOSING

    def _emit_open(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        lowered = tag.lower()
        # Convert semantic HTML → ReportLab equivalents
        if lowered == "strong":
            lowered = "b"
        elif lowered == "em":
            lowered = "i"

        if not self._is_reportlab_tag(lowered):
            # Unknown tag — silently strip it but keep the content
            return

        if lowered == "br":
            self._output.append("<br/>")
            return

        attr_str = self._attrs_to_str(lowered, attrs)
        self._output.append(f"<{lowered}{attr_str}>")
        if not self._is_self_closing(lowered):
            self._stack.append(lowered)

    def _emit_close(self, tag: str) -> None:
        lowered = tag.lower()
        if lowered == "strong":
            lowered = "b"
        elif lowered == "em":
            lowered = "i"

        if not self._is_reportlab_tag(lowered):
            return

        # If the tag is on the stack, close it (and everything above it)
        if lowered in self._stack:
            while self._stack and self._stack[-1] != lowered:
                self._output.append(f"</{self._stack.pop()}>")
            if self._stack:
                self._output.append(f"</{self._stack.pop()}>")
        # else stray closing tag — silently drop it

    def _attrs_to_str(self, tag: str, attrs: list[tuple[str, str | None]]) -> str:
        allowed = _ALLOWED_ATTRS.get(tag, frozenset())
        if not allowed or not attrs:
            return ""
        parts: list[str] = []
        for k, v in attrs:
            if k.lower() in allowed:
                if v is None:
                    parts.append(k)
                else:
                    v_escaped = v.replace("&", "&amp;").replace('"', "&quot;")
                    parts.append(f'{k}="{v_escaped}"')
        return (" " + " ".join(parts)) if parts else ""

    def fix(self, text: str) -> str:
        text = fix_colon_closing_tags(text)
        try:
            self.feed(text)
            self.close()
        except Exception:
            return _regex_fallback_reportlab(text)
        while self._stack:
            self._output.append(f"</{self._stack.pop()}>")
        return "".join(self._output)

    # -- HTMLParser callbacks -------------------------------------------------

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._emit_open(tag, attrs)

    def handle_endtag(self, tag: str) -> None:
        self._emit_close(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        lowered = tag.lower()
        if lowered == "br":
            self._output.append("<br/>")

    def handle_data(self, data: str) -> None:
        self._output.append(
            data.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        )

    def handle_entityref(self, name: str) -> None:
        self._output.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self._output.append(f"&#{name};")


# Map of allowed attributes per tag (ReportLab subset)
_ALLOWED_ATTRS: dict[str, frozenset[str]] = {
    "font": frozenset({"name", "size", "color", "leading"}),
    "a": frozenset({"href", "color"}),
    "link": frozenset({"href", "color"}),
    "anchor": frozenset({"name"}),
    "img": frozenset({"src", "width", "height"}),
    "para": frozenset({"style", "textColor", "bulletColor", "borderColor"}),
    "span": frozenset({"backColor", "fontSize", "textColor"}),
}


def _regex_fallback_reportlab(text: str) -> str:
    """Last-resort regex-only fixer when the HTML parser raises."""
    # Fix colon-closing
    text = fix_colon_closing_tags(text)

    # Escape bare < and > that aren't part of known ReportLab tags
    text = _escape_unknown_angle_brackets(text)

    # Balance known tags
    for tag in sorted(REPORTLAB_INLINE_TAGS - REPORTLAB_SELF_CLOSING, key=len, reverse=True):
        opens = len(re.findall(rf"<{tag}(\s[^>]*)?>", text, re.IGNORECASE))
        closes = len(re.findall(rf"</{tag}>", text, re.IGNORECASE))
        if opens > closes:
            text += f"</{tag}>" * (opens - closes)
        elif closes > opens:
            excess = closes - opens
            for _ in range(excess):
                text = re.sub(rf"</{tag}>", "", text, count=1, flags=re.IGNORECASE)
    return text


def _escape_unknown_angle_brackets(text: str) -> str:
    """
    Replace any ``<`` / ``>`` that is NOT part of a known ReportLab tag
    with ``&lt;`` / ``&gt;`` so ReportLab's XML parser doesn't choke.
    """
    result: list[str] = []
    for kind, chunk in _tokenize(text):
        if kind == "tag":
            # Check if the tag name is in our allow-list
            name_m = re.match(r"</?([a-zA-Z][a-zA-Z0-9_-]*)", chunk)
            if name_m:
                tag_name = name_m.group(1).lower()
                if tag_name in REPORTLAB_INLINE_TAGS | REPORTLAB_BLOCK_TAGS:
                    result.append(chunk)
                else:
                    result.append(chunk.replace("<", "&lt;").replace(">", "&gt;"))
            else:
                result.append(chunk.replace("<", "&lt;").replace(">", "&gt;"))
        elif kind == "entity":
            result.append(chunk)
        else:
            result.append(chunk.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    return "".join(result)


def sanitize_reportlab_xml(text: str) -> str:
    """
    Correct a ReportLab XML fragment so it is safe to pass to
    ``reportlab.platypus.Paragraph()``.

    Fixes applied (in order):
      1. Colon-closing tags      ``<b>text:b>`` → ``<b>text</b>``
      2. ``<strong>`` → ``<b>``,  ``<em>`` → ``<i>``
      3. Unknown tags are stripped of their angle brackets (content kept).
      4. Unclosed tags are auto-closed.
      5. Stray closing tags are stripped.
      6. Bare ``<`` / ``>`` are escaped to ``&lt;`` / ``&gt;``.

    Safe to call multiple times (idempotent).
    """
    if not text:
        return text
    fixer = _ReportLabXMLFixer()
    return fixer.fix(text)


# ═══════════════════════════════════════════════════════════════════════════
# FULL-HTML SANITIZER  (for the wkhtmltopdf / pandoc shell path)
# ═══════════════════════════════════════════════════════════════════════════

# Tags that the markdown-to-html regex conversion in _create_styled_html
# can produce, plus structural tags we wrap around them.
_HTML_FLOW_TAGS: frozenset[str] = frozenset({
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s", "strike",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "sub", "sup",
    "a", "img",
    "span", "div",
    "table", "thead", "tbody", "tr", "th", "td",
})

_HTML_SELF_CLOSING: frozenset[str] = frozenset({"br", "hr", "img"})


class _HTMLFixer(HTMLParser):
    """
    A lenient HTML fixer that:
    - Corrects nesting (auto-closes overlapping tags).
    - Closes unclosed tags at end-of-string.
    - Strips stray closing tags.
    - Escapes bare < / > for unknown tag names (safety net).
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self._out: list[str] = []
        self._stack: list[tuple[str, str]] = []   # (lowered_tag, original_tag_str)

    # -- HTMLParser callbacks ---------------------------------------------

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        lowered = tag.lower()
        if lowered not in _HTML_FLOW_TAGS:
            return
        self._out.append(self._rebuild_tag(lowered, attrs, close=False))
        if lowered not in _HTML_SELF_CLOSING:
            self._stack.append((lowered, self._rebuild_tag(lowered, attrs, close=False)))

    def handle_endtag(self, tag: str) -> None:
        lowered = tag.lower()
        if lowered not in _HTML_FLOW_TAGS:
            return
        if lowered in _HTML_SELF_CLOSING:
            return
        if not self._stack:
            return
        if lowered not in {t for t, _ in self._stack}:
            return
        while self._stack and self._stack[-1][0] != lowered:
            t, orig = self._stack.pop()
            self._out.append(f"</{t}>")
        if self._stack:
            self._stack.pop()
            self._out.append(f"</{lowered}>")

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        lowered = tag.lower()
        attr_str = self._attrs_str(lowered, attrs)
        self._out.append(f"<{lowered}{attr_str}/>")

    def handle_data(self, data: str) -> None:
        self._out.append(
            data.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        )

    def handle_entityref(self, name: str) -> None:
        self._out.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self._out.append(f"&#{name};")

    def handle_comment(self, data: str) -> None:
        self._out.append(f"<!--{data}-->")

    # -- helpers ----------------------------------------------------------

    def _attrs_str(self, tag: str, attrs: list[tuple[str, str | None]]) -> str:
        parts: list[str] = []
        for k, v in attrs:
            if v is None:
                parts.append(f" {k}")
            else:
                v2 = v.replace("&", "&amp;").replace('"', "&quot;")
                parts.append(f' {k}="{v2}"')
        return "".join(parts)

    def _rebuild_tag(self, tag: str, attrs: list[tuple[str, str | None]], close: bool = False) -> str:
        attr_str = self._attrs_str(tag, attrs)
        return f"</{tag}>{attr_str}>" if close else f"<{tag}{attr_str}>"

    def fix(self, text: str) -> str:
        # Pre-fix colon-closing BEFORE parsing
        text = fix_colon_closing_tags(text)

        try:
            self.feed(text)
            self.close()
        except Exception:
            return _regex_fallback_html(text)

        while self._stack:
            t, _ = self._stack.pop()
            self._out.append(f"</{t}>")

        return "".join(self._out)


def _regex_fallback_html(text: str) -> str:
    """Fallback when the HTML parser itself raises."""
    text = fix_colon_closing_tags(text)
    # Close known flow tags left open
    for tag in ["p", "strong", "b", "em", "i", "u", "sub", "sup",
                "li", "ul", "ol", "blockquote", "pre", "code",
                "h1", "h2", "h3", "h4", "h5", "h6"]:
        opens = len(re.findall(rf"<{tag}(\s[^>]*)?>", text, re.IGNORECASE))
        closes = len(re.findall(rf"</{tag}>", text, re.IGNORECASE))
        if opens > closes:
            text += f"</{tag}>" * (opens - closes)
    return text


def sanitize_html_for_shell(text: str) -> str:
    """
    Correct a full HTML string so it is well-formed enough for
    wkhtmltopdf / pandoc.

    In addition to everything ``sanitize_reportlab_xml`` handles,
    this also manages block-level nesting (headings, paragraphs, lists).

    Idempotent.
    """
    if not text:
        return text
    fixer = _HTMLFixer()
    return fixer.fix(text)
