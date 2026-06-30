import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Play, Pause, RotateCcw, Coffee, Settings } from "lucide-react";

interface StudyTimerProps {
  compact?: boolean;
}

type TimerMode = "study" | "break" | "longBreak";

const PRESETS: { label: string; study: number; break: number; longBreak: number }[] = [
  { label: "Pomodoro", study: 25, break: 5, longBreak: 15 },
  { label: "Short", study: 15, break: 3, longBreak: 10 },
  { label: "Long", study: 50, break: 10, longBreak: 30 },
];

export function StudyTimer({ compact = false }: StudyTimerProps) {
  const [mode, setMode] = useState<TimerMode>("study");
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [customMinutes] = useState({ study: 25, break: 5 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const currentPreset = PRESETS[activePreset];
  const totalSeconds = mode === "study" ? currentPreset.study * 60 : mode === "break" ? currentPreset.break * 60 : currentPreset.longBreak * 60;
  const currentTotal = minutes * 60 + seconds;
  const progress = totalSeconds > 0 ? ((totalSeconds - currentTotal) / totalSeconds) * 100 : 0;

  const switchMode = useCallback((newMode: TimerMode) => {
    setMode(newMode);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (newMode === "study") {
      setMinutes(activePreset === 0 ? currentPreset.study : customMinutes.study);
    } else {
      setMinutes(activePreset === 0 ? currentPreset.break : customMinutes.break);
    }
    setSeconds(0);
  }, [activePreset, currentPreset, customMinutes]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s === 0) {
            setMinutes((m) => {
              if (m === 0) {
                setIsRunning(false);
                if (intervalRef.current) clearInterval(intervalRef.current);
                if (mode === "study") {
                  setSessions((prev) => prev + 1);
                  const nextSessions = sessions + 1;
                  if (nextSessions % 4 === 0) switchMode("longBreak");
                  else switchMode("break");
                } else {
                  switchMode("study");
                }
                return 0;
              }
              return m - 1;
            });
            return 59;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, mode, sessions, switchMode]);

  const reset = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    switchMode("study");
  }, [switchMode]);

  const circumference = 2 * Math.PI * 45;
  const strokeOffset = circumference - (progress / 100) * circumference;
  const modeColor = mode === "study" ? "var(--accent-green)" : "var(--accent-blue)";

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
        <Timer className="h-3.5 w-3.5" style={{ color: modeColor }} />
        <span className="text-xs font-mono font-medium text-text-primary">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
        <button onClick={() => setIsRunning(!isRunning)} className="p-0.5 rounded" style={{ color: "var(--text-muted)" }}>
          {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" style={{ color: modeColor }} />
          <span className="text-sm font-semibold text-text-primary">Study Timer</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: `${modeColor}15`, color: modeColor }}>
            {mode === "study" ? "Focus" : "Break"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-text-muted">{sessions} sessions</span>
          <button onClick={() => setShowSettings(!showSettings)} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "var(--text-muted)" }}>
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex gap-2 mb-3">
              {PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  onClick={() => { setActivePreset(i); setShowSettings(false); switchMode("study"); }}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                  style={{
                    background: activePreset === i ? `${modeColor}15` : "var(--bg-surface)",
                    border: `1px solid ${activePreset === i ? `${modeColor}30` : "var(--border-subtle)"}`,
                    color: activePreset === i ? modeColor : "var(--text-secondary)",
                  }}
                >
                  {preset.label}
                  <span className="block text-[9px] opacity-60">{preset.study}m/{preset.break}m</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center mb-4">
        <div className="relative w-28 h-28">
          <svg width="112" height="112" className="-rotate-90">
            <circle cx="56" cy="56" r="45" fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
            <motion.circle
              cx="56" cy="56" r="45" fill="none"
              stroke={modeColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-mono font-bold text-text-primary">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            <span className="text-[9px] text-text-muted">{mode === "study" ? "Focus" : "Rest"}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={reset}
          className="p-2 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
        >
          <RotateCcw className="h-4 w-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsRunning(!isRunning)}
          className="px-6 py-2 rounded-xl font-medium text-sm flex items-center gap-2"
          style={{ background: `${modeColor}20`, border: `1px solid ${modeColor}30`, color: modeColor }}
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? "Pause" : "Start"}
        </motion.button>
        {mode === "study" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => switchMode("break")}
            className="p-2 rounded-xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
            title="Take a break"
          >
            <Coffee className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </div>
  );
}
