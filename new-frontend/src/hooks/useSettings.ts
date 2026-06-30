import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../lib/api";
import { ACCENT_HEX_BY_ID, isThemeId, isThemeMode, resolveAccentColor, themeToLegacyTheme } from "../lib/themes";

export type Settings = api.UserSettings;

const defaultSettings: Settings = {
  userId: "",
  dailyGoalMinutes: 20,
  dailyGoalCards: 30,
  reminderTime: null,
  accentColor: "cyan",
  dashboardLayout: null,
  density: "comfortable",
  soundEnabled: false,
  streakFreezeUsedAt: null,
  theme: "dark",
  theme_id: "nebula",
  theme_mode: "dark",
  animationsEnabled: true,
  fontSize: "medium",
  defaultStyle: "modern",
  defaultMode: "combined",
  autoTts: false,
  chunkSize: 3,
  cardOrder: "sequential",
  autoReveal: false,
  autoRevealSeconds: 5,
  showExplanation: true,
  streakFreeze: true,
  emailNotifications: true,
  emailWeeklySummary: true,
  emailStreakAlert: true,
  pushNotifications: true,
  pushReminderTime: "18:00",
  pushReviewDue: true,
  pushSessionComplete: true,
  inAppSounds: false,
  soundVolume: 70,
  ambientEnabled: true,
  customCursorEnabled: true,
  ripplesEnabled: true,
  animationSpeed: 1,
  reduceMotion: false,
} as Settings;

function safeLocalStorageGet(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function safeLocalStorageSet(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* noop */ }
}

function syncThemeStorage(settingsValue: Settings) {
  const themeId = isThemeId(settingsValue.theme_id) ? settingsValue.theme_id : "nebula";
  const themeMode = isThemeMode(settingsValue.theme_mode) ? settingsValue.theme_mode : "dark";
  const legacyTheme = settingsValue.theme === "system" || themeMode === "system" ? "system" : themeToLegacyTheme(themeId);

  safeLocalStorageSet("theme_id", themeId);
  safeLocalStorageSet("theme_mode", themeMode);
  safeLocalStorageSet("theme", legacyTheme);

  if (settingsValue.accentColor) {
    safeLocalStorageSet("accent_color", resolveAccentColor(settingsValue.accentColor));
  } else {
    safeLocalStorageSet("accent_color", ACCENT_HEX_BY_ID.cyan);
  }
}

function persistThemeStorage(key: keyof Settings, value: Settings[keyof Settings]) {
  if (key === "theme_id" && isThemeId(value)) {
    safeLocalStorageSet("theme_id", value);
    safeLocalStorageSet("theme", themeToLegacyTheme(value));
    return;
  }

  if (key === "theme_mode" && isThemeMode(value)) {
    safeLocalStorageSet("theme_mode", value);
    const themeId = safeLocalStorageGet("theme_id");
    safeLocalStorageSet("theme", isThemeId(themeId) ? themeToLegacyTheme(themeId) : themeToLegacyTheme("nebula"));
    return;
  }

  if (key === "theme" && typeof value === "string") {
    safeLocalStorageSet("theme", value);
    return;
  }

  if (key === "accentColor" && typeof value === "string") {
    safeLocalStorageSet("accent_color", resolveAccentColor(value));
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = safeLocalStorageGet("guest_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          const merged = { ...defaultSettings, ...parsed };
          syncThemeStorage(merged);
          return merged;
        }
      }
    } catch { /* ignore */ }
    return defaultSettings;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = safeLocalStorageGet("auth_token");
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await api.settingsApi.get();
        if (!cancelled) {
          const merged = { ...defaultSettings, ...data };
          syncThemeStorage(merged);
          setSettings(merged);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Failed to load settings";
          if (!msg.toLowerCase().includes("unauthorized") && !msg.toLowerCase().includes("authentication")) {
            setError(msg);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (data: Settings) => {
    setSaving(true);
    setError(null);
    const token = safeLocalStorageGet("auth_token");
    if (!token) {
      safeLocalStorageSet("guest_settings", JSON.stringify(data));
      setSaving(false);
      setLastSaved(new Date());
      return;
    }
    try {
      const rest: Partial<api.UserSettings> = { ...data };
      delete (rest as { userId?: string }).userId;
      delete (rest as { createdAt?: string }).createdAt;
      delete (rest as { updatedAt?: string }).updatedAt;
      const result = await api.settingsApi.update(rest);
      const merged = { ...defaultSettings, ...result };
      syncThemeStorage(merged);
      setSettings(merged);
      setLastSaved(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("authentication")) {
        safeLocalStorageSet("guest_settings", JSON.stringify(data));
        setLastSaved(new Date());
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    persistThemeStorage(key, value);
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => persist(next), 500);
      return next;
    });
  }, [persist]);

  const resetSettings = useCallback(async () => {
    setSaving(true);
    setError(null);
    const token = safeLocalStorageGet("auth_token");
    if (!token) {
      syncThemeStorage(defaultSettings);
      setSettings(defaultSettings);
      safeLocalStorageSet("guest_settings", JSON.stringify(defaultSettings));
      setSaving(false);
      setLastSaved(new Date());
      return;
    }
    try {
      const result = await api.settingsApi.reset();
      const merged = { ...defaultSettings, ...result };
      syncThemeStorage(merged);
      setSettings(merged);
      setLastSaved(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reset";
      if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("authentication")) {
        syncThemeStorage(defaultSettings);
        setSettings(defaultSettings);
        safeLocalStorageSet("guest_settings", JSON.stringify(defaultSettings));
        setLastSaved(new Date());
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }, []);

  return { settings, loading, saving, lastSaved, error, updateSetting, resetSettings };
}
