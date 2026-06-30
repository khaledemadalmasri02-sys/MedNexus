import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Layers, FileText, Flame, ChevronRight,
  Brain, Stethoscope, Loader2, AlertCircle, Activity, Settings,
  Sparkles,
} from "lucide-react";
import WelcomeModal from "../components/WelcomeModal";
import * as api from "../lib/api";
import type { Deck, GenerationLog, DashboardState, MasteryData, StreakData, HeatmapData, QueueData, AchievementItem } from "../lib/api";
import { FloatingWidget, SkeletonStat } from "../components/ui";
import { smoothTransition, staggerContainer } from "../components/ui/constants";
import SmartHero from "../components/dashboard/SmartHero";
import StreakWidget from "../components/dashboard/StreakWidget";
import ActivityHeatmap from "../components/dashboard/ActivityHeatmap";
import FocusQueue from "../components/dashboard/FocusQueue";
import CelebrationBanner from "../components/dashboard/CelebrationBanner";
import QuickStudyFAB from "../components/dashboard/QuickStudyFAB";
import DashboardCustomizer from "../components/dashboard/DashboardCustomizer";
import type { DashboardConfig } from "../components/dashboard/DashboardCustomizer";
import StreakSettingsModal from "../components/dashboard/StreakSettingsModal";
import { GlowOnHover } from "../components/micro";
import { TodaysFocus } from "../components/dashboard/TodaysFocus";
import { QuickStats } from "../components/dashboard/QuickStats";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { UpcomingExams } from "../components/dashboard/UpcomingExams";

const item = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};

const quickActions = [
  { to: "/generate", label: "Generate Cards", desc: "AI-powered flashcards from any content", icon: Sparkles, gradient: "from-accent-primary to-accent-secondary", accentColor: "var(--accent-primary)" },
  { to: "/library", label: "Browse Library", desc: "View, edit, and organize your decks", icon: Layers, gradient: "from-accent-emerald to-accent-green", accentColor: "var(--accent-emerald)" },
  { to: "/study", label: "Study Now", desc: "Continue your spaced repetition session", icon: Brain, gradient: "from-accent-secondary to-accent-violet", accentColor: "var(--accent-secondary)" },
];

const defaultConfig: DashboardConfig = {
  widgets: [
    { id: "hero", label: "Smart Hero", enabled: true, locked: true },
    { id: "queue", label: "Focus Queue", enabled: true },
    { id: "stats", label: "Stat Cards", enabled: true },
    { id: "mastery", label: "Overall Mastery Ring", enabled: true },
    { id: "streak", label: "Streak & Daily Goal", enabled: true },
    { id: "heatmap", label: "Activity Heatmap", enabled: true },
    { id: "quickActions", label: "Quick Actions", enabled: true },
    { id: "recentDecks", label: "Recent Decks", enabled: true },
    { id: "celebrations", label: "Celebrations", enabled: true },
    { id: "todaysFocus", label: "Today's Focus", enabled: true },
    { id: "quickStats", label: "Quick Stats", enabled: true },
    { id: "recentActivity", label: "Recent Activity", enabled: true },
    { id: "upcomingExams", label: "Upcoming Exams", enabled: true },
    { id: "quickStudy", label: "Quick Study FAB", enabled: true },
  ],
  density: "comfortable",
  accentColor: "cyan",
};

function AnimatedStatCard({ label, value, icon: Icon, color, bg, index }: { label: string; value: number; icon: typeof Layers; color: string; bg: string; index: number }) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
      className="rounded-2xl p-5 card-hover relative overflow-hidden"
      style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}
      data-hover="true"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 15% 50%, ${color}12 0%, transparent 65%)` }} />
      <GlowOnHover color={`${color}10`} radius={150}>
        <div className="relative">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg, boxShadow: `0 0 16px ${color}20` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <p className="text-2xl font-bold font-display" style={{ color }}>
            {value}
          </p>
          <p className="text-xs text-text-secondary font-medium mt-1">{label}</p>
        </div>
      </GlowOnHover>
    </motion.div>
  );
}

function EnhancedMasteryRing({ progress, size = 130, strokeWidth = 10, color = 'var(--accent-green)' }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const endAngle = (progress / 100) * 360 - 90;
  const dotX = size / 2 + radius * Math.cos((endAngle * Math.PI) / 180);
  const dotY = size / 2 + radius * Math.sin((endAngle * Math.PI) / 180);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <filter id="mastery-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as const }}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      {progress > 0 && (
        <motion.div
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}, 0 0 16px ${color}60`,
            left: dotX - 5,
            top: dotY - 5,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.span
          className="text-lg font-bold font-display"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: 'spring', stiffness: 300, damping: 20 }}
        >
          {Math.round(progress)}%
        </motion.span>
      </div>
    </div>
  );
}

