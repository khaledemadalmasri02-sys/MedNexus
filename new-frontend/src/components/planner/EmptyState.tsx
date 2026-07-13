import { motion } from "framer-motion";
import { CalendarDays, Sparkles, Plus, GitBranch } from "lucide-react";

interface EmptyStateProps {
  onAdd: () => void;
  onAI: () => void;
  hasExams?: boolean;
}

export default function EmptyState({ onAdd, onAI, hasExams }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 rounded-3xl relative overflow-hidden"
      style={{ background: "var(--glass-card-bg)", border: "1px dashed var(--glass-border)", backdropFilter: "blur(16px)" }}
    >
      <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(circle at 50% 0%, rgba(6,182,212,.12), transparent 70%)" }} />
      <div className="relative">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-20 h-20 mx-auto mb-5 rounded-3xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(6,182,212,.15), rgba(139,92,246,.15))", border: "1px solid var(--glass-border)" }}
        >
          <CalendarDays className="h-10 w-10 text-accent-green" />
        </motion.div>
        <h3 className="text-xl font-display font-bold text-text-primary mb-2">Plan your study week</h3>
        <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
          Build a weekly schedule, let AI generate one from your exam date, and track focus with a Pomodoro timer. Your streak starts now.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onAdd}
            className="px-5 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 4px 20px rgba(6,182,212,.25)" }}
          >
            <Plus className="h-4 w-4" /> Add Session
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onAI}
            className="px-5 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--accent-purple), var(--accent-violet))", boxShadow: "0 4px 20px rgba(139,92,246,.25)" }}
          >
            <Sparkles className="h-4 w-4" /> AI Generate
          </motion.button>
        </div>
        {!hasExams && (
          <p className="text-[11px] text-text-muted mt-6 flex items-center justify-center gap-1">
            <GitBranch className="h-3 w-3" /> Tip: add an exam date for a live countdown in the header.
          </p>
        )}
      </div>
    </motion.div>
  );
}
