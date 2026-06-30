import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { renderToHtml } from "../../lib/tui-engine";
import type { SummaryStyle } from "../../lib/api";

interface TerminalViewProps {
  events: Array<{ type: string; data: Record<string, unknown>; ts: number }>;
  style: SummaryStyle;
  isProcessing: boolean;
}

const STYLE_MAP: Record<SummaryStyle, string> = {
  academic: "academic",
  modern: "modern",
  minimal: "minimal",
  clinical: "clinical",
  cornell: "academic",
  "smart-briefing": "modern",
};

function formatEventsToText(
  events: Array<{ type: string; data: Record<string, unknown>; ts: number }>
): string {
  const lines: string[] = [];

  for (const evt of events) {
    const type = evt.type;
    const d = evt.data;

    switch (type) {
      case "stage": {
        const stage = (d.stage as string) || "";
        const message = (d.message as string) || "";
        lines.push(`[stage] ${stage} — ${message}`);
        break;
      }
      case "file_progress": {
        const file = (d.file as string) || "";
        const status = (d.status as string) || "";
        if (status === "done") {
          lines.push(`[file] ✓ ${file}`);
        } else {
          lines.push(`[file] ${file} — ${status}...`);
        }
        break;
      }
      case "progress": {
        const percent = (d.percent as number) || 0;
        const message = (d.message as string) || "";
        lines.push(`[progress] ${percent}% — ${message}`);
        break;
      }
      case "complete": {
        const output = (d.output as string) || "";
        lines.push(`[complete] ✓ Output: ${output}`);
        break;
      }
      case "error": {
        const message = (d.message as string) || "Unknown error";
        lines.push(`[error] ✗ ${message}`);
        break;
      }
      case "warning": {
        const message = (d.message as string) || "";
        lines.push(`[warn] ${message}`);
        break;
      }
      case "file_error": {
        const file = (d.file as string) || "";
        const error = (d.error as string) || "Unknown error";
        lines.push(`[file] ✗ ${file} — ${error}`);
        break;
      }
      case "qa_answer": {
        const question = (d.question as string) || "";
        const answer = (d.answer as string) || "";
        lines.push(`[qa] Q: ${question}`);
        lines.push(`[qa] A: ${answer}`);
        break;
      }
      default: {
        lines.push(`[${type}] ${JSON.stringify(d)}`);
      }
    }
  }

  return lines.join("\n");
}

export default function TerminalView({
  events,
  style,
  isProcessing,
}: TerminalViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const textBuffer = useMemo(() => formatEventsToText(events), [events]);

  const html = useMemo(() => {
    if (!textBuffer) return "";
    const tuiStyle = STYLE_MAP[style] || "modern";
    return renderToHtml(textBuffer, tuiStyle);
  }, [textBuffer, style]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [html]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-6 rounded-xl overflow-hidden"
      style={{
        background: "#0d1117",
        border: "1px solid #30363d",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
      }}
    >
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{
          background: "#161b22",
          borderBottom: "1px solid #30363d",
        }}
      >
        <div className="flex gap-1.5">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#ff5f57" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#febc2e" }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: "#28c840" }}
          />
        </div>
        <span
          className="text-xs ml-2"
          style={{ color: "#8b949e" }}
        >
          summary-generation-terminal
        </span>
        {isProcessing && (
          <motion.span
            className="text-xs ml-auto"
            style={{ color: "#58a6ff" }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ● running
          </motion.span>
        )}
        {!isProcessing && events.length > 0 && (
          <span
            className="text-xs ml-auto"
            style={{ color: "#3fb950" }}
          >
            ✓ complete
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="p-4 overflow-y-auto"
        style={{
          maxHeight: "320px",
          minHeight: "120px",
          fontSize: "12px",
          lineHeight: "1.6",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {isProcessing && (
        <div className="px-4 pb-3">
          <motion.span
            className="inline-block w-2 h-4"
            style={{ background: "#58a6ff" }}
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}
    </motion.div>
  );
}
