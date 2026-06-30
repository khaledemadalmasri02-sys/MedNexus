import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ACCENT_HEX_BY_ID,
  THEME_IDS,
  THEME_MODES,
  getThemeById,
  isThemeId,
  isThemeMode,
  resolveAccentColor,
  themeToCssVariables,
  themeToLegacyTheme,
  themes,
  type ThemeDefinition,
  type ThemeId,
  type ThemeMode,
} from "../lib/themes";

const THEME_ID_STORAGE_KEY = "theme_id";
const THEME_MODE_STORAGE_KEY = "theme_mode";
const LEGACY_THEME_STORAGE_KEY = "theme";
const ACCENT_STORAGE_KEY = "accent_color";

interface ThemeColors {
  bgVoid: string;
  bgDeep: string;
  bgSurface: string;
  bgElevated: string;
  accentPrimary: string;
  accentSecondary: string;
  accentWarm: string;
  accentDanger: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  borderDefault: string;
  glowColor: string;
  selectionBg: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
}

function getStoredValue(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStoredValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable
  }
}

function removeStoredValue(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // localStorage unavailable
  }
}

function loadInitialThemeId(): ThemeId {
  const storedThemeId = getStoredValue(THEME_ID_STORAGE_KEY);
  if (isThemeId(storedThemeId)) return storedThemeId;

  const legacyTheme = getStoredValue(LEGACY_THEME_STORAGE_KEY);
  return legacyTheme === "light" ? "clinical-white" : "nebula";
}

function loadInitialThemeMode(): ThemeMode {
  const storedThemeMode = getStoredValue(THEME_MODE_STORAGE_KEY);
  if (isThemeMode(storedThemeMode)) return storedThemeMode;

  const legacyTheme = getStoredValue(LEGACY_THEME_STORAGE_KEY);
  if (legacyTheme === "system") return "system";
  return legacyTheme === "light" ? "light" : "dark";
}

function loadInitialAccentColor() {
  const storedAccent = getStoredValue(ACCENT_STORAGE_KEY);
  return storedAccent ? resolveAccentColor(storedAccent) : ACCENT_HEX_BY_ID.cyan;
}

