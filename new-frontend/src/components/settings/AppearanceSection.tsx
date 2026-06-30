import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Type, MousePointer2, Waves, Wind, RefreshCw, Check } from "lucide-react";
import { SettingRow } from "./SettingRow";
import { SettingsSection } from "./SettingsSection";
import { Toggle } from "./Toggle";
import { useTheme } from "../../context/ThemeContext";
import type { Settings } from "../../hooks/useSettings";
import type { ThemeDefinition } from "../../lib/themes";

interface AppearanceSectionProps {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const FONT_SIZES = [
  { value: "small", label: "A", size: "12px" },
  { value: "medium", label: "A", size: "14px" },
  { value: "large", label: "A", size: "16px" },
  { value: "xlarge", label: "A", size: "18px" },
];

const ANIMATION_SPEEDS = [
  { value: 0.5, label: "0.5x" },
  { value: 1, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
];

export function AppearanceSection({ settings, updateSetting }: AppearanceSectionProps) {
  const { themeId, theme, themes: themeList, setThemeId } = useTheme();

  const animSpeed = (settings.animationSpeed as number | undefined) ?? 1;
  const reduceMotion = settings.reduceMotion ?? false;
  const ambientEnabled = settings.ambientEnabled ?? true;
  const ripplesEnabled = settings.ripplesEnabled ?? true;
  const customCursorEnabled = settings.customCursorEnabled ?? true;

  const [showRefresh, setShowRefresh] = useState(false);
  const [refreshLabel, setRefreshLabel] = useState("Settings");
  const savedFontSize = useRef(settings.fontSize);
  const savedAmbient = useRef(settings.ambientEnabled);
  const savedAnimations = useRef(settings.animationsEnabled);
  const savedRipples = useRef(settings.ripplesEnabled);
  const savedCursor = useRef(settings.customCursorEnabled);
  const savedAnimSpeed = useRef(settings.animationSpeed);
  const savedReduceMotion = useRef(settings.reduceMotion);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRefresh = (label: string) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setRefreshLabel(label);
    setShowRefresh(true);
    refreshTimer.current = setTimeout(() => setShowRefresh(false), 5000);
  };

  useEffect(() => {
    if (savedFontSize.current !== settings.fontSize) {
      savedFontSize.current = settings.fontSize;
      triggerRefresh("Font Size");
    }
  }, [settings.fontSize]);

  useEffect(() => {
    if (savedAmbient.current !== settings.ambientEnabled) {
      savedAmbient.current = settings.ambientEnabled;
      triggerRefresh("Animation & Effects");
    }
  }, [settings.ambientEnabled]);

  useEffect(() => {
    if (savedAnimations.current !== settings.animationsEnabled) {
      savedAnimations.current = settings.animationsEnabled;
      triggerRefresh("Animation & Effects");
    }
  }, [settings.animationsEnabled]);

  useEffect(() => {
    if (savedRipples.current !== settings.ripplesEnabled) {
      savedRipples.current = settings.ripplesEnabled;
      triggerRefresh("Animation & Effects");
    }
  }, [settings.ripplesEnabled]);

  useEffect(() => {
    if (savedCursor.current !== settings.customCursorEnabled) {
      savedCursor.current = settings.customCursorEnabled;
      triggerRefresh("Animation & Effects");
    }
  }, [settings.customCursorEnabled]);

  useEffect(() => {
    if (savedAnimSpeed.current !== settings.animationSpeed) {
      savedAnimSpeed.current = settings.animationSpeed;
      triggerRefresh("Animation & Effects");
    }
  }, [settings.animationSpeed]);

  useEffect(() => {
    if (savedReduceMotion.current !== settings.reduceMotion) {
      savedReduceMotion.current = settings.reduceMotion;
      triggerRefresh("Animation & Effects");
    }
  }, [settings.reduceMotion]);

  function handleThemeSelect(t: ThemeDefinition) {
    setThemeId(t.id);
    updateSetting("theme_id", t.id);
  }

  return (
    <SettingsSection title="Appearance" description="Customize how MedNexus looks and feels">
      <div className="px-5 pb-5 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1 px-1">
            <div
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--glass-surface)" }}
            >
              <Sparkles className="w-4 h-4" style={{ color: "var(--accent-primary)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Theme</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Choose a full 3D background, surface palette, and tap effect</p>
            </div>
          </div>

          <div className="mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {themeList.map(t => {
                const isActive = themeId === t.id;
                return (
                  <motion.button
                    key={t.id}
                    type="button"
                    onClick={() => handleThemeSelect(t)}
                    className="group relative overflow-hidden rounded-2xl text-left transition-all duration-300"
                    style={{
                      background: isActive ? t.bgGlassStrong : t.bgGlass,
                      border: isActive ? `2px solid ${t.borderActive}` : "1px solid var(--border-default)",
                      boxShadow: isActive ? `0 12px 40px ${t.glowPrimary}` : "0 4px 16px rgba(0,0,0,0.08)",
                    }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    aria-pressed={isActive}
                    aria-label={`Select ${t.name} theme`}
                  >
                    <div className="absolute inset-0" style={{
                      background: t.id === "formula"
                        ? "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12), transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06), transparent 40%)"
                        : t.id === "tokyo"
                          ? "radial-gradient(circle at 25% 75%, rgba(255,107,53,0.3), transparent 36%), radial-gradient(circle at 75% 25%, rgba(0,204,255,0.18), transparent 34%)"
                          : t.id === "ember"
                            ? "radial-gradient(circle at 25% 75%, rgba(249,115,22,0.3), transparent 36%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.16), transparent 34%)"
                            : t.id === "clinical-white"
                              ? "radial-gradient(circle at 20% 20%, rgba(14,165,233,0.18), transparent 36%), radial-gradient(circle at 80% 15%, rgba(16,185,129,0.1), transparent 34%)"
                              : t.id === "surgical-green"
                                ? "radial-gradient(circle at 20% 20%, rgba(15,118,110,0.16), transparent 36%), radial-gradient(circle at 80% 15%, rgba(21,128,61,0.08), transparent 34%)"
                                : t.id === "warm-parchment"
                                  ? "radial-gradient(circle at 20% 20%, rgba(180,83,9,0.14), transparent 36%), radial-gradient(circle at 80% 15%, rgba(146,64,148), transparent 34%)"
                                  : t.id === "lavender-mist"
                                    ? "radial-gradient(circle at 20% 20%, rgba(124,58,237,0.14), transparent 36%), radial-gradient(circle at 80% 15%, rgba(109,40,217,0.08), transparent 34%)"
                                    : "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.25), transparent 36%), radial-gradient(circle at 80% 15%, rgba(139,92,246,0.18), transparent 34%)",
                    }} />

                    {isActive && (
                      <motion.div
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center z-10"
                        style={{ background: t.accentPrimary, boxShadow: `0 0 12px ${t.glowPrimary}` }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      >
                        <Check className="w-3.5 h-3.5" style={{ color: t.textOnAccent }} />
                      </motion.div>
                    )}

                    <div className="relative z-10 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                          style={{
                            background: t.gradientCta,
                            color: t.textOnAccent,
                            boxShadow: `0 8px 24px ${t.glowPrimary}`,
                          }}
                        >
                          {t.icon}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: t.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.7)",
                            color: t.mode === "dark" ? t.textSecondary : t.textPrimary,
                          }}
                        >
                          {t.mode}
                        </span>
                      </div>

                      <div
                        className="rounded-xl p-3 mb-3"
                        style={{
                          background: t.id === "formula"
                            ? "rgba(255,255,255,0.04)"
                            : t.id === "tokyo"
                              ? "rgba(20,20,45,0.7)"
                              : t.id === "ember"
                                ? "rgba(42,19,12,0.7)"
                                : t.mode === "light" ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.6)",
                          border: "1px solid var(--glass-border)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: t.accentPrimary }} />
                          <div className="h-2 flex-1 rounded-full" style={{ background: t.gradientText, maxWidth: "60%" }} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-1.5 w-full rounded-full" style={{ background: t.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.15)" }} />
                          <div className="h-1.5 w-3/4 rounded-full" style={{ background: t.mode === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)" }} />
                          <div className="h-1.5 w-1/2 rounded-full" style={{ background: t.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)" }} />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-bold" style={{ color: t.textPrimary }}>{t.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: t.textSecondary }}>
                          {t.id === "nebula" && "Deep space nebula with starfield particles"}
                          {t.id === "ember" && "Volcanic forge with ember sparks"}
                          {t.id === "tokyo" && "Neon city street with rain effects"}
                          {t.id === "car-drift" && "Underground racing with light trails"}
                          {t.id === "formula" && "Minimal monochrome with sharp contrast"}
                          {t.id === "clinical-white" && "Clean clinical environment"}
                          {t.id === "surgical-green" && "Calm medical green tones"}
                          {t.id === "warm-parchment" && "Warm study desk aesthetic"}
                          {t.id === "lavender-mist" && "Soft purple lavender fields"}
                        </p>
                      </div>

                      <div className="flex gap-1.5 mt-3">
                        {[t.accentPrimary, t.accentSecondary, t.accentTertiary, t.bgSurface, t.bgElevated].map((color, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-md"
                            style={{
                              background: color,
                              border: "1px solid rgba(255,255,255,0.1)",
                              boxShadow: i === 0 ? `0 0 8px ${color}66` : "none",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showRefresh && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-xs px-1"
              style={{ color: "var(--text-muted)" }}
            >
              <RefreshCw size={12} />
              <span>{refreshLabel} changed — refresh to apply</span>
              <button
                onClick={() => window.location.reload()}
                className="ml-1 px-2 py-0.5 rounded-md text-[10px] font-semibold focus-ring-theme"
                style={{
                  background: "var(--accent-primary)",
                  color: "var(--text-on-accent)",
                }}
              >
                Refresh
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <SettingRow icon={Type} label="Font Size" description="Adjust text size">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1">
              {FONT_SIZES.map(opt => (
                <motion.button
                  key={opt.value}
                  onClick={() => updateSetting("fontSize", opt.value)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center font-semibold focus-ring-theme"
                  style={{
                    background: settings.fontSize === opt.value ? "var(--accent-primary)" : "var(--glass-surface)",
                    color: settings.fontSize === opt.value ? "var(--text-on-accent)" : "var(--text-secondary)",
                    fontSize: opt.size,
                    border: "1px solid",
                    borderColor: settings.fontSize === opt.value ? "var(--accent-primary)" : "var(--glass-border)",
                  }}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  aria-label={`${opt.value} font size`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>
        </SettingRow>

        <div className="pt-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs font-semibold mb-3 px-1" style={{ color: "var(--text-muted)" }}>Animation & Effects</p>

          <div className="space-y-1">
            <SettingRow icon={Sparkles} label="Interface Animations" description="Enable animations throughout the UI">
              <Toggle checked={settings.animationsEnabled as boolean} onChange={v => updateSetting("animationsEnabled", v)} />
            </SettingRow>

            <SettingRow icon={Wind} label="Ambient Background" description="Animated particles and effects">
              <Toggle checked={ambientEnabled} onChange={v => updateSetting("ambientEnabled", v)} />
            </SettingRow>

            <SettingRow icon={Waves} label="Click Ripples" description="Tap/click visual feedback">
              <Toggle checked={ripplesEnabled} onChange={v => updateSetting("ripplesEnabled", v)} />
            </SettingRow>

            <SettingRow icon={MousePointer2} label="Custom Cursor" description="Desktop only">
              <Toggle checked={customCursorEnabled} onChange={v => updateSetting("customCursorEnabled", v)} />
            </SettingRow>

            <SettingRow icon={Sparkles} label="Animation Speed" description={`${animSpeed}x speed`}>
              <div className="flex gap-1">
                {ANIMATION_SPEEDS.map(opt => (
                  <motion.button
                    key={opt.value}
                    onClick={() => updateSetting("animationSpeed", opt.value)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-medium focus-ring-theme"
                    style={{
                      background: animSpeed === opt.value ? "var(--accent-primary)" : "var(--glass-surface)",
                      color: animSpeed === opt.value ? "var(--text-on-accent)" : "var(--text-secondary)",
                      border: "1px solid",
                      borderColor: animSpeed === opt.value ? "var(--accent-primary)" : "var(--glass-border)",
                    }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </SettingRow>

            <SettingRow icon={Sparkles} label="Reduce Motion" description="Minimize animations for accessibility">
              <Toggle checked={reduceMotion} onChange={v => updateSetting("reduceMotion", v)} />
            </SettingRow>
          </div>
        </div>

        <div className="px-1 pb-1">
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>Live theme preview</p>
          <div
            className="rounded-2xl p-4"
            style={{ background: "var(--glass-surface-faint)", border: "1px dashed var(--glass-border)" }}
          >
            <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <motion.div
                className="rounded-2xl p-5"
                style={{
                  background: "var(--glass-card-bg)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: settings.animationsEnabled ? "0 14px 34px var(--glow-primary)" : "none",
                }}
                animate={{ scale: settings.animationsEnabled ? [1, 1.015, 1] : 1 }}
                transition={{ duration: 0.35 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ background: "var(--accent-primary)", boxShadow: `0 0 16px var(--glow-primary)` }} />
                  <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Sample Card</div>
                </div>
                <div className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                  "What is the mechanism of action of beta blockers?"
                </div>
                <div className="flex gap-2">
                  <div className="h-2 w-16 rounded-full" style={{ background: "var(--accent-primary)", opacity: 0.4 }} />
                  <div className="h-2 w-12 rounded-full" style={{ background: "var(--accent-secondary)", opacity: 0.3 }} />
                </div>
              </motion.div>

              <div className="space-y-2.5">
                <button type="button" className="btn-primary focus-ring-theme w-full rounded-xl px-4 py-2.5 text-sm font-semibold">Primary button</button>
                <button type="button" className="btn-secondary focus-ring-theme w-full rounded-xl px-4 py-2.5 text-sm font-semibold">Secondary button</button>
                <input className="input-theme focus-ring-theme w-full rounded-xl px-4 py-2.5 text-sm" placeholder="Input field" />
                <div className="inline-flex rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: theme.gradientCta, color: theme.textOnAccent, border: `1px solid ${theme.borderActive}`, boxShadow: `0 8px 20px ${theme.glowPrimary}` }}>Active tab pill</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
