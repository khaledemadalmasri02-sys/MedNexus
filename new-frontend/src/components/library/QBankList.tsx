import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Stethoscope, Clock, Trash2, ChevronRight } from "lucide-react";
import type { QBank } from "../../lib/api";

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function calculateMastery(createdAt: string): number {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(100, Math.max(10, days * 5 + 20));
}

interface QBankCardProps {
  qbank: QBank;
  index: number;
  onDelete: (qbankId: number) => void;
  onDeleteRequest: (qbankId: number) => void;
  onCancelDelete: () => void;
  isDeleteConfirm: boolean;
  glassStyle: Record<string, string>;
}

export function QBankCard({
  qbank, index, onDelete, onDeleteRequest, onCancelDelete, isDeleteConfirm, glassStyle,
}: QBankCardProps) {
  const mastery = calculateMastery(qbank.createdAt);
  const colors = ["var(--accent-purple)", "var(--accent-violet)", "var(--accent-green)"];
  const color = colors[index % colors.length];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100, transition: { duration: 0.25 } }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="rounded-2xl p-4 card-hover flex items-center gap-4 group" style={{ ...glassStyle, border: "1px solid rgba(139, 92, 246, 0.1)" }} data-hover="true">
        <Link to={`/study?qbank=${qbank.id}`} className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-1 h-14 rounded-full shrink-0" style={{ background: color }} />
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
            <Stethoscope className="h-5 w-5" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text-primary truncate">{qbank.name}</p>
            <span className="text-xs text-text-secondary flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" /> {timeAgo(qbank.updatedAt || qbank.createdAt)}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
              <motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: mastery + "%" }} transition={{ delay: 0.2 + index * 0.05, duration: 0.5 }} />
            </div>
            <span className="text-xs font-mono font-semibold w-10 text-right" style={{ color }}>{mastery}%</span>
          </div>
          <span className="text-sm font-medium px-2.5 py-1 rounded-lg shrink-0" style={{ color, background: `${color}10` }}>{qbank.questionCount || 0} MCQs</span>
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteRequest(qbank.id); }}
          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[rgba(239,68,68,0.1)] transition-all shrink-0"
          aria-label={`Delete ${qbank.name}`}
        >
          <Trash2 className="h-4 w-4 text-red-400" />
        </button>
        <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-accent-purple transition-colors shrink-0" />
      </div>

      <AnimatePresence>
        {isDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-4 rounded-xl flex items-center justify-between" style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
              <p className="text-sm text-red-400">Delete &ldquo;{qbank.name}&rdquo;?</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onCancelDelete(); }}
                  className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-glass-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(qbank.id); }}
                  className="px-3 py-1.5 rounded-lg text-sm bg-red-500/90 text-white hover:bg-red-600 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface QBankListProps {
  qbanks: QBank[];
  onDelete: (qbankId: number) => void;
  glassStyle: Record<string, string>;
}

export function QBankList({ qbanks, onDelete, glassStyle }: QBankListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    setDeleteConfirm(null);
    await onDelete(id);
  };

  if (qbanks.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl" style={{ ...glassStyle, border: "2px dashed var(--glass-border-light)" }}>
        <Stethoscope className="h-12 w-12 text-text-muted mx-auto mb-4" />
        <p className="text-text-secondary font-medium">No question banks match your search</p>
      </div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-3">
        {qbanks.map((qb, idx) => (
          <QBankCard
            key={qb.id}
            qbank={qb}
            index={idx}
            onDelete={handleDelete}
            onDeleteRequest={(id) => setDeleteConfirm(id)}
            onCancelDelete={() => setDeleteConfirm(null)}
            isDeleteConfirm={deleteConfirm === qb.id}
            glassStyle={glassStyle}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}
