import { useState, useMemo, useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock,
  BookOpen, CheckCircle2, Circle, X, Trash2,
  Flame, Target, Trophy, Sparkles, Timer, CalendarCheck,
  ChevronDown, Layers, Stethoscope, FileOutput, Link2,
  RefreshCw, Loader2, AlertCircle, Play, Pause, Square,
  GripVertical, GitBranch,
  Download, Printer, Focus, AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatedTabs, Modal, GlowingInput } from "../components/ui";
import { smoothTransition, staggerContainer, listItem } from "../components/ui/constants";
import { useNavbarVisibility } from "../components/Navbar";
import { plannersApi, studySessionsApi, decksApi, qbanksApi, summaryApi, plannerTemplatesApi, examsApi } from "../lib/api";
import type { PlannerPlan, StudySessionStats, StudyExam } from "../lib/api";
import type { Deck, QBank } from "../lib/api";
import AnalyticsView from "../components/planner/AnalyticsView";
import AIGeneratePlanModal from "../components/planner/AIGeneratePlanModal";
import type { PlannerTemplate } from "../lib/api";
import ExamCountdown from "../components/planner/ExamCountdown";
import ExamsPanel from "../components/planner/ExamsPanel";
import FocusNowModal from "../components/planner/FocusNowModal";
import StreakHeatmap from "../components/planner/StreakHeatmap";
import SubjectLegend from "../components/planner/SubjectLegend";
import PlannerSidebar, { type PlannerView } from "../components/planner/PlannerSidebar";
import EmptyState from "../components/planner/EmptyState";

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
/** JS getDay() (0=Sun..6=Sat) → planner weekday (0=Mon..6=Sun). */
const toPlannerDow = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const COLORS = [
  'var(--accent-green)',
  'var(--accent-purple)',
  'var(--accent-amber)',
  'var(--accent-emerald)',
  'var(--accent-violet)',
  'var(--accent-blue)',
  'var(--accent-rose)',
];

type ReferenceType = 'deck' | 'qbank' | 'summary';

interface Reference {
  type: ReferenceType;
  id: number | string;
  name: string;
  cardCount?: number;
}

const glassStyle = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
};

// Thick layered glass for the grid container (refracts the orbs)
const glassThick = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.10), 0 24px 70px rgba(0,0,0,.40)",
};

const CONFETTI_COLORS = ['var(--accent-green)', 'var(--accent-purple)', 'var(--accent-amber)', 'var(--accent-emerald)', 'var(--accent-violet)', 'var(--accent-blue)'];

function generateConfettiParticles() {
  return Array.from({ length: 24 }, (_, i) => ({
    id: i,
    delay: i * 0.03,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    yOffset: -60 - Math.random() * 80,
    xOffset: (Math.random() - 0.5) * 120,
    rotateOffset: 360 + Math.random() * 360,
    duration: 1.2 + Math.random() * 0.6,
  }));
}

function ConfettiParticle({ delay, x, color, yOffset, xOffset, rotateOffset, duration }: {
  delay: number; x: number; color: string; yOffset: number; xOffset: number; rotateOffset: number; duration: number;
}) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ background: color, left: x, top: '50%' }}
      initial={{ opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        y: [0, yOffset, 40],
        x: [0, xOffset],
        rotate: [0, rotateOffset],
        scale: [1, 1.2, 0.5],
      }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] as const }}
    />
  );
}

function Confetti({ show }: { show: boolean }) {
  const particles = useMemo(() => generateConfettiParticles(), []);
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} delay={p.delay} x={p.x} color={p.color} yOffset={p.yOffset} xOffset={p.xOffset} rotateOffset={p.rotateOffset} duration={p.duration} />
      ))}
    </div>
  );
}

