import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import * as sp from "../../lib/studypilotApi";
import { ApiError } from "../../lib/api";

interface CardLike {
  id: number;
  front: string;
  back: string;
  tags?: string | null;
  cardType: string;
  aiFront?: string | null;
  aiBack?: string | null;
  aiExplanation?: string | null;
  source?: "ai" | "heuristic" | null;
}

const QUALITY_LABELS = [
  { q: 0, label: "Blackout", color: "#ef4444" },
  { q: 1, label: "Wrong", color: "#f97316" },
  { q: 2, label: "Hard", color: "#eab308" },
  { q: 3, label: "OK", color: "#84cc16" },
  { q: 4, label: "Easy", color: "#22c55e" },
  { q: 5, label: "Perfect", color: "#10b981" },
];

export default function StudySession({
  cards,
  title,
  onDone,
}: {
  cards: CardLike[];
  title: string;
  onDone?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justRated, setJustRated] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationSource, setExplanationSource] = useState<"ai" | "heuristic" | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);

  const card = cards[index];
  const total = cards.length;

  useEffect(() => {
    setExplanation(null);
    setExplanationSource(null);
    if (revealed && card) {
      setExplanationLoading(true);
      sp.studypilotApi
        .getExplanation(card.id)
        .then(({ explanation: text, source }) => {
          setExplanation(text);
          setExplanationSource(source);
        })
        .catch(() => {
          setExplanation(null);
          setExplanationSource(null);
        })
        .finally(() => setExplanationLoading(false));
    }
  }, [revealed, card]);

  async function rate(quality: number) {
    if (!card) return;
    setSaving(true);
    try {
      await sp.studypilotApi.progress(card.id, quality);
      setJustRated(quality);
      setTimeout(() => {
        setJustRated(null);
        setRevealed(false);
        if (index + 1 >= total) {
          onDone?.();
        } else {
          setIndex((i) => i + 1);
        }
      }, 650);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to save progress";
      window.alert(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!card) {
    return (
      <div className="text-center py-16">
        <Check className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--accent-primary)" }} />
        <h3 className="text-xl font-semibold text-text-primary">All done!</h3>
        <p className="text-text-secondary mt-1">You've worked through every card in this set.</p>
      </div>
    );
  }

  const cardFront = card.aiFront || card.front;
  const cardBack = card.aiBack || card.back;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 text-sm text-text-secondary">
        <span className="font-medium">{title}</span>
        <span>{index + 1} / {total}</span>
      </div>

      <div className="h-1.5 rounded-full bg-black/20 mb-6 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${((index) / Math.max(1, total)) * 100}%`, background: "var(--accent-primary)" }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="rounded-2xl border border-white/10 bg-[var(--bg-card,#0b1220)] p-6 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {card.tags?.split(",").filter((t: string) => t && !t.startsWith("diff:")).slice(0, 4).map((t: string) => (
              <span key={t} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd" }}>
                {t.trim()}
              </span>
            ))}
            {card.tags?.includes("diff:hard") && (
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>hard</span>
            )}
            {card.tags?.includes("diff:easy") && (
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(34,197,94,0.15)", color: "#86efac" }}>easy</span>
            )}
          </div>

          <p className="text-lg text-text-primary whitespace-pre-wrap leading-relaxed">{cardFront}</p>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white"
              style={{ background: "var(--accent-primary)" }}
            >
              <RotateCcw className="w-4 h-4" /> Show answer
            </button>
          ) : (
            <div className="mt-5 pt-5 border-t border-white/10">
              <p className="text-text-secondary whitespace-pre-wrap leading-relaxed">{cardBack}</p>

              <div className="mt-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-text-primary">Explanation</span>
                  {explanationSource && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px]"
                      style={{
                        background: explanationSource === "ai" ? "rgba(124,58,237,0.15)" : "rgba(148,163,184,0.15)",
                        color: explanationSource === "ai" ? "#c4b5fd" : "#cbd5e1",
                      }}
                    >
                      {explanationSource === "ai" ? "AI" : "Heuristic"}
                    </span>
                  )}
                </div>
                {explanationLoading && <p className="text-sm text-text-secondary">Loading explanation…</p>}
                {explanation && (
                  <div className="text-sm text-text-secondary leading-relaxed prose-invert max-w-none">
                    <ReactMarkdown>{explanation}</ReactMarkdown>
                  </div>
                )}
              </div>

              <p className="mt-5 text-sm text-text-secondary">How well did you recall this?</p>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {QUALITY_LABELS.map(({ q, label, color }) => (
                  <button
                    key={q}
                    disabled={saving}
                    onClick={() => rate(q)}
                    className="flex flex-col items-center gap-1 py-2 rounded-xl border border-white/10 hover:scale-105 transition-transform disabled:opacity-50"
                    style={{ background: justRated === q ? color : "transparent" }}
                  >
                    <span className="text-lg font-bold" style={{ color: justRated === q ? "#fff" : color }}>{q}</span>
                    <span className="text-[11px] text-text-secondary">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-4 text-xs text-text-muted text-center">
        Self-rated spaced repetition. Explanations are AI-generated when available, otherwise offline heuristics.
      </p>
    </div>
  );
}
