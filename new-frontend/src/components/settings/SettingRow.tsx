import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SettingRowProps {
  icon: LucideIcon;
  label: string;
  description: string;
  children: ReactNode;
  status?: string;
  statusColor?: string;
}

export function SettingRow({ icon: Icon, label, description, children, status, statusColor }: SettingRowProps) {
  return (
    <motion.div
      className="group flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl transition-colors duration-200"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
      whileHover={{ backgroundColor: "var(--glass-surface-faint)" }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "var(--glass-surface)" }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: "var(--text-secondary)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{label}</p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{description}</p>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {children}
        {status && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] font-medium"
            style={{ color: statusColor || "var(--accent-emerald)" }}
          >
            {status}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
