import { motion } from "framer-motion";
import {
  User, Palette, FileText, BookOpen, Bell, Database, Info, MessageSquare,
} from "lucide-react";

export interface SectionDef {
  id: string;
  icon: typeof User;
  label: string;
  description: string;
}

export const sections: SectionDef[] = [
  { id: "profile", icon: User, label: "Profile", description: "Your account info" },
  { id: "appearance", icon: Palette, label: "Appearance", description: "Theme, colors, display" },
  { id: "summary", icon: FileText, label: "Summary Defaults", description: "Default generation settings" },
  { id: "study", icon: BookOpen, label: "Study Preferences", description: "Goals, order, session size" },
  { id: "notifications", icon: Bell, label: "Notifications", description: "Reminders, email, push" },
  { id: "data", icon: Database, label: "Data & Privacy", description: "Export, import, delete" },
  { id: "feedback", icon: MessageSquare, label: "Feedback", description: "Send feedback & bug reports" },
  { id: "about", icon: Info, label: "About", description: "Version, licenses" },
];

interface SettingsSidebarProps {
  activeSection: string;
  onSectionChange: (id: string) => void;
}

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <nav className="flex flex-col gap-0.5">
      {sections.map(({ id, icon: Icon, label }) => {
        const isActive = activeSection === id;
        return (
          <motion.button
            key={id}
            onClick={() => onSectionChange(id)}
            className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors duration-200 overflow-hidden w-full"
            style={{
              background: isActive ? "var(--glass-surface)" : "transparent",
              borderLeft: isActive ? "3px solid var(--accent-green)" : "3px solid transparent",
            }}
            whileHover={{ x: 2 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            layout
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-xl"
                style={{ background: "rgba(34, 197, 94, 0.06)" }}
                layoutId="sidebar-active-bg"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <motion.div
              className="relative shrink-0"
              animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Icon className="w-4 h-4" style={{ color: isActive ? "var(--accent-green)" : "var(--text-secondary)" }} />
            </motion.div>
            <span className="relative text-sm font-medium truncate" style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
              {label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
