import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Layers, Clock, Sparkles, CheckCircle, Brain, Trash2, Flame, CheckCheck,
  BookOpen, Zap, TrendingUp, Play,
} from "lucide-react";
import type { Deck } from "../../lib/api";
import type { ExplanationProgress, ExplanationStats } from "../../lib/api";
import * as api from "../../lib/api";

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const deckGradients = [
  { from: "#3B82F6", to: "#8B5CF6", glow: "rgba(59,130,246,0.3)", icon: "rgba(59,130,246,0.12)" },
  { from: "#8B5CF6", to: "#EC4899", glow: "rgba(139,92,246,0.3)", icon: "rgba(139,92,246,0.12)" },
  { from: "#06B6D4", to: "#3B82F6", glow: "rgba(6,182,212,0.3)", icon: "rgba(6,182,212,0.12)" },
  { from: "#10B981", to: "#06B6D4", glow: "rgba(16,185,129,0.3)", icon: "rgba(16,185,129,0.12)" },
  { from: "#F59E0B", to: "#EF4444", glow: "rgba(245,158,11,0.3)", icon: "rgba(245,158,11,0.12)" },
  { from: "#EC4899", to: "#8B5CF6", glow: "rgba(236,72,153,0.3)", icon: "rgba(236,72,153,0.12)" },
  { from: "#14B8A6", to: "#3B82F6", glow: "rgba(20,184,166,0.3)", icon: "rgba(20,184,166,0.12)" },
  { from: "#F97316", to: "#F59E0B", glow: "rgba(249,115,22,0.3)", icon: "rgba(249,115,22,0.12)" },
];

function getGradient(index: number) {
  return deckGradients[index % deckGradients.length];
}

function MasteryRing({ mastery, color, size = 52 }: { mastery: number; color: string; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (mastery / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth={3}
          opacity={0.3}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ring-${Math.round(mastery)})`}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as const }}
        />
        <defs>
          <linearGradient id={`ring-${Math.round(mastery)}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold font-display" style={{ color }}>
          {mastery}
        </span>
      </div>
    </div>
  );
}

function TiltCard({ children, gradient }: { children: React.ReactNode; gradient: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [8, -8]);
  const rotateY = useTransform(x, [-100, 100], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="deck-card-tilt"
    >
      <div className="deck-card-glow" style={{ background: gradient }} />
      {children}
    </motion.div>
  );
}

interface DeckCardProps {
  deck: Deck;
  deckProgress: api.DeckProgress | undefined;
  index: number;
  isGenerating: boolean;
  progress: ExplanationProgress | undefined;
  stats: ExplanationStats | undefined;
  hasExplanations: boolean;
  onGenerate: (deckId: number, e: React.MouseEvent) => void;
  onDelete: (deckId: number) => void;
  onDeleteRequest: (deckId: number) => void;
  onCancelDelete: () => void;
  isDeleteConfirm: boolean;
  selectedDecks?: Set<number>;
  onToggleSelect?: (id: number) => void;
}