function ScrollSelect({ value, onChange, options, label }: {
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-secondary">{label}</label>
      <div ref={ref} className="relative">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => setOpen(!open)}
          className="w-full rounded-xl text-sm outline-none text-left flex items-center justify-between"
          style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${open ? 'var(--accent-purple)' : 'var(--border-default)'}`,
            color: 'var(--text-primary)',
            padding: '0.75rem 1rem',
            boxShadow: open ? '0 0 0 3px rgba(139, 92, 246, 0.1)' : 'none',
          }}
        >
          <span>{selected?.label}</span>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-4 w-4 text-text-muted" />
          </motion.div>
        </motion.button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 flex items-center justify-between"
                  style={{
                    background: opt.value === value ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                    color: opt.value === value ? 'var(--accent-purple)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => { if (opt.value !== value) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { if (opt.value !== value) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <CheckCircle2 className="h-3.5 w-3.5 text-accent-purple" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ReferencePicker({ reference, onChange }: {
  reference: Reference | undefined;
  onChange: (ref: Reference | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ReferenceType>('deck');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [qbanks, setQbanks] = useState<QBank[]>([]);
  const [summaries, setSummaries] = useState<Array<{ id: string; fileName: string; size: number }>>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [d, q, s] = await Promise.all([
        decksApi.list(),
        qbanksApi.list(),
        summaryApi.list(),
      ]);
      setDecks(d);
      setQbanks(q);
      setSummaries(s.summaries);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !loading && decks.length === 0 && qbanks.length === 0) {
      loadData();
    }
  }, [open, loading, decks.length, qbanks.length, loadData]);

  const handleSelect = useCallback((type: ReferenceType, id: number | string, name: string, cardCount?: number) => {
    onChange({ type, id, name, cardCount });
    setOpen(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange(undefined);
    setOpen(false);
  }, [onChange]);

  const tabs = [
    { id: 'deck' as const, label: 'Cards', icon: Layers },
    { id: 'qbank' as const, label: 'QBank', icon: Stethoscope },
    { id: 'summary' as const, label: 'Summary', icon: FileOutput },
  ];

  const referenceIcon = reference?.type === 'deck' ? Layers : reference?.type === 'qbank' ? Stethoscope : FileOutput;
  const ReferenceIcon = referenceIcon;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-secondary">Reference (optional)</label>
      <div ref={ref} className="relative">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => setOpen(!open)}
          className="w-full rounded-xl text-sm outline-none text-left flex items-center gap-2"
          style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${open ? 'var(--accent-purple)' : reference ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-default)'}`,
            color: reference ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '0.75rem 1rem',
            boxShadow: open ? '0 0 0 3px rgba(139, 92, 246, 0.1)' : 'none',
          }}
        >
          {reference ? (
            <>
              <ReferenceIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--accent-purple)' }} />
              <span className="truncate flex-1">{reference.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md shrink-0" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
                {reference.type === 'deck' ? 'Cards' : reference.type === 'qbank' ? 'QBank' : 'Summary'}
              </span>
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 shrink-0" />
              <span>Link to library item...</span>
            </>
          )}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
              }}
            >
              {reference && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors duration-150 border-b"
                  style={{ color: 'rgb(239, 68, 68)', borderColor: 'var(--border-subtle)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Remove reference</span>
                </button>
              )}

              <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                {tabs.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-150"
                    style={{
                      color: tab === t.id ? 'var(--accent-purple)' : 'var(--text-muted)',
                      borderBottom: tab === t.id ? '2px solid var(--accent-purple)' : '2px solid transparent',
                      background: tab === t.id ? 'rgba(139, 92, 246, 0.04)' : 'transparent',
                    }}
                  >
                    <t.icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {loading ? (
                  <div className="py-6 text-center text-xs text-text-muted">Loading...</div>
                ) : tab === 'deck' ? (
                  decks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-text-muted">No decks in library</div>
                  ) : (
                    decks.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleSelect('deck', d.id, d.name, d.cardCount)}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors duration-150"
                        style={{
                          background: reference?.type === 'deck' && reference.id === d.id ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                          color: reference?.type === 'deck' && reference.id === d.id ? 'var(--accent-purple)' : 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => { if (reference?.id !== d.id) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                        onMouseLeave={(e) => { if (reference?.id !== d.id) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Layers className="h-4 w-4 shrink-0 text-accent-green" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{d.name}</p>
                          <p className="text-[10px] text-text-muted">{d.cardCount || 0} cards</p>
                        </div>
                        {reference?.type === 'deck' && reference.id === d.id && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-accent-purple shrink-0" />
                        )}
                      </button>
                    ))
                  )
                ) : tab === 'qbank' ? (
                  qbanks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-text-muted">No question banks in library</div>
                  ) : (
                    qbanks.map(q => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleSelect('qbank', q.id, q.name, q.questionCount)}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors duration-150"
                        style={{
                          background: reference?.type === 'qbank' && reference.id === q.id ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                          color: reference?.type === 'qbank' && reference.id === q.id ? 'var(--accent-purple)' : 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => { if (reference?.id !== q.id) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                        onMouseLeave={(e) => { if (reference?.id !== q.id) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Stethoscope className="h-4 w-4 shrink-0 text-accent-purple" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{q.name}</p>
                          <p className="text-[10px] text-text-muted">{q.questionCount || 0} questions</p>
                        </div>
                        {reference?.type === 'qbank' && reference.id === q.id && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-accent-purple shrink-0" />
                        )}
                      </button>
                    ))
                  )
                ) : (
                  summaries.length === 0 ? (
                    <div className="py-6 text-center text-xs text-text-muted">No summaries in library</div>
                  ) : (
                    summaries.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelect('summary', s.id, s.fileName)}
                        className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors duration-150"
                        style={{
                          background: reference?.type === 'summary' && reference.id === s.id ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                          color: reference?.type === 'summary' && reference.id === s.id ? 'var(--accent-purple)' : 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => { if (reference?.id !== s.id) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                        onMouseLeave={(e) => { if (reference?.id !== s.id) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <FileOutput className="h-4 w-4 shrink-0 text-accent-blue" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{s.fileName}</p>
                          <p className="text-[10px] text-text-muted">{s.size ? `${(s.size / 1024).toFixed(0)} KB` : ''}</p>
                        </div>
                        {reference?.type === 'summary' && reference.id === s.id && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-accent-purple shrink-0" />
                        )}
                      </button>
                    ))
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AddSessionModal({ isOpen, onClose, onAdd, editPlan }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (s: { title: string; day: number; startHour: number; endHour: number; color: string; notes: string; reference: Reference | undefined; durationMinutes: number; deckId: number | null; recurrence: string }) => void;
  editPlan?: PlannerPlan | null;
}) {
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(0);
  const [startHour, setStartHour] = useState(9);
  const [duration, setDuration] = useState(60);
  const [color, setColor] = useState(COLORS[0]);
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState<Reference | undefined>(undefined);
  const [recurrence, setRecurrence] = useState('none');

  useEffect(() => {
    if (editPlan) {
      setTitle(editPlan.title);
      setDay(editPlan.dayOfWeek);
      setStartHour(editPlan.startHour);
      setDuration(editPlan.durationMinutes);
      setColor(editPlan.color || COLORS[0]);
      setNotes(editPlan.description || '');
      setRecurrence(editPlan.recurrence || 'none');
      if (editPlan.deckId && editPlan.deckName) {
        setReference({ type: 'deck', id: editPlan.deckId, name: editPlan.deckName });
      } else {
        setReference(undefined);
      }
    }
  }, [editPlan, isOpen]);

  const reset = useCallback(() => {
    setTitle(''); setDay(0); setStartHour(9); setDuration(60); setColor(COLORS[0]); setNotes(''); setReference(undefined); setRecurrence('none');
  }, []);

  const endHour = startHour + Math.ceil(duration / 60);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      day,
      startHour,
      endHour,
      color,
      notes: notes.trim(),
      reference,
      durationMinutes: duration,
      deckId: reference?.type === 'deck' ? (reference.id as number) : null,
      recurrence,
    });
    reset();
    onClose();
  }, [title, day, startHour, endHour, duration, color, notes, reference, recurrence, onAdd, reset, onClose]);

  const hourOptions = ALL_HOURS.map(h => ({ value: h, label: `${h.toString().padStart(2, '0')}:00` }));
  const durationOptions = [
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 180, label: '3 hours' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editPlan ? "Edit Study Session" : "Schedule Study Session"}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ...smoothTransition }}
        className="space-y-5"
      >
        <GlowingInput label="Session Title" placeholder="e.g. Cardiology Basics" value={title} onChange={(e) => setTitle(e.target.value)} />

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Day</label>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="w-full rounded-xl text-sm outline-none transition-all duration-300"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '0.75rem 1rem' }}
            >
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <ScrollSelect label="Start Hour" value={startHour} onChange={(v) => { setStartHour(v); }} options={hourOptions} />
          <ScrollSelect label="Duration" value={duration} onChange={setDuration} options={durationOptions} />
        </div>

        <ReferencePicker reference={reference} onChange={setReference} />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">Recurrence</label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="w-full rounded-xl text-sm outline-none transition-all duration-300"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '0.75rem 1rem' }}
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">Color</label>
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <motion.button
                key={c}
                type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setColor(c)}
                className="w-8 h-8 rounded-full transition-all duration-200"
                style={{
                  background: c,
                  boxShadow: color === c ? `0 0 0 3px ${c}40, 0 0 12px ${c}30` : 'none',
                  transform: color === c ? 'scale(1.1)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes for this session..."
            rows={2}
            className="w-full rounded-xl text-sm outline-none transition-all duration-300 resize-none"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '0.75rem 1rem' }}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.25)' }}
          >
            {editPlan ? 'Save Changes' : 'Schedule Session'}
          </motion.button>
        </div>
      </motion.div>
    </Modal>
  );
}