function getSystemMode(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyCssVariables(theme: ThemeDefinition, resolvedAccent: string | null) {
  const root = document.documentElement;
  const variables = themeToCssVariables(theme);

  root.setAttribute("data-theme-id", theme.id);
  root.setAttribute("data-theme-mode", theme.mode);
  root.setAttribute("data-accent", resolvedAccent || "");
  root.classList.toggle("dark", theme.mode === "dark");
  root.classList.toggle("light", theme.mode === "light");
  root.style.fontFamily = "var(--font-body)";

  Object.entries(variables).forEach(([key, value]) => root.style.setProperty(key, value));

  if (resolvedAccent) {
    const accentVariables = {
      "--accent-primary": resolvedAccent,
      "--accent-primary-light": resolvedAccent,
      "--accent-primary-dark": resolvedAccent,
      "--accent-green": resolvedAccent,
      "--accent-emerald": resolvedAccent,
      "--accent-cyan": resolvedAccent,
      "--glow-primary": `${resolvedAccent}33`,
      "--gradient-cta": `linear-gradient(135deg, ${resolvedAccent}, ${resolvedAccent}CC)`,
    };

    Object.entries(accentVariables).forEach(([key, value]) => root.style.setProperty(key, value));
  }
}

function syncLegacyTheme(themeId: ThemeId, themeMode: ThemeMode) {
  const legacyTheme = themeMode === "system" ? "system" : themeToLegacyTheme(themeId);
  setStoredValue(LEGACY_THEME_STORAGE_KEY, legacyTheme);
}

export interface ThemeContextType {
  themeId: ThemeId;
  themeMode: ThemeMode;
  resolvedTheme: ThemeId;
  mode: "dark" | "light";
  resolvedMode: "dark" | "light";
  isDark: boolean;
  theme: ThemeDefinition;
  themes: ThemeDefinition[];
  colors: ThemeColors;
  setThemeId: (themeId: ThemeId) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  toggleTheme: () => void;
}

const defaultTheme = themes[0];

const defaultContext: ThemeContextType = {
  themeId: defaultTheme.id,
  themeMode: "dark",
  resolvedTheme: defaultTheme.id,
  mode: "dark",
  resolvedMode: "dark",
  isDark: true,
  theme: defaultTheme,
  themes,
  colors: {
    bgVoid: "#050505",
    bgDeep: "#0B1220",
    bgSurface: "#0F172A",
    bgElevated: "#1E293B",
    accentPrimary: "#38BDF8",
    accentSecondary: "#8B5CF6",
    accentWarm: "#F59E0B",
    accentDanger: "#EF4444",
    textPrimary: "#FFFFFF",
    textSecondary: "#94A3B8",
    textMuted: "#475569",
    borderSubtle: "rgba(148, 163, 184, 0.06)",
    borderDefault: "rgba(148, 163, 184, 0.1)",
    glowColor: "rgba(59, 130, 246, 0.2)",
    selectionBg: "rgba(59, 130, 246, 0.25)",
    scrollbarThumb: "rgba(59, 130, 246, 0.2)",
    scrollbarThumbHover: "rgba(59, 130, 246, 0.4)",
  },
  setThemeId: () => {},
  setThemeMode: () => {},
  toggleThemeMode: () => {},
  accentColor: ACCENT_HEX_BY_ID.cyan,
  setAccentColor: () => {},
  setMode: () => {},
  toggleMode: () => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(loadInitialThemeId);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(loadInitialThemeMode);
  const [accentColor, setAccentColorState] = useState<string>(loadInitialAccentColor);
  const [hasCustomAccent, setHasCustomAccent] = useState<boolean>(() => getStoredValue(ACCENT_STORAGE_KEY) !== null);

  const resolvedMode = useMemo<"dark" | "light">(() => {
    if (themeMode === "system") return getSystemMode();
    return themeMode;
  }, [themeMode]);

  const resolvedTheme = useMemo(() => getThemeById(themeId), [themeId]);
  const mode = resolvedTheme.mode === "dark" ? resolvedMode : "light";
  const isDark = mode === "dark";

  const resolvedAccent = useMemo(() => {
    if (!hasCustomAccent) return null;
    return resolveAccentColor(accentColor);
  }, [accentColor, hasCustomAccent]);

  const colors = useMemo<ThemeColors>(() => ({
    bgVoid: resolvedTheme.bgSolid,
    bgDeep: resolvedTheme.bgDeep,
    bgSurface: resolvedTheme.bgSurface,
    bgElevated: resolvedTheme.bgElevated,
    accentPrimary: resolvedAccent || resolvedTheme.accentPrimary,
    accentSecondary: resolvedTheme.accentSecondary,
    accentWarm: resolvedTheme.accentSecondary,
    accentDanger: resolvedTheme.mode === "dark" ? "#EF4444" : "#DC2626",
    textPrimary: resolvedTheme.textPrimary,
    textSecondary: resolvedTheme.textSecondary,
    textMuted: resolvedTheme.textMuted,
    borderSubtle: resolvedTheme.borderSubtle,
    borderDefault: resolvedTheme.borderDefault,
    glowColor: resolvedTheme.glowPrimary,
    selectionBg: resolvedTheme.glowPrimary,
    scrollbarThumb: resolvedTheme.glowPrimary,
    scrollbarThumbHover: resolvedTheme.glowSecondary,
  }), [resolvedTheme, resolvedAccent]);

  useEffect(() => {
    applyCssVariables(resolvedTheme, resolvedAccent);
  }, [resolvedTheme, resolvedAccent]);

  useEffect(() => {
    setStoredValue(THEME_ID_STORAGE_KEY, resolvedTheme.id);
    setStoredValue(THEME_MODE_STORAGE_KEY, themeMode);
    syncLegacyTheme(resolvedTheme.id, themeMode);
  }, [resolvedTheme.id, themeMode]);

  useEffect(() => {
    if (hasCustomAccent) {
      setStoredValue(ACCENT_STORAGE_KEY, accentColor);
    } else {
      removeStoredValue(ACCENT_STORAGE_KEY);
    }
  }, [accentColor, hasCustomAccent]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (themeMode === "system") {
        const systemTheme = getThemeById(resolvedTheme.id);
        applyCssVariables(systemTheme, resolvedAccent);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeMode, resolvedTheme.id, resolvedAccent]);

  const setThemeId = useCallback((nextThemeId: ThemeId) => {
    if (!THEME_IDS.includes(nextThemeId)) return;
    setThemeIdState(nextThemeId);
  }, []);

  const setThemeMode = useCallback((nextThemeMode: ThemeMode) => {
    if (!THEME_MODES.includes(nextThemeMode)) return;
    setThemeModeState(nextThemeMode);
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeModeState(prev => prev === "dark" ? "light" : "dark");
  }, []);

  const setMode = setThemeMode;
  const toggleMode = toggleThemeMode;
  const toggleTheme = toggleThemeMode;

  const setAccentColor = useCallback((color: string) => {
    const resolved = resolveAccentColor(color);
    setHasCustomAccent(true);
    setAccentColorState(resolved);
  }, []);

  const value = useMemo<ThemeContextType>(() => ({
    themeId: resolvedTheme.id,
    themeMode,
    resolvedTheme: resolvedTheme.id,
    mode,
    resolvedMode: mode,
    isDark,
    theme: resolvedTheme,
    themes,
    colors,
    accentColor: resolvedAccent || ACCENT_HEX_BY_ID.cyan,
    setThemeId,
    setThemeMode,
    toggleThemeMode,
    setAccentColor,
    setMode,
    toggleMode,
    toggleTheme,
  }), [resolvedTheme, themeMode, mode, isDark, colors, resolvedAccent, setThemeId, setThemeMode, toggleThemeMode, setAccentColor, setMode, toggleMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
