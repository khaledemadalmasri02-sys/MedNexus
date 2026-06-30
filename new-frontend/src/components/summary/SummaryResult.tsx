import { useState, useRef, useCallback } from "react";
import ShellTerminal from "./ShellTerminal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, RefreshCw, FileText, Check, Volume2,
  MessageCircle, Send, Layers, ZoomIn, ZoomOut,
  Maximize, Minimize, RotateCcw, ChevronLeft, ChevronRight,
} from "lucide-react";
import { springTransition, smoothTransition } from "../ui/constants";
import type { FileProgressEntry, GenerationMode } from "../../hooks/useSummaryGeneration";
import { summaryApi } from "../../lib/api";

interface SummaryResultProps {
  pdfUrl: string | null;
  jobId: string;
  onReset: () => void;
  mode?: GenerationMode;
  fileProgress?: FileProgressEntry[];
  audioUrl?: string | null;
}

function PdfPreview({
  pdfUrl,
  fileName,
  downloadUrl,
}: {
  pdfUrl: string;
  fileName: string;
  downloadUrl?: string | null;
}) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 25, 50));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(100);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = pdfUrl;
    }
  }, [pdfUrl]);

  const zoomPresets = [50, 75, 100, 125, 150, 200];

  const content = (
    <div
      className="rounded-2xl overflow-hidden relative flex flex-col"
      style={{
        background: "var(--glass-card-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(20px)",
        ...(isFullscreen
          ? { position: "fixed", inset: 0, zIndex: 9999, borderRadius: 0 }
          : {}),
      }}
    >
      <div
        className="flex items-center gap-3 p-3 shrink-0"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          <FileText className="h-4 w-4 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{fileName}</p>
          <p className="text-[10px] text-text-muted">Generated PDF</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            title="Zoom out"
            style={{ background: "var(--glass-surface)" }}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="px-1.5 py-1 rounded-lg text-[11px] font-medium text-text-primary cursor-pointer outline-none"
            style={{
              background: "var(--glass-surface)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            {zoomPresets.map((p) => (
              <option key={p} value={p}>
                {p}%
              </option>
            ))}
          </select>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            title="Zoom in"
            style={{ background: "var(--glass-surface)" }}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            title="Reset zoom"
            style={{ background: "var(--glass-surface)" }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <div
            className="w-px h-5 mx-1"
            style={{ background: "var(--glass-border)" }}
          />

          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            style={{ background: "var(--glass-surface)" }}
          >
            {isFullscreen ? (
              <Minimize className="h-3.5 w-3.5" />
            ) : (
              <Maximize className="h-3.5 w-3.5" />
            )}
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="p-1.5 rounded-lg text-accent-cyan transition-colors"
              title="Download PDF"
              style={{ background: "rgba(6, 182, 212, 0.1)" }}
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <div
        className="relative flex-1 overflow-auto"
        style={{
          background: "var(--glass-surface)",
          minHeight: isFullscreen ? undefined : "500px",
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "var(--glass-surface)" }}>
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              >
                <RotateCcw className="h-8 w-8 text-accent-cyan" />
              </motion.div>
              <p className="text-xs text-text-muted">Loading PDF preview...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "var(--glass-surface)" }}>
            <div className="flex flex-col items-center gap-3">
              <FileText className="h-8 w-8 text-red-400" />
              <p className="text-xs text-red-400">Failed to load PDF preview</p>
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: "var(--accent-cyan)" }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div
          style={{
            width: `${zoom}%`,
            height: "100%",
            margin: "0 auto",
            transition: "width 0.2s ease",
          }}
        >
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            className="w-full h-full"
            title="PDF Preview"
            style={{ border: "none" }}
            onLoad={() => {
              setIsLoading(false);
              setHasError(false);
            }}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </div>
      </div>

      {isFullscreen && (
        <button
          onClick={handleToggleFullscreen}
          className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5"
          style={{
            background: "var(--bg-void)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Minimize className="h-3 w-3" /> Exit Fullscreen
        </button>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        style={{ background: "var(--bg-void)", backdropFilter: "blur(10px)" }}
        onClick={handleToggleFullscreen}
      >
        <div className="w-full h-full" onClick={(e) => e.stopPropagation()}>
          {content}
        </div>
      </motion.div>
    );
  }

  return content;
}

function SeparateFileTabs({
  files,
}: {
  files: FileProgressEntry[];
  jobId: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFile = files[activeIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...smoothTransition, delay: 0.25 }}
      className="space-y-4"
    >
      <div
        className="rounded-2xl p-4"
        style={{
          background: "var(--glass-card-bg)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Layers className="h-4 w-4 text-accent-purple" />
          <span className="text-sm font-medium text-text-primary">
            Generated Files ({files.length})
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {files.map((fp, idx) => {
            const isActive = activeIndex === idx;
            return (
              <motion.button
                key={fp.index}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveIndex(idx)}
                className="px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors shrink-0"
                style={{
                  background: isActive
                    ? "rgba(6, 182, 212, 0.12)"
                    : "var(--glass-surface)",
                  border: `1px solid ${isActive ? "var(--accent-cyan)" : "var(--glass-border)"}`,
                  color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                }}
              >
                {fp.status === "error" ? (
                  <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                ) : fp.status === "processing" ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-3 w-3 border border-accent-cyan border-t-transparent rounded-full shrink-0"
                  />
                ) : (
                  <Check className="h-3 w-3 shrink-0" />
                )}
                <span className="max-w-[100px] truncate">{fp.fileName}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {activeFile?.previewUrl && (
        <PdfPreview
          pdfUrl={activeFile.previewUrl}
          fileName={`${activeFile.fileName}.pdf`}
          downloadUrl={activeFile.pdfUrl}
        />
      )}

      {files.length > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
            disabled={activeIndex === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-30"
            style={{
              background: "var(--glass-surface)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            <ChevronLeft className="h-3 w-3" /> Previous
          </button>
          <span className="text-xs text-text-muted">
            {activeIndex + 1} of {files.length}
          </span>
          <button
            onClick={() => setActiveIndex((prev) => Math.min(files.length - 1, prev + 1))}
            disabled={activeIndex === files.length - 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-30"
            style={{
              background: "var(--glass-surface)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-secondary)",
            }}
          >
            Next <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function SummaryResult({
  pdfUrl,
  jobId,
  onReset,
  mode = "combined",
  fileProgress = [],
  audioUrl,
}: SummaryResultProps) {
  const [showQa, setShowQa] = useState(false);
  const [question, setQuestion] = useState("");
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: string }>>([]);
  const [isAsking, setIsAsking] = useState(false);

  const isSeparate = mode === "separate";
  const completedFiles = isSeparate
    ? fileProgress.filter((f) => f.status === "complete")
    : [];

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;
    setIsAsking(true);
    const q = question.trim();
    setQuestion("");
    setQaHistory((prev) => [...prev, { q, a: "..." }]);

    try {
      const response = await fetch("/api/summary/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jobId, question: q }),
      });
      const data = await response.json();
      setQaHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          q,
          a: data.answer || "No answer available.",
        };
        return updated;
      });
    } catch {
      setQaHistory((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          q,
          a: "Error: could not get answer.",
        };
        return updated;
      });
    }
    setIsAsking(false);
  };

  const hasAnyComplete = !isSeparate || completedFiles.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={smoothTransition}
      className="space-y-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...springTransition, delay: 0.2 }}
        className="flex flex-col items-center py-6"
      >
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center mb-4"
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            boxShadow: "0 0 30px rgba(16, 185, 129, 0.15)",
          }}
        >
          <Check className="h-8 w-8 text-accent-emerald" />
        </div>
        <h3 className="font-display text-xl font-semibold text-text-primary mb-1">
          {isSeparate ? "Summaries Generated!" : "Summary Generated!"}
        </h3>
        <p className="text-sm text-text-secondary">
          {isSeparate
            ? `${completedFiles.length} PDF${completedFiles.length !== 1 ? "s" : ""} ready to view or download.`
            : "Your PDF is ready to view, download, listen, or ask questions."}
        </p>
      </motion.div>

      {isSeparate && completedFiles.length > 0 && (
        <SeparateFileTabs files={completedFiles} jobId={jobId} />
      )}

      {!isSeparate && pdfUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...smoothTransition, delay: 0.3 }}
        >
          <PdfPreview
            pdfUrl={pdfUrl}
            fileName={`summary-${jobId}.pdf`}
            downloadUrl={summaryApi.download(jobId)}
          />
        </motion.div>
      )}

      {!isSeparate && audioUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...smoothTransition, delay: 0.35 }}
          className="rounded-2xl p-4"
          style={{
            background: "var(--glass-card-bg)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="h-4 w-4 text-accent-cyan" />
            <span className="text-sm font-medium text-text-primary">
              Audio Summary
            </span>
          </div>
          <audio controls className="w-full" style={{ height: "40px" }}>
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <p className="text-[10px] text-text-muted mt-1">
            AI-generated spoken summary using TTS
          </p>
        </motion.div>
      )}

      {hasAnyComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...smoothTransition, delay: 0.4 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--glass-card-bg)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(20px)",
          }}
        >
          <button
            onClick={() => setShowQa(!showQa)}
            className="w-full flex items-center gap-3 p-4 text-left"
            style={{
              borderBottom: showQa ? "1px solid var(--glass-border)" : "none",
            }}
          >
            <MessageCircle className="h-4 w-4 text-accent-purple" />
            <span className="text-sm font-medium text-text-primary flex-1">
              Q&A — Ask questions about your summary
            </span>
            <motion.span
              animate={{ rotate: showQa ? 180 : 0 }}
              className="text-text-muted"
            >
              ▾
            </motion.span>
          </button>

          <AnimatePresence>
            {showQa && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 space-y-4">
                  {qaHistory.length > 0 && (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {qaHistory.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-1"
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-accent-cyan mt-0.5 shrink-0">
                              Q:
                            </span>
                            <p className="text-sm text-text-primary">{item.q}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-accent-emerald mt-0.5 shrink-0">
                              A:
                            </span>
                            <p className="text-sm text-text-secondary whitespace-pre-wrap">
                              {item.a}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                      placeholder="Ask a question about the summary..."
                      className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        background: "var(--glass-surface)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAsk}
                      disabled={isAsking || !question.trim()}
                      className="px-3 py-2 rounded-lg text-white disabled:opacity-40"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <ShellTerminal jobId={jobId} outputDir="" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...smoothTransition, delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {!isSeparate && pdfUrl && (
          <motion.a
            href={pdfUrl}
            download={`summary-${jobId}.pdf`}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
              boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)",
            }}
            data-hover="true"
          >
            <Download className="h-5 w-5" />
            Download PDF
          </motion.a>
        )}

        {isSeparate && completedFiles.length > 1 && (
          <motion.a
            href={`/api/summary/download/${jobId}`}
            download={`summaries-${jobId}.zip`}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
              boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)",
            }}
            data-hover="true"
          >
            <Download className="h-5 w-5" />
            Download All ({completedFiles.length})
          </motion.a>
        )}

        {isSeparate && completedFiles.length <= 1 && <div className="flex-1" />}

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
          }}
        >
          <RefreshCw className="h-5 w-5" />
          Generate Another
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
