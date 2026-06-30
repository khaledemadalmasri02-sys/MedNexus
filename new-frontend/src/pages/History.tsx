import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles, CheckCircle2, XCircle,
  Clock, Layers, FileText, ArrowLeft,
  Loader2, AlertCircle, Trash2,
} from "lucide-react";
import * as api from "../lib/api";
import type { GenerationLog } from "../lib/api";
import { FloatingWidget } from "../components/ui";

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function StatusBadge({ status }: { status: boolean }) {
  if (status) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.08)] text-accent-emerald">
      <CheckCircle2 className="h-3 w-3" /> Success
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] text-accent-rose">
      <XCircle className="h-3 w-3" /> Error
    </span>
  );
}

const glassStyle = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
} as const;

export default function History() {
  const [generations, setGenerations] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.generationsApi.list(50);
        setGenerations(data.generations || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError("Failed to load generation history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all generation history?")) return;
    try { await api.generationsApi.clear(); setGenerations([]); }
    catch { setError("Failed to clear history"); }
  };

  const stats = useMemo(() => {
    const successes = generations.filter((g) => g.success).length;
    const totalCards = generations.filter((g) => g.success).length;
    const avgDuration = generations.filter((g) => g.success && g.durationMs).reduce((s, g) => s + (g.durationMs || 0), 0) / Math.max(generations.filter((g) => g.success && g.durationMs).length, 1);
    return { total: generations.length, successes, totalCards, avgDuration };
  }, [generations]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link to="/library" className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Library
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">Generation History</h1>
            <p className="text-text-secondary text-sm mt-1">Past AI runs with timing and card counts.</p>
          </div>
          {generations.length > 0 && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleClearHistory} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5" style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.2)", color: "var(--accent-rose)" }}>
              <Trash2 className="h-3 w-3" /> Clear
            </motion.button>
          )}
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><XCircle className="h-4 w-4" /></button>
        </motion.div>
      )}

      {loading && <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent-green" /></div>}

      {!loading && generations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Runs", value: stats.total, icon: Sparkles, color: "var(--accent-green)" },
            { label: "Successful", value: stats.successes, icon: CheckCircle2, color: "var(--accent-emerald)" },
            { label: "Decks Made", value: stats.totalCards, icon: Layers, color: "var(--accent-purple)" },
            { label: "Avg Duration", value: formatDuration(stats.avgDuration), icon: Clock, color: "var(--accent-amber)" },
          ].map(({ label, value, icon: Icon, color }, idx) => (
            <FloatingWidget key={label} className="p-4" delay={idx * 0.06}>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary font-medium mb-1">
                <Icon className="h-3 w-3" style={{ color }} /> {label}
              </div>
              <div className="text-xl font-bold font-display" style={{ color }}>{value}</div>
            </FloatingWidget>
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {generations.length === 0 ? (
            <div className="text-center py-20 rounded-2xl" style={{ ...glassStyle, border: "2px dashed rgba(148, 163, 184, 0.1)" }}>
              <Sparkles className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No generation history yet</p>
              <p className="text-text-muted text-sm mt-1">Generate some cards to see your history here</p>
              <Link to="/generate" className="inline-block mt-4">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="px-4 py-2 rounded-xl text-white font-medium text-sm" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>Generate Cards</motion.button>
              </Link>
            </div>
          ) : (
            generations.map((g, idx) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3 }}
                className="rounded-xl p-4 relative overflow-hidden"
                style={glassStyle}
              >
                <div className="absolute inset-y-0 left-0 w-1 rounded-l-xl" style={{ background: g.success ? "var(--accent-emerald)" : "var(--accent-rose)" }} />
                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={g.success} />
                      <span className="text-xs text-text-muted">{g.type}</span>
                    </div>
                    <p className="font-medium text-text-primary mt-1 truncate">{g.deckName || `${g.type} generation`}</p>
                    {g.errorMessage && <p className="text-xs text-red-400 mt-1">{g.errorMessage}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(g.createdAt)}</span>
                      {g.durationMs && <span>{formatDuration(g.durationMs)}</span>}
                      {g.model && <span className="text-text-muted">{g.model}</span>}
                    </div>
                  </div>
                  {g.deckId && (
                    <Link to={`/deck/${g.deckId}`}>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="p-2 rounded-lg shrink-0" style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid rgba(148, 163, 184, 0.08)" }}>
                        <FileText className="h-4 w-4 text-text-secondary" />
                      </motion.button>
                    </Link>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
