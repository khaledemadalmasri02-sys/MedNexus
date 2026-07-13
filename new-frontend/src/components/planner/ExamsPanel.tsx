import { useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Plus, Trash2, Clock } from "lucide-react";
import { examsApi } from "../../lib/api";
import type { StudyExam } from "../../lib/api";
import { GlowingInput, Modal } from "../../components/ui";

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#22c55e', '#ec4899', '#ef4444', '#3b82f6'];

interface ExamsPanelProps {
  exams: StudyExam[];
  onChanged: () => void;
}

function diffParts(examDate: string) {
  const target = new Date(examDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  return { days, passed: target <= now };
}

export default function ExamsPanel({ exams, onChanged }: ExamsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);

  const sorted = [...exams].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

  const handleCreate = async () => {
    if (!title || !examDate) return;
    setSaving(true);
    try {
      await examsApi.create({ title, subject: subject || undefined, examDate: new Date(examDate).toISOString(), color });
      setTitle(""); setSubject(""); setExamDate(""); setIsOpen(false);
      onChanged();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    try { await examsApi.delete(id); onChanged(); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-accent-purple" />
          <h2 className="font-display text-lg font-semibold text-text-primary">Exams & Goals</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="px-3 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, var(--accent-purple), var(--accent-violet))" }}
        >
          <Plus className="h-4 w-4" /> Add Exam
        </motion.button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(16px)" }}>
          <GraduationCap className="h-12 w-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No exams yet. Add a target date to track a live countdown.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map((exam) => {
            const { days, passed } = diffParts(exam.examDate);
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{ background: "var(--glass-card-bg)", border: `1px solid ${exam.color}30`, backdropFilter: "blur(16px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)" }}
              >
                <div className="absolute inset-y-0 left-0 w-1" style={{ background: exam.color }} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-text-primary truncate">{exam.title}</p>
                    <p className="text-xs text-text-muted">{exam.subject || "Goal"}</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(exam.id)} className="p-1.5 rounded-lg" style={{ background: "rgba(239,68,68,.1)" }}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </motion.button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-text-secondary text-sm">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(exam.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-display" style={{ color: exam.color }}>{passed ? "Done" : `${days}d`}</p>
                    <p className="text-[10px] text-text-muted">{passed ? "completed" : "remaining"}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Exam / Goal">
        <div className="space-y-4">
          <GlowingInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cardiology Final" />
          <GlowingInput label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Cardiology" />
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Exam Date</label>
            <input
              type="datetime-local"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-text-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full transition-transform" style={{ background: c, outline: color === c ? "2px solid white" : "none", outlineOffset: 2 }} />
              ))}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleCreate} disabled={saving}
            className="w-full py-3 rounded-xl text-white font-semibold"
            style={{ background: "linear-gradient(135deg, var(--accent-purple), var(--accent-violet))" }}
          >
            {saving ? "Saving…" : "Add Exam"}
          </motion.button>
        </div>
      </Modal>
    </div>
  );
}
