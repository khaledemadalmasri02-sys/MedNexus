import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";
import { springTransition } from "../ui/constants";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const ACCEPTED_EXTENSIONS = [
  ".pdf", ".png", ".jpg", ".jpeg", ".webp",
  ".pptx", ".ppt", ".xlsx", ".xls", ".csv",
  ".txt", ".md", ".docx",
];

const ACCEPTED_MIME = [
  "application/pdf",
  "image/png", "image/jpeg", "image/webp",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv", "text/plain", "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export default function FileUploadZone({ onFilesSelected, disabled }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const valid = files.filter((f) => {
        const ext = `.${f.name.split(".").pop()?.toLowerCase() || ""}`;
        return ACCEPTED_EXTENSIONS.includes(ext);
      });
      if (valid.length > 0) onFilesSelected(valid);
    },
    [onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => { e.preventDefault(); if (!disabled) setIsDragging(true); },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); },
    []
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${
        isDragging
          ? "border-accent-cyan bg-[rgba(6,182,212,0.05)] shadow-[0_0_40px_rgba(6,182,212,0.12)]"
          : "border-glass-border hover:border-glass-border-light"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      data-hover="true"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={[...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME].join(",")}
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      <motion.div
        animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
        transition={springTransition}
        className="flex flex-col items-center"
      >
        <div
          className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 ${
            isDragging ? "shadow-[0_0_30px_rgba(6,182,212,0.2)]" : ""
          }`}
          style={{
            background: isDragging
              ? "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))"
              : "var(--glass-surface)",
            border: `1px solid ${isDragging ? "var(--accent-cyan)" : "var(--glass-border)"}`,
          }}
        >
          <Upload className={`h-7 w-7 ${isDragging ? "text-white" : "text-text-secondary"}`} />
        </div>

        <p className="text-base font-medium text-text-primary mb-1">
          {isDragging ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-sm text-text-secondary mb-4">
          or <span className="text-accent-cyan font-medium">browse</span> to select files
        </p>

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span
              key={ext}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md"
              style={{
                background: "var(--glass-surface)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-muted)",
              }}
            >
              {ext}
            </span>
          ))}
        </div>

        <p className="text-xs text-text-muted mt-3">
          Up to 20 files · 50MB each
        </p>
      </motion.div>
    </motion.div>
  );
}
