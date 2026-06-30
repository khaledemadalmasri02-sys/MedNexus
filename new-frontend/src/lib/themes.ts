export type ThemeId = "nebula" | "ember" | "tokyo" | "car-drift" | "formula" | "clinical-white" | "surgical-green" | "warm-parchment" | "lavender-mist";
export type ThemeMode = "dark" | "light" | "system";
export type ThemeTapShape = "orb" | "spark" | "petal" | "crystal" | "hex";
export type ThemeBackgroundType = "nebula" | "ember" | "tokyo" | "car-drift" | "formula" | "clinical-white" | "surgical-green" | "warm-parchment" | "lavender-mist";

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  icon: string;
  mode: "dark" | "light";
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  bgSolid: string;
  bgRgb: string;
  bgDeep: string;
  bgSurface: string;
  bgElevated: string;
  bgGlass: string;
  bgGlassStrong: string;
  borderSubtle: string;
  borderDefault: string;
  borderActive: string;
  glowPrimary: string;
  glowSecondary: string;
  gradientText: string;
  gradientCta: string;
  tapColor: string;
  tapGlow: string;
  tapShape: ThemeTapShape;
  backgroundType: ThemeBackgroundType;
}

export const THEME_IDS: ThemeId[] = ["nebula", "ember", "tokyo", "car-drift", "formula", "clinical-white", "surgical-green", "warm-parchment", "lavender-mist"];
export const THEME_MODES: ThemeMode[] = ["dark", "light", "system"];

export const ACCENT_HEX_BY_ID: Record<string, string> = {
  green: "#22C55E",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  violet: "#8B5CF6",
  cyan: "#06B6D4",
  amber: "#F59E0B",
  rose: "#F43F5E",
  orange: "#F97316",
  emerald: "#10B981",
};

