import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";
import { modal, backdrop } from "../ui/constants";

interface StreakSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: {
    dailyGoalMinutes: number;
    dailyGoalCards: number;
    reminderTime: string;
  };
  onSave: (settings: { dailyGoalMinutes: number; dailyGoalCards: number; reminderTime: string }) => void;
}

export default function StreakSettingsModal({ isOpen, onClose, currentSettings, onSave }: StreakSettingsModalProps) {
  const [minutes, setMinutes] = useState(currentSettings.dailyGoalMinutes);
  const [cards, setCards] = useState(currentSettings.dailyGoalCards);
  const [reminderTime, setReminderTime] = useState(currentSettings.reminderTime || "");

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ dailyGoalMinutes: minutes, dailyGoalCards: cards, reminderTime });
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      variants={backdrop}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", boxShadow: "0 24px 48px -12px rgba(0,0,0,0.2)" }}
        variants={modal}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
          <h3 className="font-display text-lg font-semibold text-text-primary">Daily Goals</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-white/5" style={{ color: "var(--text-muted)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Study Time (minutes)</label>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={minutes}
              onChange={e => setMinutes(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--accent-green)" }}
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>10 min</span>
              <span className="font-semibold text-text-primary">{minutes} min</span>
              <span>120 min</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Card Count</label>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={cards}
              onChange={e => setCards(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--accent-green)" }}
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>10 cards</span>
              <span className="font-semibold text-text-primary">{cards} cards</span>
              <span>200 cards</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Reminder Time</label>
            <input
              type="time"
              value={reminderTime}
              onChange={e => setReminderTime(e.target.value)}
              className="w-full rounded-xl text-sm px-3 py-2.5 outline-none"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <p className="text-[10px] text-text-muted mt-1">Get notified if you haven't studied by this time</p>
          </div>
        </div>

        <div className="p-5 border-t flex justify-end" style={{ borderColor: "var(--border-subtle)" }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-white font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
          >
            Save Goals
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
