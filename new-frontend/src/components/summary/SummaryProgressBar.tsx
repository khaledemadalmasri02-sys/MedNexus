import { motion } from "framer-motion";
import {
  FileText, Sparkles, FileOutput, Check, Loader2, Brain,
} from "lucide-react";
import { smoothTransition } from "../ui/constants";
import type { SummaryProgress } from "../../hooks/useSummaryGeneration";

interface SummaryProgressBarProps {
  progress: SummaryProgress;
  isProcessing: boolean;
}

const STAGES = [
  { key: "extracting", label: "Extracting", icon: FileText },
  { key: "correcting", label: "Correcting", icon: Sparkles },
  { key: "ai_processing", label: "AI Processing", icon: Brain },
  { key: "ai_writing_pdf", label: "Writing PDF", icon: FileOutput },
  { key: "building_pdf", label: "Building", icon: FileOutput },
];

export default function SummaryProgressBar({ progress, isProcessing }: SummaryProgressBarProps) {
  const currentIdx = STAGES.findIndex((s) => s.key === progress.stage);
  const pct = Math.max(0, Math.min(100, progress.progress || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={smoothTransition}
      className="space-y-6"
    >
      {/* Main progress bar — uses CSS transition for smooth updates */}
      <div className="relative w-full rounded-full overflow-hidden" style={{
        height: "8px",
        background: "var(--glass-surface)",
        border: "1px solid var(--glass-border)",
      }}>
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--accent-cyan), var(--accent-purple))",
            boxShadow: "0 0 12px rgba(6, 182, 212, 0.4)",
            transition: "width 0.6s ease-out",
          }}
        />
        {isProcessing && pct > 0 && pct < 100 && (
          <motion.div
            className="absolute top-0 h-full w-6 rounded-full"
            style={{
              left: `calc(${pct}% - 12px)`,
              background: "radial-gradient(circle, var(--accent-cyan), transparent)",
              filter: "blur(3px)",
            }}
            animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* Stage indicators */}
      <div className="flex items-center justify-between">
        {STAGES.map((stage, idx) => {
          const isComplete = currentIdx > idx;
          const isCurrent = currentIdx === idx;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="flex items-center gap-2">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: isComplete ? "rgba(16, 185, 129, 0.15)" :
                              isCurrent ? "rgba(6, 182, 212, 0.15)" :
                              "var(--glass-surface)",
                  border: `1px solid ${
                    isComplete ? "rgba(16, 185, 129, 0.3)" :
                    isCurrent ? "rgba(6, 182, 212, 0.3)" :
                    "var(--glass-border)"
                  }`,
                }}
              >
                {isComplete ? (
                  <Check className="h-4 w-4 text-accent-emerald" />
                ) : isCurrent && isProcessing ? (
                  <Loader2 className="h-4 w-4 text-accent-cyan animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-text-muted" />
                )}
              </div>
              <span
                className="text-xs font-medium hidden sm:inline"
                style={{
                  color: isComplete || isCurrent ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {stage.label}
              </span>
              {idx < STAGES.length - 1 && (
                <div
                  className="w-8 sm:w-12 h-px mx-1"
                  style={{
                    background: isComplete ? "var(--accent-emerald)" : "var(--glass-border)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Message + percentage */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">{progress.message}</span>
        <span className="text-sm font-semibold text-accent-cyan">
          {Math.round(pct)}%
        </span>
      </div>
    </motion.div>
  );
}
