import { motion } from "framer-motion";
import { Sparkles, BookOpen, Hash } from "lucide-react";
import type { ArticleTopic } from "../../lib/api";

interface TopicCardProps {
  topic: ArticleTopic;
  index: number;
  status: "idle" | "running" | "completed";
  onGenerate: (topic: ArticleTopic) => void;
}

const topicAccents = [
  { color: "var(--accent-cyan)", bg: "rgba(6, 182, 212, 0.1)", border: "rgba(6, 182, 212, 0.15)" },
  { color: "var(--accent-purple)", bg: "rgba(139, 92, 246, 0.1)", border: "rgba(139, 92, 246, 0.15)" },
  { color: "var(--accent-emerald)", bg: "rgba(16, 185, 129, 0.1)", border: "rgba(16, 185, 129, 0.15)" },
  { color: "var(--accent-amber)", bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.15)" },
  { color: "var(--accent-blue)", bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.15)" },
  { color: "var(--accent-rose)", bg: "rgba(244, 63, 94, 0.1)", border: "rgba(244, 63, 94, 0.15)" },
];

function getAccent(index: number) {
  return topicAccents[index % topicAccents.length];
}

export function TopicCard({ topic, index, status, onGenerate }: TopicCardProps) {
  const accent = getAccent(index);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -20, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
      whileHover={{ y: -4 }}
      className="rounded-2xl p-5 relative overflow-hidden group"
      style={{
        background: "var(--glass-card-bg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(20px)",
      }}
      data-hover="true"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-start gap-3.5">
        <motion.div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative"
          style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <BookOpen className="h-5 w-5" style={{ color: accent.color }} />
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-text-primary text-[15px] truncate leading-tight">
              {topic.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
              style={{ background: accent.bg, color: accent.color, border: `1px solid ${accent.border}` }}
            >
              <Hash className="h-2.5 w-2.5" />
              {topic.cardCount} cards
            </span>
            {status === "running" && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                style={{ background: "rgba(245, 158, 11, 0.1)", color: "var(--accent-amber)", border: "1px solid rgba(245, 158, 11, 0.15)" }}
              >
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <Sparkles className="h-2.5 w-2.5" />
                </motion.div>
                Generating
              </span>
            )}
            {status === "completed" && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--accent-emerald)", border: "1px solid rgba(16, 185, 129, 0.15)" }}
              >
                Ready
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onGenerate(topic)}
          disabled={status === "running"}
          className="w-full py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: status === "running" ? "var(--glass-surface)" : `linear-gradient(135deg, ${accent.color}, ${accent.color}dd)`,
            border: `1px solid ${status === "running" ? "var(--glass-border)" : accent.border}`,
            color: status === "running" ? "var(--text-muted)" : "var(--text-on-accent)",
            boxShadow: status === "running" ? "none" : `0 4px 16px ${accent.bg}`,
          }}
          data-hover="true"
        >
          {status === "running" ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="h-3.5 w-3.5" />
              </motion.div>
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Generate Article
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
