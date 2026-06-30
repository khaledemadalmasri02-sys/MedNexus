import { motion, AnimatePresence } from "framer-motion";
import { Mail, Bell, Clock, Volume2, BellRing } from "lucide-react";
import { SettingRow } from "./SettingRow";
import { SettingsSection } from "./SettingsSection";
import { Toggle } from "./Toggle";
import { Slider } from "./Slider";
import type { Settings } from "../../hooks/useSettings";

interface NotificationSectionProps {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export function NotificationSection({ settings, updateSetting }: NotificationSectionProps) {
  const emailEnabled = settings.emailNotifications as boolean;
  const pushEnabled = settings.pushNotifications as boolean;
  const soundsEnabled = settings.inAppSounds as boolean;

  return (
    <SettingsSection title="Notifications" description="Manage how and when you receive notifications">
      <div className="px-5 pb-5 space-y-1">
        <SettingRow icon={Mail} label="Email Notifications" description="Receive email updates about your learning">
          <Toggle checked={emailEnabled} onChange={v => updateSetting("emailNotifications", v)} />
        </SettingRow>

        <AnimatePresence>
          {emailEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="overflow-hidden"
            >
              <div className="ml-6 pl-4 space-y-1" style={{ borderLeft: "2px solid var(--glass-border)" }}>
                <SettingRow icon={Mail} label="Weekly progress summary" description="Get a weekly study report">
                  <Toggle checked={settings.emailWeeklySummary as boolean} onChange={v => updateSetting("emailWeeklySummary", v)} />
                </SettingRow>
                <SettingRow icon={BellRing} label="Streak at risk" description="Alert when you haven't studied today">
                  <Toggle checked={settings.emailStreakAlert as boolean} onChange={v => updateSetting("emailStreakAlert", v)} />
                </SettingRow>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SettingRow icon={Bell} label="Push Notifications" description="Browser push notifications">
          <div className="flex items-center gap-2">
            <Toggle checked={pushEnabled} onChange={v => updateSetting("pushNotifications", v)} />
            {pushEnabled && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-medium px-2 py-1 rounded-md"
                style={{ background: "var(--glass-surface)", color: "var(--accent-blue)", border: "1px solid var(--glass-border)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => new Notification("MedNexus Test", { body: "Notifications are working!" })}
              >
                Test
              </motion.button>
            )}
          </div>
        </SettingRow>

        <AnimatePresence>
          {pushEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="overflow-hidden"
            >
              <div className="ml-6 pl-4 space-y-1" style={{ borderLeft: "2px solid var(--glass-border)" }}>
                <SettingRow icon={Clock} label="Study reminder time" description="When to send daily reminders">
                  <input
                    type="time"
                    value={settings.pushReminderTime as string}
                    onChange={e => updateSetting("pushReminderTime", e.target.value)}
                    className="text-xs rounded-lg px-3 py-1.5 outline-none"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                      color: "var(--text-primary)",
                    }}
                  />
                </SettingRow>
                <SettingRow icon={Bell} label="Review due cards" description="Notify when cards are due for review">
                  <Toggle checked={settings.pushReviewDue as boolean} onChange={v => updateSetting("pushReviewDue", v)} />
                </SettingRow>
                <SettingRow icon={Bell} label="Session complete" description="Notify when a study session ends">
                  <Toggle checked={settings.pushSessionComplete as boolean} onChange={v => updateSetting("pushSessionComplete", v)} />
                </SettingRow>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SettingRow icon={Volume2} label="In-app Sounds" description="Play sounds for interactions">
          <div className="flex items-center gap-2">
            <Toggle checked={soundsEnabled} onChange={v => updateSetting("inAppSounds", v)} />
            {soundsEnabled && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[10px] font-medium px-2 py-1 rounded-md"
                style={{ background: "var(--glass-surface)", color: "var(--accent-blue)", border: "1px solid var(--glass-border)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.frequency.value = 800;
                  gain.gain.value = 0.1 * ((settings.soundVolume as number) / 100);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.15);
                }}
              >
                Test
              </motion.button>
            )}
          </div>
        </SettingRow>

        {soundsEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <SettingRow icon={Volume2} label="Sound Volume" description="Volume for in-app sounds">
              <Slider
                value={settings.soundVolume as number}
                min={0}
                max={100}
                step={10}
                onChange={v => updateSetting("soundVolume", v)}
                formatValue={v => `${v}%`}
              />
            </SettingRow>
          </motion.div>
        )}
      </div>
    </SettingsSection>
  );
}
