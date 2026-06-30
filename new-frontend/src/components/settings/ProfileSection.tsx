import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Mail, Lock, Check, Camera, X } from "lucide-react";
import { SettingRow } from "./SettingRow";
import { SettingsSection } from "./SettingsSection";
import type { Settings } from "../../hooks/useSettings";

interface ProfileSectionProps {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export function ProfileSection({ settings }: ProfileSectionProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const displayName = settings.userId ? "User" : "Guest";

  return (
    <SettingsSection title="Profile" description="Manage your account information">
      <div className="px-5 pb-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}
              whileHover={{ scale: 1.05 }}
            >
              <User className="w-7 h-7" style={{ color: "var(--text-muted)" }} />
            </motion.div>
            <motion.button
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent-green)", boxShadow: "0 2px 8px rgba(34,197,94,0.3)" }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Camera className="w-3 h-3 text-white" />
            </motion.button>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{displayName}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Member since January 2025</p>
          </div>
        </div>

        <SettingRow icon={User} label="Display Name" description="Your visible name">
          <div className="flex items-center gap-2">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { setEditingName(false); }
                    if (e.key === "Escape") setEditingName(false);
                  }}
                  onBlur={() => setEditingName(false)}
                  autoFocus
                  className="text-sm rounded-lg px-3 py-1.5 outline-none w-44"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-active)",
                    color: "var(--text-primary)",
                  }}
                />
                <motion.button
                  onClick={() => setEditingName(false)}
                  whileTap={{ scale: 0.9 }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--accent-green)" }}
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                </motion.button>
              </div>
            ) : (
              <motion.button
                onClick={() => { setNameValue(displayName); setEditingName(true); }}
                className="text-sm rounded-lg px-3 py-1.5 text-right"
                style={{
                  background: "var(--glass-surface)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
                whileHover={{ borderColor: "var(--border-active)" }}
              >
                {displayName}
              </motion.button>
            )}
          </div>
        </SettingRow>

        <SettingRow icon={Mail} label="Email" description="Your email address">
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>user@example.com</span>
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--accent-emerald)" }}>
              <Check className="w-3 h-3" /> Verified
            </span>
          </div>
        </SettingRow>

        <SettingRow icon={Lock} label="Password" description="Last changed 3 months ago">
          <motion.button
            onClick={() => setShowPasswordModal(true)}
            className="text-sm font-medium px-4 py-1.5 rounded-lg"
            style={{
              background: "var(--glass-surface)",
              border: "1px solid var(--glass-border)",
              color: "var(--accent-blue)",
            }}
            whileHover={{ borderColor: "var(--accent-blue)" }}
            whileTap={{ scale: 0.95 }}
          >
            Change password
          </motion.button>
        </SettingRow>
      </div>

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowPasswordModal(false)}
          >
            <div className="absolute inset-0" style={{ background: 'var(--bg-void)', backdropFilter: 'blur(24px)' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md rounded-2xl p-6"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                boxShadow: "0 24px 48px -12px rgba(0,0,0,0.3)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Change Password</h3>
                <motion.button
                  onClick={() => setShowPasswordModal(false)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
              <div className="space-y-3">
                {["Current password", "New password", "Confirm new password"].map(label => (
                  <div key={label}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
                    <input
                      type="password"
                      className="w-full rounded-xl text-sm px-4 py-2.5 outline-none"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                ))}
                <motion.button
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white mt-2"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Update Password
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SettingsSection>
  );
}