function SessionCard({ plan, onToggle, onDelete, onSelect, conflict = false }: {
  plan: PlannerPlan;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onSelect: (plan: PlannerPlan) => void;
  conflict?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const duration = plan.durationMinutes;
  const endHour = plan.startHour + Math.ceil(duration / 60);
  const isCompleted = plan.completed === true || plan.completed === 1;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
      whileHover={{ scale: 1.03, zIndex: 10 }}
      className="rounded-lg p-2 h-full cursor-pointer relative group overflow-hidden"
      style={{
        background: `${plan.color}12`,
        border: `1px solid ${conflict ? "rgba(239,68,68,.6)" : plan.color + "25"}`,
        boxShadow: conflict ? "0 0 0 1px rgba(239,68,68,.4)" : undefined,
      }}
      data-hover="true"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onSelect(plan)}
    >
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-2 -right-2 flex gap-1 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onToggle(plan.id)}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: isCompleted ? 'var(--accent-emerald)' : 'var(--bg-surface)', border: `1px solid ${plan.color}` }}
            >
              <CheckCircle2 className="h-3 w-3" style={{ color: isCompleted ? 'white' : plan.color }} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(plan.id)}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239, 68, 68, 0.8)' }}
            >
              <X className="h-3 w-3 text-white" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="flex items-center gap-1 mb-1"
        animate={isCompleted ? { opacity: 0.6 } : { opacity: 1 }}
      >
        <motion.div
          animate={isCompleted ? { rotate: [0, -10, 10, -5, 0], scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.4 }}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-3 w-3 text-accent-emerald shrink-0" />
          ) : (
            <Circle className="h-3 w-3 shrink-0" style={{ color: plan.color }} />
          )}
        </motion.div>
        <span
          className="text-[10px] font-semibold truncate"
          style={{ color: isCompleted ? 'var(--text-muted)' : plan.color, textDecoration: isCompleted ? 'line-through' : 'none' }}
        >
          {conflict && <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5 text-red-400" />}
          {plan.title}
        </span>
      </motion.div>
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-text-muted">{plan.startHour}:00–{endHour}:00</span>
        {plan.deckId && (
          <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
            {plan.deckName || 'Linked'}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function SortableSessionCard({ plan, onToggle, onDelete, onSelect, gridStyle, conflict = false }: {
  plan: PlannerPlan;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onSelect: (plan: PlannerPlan) => void;
  gridStyle?: React.CSSProperties;
  conflict?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: plan.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    ...gridStyle,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0.5 left-0.5 z-30 cursor-grab active:cursor-grabbing p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'var(--bg-void)' }}
      >
        <GripVertical className="h-2.5 w-2.5 text-white/70" />
      </div>
      <SessionCard plan={plan} onToggle={onToggle} onDelete={onDelete} onSelect={onSelect} conflict={conflict} />
    </div>
  );
}

function SessionDetailPanel({ plan, onClose, onToggle, onDelete, onChanged }: {
  plan: PlannerPlan | null;
  onClose: () => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  onChanged?: () => void;
}) {
  if (!plan) return null;
  const duration = plan.durationMinutes;
  const endHour = plan.startHour + Math.ceil(duration / 60);
  const isCompleted = plan.completed === true || plan.completed === 1;

  return (
    <AnimatePresence>
      {plan && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={smoothTransition}
          className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 p-4 overflow-y-auto"
          style={{ background: 'var(--bg-surface)', backdropFilter: 'blur(40px)', borderLeft: '1px solid var(--border-default)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-lg font-semibold text-text-primary">Session Details</h3>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose} className="p-2 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              <X className="h-4 w-4 text-text-secondary" />
            </motion.button>
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-16 rounded-full" style={{ background: plan.color }} />
              <div>
                <p className="font-semibold text-text-primary text-lg">{plan.title}</p>
                <p className="text-sm text-text-secondary">{DAYS[plan.dayOfWeek]} · {plan.startHour}:00 – {endHour}:00 · {duration >= 60 ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ''}` : `${duration}m`}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <Clock className="h-4 w-4 text-text-muted mb-1" />
                <p className="text-xs text-text-muted">Duration</p>
                <p className="text-sm font-semibold text-text-primary">{duration >= 60 ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ''}` : `${duration}m`}</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <CalendarCheck className="h-4 w-4 text-text-muted mb-1" />
                <p className="text-xs text-text-muted">Status</p>
                <p className="text-sm font-semibold" style={{ color: isCompleted ? 'var(--accent-emerald)' : plan.color }}>
                  {isCompleted ? 'Completed' : 'Upcoming'}
                </p>
              </div>
            </div>

            {plan.deckId && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="h-4 w-4 text-accent-purple" />
                  <p className="text-xs font-semibold text-accent-purple">Linked Deck</p>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent-green" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{plan.deckName || 'Deck'}</p>
                  </div>
                  <a
                    href={`/deck/${plan.deckId}`}
                    className="text-[10px] px-2 py-1 rounded-md shrink-0 font-semibold"
                    style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open →
                  </a>
                </div>
              </div>
            )}

            {plan.description && (
              <div className="rounded-xl p-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                <p className="text-xs text-text-muted mb-1">Notes</p>
                <p className="text-sm text-text-primary">{plan.description}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { onToggle(plan.id); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{
                  background: isCompleted ? 'var(--bg-elevated)' : `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                  border: `1px solid ${isCompleted ? 'var(--border-default)' : 'transparent'}`,
                  color: isCompleted ? 'var(--text-secondary)' : 'white',
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    await plannersApi.update(plan.id, { dayOfWeek: (plan.dayOfWeek + 1) % 7 });
                    onChanged?.();
                    onClose();
                  } catch { /* ignore */ }
                }}
                title="Move to tomorrow"
                className="py-3 px-3 rounded-xl text-sm font-semibold flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={async () => {
                  try {
                    await plannersApi.expand(plan.id);
                    onChanged?.();
                  } catch { /* ignore */ }
                }}
                title="Expand recurring instances"
                className="py-3 px-3 rounded-xl text-sm font-semibold flex items-center justify-center"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
              >
                <GitBranch className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { onDelete(plan.id); onClose(); }}
                className="py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'rgb(239, 68, 68)' }}
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PomodoroTimer({ plan, onComplete }: { plan: PlannerPlan; onComplete: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [showRating, setShowRating] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const start = async () => {
    try {
      const session = await studySessionsApi.start({ planId: plan.id, deckId: plan.deckId || undefined });
      setSessionId(session.id);
    } catch { /* ignore */ }
    setShowRating(false);
    setRunning(true);
    intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  };

  const pause = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const stop = async () => {
    pause();
    if (sessionId) {
      try {
        await studySessionsApi.end(sessionId, {});
      } catch { /* ignore */ }
    }
    setShowRating(true);
  };

  const rate = async (focusRating: number) => {
    if (sessionId) {
      try {
        await studySessionsApi.end(sessionId, { focusRating });
      } catch { /* ignore */ }
    }
    setShowRating(false);
    onComplete();
  };

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const progress = Math.min(100, (seconds / (plan.durationMinutes * 60)) * 100);

  if (showRating) {
    return (
      <div className="mt-2">
        <p className="text-[10px] text-text-muted mb-1">How was your focus?</p>
        <div className="flex gap-2">
          {[
            { label: "Hard", value: 2, color: "#ef4444" },
            { label: "Ok", value: 3, color: "#f59e0b" },
            { label: "Easy", value: 5, color: "#22c55e" },
          ].map((r) => (
            <motion.button
              key={r.value}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => rate(r.value)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold"
              style={{ background: `${r.color}18`, border: `1px solid ${r.color}40`, color: r.color }}
            >
              {r.label}
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="flex-1">
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: plan.color }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      <span className="text-xs font-mono text-text-secondary w-16 text-right">
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      {!running ? (
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={start}
          className="p-1.5 rounded-lg" style={{ background: `${plan.color}20` }}>
          <Play className="h-3.5 w-3.5" style={{ color: plan.color }} />
        </motion.button>
      ) : (
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={pause}
          className="p-1.5 rounded-lg" style={{ background: `${plan.color}20` }}>
          <Pause className="h-3.5 w-3.5" style={{ color: plan.color }} />
        </motion.button>
      )}
      {seconds > 0 && (
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={stop}
          className="p-1.5 rounded-lg" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <Square className="h-3.5 w-3.5 text-red-400" />
        </motion.button>
      )}
    </div>
  );
}

export default function Planner() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<PlannerView>('week');
  const [plans, setPlans] = useState<PlannerPlan[]>([]);
  const [sessionStats, setSessionStats] = useState<StudySessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [templates, setTemplates] = useState<PlannerTemplate[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlannerPlan | null>(null);
  const [selectedSession, setSelectedSession] = useState<PlannerPlan | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(3);
  const [streak, setStreak] = useState(0);
  const [exams, setExams] = useState<StudyExam[]>([]);
  const [heatmap, setHeatmap] = useState<Array<{ date: string; plannedMinutes: number; actualMinutes: number; sessionsCompleted: number; hasActivity: boolean }>>([]);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [nowOpen, setNowOpen] = useState(false);
  const { setHidden } = useNavbarVisibility();
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [dragUndo, setDragUndo] = useState<{ planId: number; fromDay: number; fromHour: number; toDay: number; toHour: number } | null>(null);

  useEffect(() => {
    setHidden(showAddModal || showAIModal || !!selectedSession);
    return () => setHidden(false);
  }, [showAddModal, showAIModal, selectedSession, setHidden]);

  const todayIdx = new Date().getDay();
  const adjustedTodayIdx = toPlannerDow(todayIdx);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (view === 'analytics') {
        const weekData = await plannersApi.week();
        setPlans(weekData.plans);
      } else if (view === 'today') {
        const todayPlans = await plannersApi.today();
        setPlans(todayPlans);
      } else {
        const weekData = await plannersApi.week();
        setPlans(weekData.plans);
      }
      const streakData = await plannersApi.streak();
      setStreak(streakData.currentStreak);

      try {
        const statsData = await studySessionsApi.stats();
        setSessionStats(statsData);
      } catch {
        setSessionStats(null);
      }
      try {
        const decksData = await decksApi.list();
        setDecks(decksData);
      } catch { /* ignore */ }
      try {
        const tplData = await plannerTemplatesApi.list();
        setTemplates(tplData);
      } catch { /* ignore */ }
      try {
        const examData = await examsApi.list();
        setExams(examData);
      } catch { /* ignore */ }
      try {
        const hm = await plannersApi.streakHistory(120);
        setHeatmap(hm.days);
      } catch { /* ignore */ }
    } catch (err) {
      setError((err as Error).message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [view]);

  const [focusAvg, setFocusAvg] = useState<number | null>(null);

  const fetchFocusAvg = useCallback(async () => {
    try {
      const res = await studySessionsApi.focusAverage(120);
      setFocusAvg(res.average);
    } catch {
      setFocusAvg(null);
    }
  }, []);

  useEffect(() => { fetchFocusAvg(); }, [fetchFocusAvg]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const weekSchedule = useMemo(() => {
    if (weekOffset === 0) return plans;
    return plans.map(p => ({ ...p, dayOfWeek: (p.dayOfWeek + weekOffset * 7) % 7 }));
  }, [plans, weekOffset]);

  const todayTopics = useMemo(() => {
    const src = weekOffset === 0 ? plans : weekSchedule;
    return src.filter(p => p.dayOfWeek === adjustedTodayIdx);
  }, [plans, weekSchedule, weekOffset, adjustedTodayIdx]);

  const weekStats = useMemo(() => {
    const total = weekSchedule.length;
    const completed = weekSchedule.filter(p => p.completed === true || p.completed === 1).length;
    const totalMinutes = weekSchedule.reduce((s, p) => s + p.durationMinutes, 0);
    const completedMinutes = weekSchedule.filter(p => p.completed === true || p.completed === 1).reduce((s, p) => s + p.durationMinutes, 0);
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, totalMinutes, completedMinutes, progress };
  }, [weekSchedule]);

  const todayStats = useMemo(() => {
    const total = todayTopics.length;
    const completed = todayTopics.filter(p => p.completed === true || p.completed === 1).length;
    const totalMinutes = todayTopics.reduce((s, p) => s + p.durationMinutes, 0);
    const completedMinutes = todayTopics.filter(p => p.completed === true || p.completed === 1).reduce((s, p) => s + p.durationMinutes, 0);
    return { total, completed, totalMinutes, completedMinutes };
  }, [todayTopics]);

  // Date numbers for the visible week (Mon..Sun)
  const weekDates = useMemo(() => {
    const now = new Date();
    const jsToday = now.getDay();
    const adjustedToday = toPlannerDow(jsToday);
    const monday = new Date(now);
    monday.setDate(now.getDate() - adjustedToday + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  // Per-plan overlap grouping for side-by-side rendering + conflict styling
  const overlapGroups = useMemo(() => {
    const byDay: Record<number, PlannerPlan[]> = {};
    weekSchedule.forEach((p) => { (byDay[p.dayOfWeek] ||= []).push(p); });
    const info: Record<number, { peers: number; index: number }> = {};
    Object.values(byDay).forEach((list) => {
      list.forEach((p) => {
        const peers = list.filter(
          (q) => q.id !== p.id && q.startHour * 60 < p.startHour * 60 + p.durationMinutes && p.startHour * 60 < q.startHour * 60 + q.durationMinutes,
        );
        const all = [p, ...peers].sort((a, b) => a.startHour - b.startHour || a.id - b.id);
        info[p.id] = { peers: all.length, index: all.findIndex((x) => x.id === p.id) };
      });
    });
    return info;
  }, [weekSchedule]);

  const conflictCount = useMemo(() => weekSchedule.filter((p) => p.hasConflict).length, [weekSchedule]);
  const filteredSchedule = useMemo(
    () => (subjectFilter ? weekSchedule.filter((p) => p.color === subjectFilter) : weekSchedule),
    [weekSchedule, subjectFilter],
  );
  const ROW_H = 56;

  const nextSession = useMemo(() => {
    const upcoming = weekSchedule
      .filter((p) => p.completed !== true && p.completed !== 1)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour);
    return upcoming[0] || null;
  }, [weekSchedule]);

  const handleToggle = useCallback(async (id: number) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    try {
      if (plan.completed === true || plan.completed === 1) {
        await plannersApi.uncomplete(id);
      } else {
        await plannersApi.complete(id);
      }
      await fetchPlans();
      setSelectedSession(prev => prev && prev.id === id ? { ...prev, completed: !prev.completed } : prev);
    } catch { /* ignore */ }
  }, [plans, fetchPlans]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await plannersApi.delete(id);
      await fetchPlans();
      setSelectedSession(prev => prev && prev.id === id ? null : prev);
    } catch { /* ignore */ }
  }, [fetchPlans]);

  const handleAdd = useCallback(async (session: { title: string; day: number; startHour: number; endHour: number; color: string; notes: string; reference: Reference | undefined; durationMinutes: number; deckId: number | null; recurrence: string }) => {
    try {
      await plannersApi.create({
        title: session.title,
        description: session.notes || undefined,
        color: session.color,
        dayOfWeek: session.day,
        startHour: session.startHour,
        durationMinutes: session.durationMinutes,
        deckId: session.deckId || undefined,
        recurrence: session.recurrence,
      });
      await fetchPlans();
    } catch { /* ignore */ }
  }, [fetchPlans]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragUndo(null);
    if (!over || active.id === over.id) return;
    const activePlan = plans.find(p => p.id === active.id);
    if (!activePlan) return;
    const overId = String(over.id);
    if (!overId.startsWith("cell-")) return;
    const parts = overId.split("-");
    if (parts.length !== 3) return;
    const toDay = parseInt(parts[1], 10);
    const toHour = parseInt(parts[2], 10);
    if (isNaN(toDay) || isNaN(toHour)) return;
    const fromDay = activePlan.dayOfWeek;
    const fromHour = activePlan.startHour;
    try {
      await plannersApi.update(activePlan.id, { dayOfWeek: toDay, startHour: toHour });
      setDragUndo({ planId: activePlan.id, fromDay, fromHour, toDay, toHour });
      await fetchPlans();
    } catch { /* ignore */ }
  }, [plans, fetchPlans]);

  const handleUndoDrag = useCallback(async () => {
    if (!dragUndo) return;
    try {
      await plannersApi.update(dragUndo.planId, { dayOfWeek: dragUndo.fromDay, startHour: dragUndo.fromHour });
      setDragUndo(null);
      await fetchPlans();
    } catch { /* ignore */ }
  }, [dragUndo, fetchPlans]);

  useEffect(() => {
    if (dragUndo) {
      const timer = setTimeout(() => setDragUndo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [dragUndo]);

  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  const handleExportIcs = useCallback(async () => {
    try {
      const ics = await plannersApi.exportIcs();
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mednexus-week.ics';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }, []);

  const handleExportPdf = useCallback(() => {
    const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    const rows = weekSchedule
      .slice()
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startHour - b.startHour)
      .map((p) => `<tr><td style="padding:6px 10px;border:1px solid #ccc">${escapeHtml(DAYS[p.dayOfWeek] ?? '')}</td><td style="padding:6px 10px;border:1px solid #ccc">${p.startHour}:00</td><td style="padding:6px 10px;border:1px solid #ccc">${p.durationMinutes}m</td><td style="padding:6px 10px;border:1px solid #ccc">${escapeHtml(p.title)}</td></tr>`)
      .join('');
    const html = `<!doctype html><html><head><title>MedNexus Study Week</title></head><body style="font-family:sans-serif"><h1>MedNexus Study Week</h1><table style="border-collapse:collapse;width:100%"><thead><tr><th style="padding:6px 10px;border:1px solid #ccc;text-align:left">Day</th><th style="padding:6px 10px;border:1px solid #ccc;text-align:left">Start</th><th style="padding:6px 10px;border:1px solid #ccc;text-align:left">Duration</th><th style="padding:6px 10px;border:1px solid #ccc;text-align:left">Session</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 250);
    }
  }, [weekSchedule]);

  const tabItems = [
    { id: 'week' as const, label: 'Week' },
    { id: 'today' as const, label: 'Today' },
    { id: 'analytics' as const, label: 'Analytics' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
    >
      {/* Decorative drifting orbs behind the glass (and a calmer canvas over the starfield) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'rgba(2, 6, 23, 0.4)' }} />
        <div className="planner-orb-1 absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full opacity-30 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(6,182,212,.5), transparent 70%)' }} />
        <div className="planner-orb-2 absolute top-1/3 -right-24 w-[26rem] h-[26rem] rounded-full opacity-25 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139,92,246,.5), transparent 70%)' }} />
        <div className="planner-orb-3 absolute bottom-0 left-1/3 w-[24rem] h-[24rem] rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(34,197,94,.4), transparent 70%)' }} />
      </div>

      <PlannerSidebar view={view} onChange={(v) => setView(v)} badges={{ today: todayTopics.length, exams: exams.length }} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, ...smoothTransition }}
        >
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Study Planner</h1>
          <p className="text-text-secondary text-sm mt-1">Plan and track your study schedule</p>
          <div className="mt-3 max-w-xs"><ExamCountdown exams={exams} /></div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, ...smoothTransition }}
          className="flex items-center gap-2 flex-wrap"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchPlans}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary transition-colors"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <RefreshCw className="h-4 w-4" />
          </motion.button>
          {view === 'week' && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExportIcs}
                title="Export week as .ics"
                className="p-2 rounded-xl text-text-secondary hover:text-text-primary transition-colors"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                <Download className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExportPdf}
                title="Export week as PDF"
                className="p-2 rounded-xl text-text-secondary hover:text-text-primary transition-colors"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
              >
                <Printer className="h-4 w-4" />
              </motion.button>
            </>
          )}
          <AnimatedTabs tabs={tabItems} activeTab={view} onChange={(id) => setView(id as PlannerView)} />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAIModal(true)}
            className="px-4 py-2 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-violet))', boxShadow: '0 4px 20px rgba(139, 92, 246, 0.25)' }}
          >
            <Sparkles className="h-4 w-4" /> AI Generate
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingPlan(null); setShowAddModal(true); }}
            className="px-4 py-2 rounded-xl text-white font-semibold text-sm flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.25)' }}
          >
            <Plus className="h-4 w-4" /> Add Session
          </motion.button>
        </motion.div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 p-4 rounded-xl"
          style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={fetchPlans} className="ml-auto text-xs font-semibold text-red-400 underline">
            Retry
          </motion.button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Loader2 className="h-8 w-8 text-accent-green" />
          </motion.div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === 'analytics' ? (
            <motion.div key="analytics-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <AnalyticsView plans={plans} stats={sessionStats} streak={streak} heatmap={heatmap} focusRatingAvg={focusAvg} />
            </motion.div>
          ) : view === 'exams' ? (
            <motion.div key="exams-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <ExamsPanel exams={exams} onChanged={fetchPlans} />
            </motion.div>
          ) : view === 'focus' ? (
            <motion.div key="focus-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="rounded-3xl p-8 text-center" style={glassThick}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,.12)', border: '1px solid var(--glass-border)' }}>
                  <Focus className="h-8 w-8 text-accent-green" />
                </div>
                <h2 className="font-display text-xl font-bold text-text-primary mb-1">Focus / Now Mode</h2>
                <p className="text-text-secondary text-sm mb-1">Pomodoro 25 / 5 / 15 driven by your next session.</p>
                <p className="text-sm text-text-primary mb-5">
                  {nextSession ? <>Next up: <span style={{ color: nextSession.color }}>{nextSession.title}</span> · {nextSession.startHour}:00</> : 'No scheduled sessions yet.'}
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setNowOpen(true)}
                  disabled={!nextSession}
                  className="px-6 py-3 rounded-xl text-white font-semibold inline-flex items-center gap-2"
                  style={{ background: nextSession ? 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))' : 'var(--bg-elevated)', opacity: nextSession ? 1 : 0.5 }}
                >
                  <Play className="h-4 w-4" /> Start Focus Session
                </motion.button>
              </div>
            </motion.div>
          ) : view === 'week' ? (
            <motion.div key="week-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between mb-6">
                <motion.button
                  whileHover={{ scale: 1.1, x: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setWeekOffset(w => w - 1)}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </motion.button>
                <motion.span
                  key={weekOffset}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-display text-sm font-semibold text-text-primary"
                >
                  {weekOffset === 0 ? 'This Week' : weekOffset > 0 ? `+${weekOffset} Week${weekOffset > 1 ? 's' : ''}` : `${weekOffset} Week${weekOffset < -1 ? 's' : ''}`}
                  {' · '}
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </motion.span>
                <motion.button
                  whileHover={{ scale: 1.1, x: 2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setWeekOffset(w => w + 1)}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </div>

              <motion.div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {[
                  { label: 'Sessions', value: weekStats.total, icon: BookOpen, color: 'var(--accent-green)' },
                  { label: 'Completed', value: weekStats.completed, icon: CheckCircle2, color: 'var(--accent-emerald)' },
                  { label: 'Study Hours', value: `${Math.floor(weekStats.completedMinutes / 60)}/${Math.floor(weekStats.totalMinutes / 60)}`, icon: Timer, color: 'var(--accent-purple)' },
                  { label: 'Day Streak', value: streak, icon: Flame, color: 'var(--accent-amber)' },
                ].map(({ label, value, icon: Icon, color }, idx) => (
                  <motion.div key={label} variants={listItem} className="rounded-2xl p-4 relative overflow-hidden" style={glassStyle}>
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                    <Icon className="h-5 w-5 mb-2" style={{ color }} />
                    <motion.p
                      className="text-2xl font-bold font-display"
                      style={{ color }}
                      key={value}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      {value}
                    </motion.p>
                    <p className="text-xs text-text-secondary">{label}</p>
                  </motion.div>
                ))}
              </motion.div>

              {conflictCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-400">{conflictCount} session{conflictCount > 1 ? 's' : ''} overlap{conflictCount > 1 ? '' : 's'} another session — shown side by side.</span>
                </motion.div>
              )}

              <div className="mb-4"><SubjectLegend plans={weekSchedule} activeColor={subjectFilter} onSelect={setSubjectFilter} /></div>

              {weekSchedule.length === 0 && (
                <EmptyState onAdd={() => { setEditingPlan(null); setShowAddModal(true); }} onAI={() => setShowAIModal(true)} hasExams={exams.length > 0} />
              )}

              {weekSchedule.length > 0 && (
              <>
              <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredSchedule.map(p => p.id)} strategy={rectSortingStrategy}>
                  <div className="rounded-2xl overflow-hidden relative" style={glassThick}>
                    <Confetti show={showConfetti} />
                    {/* Header row */}
                    <div
                      className="grid sticky top-0 z-20"
                      style={{ gridTemplateColumns: '64px repeat(7, minmax(0,1fr))', background: 'var(--glass-card-bg)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(148,163,184,.10)' }}
                    >
                      <div className="p-3 text-xs font-medium text-text-muted">Time</div>
                      {DAYS.map((day, i) => (
                        <motion.div key={day} className="p-3 text-center" whileHover={{ background: 'rgba(148, 163, 184, 0.04)' }}>
                          <span className="text-xs font-display font-semibold text-text-secondary">{day}</span>
                          <motion.div
                            className={`text-lg font-bold mt-0.5 ${i === adjustedTodayIdx && weekOffset === 0 ? 'text-accent-green' : 'text-text-primary'}`}
                            animate={i === adjustedTodayIdx && weekOffset === 0 ? { scale: [1, 1.05, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            {weekDates[i].getDate()}
                          </motion.div>
                        </motion.div>
                      ))}
                    </div>
                    {/* Body grid — duration-spanning blocks */}
                    <div
                      className="relative"
                      style={{ display: 'grid', gridTemplateColumns: '64px repeat(7, minmax(0,1fr))', gridTemplateRows: `repeat(${HOURS.length}, ${ROW_H}px)`, maxHeight: 580, overflowY: 'auto' }}
                    >
                      {HOURS.map((hour, hourIdx) => (
                        <div
                          key={`t-${hour}`}
                          style={{ gridColumn: 1, gridRow: hourIdx + 1, borderBottom: '1px solid rgba(148,163,184,.05)' }}
                          className="p-2 text-xs text-text-muted font-mono flex items-start justify-center"
                        >
                          {hour}:00
                        </div>
                      ))}
                      {DAYS.map((_, dayIdx) =>
                        HOURS.map((hour, hi) => (
                          <div
                            key={`c-${dayIdx}-${hour}`}
                            id={`cell-${dayIdx}-${hour}`}
                            style={{ gridColumn: dayIdx + 2, gridRow: hi + 1, borderBottom: '1px solid rgba(148,163,184,.04)', borderRight: '1px solid rgba(148,163,184,.03)' }}
                          />
                        )),
                      )}
                      {filteredSchedule.map((plan) => {
                        if (plan.startHour < HOURS[0] || plan.startHour > HOURS[HOURS.length - 1]) return null;
                        const rowStart = plan.startHour - HOURS[0] + 1;
                        const span = Math.max(1, Math.ceil(plan.durationMinutes / 60));
                        const grp = overlapGroups[plan.id] || { peers: 1, index: 0 };
                        const widthPct = 100 / grp.peers;
                        const leftPct = grp.index * widthPct;
                        return (
                          <SortableSessionCard
                            key={plan.id}
                            plan={plan}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            onSelect={setSelectedSession}
                            conflict={!!plan.hasConflict}
                            gridStyle={{
                              gridColumn: plan.dayOfWeek + 2,
                              gridRow: `${rowStart} / span ${span}`,
                              width: `${widthPct}%`,
                              marginLeft: `${leftPct}%`,
                              alignSelf: 'start',
                              justifySelf: 'start',
                              minWidth: 0,
                              zIndex: plan.hasConflict ? 20 : 10,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </SortableContext>
              </DndContext>

              {dragUndo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}
                >
                  <span className="text-xs text-text-secondary">Session moved to {DAYS[dragUndo.toDay]} {dragUndo.toHour}:00</span>
                  <button
                    onClick={handleUndoDrag}
                    className="text-xs font-semibold text-accent-purple hover:underline"
                  >
                    Undo
                  </button>
                </motion.div>
              )}

              <motion.div
                className="mt-6 rounded-2xl p-5 relative overflow-hidden"
                style={glassStyle}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, ...smoothTransition }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-accent-purple" />
                    <span className="text-sm font-display font-semibold text-text-secondary tracking-wider uppercase">Weekly Progress</span>
                  </div>
                  <span className="text-sm font-bold text-text-primary">{weekStats.progress}%</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--accent-green), var(--accent-blue))' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${weekStats.progress}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
                  />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-text-muted">{weekStats.completed} of {weekStats.total} sessions completed</p>
                  {weekStats.progress === 100 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-xs font-semibold text-accent-amber flex items-center gap-1"
                    >
                      <Trophy className="h-3 w-3" /> Perfect Week!
                    </motion.span>
                  )}
                </div>
              </motion.div>
              </>
              )}
              {heatmap.length > 0 && (
                <motion.div
                  className="mt-6 rounded-2xl p-5"
                  style={glassStyle}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, ...smoothTransition }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-accent-amber" />
                    <span className="text-sm font-display font-semibold text-text-secondary tracking-wider uppercase">Study Streak · Last 120 Days</span>
                  </div>
                  <StreakHeatmap days={heatmap} compact />
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div key="today-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {[
                  { label: 'Sessions', value: todayStats.total, icon: BookOpen, color: 'var(--accent-green)' },
                  { label: 'Completed', value: todayStats.completed, icon: CheckCircle2, color: 'var(--accent-emerald)' },
                  { label: 'Hours', value: `${Math.floor(todayStats.completedMinutes / 60)}/${Math.floor(todayStats.totalMinutes / 60)}`, icon: Clock, color: 'var(--accent-purple)' },
                  { label: 'Goal', value: `${todayStats.completed}/${dailyGoal}`, icon: Target, color: 'var(--accent-amber)' },
                ].map(({ label, value, icon: Icon, color }, idx) => (
                  <motion.div key={label} variants={listItem} className="rounded-2xl p-4 relative overflow-hidden" style={glassStyle}>
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                    <Icon className="h-5 w-5 mb-2" style={{ color }} />
                    <motion.p
                      className="text-2xl font-bold font-display"
                      style={{ color }}
                      key={value}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      {value}
                    </motion.p>
                    <p className="text-xs text-text-secondary">{label}</p>
                  </motion.div>
                ))}
              </motion.div>

              {todayStats.total > 0 && (
                <motion.div
                  className="rounded-2xl p-5 mb-6 relative overflow-hidden"
                  style={glassStyle}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, ...smoothTransition }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent-green" />
                      <span className="text-sm font-display font-semibold text-text-secondary tracking-wider uppercase">Daily Goal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={dailyGoal}
                        onChange={(e) => setDailyGoal(Number(e.target.value))}
                        className="w-20 accent-accent-green"
                      />
                      <span className="text-xs font-semibold text-text-primary w-4">{dailyGoal}</span>
                    </div>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: todayStats.completed >= dailyGoal
                          ? 'linear-gradient(90deg, var(--accent-emerald), var(--accent-green))'
                          : 'linear-gradient(90deg, var(--accent-green), var(--accent-blue))',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (todayStats.completed / dailyGoal) * 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
                    />
                  </div>
                  {todayStats.completed >= dailyGoal && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-accent-emerald mt-2 flex items-center gap-1"
                    >
                      <Trophy className="h-3 w-3" /> Daily goal achieved! Great work!
                    </motion.p>
                  )}
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {todayTopics.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="text-center py-16 rounded-2xl relative overflow-hidden"
                    style={{ ...glassStyle, border: '2px dashed rgba(148, 163, 184, 0.1)' }}
                  >
                     <CalendarDays className="h-16 w-16 text-text-muted mx-auto mb-4" />
                    <p className="text-text-secondary font-medium text-lg mb-2">No sessions scheduled for today</p>
                    <p className="text-text-muted text-sm mb-6">Plan your study sessions to stay on track</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setEditingPlan(null); setShowAddModal(true); }}
                      className="px-6 py-3 rounded-xl text-white font-semibold text-sm inline-flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.25)' }}
                    >
                      <Plus className="h-4 w-4" /> Schedule a Session
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div key="sessions" className="space-y-3" variants={staggerContainer} initial="hidden" animate="visible">
                    {todayTopics.map((plan) => {
                      const duration = plan.durationMinutes;
                      const endHour = plan.startHour + Math.ceil(duration / 60);
                      const isCompleted = plan.completed === true || plan.completed === 1;
                      return (
                        <motion.div
                          key={plan.id}
                          variants={listItem}
                          layout
                          whileHover={{ x: 4, transition: { duration: 0.2 } }}
                          className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer relative overflow-hidden group"
                          style={glassStyle}
                          onClick={() => setSelectedSession(plan)}
                        >
                          <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: plan.color }} />
                          <motion.div
                            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${plan.color}15` }}
                            whileHover={{ rotate: 10 }}
                          >
                            {isCompleted ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                              >
                                <CheckCircle2 className="h-5 w-5 text-accent-emerald" />
                              </motion.div>
                            ) : (
                              <BookOpen className="h-5 w-5" style={{ color: plan.color }} />
                            )}
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text-primary" style={{ textDecoration: isCompleted ? 'line-through' : 'none', opacity: isCompleted ? 0.6 : 1 }}>
                              {plan.title}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {plan.startHour}:00 – {endHour}:00 · {duration >= 60 ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ''}` : `${duration}m`}
                              {plan.deckId && (
                                <span className="inline-flex items-center gap-1 text-accent-purple" style={{ background: 'rgba(139, 92, 246, 0.08)', padding: '0 4px', borderRadius: 4 }}>
                                  <Layers className="h-2.5 w-2.5" />
                                  {plan.deckName ? (plan.deckName.length > 12 ? plan.deckName.slice(0, 12) + '…' : plan.deckName) : 'Linked'}
                                </span>
                              )}
                              {plan.description && <span className="text-text-muted">· Notes</span>}
                            </p>
                            {!isCompleted && (
                              <PomodoroTimer
                                plan={plan}
                                onComplete={() => handleToggle(plan.id)}
                              />
                            )}
                          </div>
                          <motion.span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                            style={isCompleted ? { background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' } : { background: `${plan.color}12`, color: plan.color }}
                            whileHover={{ scale: 1.05 }}
                          >
                            {isCompleted ? '✓ Done' : 'Upcoming'}
                          </motion.span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <AddSessionModal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingPlan(null); }}
        onAdd={handleAdd}
        editPlan={editingPlan}
      />
      <SessionDetailPanel
        plan={selectedSession}
        onClose={() => setSelectedSession(null)}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onChanged={fetchPlans}
      />
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setSelectedSession(null)}
          />
        )}
      </AnimatePresence>

      <AIGeneratePlanModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onPlansCreated={fetchPlans}
        decks={decks}
        existingSessions={weekSchedule.map((p) => ({ title: p.title, dayOfWeek: p.dayOfWeek, startHour: p.startHour, durationMinutes: p.durationMinutes }))}
      />

      {nowOpen && <FocusNowModal plan={nextSession} onClose={() => setNowOpen(false)} />}

      {templates.length > 0 && (
        <motion.div
          className="mt-6 rounded-2xl p-5"
          style={glassStyle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ...smoothTransition }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent-amber" />
              <span className="text-sm font-display font-semibold text-text-secondary tracking-wider uppercase">Templates</span>
            </div>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-xs text-accent-purple font-semibold hover:underline"
            >
              {showTemplates ? 'Hide' : 'Show'} ({templates.length})
            </button>
          </div>
          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {templates.map(tpl => {
                  const sessionCount = (() => {
                    try { return JSON.parse(tpl.sessions || '[]').length; } catch { return 0; }
                  })();
                  return (
                    <div
                      key={tpl.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{tpl.name}</p>
                        <p className="text-[10px] text-text-muted">{sessionCount} sessions · {tpl.scheduleType}</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          try {
                            await plannerTemplatesApi.generate(tpl.id);
                            await fetchPlans();
                          } catch { /* ignore */ }
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))' }}
                      >
                        Apply
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          try {
                            await plannerTemplatesApi.delete(tpl.id);
                            await fetchPlans();
                          } catch { /* ignore */ }
                        }}
                        className="p-1.5 rounded-lg text-xs"
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)' }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
