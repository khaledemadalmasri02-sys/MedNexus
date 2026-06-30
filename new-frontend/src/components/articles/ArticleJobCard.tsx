import { motion } from "framer-motion";
import { Sparkles, Trash2, BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import type { ArticleJob } from "../../lib/api";

interface ArticleJobCardProps {
  job: ArticleJob;
  onRead: (job: ArticleJob) => void;
  onDelete: (id: string) => void;
}

function statusConfig(job: ArticleJob) {
  switch (job.status) {
    case "completed":
      return { color: "var(--accent-emerald)", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.15)", label: "Ready" };
    case "failed":
      return { color: "#EF4444", bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.15)", label: "Failed" };
    case "running":
      return { color: "var(--accent-amber)", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.15)", label: "Generating" };
    default:
      return { color: "var(--accent-blue)", bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.15)", label: "Queued" };
  }
}

export function ArticleJobCard({ job, onRead, onDelete }: ArticleJobCardProps) {
  const config = statusConfig(job);
  const isLive = job.status === "running" || job.status === "pending";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } }}
      className="rounded-2xl p-4 relative overflow-hidden group"
      style={{
        background: "var(--glass-card-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-start gap-3.5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: config.bg, border: `1px solid ${config.border}` }}
        >
          {job.status === "completed" ? (
            <CheckCircle className="h-5 w-5" style={{ color: config.color }} />
          ) : job.status === "failed" ? (
            <AlertCircle className="h-5 w-5" style={{ color: config.color }} />
          ) : (
            <BookOpen className="h-5 w-5" style={{ color: config.color }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-semibold text-text-primary text-sm truncate leading-tight">
              {job.topic}
            </h4>
            <span
              className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}
            >
              {isLive && (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <Sparkles className="h-2.5 w-2.5" />
                </motion.div>
              )}
              {config.label}
            </span>
          </div>

          {job.status === "failed" && job.error && (
            <p className="text-xs text-red-400 mt-1 line-clamp-1">{job.error}</p>
          )}

          {isLive && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-text-muted">Progress</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: config.color }}>
                  {Math.round(job.progress)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${config.color}, ${config.color}dd)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${job.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {job.status === "completed" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onRead(job)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
              color: "var(--text-on-accent)",
              boxShadow: "0 4px 16px rgba(6, 182, 212, 0.25)",
            }}
            data-hover="true"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read
          </motion.button>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onDelete(job.id)}
          className="p-2 rounded-lg"
          style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.12)" }}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-400" />
        </motion.button>
      </div>
    </motion.div>
  );
}
