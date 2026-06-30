import { motion, AnimatePresence } from "framer-motion";
import { Play, X, Check, XCircle, Shuffle } from "lucide-react";
import { useState, useEffect } from "react";
import { smoothTransition, SPRING } from "../ui/constants";
import * as api from "../../lib/api";

interface QuickStudyFABProps {
  dueCount: number;
}

interface QuickCard {
  id: number;
  deckId: number;
  front: string;
  back: string;
  deckName?: string;
}

export default function QuickStudyFAB({ dueCount }: QuickStudyFABProps) {
  const [expanded, setExpanded] = useState(false);
  const [studying, setStudying] = useState(false);
  const [cards, setCards] = useState<QuickCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studying) return;
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [studying]);

  if (dueCount === 0 && !expanded) return null;

  const startSession = async () => {
    setLoading(true);
    try {
      const decks = await api.decksApi.list();
      const allCards: QuickCard[] = [];
      for (const deck of decks.slice(0, 5)) {
        try {
          const queue = await api.cardProgressApi.getReviewQueue(deck.id);
          if (queue.cards) {
            allCards.push(...queue.cards.map(c => ({ ...c, deckName: deck.name })));
          }
        } catch { continue; }
      }
      setCards(allCards);
      setStudying(true);
      setExpanded(true);
      setCurrentIdx(0);
      setShowBack(false);
      setKnown(0);
      setUnknown(0);
      setElapsed(0);
      setComplete(false);
    } catch (err) {
      console.error("Failed to load cards:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (isKnown: boolean) => {
    const card = cards[currentIdx];
    if (card) {
      try {
        await api.cardProgressApi.review(card.id, isKnown ? 4 : 1);
      } catch { /* ignore */ }
    }
    if (isKnown) setKnown(prev => prev + 1);
    else setUnknown(prev => prev + 1);

    if (currentIdx + 1 >= cards.length) {
      setComplete(true);
      setStudying(false);
    } else {
      setCurrentIdx(prev => prev + 1);
      setShowBack(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setExpanded(false); setStudying(false); setComplete(false); }} />

            <motion.div
              className="relative w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", boxShadow: "0 24px 48px -12px rgba(0,0,0,0.3)" }}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={SPRING.gentle}
            >
              <div className="p-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-text-primary text-sm">
                      {complete ? "Session Complete! ✅" : studying ? `Quick Review — ${cards.length} cards` : `Quick Review — ${cards.length} cards due`}
                    </h3>
                    {studying && !complete && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        {currentIdx + 1}/{cards.length} · {formatTime(elapsed)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setExpanded(false); setStudying(false); setComplete(false); }}
                    className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-white/5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : complete ? (
                  <motion.div
                    className="text-center py-6"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={smoothTransition}
                  >
                    <p className="text-3xl font-bold font-display text-text-primary mb-2">
                      {known + unknown} cards reviewed
                    </p>
                    <p className="text-sm text-text-secondary mb-1">in {formatTime(elapsed)}</p>
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <span className="text-sm font-semibold" style={{ color: "var(--accent-emerald)" }}>✓ {known} known</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--accent-rose, #f43f5e)" }}>✗ {unknown} need review</span>
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                      {cards.length > 0 ? `${Math.round((known / cards.length) * 100)}% accuracy` : ""}
                    </p>
                  </motion.div>
                ) : studying && cards.length > 0 ? (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(6, 182, 212, 0.1)", color: "var(--accent-green)" }}>
                        {cards[currentIdx]?.deckName || "Deck"}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {currentIdx + 1} of {cards.length}
                      </span>
                    </div>

                    <motion.div
                      className="rounded-xl p-5 mb-4 min-h-[120px] flex items-center justify-center"
                      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
                      key={currentIdx}
                      initial={{ opacity: 0, rotateY: -90 }}
                      animate={{ opacity: 1, rotateY: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="text-sm text-text-primary text-center font-medium">
                        {showBack ? cards[currentIdx]?.back : cards[currentIdx]?.front}
                      </p>
                    </motion.div>

                    {!showBack ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowBack(true)}
                        className="w-full py-3 rounded-xl font-semibold text-sm"
                        style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", color: "white" }}
                      >
                        Reveal Answer
                      </motion.button>
                    ) : (
                      <div className="flex gap-3">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAnswer(false)}
                          className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                          style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.2)", color: "#f43f5e" }}
                        >
                          <XCircle className="h-4 w-4" />
                          Don't Know
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAnswer(true)}
                          className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                          style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "var(--accent-emerald)" }}
                        >
                          <Check className="h-4 w-4" />
                          Know
                        </motion.button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-text-secondary mb-4">Review all {cards.length} due cards</p>
                    <div className="flex gap-3 justify-center">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={startSession}
                        className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
                        style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                      >
                        <Play className="h-4 w-4" />
                        Start All
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={startSession}
                        className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2"
                        style={{ border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}
                      >
                        <Shuffle className="h-4 w-4" />
                        Shuffle & Start
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))",
          boxShadow: "0 4px 20px rgba(6, 182, 212, 0.35)",
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setExpanded(true); if (cards.length === 0) startSession(); }}
      >
        <Play className="h-6 w-6 text-white" />
        {dueCount > 0 && (
          <motion.span
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: "var(--accent-amber)" }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {dueCount > 99 ? "99+" : dueCount}
          </motion.span>
        )}
      </motion.button>
    </>
  );
}
