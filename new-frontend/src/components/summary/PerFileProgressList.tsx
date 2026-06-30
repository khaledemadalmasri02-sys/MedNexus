import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Image, Presentation, FileSpreadsheet, File, Check, AlertCircle, Loader2,
} from "lucide-react";
import { listItem, staggerContainer, smoothTransition } from "../ui/constants";
import type { FileProgressEntry } from "../../hooks/useSummaryGeneration";

interface PerFileProgressListProps {
  files: FileProgressEntry[];
  isProcessing: boolean;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "pdf": return FileText;
    case "png": case "jpg": case "jpeg": case "webp": return Image;
    case "pptx": case "ppt": return Presentation;
    case "xlsx": case "xls": case "csv": return FileSpreadsheet;
    default: return File;
  }
}

function formatStage(stage: string): string {
  switch (stage) {
    case "extracting": return "Extracting text";
    case "correcting": return "Correcting text";
    case "corrected": return "Text corrected";
    case "ai_explaining": return "AI explaining";
    case "ai_enhancing": return "AI enhancing";
    case "ai_processing": return "AI processing";
    case "ai_writing_pdf": return "AI writing PDF";
    case "ai_merging": return "Merging summaries";
    case "building_pdf": return "Building PDF";
    case "generating_audio": return "Generating audio";
    case "complete": return "Complete";
    case "done": return "Done";
    case "starting": return "Starting";
    case "queued": return "Queued";
    case "waiting": return "Waiting";
    default: return stage;
  }
}

function FileProgressBar({ progress, isProcessing, color }: { progress: number; isProcessing: boolean; color: string }) {
  return (
    <div className="relative w-full rounded-full overflow-hidden" style={{ height: "6px", background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
      <motion.div
        className="absolute top-0 left-0 h-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          boxShadow: `0 0 8px ${color}60`,
        }}
        initial={{ width: "0%" }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      {isProcessing && progress > 0 && progress < 100 && (
        <motion.div
          className="absolute top-0 h-full w-3 rounded-full"
          style={{
            left: `calc(${progress}% - 6px)`,
            background: `radial-gradient(circle, ${color}, transparent)`,
            filter: "blur(2px)",
          }}
          animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.3, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

export default function PerFileProgressList({ files, isProcessing: _isProcessing }: PerFileProgressListProps) {
  void _isProcessing;
  if (files.length === 0) return null;

  const completedCount = files.filter((f) => f.status === "complete").length;
  const totalCount = files.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={smoothTransition}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-text-primary">Per-File Progress</h4>
        <span className="text-xs font-medium text-text-secondary">
          {completedCount}/{totalCount} complete
        </span>
      </div>

      <div className="relative w-full rounded-full overflow-hidden" style={{ height: "4px", background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-emerald))",
          }}
          initial={{ width: "0%" }}
          animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
        <AnimatePresence>
          {files.map((fileItem) => {
            const Icon = getFileIcon(fileItem.fileName);
            const isProcessingFile = fileItem.status === "processing";
            const isComplete = fileItem.status === "complete";
            const isError = fileItem.status === "error";
            const isWaiting = fileItem.status === "waiting";

            const barColor = isComplete ? "var(--accent-emerald)" : isError ? "rgb(239, 68, 68)" : "var(--accent-cyan)";

            return (
              <motion.div
                key={fileItem.index}
                variants={listItem}
                layout
                className="p-3 rounded-xl"
                style={{
                  background: isComplete ? "rgba(16, 185, 129, 0.05)" : isError ? "rgba(239, 68, 68, 0.05)" : "var(--glass-surface)",
                  border: `1px solid ${isComplete ? "rgba(16, 185, 129, 0.15)" : isError ? "rgba(239, 68, 68, 0.15)" : "var(--glass-border)"}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: isComplete ? "rgba(16, 185, 129, 0.1)" : isError ? "rgba(239, 68, 68, 0.1)" : isProcessingFile ? "rgba(6, 182, 212, 0.1)" : "rgba(148, 163, 184, 0.08)",
                      border: `1px solid ${isComplete ? "rgba(16, 185, 129, 0.2)" : isError ? "rgba(239, 68, 68, 0.2)" : "var(--glass-border)"}`,
                    }}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4 text-accent-emerald" />
                    ) : isError ? (
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    ) : isProcessingFile ? (
                      <Loader2 className="h-4 w-4 text-accent-cyan animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4 text-text-muted" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-text-primary truncate">{fileItem.fileName}</p>
                      <span className="text-xs font-medium ml-2 shrink-0" style={{ color: barColor }}>
                        {isComplete ? "100%" : isError ? "Failed" : `${Math.round(fileItem.progress)}%`}
                      </span>
                    </div>

                    <FileProgressBar progress={fileItem.progress} isProcessing={isProcessingFile} color={barColor} />

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-text-muted">
                        {isWaiting ? "Waiting..." : isComplete ? "Done" : isError ? fileItem.error || "Error" : formatStage(fileItem.stage)}
                      </span>
                      {isComplete && fileItem.pdfUrl && (
                        <a
                          href={fileItem.pdfUrl}
                          download={`summary-${fileItem.fileName}.pdf`}
                          className="text-[10px] font-medium text-accent-cyan hover:underline"
                        >
                          Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
