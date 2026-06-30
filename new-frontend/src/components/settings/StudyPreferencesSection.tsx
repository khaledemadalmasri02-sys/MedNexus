import { motion } from "framer-motion";
import { Target, BookOpen, Clock, Shuffle, Eye, MessageSquare, Snowflake } from "lucide-react";
import { SettingRow } from "./SettingRow";
import { SettingsSection } from "./SettingsSection";
import { Toggle } from "./Toggle";
import type { Settings } from "../../hooks/useSettings";

interface StudyPreferencesSectionProps {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export function StudyPreferencesSection({ settings, updateSetting }: StudyPreferencesSectionProps) {
  const dailyGoalCards = settings.dailyGoalCards || 50;
  const dailyGoalMinutes = settings.dailyGoalMinutes || 30;
  const CARD_OPTIONS = [10, 20, 30, 50, 75, 100];
  const TIME_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120];
  return (
    <SettingsSection title="Study Preferences" description="Configure your study sessions and goals">
      <div className="px-5 pb-5 space-y-1">
        <div className="mb-3 p-3 rounded-xl" style={{ background: "var(--glass-surface-faint)", border: "1px solid var(--glass-border)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" style={{ color: "var(--accent-green)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Daily Study Goal</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--accent-green)" }}>{dailyGoalCards}</span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>cards</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--accent-blue)" }}>{dailyGoalMinutes}</span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>minutes</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3.5 rounded-xl" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--glass-surface)" }}
            >
              <BookOpen className="w-4.5 h-4.5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Cards per session</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>How many cards to study at once</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {CARD_OPTIONS.map(size => (
              <motion.button
                key={size}
                onClick={() => updateSetting("dailyGoalCards", size)}
                className="w-10 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold focus-ring-theme"
                style={{
                  background: dailyGoalCards === size ? "var(--accent-green)" : "var(--glass-surface)",
                  color: dailyGoalCards === size ? "white" : "var(--text-secondary)",
                  border: "1px solid",
                  borderColor: dailyGoalCards === size ? "var(--accent-green)" : "var(--glass-border)",
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                aria-label={`${size} cards per session`}
              >
                {size}
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
              <Clock className="w-4.5 h-4.5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Daily study time goal</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Target study time per day</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {TIME_OPTIONS.map(mins => (
              <motion.button
                key={mins}
                onClick={() => updateSetting("dailyGoalMinutes", mins)}
                className="w-12 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold focus-ring-theme"
                style={{
                  background: dailyGoalMinutes === mins ? "var(--accent-blue)" : "var(--glass-surface)",
                  color: dailyGoalMinutes === mins ? "white" : "var(--text-secondary)",
                  border: "1px solid",
                  borderColor: dailyGoalMinutes === mins ? "var(--accent-blue)" : "var(--glass-border)",
                }}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                aria-label={`${mins} minutes per day`}
              >
                {mins}
              </motion.button>
            ))}
          </div>
        </div>

        <SettingRow icon={Shuffle} label="Card order" description="How cards are ordered during study">
          <div className="flex flex-col gap-1.5 items-end">
            {[
              { value: "sequential", label: "Sequential", desc: "As generated" },
              { value: "shuffled", label: "Shuffled", desc: "Random order" },
              { value: "weakest", label: "Weakest first", desc: "Lowest mastery" },
            ].map(opt => (
              <motion.button
                key={opt.value}
                onClick={() => updateSetting("cardOrder", opt.value)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                style={{
                  background: settings.cardOrder === opt.value ? "rgba(34,197,94,0.1)" : "var(--glass-surface)",
                  border: "1px solid",
                  borderColor: settings.cardOrder === opt.value ? "var(--accent-green)" : "var(--glass-border)",
                  color: settings.cardOrder === opt.value ? "var(--text-primary)" : "var(--text-secondary)",
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ border: `2px solid ${settings.cardOrder === opt.value ? "var(--accent-green)" : "var(--text-muted)"}` }}
                >
                  {settings.cardOrder === opt.value && (
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
                  <span className="ml-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>({opt.desc})</span>
                </div>
              </motion.button>
            ))}
          </div>
        </SettingRow>

        <SettingRow icon={Eye} label="Auto-reveal answer" description="Automatically show answer after a delay">
          <Toggle checked={settings.autoReveal as boolean} onChange={v => updateSetting("autoReveal", v)} />
        </SettingRow>

        {settings.autoReveal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <SettingRow icon={Clock} label="Auto-reveal delay" description="Seconds before showing answer">
              <select
                value={settings.autoRevealSeconds as number}
                onChange={e => updateSetting("autoRevealSeconds", Number(e.target.value))}
                className="text-xs rounded-lg px-3 py-1.5 outline-none"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              >
                {[3, 5, 10, 15, 20].map(s => (
                  <option key={s} value={s}>{s} seconds</option>
                ))}
              </select>
            </SettingRow>
          </motion.div>
        )}

        <SettingRow icon={MessageSquare} label="Show explanation" description="Display AI explanation when answer is revealed">
          <Toggle checked={settings.showExplanation as boolean} onChange={v => updateSetting("showExplanation", v)} />
        </SettingRow>

        <SettingRow icon={Snowflake} label="Streak freeze" description="Allow one missed day per week without breaking streak">
          <Toggle checked={settings.streakFreeze as boolean} onChange={v => updateSetting("streakFreeze", v)} />
        </SettingRow>
      </div>
    </SettingsSection>
  );
}