function QuickActionCard({ to, label, desc, icon: Icon, gradient, accentColor, index }: { to: string; label: string; desc: string; icon: typeof Sparkles; gradient: string; accentColor: string; index: number }) {
  const iconAnimations = [
    { rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] },
    { scaleX: [1, 0.8, 1, 1.1, 1] },
    { opacity: [0.7, 1, 0.7] },
  ];
  const anim = iconAnimations[index % iconAnimations.length];

  return (
    <Link to={to}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 + index * 0.08, duration: 0.5 }}
        whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
        className="rounded-2xl p-5 card-hover h-full relative overflow-hidden group"
        style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", perspective: 800 }}
        data-hover="true"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-[2px] animate-gradient-shift opacity-60" style={{ background: `linear-gradient(90deg, ${accentColor}, var(--accent-purple), ${accentColor})` }} />
        <motion.div
          className={`h-11 w-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}
          animate={anim}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className="h-5 w-5" style={{ color: "var(--text-on-accent)" }} />
        </motion.div>
        <h3 className="font-semibold text-text-primary mb-1">{label}</h3>
        <p className="text-sm text-text-secondary">{desc}</p>
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2"
          initial={{ x: -8, opacity: 0 }}
          whileHover={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
            <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-[var(--accent-primary)] transition-colors" />
        </motion.div>
      </motion.div>
    </Link>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ totalDecks: 0, totalCards: 0, totalQbanks: 0 });
  const [recentDecks, setRecentDecks] = useState<Deck[]>([]);
  const [recentGenerations, setRecentGenerations] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem("welcomeDismissed"));

  const [heroState, setHeroState] = useState<DashboardState | null>(null);
  const [masteryData, setMasteryData] = useState<MasteryData | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [dueCount, setDueCount] = useState(0);

  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showStreakSettings, setShowStreakSettings] = useState(false);
  const [config, setConfig] = useState<DashboardConfig>(() => {
    const saved = localStorage.getItem("dashboard_config");
    return saved ? JSON.parse(saved) : defaultConfig;
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [decks, generations, state, mastery, streak, heatmap, queue, achs] = await Promise.all([
        api.decksApi.list(),
        api.generationsApi.list(5),
        api.dashboardExtendedApi.getState().catch(() => null),
        api.dashboardExtendedApi.getMastery().catch(() => null),
        api.dashboardExtendedApi.getStreak().catch(() => null),
        api.dashboardExtendedApi.getHeatmap().catch(() => null),
        api.dashboardExtendedApi.getQueue().catch(() => null),
        api.dashboardExtendedApi.getAchievements().catch(() => null),
      ]);

      const totalCards = decks.reduce((sum, d) => sum + (d.cardCount || 0), 0);
      const totalQbanks = decks.filter((d) => d.kind === "qbank").length;
      setStats({ totalDecks: decks.length, totalCards, totalQbanks });

      const sortedDecks = [...decks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4);
      setRecentDecks(sortedDecks);
      setRecentGenerations(generations.generations || []);

      if (state) setHeroState(state);
      if (mastery) setMasteryData(mastery);
      if (streak) setStreakData(streak);
      if (heatmap) setHeatmapData(heatmap);
      if (queue) setQueueData(queue);
      if (achs) setAchievements(achs.recent || []);

      const due = await api.cardProgressApi.getDueCount().catch(() => ({ count: 0 }));
      setDueCount(due?.count || 0);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleAchievementDismiss = async (id: number) => {
    setAchievements(prev => prev.filter(a => a.id !== id));
    await api.dashboardExtendedApi.markAchievementSeen(id).catch(() => {});
  };

  const handleStreakSettingsSave = async (settings: { dailyGoalMinutes: number; dailyGoalCards: number; reminderTime: string }) => {
    await api.dashboardExtendedApi.updateGoals(settings).catch(() => {});
    const updated = await api.dashboardExtendedApi.getStreak().catch(() => null);
    if (updated) setStreakData(updated);
  };

  const handleConfigChange = (newConfig: DashboardConfig) => {
    setConfig(newConfig);
  };

  const isWidgetEnabled = (id: string) => config.widgets.find(w => w.id === id)?.enabled !== false;

  const statCards = [
    { label: "Flashcard Decks", value: stats.totalDecks, icon: Layers, color: "var(--accent-green)", bg: "rgba(6, 182, 212, 0.1)" },
    { label: "Total Cards", value: stats.totalCards, icon: FileText, color: "var(--accent-emerald)", bg: "rgba(16, 185, 129, 0.1)" },
    { label: "Question Banks", value: stats.totalQbanks, icon: Stethoscope, color: "var(--accent-purple)", bg: "rgba(139, 92, 246, 0.1)" },
    { label: "Study Streak", value: streakData?.currentStreak ?? 0, icon: Flame, color: "var(--accent-amber)", bg: "rgba(245, 158, 11, 0.1)" },
  ];

  const masteryByDeck = useMemo(() => {
    if (!masteryData?.byDeck) return [];
    return masteryData.byDeck;
  }, [masteryData]);

  const recentDecksWithMastery = useMemo(() => {
    return recentDecks.map((deck) => {
      const deckMastery = masteryByDeck.find(m => m.deckId === deck.id);
      return { ...deck, mastery: deckMastery || null };
    });
  }, [recentDecks, masteryByDeck]);

  const overallMastery = masteryData?.overall ?? 0;
  const masteryColor = overallMastery < 30 ? "var(--accent-rose, #f43f5e)" : overallMastery < 60 ? "var(--accent-amber)" : "var(--accent-emerald)";
  const trendIcon = masteryData?.trend === "improving" ? "↑" : masteryData?.trend === "declining" ? "↓" : "→";
  const trendColor = masteryData?.trend === "improving" ? "var(--accent-emerald)" : masteryData?.trend === "declining" ? "var(--accent-rose, #f43f5e)" : "var(--text-muted)";

  return (
    <div className="relative">
      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} onDismissPermanently={() => localStorage.setItem("welcomeDismissed", "1")} />

      <div className="flex items-center justify-between mb-4">
        <div />
        <button
          onClick={() => setShowCustomizer(true)}
          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: "color-mix(in srgb, var(--accent-danger) 6%, transparent)", border: "1px solid var(--border-default)" }}
        >
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      <AnimatePresence>
        {isWidgetEnabled("celebrations") && (
          <CelebrationBanner achievements={achievements} onDismiss={handleAchievementDismiss} />
        )}
      </AnimatePresence>

      {isWidgetEnabled("hero") && (
        <SmartHero state={heroState} loading={loading} />
      )}

      {isWidgetEnabled("todaysFocus") && (
        <div className="mb-8">
          <TodaysFocus />
        </div>
      )}

      {isWidgetEnabled("queue") && (
        <FocusQueue items={queueData?.items || []} loading={loading} />
      )}

      {isWidgetEnabled("quickStats") && (
        <div className="mb-8">
          <QuickStats />
        </div>
      )}

      {isWidgetEnabled("stats") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <motion.div
              className="grid grid-cols-2 gap-4"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {statCards.map(({ label, value, icon: Icon, color, bg }, i) => (
                <AnimatedStatCard key={label} label={label} value={value} icon={Icon} color={color} bg={bg} index={i} />
              ))}
            </motion.div>
          </div>

          {isWidgetEnabled("mastery") && (
            <FloatingWidget className="p-6 flex flex-col items-center justify-center" delay={0.2}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
                <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Overall Mastery</span>
              </div>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-primary)]" />
              ) : (
                <EnhancedMasteryRing progress={overallMastery} size={130} strokeWidth={10} color={masteryColor} />
              )}
              <div className="mt-4 flex items-center gap-1.5 text-xs text-text-secondary">
                <span style={{ color: trendColor }}>{trendIcon}</span>
                <span style={{ color: trendColor }}>{masteryData?.trend || "stable"}</span>
                <span className="text-text-muted">· Based on your study sessions</span>
              </div>
            </FloatingWidget>
          )}
        </div>
      )}

      {isWidgetEnabled("streak") && (
        <div className="mb-8">
          <StreakWidget
            data={streakData}
            loading={loading}
            onOpenSettings={() => setShowStreakSettings(true)}
          />
        </div>
      )}

      {isWidgetEnabled("heatmap") && (
        <ActivityHeatmap data={heatmapData} loading={loading} />
      )}

      {isWidgetEnabled("recentActivity") && isWidgetEnabled("upcomingExams") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {isWidgetEnabled("recentActivity") && <RecentActivity />}
          {isWidgetEnabled("upcomingExams") && <UpcomingExams />}
        </div>
      )}

      {isWidgetEnabled("quickActions") && (
        <div className="mb-8">
          <motion.h2
            className="font-display text-lg font-semibold text-text-primary mb-4 tracking-wide"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            QUICK ACTIONS
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, i) => (
              <QuickActionCard key={action.to} {...action} index={i} />
            ))}
          </div>
        </div>
      )}

      {isWidgetEnabled("recentDecks") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-text-primary tracking-wide">RECENT DECKS</h2>
            <Link to="/library">
              <span className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <SkeletonStat key={i} />)}
            </div>
          ) : recentDecksWithMastery.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--glass-card-bg-strong)", border: "2px dashed var(--glass-border-light)", backdropFilter: "blur(20px)" }}
            >
              <Layers className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <h3 className="font-semibold text-text-primary mb-2">No decks yet</h3>
              <p className="text-sm text-text-secondary mb-4">Create your first deck to get started!</p>
              <Link to="/generate">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-2.5 rounded-xl text-[var(--text-on-accent)] font-medium text-sm"
                  style={{ background: "var(--gradient-cta)" }}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generate Cards
                  </span>
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {recentDecksWithMastery.map((deck, idx) => {
                const m = deck.mastery;
                const masteredCount = m ? m.masteredCards : 0;
                const learningCount = m ? m.learningCards : 0;
                const totalCards = m ? m.totalCards : (deck.cardCount || 0);
                const deckColor = m?.color || "var(--accent-green)";

                return (
                  <motion.div
                    key={deck.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.08 }}
                  >
                    <Link to={`/deck/${deck.id}`}>
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="rounded-2xl p-4 card-hover flex items-center gap-4 group"
                        style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}
                        data-hover="true"
                      >
                        <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: deckColor }} />
                        <div className="flex-1 min-w-0 pl-2">
                          <p className="font-semibold text-text-primary truncate group-hover:underline decoration-accent-green decoration-2 underline-offset-2 transition-all">{deck.name}</p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {totalCards} cards
                            {deck.kind === "qbank" && " • Question Bank"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {m ? (
                            <>
                              <div className="w-24 h-2 rounded-full overflow-hidden flex" style={{ background: "var(--glass-border)" }}>
                                <motion.div
                                  className="h-full rounded-l-full"
                                  style={{ background: "var(--accent-emerald)" }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${totalCards > 0 ? (masteredCount / totalCards) * 100 : 0}%` }}
                                  transition={{ delay: 0.8 + idx * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                                />
                                <motion.div
                                  className="h-full"
                                  style={{ background: "var(--accent-amber)" }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${totalCards > 0 ? (learningCount / totalCards) * 100 : 0}%` }}
                                  transition={{ delay: 0.9 + idx * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                                />
                              </div>
                              <span className="text-[10px] text-text-muted w-20 text-right">
                                {masteredCount}/{totalCards} mastered
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                                <div className="h-full rounded-full" style={{ background: "var(--accent-green)", width: "0%" }} />
                              </div>
                              <span className="text-xs font-mono font-semibold w-10 text-right" style={{ color: "var(--text-muted)" }}>
                                —
                              </span>
                            </>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-text-muted group-hover:text-accent-green transition-colors shrink-0" />
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {recentGenerations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-text-primary tracking-wide">RECENT ACTIVITY</h2>
            <Link to="/history">
              <span className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
          <div className="space-y-2">
            {recentGenerations.slice(0, 3).map((gen) => (
              <div key={gen.id} className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--glass-card-bg-strong)", border: "1px solid var(--glass-border-faint)" }}>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: gen.success ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)" }}>
                  {gen.success ? <Sparkles className="h-4 w-4 text-accent-emerald" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {gen.type === "deck" ? "Generated flashcard deck" : "Generated question bank"}
                    {gen.deckName && `: ${gen.deckName}`}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(gen.createdAt).toLocaleDateString()} • {gen.durationMs ? `${(gen.durationMs / 1000).toFixed(1)}s` : "N/A"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {isWidgetEnabled("quickStudy") && (
        <QuickStudyFAB dueCount={dueCount} />
      )}

      <DashboardCustomizer
        isOpen={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        config={config}
        onConfigChange={handleConfigChange}
      />

      <StreakSettingsModal
        isOpen={showStreakSettings}
        onClose={() => setShowStreakSettings(false)}
        currentSettings={{
          dailyGoalMinutes: streakData?.dailyGoalMinutes ?? 20,
          dailyGoalCards: streakData?.dailyGoalCards ?? 30,
          reminderTime: "",
        }}
        onSave={handleStreakSettingsSave}
      />
    </div>
  );
}
