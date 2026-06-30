import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Search, Edit3, Trash2, Download, Copy, Settings,
  BookOpen, BarChart3, Play, X, Check, Loader2,
  AlertCircle, FileText, Zap, Target,
  Clock, Layers,
} from "lucide-react";
import * as api from "../lib/api";
import type { Card, Deck } from "../lib/api";
import { AnimatedTabs, FloatingWidget, ProgressRing, Modal, GlowingInput, GlowingTextarea } from "../components/ui";

interface DeckWithSubs extends Deck {
  subDecks?: Deck[];
}

interface CardWithMastery extends Card {
  masteryPct: number;
  nextReview?: string;
}

const glassStyle = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
} as const;

function masteryColor(pct: number): string {
  if (pct >= 80) return "var(--accent-emerald)";
  if (pct >= 50) return "var(--accent-amber)";
  return "var(--accent-rose)";
}

// ─── Cards Tab ───
function CardsTab({ deckId }: { deckId: number; deckName: string }) {
  const [cards, setCards] = useState<CardWithMastery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingCard, setEditingCard] = useState<CardWithMastery | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ front: "", back: "", cardType: "basic", tags: "" });
  const [editForm, setEditForm] = useState({ front: "", back: "", cardType: "basic", tags: "" });
  const [saving, setSaving] = useState(false);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.decksApi.getCards(deckId);
      const progressData = await Promise.all(
        data.map(async (c) => {
          try {
            const q = await api.cardProgressApi.getDeckProgress(deckId);
            return { cardId: c.id, masteryPct: q.masteryPct };
          } catch {
            return { cardId: c.id, masteryPct: 0 };
          }
        })
      );
      const masteryMap = new Map(progressData.map(p => [p.cardId, p.masteryPct]));
      const cardsWithMastery: CardWithMastery[] = data.map(c => ({
        ...c,
        masteryPct: masteryMap.get(c.id) ?? 0,
      }));
      setCards(cardsWithMastery);
    } catch (err) {
      setError("Failed to load cards");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => { loadCards(); }, [loadCards]);

  const filteredCards = cards.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.front.toLowerCase().includes(s) || c.back.toLowerCase().includes(s) || (c.tags || "").toLowerCase().includes(s);
  });

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filteredCards.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredCards.map(c => c.id)));
    }
  };

  const handleAddCard = async () => {
    if (!addForm.front.trim() || !addForm.back.trim()) return;
    setSaving(true);
    try {
      await api.cardsApi.create({
        deckId,
        front: addForm.front,
        back: addForm.back,
        cardType: addForm.cardType,
        tags: addForm.tags || undefined,
      });
      setAddForm({ front: "", back: "", cardType: "basic", tags: "" });
      setShowAddForm(false);
      await loadCards();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleEditCard = async () => {
    if (!editingCard || !editForm.front.trim() || !editForm.back.trim()) return;
    setSaving(true);
    try {
      await api.cardsApi.update(editingCard.id, {
        front: editForm.front,
        back: editForm.back,
        cardType: editForm.cardType,
        tags: editForm.tags || undefined,
      });
      setEditingCard(null);
      await loadCards();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    for (const id of selected) {
      try { await api.cardsApi.delete(id); } catch { /* ignore */ }
    }
    setSelected(new Set());
    await loadCards();
  };

  const handleDeleteCard = async (id: number) => {
    try {
      await api.cardsApi.delete(id);
      await loadCards();
    } catch { /* ignore */ }
  };

  const openEdit = (card: CardWithMastery) => {
    setEditingCard(card);
    setEditForm({ front: card.front, back: card.back, cardType: card.cardType, tags: card.tags || "" });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-accent-green" />
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
      <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
      <p className="text-sm text-red-400">{error}</p>
    </div>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input type="text" placeholder="Search cards…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 h-11 rounded-xl text-sm outline-none transition-all duration-300 focus-ring"
            style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }} />
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowAddForm(true)}
          className="px-4 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 shrink-0"
          style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }}>
          <Plus className="h-4 w-4" /> Add Card
        </motion.button>
      </div>

      {/* Selection toolbar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-xl flex items-center gap-3 flex-wrap"
            style={{ background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.15)" }}>
            <span className="text-sm font-semibold text-text-primary">{selected.size} selected</span>
            <button onClick={selectAll} className="text-xs text-accent-blue hover:underline">
              {selected.size === filteredCards.length ? "Clear" : "Select All"}
            </button>
            <div className="flex-1" />
            <button onClick={handleDeleteSelected} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-[rgba(239,68,68,0.1)] transition-colors flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Card Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mb-6 p-5 rounded-2xl space-y-4" style={glassStyle}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-text-primary">New Card</h3>
                <button onClick={() => setShowAddForm(false)} className="text-text-muted hover:text-text-primary"><X className="h-4 w-4" /></button>
              </div>
              <GlowingInput placeholder="Front (question)…" value={addForm.front} onChange={e => setAddForm(f => ({ ...f, front: e.target.value }))} />
              <GlowingTextarea placeholder="Back (answer)…" value={addForm.back} onChange={e => setAddForm(f => ({ ...f, back: e.target.value }))} rows={3} />
              <div className="flex gap-3 items-end flex-wrap">
                <div className="space-y-1">
                  <label className="text-xs text-text-secondary">Type</label>
                  <select value={addForm.cardType} onChange={e => setAddForm(f => ({ ...f, cardType: e.target.value }))}
                    className="h-9 px-3 rounded-lg text-xs outline-none" style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}>
                    <option value="basic">Basic</option>
                    <option value="mcq">MCQ</option>
                  </select>
                </div>
                <GlowingInput placeholder="Tags (comma-separated)" value={addForm.tags} onChange={e => setAddForm(f => ({ ...f, tags: e.target.value }))} />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleAddCard} disabled={saving || !addForm.front.trim() || !addForm.back.trim()}
                  className="px-4 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards list */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ ...glassStyle, border: "2px dashed var(--glass-border-light)" }}>
          <FileText className="h-12 w-12 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary font-medium">{search ? "No cards match your search" : "No cards yet"}</p>
          <p className="text-text-muted text-sm mt-1">Add cards manually or generate them from the Generate tab</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCards.map((card, idx) => (
            <motion.div key={card.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
              className="rounded-xl p-3 flex items-center gap-3 group" style={glassStyle}>
              <input type="checkbox" checked={selected.has(card.id)} onChange={() => toggleSelect(card.id)}
                className="w-4 h-4 rounded accent-accent-green cursor-pointer shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate font-medium">{card.front}</p>
                    <p className="text-xs text-text-secondary truncate mt-0.5">{card.back}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      const isMcq = card.cardType === "mcq";
                      return (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                          background: isMcq ? "rgba(139, 92, 246, 0.1)" : "rgba(6, 182, 212, 0.1)",
                          color: isMcq ? "var(--accent-purple)" : "var(--accent-cyan)",
                          border: isMcq ? "1px solid rgba(139, 92, 246, 0.15)" : "1px solid rgba(6, 182, 212, 0.15)",
                        }}>{isMcq ? "MCQ" : "Basic"}</span>
                      );
                    })()}
                    <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                      <div className="h-full rounded-full" style={{ width: card.masteryPct + "%", background: masteryColor(card.masteryPct) }} />
                    </div>
                    <span className="text-[10px] font-mono w-8 text-right" style={{ color: masteryColor(card.masteryPct) }}>{card.masteryPct}%</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEdit(card)} className="p-1.5 rounded-lg hover:bg-[rgba(6,182,212,0.1)] transition-colors" title="Edit">
                  <Edit3 className="h-3.5 w-3.5 text-text-secondary" />
                </button>
                <button onClick={() => handleDeleteCard(card.id)} className="p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] transition-colors" title="Delete">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Edit Card Modal */}
      <Modal isOpen={!!editingCard} onClose={() => setEditingCard(null)} title="Edit Card">
        <div className="space-y-4">
          <GlowingInput placeholder="Front (question)…" value={editForm.front} onChange={e => setEditForm(f => ({ ...f, front: e.target.value }))} />
          <GlowingTextarea placeholder="Back (answer)…" value={editForm.back} onChange={e => setEditForm(f => ({ ...f, back: e.target.value }))} rows={3} />
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">Type</label>
              <select value={editForm.cardType} onChange={e => setEditForm(f => ({ ...f, cardType: e.target.value }))}
                className="h-9 px-3 rounded-lg text-xs outline-none" style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}>
                <option value="basic">Basic</option>
                <option value="mcq">MCQ</option>
              </select>
            </div>
            <GlowingInput placeholder="Tags" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditingCard(null)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-glass-border transition-colors">Cancel</button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleEditCard} disabled={saving}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
            </motion.button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Study Tab ───
