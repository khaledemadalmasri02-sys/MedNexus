import { motion } from "framer-motion";
import { Layers, FileText, ArrowRight, ArrowLeftRight } from "lucide-react";
import { smoothTransition, springTransition } from "../ui/constants";
import type { GenerationMode } from "../../hooks/useSummaryGeneration";

interface ModeSelectorProps {
  selectedMode: GenerationMode;
  onSelect: (mode: GenerationMode) => void;
  onNext: () => void;
  onBack: () => void;
  fileCount: number;
}

export default function ModeSelector({
  selectedMode,
  onSelect,
  onNext,
  onBack,
  fileCount,
}: ModeSelectorProps) {
  const modes: {
    id: GenerationMode;
    name: string;
    description: string;
    detail: string;
    icon: typeof Layers;
  }[] = [
    {
      id: "combined",
      name: "Combined",
      description: "Merge all files into one PDF",
      detail:
        fileCount > 1
          ? `All ${fileCount} files merged into a single PDF with a table of contents and chapter divisions.`
          : "Single file PDF with full formatting.",
      icon: ArrowLeftRight,
    },
    {
      id: "separate",
      name: "Separate",
      description: "Generate individual PDFs per file",
      detail:
        fileCount > 1
          ? `Each of the ${fileCount} files gets its own PDF. Switch between them with tabs.`
          : "Single file PDF — same as combined for one file.",
      icon: FileText,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={smoothTransition}
      className="space-y-6"
    >
      <div>
        <h3 className="text-sm font-display font-semibold text-text-secondary tracking-wider uppercase mb-1">
          Choose Generation Mode
        </h3>
        <p className="text-xs text-text-muted">
          How would you like your {fileCount} file{fileCount !== 1 ? "s" : ""} processed?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modes.map((mode, idx) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;
          return (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: idx * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(mode.id)}
              className="relative rounded-2xl p-6 text-left transition-all duration-300"
              style={{
                background: isSelected
                  ? "rgba(6, 182, 212, 0.08)"
                  : "var(--glass-card-bg)",
                border: `1px solid ${isSelected ? "var(--accent-cyan)" : "var(--glass-border)"}`,
                backdropFilter: "blur(20px)",
                boxShadow: isSelected
                  ? "0 0 30px rgba(6, 182, 212, 0.12)"
                  : "none",
              }}
              data-hover="true"
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--accent-cyan)",
                    boxShadow: "0 0 12px rgba(6,182,212,0.4)",
                  }}
                >
                  <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}

              <div
                className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: isSelected
                    ? "rgba(6, 182, 212, 0.12)"
                    : "var(--glass-surface)",
                  border: `1px solid ${isSelected ? "rgba(6, 182, 212, 0.3)" : "var(--glass-border)"}`,
                }}
              >
                <Icon
                  className={`h-6 w-6 ${isSelected ? "text-accent-cyan" : "text-text-secondary"}`}
                />
              </div>

              <h4 className="font-display text-base font-semibold text-text-primary mb-1">
                {mode.name}
              </h4>
              <p className="text-sm text-text-secondary mb-2">{mode.description}</p>
              <p className="text-xs text-text-muted leading-relaxed">{mode.detail}</p>

              {mode.id === "combined" && fileCount > 1 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {Array.from({ length: Math.min(fileCount, 5) }).map((_, i) => (
                    <div
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        background: "rgba(6, 182, 212, 0.08)",
                        border: "1px solid rgba(6, 182, 212, 0.2)",
                        color: "var(--accent-cyan)",
                      }}
                    >
                      Ch.{i + 1}
                    </div>
                  ))}
                  {fileCount > 5 && (
                    <span className="px-2 py-0.5 text-[10px] text-text-muted">
                      +{fileCount - 5} more
                    </span>
                  )}
                </div>
              )}

              {mode.id === "separate" && fileCount > 1 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {Array.from({ length: Math.min(fileCount, 4) }).map((_, i) => (
                    <div
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        background: "rgba(139, 92, 246, 0.08)",
                        border: "1px solid rgba(139, 92, 246, 0.2)",
                        color: "var(--accent-purple)",
                      }}
                    >
                      PDF {i + 1}
                    </div>
                  ))}
                  {fileCount > 4 && (
                    <span className="px-2 py-0.5 text-[10px] text-text-muted">
                      +{fileCount - 4} more
                    </span>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-5 py-3 rounded-xl font-medium text-sm flex items-center gap-2"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNext}
          className="px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2"
          style={{
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
            boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)",
          }}
          data-hover="true"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
