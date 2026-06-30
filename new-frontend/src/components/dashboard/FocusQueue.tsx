import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, BookOpen, Target, Sparkles, Flame, PartyPopper, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { listItem } from "../ui/constants";
import type { QueueItem } from "../../lib/api";

interface FocusQueueProps {
  items: QueueItem[];
  loading: boolean;
}

const colorMap: Record<string, { bg: string; border: string; bar: string }> = {
  amber: { bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)", bar: "var(--accent-amber)" },
  purple: { bg: "rgba(139, 92, 246, 0.08)", border: "rgba(139, 92, 246, 0.2)", bar: "var(--accent-purple)" },
  cyan: { bg: "rgba(6, 182, 212, 0.08)", border: "rgba(6, 182, 212, 0.2)", bar: "var(--accent-green)" },
  emerald: { bg: "rgba(16, 185, 129, 0.08)", border: "rgba(16, 185, 129, 0.2)", bar: "var(--accent-emerald)" },
  rose: { bg: "rgba(244, 63, 94, 0.08)", border: "rgba(244, 63, 94, 0.2)", bar: "var(--accent-rose, #f43f5e)" },
};

const iconMap: Record<string, React.ReactNode> = {
  review: <RotateCcw className="h-4 w-4" />,
  continue: <BookOpen className="h-4 w-4" />,
  goal: <Target className="h-4 w-4" />,
  explore: <Sparkles className="h-4 w-4" />,
  streak: <Flame className="h-4 w-4" />,
  celebration: <PartyPopper className="h-4 w-4" />,
};

export default function FocusQueue({ items, loading }: FocusQueueProps) {
  if (loading) {
    return (
      <div className="mb-8">
        <div className="w-32 h-5 rounded animate-shimmer mb-4" style={{ background: "var(--border-subtle)" }} />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl animate-shimmer" style={{ background: "var(--border-subtle)" }} />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
                  <div className="w-1/2 h-3 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="font-display text-lg font-semibold text-text-primary mb-4 tracking-wide">WHAT TO DO NEXT</h2>

      <AnimatePresence mode="popLayout">
        {items.map((item, idx) => {
          const colors = colorMap[item.color] || colorMap.cyan;
          return (
            <motion.div
              key={item.id}
              layout
              variants={listItem}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ delay: idx * 0.1 }}
              className={`rounded-2xl p-4 mb-3 relative overflow-hidden group ${idx === 0 ? "animate-pulse-gentle" : ""}`}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: colors.bar }} />

              <div className="flex items-center gap-3 pl-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${colors.bar}15`, color: colors.bar }}>
                  {iconMap[item.type] || <ChevronRight className="h-4 w-4" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary text-sm">{item.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{item.subtitle}</p>
                  {item.estimatedMin > 0 && item.type === "goal" && (
                    <div className="mt-2 w-32 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(148, 163, 184, 0.15)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: colors.bar }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (item.estimatedMin / 20) * 100)}%` }}
                        transition={{ delay: 0.3 + idx * 0.1, duration: 0.5 }}
                      />
                    </div>
                  )}
                </div>

                <Link to={item.actionUrl} className="shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.03, x: 2 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-4 py-2 rounded-xl text-white font-semibold text-xs flex items-center gap-1"
                    style={{ background: colors.bar }}
                  >
                    {item.actionLabel}
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
