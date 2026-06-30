/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Lock, Trophy, Star, BookOpen, Target, Zap, Brain, Moon, Flame } from "lucide-react";
import * as api from "../lib/api";
import { PageTransition } from "../components/ui";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: typeof Gift;
  color: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  category: string;
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, "unlocked" | "progress">[] = [
  { id: "first-deck", name: "First Steps", description: "Create your first deck", icon: BookOpen, color: "var(--accent-green)", maxProgress: 1, category: "Study" },
  { id: "century", name: "Century", description: "Study 100 cards", icon: Target, color: "var(--accent-blue)", maxProgress: 100, category: "Study" },
  { id: "perfectionist", name: "Perfectionist", description: "100% accuracy in a session (20+ cards)", icon: Star, color: "var(--accent-amber)", maxProgress: 1, category: "Accuracy" },
  { id: "night-owl", name: "Night Owl", description: "Study after midnight", icon: Moon, color: "var(--accent-purple)", maxProgress: 1, category: "Study" },
  { id: "marathon", name: "Marathon", description: "Complete a 2-hour study session", icon: Flame, color: "var(--accent-rose)", maxProgress: 120, category: "Study" },
  { id: "deck-master", name: "Deck Master", description: "Create 10 decks", icon: Brain, color: "var(--accent-cyan)", maxProgress: 10, category: "Study" },
  { id: "ai-power", name: "AI Power User", description: "Generate 500 cards with AI", icon: Zap, color: "var(--accent-amber)", maxProgress: 500, category: "AI" },
  { id: "streak-7", name: "Week Warrior", description: "7-day study streak", icon: Flame, color: "var(--accent-rose)", maxProgress: 7, category: "Streaks" },
  { id: "streak-30", name: "Monthly Master", description: "30-day study streak", icon: Trophy, color: "var(--accent-amber)", maxProgress: 30, category: "Streaks" },
  { id: "card-creator", name: "Card Creator", description: "Create 50 cards manually", icon: BookOpen, color: "var(--accent-green)", maxProgress: 50, category: "Study" },
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    const load = async () => {
      try {
        const [streakData, decksData, progressData] = await Promise.all([
          api.dashboardExtendedApi.getStreak().catch(() => null),
          api.decksApi.list().catch(() => []),
          api.dashboardExtendedApi.getState().catch(() => null),
        ]);

        const streakDays = streakData?.currentStreak || 0;
        const deckCount = Array.isArray(decksData) ? decksData.length : 0;
        const totalStudied = (progressData as any)?.totalCardsStudied || 0;

        const loaded = ACHIEVEMENT_DEFINITIONS.map((def) => {
          let progress: number;
          let unlocked: boolean;

          switch (def.id) {
            case "first-deck":
              progress = Math.min(deckCount, 1);
              unlocked = deckCount >= 1;
              break;
            case "deck-master":
              progress = Math.min(deckCount, 10);
              unlocked = deckCount >= 10;
              break;
            case "century":
              progress = Math.min(totalStudied, 100);
              unlocked = totalStudied >= 100;
              break;
            case "streak-7":
              progress = Math.min(streakDays, 7);
              unlocked = streakDays >= 7;
              break;
            case "streak-30":
              progress = Math.min(streakDays, 30);
              unlocked = streakDays >= 30;
              break;
            default:
              progress = 0;
              unlocked = false;
          }

          return { ...def, progress, unlocked };
        });

        setAchievements(loaded);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const categories = ["All", ...new Set(ACHIEVEMENT_DEFINITIONS.map((a) => a.category))];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (loading) {
    return (
      <PageTransition className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl p-5 space-y-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div className="w-10 h-10 rounded-xl animate-shimmer" style={{ background: "var(--border-subtle)" }} />
              <div className="h-4 w-24 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
              <div className="h-3 w-32 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
            </div>
          ))}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Achievements</h1>
        <p className="text-sm text-text-secondary">
          {unlockedCount} of {achievements.length} unlocked
        </p>
        <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, var(--accent-green), var(--accent-blue))" }}
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all"
            style={{
              background: selectedCategory === cat ? "rgba(6, 182, 212, 0.12)" : "var(--bg-elevated)",
              border: `1px solid ${selectedCategory === cat ? "rgba(6, 182, 212, 0.25)" : "var(--border-subtle)"}`,
              color: selectedCategory === cat ? "var(--accent-cyan)" : "var(--text-secondary)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {achievements.map((achievement, i) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{
              background: achievement.unlocked ? `${achievement.color}08` : "var(--bg-elevated)",
              border: `1px solid ${achievement.unlocked ? `${achievement.color}25` : "var(--border-subtle)"}`,
              opacity: achievement.unlocked ? 1 : 0.6,
            }}
          >
            {achievement.unlocked && (
              <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
                <Trophy className="w-20 h-20" style={{ color: achievement.color }} />
              </div>
            )}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: achievement.unlocked ? `${achievement.color}15` : "var(--bg-surface)",
                  border: `1px solid ${achievement.unlocked ? `${achievement.color}30` : "var(--border-subtle)"}`,
                }}
              >
                {achievement.unlocked ? (
                  <achievement.icon className="h-5 w-5" style={{ color: achievement.color }} />
                ) : (
                  <Lock className="h-4 w-4 text-text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text-primary">{achievement.name}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{achievement.description}</div>
                {!achievement.unlocked && achievement.maxProgress > 1 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[9px] text-text-muted mb-1">
                      <span>{achievement.progress} / {achievement.maxProgress}</span>
                      <span>{Math.round((achievement.progress / achievement.maxProgress) * 100)}%</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
                          background: achievement.color,
                          opacity: 0.5,
                        }}
                      />
                    </div>
                  </div>
                )}
                {achievement.unlocked && (
                  <span
                    className="inline-block mt-2 text-[9px] font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: `${achievement.color}15`, color: achievement.color }}
                  >
                    ✓ Unlocked
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </PageTransition>
  );
}
