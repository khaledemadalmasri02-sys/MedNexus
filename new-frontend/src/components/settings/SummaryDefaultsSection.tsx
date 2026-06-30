import { motion } from "framer-motion";
import { FileText, Layers, Volume2, RotateCcw } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { Toggle } from "./Toggle";
import type { Settings } from "../../hooks/useSettings";

interface SummaryDefaultsSectionProps {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onReset: () => void;
}

const STYLE_OPTIONS = [
  { value: "academic", label: "Academic" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
  { value: "clinical", label: "Clinical" },
  { value: "cornell", label: "Cornell" },
  { value: "smart-briefing", label: "Smart Brief" },
];

const CHUNK_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function SummaryDefaultsSection({ settings, updateSetting, onReset }: SummaryDefaultsSectionProps) {
  return (
    <SettingsSection title="Summary Defaults" description="These settings are used every time you generate a summary">
      <div className="px-5 pb-5 space-y-1">
        <div className="px-4 py-3.5 rounded-xl" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--glass-surface)" }}
            >
              <FileText className="w-4.5 h-4.5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Default Style</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Modern (colored section blocks)</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {STYLE_OPTIONS.map(opt => (
              <motion.button
                key={opt.value}
                onClick={() => updateSetting("defaultStyle", opt.value)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-medium focus-ring-theme"
                style={{
                  background: settings.defaultStyle === opt.value ? "var(--accent-green)" : "var(--glass-surface)",
                  color: settings.defaultStyle === opt.value ? "white" : "var(--text-secondary)",
                  border: "1px solid",
                  borderColor: settings.defaultStyle === opt.value ? "var(--accent-green)" : "var(--glass-border)",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`${opt.value} style`}
              >
                {opt.label}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3.5 rounded-xl" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--glass-surface)" }}
            >
              <Layers className="w-4.5 h-4.5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Generation Mode</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>How summaries are generated</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            {[
              { value: "combined", label: "Combined", desc: "One PDF with chapters" },
              { value: "separate", label: "Separate", desc: "Individual PDFs per file" },
            ].map(opt => (
              <motion.button
                key={opt.value}
                onClick={() => updateSetting("defaultMode", opt.value)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs focus-ring-theme"
                style={{
                  background: settings.defaultMode === opt.value ? "rgba(34,197,94,0.1)" : "var(--glass-surface)",
                  border: "1px solid",
                  borderColor: settings.defaultMode === opt.value ? "var(--accent-green)" : "var(--glass-border)",
                  color: settings.defaultMode === opt.value ? "var(--text-primary)" : "var(--text-secondary)",
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{
                    border: `2px solid ${settings.defaultMode === opt.value ? "var(--accent-green)" : "var(--text-muted)"}`,
                  }}
                >
                  {settings.defaultMode === opt.value && (
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--accent-green)" }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    />
                  )}
                </div>
                <div className="text-left">
                  <span className="font-medium">{opt.label}</span>
                  <span className="ml-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>{opt.desc}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="px-4 py-3.5 rounded-xl" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--glass-surface)" }}
            >
              <Volume2 className="w-4.5 h-4.5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Auto-generate Audio</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Creates a spoken version of your summary</p>
            </div>
          </div>
          <div className="mt-3">
            <Toggle checked={settings.autoTts as boolean} onChange={v => updateSetting("autoTts", v)} />
          </div>
        </div>

        <div className="px-4 py-3.5 rounded-xl" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--glass-surface)" }}
            >
              <FileText className="w-4.5 h-4.5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Chunk Size</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Files per processing batch</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {CHUNK_SIZES.map(size => (
              <motion.button
                key={size}
                onClick={() => updateSetting("chunkSize", size)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold focus-ring-theme"
                style={{
                  background: settings.chunkSize === size ? "var(--accent-green)" : "var(--glass-surface)",
                  color: settings.chunkSize === size ? "white" : "var(--text-secondary)",
                  border: "1px solid",
                  borderColor: settings.chunkSize === size ? "var(--accent-green)" : "var(--glass-border)",
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                aria-label={`${size} files per batch`}
              >
                {size}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <motion.button
          onClick={onReset}
          className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-lg"
          style={{
            background: "var(--glass-surface)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-muted)",
          }}
          whileHover={{ color: "var(--text-secondary)", borderColor: "var(--border-default)" }}
          whileTap={{ scale: 0.95 }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to defaults
        </motion.button>
      </div>
    </SettingsSection>
  );
}
