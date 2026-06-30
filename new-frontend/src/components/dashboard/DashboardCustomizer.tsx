import { motion, Reorder } from "framer-motion";
import { X, GripVertical, RotateCcw } from "lucide-react";
import { useState } from "react";
import { backdrop, modal } from "../ui/constants";

interface DashboardCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardConfig;
  onConfigChange: (config: DashboardConfig) => void;
}

export interface DashboardConfig {
  widgets: { id: string; label: string; enabled: boolean; locked?: boolean }[];
  density: "compact" | "comfortable" | "spacious";
  accentColor: string;
}

const defaultWidgets = [
  { id: "hero", label: "Smart Hero", enabled: true, locked: true },
  { id: "stats", label: "Stat Cards", enabled: true },
  { id: "mastery", label: "Overall Mastery Ring", enabled: true },
  { id: "streak", label: "Streak & Daily Goal Tracker", enabled: true },
  { id: "heatmap", label: "Activity Heatmap", enabled: true },
  { id: "queue", label: "Focus Queue (What to Do Next)", enabled: true },
  { id: "quickActions", label: "Quick Actions", enabled: true },
  { id: "recentDecks", label: "Recent Decks", enabled: true },
  { id: "celebrations", label: "Celebrations & Achievements", enabled: true },
];

const accentColors = [
  { id: "cyan", label: "Cyan", color: "#06b6d4" },
  { id: "green", label: "Green", color: "#10b981" },
  { id: "purple", label: "Purple", color: "#8b5cf6" },
  { id: "amber", label: "Amber", color: "#f59e0b" },
  { id: "rose", label: "Rose", color: "#f43f5e" },
  { id: "blue", label: "Blue", color: "#3b82f6" },
];

export default function DashboardCustomizer({ isOpen, onClose, config, onConfigChange }: DashboardCustomizerProps) {
  const [localConfig, setLocalConfig] = useState<DashboardConfig>(config);

  const toggleWidget = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === id && !w.locked ? { ...w, enabled: !w.enabled } : w),
    }));
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    localStorage.setItem("dashboard_config", JSON.stringify(localConfig));
    onClose();
  };

  const handleReset = () => {
    const reset: DashboardConfig = {
      widgets: defaultWidgets.map(w => ({ ...w })),
      density: "comfortable",
      accentColor: "cyan",
    };
    setLocalConfig(reset);
  };

  if (!isOpen) return null;

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
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", boxShadow: "0 24px 48px -12px rgba(0,0,0,0.2)" }}
        variants={modal}
        initial="hidden"
        animate="visible"
        exit="hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
          <h3 className="font-display text-lg font-semibold text-text-primary">Customize Dashboard</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-white/5" style={{ color: "var(--text-muted)" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto">
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">Widgets</h4>
            <Reorder.Group axis="y" values={localConfig.widgets} onReorder={(w) => setLocalConfig(prev => ({ ...prev, widgets: w }))} className="space-y-1">
              {localConfig.widgets.map(widget => (
                <Reorder.Item key={widget.id} value={widget} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                  <GripVertical className="h-4 w-4 text-text-muted cursor-grab" />
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={widget.enabled}
                      onChange={() => toggleWidget(widget.id)}
                      disabled={widget.locked}
                      className="rounded"
                      style={{ accentColor: "var(--accent-green)" }}
                    />
                    <span className="text-sm text-text-primary">{widget.label}</span>
                    {widget.locked && <span className="text-[10px] text-text-muted">(always on)</span>}
                  </label>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">Density</h4>
            <div className="flex gap-2">
              {(["compact", "comfortable", "spacious"] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setLocalConfig(prev => ({ ...prev, density: d }))}
                  className="flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all"
                  style={{
                    background: localConfig.density === d ? "rgba(6, 182, 212, 0.15)" : "var(--bg-elevated)",
                    border: `1px solid ${localConfig.density === d ? "rgba(6, 182, 212, 0.3)" : "var(--border-subtle)"}`,
                    color: localConfig.density === d ? "var(--accent-green)" : "var(--text-secondary)",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">Accent Color</h4>
            <div className="flex gap-2">
              {accentColors.map(ac => (
                <button
                  key={ac.id}
                  onClick={() => setLocalConfig(prev => ({ ...prev, accentColor: ac.id }))}
                  className="h-8 w-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: ac.color,
                    boxShadow: localConfig.accentColor === ac.id ? `0 0 0 3px ${ac.color}40` : "none",
                    transform: localConfig.accentColor === ac.id ? "scale(1.1)" : "scale(1)",
                  }}
                  title={ac.label}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
          <button onClick={handleReset} className="text-xs text-text-muted hover:text-text-secondary flex items-center gap-1">
            <RotateCcw className="h-3 w-3" />
            Reset to defaults
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-white font-semibold text-sm"
            style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
          >
            Apply
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
