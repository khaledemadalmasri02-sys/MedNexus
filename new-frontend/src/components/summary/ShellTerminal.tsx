import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ChevronRight, X, Maximize2, Minimize2 } from "lucide-react";

interface ShellTerminalProps {
  jobId: string;
  outputDir?: string;
}

interface TermLine {
  type: "input" | "output" | "error" | "info";
  text: string;
  ts: number;
}

export default function ShellTerminal({ jobId, outputDir }: ShellTerminalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<TermLine[]>([
    { type: "info", text: "OpenMinis Shell — Built-in Linux shell for PDF manipulation", ts: Date.now() },
    { type: "info", text: "Type 'help' for available commands. All commands run in a sandboxed environment.", ts: Date.now() },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  const handleCommand = async () => {
    if (!input.trim() || isRunning) return;

    const cmd = input.trim();
    setInput("");
    setHistory((prev) => [...prev, { type: "input", text: `$ ${cmd}`, ts: Date.now() }]);
    setIsRunning(true);

    // Built-in help
    if (cmd === "help") {
      setHistory((prev) => [
        ...prev,
        { type: "output", text: `Available shell commands:
  pdfinfo <file>      — Get PDF metadata (pages, size, fonts)
  pdftotext <file>    — Extract all text from PDF
  compress <file>     — Compress PDF (ghostscript)
  split <file>        — Split PDF into individual pages
  merge <f1> <f2>     — Merge two PDFs
  count <file>        — Count pages in PDF
  fonts <file>        — List embedded fonts
  ls [dir]            — List files in output directory
  cat <file>          — Show file contents
  grep <pattern> <f>  — Search for pattern in file
  wc <file>           — Word/line/byte count
  head <file> [n]     — First n lines (default 10)
  tail <file> [n]     — Last n lines (default 10)
  clear               — Clear terminal history

Allowed: pdftotext, pdfinfo, pdfunite, pdftk, gs, qpdf, pdfseparate,
  pdfjam, enscript, ps2pdf, convert, img2pdf, exiftool, pdffonts,
  pdfimages, mutool, cat, grep, sed, awk, head, tail, wc, find, ls,
  cp, mv, mkdir, rm, chmod, echo, xargs, wc, sort, uniq, tr, cut,
  file, stat, mktemp, date, basename, dirname

Blocked: rm -rf /, sudo, dd, mkfs, chmod -R 777, chown -R`, ts: Date.now() },
      ]);
      setIsRunning(false);
      return;
    }

    if (cmd === "clear") {
      setHistory([]);
      setIsRunning(false);
      return;
    }

    if (cmd === "ls") {
      setHistory((prev) => [...prev, { type: "info", text: "Use: ls /path/to/directory", ts: Date.now() }]);
      setIsRunning(false);
      return;
    }

    // Execute via backend
    try {
      const response = await fetch("/api/summary/shell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobId,
          command: cmd,
          workingDir: outputDir || undefined,
        }),
      });
      const data = await response.json();

      if (data.stdout) {
        setHistory((prev) => [...prev, { type: "output", text: data.stdout, ts: Date.now() }]);
      }
      if (data.stderr) {
        setHistory((prev) => [...prev, { type: "error", text: data.stderr, ts: Date.now() }]);
      }
      if (!data.success && data.exit_code !== 0 && !data.stderr) {
        setHistory((prev) => [...prev, { type: "error", text: `Exit code: ${data.exit_code}`, ts: Date.now() }]);
      }
      if (data.success && !data.stdout && !data.stderr) {
        setHistory((prev) => [...prev, { type: "output", text: "(command completed successfully)", ts: Date.now() }]);
      }
    } catch (err) {
      setHistory((prev) => [...prev, { type: "error", text: `Error: ${err}`, ts: Date.now() }]);
    }

    setIsRunning(false);
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => { setIsOpen(!isOpen); setTimeout(() => inputRef.current?.focus(), 100); }}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <Terminal className="h-4 w-4" />
        <span>OpenMinis Shell</span>
        <motion.span animate={{ rotate: isOpen ? 90 : 0 }} className="text-xs">▸</motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-2"
          >
            <div
              className={`rounded-xl overflow-hidden ${isExpanded ? "fixed inset-4 z-50" : ""}`}
              style={{
                background: "#0d1117",
                border: "1px solid #30363d",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
              }}
            >
              {/* Title bar */}
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{ background: "#161b22", borderBottom: "1px solid #30363d" }}
              >
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
                </div>
                <span className="text-xs ml-2" style={{ color: "#8b949e" }}>
                  openminis-shell — {isExpanded ? "expanded" : `${Math.min(300, 200)}px`}
                </span>
                <div className="flex ml-auto gap-1">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 rounded hover:bg-[#30363d] text-[#8b949e]"
                  >
                    {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded hover:bg-[#30363d] text-[#8b949e]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Terminal output */}
              <div
                ref={scrollRef}
                className={`p-4 overflow-y-auto ${isExpanded ? "h-[calc(100%-80px)]" : "max-h-60"}`}
                style={{ fontSize: "12px", lineHeight: "1.6" }}
              >
                {history.map((line, idx) => (
                  <div
                    key={idx}
                    className={`whitespace-pre-wrap break-all ${
                      line.type === "input" ? "text-[#58a6ff] font-bold" :
                      line.type === "error" ? "text-[#f85149]" :
                      line.type === "info" ? "text-[#8b949e] italic" :
                      "text-[#c9d1d9]"
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
                {isRunning && (
                  <motion.span
                    className="inline-block w-2 h-4"
                    style={{ background: "#58a6ff" }}
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Input line */}
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{ borderTop: "1px solid #30363d", background: "#161b22" }}
              >
                <ChevronRight className="h-3 w-3 text-[#3fb950] shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCommand()}
                  placeholder={isRunning ? "Running..." : "Type a command... (try 'help')"}
                  disabled={isRunning}
                  className="flex-1 bg-transparent outline-none text-[#c9d1d9] text-[12px] font-mono"
                  style={{
                    caretColor: "#58a6ff",
                  }}
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