export const themes: ThemeDefinition[] = [
  {
    id: "nebula",
    name: "Nebula",
    icon: "✦",
    mode: "dark",
    accentPrimary: "#38BDF8",
    accentSecondary: "#8B5CF6",
    accentTertiary: "#22D3EE",
    textPrimary: "#F8FAFC",
    textSecondary: "#B6C3D9",
    textMuted: "#8EA0BD",
    textOnAccent: "#FFFFFF",
    bgSolid: "#050816",
    bgRgb: "5, 8, 22",
    bgDeep: "#080B1F",
    bgSurface: "#10182F",
    bgElevated: "rgba(15, 23, 42, 0.72)",
    bgGlass: "rgba(10, 18, 38, 0.58)",
    bgGlassStrong: "rgba(8, 13, 30, 0.86)",
    borderSubtle: "rgba(148, 163, 184, 0.08)",
    borderDefault: "rgba(148, 163, 184, 0.16)",
    borderActive: "rgba(56, 189, 248, 0.44)",
    glowPrimary: "rgba(56, 189, 248, 0.32)",
    glowSecondary: "rgba(139, 92, 246, 0.26)",
    gradientText: "linear-gradient(135deg, #67E8F9 0%, #A78BFA 55%, #FFFFFF 100%)",
    gradientCta: "linear-gradient(135deg, #0EA5E9 0%, #8B5CF6 100%)",
    tapColor: "rgba(34, 211, 238, 0.58)",
    tapGlow: "rgba(34, 211, 238, 0.36)",
    tapShape: "orb",
    backgroundType: "nebula",
  },
  {
    id: "ember",
    name: "Ember Forge",
    icon: "♨",
    mode: "dark",
    accentPrimary: "#FB7185",
    accentSecondary: "#F59E0B",
    accentTertiary: "#F97316",
    textPrimary: "#FFF7ED",
    textSecondary: "#FED7AA",
    textMuted: "#C4A484",
    textOnAccent: "#FFFFFF",
    bgSolid: "#130806",
    bgRgb: "19, 8, 6",
    bgDeep: "#1B0B07",
    bgSurface: "#2A130C",
    bgElevated: "rgba(42, 19, 12, 0.74)",
    bgGlass: "rgba(29, 12, 7, 0.6)",
    bgGlassStrong: "rgba(20, 8, 5, 0.88)",
    borderSubtle: "rgba(251, 146, 60, 0.1)",
    borderDefault: "rgba(251, 146, 60, 0.18)",
    borderActive: "rgba(251, 113, 133, 0.46)",
    glowPrimary: "rgba(249, 115, 22, 0.34)",
    glowSecondary: "rgba(245, 158, 11, 0.28)",
    gradientText: "linear-gradient(135deg, #FED7AA 0%, #FB7185 55%, #FDE68A 100%)",
    gradientCta: "linear-gradient(135deg, #F97316 0%, #FB7185 100%)",
    tapColor: "rgba(249, 115, 22, 0.62)",
    tapGlow: "rgba(245, 158, 11, 0.38)",
    tapShape: "spark",
    backgroundType: "ember",
  },
  {
    id: "tokyo",
     name: "Tokyo Street",
     icon: "🏙",
     mode: "dark",
     accentPrimary: "#FF6B35",
     accentSecondary: "#00CCFF",
     accentTertiary: "#FFD93D",
     textPrimary: "#F0F0F0",
     textSecondary: "#B0B8C8",
     textMuted: "#7A8498",
     textOnAccent: "#FFFFFF",
     bgSolid: "#0D0D1A",
     bgRgb: "13, 13, 26",
     bgDeep: "#12122A",
     bgSurface: "#1A1A35",
     bgElevated: "rgba(20, 20, 45, 0.78)",
     bgGlass: "rgba(15, 15, 35, 0.62)",
     bgGlassStrong: "rgba(10, 10, 28, 0.9)",
     borderSubtle: "rgba(255, 107, 53, 0.08)",
     borderDefault: "rgba(255, 107, 53, 0.16)",
     borderActive: "rgba(255, 107, 53, 0.44)",
     glowPrimary: "rgba(255, 107, 53, 0.32)",
     glowSecondary: "rgba(0, 204, 255, 0.26)",
     gradientText: "linear-gradient(135deg, #FF6B35 0%, #FFD93D 50%, #00CCFF 100%)",
     gradientCta: "linear-gradient(135deg, #FF6B35 0%, #FF3300 100%)",
     tapColor: "rgba(255, 107, 53, 0.58)",
     tapGlow: "rgba(255, 107, 53, 0.36)",
     tapShape: "orb",
      backgroundType: "tokyo",
    },
    {
      id: "car-drift",
      name: "Car Drift",
      icon: "🏎",
      mode: "dark",
      accentPrimary: "#06B6D4",
      accentSecondary: "#EC4899",
      accentTertiary: "#F97316",
      textPrimary: "#F0F9FF",
      textSecondary: "#A5B4FC",
      textMuted: "#64748B",
      textOnAccent: "#FFFFFF",
      bgSolid: "#0A0A0F",
      bgRgb: "10, 10, 15",
      bgDeep: "#0F0F1A",
      bgSurface: "#1A1A2E",
      bgElevated: "rgba(26, 26, 46, 0.78)",
      bgGlass: "rgba(15, 15, 25, 0.62)",
      bgGlassStrong: "rgba(10, 10, 15, 0.9)",
      borderSubtle: "rgba(6, 182, 212, 0.1)",
      borderDefault: "rgba(6, 182, 212, 0.18)",
      borderActive: "rgba(6, 182, 212, 0.48)",
      glowPrimary: "rgba(6, 182, 212, 0.32)",
      glowSecondary: "rgba(236, 72, 153, 0.28)",
      gradientText: "linear-gradient(135deg, #06B6D4 0%, #EC4899 50%, #F97316 100%)",
      gradientCta: "linear-gradient(135deg, #06B6D4 0%, #EC4899 100%)",
      tapColor: "rgba(6, 182, 212, 0.55)",
      tapGlow: "rgba(236, 72, 153, 0.32)",
     tapShape: "orb",
       backgroundType: "car-drift",
     },
   {
     id: "formula",
     name: "Formula",
     icon: "◉",
     mode: "dark",
     accentPrimary: "#FFFFFF",
     accentSecondary: "#000000",
     accentTertiary: "#94A3B8",
     textPrimary: "#FFFFFF",
     textSecondary: "#B0B0B0",
     textMuted: "#707070",
     textOnAccent: "#000000",
     bgSolid: "#000000",
     bgRgb: "0, 0, 0",
     bgDeep: "#050505",
     bgSurface: "#0A0A0A",
     bgElevated: "rgba(20, 20, 20, 0.85)",
     bgGlass: "rgba(10, 10, 10, 0.62)",
     bgGlassStrong: "rgba(5, 5, 5, 0.9)",
     borderSubtle: "rgba(255, 255, 255, 0.08)",
     borderDefault: "rgba(255, 255, 255, 0.16)",
     borderActive: "rgba(255, 255, 255, 0.48)",
     glowPrimary: "rgba(255, 255, 255, 0.32)",
     glowSecondary: "rgba(255, 255, 255, 0.18)",
     gradientText: "linear-gradient(135deg, #FFFFFF 0%, #94A3B8 55%, #FFFFFF 100%)",
     gradientCta: "linear-gradient(135deg, #FFFFFF 0%, #000000 100%)",
     tapColor: "rgba(255, 255, 255, 0.85)",
     tapGlow: "rgba(0, 0, 0, 0.45)",
     tapShape: "orb",
      backgroundType: "formula",
    },
    {
      id: "clinical-white",
      name: "Clinical White",
      icon: "◈",
      mode: "light",
      accentPrimary: "#0EA5E9",
      accentSecondary: "#10B981",
      accentTertiary: "#6366F1",
      textPrimary: "#0F172A",
      textSecondary: "#475569",
      textMuted: "#94A3B8",
      textOnAccent: "#FFFFFF",
      bgSolid: "#F8FAFC",
      bgRgb: "248, 250, 252",
      bgDeep: "#F1F5F9",
      bgSurface: "#FFFFFF",
      bgElevated: "rgba(255, 255, 255, 0.85)",
      bgGlass: "rgba(255, 255, 255, 0.72)",
      bgGlassStrong: "rgba(248, 250, 252, 0.92)",
      borderSubtle: "rgba(15, 23, 42, 0.06)",
      borderDefault: "rgba(15, 23, 42, 0.12)",
      borderActive: "rgba(14, 165, 233, 0.42)",
      glowPrimary: "rgba(14, 165, 233, 0.18)",
      glowSecondary: "rgba(16, 185, 129, 0.14)",
      gradientText: "linear-gradient(135deg, #0369A1 0%, #0F766E 55%, #6366F1 100%)",
      gradientCta: "linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)",
      tapColor: "rgba(14, 165, 233, 0.42)",
      tapGlow: "rgba(14, 165, 233, 0.22)",
      tapShape: "orb",
      backgroundType: "clinical-white",
    },
    {
      id: "surgical-green",
      name: "Surgical Green",
      icon: "◉",
      mode: "light",
      accentPrimary: "#0F766E",
      accentSecondary: "#15803D",
      accentTertiary: "#0369A1",
      textPrimary: "#14532D",
      textSecondary: "#374151",
      textMuted: "#6B7280",
      textOnAccent: "#FFFFFF",
      bgSolid: "#F0FDF4",
      bgRgb: "240, 253, 244",
      bgDeep: "#DCFCE7",
      bgSurface: "#FFFFFF",
      bgElevated: "rgba(255, 255, 255, 0.88)",
      bgGlass: "rgba(255, 255, 255, 0.75)",
      bgGlassStrong: "rgba(240, 253, 244, 0.94)",
      borderSubtle: "rgba(15, 118, 110, 0.08)",
      borderDefault: "rgba(15, 118, 110, 0.14)",
      borderActive: "rgba(15, 118, 110, 0.42)",
      glowPrimary: "rgba(15, 118, 110, 0.16)",
      glowSecondary: "rgba(21, 128, 61, 0.12)",
      gradientText: "linear-gradient(135deg, #0F766E 0%, #15803D 55%, #0369A1 100%)",
      gradientCta: "linear-gradient(135deg, #0F766E 0%, #15803D 100%)",
      tapColor: "rgba(15, 118, 110, 0.40)",
      tapGlow: "rgba(21, 128, 61, 0.20)",
      tapShape: "orb",
      backgroundType: "surgical-green",
    },
    {
      id: "warm-parchment",
      name: "Warm Parchment",
      icon: "✦",
      mode: "light",
      accentPrimary: "#B45309",
      accentSecondary: "#92400E",
      accentTertiary: "#7C2D12",
      textPrimary: "#292524",
      textSecondary: "#57534E",
      textMuted: "#78716C",
      textOnAccent: "#FFFFFF",
      bgSolid: "#FAF7F2",
      bgRgb: "250, 247, 242",
      bgDeep: "#F5F0E8",
      bgSurface: "#FFFDF9",
      bgElevated: "rgba(255, 253, 249, 0.88)",
      bgGlass: "rgba(255, 253, 249, 0.78)",
      bgGlassStrong: "rgba(250, 247, 242, 0.94)",
      borderSubtle: "rgba(180, 83, 9, 0.08)",
      borderDefault: "rgba(180, 83, 9, 0.14)",
      borderActive: "rgba(180, 83, 9, 0.40)",
      glowPrimary: "rgba(180, 83, 9, 0.14)",
      glowSecondary: "rgba(146, 64, 14, 0.10)",
      gradientText: "linear-gradient(135deg, #B45309 0%, #92400E 55%, #7C2D12 100%)",
      gradientCta: "linear-gradient(135deg, #B45309 0%, #92400E 100%)",
      tapColor: "rgba(180, 83, 9, 0.38)",
      tapGlow: "rgba(146, 64, 14, 0.18)",
      tapShape: "orb",
      backgroundType: "warm-parchment",
    },
    {
      id: "lavender-mist",
      name: "Lavender Mist",
      icon: "✧",
      mode: "light",
      accentPrimary: "#7C3AED",
      accentSecondary: "#6D28D9",
      accentTertiary: "#4F46E5",
      textPrimary: "#1E1B4B",
      textSecondary: "#4B5563",
      textMuted: "#9CA3AF",
      textOnAccent: "#FFFFFF",
      bgSolid: "#F5F3FF",
      bgRgb: "245, 243, 255",
      bgDeep: "#EDE9FE",
      bgSurface: "#FFFFFF",
      bgElevated: "rgba(255, 255, 255, 0.88)",
      bgGlass: "rgba(255, 255, 255, 0.75)",
      bgGlassStrong: "rgba(245, 243, 255, 0.94)",
      borderSubtle: "rgba(124, 58, 237, 0.08)",
      borderDefault: "rgba(124, 58, 237, 0.14)",
      borderActive: "rgba(124, 58, 237, 0.40)",
      glowPrimary: "rgba(124, 58, 237, 0.14)",
      glowSecondary: "rgba(109, 40, 217, 0.10)",
      gradientText: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 55%, #4F46E5 100%)",
      gradientCta: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
      tapColor: "rgba(124, 58, 237, 0.38)",
      tapGlow: "rgba(109, 40, 217, 0.18)",
      tapShape: "orb",
      backgroundType: "lavender-mist",
    },
 ];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value as ThemeId);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && THEME_MODES.includes(value as ThemeMode);
}

