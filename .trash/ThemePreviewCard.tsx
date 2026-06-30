import type { ThemeDefinition } from "../../lib/themes";

interface ThemePreviewCardProps {
  theme: ThemeDefinition;
  selected: boolean;
  onSelect: () => void;
  label: string;
}

export function ThemePreviewCard({ theme, selected, onSelect, label }: ThemePreviewCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Select ${label} ${theme.mode} theme`}
      className="group relative overflow-hidden rounded-2xl p-3 text-left transition-all duration-200"
      style={{
        background: selected ? theme.bgGlassStrong : theme.bgGlass,
        border: selected ? `1px solid ${theme.borderActive}` : "1px solid var(--border-default)",
        boxShadow: selected ? `0 12px 34px ${theme.glowPrimary}` : "0 8px 24px rgba(0,0,0,0.06)",
        color: theme.textPrimary,
      }}
    >
      <div className="absolute inset-0 opacity-80" style={{ background: theme.id === "formula" ? "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18), transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.08), transparent 40%)" : theme.id === "tokyo" ? "radial-gradient(circle at 25% 75%, rgba(255,107,53,0.35), transparent 36%), radial-gradient(circle at 75% 25%, rgba(0,204,255,0.22), transparent 34%)" : theme.id === "ember" ? "radial-gradient(circle at 25% 75%, rgba(249,115,22,0.35), transparent 36%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.2), transparent 34%)" : theme.id === "clinical-white" ? "radial-gradient(circle at 20% 20%, rgba(14,165,233,0.22), transparent 36%), radial-gradient(circle at 80% 15%, rgba(16,185,129,0.14), transparent 34%)" : theme.id === "surgical-green" ? "radial-gradient(circle at 20% 20%, rgba(15,118,110,0.2), transparent 36%), radial-gradient(circle at 80% 15%, rgba(21,128,61,0.12), transparent 34%)" : theme.id === "warm-parchment" ? "radial-gradient(circle at 20% 20%, rgba(180,83,9,0.18), transparent 36%), radial-gradient(circle at 80% 15%, rgba(146,64,14,0.1), transparent 34%)" : theme.id === "lavender-mist" ? "radial-gradient(circle at 20% 20%, rgba(124,58,237,0.18), transparent 36%), radial-gradient(circle at 80% 15%, rgba(109,40,217,0.12), transparent 34%)" : "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.32), transparent 36%), radial-gradient(circle at 80% 15%, rgba(139,92,246,0.22), transparent 34%)" }} />
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: theme.gradientCta, color: theme.textOnAccent, boxShadow: `0 8px 22px ${theme.glowPrimary}` }}>{theme.icon}</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ background: theme.mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.62)", color: theme.mode === "dark" ? theme.textSecondary : theme.textPrimary }}>{theme.mode}</span>
      </div>
      <div className="relative mt-3 rounded-xl p-3" style={{ background: theme.id === "formula" ? "rgba(255,255,255,0.06)" : theme.id === "tokyo" ? "rgba(20,20,45,0.68)" : theme.id === "ember" ? "rgba(42,19,12,0.68)" : theme.mode === "light" ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.58)", border: "1px solid var(--glass-border)" }}>
        <div className="mb-2 h-2 w-20 rounded-full" style={{ background: theme.gradientText }} />
        <div className="h-2 w-full rounded-full" style={{ background: theme.mode === "dark" ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.18)" }} />
        <div className="mt-1 h-2 w-2/3 rounded-full" style={{ background: theme.mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.12)" }} />
      </div>
      <div className="relative mt-3">
        <div className="text-sm font-bold" style={{ color: theme.textPrimary }}>{theme.name}</div>
        <div className="text-xs font-medium" style={{ color: theme.textSecondary }}>{theme.mode === "dark" ? "Dark" : "Bright"}</div>
      </div>
    </button>
  );
}
