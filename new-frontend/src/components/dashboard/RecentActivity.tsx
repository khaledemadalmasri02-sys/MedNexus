/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, BookOpen, Sparkles, Layers, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import * as api from "../../lib/api";
import { FloatingWidget } from "../ui";

interface ActivityItem {
  id: number;
  icon: typeof BookOpen;
  description: string;
  timestamp: string;
  link: string;
  color: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [generations, decks] = await Promise.all([
          api.generationsApi.list(10).catch(() => []),
          api.decksApi.list().catch(() => []),
        ]);

        const items: ActivityItem[] = [];

        (Array.isArray(generations) ? generations : []).slice(0, 5).forEach((g: any) => {
          items.push({
            id: g.id,
            icon: Sparkles,
            description: `Generated ${g.cardCount || ""} cards${g.deckName ? ` in "${g.deckName}"` : ""}`,
            timestamp: g.createdAt,
            link: "/history",
            color: "var(--accent-purple)",
          });
        });

        (Array.isArray(decks) ? decks : []).slice(0, 3).forEach((d: any) => {
          items.push({
            id: 1000 + d.id,
            icon: Layers,
            description: `Created deck "${d.name}"`,
            timestamp: d.createdAt,
            link: `/deck/${d.id}`,
            color: "var(--accent-blue)",
          });
        });

        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setActivities(items.slice(0, 10));
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg animate-shimmer shrink-0" style={{ background: "var(--border-subtle)" }} />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-full rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
                <div className="h-2 w-16 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
              </div>
            </div>
          ))}
        </div>
      </FloatingWidget>
    );
  }

  if (activities.length === 0) return null;

  const displayItems = expanded ? activities : activities.slice(0, 5);

  return (
    <FloatingWidget className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">Recent Activity</h3>
      </div>
      <div className="space-y-1">
        <AnimatePresence>
          {displayItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={item.link}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${item.color}12`, border: `1px solid ${item.color}20` }}
                >
                  <item.icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-text-primary truncate">{item.description}</div>
                  <div className="text-[10px] text-text-muted">{timeAgo(item.timestamp)}</div>
                </div>
                <ChevronRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {activities.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 text-[10px] font-medium text-text-muted hover:text-text-secondary transition-colors py-1"
        >
          {expanded ? "Show less" : `Show ${activities.length - 5} more`}
        </button>
      )}
    </FloatingWidget>
  );
}
