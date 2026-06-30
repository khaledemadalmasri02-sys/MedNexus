import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { BarChart3, Clock, Flame, TrendingUp, BookOpen, Target } from "lucide-react";
import { smoothTransition, staggerContainer } from "../../components/ui/constants";
import type { PlannerPlan, StudySessionStats } from "../../lib/api";

const CHART_COLORS = ['#22c55e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#3b82f6', '#ef4444'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const glassStyle = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
} as const;

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};

interface AnalyticsViewProps {
  plans: PlannerPlan[];
  stats: StudySessionStats | null;
  streak: number;
}

export default function AnalyticsView({ plans, stats, streak }: AnalyticsViewProps) {
  const weekMinutes = useMemo(() => plans.reduce((s, p) => s + p.durationMinutes, 0), [plans]);

  const completionRate = useMemo(() => {
    if (plans.length === 0) return 0;
    return Math.round((plans.filter(p => p.completed === true || p.completed === 1).length / plans.length) * 100);
  }, [plans]);

  const avgSessionMin = useMemo(() => plans.length === 0 ? 0 : Math.round(weekMinutes / plans.length), [weekMinutes, plans.length]);

  const dailyBarData = useMemo(() => {
    if (stats?.dailyBreakdown) {
      return stats.dailyBreakdown.map((d: { date: string; minutes: number; sessions: number }) => ({
        day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
        minutes: d.minutes,
        sessions: d.sessions,
      }));
    }
    return DAY_LABELS.map((day, i) => {
      const dayPlans = plans.filter(p => p.dayOfWeek === i);
      return { day, minutes: dayPlans.reduce((s, p) => s + p.durationMinutes, 0), sessions: dayPlans.length };
    });
  }, [stats, plans]);

  const plannedVsActual = useMemo(() => {
    return DAY_LABELS.map((day, i) => {
      const dayPlans = plans.filter(p => p.dayOfWeek === i);
      const planned = dayPlans.reduce((s, p) => s + p.durationMinutes, 0);
      let actual = 0;
      if (stats?.dailyBreakdown) {
        const today = new Date();
        const currentDow = today.getDay() === 0 ? 7 : today.getDay();
        const diff = i + 1 - currentDow;
        const d = new Date(today);
        d.setDate(today.getDate() + diff);
        const dateStr = d.toISOString().split('T')[0];
        const dayStat = stats.dailyBreakdown.find((ds: { date: string }) => ds.date === dateStr);
        if (dayStat) actual = dayStat.minutes;
      }
      return { day, planned, actual };
    });
  }, [plans, stats]);

  const pieData = useMemo(() => {
    const dayMap: Record<string, number> = {};
    plans.forEach(p => {
      const day = DAY_LABELS[p.dayOfWeek];
      dayMap[day] = (dayMap[day] || 0) + p.durationMinutes;
    });
    return Object.entries(dayMap).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [plans]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {[
          { label: 'Total Hours', value: `${(weekMinutes / 60).toFixed(1)}h`, icon: Clock, color: 'var(--accent-green)' },
          { label: 'Completion', value: `${completionRate}%`, icon: Target, color: 'var(--accent-emerald)' },
          { label: 'Avg Session', value: `${avgSessionMin}m`, icon: TrendingUp, color: 'var(--accent-purple)' },
          { label: 'Streak', value: `${streak}d`, icon: Flame, color: 'var(--accent-amber)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div key={label} variants={itemVariant} className="rounded-2xl p-4 relative overflow-hidden" style={glassStyle}>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <Icon className="h-5 w-5 mb-2" style={{ color }} />
            <p className="text-2xl font-bold font-display" style={{ color }}>{value}</p>
            <p className="text-xs text-text-secondary">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div
          className="rounded-2xl p-5" style={glassStyle}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ...smoothTransition }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-accent-green" />
            <span className="text-sm font-display font-semibold text-text-secondary tracking-wider uppercase">Daily Study Time</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyBarData}>
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: 12, fontSize: 12, color: '#fff' }}
                  formatter={(value: unknown) => [`${value} min`, 'Study Time']}
                />
                <Bar dataKey="minutes" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl p-5" style={glassStyle}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ...smoothTransition }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-accent-purple" />
            <span className="text-sm font-display font-semibold text-text-secondary tracking-wider uppercase">Planned vs Actual</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plannedVsActual}>
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} unit="m" />
                <Tooltip
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: 12, fontSize: 12, color: '#fff' }}
                />
                <Bar dataKey="planned" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Planned" />
                <Bar dataKey="actual" fill="#22c55e" radius={[4, 4, 0, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {pieData.length > 0 && (
        <motion.div
          className="rounded-2xl p-5 mb-6" style={glassStyle}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ...smoothTransition }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-4 w-4 text-accent-amber" />
            <span className="text-sm font-display font-semibold text-text-secondary tracking-wider uppercase">Time Distribution by Day</span>
          </div>
          <div className="h-56 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: 12, fontSize: 12, color: '#fff' }}
                  formatter={(value: unknown) => [`${Math.round(Number(value) / 60 * 10) / 10}h`, 'Time']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 ml-4">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-xs text-text-secondary">{entry.name}</span>
                  <span className="text-xs font-semibold text-text-primary">{Math.round(entry.value / 60 * 10) / 10}h</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
