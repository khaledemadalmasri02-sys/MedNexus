import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Layers, Stethoscope, Clock, Flame, BookOpen, Zap, TrendingUp,
  Calendar, BarChart3, PieChart, Activity, Target, Brain, FileText,
  RefreshCw, WifiOff,
} from "lucide-react";
import type { Deck, QBank } from "../lib/api";
import { FloatingWidget, ProgressRing, AnimatedCounter } from "./ui";
import { smoothTransition, staggerContainer } from "./ui/constants";
import * as api from "../lib/api";

interface SummaryTabProps {
  decks: Deck[];
  qbanks: QBank[];
  loading: boolean;
}

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};

const glassStyle = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
} as const;

function timeAgo(dateString: string, now: number): string {
  const diff = now - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function SummaryTab({ decks, qbanks, loading }: SummaryTabProps) {
  const [now, setNow] = useState(() => Date.now());
  const [recentSessions, setRecentSessions] = useState<api.StudySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSessionsLoading(true);
      setSessionsError(false);
      try {
        const result = await api.studySessionsApi.recent(5);
        if (!cancelled) setRecentSessions(result.sessions || []);
      } catch {
        if (!cancelled) {
          setSessionsError(true);
          setRecentSessions([]);
        }
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [retryCount]);

  const handleRetry = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);

  const stats = useMemo(() => {
    const totalCards = decks.reduce((sum, d) => sum + (d.cardCount || 0), 0);
    const totalQuestions = qbanks.reduce((sum, qb) => sum + (qb.questionCount || 0), 0);
    const totalItems = decks.length + qbanks.length;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recentDecks = decks.filter(d => new Date(d.createdAt).getTime() > oneWeekAgo).length;
    const recentQbanks = qbanks.filter(qb => new Date(qb.createdAt).getTime() > oneWeekAgo).length;
    const avgCardsPerDeck = decks.length > 0 ? Math.round(totalCards / decks.length) : 0;
    return { totalDecks: decks.length, totalCards, totalQbanks: qbanks.length, totalQuestions, totalItems, recentDecks, recentQbanks, avgCardsPerDeck };
  }, [decks, qbanks, now]);

  const statCards = [
    { label: "Total Decks", value: stats.totalDecks, icon: Layers, color: "var(--accent-green)", bg: "rgba(6, 182, 212, 0.1)", description: `${stats.recentDecks} created this week` },
    { label: "Total Cards", value: stats.totalCards, icon: FileText, color: "var(--accent-emerald)", bg: "rgba(16, 185, 129, 0.1)", description: `Avg ${stats.avgCardsPerDeck} per deck` },
    { label: "Question Banks", value: stats.totalQbanks, icon: Stethoscope, color: "var(--accent-purple)", bg: "rgba(139, 92, 246, 0.1)", description: `${stats.recentQbanks} created this week` },
    { label: "Total Questions", value: stats.totalQuestions, icon: Brain, color: "var(--accent-amber)", bg: "rgba(245, 158, 11, 0.1)", description: "Across all banks" },
  ];

  const topDecks = useMemo(() => {
    const colors = ["var(--accent-green)", "var(--accent-purple)", "var(--accent-amber)", "var(--accent-emerald)", "var(--accent-blue)"];
    return [...decks].sort((a, b) => (b.cardCount || 0) - (a.cardCount || 0)).slice(0, 5).map((d, idx) => ({ ...d, color: colors[idx % colors.length] }));
  }, [decks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-accent-green border-t-transparent animate-spin" />
          <p className="text-text-secondary text-sm">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (stats.totalItems === 0) {
    return (
      <div className="text-center py-16 rounded-2xl" style={{ ...glassStyle, border: "2px dashed var(--glass-border-light)" }}>
        <BarChart3 className="h-16 w-16 text-text-muted mx-auto mb-4" />
        <h3 className="font-display text-xl font-bold text-text-primary mb-2">No Data Yet</h3>
        <p className="text-text-secondary max-w-md mx-auto">Create your first deck or question bank to see your study summary and statistics here.</p>
      </div>
    );
  }

  const lastSession = recentSessions[0];

  return (
    <div className="space-y-6">
      {lastSession && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(139, 92, 246, 0.08))", border: "1px solid var(--glass-border)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-mesh)" }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(6, 182, 212, 0.15)", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
              <Zap className="h-7 w-7 text-accent-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted mb-0.5">Continue where you left off</p>
              <h3 className="font-display text-lg font-bold text-text-primary">{lastSession.deckName || "Unknown Deck"}</h3>
              <p className="text-xs text-text-secondary mt-1">
                {lastSession.cardsStudied} cards studied · {lastSession.durationMinutes || "?"} min · {timeAgo(lastSession.startedAt, now)}
              </p>
            </div>
            {lastSession.deckId && (
              <a href={`/study?deck=${lastSession.deckId}`}
                className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm shrink-0"
                style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }}>
                Resume
              </a>
            )}
          </div>
        </motion.div>
      )}

      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" variants={staggerContainer} initial="hidden" animate="visible">
        {statCards.map(({ label, value, icon: Icon, color, bg, description }) => (
          <motion.div key={label} variants={item} whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="rounded-2xl p-4 card-hover relative overflow-hidden" style={glassStyle} data-hover="true">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 15% 50%, ${color}12 0%, transparent 65%)` }} />
            <div className="relative">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg, boxShadow: `0 0 16px ${color}20` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <p className="text-2xl font-bold font-display" style={{ color }}><AnimatedCounter value={value} /></p>
              <p className="text-xs text-text-secondary font-medium mt-1">{label}</p>
              <p className="text-[10px] text-text-muted mt-0.5">{description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FloatingWidget className="p-6 flex flex-col items-center justify-center" delay={0.1}>
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-accent-green" />
            <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Total Items</span>
          </div>
          <ProgressRing progress={Math.min(100, stats.totalItems * 5)} size={140} strokeWidth={12} />
          <div className="mt-4 text-center">
            <p className="text-sm text-text-secondary">{stats.totalItems} items in library</p>
          </div>
        </FloatingWidget>

        <FloatingWidget className="p-6" delay={0.2}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-accent-purple" />
            <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Quick Stats</span>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-accent-green" /><span className="text-sm text-text-secondary">New this week</span></div>
              <span className="text-sm font-semibold text-text-primary">{stats.recentDecks + stats.recentQbanks}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-accent-blue" /><span className="text-sm text-text-secondary">Avg cards/deck</span></div>
              <span className="text-sm font-semibold text-text-primary">{stats.avgCardsPerDeck}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent-amber" /><span className="text-sm text-text-secondary">Total items</span></div>
              <span className="text-sm font-semibold text-text-primary">{stats.totalItems}</span>
            </div>
          </div>
        </FloatingWidget>

        <FloatingWidget className="p-6" delay={0.3}>
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-4 w-4 text-accent-amber" />
            <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Distribution</span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="h-4 rounded-full overflow-hidden flex" style={{ background: "var(--glass-border)" }}>
                {stats.totalItems > 0 && (
                  <>
                    <motion.div className="h-full" style={{ background: "linear-gradient(90deg, var(--accent-green), var(--accent-emerald))" }}
                      initial={{ width: 0 }} animate={{ width: `${(stats.totalDecks / stats.totalItems) * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }} />
                    <motion.div className="h-full" style={{ background: "linear-gradient(90deg, var(--accent-purple), var(--accent-violet))" }}
                      initial={{ width: 0 }} animate={{ width: `${(stats.totalQbanks / stats.totalItems) * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }} />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-green" /><span className="text-[10px] text-text-muted">Decks ({stats.totalDecks})</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-purple" /><span className="text-[10px] text-text-muted">QBanks ({stats.totalQbanks})</span></div>
              </div>
            </div>
          </div>
        </FloatingWidget>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="rounded-2xl p-5" style={glassStyle}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-accent-green" />
            <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Top Decks by Size</span>
          </div>
          {topDecks.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No decks yet</p>
          ) : (
            <div className="space-y-3">
              {topDecks.map((deck, idx) => (
                <div key={deck.id} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-text-muted w-4">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-text-primary truncate">{deck.name}</p>
                      <span className="text-xs font-semibold ml-2" style={{ color: deck.color }}>{deck.cardCount || 0} cards</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: deck.color }}
                        initial={{ width: 0 }} animate={{ width: `${topDecks[0]?.cardCount ? ((deck.cardCount || 0) / topDecks[0].cardCount) * 100 : 0}%` }}
                        transition={{ delay: 0.4 + idx * 0.1, duration: 0.5 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="rounded-2xl p-5" style={glassStyle}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-blue" />
              <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Recent Sessions</span>
            </div>
            {sessionsError && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleRetry}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
                style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)", color: "#EF4444" }}
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </motion.button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-6"><div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" /></div>
          ) : sessionsError ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-8 rounded-xl"
              style={{ background: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.1)" }}
            >
              <WifiOff className="h-8 w-8 text-text-muted mb-2" />
              <p className="text-sm text-text-secondary font-medium mb-1">Couldn&apos;t load sessions</p>
              <p className="text-[11px] text-text-muted mb-3">Server may be unreachable</p>
              <button
                onClick={handleRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}
              >
                <RefreshCw className="h-3 w-3" /> Try again
              </button>
            </motion.div>
          ) : recentSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Clock className="h-8 w-8 text-text-muted mb-2" />
              <p className="text-sm text-text-muted">No study sessions yet</p>
              <p className="text-[11px] text-text-muted mt-1">Start studying to see your history here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSessions.map((session, idx) => {
                const isToday = new Date(session.startedAt).toDateString() === new Date().toDateString();
                const masteryChange = session.cardsStudied > 0
                  ? Math.round(((session.knownCount || 0) / session.cardsStudied) * 100)
                  : 0;
                return (
                  <motion.div key={session.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + idx * 0.05 }}
                    className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-glass-surface">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: isToday ? "rgba(16, 185, 129, 0.1)" : "rgba(148, 163, 184, 0.08)" }}>
                      {isToday ? <Flame className="h-4 w-4 text-accent-emerald" /> : <Clock className="h-4 w-4 text-text-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{session.deckName || "Unknown Deck"}</p>
                      <p className="text-[10px] text-text-muted">
                        {session.durationMinutes || "?"} min · {session.cardsStudied} cards · {timeAgo(session.startedAt, now)}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-accent-emerald shrink-0">+{masteryChange}%</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
