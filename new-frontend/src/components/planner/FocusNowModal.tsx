import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Square, X, BookOpen, Coffee, Brain } from "lucide-react";
import type { PlannerPlan } from "../../lib/api";

const FOCUS_MIN = 25;
const SHORT_MIN = 5;
const LONG_MIN = 15;

interface FocusNowModalProps {
  plan: PlannerPlan | null;
  onClose: () => void;
}

type Phase = "focus" | "short" | "long";

export default function FocusNowModal({ plan, onClose }: FocusNowModalProps) {
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_MIN * 60);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // phase complete
          setRunning(false);
          if (phase === "focus") {
            const nextCycle = cycle + 1;
            setCycle(nextCycle);
            setPhase(nextCycle % 4 === 0 ? "long" : "short");
            setSecondsLeft((nextCycle % 4 === 0 ? LONG_MIN : SHORT_MIN) * 60);
          } else {
            setPhase("focus");
            setSecondsLeft(FOCUS_MIN * 60);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, cycle]);

  const total = (phase === "focus" ? FOCUS_MIN : phase === "short" ? SHORT_MIN : LONG_MIN) * 60;
  const progress = total > 0 ? 1 - secondsLeft / total : 0;
  const accent = plan?.color || "var(--accent-green)";
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const phaseLabel = phase === "focus" ? "Focus" : phase === "short" ? "Short Break" : "Long Break";
  const phaseIcon = phase === "focus" ? Brain : Coffee;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: "radial-gradient(circle at 50% 30%, rgba(6,182,212,0.12), rgba(2,6,23,0.92))", backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl p-8 text-center relative overflow-hidden"
          style={{ background: "var(--glass-card-bg)", border: `1px solid ${accent}40`, backdropFilter: "blur(28px)", boxShadow: `inset 0 1px 0 rgba(255,255,255,.08), 0 0 80px ${accent}22` }}
        >
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-text-primary" style={{ background: "var(--bg-elevated)" }}>
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center justify-center gap-2 mb-1" style={{ color: accent }}>
            {phaseIcon === Brain ? <Brain className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
            <span className="text-sm font-semibold uppercase tracking-wider">{phaseLabel}</span>
          </div>

          {plan && phase === "focus" && (
            <div className="mb-4 flex items-center justify-center gap-2 text-text-secondary text-sm">
              <BookOpen className="h-4 w-4" style={{ color: accent }} />
              <span className="truncate max-w-[16rem]">{plan.title}</span>
            </div>
          )}

          <div className="relative w-56 h-56 mx-auto my-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={2 * Math.PI * 45 * (1 - progress)}
                style={{ transition: "stroke-dashoffset 0.5s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold font-display text-text-primary tabular-nums">{mm}:{ss}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            {!running ? (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setRunning(true)}
                className="px-6 py-3 rounded-2xl text-white font-semibold flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
                <Play className="h-5 w-5" /> Start
              </motion.button>
            ) : (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setRunning(false)}
                className="px-6 py-3 rounded-2xl text-white font-semibold flex items-center gap-2"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                <Pause className="h-5 w-5" /> Pause
              </motion.button>
            )}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setRunning(false); setPhase("focus"); setCycle(0); setSecondsLeft(FOCUS_MIN * 60); }}
              className="p-3 rounded-2xl text-text-secondary" style={{ background: "var(--bg-elevated)" }}>
              <Square className="h-4 w-4" />
            </motion.button>
          </div>

          <p className="text-xs text-text-muted mt-4">Cycle {cycle + 1} · Pomodoro {cycle % 4 + 1} of 4 before a long break</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
