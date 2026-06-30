/* eslint-disable react-hooks/refs */
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Shuffle, RotateCcw,
  Check, X, Eye, HelpCircle, FileText,
  Loader2, AlertCircle, ArrowLeft,
} from "lucide-react";
import * as api from "../lib/api";
import StudyExplanation from "../components/StudyExplanation";
import { useSettings } from "../hooks/useSettings";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

interface StudyCard {
  id: number;
  front: string;
  back: string;
  cardType: "basic" | "cloze" | "mcq";
  choices?: string[];
  correctIndex?: number;
  explanationFull?: string | null;
  explanationRevision?: string | null;
  explanationOsce?: string | null;
  explanationBrief?: string | null;
  explanationMnemonic?: string | null;
  explanationClinical?: string | null;
  explanationTesttrap?: string | null;
}

const LETTER_COLORS: Record<string, string> = { A: "bg-sky-500", B: "bg-orange-500", C: "bg-purple-500", D: "bg-pink-500" };

const cardGlass = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
} as const;

export default function Study() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { settings } = useSettings();
  const [deck, setDeck] = useState<{ name: string; id: number } | null>(null);
  const [allCards, setAllCards] = useState<StudyCard[]>([]);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [unknown, setUnknown] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
  const [shuffled, setShuffled] = useState(false);
  const [flipPhase, setFlipPhase] = useState<'front' | 'flipping' | 'back'>('front');
  const [feedbackState, setFeedbackState] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [showHints, setShowHints] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const autoRevealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reduced = usePrefersReducedMotion();
  const sessionCardsStudied = useRef(0);

  const dailyGoalCards = settings.dailyGoalCards || 50;
  const cardOrder = settings.cardOrder || "sequential";
  const autoReveal = settings.autoReveal ?? false;
  const autoRevealSeconds = settings.autoRevealSeconds || 5;
  const showExplanation = settings.showExplanation !== false;

  const orderCards = useCallback((cardsToOrder: StudyCard[]) => {
    if (cardOrder === "shuffled") {
      return [...cardsToOrder].sort(() => Math.random() - 0.5);
    }
    if (cardOrder === "weakest") {
      return [...cardsToOrder].sort((a, b) => (a.id - b.id));
    }
    return cardsToOrder;
  }, [cardOrder]);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        setLoading(true);
        setError(null);
        const deckIdParam = id || searchParams.get("deck");
        const deckId = Number(deckIdParam);
        if (!deckIdParam || isNaN(deckId)) {
          setError("No deck selected");
          setLoading(false);
          return;
        }
        const [deckData, cardsData] = await Promise.all([api.decksApi.get(deckId), api.decksApi.getCards(deckId)]);
        setDeck({ name: deckData.name, id: deckData.id });
        const studyCards: StudyCard[] = cardsData.map((card) => ({
          id: card.id, front: card.front, back: card.back,
          cardType: card.choices ? "mcq" : "basic",
          choices: card.choices ? JSON.parse(card.choices) : undefined,
          correctIndex: card.correctIndex ?? undefined,
          explanationFull: card.explanationFull,
          explanationRevision: card.explanationRevision,
          explanationOsce: card.explanationOsce,
          explanationBrief: card.explanationBrief,
          explanationMnemonic: card.explanationMnemonic,
          explanationClinical: card.explanationClinical,
          explanationTesttrap: card.explanationTesttrap,
        }));
        const ordered = orderCards(studyCards);
        setAllCards(ordered);
        setCards(ordered);
      } catch (err) {
        console.error("Failed to fetch cards:", err);
        setError("Failed to load cards. The deck may not exist.");
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [id, searchParams, orderCards]);

  const current = cards[index];
  const total = cards.length;
  const progress = total > 0 ? ((known.size + unknown.size) / total) * 100 : 0;
  const isMcq = current?.cardType === "mcq" && current.choices && current.correctIndex !== undefined;

  const goNext = useCallback(() => {
    if (index + 1 >= total) { setDone(true); return; }
    if (sessionCardsStudied.current >= dailyGoalCards) { setDone(true); return; }
    setFlipPhase('flipping');
    setTimeout(() => {
      setIndex((i) => i + 1);
      setRevealed(false);
      setMcqSelected(null);
      setFlipPhase('front');
      setFeedbackState('none');
    }, reduced ? 100 : 200);
  }, [index, total, reduced, dailyGoalCards]);

  const goPrev = useCallback(() => {
    if (index === 0) return;
    setIndex((i) => i - 1);
    setRevealed(false);
    setMcqSelected(null);
    setFlipPhase('front');
    setFeedbackState('none');
  }, [index]);

  const markKnown = useCallback(() => {
    if (!current) return;
    sessionCardsStudied.current += 1;
    setKnown((prev) => new Set([...prev, current.id]));
    setUnknown((prev) => { const s = new Set(prev); s.delete(current.id); return s; });
    setFeedbackState('correct');
    api.cardProgressApi.review(current.id, 4).catch(() => {});
    setTimeout(goNext, reduced ? 200 : 600);
  }, [current, goNext, reduced]);

  const markUnknown = useCallback(() => {
    if (!current) return;
    sessionCardsStudied.current += 1;
    setUnknown((prev) => new Set([...prev, current.id]));
    setKnown((prev) => { const s = new Set(prev); s.delete(current.id); return s; });
    setFeedbackState('incorrect');
    api.cardProgressApi.review(current.id, 1).catch(() => {});
    setTimeout(goNext, reduced ? 200 : 600);
  }, [current, goNext, reduced]);

  const handleShuffle = () => {
    if (shuffled) {
      setShuffled(false);
      setCards(orderCards(allCards));
    } else {
      const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
      setCards(shuffledCards);
      setShuffled(true);
    }
    setIndex(0); setRevealed(false); setMcqSelected(null); setKnown(new Set()); setUnknown(new Set()); setDone(false);
    setFlipPhase('front');
    sessionCardsStudied.current = 0;
  };

  const handleRestart = () => { setIndex(0); setRevealed(false); setMcqSelected(null); setKnown(new Set()); setUnknown(new Set()); setDone(false); setFlipPhase('front'); sessionCardsStudied.current = 0; };

  const handleReveal = () => {
    if (autoRevealTimerRef.current) clearTimeout(autoRevealTimerRef.current);
    setFlipPhase('flipping');
    setTimeout(() => {
      setRevealed(true);
      setFlipPhase('back');
    }, reduced ? 100 : 200);
  };

  // Auto-reveal after delay
  useEffect(() => {
    if (autoRevealTimerRef.current) clearTimeout(autoRevealTimerRef.current);
    if (autoReveal && !revealed) {
      autoRevealTimerRef.current = setTimeout(() => {
        handleReveal();
      }, autoRevealSeconds * 1000);
    }
    return () => {
      if (autoRevealTimerRef.current) clearTimeout(autoRevealTimerRef.current);
    };
  }, [index, autoReveal, autoRevealSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) handleReveal();
        else markKnown();
      }
      if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "1" && revealed) markKnown();
      if (e.key === "2" && revealed) markUnknown();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [revealed, goNext, goPrev, markKnown, markUnknown]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-show hints after 5s inactivity
  useEffect(() => {
    const resetHintTimer = () => {
      setShowHints(false);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setShowHints(true), 5000);
    };
    resetHintTimer();
    window.addEventListener('keydown', resetHintTimer);
    window.addEventListener('mousemove', resetHintTimer);
    return () => {
      window.removeEventListener('keydown', resetHintTimer);
      window.removeEventListener('mousemove', resetHintTimer);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, [index]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-accent-green" />
      <p className="text-text-secondary">Loading cards...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="h-12 w-12 text-amber-400" />
      <p className="text-text-secondary">{error}</p>
      <p className="text-text-muted text-sm">Choose a deck to start studying</p>
      <div className="flex gap-3">
        <Link to="/library">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 rounded-xl text-white font-medium text-sm flex items-center gap-2" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>
            <ArrowLeft className="h-4 w-4" /> Browse Library
          </motion.button>
        </Link>
        <Link to="/generate">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 rounded-xl text-text-secondary font-medium text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)" }}>
            Generate Cards
          </motion.button>
        </Link>
      </div>
    </div>
  );

  if (cards.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <FileText className="h-12 w-12 text-text-muted" />
      <p className="text-text-secondary">This deck has no cards yet</p>
      <Link to="/generate">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 rounded-xl text-white font-medium text-sm" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>Generate Cards</motion.button>
      </Link>
    </div>
  );

  if (done) {
    const pct = total > 0 ? Math.round((known.size / total) * 100) : 0;
    const goalReached = sessionCardsStudied.current >= dailyGoalCards;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-8">
        <motion.div
          initial={reduced ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">
            {goalReached ? "🏆" : "🎉"}
          </div>
          <h2 className="font-display text-2xl font-bold text-text-primary mb-2">
            {goalReached ? "Daily Goal Reached!" : "Session Complete!"}
          </h2>
          <p className="text-text-secondary">
            You studied {sessionCardsStudied.current} of {dailyGoalCards} cards ({pct}% mastery)
          </p>
        </motion.div>

        <div className="flex items-center gap-6">
          {[
            { label: 'Known', value: known.size, color: 'var(--accent-emerald)', delay: 0.2 },
            { label: 'Review', value: unknown.size, color: 'var(--accent-rose)', delay: 0.4 },
            { label: 'Mastery', value: `${pct}%`, color: 'var(--accent-blue)', delay: 0.6 },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay, type: 'spring', stiffness: 200, damping: 20 }}
            >
              <motion.div
                className="text-2xl font-bold"
                style={{ color: stat.color }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: stat.delay, type: 'spring', stiffness: 300, damping: 15 }}
              >
                {stat.value}
              </motion.div>
              <div className="text-xs text-text-secondary">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="flex gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRestart}
            className="px-6 py-3 rounded-xl font-medium flex items-center gap-2"
            style={cardGlass}
          >
            <RotateCcw className="h-4 w-4" /> Study Again
          </motion.button>
          <Link to="/library">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 rounded-xl text-white font-medium"
              style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
            >
              Back to Library
            </motion.button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Focus vignette overlay */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 45%, transparent 0%, rgba(5,5,5,0.4) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <Link to="/library" className="text-sm text-text-secondary hover:text-text-primary transition-colors">← {deck?.name || "Library"}</Link>
        <div className="flex items-center gap-2">
          <button onClick={handleShuffle} className="p-2 rounded-lg transition-colors" style={shuffled ? { color: "var(--accent-green)", background: "rgba(6, 182, 212, 0.1)" } : { color: "var(--text-secondary)" }} title="Shuffle"><Shuffle className="h-4 w-4" /></button>
          <button onClick={handleRestart} className="p-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors" title="Restart"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8 relative z-10">
        <div className="flex items-center justify-between text-xs text-text-secondary mb-2">
          <span>Card {index + 1} of {total}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(148, 163, 184, 0.08)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, var(--accent-green), var(--accent-purple))" }}
            animate={{ width: progress + "%" }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
          <span className="flex items-center gap-1"><Check className="h-3 w-3 text-accent-emerald" /> {known.size} known</span>
          <span className="flex items-center gap-1"><X className="h-3 w-3 text-accent-rose" /> {unknown.size} review</span>
        </div>
      </div>

      {/* Card with 3D flip */}
      <div className="relative z-10" style={{ perspective: 1000 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, rotateY: flipPhase === 'front' ? 90 : 0, scale: 0.95 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, rotateY: flipPhase === 'front' ? -90 : 0, scale: 0.95 }}
            transition={{ duration: reduced ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] as const }}
            className="rounded-2xl p-8 mb-6 min-h-[320px] flex flex-col relative overflow-hidden"
            style={{
              ...cardGlass,
              transformStyle: 'preserve-3d',
              boxShadow: feedbackState === 'correct'
                ? '0 0 40px rgba(16,185,129,0.2), 0 8px 32px rgba(0,0,0,0.2)'
                : feedbackState === 'incorrect'
                ? '0 0 40px rgba(244,63,94,0.2), 0 8px 32px rgba(0,0,0,0.2)'
                : '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

            {/* Feedback flash */}
            <AnimatePresence>
              {feedbackState !== 'none' && (
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    background: feedbackState === 'correct'
                      ? 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.15) 0%, transparent 70%)'
                      : 'radial-gradient(circle at 50% 50%, rgba(244,63,94,0.15) 0%, transparent 70%)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>

            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-lg">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <HelpCircle className="h-4 w-4 text-text-muted" />
                  <span className="text-xs text-text-muted uppercase tracking-wider">{isMcq ? "Multiple Choice" : "Question"}</span>
                </div>
                <p className="text-lg text-text-primary leading-relaxed">{current.front}</p>
                {isMcq && revealed && current.choices && (
                  <div className="mt-6 space-y-2 text-left">
                    {current.choices.map((choice, idx) => {
                      const isSelected = mcqSelected === idx;
                      const isCorrect = idx === current.correctIndex;
                      const showResult = mcqSelected !== null;
                      let bg = "rgba(15, 23, 42, 0.5)";
                      let borderColor = "rgba(148, 163, 184, 0.08)";
                      let textColor = "var(--text-primary)";
                      if (showResult) {
                        if (isCorrect) { bg = "rgba(16, 185, 129, 0.1)"; borderColor = "rgba(16, 185, 129, 0.2)"; textColor = "var(--accent-emerald)"; }
                        else if (isSelected && !isCorrect) { bg = "rgba(244, 63, 94, 0.1)"; borderColor = "rgba(244, 63, 94, 0.2)"; textColor = "var(--accent-rose)"; }
                      }
                      return (
                        <motion.button
                          key={idx}
                          onClick={() => !showResult && setMcqSelected(idx)}
                          disabled={showResult}
                          className="w-full p-3 rounded-xl text-left text-sm transition-all flex items-center gap-3"
                          style={{ background: bg, border: `1px solid ${borderColor}`, color: textColor }}
                          whileHover={!showResult ? { scale: 1.01, x: 4 } : {}}
                          whileTap={!showResult ? { scale: 0.99 } : {}}
                        >
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${LETTER_COLORS[String.fromCharCode(65 + idx)] || "bg-gray-500"}`}>{String.fromCharCode(65 + idx)}</span>
                          {choice}
                          {showResult && isCorrect && <Check className="h-4 w-4 ml-auto" />}
                          {showResult && isSelected && !isCorrect && <X className="h-4 w-4 ml-auto" />}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {showExplanation && (
              <StudyExplanation
                front={current.front}
                back={current.back}
                isRevealed={revealed}
                cardId={current.id}
                explanations={{
                  full: current.explanationFull,
                  revision: current.explanationRevision,
                  osce: current.explanationOsce,
                  brief: current.explanationBrief,
                  mnemonic: current.explanationMnemonic,
                  clinical: current.explanationClinical,
                  testtrap: current.explanationTesttrap,
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between relative z-10">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={goPrev} disabled={index === 0} className="p-3 rounded-xl disabled:opacity-30" style={cardGlass}>
          <ChevronLeft className="h-5 w-5 text-text-primary" />
        </motion.button>
        <div className="flex gap-2">
          {!revealed ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReveal}
              className="px-6 py-3 rounded-xl text-white font-medium flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
            >
              <Eye className="h-4 w-4" /> Reveal
            </motion.button>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={markUnknown}
                className="px-4 py-3 rounded-xl font-medium flex items-center gap-2"
                style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.2)", color: "var(--accent-rose)" }}
                animate={feedbackState === 'incorrect' ? { x: [-4, 4, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <X className="h-4 w-4" /> Again
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={markKnown}
                className="px-4 py-3 rounded-xl font-medium flex items-center gap-2"
                style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "var(--accent-emerald)" }}
              >
                <Check className="h-4 w-4" /> Got it
              </motion.button>
            </>
          )}
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={goNext} className="p-3 rounded-xl" style={cardGlass}>
          <ChevronRight className="h-5 w-5 text-text-primary" />
        </motion.button>
      </div>

      {/* Keyboard hints */}
      <motion.div
        className="mt-8 flex items-center justify-center gap-4 text-xs text-text-muted relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: showHints ? 0.7 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <span>Space: Reveal</span>
        <span>← →: Navigate</span>
        <span>1: Got it</span>
        <span>2: Again</span>
      </motion.div>
    </div>
  );
}
