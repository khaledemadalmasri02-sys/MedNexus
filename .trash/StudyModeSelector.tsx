import { motion } from "framer-motion";
import { BookOpen, HelpCircle, Keyboard, Zap, Mic } from "lucide-react";

export type StudyMode = "normal" | "quiz" | "type" | "voice" | "speed";

interface StudyModeSelectorProps {
  value: StudyMode;
  onChange: (mode: StudyMode) => void;
}

const MODES: { id: StudyMode; label: string; description: string; icon: typeof BookOpen; color: string }[] = [
  { id: "normal", label: "Normal", description: "Flip card with known/unknown", icon: BookOpen, color: "var(--accent-green)" },
  { id: "quiz", label: "Quiz", description: "Multiple choice mode", icon: HelpCircle, color: "var(--accent-blue)" },
  { id: "type", label: "Type Answer", description: "Type the answer (spelling matters)", icon: Keyboard, color: "var(--accent-purple)" },
  { id: "speed", label: "Speed", description: "Rapid-fire (10s per card)", icon: Zap, color: "var(--accent-amber)" },
  { id: "voice", label: "Voice", description: "Voice tutor mode", icon: Mic, color: "var(--accent-rose)" },
];

export function StudyModeSelector({ value, onChange }: StudyModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-secondary">Study Mode</label>
      <div className="grid grid-cols-5 gap-2">
        {MODES.map((mode) => {
          const isActive = value === mode.id;
          return (
            <motion.button
              key={mode.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(mode.id)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
              style={{
                background: isActive ? `${mode.color}12` : "var(--bg-elevated)",
                border: `1px solid ${isActive ? `${mode.color}30` : "var(--border-subtle)"}`,
              }}
            >
              <mode.icon className="h-4 w-4" style={{ color: isActive ? mode.color : "var(--text-muted)" }} />
              <span className="text-[10px] font-medium" style={{ color: isActive ? mode.color : "var(--text-secondary)" }}>
                {mode.label}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[10px] text-text-muted">
        {MODES.find((m) => m.id === value)?.description}
      </p>
    </div>
  );
}
