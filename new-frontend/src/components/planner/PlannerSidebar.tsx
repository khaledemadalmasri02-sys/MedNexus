import { motion } from "framer-motion";
import { CalendarDays, Calendar, Focus, GraduationCap, BarChart3 } from "lucide-react";

export type PlannerView = "week" | "today" | "focus" | "exams" | "analytics";

interface PlannerSidebarProps {
  view: PlannerView;
  onChange: (v: PlannerView) => void;
  badges: { today: number; exams: number };
}

const ITEMS: Array<{ id: PlannerView; label: string; icon: typeof Calendar; sub: string }> = [
  { id: "week", label: "Calendar", icon: Calendar, sub: "Week grid" },
  { id: "today", label: "Today", icon: CalendarDays, sub: "Agenda" },
  { id: "focus", label: "Focus", icon: Focus, sub: "Now mode" },
  { id: "exams", label: "Exams", icon: GraduationCap, sub: "Countdown" },
  { id: "analytics", label: "Analytics", icon: BarChart3, sub: "Insights" },
];

export default function PlannerSidebar({ view, onChange, badges }: PlannerSidebarProps) {
  return (
    <nav className="flex md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-visible pb-2 md:pb-0 no-scrollbar">
      {ITEMS.map((item) => {
        const active = view === item.id;
        const Icon = item.icon;
        const badge = item.id === "today" ? badges.today : item.id === "exams" ? badges.exams : 0;
        return (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(item.id)}
            className="relative flex md:flex-col items-center gap-2 md:gap-1 px-4 md:px-3 py-2 md:py-3 rounded-2xl md:w-24 shrink-0 transition-colors"
            style={{
              background: active ? "var(--glass-card-bg)" : "transparent",
              border: `1px solid ${active ? "var(--glass-border)" : "transparent"}`,
              backdropFilter: active ? "blur(16px)" : "none",
              boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,.08)" : "none",
            }}
          >
            {active && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute left-0 top-2 bottom-2 w-1 rounded-full hidden md:block"
                style={{ background: "var(--accent-green)" }}
              />
            )}
            <div className="relative">
              <Icon className="h-5 w-5" style={{ color: active ? "var(--accent-green)" : "var(--text-secondary)" }} />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-accent-green text-[9px] font-bold text-white flex items-center justify-center">
                  {badge}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium" style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>{item.label}</span>
          </motion.button>
        );
      })}
    </nav>
  );
}