export function getThemeById(id: ThemeId) {
  return themes.find(theme => theme.id === id) || themes[0];
}

export function resolveAccentColor(color: string) {
  if (!color) return ACCENT_HEX_BY_ID.cyan;
  if (color.startsWith("#")) return color;
  return ACCENT_HEX_BY_ID[color] || ACCENT_HEX_BY_ID.cyan;
}

export function themeToLegacyTheme(themeIdValue: ThemeId) {
  const theme = getThemeById(themeIdValue);
  return theme.mode === "light" ? "light" : "dark";
}

export function themeToCssVariables(theme: ThemeDefinition) {
  const isLight = theme.mode === "light";
  const destructive = theme.mode === "dark"
    ? { primary: "#EF4444", secondary: "#F97316", text: "#FFFFFF" }
    : { primary: "#DC2626", secondary: "#B45309", text: "#FFFFFF" };

  return {
    "--bg-void": theme.bgSolid,
    "--bg-void-rgb": theme.bgRgb,
    "--bg-deep": theme.bgDeep,
    "--bg-surface": theme.bgSurface,
    "--bg-elevated": theme.bgElevated,
    "--bg-overlay": isLight ? "rgba(248, 250, 252, 0.55)" : "rgba(2, 6, 23, 0.42)",
    "--bg-glass": theme.bgGlass,
    "--bg-glass-strong": theme.bgGlassStrong,
    "--glass-card-bg": isLight
      ? `linear-gradient(135deg, rgba(255,255,255,0.82) 0%, ${theme.bgGlass} 100%)`
      : `linear-gradient(135deg, ${theme.bgElevated} 0%, ${theme.bgGlass} 100%)`,
    "--glass-card-bg-strong": isLight
      ? `linear-gradient(135deg, rgba(255,255,255,0.92) 0%, ${theme.bgGlassStrong} 100%)`
      : `linear-gradient(135deg, ${theme.bgGlassStrong} 0%, ${theme.bgElevated} 100%)`,
    "--glass-input-bg": isLight ? "rgba(255,255,255,0.72)" : "rgba(2, 6, 23, 0.46)",
    "--glass-surface": isLight ? "rgba(255,255,255,0.68)" : theme.bgElevated,
    "--glass-surface-faint": isLight ? "rgba(255,255,255,0.46)" : "rgba(15, 23, 42, 0.28)",
    "--glass-border": theme.borderDefault,
    "--glass-border-light": isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.12)",
    "--glass-border-faint": theme.borderSubtle,
    "--glass-highlight": isLight ? "rgba(255,255,255,0.58)" : "rgba(255,255,255,0.08)",
    "--glass-highlight-light": isLight ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.12)",
    "--accent-primary": theme.accentPrimary,
    "--accent-primary-light": theme.accentTertiary,
    "--accent-primary-dark": theme.accentPrimary,
    "--accent-secondary": theme.accentSecondary,
    "--accent-secondary-light": theme.accentTertiary,
    "--accent-secondary-dark": theme.accentSecondary,
    "--accent-tertiary": theme.accentTertiary,
    "--accent-blue": theme.id === "ember" ? theme.accentSecondary : theme.accentPrimary,
    "--accent-purple": theme.id === "ember" ? theme.accentSecondary : "#8B5CF6",
    "--accent-cyan": theme.id === "ember" ? theme.accentSecondary : theme.accentTertiary,
    "--accent-emerald": theme.id === "ember" ? theme.accentSecondary : "#10B981",
    "--accent-green": theme.id === "ember" ? theme.accentSecondary : "#22C55E",
    "--accent-rose": "#F43F5E",
    "--accent-amber": theme.accentSecondary,
    "--accent-orange": theme.id === "ember" ? theme.accentPrimary : "#F97316",
    "--glow-primary": theme.glowPrimary,
    "--glow-secondary": theme.glowSecondary,
    "--glow-blue": theme.glowPrimary,
    "--glow-purple": theme.glowSecondary,
    "--glow-cyan": theme.glowPrimary,
    "--glow-emerald": theme.glowSecondary,
    "--glow-amber": theme.glowSecondary,
    "--text-primary": theme.textPrimary,
    "--text-secondary": theme.textSecondary,
    "--text-muted": theme.textMuted,
    "--text-accent": theme.accentPrimary,
    "--text-inverse": isLight ? "#FFFFFF" : "#020617",
    "--text-on-accent": theme.textOnAccent,
    "--border-subtle": theme.borderSubtle,
    "--border-default": theme.borderDefault,
    "--border-active": theme.borderActive,
    "--border-glow": theme.glowPrimary,
     "--gradient-hero": theme.id === "tokyo"
       ? "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,107,53,0.14) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(0,204,255,0.1) 0%, transparent 60%)"
       : theme.id === "nebula"
      ? "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(56,189,248,0.14) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(139,92,246,0.1) 0%, transparent 60%)"
      : theme.id === "ember"
          ? "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(249,115,22,0.16) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(245,158,11,0.08) 0%, transparent 60%)"
          : "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(14,165,233,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 20%, rgba(20,184,166,0.08) 0%, transparent 60%)",
    "--gradient-card": theme.id === "ember"
      ? "linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(245,158,11,0.06) 100%)"
      : isLight
        ? "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.22) 100%)"
        : "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
    "--gradient-text": theme.gradientText,
    "--gradient-text-alt": isLight ? `linear-gradient(135deg, ${theme.textPrimary} 0%, ${theme.textSecondary} 100%)` : "linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%)",
     "--gradient-mesh": theme.id === "tokyo"
       ? "radial-gradient(at 0% 0%, rgba(255,107,53,0.12) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(0,204,255,0.1) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(255,217,61,0.08) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(13,13,26,0.1) 0px, transparent 45%)"
       : theme.id === "nebula"
      ? "radial-gradient(at 0% 0%, rgba(56,189,248,0.1) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(139,92,246,0.08) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(34,211,238,0.06) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(15,23,42,0.08) 0px, transparent 45%)"
      : theme.id === "ember"
          ? "radial-gradient(at 0% 0%, rgba(249,115,22,0.12) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(245,158,11,0.08) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(251,113,133,0.06) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(29,12,7,0.1) 0px, transparent 45%)"
          : "radial-gradient(at 0% 0%, rgba(14,165,233,0.1) 0px, transparent 45%), radial-gradient(at 100% 0%, rgba(20,184,166,0.08) 0px, transparent 45%), radial-gradient(at 100% 100%, rgba(207,250,254,0.7) 0px, transparent 45%), radial-gradient(at 0% 100%, rgba(255,255,255,0.5) 0px, transparent 45%)",
    "--gradient-shine": isLight ? "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.55) 55%, transparent 60%)" : "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)",
    "--gradient-cta": theme.gradientCta,
    "--tap-color": theme.tapColor,
    "--tap-color-rgb": theme.tapColor.replace(/[^\d,\s]/g, "").replace(/\s+/g, ",").replace(/^,|,$/g, "").trim(),
    "--tap-glow": theme.tapGlow,
    "--tap-shape-radius": theme.tapShape === "orb" ? "999px" : theme.tapShape === "spark" ? "28%" : theme.tapShape === "petal" ? "999px 999px 999px 0" : "18%",
    "--tap-rotate": theme.tapShape === "spark" ? "45deg" : theme.tapShape === "petal" ? "-18deg" : theme.tapShape === "crystal" ? "45deg" : theme.tapShape === "hex" ? "30deg" : "0deg",
    "--destructive-primary": destructive.primary,
    "--destructive-secondary": destructive.secondary,
    "--destructive-text": destructive.text,
    "--font-display": "'Space Grotesk', system-ui, sans-serif",
    "--font-body": "'Inter', system-ui, sans-serif",
    "--font-mono": "'JetBrains Mono', monospace",
    "--color-background": theme.bgSolid,
    "--color-foreground": theme.textPrimary,
    "--color-border": theme.borderDefault,
    "--color-primary": theme.accentPrimary,
    "--color-primary-foreground": theme.textOnAccent,
    "--color-secondary": theme.bgElevated,
    "--color-secondary-foreground": theme.textPrimary,
    "--color-muted": theme.bgSurface,
    "--color-muted-foreground": theme.textSecondary,
    "--color-accent": theme.accentSecondary,
    "--color-accent-foreground": theme.textOnAccent,
    "--color-card": theme.bgElevated,
    "--color-card-foreground": theme.textPrimary,
    "--color-destructive": destructive.primary,
    "--color-destructive-foreground": destructive.text,
    "--color-ring": theme.accentPrimary,
    "--color-input": theme.bgSurface,
    "--font-sans": "'Inter', system-ui, sans-serif",
    "--radius": "0.75rem",
  } as const;
}
