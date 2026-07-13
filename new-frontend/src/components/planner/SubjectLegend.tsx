import { Filter, X } from "lucide-react";
import type { PlannerPlan } from "../../lib/api";

interface SubjectLegendProps {
  plans: PlannerPlan[];
  activeColor: string | null;
  onSelect: (color: string | null) => void;
}

export default function SubjectLegend({ plans, activeColor, onSelect }: SubjectLegendProps) {
  const colors = Array.from(new Set(plans.filter((p) => p.color).map((p) => p.color)));

  if (colors.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="h-3.5 w-3.5 text-text-muted" />
      {colors.map((c) => {
        const active = activeColor === c;
        return (
          <button
            key={c}
            onClick={() => onSelect(active ? null : c)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: active ? `${c}22` : "var(--bg-elevated)",
              border: `1px solid ${active ? c : "var(--border-subtle)"}`,
              color: active ? c : "var(--text-secondary)",
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            {plans.find((p) => p.color === c)?.title.split(" ")[0] || "Topic"}
          </button>
        );
      })}
      {activeColor && (
        <button onClick={() => onSelect(null)} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary">
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}
