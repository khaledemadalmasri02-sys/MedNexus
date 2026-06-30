import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { smoothTransition } from "../ui/constants";

interface ActivityHeatmapProps {
  data: {
    days: { date: string; minutes: number; cards: number }[];
    totalMinutes: number;
    totalDays: number;
  } | null;
  loading: boolean;
}

function getColor(minutes: number): string {
  if (minutes === 0) return "rgba(148, 163, 184, 0.08)";
  if (minutes <= 15) return "rgba(6, 182, 212, 0.3)";
  if (minutes <= 40) return "rgba(6, 182, 212, 0.5)";
  if (minutes <= 90) return "rgba(6, 182, 212, 0.75)";
  return "rgba(16, 185, 129, 0.9)";
}

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ActivityHeatmap({ data, loading }: ActivityHeatmapProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <motion.div
        className="rounded-2xl p-5 mb-8"
        style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={smoothTransition}
      >
        <div className="w-40 h-5 rounded animate-shimmer mb-4" style={{ background: "var(--border-subtle)" }} />
        <div className="flex gap-[3px]">
          {[...Array(53)].map((_, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {[...Array(7)].map((_, j) => (
                <div key={j} className="w-[10px] h-[10px] rounded-[2px] animate-shimmer" style={{ background: "var(--border-subtle)" }} />
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (!data || data.days.length === 0) {
    return (
      <motion.div
        className="rounded-2xl p-6 mb-8 text-center"
        style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={smoothTransition}
      >
        <h3 className="font-display text-lg font-semibold text-text-primary mb-2">Your Year in Study</h3>
        <p className="text-sm text-text-secondary">Start studying to fill your heatmap! 🌱</p>
        <p className="text-xs text-text-muted mt-1">Consistency beats intensity. Even 10 minutes daily compounds.</p>
      </motion.div>
    );
  }

  const { days, totalMinutes, totalDays } = data;
  const hours = Math.round(totalMinutes / 60);

  const today = new Date().toISOString().split("T")[0];

  const firstDay = new Date(days[0].date);
  const startDayOfWeek = firstDay.getDay();
  const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const paddedDays = [
    ...Array.from({ length: offset }, () => ({ date: "", minutes: 0, cards: 0 })),
    ...days,
  ];

  const weeks: typeof paddedDays[] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, colIdx) => {
    const firstValidDay = week.find(d => d.date);
    if (firstValidDay && firstValidDay.date) {
      const month = new Date(firstValidDay.date).getMonth();
      if (month !== lastMonth) {
        monthPositions.push({ label: MONTH_LABELS[month], col: colIdx });
        lastMonth = month;
      }
    }
  });

  return (
    <motion.div
      className="rounded-2xl p-5 mb-8"
      style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={smoothTransition}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-text-primary tracking-wide">YOUR YEAR IN STUDY</h3>
        <span className="text-xs text-text-secondary">{totalDays} study days · {hours}h total</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-0">
          <div className="flex flex-col gap-[3px] mr-1 pt-[18px]">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="h-[10px] flex items-center">
                <span className="text-[9px] text-text-muted">{label}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="flex gap-[3px] mb-1 h-[14px]">
              {weeks.map((_week, colIdx) => {
                const monthLabel = monthPositions.find(m => m.col === colIdx);
                return (
                  <div key={colIdx} className="w-[10px] relative">
                    {monthLabel && (
                      <span className="absolute text-[9px] text-text-muted whitespace-nowrap" style={{ top: -1 }}>
                        {monthLabel.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-[3px]">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const day = week[dayIdx];
                    if (!day || !day.date) {
                      return <div key={dayIdx} className="w-[10px] h-[10px] rounded-[2px]" />;
                    }
                    const isToday = day.date === today;
                    return (
                      <motion.div
                        key={dayIdx}
                        className="w-[10px] h-[10px] rounded-[2px] cursor-pointer relative group"
                        style={{
                          background: getColor(day.minutes),
                          boxShadow: isToday ? "0 0 0 1px var(--accent-green)" : "none",
                        }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: weekIdx * 0.003, duration: 0.2 }}
                        whileHover={{ scale: 1.3 }}
                        onClick={() => navigate(`/history?date=${day.date}`)}
                      >
                        <div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-lg text-[10px] font-medium pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50"
                          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-primary)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
                        >
                          {new Date(day.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · {day.minutes} min · {day.cards} cards
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[9px] text-text-muted">Less</span>
        {[0, 10, 30, 60, 120].map((mins) => (
          <div key={mins} className="w-[10px] h-[10px] rounded-[2px]" style={{ background: getColor(mins) }} />
        ))}
        <span className="text-[9px] text-text-muted">More</span>
      </div>
    </motion.div>
  );
}
