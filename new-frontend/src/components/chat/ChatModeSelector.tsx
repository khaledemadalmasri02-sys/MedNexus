import { motion } from "framer-motion";
import { Zap, GraduationCap } from "lucide-react";
import type { ChatMode } from "../../hooks/useChat";

interface ChatModeSelectorProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

export default function ChatModeSelector({ mode, onModeChange, disabled }: ChatModeSelectorProps) {
  const isBrief = mode === "brief";

  return (
    <div
      className="relative flex items-center rounded-xl p-0.5"
      style={{
        background: "var(--bg-deep)",
        border: "1px solid var(--border-default)",
      }}
    >
      <motion.div
        className="absolute rounded-lg"
        style={{
          background: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
          top: 2,
          bottom: 2,
          left: 2,
          right: 2,
          width: "calc(50% - 4px)",
        }}
        animate={{ x: isBrief ? 0 : "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />

      <button
        onClick={() => onModeChange("brief")}
        disabled={disabled}
        className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 disabled:opacity-50"
        style={{
          color: isBrief ? "#fff" : "var(--text-secondary)",
        }}
      >
        <Zap className="w-3 h-3" />
        <span>Brief</span>
      </button>

      <button
        onClick={() => onModeChange("academic")}
        disabled={disabled}
        className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 disabled:opacity-50"
        style={{
          color: !isBrief ? "#fff" : "var(--text-secondary)",
        }}
      >
        <GraduationCap className="w-3 h-3" />
        <span>Academic</span>
      </button>
    </div>
  );
}
