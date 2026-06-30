import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; label: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: "Space", label: "Reveal answer / Mark known" },
      { keys: "←", label: "Previous card" },
      { keys: "→", label: "Next card" },
    ],
  },
  {
    title: "Rating",
    shortcuts: [
      { keys: "1", label: "Again (difficult)" },
      { keys: "2", label: "Hard" },
      { keys: "3", label: "Good" },
      { keys: "4", label: "Easy" },
      { keys: "5", label: "Too Easy" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: "K", label: "Mark as Known" },
      { keys: "U", label: "Mark as Unknown" },
      { keys: "F", label: "Flag card for later" },
      { keys: "S", label: "Shuffle remaining cards" },
      { keys: "Esc", label: "Exit study session" },
    ],
  },
];

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsOverlay({ isOpen, onClose }: ShortcutsOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          onClick={onClose}
        >
          <div className="absolute inset-0" style={{ background: 'var(--bg-void)', backdropFilter: 'blur(24px)' }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md rounded-2xl p-6"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--glass-border-light)",
              boxShadow: "0 24px 48px -12px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-text-primary">Keyboard Shortcuts</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-2">{group.title}</h4>
                  <div className="space-y-1.5">
                    {group.shortcuts.map((shortcut) => (
                      <div key={shortcut.keys} className="flex items-center justify-between py-1">
                        <span className="text-xs text-text-secondary">{shortcut.label}</span>
                        <kbd
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium"
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 text-center" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <p className="text-[10px] text-text-muted">Press <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>?</kbd> to toggle this overlay</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
