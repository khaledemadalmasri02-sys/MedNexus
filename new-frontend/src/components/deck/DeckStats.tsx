/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingDown, Target } from "lucide-react";
import { Link } from "react-router-dom";
import * as api from "../../lib/api";
import { FloatingWidget, ProgressRing } from "../ui";

interface DeckStatsData {
  totalCards: number;
  studiedCards: number;
  unstudiedCards: number;
  masteredCards: number;
  learningCards: number;
  newCards: number;
  avgQuality: number;
  weakestCards: Array<{ id: number; front: string; mastery: number }>;
}

export function DeckStats({ deckId }: { deckId: number }) {
  const [stats, setStats] = useState<DeckStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cardsData, progressData] = await Promise.all([
          api.decksApi.getCards(deckId).catch(() => []),
          (api.cardProgressApi as any).getByDeck(deckId).catch(() => []),
        ]);

        const total = (cardsData as any[]).length;
        const progressList = progressData as any[];
        const studied = progressList.length;
        const mastered = progressList.filter((p: any) => (p.mastery || 0) >= 80).length;
        const learning = progressList.filter((p: any) => (p.mastery || 0) >= 30 && (p.mastery || 0) < 80).length;
        const unstudied = total - studied;
        const avgQuality = progressList.length > 0
          ? progressList.reduce((sum: number, p: any) => sum + (p.mastery || 0), 0) / progressList.length
          : 0;

        const weakest = progressList
          .filter((p: any) => (p.mastery || 0) < 50)
          .sort((a: any, b: any) => (a.mastery || 0) - (b.mastery || 0))
          .slice(0, 5)
          .map((p: any) => {
            const card = (cardsData as any[]).find((c: any) => c.id === p.cardId);
            return {
              id: p.cardId,
              front: card?.front?.slice(0, 40) || "Unknown card",
              mastery: p.mastery || 0,
            };
          });

        setStats({
          totalCards: total,
          studiedCards: studied,
          unstudiedCards: unstudied,
          masteredCards: mastered,
          learningCards: learning,
          newCards: unstudied,
          avgQuality,
          weakestCards: weakest,
        });
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [deckId]);

  if (loading) {
    return (
      <FloatingWidget className="p-5">
        <div className="space-y-3">
          <div className="h-4 w-32 rounded animate-shimmer" style={{ background: "var(--border-subtle)" }} />
          <div className="h-24 rounded-xl animate-shimmer" style={{ background: "var(--border-subtle)" }} />
        </div>
      </FloatingWidget>
    );
  }

  if (!stats) return null;

  const masteryPct = stats.totalCards > 0 ? Math.round((stats.masteredCards / stats.totalCards) * 100) : 0;

  return (
    <FloatingWidget className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">Deck Statistics</h3>
      </div>

      <div className="flex items-center gap-6 mb-5">
        <ProgressRing progress={masteryPct} size={80} strokeWidth={6} color="var(--accent-green)" />
        <div className="flex-1 grid grid-cols-2 gap-2">
          {[
            { label: "Total", value: stats.totalCards, color: "var(--text-primary)" },
            { label: "Mastered", value: stats.masteredCards, color: "var(--accent-emerald)" },
            { label: "Learning", value: stats.learningCards, color: "var(--accent-amber)" },
            { label: "Unstudied", value: stats.unstudiedCards, color: "var(--text-muted)" },
          ].map((item) => (
            <div key={item.label} className="text-center p-2 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
              <div className="text-sm font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[9px] text-text-muted">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {stats.weakestCards.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="h-3.5 w-3.5 text-accent-rose" />
            <span className="text-xs font-medium text-text-secondary">Weakest Cards</span>
          </div>
          <div className="space-y-1">
            {stats.weakestCards.map((card) => (
              <div key={card.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-text-primary truncate">{card.front}</div>
                </div>
                <div className="text-[10px] font-bold" style={{ color: "var(--accent-rose)" }}>
                  {card.mastery}%
                </div>
              </div>
            ))}
          </div>
          <Link to={`/study?deck=${deckId}`}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full mt-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
              style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.2)", color: "var(--accent-rose)" }}
            >
              <Target className="h-3.5 w-3.5" />
              Study Weak Cards
            </motion.button>
          </Link>
        </div>
      )}
    </FloatingWidget>
  );
}
