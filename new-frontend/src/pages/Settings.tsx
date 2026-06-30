/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, LogIn, Cloud, CloudOff } from "lucide-react";
import { useSettings } from "../hooks/useSettings";
import { useAuth } from "../hooks/useAuth";
import { SettingsSidebar } from "../components/settings/SettingsSidebar";
import { ProfileSection } from "../components/settings/ProfileSection";
import { AppearanceSection } from "../components/settings/AppearanceSection";
import { SummaryDefaultsSection } from "../components/settings/SummaryDefaultsSection";
import { StudyPreferencesSection } from "../components/settings/StudyPreferencesSection";
import { NotificationSection } from "../components/settings/NotificationSection";
import { DataPrivacySection } from "../components/settings/DataPrivacySection";
import { AboutSection } from "../components/settings/AboutSection";
import { FeedbackSection } from "../components/settings/FeedbackSection";

const sectionComponents: Record<string, React.ComponentType<any>> = {
  profile: ProfileSection,
  appearance: AppearanceSection,
  summary: SummaryDefaultsSection,
  study: StudyPreferencesSection,
  notifications: NotificationSection,
  data: DataPrivacySection,
  feedback: FeedbackSection,
  about: AboutSection,
};

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const { settings, loading, saving, lastSaved, error, updateSetting, resetSettings } = useSettings();
  const { user } = useAuth();
  const isGuest = !user;
  const [syncBannerDismissed, setSyncBannerDismissed] = useState(false);

  useEffect(() => {
    if (isGuest) {
      const handleBeforeUnload = () => {
        localStorage.setItem("guest_settings", JSON.stringify(settings));
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [isGuest, settings]);

  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
          >
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Settings</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Customize your learning experience</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 ml-[52px]">
          {saving && (
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs font-medium" style={{ color: "var(--accent-amber)" }}>
              Saving...
            </motion.span>
          )}
          {lastSaved && !saving && (
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs font-medium" style={{ color: "var(--accent-emerald)" }}>
              ✓ Saved
            </motion.span>
          )}
          {error && (
            <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-xs font-medium animate-shake" style={{ color: "var(--accent-rose)" }}>
              {error}
            </motion.span>
          )}
          {!isGuest && (
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Cloud className="h-3 w-3" /> Synced
            </span>
          )}
          {isGuest && (
            <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <CloudOff className="h-3 w-3" /> Local only
            </span>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isGuest && !syncBannerDismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <div
              className="flex items-center justify-between gap-4 p-4 rounded-2xl"
              style={{ background: "rgba(59, 130, 246, 0.06)", border: "1px solid rgba(59, 130, 246, 0.15)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(59, 130, 246, 0.15)" }}
                >
                  <LogIn className="h-4 w-4" style={{ color: "var(--accent-blue)" }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Sign in to sync your settings
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Your preferences are only saved locally. Sign in to sync across devices.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.location.href = "/login?redirect=/settings"}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setSyncBannerDismissed(true)}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Settings className="w-8 w-8" style={{ color: "var(--accent-green)" }} />
          </motion.div>
        </div>
      ) : (
        <div className="flex gap-6">
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
            className="w-44 lg:w-56 shrink-0"
          >
            <div className="sticky top-20">
              <SettingsSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
            </div>
          </motion.aside>

          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
              >
                {ActiveComponent && (
                  <ActiveComponent
                    settings={settings}
                    updateSetting={updateSetting}
                    onReset={resetSettings}
                    onDataChanged={() => {}}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
