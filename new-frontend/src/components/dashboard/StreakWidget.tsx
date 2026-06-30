import { motion } from "framer-motion";
import { Flame, Settings } from "lucide-react";
import { useState } from "react";
import { smoothTransition } from "../ui/constants";
import { ProgressRing } from "../ui";

interface StreakWidgetProps {
  data: {
    currentStreak: number;
    longestStreak: number;
    studiedToday: boolean;
    todayMinutes: number;
    todayCardsStudied: number;
    dailyGoalMinutes: number;
    dailyGoalCards: number;
    weeklyStudyMinutes: number[];
  } | null;
  loading: boolean;
  onOpenSettings: () => void;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StreakWidget({ data, loading, onOpenSettings }: StreakWidgetProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) {
    return (
      <div className="rounded-2xl p-5" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full animate-shimmer" style={{ background: "var(--border-subtle)" }} />
          <div className="flex-1">
            <div className="w-16 h-6 rounded animate-shimmer mb-1" style={{ background: "var(--border-subtle)" }} />
            <div className="w-20 h-4 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
          </div>
        </div>
        <div className="flex gap-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 h-12 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { currentStreak, longestStreak, studiedToday, todayMinutes, todayCardsStudied, dailyGoalMinutes, dailyGoalCards, weeklyStudyMinutes } = data;
  const goalPct = Math.min(100, Math.round((todayMinutes / Math.max(1, dailyGoalMinutes)) * 100));
  const isPast6pm = new Date().getHours() >= 18;
  const showUrgency = !studiedToday && currentStreak > 0 && isPast6pm;

  const maxMins = Math.max(...weeklyStudyMinutes, 1);

  const todayIdx = new Date().getDay();
  const orderedDays = [...weeklyStudyMinutes.slice(todayIdx), ...weeklyStudyMinutes.slice(0, todayIdx)];

  return (
    <motion.div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={smoothTransition}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="relative h-12 w-12 rounded-full flex items-center justify-center"
            style={{
              background: studiedToday ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
              boxShadow: studiedToday ? "0 0 16px rgba(16, 185, 129, 0.2)" : showUrgency ? "0 0 16px rgba(239, 68, 68, 0.3)" : "0 0 16px rgba(245, 158, 11, 0.15)",
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {showUrgency && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ boxShadow: ["0 0 0 0 rgba(239,68,68,0.4)", "0 0 0 8px rgba(239,68,68,0)", "0 0 0 0 rgba(239,68,68,0.4)"] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            <Flame className="h-6 w-6" style={{ color: studiedToday ? "var(--accent-emerald)" : "var(--accent-amber)" }} />
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium pointer-events-none whitespace-nowrap z-50" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-primary)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                Longest streak: {longestStreak} days
              </div>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold font-display" style={{ color: "var(--accent-amber)" }}>
              {currentStreak}
            </p>
            <p className="text-xs text-text-secondary font-medium">day streak</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ProgressRing progress={goalPct} size={48} strokeWidth={4} color={goalPct >= 100 ? "var(--accent-emerald)" : "var(--accent-green)"} />
          <button
            onClick={onOpenSettings}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "var(--text-muted)" }}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 text-xs text-text-secondary">
        <span>{todayMinutes}/{dailyGoalMinutes} min today</span>
        <span>·</span>
        <span>{todayCardsStudied}/{dailyGoalCards} cards</span>
      </div>

      <div className="flex gap-1.5 items-end" style={{ height: 56 }}>
        {orderedDays.map((mins, idx) => {
          const isToday = idx === 6;
          const heightPct = maxMins > 0 ? Math.max(8, (mins / maxMins) * 100) : 8;
          const dayLabel = DAY_LABELS[(todayIdx + idx) % 7];
          return (
            <motion.div
              key={idx}
              className="flex-1 flex flex-col items-center gap-1 relative group"
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <div
                className="w-full rounded-md relative overflow-hidden cursor-pointer transition-transform hover:scale-110"
                style={{
                  height: Math.max(4, heightPct * 0.5),
                  background: isToday
                    ? "linear-gradient(180deg, var(--accent-green), var(--accent-blue))"
                    : mins > 0
                    ? "rgba(6, 182, 212, 0.5)"
                    : "rgba(148, 163, 184, 0.15)",
                  boxShadow: isToday ? "0 0 8px rgba(6, 182, 212, 0.3)" : "none",
                }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5 rounded text-[9px] font-medium leading-tight flex items-center justify-center" style={{ background: "var(--bg-surface)", color: "var(--text-primary)", zIndex: 10 }}>
                  <span className="block text-center" style={{ fontSize: 8, lineHeight: 1.2 }}>
                    {dayLabel}<br />{mins}m
                  </span>
                </div>
              </div>
              <span className="text-[9px] text-text-muted" style={{ color: isToday ? "var(--accent-green)" : undefined }}>
                {dayLabel}
              </span>
            </motion.div>
          );
        })}
      </div>

      {goalPct >= 100 && (
        <motion.div
          className="mt-2 text-center text-xs font-semibold"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          style={{ color: "var(--accent-emerald)" }}
        >
          🎉 Daily goal achieved!
        </motion.div>
      )}
    </motion.div>
  );
}