function StudyTab({ deckId }: { deckId: number; deckName: string }) {
  const [progress, setProgress] = useState<api.DeckProgress | null>(null);
  const [reviewQueue, setReviewQueue] = useState<api.ReviewQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [p, rq] = await Promise.all([
          api.cardProgressApi.getDeckProgress(deckId),
          api.cardProgressApi.getReviewQueue(deckId),
        ]);
        setProgress(p);
        setReviewQueue(rq);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    load();
  }, [deckId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-accent-green" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Cards", value: progress?.total ?? 0, icon: Layers, color: "var(--accent-green)" },
          { label: "Due for Review", value: progress?.dueToday ?? 0, icon: Clock, color: "var(--accent-rose)" },
          { label: "Mastery", value: (progress?.masteryPct ?? 0) + "%", icon: Target, color: "var(--accent-purple)" },
          { label: "Mastered", value: progress?.mastered ?? 0, icon: Check, color: "var(--accent-emerald)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <FloatingWidget key={label} className="p-4 text-center">
            <Icon className="h-5 w-5 mx-auto mb-2" style={{ color }} />
            <p className="text-xl font-bold font-display" style={{ color }}>{value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{label}</p>
          </FloatingWidget>
        ))}
      </div>

      {/* Start Session */}
      <FloatingWidget className="p-6 text-center">
        <Play className="h-10 w-10 text-accent-green mx-auto mb-3" />
        <h3 className="font-display text-lg font-bold text-text-primary mb-2">Start Study Session</h3>
        <p className="text-sm text-text-secondary mb-4">
          {reviewQueue && reviewQueue.total > 0
            ? reviewQueue.dueCount + " cards due for review, " + reviewQueue.newCount + " new cards"
            : "No cards due for review. Start a new session anyway!"}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/study?deck=${deckId}`)}
            className="px-6 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }}>
            <Play className="h-4 w-4" /> Start Session
          </motion.button>
          {progress && progress.dueToday > 0 && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(`/study?deck=${deckId}&mode=review`)}
              className="px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2"
              style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "var(--accent-rose)" }}>
              <Zap className="h-4 w-4" /> Review Due ({progress.dueToday})
            </motion.button>
          )}
        </div>
      </FloatingWidget>

      {/* Quick settings */}
      <FloatingWidget className="p-5">
        <h4 className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase mb-3">Quick Settings</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl text-center" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
            <p className="text-sm font-semibold text-text-primary">10 cards</p>
            <p className="text-[10px] text-text-muted">Quick session</p>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
            <p className="text-sm font-semibold text-text-primary">25 cards</p>
            <p className="text-[10px] text-text-muted">Standard</p>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
            <p className="text-sm font-semibold text-text-primary">All cards</p>
            <p className="text-[10px] text-text-muted">Full deck</p>
          </div>
        </div>
      </FloatingWidget>
    </div>
  );
}

// ─── Stats Tab ───
function StatsTab({ deckId }: { deckId: number }) {
  const [progress, setProgress] = useState<api.DeckProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.cardProgressApi.getDeckProgress(deckId).then(setProgress).catch(() => {}).finally(() => setLoading(false));
  }, [deckId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-accent-green" />
    </div>
  );

  if (!progress) return null;

  const distribution = [
    { label: "Mastered", count: progress.mastered, color: "var(--accent-emerald)", pct: progress.total > 0 ? Math.round((progress.mastered / progress.total) * 100) : 0 },
    { label: "Learning", count: progress.learning, color: "var(--accent-amber)", pct: progress.total > 0 ? Math.round((progress.learning / progress.total) * 100) : 0 },
    { label: "New", count: progress.new, color: "var(--accent-blue)", pct: progress.total > 0 ? Math.round((progress.new / progress.total) * 100) : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Mastery Ring + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FloatingWidget className="p-6 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-accent-green" />
            <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Overall Mastery</span>
          </div>
          <ProgressRing progress={progress.masteryPct} size={140} strokeWidth={12} />
          <p className="text-sm text-text-secondary mt-3">
            {progress.masteryPct >= 80 ? "Excellent!" : progress.masteryPct >= 50 ? "Good progress" : "Keep studying!"}
          </p>
        </FloatingWidget>

        <FloatingWidget className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-accent-purple" />
            <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Card Distribution</span>
          </div>
          <div className="space-y-4">
            {distribution.map(d => (
              <div key={d.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-secondary">{d.label}</span>
                  <span className="text-xs font-semibold" style={{ color: d.color }}>{d.count} ({d.pct}%)</span>
                </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                    <motion.div className="h-full rounded-full" style={{ background: d.color }}
                      initial={{ width: 0 }} animate={{ width: d.pct + "%" }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }} />
                  </div>
              </div>
            ))}
          </div>
        </FloatingWidget>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Cards", value: progress.total, color: "var(--accent-green)" },
          { label: "Due Today", value: progress.dueToday, color: "var(--accent-rose)" },
          { label: "Mastered", value: progress.mastered, color: "var(--accent-emerald)" },
          { label: "Learning", value: progress.learning, color: "var(--accent-amber)" },
        ].map(s => (
          <FloatingWidget key={s.label} className="p-4 text-center">
            <p className="text-2xl font-bold font-display" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-text-secondary mt-1">{s.label}</p>
          </FloatingWidget>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Tab ───
function SettingsTab({ deck, onUpdate }: { deck: DeckWithSubs; onUpdate: () => void }) {
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description || "");
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const navigate = useNavigate();

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.decksApi.update(deck.id, { name, description: description || undefined });
      onUpdate();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.decksApi.delete(deck.id);
      navigate("/library");
    } catch { /* ignore */ }
  };

  const handleDuplicate = async () => {
    try {
      const cards = await api.decksApi.getCards(deck.id);
      const newDeck = await api.decksApi.create({ name: `${deck.name} (Copy)`, description: deck.description || undefined });
      for (const card of cards) {
        await api.cardsApi.create({
          deckId: newDeck.id,
          front: card.front,
          back: card.back,
          cardType: card.cardType,
          tags: card.tags || undefined,
        });
      }
      setShowDuplicate(false);
      navigate(`/deck/${newDeck.id}`);
    } catch { /* ignore */ }
  };

  const handleExport = async () => {
    try {
      const result = await api.decksApi.export(deck.id);
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deck.name}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* General */}
      <FloatingWidget className="p-6 space-y-4">
        <h4 className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">General</h4>
        <GlowingInput label="Deck Name" value={name} onChange={e => setName(e.target.value)} />
        <GlowingTextarea label="Description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving || !name.trim()}
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save Changes
        </motion.button>
      </FloatingWidget>

      {/* Actions */}
      <FloatingWidget className="p-6 space-y-3">
        <h4 className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Actions</h4>
        <button onClick={handleExport} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-glass-surface transition-colors" style={{ border: "1px solid var(--glass-border)" }}>
          <Download className="h-4 w-4 text-accent-blue" />
          <div className="text-left"><p className="text-sm text-text-primary">Export as CSV</p><p className="text-[10px] text-text-muted">Download all cards</p></div>
        </button>
        <button onClick={() => setShowDuplicate(true)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-glass-surface transition-colors" style={{ border: "1px solid var(--glass-border)" }}>
          <Copy className="h-4 w-4 text-accent-purple" />
          <div className="text-left"><p className="text-sm text-text-primary">Duplicate Deck</p><p className="text-[10px] text-text-muted">Copy all cards to a new deck</p></div>
        </button>
      </FloatingWidget>

      {/* Danger Zone */}
      <FloatingWidget className="p-6 space-y-3" style={{ border: "1px solid rgba(239, 68, 68, 0.2)" }}>
        <h4 className="text-xs font-display font-semibold text-red-400 tracking-wider uppercase">Danger Zone</h4>
        <button onClick={() => setShowDelete(true)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[rgba(239,68,68,0.08)] transition-colors" style={{ border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <Trash2 className="h-4 w-4 text-red-400" />
          <div className="text-left"><p className="text-sm text-red-400">Delete Deck</p><p className="text-[10px] text-text-muted">Permanently remove this deck and all cards</p></div>
        </button>
      </FloatingWidget>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Deck?">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">This will permanently delete &ldquo;{deck.name}&rdquo; and all its cards. This cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowDelete(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-glass-border transition-colors">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm bg-red-500/90 text-white hover:bg-red-600 transition-colors font-medium">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Duplicate Modal */}
      <Modal isOpen={showDuplicate} onClose={() => setShowDuplicate(false)} title="Duplicate Deck?">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Create a copy of &ldquo;{deck.name}&rdquo; with all its cards?</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowDuplicate(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-glass-border transition-colors">Cancel</button>
            <button onClick={handleDuplicate} className="px-4 py-2 rounded-lg text-sm bg-accent-purple text-white hover:opacity-90 transition-colors font-medium">Duplicate</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main DeckDetail Page ───
export default function DeckDetail() {
  const { id } = useParams();
  const deckId = Number(id);
  const [deck, setDeck] = useState<DeckWithSubs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("cards");

  const loadDeck = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.decksApi.get(deckId);
      setDeck(data);
    } catch (err) {
      setError("Failed to load deck");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => { if (!isNaN(deckId)) loadDeck(); }, [deckId, loadDeck]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-accent-green" />
      <p className="text-text-secondary">Loading deck...</p>
    </div>
  );

  if (error || !deck) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="h-12 w-12 text-red-400" />
      <p className="text-text-secondary">{error || "Deck not found"}</p>
      <Link to="/library">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 rounded-xl text-white font-medium text-sm"
          style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>Back to Library</motion.button>
      </Link>
    </div>
  );

  const tabs = [
    { id: "cards", label: "Cards", icon: <BookOpen className="h-4 w-4" />, count: deck.cardCount },
    { id: "study", label: "Study", icon: <Play className="h-4 w-4" /> },
    { id: "stats", label: "Stats", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/library" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-3">
          <ArrowLeft className="h-4 w-4" /> Library
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">{deck.name}</h1>
        </div>
        {deck.description && <p className="text-text-secondary text-sm mt-1">{deck.description}</p>}
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <AnimatedTabs tabs={tabs} activeTab={tab} onChange={setTab} />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          {tab === "cards" && <CardsTab deckId={deckId} deckName={deck.name} />}
          {tab === "study" && <StudyTab deckId={deckId} deckName={deck.name} />}
          {tab === "stats" && <StatsTab deckId={deckId} />}
          {tab === "settings" && <SettingsTab deck={deck} onUpdate={loadDeck} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
