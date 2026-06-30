/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Calendar, AlertTriangle, Play } from "lucide-react";
import { Link } from "react-router-dom";
import * as api from "../../lib/api";
import { FloatingWidget } from "../ui";

interface ExamItem {
  id: number;
  name: string;
  date: string;
  daysRemaining: number;
  deckCount: number;
}

function urgencyColor(days: number): string {
  if (days < 7) return "var(--accent-rose)";
  if (days < 30) return "var(--accent-amber)";
  return "var(--accent-emerald)";
}

function urgencyLabel(days: number): string {
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days} days left`;
  if (days < 30) return `${days} days left`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} left`;
}

export function UpcomingExams() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const plans = await api.plannersApi.list().catch(() => []);
        const examItems: ExamItem[] = [];

        (Array.isArray(plans) ? plans : []).forEach((plan: any) => {
          if (plan.examDate) {
            const examDate = new Date(plan.examDate);
            const now = new Date();
            const diff = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            examItems.push({
              id: plan.id,
              name: plan.title || plan.name || "Upcoming Exam",
              date: plan.examDate,
              daysRemaining: diff,
              deckCount: plan.deckIds ? JSON.parse(plan.deckIds).length : 0,
            });
          }
        });

        examItems.sort((a, b) => a.daysRemaining - b.daysRemaining);
        setExams(examItems.slice(0, 3));
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <FloatingWidget className="p-4">
        <div className="space-y-3">
          <div className="h-4 w-36 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
          <div className="h-20 rounded-xl animate-shimmer" style={{ background: "var(--border-subtle)" }} />
        </div>
      </FloatingWidget>
    );
  }

  if (exams.length === 0) {
    return (
      <FloatingWidget className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-4 w-4 text-accent-purple" />
          <h3 className="text-sm font-semibold text-text-primary">Upcoming Exams</h3>
        </div>
        <div className="text-center py-4">
          <Calendar className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs text-text-muted">No upcoming exams</p>
          <Link to="/planner" className="text-[10px] font-medium text-accent-purple hover:underline mt-1 inline-block">
            Add exam date in Planner →
          </Link>
        </div>
      </FloatingWidget>
    );
  }

  return (
    <FloatingWidget className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="h-4 w-4 text-accent-purple" />
        <h3 className="text-sm font-semibold text-text-primary">Upcoming Exams</h3>
      </div>
      <div className="space-y-2">
        {exams.map((exam, i) => {
          const color = urgencyColor(exam.daysRemaining);
          return (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-3 rounded-xl"
              style={{ background: "var(--bg-elevated)", border: `1px solid ${color}20` }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{exam.name}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    {new Date(exam.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {exam.deckCount > 0 && ` · ${exam.deckCount} deck${exam.deckCount > 1 ? "s" : ""}`}
                  </div>
                </div>
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ml-2"
                  style={{ background: `${color}15`, color }}
                >
                  {exam.daysRemaining < 7 && <AlertTriangle className="h-3 w-3" />}
                  {urgencyLabel(exam.daysRemaining)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(148,163,184,0.08)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(5, Math.min(100, 100 - (exam.daysRemaining / 90) * 100))}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                  />
                </div>
                <Link to="/smart-review">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1 shrink-0"
                    style={{ background: `${color}15`, color }}
                  >
                    <Play className="h-3 w-3" />
                    Prep
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </FloatingWidget>
  );
}