export function DeckCard({
  deck, deckProgress, index, isGenerating, progress, stats, hasExplanations,
  onGenerate, onDelete, onDeleteRequest, onCancelDelete, isDeleteConfirm,
  selectedDecks, onToggleSelect,
}: DeckCardProps) {
  const mastery = deckProgress?.masteryPct ?? 0;
  const dueCount = deckProgress?.dueToday ?? 0;
  const gradient = getGradient(index);
  const cardCount = deck.cardCount || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -20, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
    >
      <TiltCard gradient={`linear-gradient(135deg, ${gradient.from}, ${gradient.to})`}>
        <div className="deck-card rounded-2xl overflow-hidden relative group" data-hover="true">
          <Link to={`/deck/${deck.id}`} className="block">
            {/* Gradient header band */}
            <div
              className="h-2 w-full relative overflow-hidden"
              style={{ background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-slow" />
            </div>

            <div className="p-5">
              {/* Top row: icon + title + actions */}
              <div className="flex items-start gap-3.5">
                {/* Icon */}
                <motion.div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative"
                  style={{ background: gradient.icon }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Layers className="h-5 w-5" style={{ color: gradient.from }} />
                  {dueCount > 0 && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "#EF4444" }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-[8px] font-bold text-white">{dueCount > 9 ? "9+" : dueCount}</span>
                    </motion.div>
                  )}
                </motion.div>

                {/* Title + subtitle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-text-primary text-[15px] truncate leading-tight">
                      {deck.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(deck.updatedAt || deck.createdAt)}
                    </span>
                    {deck.kind === "qbank" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wider"
                        style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--accent-purple)", border: "1px solid rgba(139, 92, 246, 0.15)" }}>
                        QBank
                      </span>
                    )}
                  </div>
                </div>

                {/* Mastery ring (desktop) */}
                <div className="hidden sm:block shrink-0">
                  <MasteryRing mastery={mastery} color={gradient.from} />
                </div>
              </div>

              {/* Tags row */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {hasExplanations && (
                  <motion.span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                    style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))", color: "var(--accent-emerald)", border: "1px solid rgba(16,185,129,0.2)" }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Sparkles className="h-2.5 w-2.5" /> AI Ready
                  </motion.span>
                )}
                {dueCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                    style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <Flame className="h-2.5 w-2.5" /> {dueCount} due
                  </span>
                )}
                {dueCount === 0 && deckProgress && deckProgress.total > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
                    style={{ background: "rgba(16,185,129,0.06)", color: "var(--accent-emerald)", border: "1px solid rgba(16,185,129,0.12)" }}>
                    <CheckCheck className="h-2.5 w-2.5" /> Caught up
                  </span>
                )}
                {hasExplanations && stats && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                    style={{ background: "rgba(59,130,246,0.08)", color: "var(--accent-blue)", border: "1px solid rgba(59,130,246,0.12)" }}>
                    {stats.withExplanations} with AI
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-3 text-[10px] text-text-muted">
                    {deckProgress && deckProgress.total > 0 && (
                      <>
                        <span className="flex items-center gap-0.5">
                          <TrendingUp className="h-2.5 w-2.5" style={{ color: "var(--accent-emerald)" }} />
                          {deckProgress.mastered}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <BookOpen className="h-2.5 w-2.5" style={{ color: "var(--accent-amber)" }} />
                          {deckProgress.learning}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Zap className="h-2.5 w-2.5" style={{ color: "var(--accent-blue)" }} />
                          {deckProgress.new}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold" style={{ color: gradient.from }}>
                    {cardCount} cards
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                  {deckProgress && deckProgress.total > 0 ? (
                    <div className="h-full flex rounded-full overflow-hidden">
                      <motion.div
                        className="h-full"
                        style={{ background: "var(--accent-emerald)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(deckProgress.mastered / deckProgress.total) * 100}%` }}
                        transition={{ delay: 0.3 + index * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
                      />
                      <motion.div
                        className="h-full"
                        style={{ background: "var(--accent-amber)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(deckProgress.learning / deckProgress.total) * 100}%` }}
                        transition={{ delay: 0.4 + index * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
                      />
                    </div>
                  ) : (
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${gradient.from}40, ${gradient.to}40)` }}
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                    />
                  )}
                </div>
              </div>

              {/* Generating progress */}
              {isGenerating && progress && (
                <motion.div
                  className="mt-3"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-3 w-3 text-accent-green" />
                    </motion.div>
                    <span className="text-[10px] text-accent-green font-medium">
                      Generating explanations... {progress.completed}/{progress.total}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${gradient.from}, ${gradient.to})` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}

              {/* AI study modes hint */}
              {hasExplanations && !isGenerating && (
                <motion.div
                  className="mt-3 flex items-center gap-1.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Brain className="h-3 w-3 text-accent-purple" />
                  <span className="text-[10px] text-text-muted">Revision · OSCE · Mnemonics</span>
                </motion.div>
              )}
            </div>
          </Link>

          {/* Action buttons overlay */}
          <div className="absolute top-3 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
            {selectedDecks !== undefined && onToggleSelect && (
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(deck.id); }}
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: selectedDecks.has(deck.id) ? gradient.from : "var(--glass-surface)", border: `1px solid ${selectedDecks.has(deck.id) ? gradient.from : "var(--glass-border)"}` }}
              >
                {selectedDecks.has(deck.id) && <CheckCircle className="h-3 w-3 text-white" />}
              </motion.button>
            )}
            {!isGenerating && !hasExplanations && (
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => onGenerate(deck.id, e)}
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}
                title="Generate AI explanations"
              >
                <Sparkles className="h-3 w-3 text-accent-green" />
              </motion.button>
            )}
            {hasExplanations && (
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <CheckCircle className="h-3 w-3 text-accent-emerald" />
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteRequest(deck.id); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.12)" }}
              title="Delete deck"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </motion.button>
          </div>

          {/* Study button on hover */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <Link to={`/deck/${deck.id}`} onClick={(e) => e.stopPropagation()}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`, boxShadow: `0 4px 15px ${gradient.glow}` }}
              >
                <Play className="h-3 w-3" /> Study
              </motion.button>
            </Link>
          </div>
        </div>
      </TiltCard>

      {/* Delete confirmation */}
      <AnimatePresence>
        {isDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
            className="overflow-hidden"
          >
            <div className="p-3.5 rounded-xl flex items-center justify-between" style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
              <p className="text-xs text-red-400 font-medium">Delete &ldquo;{deck.name}&rdquo;?</p>
              <div className="flex gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); onCancelDelete(); }}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-text-secondary hover:text-text-primary hover:bg-glass-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(deck.id); }}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-red-500/90 text-white hover:bg-red-600 transition-colors font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface DeckListProps {
  decks: Deck[];
  generatingDecks: Set<number>;
  explanationProgress: Record<number, ExplanationProgress>;
  explanationStats: Record<number, ExplanationStats>;
  onGenerateExplanations: (deckId: number, e: React.MouseEvent) => void;
  onDelete: (deckId: number) => void;
  selectedDecks?: Set<number>;
  onToggleSelect?: (id: number) => void;
  glassStyle?: Record<string, string>;
}

export function DeckList({
  decks, generatingDecks, explanationProgress, explanationStats,
  onGenerateExplanations, onDelete, selectedDecks, onToggleSelect,
}: DeckListProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deckProgressMap, setDeckProgressMap] = useState<Record<number, api.DeckProgress>>({});

  useEffect(() => {
    const loadProgress = async () => {
      const progressEntries = await Promise.all(
        decks.map(async (deck) => {
          try {
            const progress = await api.cardProgressApi.getDeckProgress(deck.id);
            return [deck.id, progress] as [number, api.DeckProgress];
          } catch {
            return [deck.id, null] as [number, null];
          }
        })
      );
      const map: Record<number, api.DeckProgress> = {};
      for (const [id, p] of progressEntries) {
        if (p) map[id] = p;
      }
      setDeckProgressMap(map);
    };
    if (decks.length > 0) loadProgress();
  }, [decks]);

  const handleDelete = async (id: number) => {
    setDeleteConfirm(null);
    await onDelete(id);
  };

  if (decks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-20 rounded-2xl"
        style={{ background: "var(--glass-card-bg)", border: "2px dashed var(--glass-border-light)", backdropFilter: "blur(20px)" }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Layers className="h-16 w-16 text-text-muted mx-auto mb-4" />
        </motion.div>
        <p className="text-text-secondary font-display font-semibold text-lg mb-1">No decks found</p>
        <p className="text-text-muted text-sm">Try adjusting your search or create a new deck</p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {decks.map((deck, idx) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            deckProgress={deckProgressMap[deck.id]}
            index={idx}
            isGenerating={generatingDecks.has(deck.id)}
            progress={explanationProgress[deck.id]}
            stats={explanationStats[deck.id]}
            hasExplanations={(explanationStats[deck.id]?.withExplanations ?? 0) > 0 || (explanationProgress[deck.id]?.status === "completed" && (explanationProgress[deck.id]?.completed ?? 0) > 0)}
            onGenerate={onGenerateExplanations}
            onDelete={handleDelete}
            onDeleteRequest={(id) => setDeleteConfirm(id)}
            onCancelDelete={() => setDeleteConfirm(null)}
            isDeleteConfirm={deleteConfirm === deck.id}
            selectedDecks={selectedDecks}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}
