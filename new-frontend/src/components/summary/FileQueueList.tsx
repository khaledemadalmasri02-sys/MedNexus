import { motion } from "framer-motion";
import {
  FileText, Image, Presentation, FileSpreadsheet, File, X, Check, AlertCircle, Loader2, Plus,
} from "lucide-react";
import { listItem, staggerContainer } from "../ui/constants";
import type { SummaryFile } from "../../hooks/useSummaryGeneration";

interface FileQueueListProps {
  files: SummaryFile[];
  onRemove: (index: number) => void;
  onAddMore: () => void;
  disabled?: boolean;
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileQueueList({ files, onRemove, onAddMore, disabled }: FileQueueListProps) {
  if (files.length === 0) return null;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {files.map((fileItem, idx) => {
        const Icon = getFileIcon(fileItem.name);
        return (
          <motion.div
            key={fileItem.id}
            variants={listItem}
            layout
            className="flex items-center gap-3 p-3 rounded-xl group"
            style={{
              background: "var(--glass-surface)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background:
                  fileItem.status === "uploaded" ? "rgba(16, 185, 129, 0.1)" :
                  fileItem.status === "error" ? "rgba(239, 68, 68, 0.1)" :
                  fileItem.status === "uploading" ? "rgba(6, 182, 212, 0.1)" :
                  "rgba(148, 163, 184, 0.08)",
                border: `1px solid ${
                  fileItem.status === "uploaded" ? "rgba(16, 185, 129, 0.2)" :
                  fileItem.status === "error" ? "rgba(239, 68, 68, 0.2)" :
                  "var(--glass-border)"
                }`,
              }}
            >
              {fileItem.status === "uploaded" ? (
                <Check className="h-4 w-4 text-accent-emerald" />
              ) : fileItem.status === "error" ? (
                <AlertCircle className="h-4 w-4 text-red-400" />
              ) : fileItem.status === "uploading" ? (
                <Loader2 className="h-4 w-4 text-accent-cyan animate-spin" />
              ) : (
                <Icon className="h-4 w-4 text-text-secondary" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{fileItem.name}</p>
              <p className="text-xs text-text-muted">
                {formatSize(fileItem.size)}
                {fileItem.error && <span className="text-red-400 ml-2">• {fileItem.error}</span>}
              </p>
            </div>

            {fileItem.status === "uploading" && (
              <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                <motion.div
                  className="h-full rounded-full bg-accent-cyan"
                  initial={{ width: "0%" }}
                  animate={{ width: `${fileItem.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[rgba(239,68,68,0.1)]"
              style={{ opacity: disabled ? 0 : undefined }}
              disabled={disabled}
            >
              <X className="h-4 w-4 text-text-secondary hover:text-red-400 transition-colors" />
            </motion.button>
          </motion.div>
        );
      })}

      <motion.button
        variants={listItem}
        onClick={onAddMore}
        disabled={disabled || files.length >= 20}
        className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          borderColor: "var(--glass-border)",
          color: "var(--text-secondary)",
        }}
        whileHover={{ borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)" }}
      >
        <Plus className="h-4 w-4" />
        Add more files ({files.length}/20)
      </motion.button>
    </motion.div>
  );
}
