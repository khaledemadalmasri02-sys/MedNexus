/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Stethoscope, AlertCircle, CheckCircle2, Loader2, Wrench, RefreshCw } from "lucide-react";
import * as api from "../lib/api";
import { glassCard, glassSurface, accentGlow, topEdgeHighlight, floatingKeyframes, statOrb } from '../components/ui/glass';

export default function DeckDoctorPage() {
  const { id } = useParams<{ id: string }>();
  const deckId = parseInt(id || "0");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<api.DeckDoctorResult | null>(null);
  const [fixing, setFixing] = useState<Record<number, boolean>>({});
  const [fixProgress, setFixProgress] = useState({ done: 0, total: 0 });

  const runDiagnosis = async () => {
    setLoading(true);
    try {
      const res = await api.agentsApi.deckDoctor(deckId);
      setResult(res);
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  const applyFix = async (fix: any) => {
    setFixing(prev => ({ ...prev, [fix.cardId]: true }));
    try {
      await api.agentsApi.deckDoctorFix(fix.cardId, fix.type, fix.relatedCardId);
      setResult(prev => prev ? {
        ...prev,
        issues: prev.issues.filter(i => i.cardId !== fix.cardId || i.type !== fix.type),
        fixes: prev.fixes.filter(f => f.cardId !== fix.cardId || f.type !== fix.type),
      } : null);
    } catch (err: any) {
      console.error(err);
    }
    setFixing(prev => ({ ...prev, [fix.cardId]: false }));
  };

  const fixAll = async () => {
    if (!result) return;
    const allFixes = result.fixes.filter(f => f.type !== "merge");
    setFixProgress({ done: 0, total: allFixes.length });
    for (const fix of allFixes) {
      await applyFix(fix);
      setFixProgress(prev => ({ ...prev, done: prev.done + 1 }));
    }
    setFixProgress({ done: 0, total: 0 });
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "error": return { bg: "rgba(239, 68, 68, 0.08)", border: "rgba(239, 68, 68, 0.2)", color: "#F87171", accent: "#EF4444" };
      case "warning": return { bg: "rgba(245, 158, 11, 0.08)", border: "rgba(245, 158, 11, 0.2)", color: "#FBBF24", accent: "#F59E0B" };
      default: return { bg: "rgba(59, 130, 246, 0.08)", border: "rgba(59, 130, 246, 0.2)", color: "#60A5FA", accent: "#3B82F6" };
    }
  };

  const healthColor = result
    ? result.healthScore >= 80 ? "#22C55E" : result.healthScore >= 50 ? "#F59E0B" : "#EF4444"
    : "#22C55E";

  return (
    <>
      <style>{floatingKeyframes}</style>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-4 mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden"
              style={{
                ...statOrb("#10B981"),
                background: "linear-gradient(135deg, #10B981, #059669)",
              }}
            >
              <Stethoscope className="w-6 h-6 text-white relative z-10" />
              <div style={topEdgeHighlight} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Deck Doctor</h1>
              <p className="text-white/50">AI-powered deck quality audit</p>
            </div>
          </div>

          {!result && !loading && (
            <div className="flex flex-col items-center py-16">
              <motion.div
                className="w-28 h-28 rounded-full flex items-center justify-center relative mb-8"
                style={{
                  ...statOrb("#10B981"),
                }}
              >
                <Stethoscope className="w-12 h-12 text-emerald-400/80" />
                <div style={topEdgeHighlight} />
                <div style={accentGlow("#10B981", 80)} />
              </motion.div>

              <div
                className="p-6 rounded-2xl max-w-md text-center relative overflow-hidden"
                style={glassCard}
              >
                <div style={topEdgeHighlight} />
                <h2 className="text-xl font-semibold text-white mb-3">Check Your Deck's Health</h2>
                <p className="text-white/50 mb-6">
                  The Deck Doctor analyzes your cards for duplicates, vague questions, missing explanations, and more.
                </p>
                <motion.button
                  onClick={runDiagnosis}
                  className="px-8 py-3 rounded-xl text-white font-semibold inline-flex items-center gap-2 relative overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #10B981, #059669)",
                    boxShadow: "0 4px 20px rgba(16, 185, 129, 0.3)",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Stethoscope className="w-5 h-5" />
                  Run Diagnosis
                </motion.button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center py-16">
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center relative"
                style={{
                  ...statOrb("#10B981"),
                  animation: "pulse-glow 2s ease-in-out infinite",
                }}
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
                    "0 0 50px rgba(16,185,129,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
                    "0 0 20px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <div style={topEdgeHighlight} />
              </motion.div>
              <div
                className="mt-6 px-6 py-3 rounded-xl relative overflow-hidden"
                style={glassCard}
              >
                <div style={topEdgeHighlight} />
                <p className="text-white/60">Analyzing {result?.totalCards || ""} cards...</p>
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div
                className="flex items-center gap-6 p-6 rounded-2xl relative overflow-hidden"
                style={glassCard}
              >
                <div style={topEdgeHighlight} />
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={healthColor}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${result.healthScore * 2.64} ${264 - result.healthScore * 2.64}`}
                      style={{
                        filter: `drop-shadow(0 0 8px ${healthColor}80)`,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="text-3xl font-bold"
                      style={{
                        color: healthColor,
                        textShadow: `0 0 20px ${healthColor}60`,
                      }}
                    >
                      {result.healthScore}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Deck Health Score</h3>
                  <p className="text-sm text-white/50 mt-1">
                    {result.healthScore >= 80 ? "Your deck is in great shape!" : result.healthScore >= 50 ? "Some issues found that could be improved." : "Several issues need attention."}
                  </p>
                  <p className="text-xs text-white/40 mt-2">{result.issues.length} issues found across {result.totalCards} cards</p>
                </div>
                <div style={accentGlow(healthColor, 60)} />
              </div>

              {result.fixes.length > 0 && (
                <div
                  className="flex items-center justify-between p-4 rounded-xl relative overflow-hidden"
                  style={glassSurface}
                >
                  <div style={topEdgeHighlight} />
                  <span className="text-sm text-white/50">
                    {result.fixes.length} auto-fixable issues
                    {fixProgress.total > 0 && ` (${fixProgress.done}/${fixProgress.total})`}
                  </span>
                  <motion.button
                    onClick={fixAll}
                    disabled={fixProgress.total > 0}
                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white inline-flex items-center gap-2 disabled:opacity-50 relative overflow-hidden"
                    style={{
                      background: "linear-gradient(135deg, #22C55E, #10B981)",
                      boxShadow: "0 2px 12px rgba(34, 197, 94, 0.3)",
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {fixProgress.total > 0 ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Fixing...</>
                    ) : (
                      <><Wrench className="w-4 h-4" /> Fix All</>
                    )}
                  </motion.button>
                </div>
              )}

              <div className="space-y-3">
                {result.issues.map((issue, i) => {
                  const colors = severityColor(issue.severity);
                  const fix = result.fixes.find(f => f.cardId === issue.cardId && f.type !== "merge" && f.type.replace("generate_", "").replace("_", "") === issue.type.replace("_", ""));
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl flex items-start gap-3 relative overflow-hidden"
                      style={{
                        ...glassCard,
                        borderLeft: `3px solid ${colors.accent}`,
                        background: `linear-gradient(135deg, ${colors.bg}, rgba(255,255,255,0.03))`,
                      }}
                    >
                      <div style={topEdgeHighlight} />
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/90">{issue.message}</p>
                      </div>
                      {fix && (
                        <motion.button
                          onClick={() => applyFix(fix)}
                          disabled={fixing[fix.cardId]}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex-shrink-0 inline-flex items-center gap-1 disabled:opacity-50"
                          style={{
                            background: `linear-gradient(135deg, ${colors.accent}, ${colors.color})`,
                            boxShadow: `0 2px 8px ${colors.accent}40`,
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {fixing[fix.cardId] ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Fix
                        </motion.button>
                      )}
                    </motion.div>
                  );
                })}
                {result.issues.length === 0 && (
                  <div
                    className="text-center py-10 rounded-2xl relative overflow-hidden"
                    style={{
                      ...glassCard,
                      background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.04))",
                      boxShadow: "0 0 40px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <div style={topEdgeHighlight} />
                    <CheckCircle2
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: "#22C55E", filter: "drop-shadow(0 0 12px rgba(34,197,94,0.5))" }}
                    />
                    <p className="text-white/90 font-medium">No issues found! Your deck is healthy.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
