import { motion } from "framer-motion";
import { GraduationCap, Clock } from "lucide-react";
import type { StudyExam } from "../../lib/api";

function diffParts(examDate: string) {
  const target = new Date(examDate).getTime();
  const now = Date.now();
  let diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const minutes = Math.floor(diff / 60000);
  return { days, hours, minutes, passed: target <= now };
}

export default function ExamCountdown({ exams }: { exams: StudyExam[] }) {
  if (exams.length === 0) return null;
  const upcoming = [...exams]
    .filter((e) => new Date(e.examDate).getTime() > Date.now())
    .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())[0];
  const next = upcoming || exams[0];
  const { days, hours, minutes, passed } = diffParts(next.examDate);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 rounded-2xl px-4 py-2 relative overflow-hidden"
      style={{
        background: "var(--glass-card-bg)",
        border: `1px solid ${next.color}40`,
        backdropFilter: "blur(16px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
      }}
    >
      <div
        className="w-1 h-9 rounded-full"
        style={{ background: next.color }}
      />
      <GraduationCap className="h-5 w-5 shrink-0" style={{ color: next.color }} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-text-muted leading-none">
          {passed ? "Exam" : "Next exam"} · {next.subject || "Goal"}
        </p>
        <p className="text-sm font-semibold text-text-primary truncate leading-tight">{next.title}</p>
      </div>
      {!passed && (
        <div className="flex items-center gap-1 ml-auto">
          <div className="text-center">
            <p className="text-lg font-bold font-display" style={{ color: next.color }}>{days}</p>
            <p className="text-[9px] text-text-muted">d</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold font-display text-text-primary">{hours}</p>
            <p className="text-[9px] text-text-muted">h</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold font-display text-text-primary">{minutes}</p>
            <p className="text-[9px] text-text-muted">m</p>
          </div>
          <Clock className="h-4 w-4 text-text-muted ml-1" />
        </div>
      )}
    </motion.div>
  );
}
