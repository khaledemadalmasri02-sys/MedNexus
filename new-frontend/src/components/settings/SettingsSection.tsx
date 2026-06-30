import { type ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  badge?: string;
}

export function SettingsSection({ title, description, children, badge }: SettingsSectionProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--glass-card-bg)",
        backdropFilter: "blur(20px) saturate(1.3)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {title}
          </h3>
          {badge && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--glass-surface)", color: "var(--text-muted)" }}
            >
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
