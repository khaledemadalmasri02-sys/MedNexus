/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Target, BookOpen, Clock, AlertTriangle, Play, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import * as api from "../../lib/api";
import { FloatingWidget } from "../ui";

interface FocusItem {
  id: string;
  label: string;
  description: string;
  icon: typeof Target;
  color: string;
  action: string;
  actionLabel: string;
  count?: number;
}

export function TodaysFocus() {
  const [items, setItems] = useState<FocusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const [dueCount, queueData] = await Promise.all([
          api.cardProgressApi.getDueCount().catch(() => ({ count: 0 })),
          api.dashboardExtendedApi.getQueue().catch(() => null),
        ]);

        const focusItems: FocusItem[] = [];

        if (dueCount.count > 0) {
          focusItems.push({
            id: "due-cards",
            label: "Review Due Cards",
            description: `${dueCount.count} cards are ready for review`,
            icon: BookOpen,
            color: "var(--accent-amber)",
            action: "/study",
            actionLabel: "Start Review",
            count: dueCount.count,
          });
        }

        const queue = (queueData as any);
        if (queue?.weakCards && queue.weakCards.length > 0) {
          focusItems.push({
            id: "weak-cards",
            label: "Study Weak Areas",
            description: `${queue.weakCards.length} cards need extra attention`,
            icon: Target,
            color: "var(--accent-rose)",
            action: "/study",
            actionLabel: "Focus Study",
            count: queue.weakCards.length,
          });
        }

        if (queue?.overdueCards && queue.overdueCards.length > 0) {
          focusItems.push({
            id: "overdue",
            label: "Catch Up on Overdue",
            description: `${queue.overdueCards.length} overdue cards`,
            icon: AlertTriangle,
            color: "var(--accent-rose)",
            action: "/study",
            actionLabel: "Catch Up",
            count: queue.overdueCards.length,
          });
        }

        focusItems.push({
          id: "daily-goal",
          label: "Daily Study Goal",
          description: "Complete today's study target",
          icon: Clock,
          color: "var(--accent-green)",
          action: "/study",
          actionLabel: "Start Session",
        });

        setItems(focusItems);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <FloatingWidget className="p-4">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
          <div className="h-16 rounded-xl animate-shimmer" style={{ background: "var(--border-subtle)" }} />
        </div>
      </FloatingWidget>
    );
  }

  const visibleItems = items.filter((item) => !dismissed.has(item.id));
  if (visibleItems.length === 0) return null;

  return (
    <FloatingWidget className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4 text-accent-amber" />
        <h3 className="text-sm font-semibold text-text-primary">Today's Focus</h3>
      </div>
      <div className="space-y-2">
        {visibleItems.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl group"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
            >
              <item.icon className="h-4 w-4" style={{ color: item.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                {item.label}
                {item.count !== undefined && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: `${item.color}15`, color: item.color }}>
                    {item.count}
                  </span>
                )}
              </div>
              <div className="text-xs text-text-muted truncate">{item.description}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link to={item.action}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                  style={{ background: `${item.color}15`, color: item.color }}
                >
                  <Play className="h-3 w-3" />
                  {item.actionLabel}
                </motion.button>
              </Link>
              <button
                onClick={() => setDismissed((prev) => new Set([...prev, item.id]))}
                className="p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronRight className="h-3 w-3 rotate-90" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </FloatingWidget>
  );
}
