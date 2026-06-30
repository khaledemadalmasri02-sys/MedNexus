/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Layers, BookOpen, Clock, Target, TrendingUp, TrendingDown } from "lucide-react";
import * as api from "../../lib/api";
import { FloatingWidget, AnimatedCounter } from "../ui";

interface StatData {
  label: string;
  value: number;
  icon: typeof Layers;
  color: string;
  bgColor: string;
  trend?: number;
  suffix?: string;
}

export function QuickStats() {
  const [stats, setStats] = useState<StatData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [decksData, progressData] = await Promise.all([
          api.decksApi.list().catch(() => []),
          api.dashboardExtendedApi.getState().catch(() => null),
        ]);

        const deckCount = Array.isArray(decksData) ? decksData.length : 0;
        const totalCards = (progressData as any)?.totalCards || 0;
        const studyHours = (progressData as any)?.weeklyStudyMinutes ? Math.round((progressData as any).weeklyStudyMinutes / 60) : 0;
        const accuracy = (progressData as any)?.weeklyAccuracy || 0;

        setStats([
          { label: "Total Cards", value: totalCards, icon: BookOpen, color: "var(--accent-green)", bgColor: "rgba(34, 197, 94, 0.1)" },
          { label: "Decks", value: deckCount, icon: Layers, color: "var(--accent-blue)", bgColor: "rgba(59, 130, 246, 0.1)" },
          { label: "Hours This Week", value: studyHours, icon: Clock, color: "var(--accent-purple)", bgColor: "rgba(139, 92, 246, 0.1)" },
          { label: "Accuracy", value: accuracy, icon: Target, color: "var(--accent-amber)", bgColor: "rgba(245, 158, 11, 0.1)", suffix: "%" },
        ]);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <FloatingWidget key={i} className="p-4">
            <div className="space-y-2">
              <div className="h-8 w-8 rounded-lg animate-shimmer" style={{ background: "var(--border-subtle)" }} />
              <div className="h-6 w-16 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
              <div className="h-3 w-20 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
            </div>
          </FloatingWidget>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 20 }}
        >
          <FloatingWidget className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: stat.bgColor, border: `1px solid ${stat.color}25` }}
              >
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              </div>
              {stat.trend !== undefined && (
                <div className="flex items-center gap-0.5 text-[10px] font-medium" style={{ color: stat.trend >= 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                  {stat.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(stat.trend)}%
                </div>
              )}
            </div>
            <div className="text-2xl font-bold font-display text-text-primary">
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
          </FloatingWidget>
        </motion.div>
      ))}
    </div>
  );
}
