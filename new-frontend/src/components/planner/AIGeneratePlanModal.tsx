import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Layers, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { Modal } from "../../components/ui";
import { smoothTransition } from "../../components/ui/constants";
import { plannerGenerateApi, plannerTemplatesApi } from "../../lib/api";
import type { Deck } from "../../lib/api";
import type { GeneratedPlanSession } from "../../lib/api";

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface AIGeneratePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlansCreated: () => void;
  decks: Deck[];
}

export default function AIGeneratePlanModal({ isOpen, onClose, onPlansCreated, decks }: AIGeneratePlanModalProps) {
  const [step, setStep] = useState<'config' | 'preview' | 'creating' | 'done'>('config');
  const [examDate, setExamDate] = useState('');
  const [studyDays, setStudyDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [selectedDecks, setSelectedDecks] = useState<number[]>([]);
  const [generatedSessions, setGeneratedSessions] = useState<GeneratedPlanSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  const toggleDay = (day: number) => {
    setStudyDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const toggleDeck = (deckId: number) => {
    setSelectedDecks(prev => prev.includes(deckId) ? prev.filter(d => d !== deckId) : [...prev, deckId]);
  };

  const handleGenerate = useCallback(async () => {
    if (!examDate || studyDays.length === 0) return;
    setStep('creating');
    setError(null);
    try {
      const result = await plannerGenerateApi.generate({
        examDate,
        studyDays,
        hoursPerDay,
        deckIds: selectedDecks.length > 0 ? selectedDecks : undefined,
      });
      setGeneratedSessions(result.sessions);
      setStep('preview');
    } catch (err) {
      setError((err as Error).message || 'Failed to generate plan');
      setStep('config');
    }
  }, [examDate, studyDays, hoursPerDay, selectedDecks]);

  const handleConfirm = useCallback(async () => {
    if (generatedSessions.length === 0) return;
    setStep('creating');
    setError(null);
    try {
      const result = await plannerGenerateApi.batchCreate(generatedSessions);
      setCreatedCount(result.created);
      setStep('done');
    } catch (err) {
      setError((err as Error).message || 'Failed to create sessions');
      setStep('preview');
    }
  }, [generatedSessions]);

  const handleSaveTemplate = useCallback(async () => {
    if (generatedSessions.length === 0) return;
    try {
      await plannerTemplatesApi.create({
        name: `AI Plan ${new Date().toLocaleDateString()}`,
        sessions: JSON.stringify(generatedSessions),
        scheduleType: 'weekly',
      });
    } catch { /* ignore */ }
  }, [generatedSessions]);

  const handleClose = () => {
    if (step === 'done') {
      handleSaveTemplate();
      onPlansCreated();
    }
    setStep('config');
    setGeneratedSessions([]);
    setError(null);
    onClose();
  };

  const removeSession = (index: number) => {
    setGeneratedSessions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="AI Study Plan Generator">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ...smoothTransition }} className="space-y-5">
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}

        {step === 'config' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">Exam Date</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '0.75rem 1rem' }}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">Study Days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day, i) => (
                  <motion.button
                    key={day}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleDay(i)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: studyDays.includes(i) ? 'var(--accent-purple)' : 'var(--bg-surface)',
                      border: `1px solid ${studyDays.includes(i) ? 'var(--accent-purple)' : 'var(--border-default)'}`,
                      color: studyDays.includes(i) ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {day}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">Hours per Day</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="flex-1 accent-accent-green"
                />
                <span className="text-sm font-semibold text-text-primary w-8">{hoursPerDay}h</span>
              </div>
            </div>

            {decks.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-text-secondary">Source Decks (optional)</label>
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-xl p-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}>
                  {decks.map(d => (
                    <button
                      key={d.id}
                      onClick={() => toggleDeck(d.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                      style={{
                        background: selectedDecks.includes(d.id) ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                        color: selectedDecks.includes(d.id) ? 'var(--accent-purple)' : 'var(--text-primary)',
                      }}
                    >
                      <Layers className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{d.name}</span>
                      <span className="text-[10px] text-text-muted">{d.cardCount || 0} cards</span>
                      {selectedDecks.includes(d.id) && <Check className="h-3.5 w-3.5 text-accent-purple" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={!examDate || studyDays.length === 0}
              className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-violet))', boxShadow: '0 4px 20px rgba(139, 92, 246, 0.25)' }}
            >
              <Sparkles className="h-4 w-4" /> Generate Plan
            </motion.button>
          </>
        )}

        {step === 'creating' && (
          <div className="text-center py-12">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="inline-flex mb-4">
              <Loader2 className="h-12 w-12 text-accent-purple" />
            </motion.div>
            <p className="text-text-primary font-semibold mb-2">Generating Your Study Plan</p>
            <p className="text-sm text-text-secondary">Analyzing your decks and creating an optimal schedule...</p>
          </div>
        )}

        {step === 'preview' && (
          <>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
              <Sparkles className="h-4 w-4 text-accent-purple" />
              <span className="text-sm text-text-secondary">
                Generated <span className="font-semibold text-accent-purple">{generatedSessions.length}</span> sessions
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {generatedSessions.map((session, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: session.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{session.title}</p>
                    <p className="text-[10px] text-text-muted">
                      {DAYS[session.dayOfWeek]} · {session.startHour}:00 · {session.durationMinutes}m
                    </p>
                  </div>
                  <button onClick={() => removeSession(idx)} className="p-1 rounded-lg hover:bg-[rgba(239,68,68,0.1)]">
                    <X className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('config')}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
              >
                Back
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                disabled={generatedSessions.length === 0}
                className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.25)' }}
              >
                <Check className="h-4 w-4" /> Add {generatedSessions.length} Sessions
              </motion.button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className="inline-flex mb-4">
              <div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                <Check className="h-8 w-8 text-accent-emerald" />
              </div>
            </motion.div>
            <p className="text-text-primary font-semibold text-lg mb-2">Plan Created!</p>
            <p className="text-sm text-text-secondary mb-6">
              {createdCount} study sessions have been added to your planner.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClose}
              className="px-8 py-3 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))', boxShadow: '0 4px 20px rgba(6, 182, 212, 0.25)' }}
            >
              Done
            </motion.button>
          </div>
        )}
      </motion.div>
    </Modal>
  );
}
