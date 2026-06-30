export interface ContentBlock {
  type: string;
  content: string;
  level: number;
  items: string[];
  rows: string[][];
  headers: string[];
}

export class ContentParser {
  private lines: string[];
  private blocks: ContentBlock[];

  constructor(rawText: string) {
    this.lines = rawText.trim().split("\n");
    this.blocks = [];
  }

  parse(): ContentBlock[] {
    this.blocks = [];
    let i = 0;
    while (i < this.lines.length) {
      const line = this.lines[i];
      const stripped = line.trim();

      if (!stripped) {
        i++;
        continue;
      }

      if (this.isTableStart(i)) {
        const [block, nextIdx] = this.parseTable(i);
        this.blocks.push(block);
        i = nextIdx;
      } else if (this.isHeader(stripped)) {
        const level = this.headerLevel(stripped);
        this.blocks.push({
          type: "header",
          content: stripped.replace(/^#{1,6}\s*/, ""),
          level,
          items: [],
          rows: [],
          headers: [],
        });
        i++;
      } else if (this.isBullet(stripped)) {
        const items: string[] = [];
        while (i < this.lines.length && this.isBullet(this.lines[i].trim())) {
          items.push(this.cleanBullet(this.lines[i].trim()));
          i++;
        }
        this.blocks.push({
          type: "list",
          content: "",
          level: 0,
          items,
          rows: [],
          headers: [],
        });
      } else {
        const paragraphLines: string[] = [];
        while (
          i < this.lines.length &&
          this.lines[i].trim() &&
          !this.isHeader(this.lines[i].trim()) &&
          !this.isBullet(this.lines[i].trim()) &&
          !this.isTableStart(i)
        ) {
          paragraphLines.push(this.lines[i].trim());
          i++;
        }
        if (paragraphLines.length > 0) {
          this.blocks.push({
            type: "paragraph",
            content: paragraphLines.join(" "),
            level: 0,
            items: [],
            rows: [],
            headers: [],
          });
        }
      }
    }
    return this.blocks;
  }

  private isHeader(line: string): boolean {
    return /^#{1,6}\s/.test(line);
  }

  private headerLevel(line: string): number {
    const match = line.match(/^(#{1,6})\s/);
    return match ? match[1].length : 1;
  }

  private isBullet(line: string): boolean {
    return /^[-*•]\s/.test(line) || /^\d+[.)]\s/.test(line);
  }

  private cleanBullet(line: string): string {
    return line.replace(/^[-*•]\s|^\d+[.)]\s/, "").trim();
  }

  private isTableStart(index: number): boolean {
    if (index + 1 >= this.lines.length) return false;
    const line = this.lines[index].trim();
    const nextLine = this.lines[index + 1].trim();
    if (!line.includes("|")) return false;
    return /^[\s|:-]+$/.test(nextLine);
  }

  private parseTable(index: number): [ContentBlock, number] {
    const headerLine = this.lines[index].trim();
    const headers = headerLine
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    index += 2;
    const rows: string[][] = [];
    while (index < this.lines.length && this.lines[index].includes("|")) {
      const rowLine = this.lines[index].trim();
      if (!rowLine || /^[\s|:-]+$/.test(rowLine)) {
        index++;
        continue;
      }
      let cells = rowLine.split("|").map((c) => c.trim());
      if (cells.length > 0 && cells[0] === "") cells = cells.slice(1);
      if (cells.length > 0 && cells[cells.length - 1] === "") cells = cells.slice(0, -1);
      if (cells.length > 0) rows.push(cells);
      index++;
    }
    return [
      {
        type: "table",
        content: "",
        level: 0,
        items: [],
        rows,
        headers,
      },
      index,
    ];
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface StyleColors {
  headerBg: string;
  headerText: string;
  headerPadding: string;
  headerExtra: string;
  sectionText: string;
  sectionExtra: string;
  bodyText: string;
  numColor: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  tableEvenBg: string;
  tableOddBg: string;
  tableCellText: string;
  panelBorder: string;
  panelBg: string;
  panelTitleBg: string;
  panelTitleText: string;
  usePanels: boolean;
}

const STYLE_THEMES: Record<string, StyleColors> = {
  academic: {
    headerBg: "#1a3a5c",
    headerText: "#ffffff",
    headerPadding: "8px 16px",
    headerExtra: "display:block;",
    sectionText: "#ffffff",
    sectionExtra: "text-decoration:underline;font-weight:bold;",
    bodyText: "#e0e0e0",
    numColor: "#ffffff",
    tableHeaderBg: "#2563eb",
    tableHeaderText: "#ffffff",
    tableEvenBg: "transparent",
    tableOddBg: "transparent",
    tableCellText: "#e0e0e0",
    panelBorder: "transparent",
    panelBg: "transparent",
    panelTitleBg: "transparent",
    panelTitleText: "#e0e0e0",
    usePanels: false,
  },
  modern: {
    headerBg: "transparent",
    headerText: "#ff69b4",
    headerPadding: "4px 0",
    headerExtra: "font-weight:bold;",
    sectionText: "#00e5ff",
    sectionExtra: "font-weight:bold;",
    bodyText: "#e0e0e0",
    numColor: "#003344",
    tableHeaderBg: "#ff69b4",
    tableHeaderText: "#ffffff",
    tableEvenBg: "#262626",
    tableOddBg: "#3a3a3a",
    tableCellText: "#e0e0e0",
    panelBorder: "#00e5ff",
    panelBg: "rgba(0,229,255,0.04)",
    panelTitleBg: "transparent",
    panelTitleText: "#e0e0e0",
    usePanels: true,
  },
  minimal: {
    headerBg: "transparent",
    headerText: "#e0e0e0",
    headerPadding: "4px 0",
    headerExtra: "font-weight:bold;",
    sectionText: "#e0e0e0",
    sectionExtra: "font-style:italic;",
    bodyText: "#9a9a9a",
    numColor: "#9a9a9a",
    tableHeaderBg: "transparent",
    tableHeaderText: "#e0e0e0",
    tableEvenBg: "transparent",
    tableOddBg: "transparent",
    tableCellText: "#9a9a9a",
    panelBorder: "#333333",
    panelBg: "transparent",
    panelTitleBg: "transparent",
    panelTitleText: "#9a9a9a",
    usePanels: false,
  },
  clinical: {
    headerBg: "transparent",
    headerText: "#4fc3f7",
    headerPadding: "4px 0",
    headerExtra: "font-weight:bold;",
    bodyText: "#e0e0e0",
    sectionText: "#4fc3f7",
    sectionExtra: "font-weight:bold;",
    numColor: "#4fc3f7",
    tableHeaderBg: "#81d4fa",
    tableHeaderText: "#000000",
    tableEvenBg: "#262626",
    tableOddBg: "transparent",
    tableCellText: "#e0e0e0",
    panelBorder: "#81c784",
    panelBg: "rgba(129,199,132,0.06)",
    panelTitleBg: "#81c784",
    panelTitleText: "#000000",
    usePanels: true,
  },
};

export function renderToHtml(rawText: string, styleName: string): string {
  const parser = new ContentParser(rawText);
  const blocks = parser.parse();
  const theme = STYLE_THEMES[styleName] || STYLE_THEMES.modern;

  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "header":
        parts.push(renderHeader(block, theme));
        break;
      case "paragraph":
        parts.push(renderParagraph(block, theme));
        break;
      case "list":
        parts.push(renderList(block, theme));
        break;
      case "table":
        parts.push(renderTable(block, theme));
        break;
    }
  }

  return parts.join("\n");
}

function renderHeader(block: ContentBlock, theme: StyleColors): string {
  const text = escapeHtml(block.content);
  if (block.level === 1) {
    return `<div style="background:${theme.headerBg};color:${theme.headerText};padding:${theme.headerPadding};${theme.headerExtra}margin-bottom:4px;font-family:monospace;font-size:14px;font-weight:bold;">${text}</div>`;
  }
  return `<div style="color:${theme.sectionText};${theme.sectionExtra}margin-top:8px;margin-bottom:2px;font-family:monospace;font-size:13px;">${text}</div>`;
}

function renderParagraph(block: ContentBlock, theme: StyleColors): string {
  const text = escapeHtml(block.content);
  if (theme.usePanels) {
    return `<div style="border:1px solid ${theme.panelBorder};border-radius:4px;background:${theme.panelBg};padding:8px 12px;margin:4px 0;font-family:monospace;font-size:12px;color:${theme.bodyText};">${text}</div>`;
  }
  return `<div style="color:${theme.bodyText};font-family:monospace;font-size:12px;margin:2px 0;">${text}</div>`;
}

function renderList(block: ContentBlock, theme: StyleColors): string {
  const lines = block.items.map(
    (item, i) =>
      `<div style="font-family:monospace;font-size:12px;color:${theme.bodyText};"><span style="background:${theme.numColor === "#003344" ? "#00e5ff" : "transparent"};color:${theme.numColor === "#003344" ? "#003344" : theme.numColor};${theme.numColor === "#003344" ? "padding:1px 4px;border-radius:2px;" : ""}font-weight:bold;">${i + 1}.</span> ${escapeHtml(item)}</div>`
  );

  if (theme.usePanels) {
    return `<div style="border:1px solid ${theme.panelBorder};border-radius:4px;background:${theme.panelBg};padding:8px 12px;margin:4px 0;">${lines.join("\n")}</div>`;
  }
  return lines.join("\n");
}

function renderTable(block: ContentBlock, theme: StyleColors): string {
  const headerCells = block.headers
    .map((h) => `<th style="background:${theme.tableHeaderBg};color:${theme.tableHeaderText};padding:4px 8px;text-align:left;font-family:monospace;font-size:11px;font-weight:bold;">${escapeHtml(h)}</th>`)
    .join("");

  const rows = block.rows
    .map((row, ri) => {
      const bg = ri % 2 === 0 ? theme.tableEvenBg : theme.tableOddBg;
      const cells = row
        .map(
          (cell) =>
            `<td style="background:${bg};color:${theme.tableCellText};padding:4px 8px;font-family:monospace;font-size:11px;">${escapeHtml(cell)}</td>`
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table style="border-collapse:collapse;width:100%;margin:4px 0;"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
}
