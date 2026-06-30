/* eslint-disable react-hooks/refs */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Play, Clock, AlertTriangle, TrendingDown, Loader2, ChevronRight, Zap, RotateCcw } from "lucide-react";
import * as api from "../lib/api";
import { glassCard, glassSurface, accentGlow, topEdgeHighlight, floatingKeyframes, statOrb } from "../components/ui/glass";
import { useTilt } from "../hooks/useTilt";





export default function SmartReviewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<api.SmartReviewResult | null>(null);
  const [error, setError] = useState("");
  const tilt = useTilt(6);

  const generateReview = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.agentsApi.smartReview(undefined, 30);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate smart review");
    }
    setLoading(false);
  };

  const startReview = () => {
    if (!result) return;
    const cardIds = result.cards.map((c: any) => c.id).join(",");
    navigate(`/study?source=smart-review&cards=${cardIds}`);
  };

  return (
    <>
      <style>{floatingKeyframes}</style>
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
        {/* Ambient background glows */}
        <div
          className="pointer-events-none absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #3B82F6, transparent 70%)", filter: "blur(80px)" }}
        />
        <div
          className="pointer-events-none absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)", filter: "blur(80px)" }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-full max-w-3xl"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-10">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
              style={{
                ...glassCard,
                background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.1))",
                border: "1px solid rgba(59,130,246,0.3)",
              }}
            >
              <div style={topEdgeHighlight} />
              <Brain className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Smart Review</h1>
              <p className="text-white/50 text-sm">AI-generated targeted review session</p>
            </div>
          </div>

          {/* Empty State */}
          {!result && !loading && !error && (
            <div className="flex flex-col items-center">
              {/* Central Glass Orb */}
              <div
                ref={tilt.ref}
                onMouseMove={tilt.handleMouseMove}
                onMouseLeave={tilt.handleMouseLeave}
                className="relative w-44 h-44 rounded-full flex items-center justify-center mb-10 cursor-default"
                style={{
                  ...tilt.style,
                  background: "radial-gradient(circle at 35% 35%, rgba(59,130,246,0.25), rgba(139,92,246,0.08), transparent)",
                  backdropFilter: "blur(40px)",
                  WebkitBackdropFilter: "blur(40px)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  boxShadow:
                    "0 0 60px rgba(59,130,246,0.2), 0 25px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                {/* Rotating outer ring */}
                <div
                  className="absolute inset-[-3px] rounded-full"
                  style={{
                    border: "1px dashed rgba(59,130,246,0.15)",
                    animation: "spin-slow 20s linear infinite",
                  }}
                />
                {/* Pulse ring */}
                <div
                  className="absolute -inset-8 rounded-full pointer-events-none"
                  style={{
                    border: "1px solid rgba(59,130,246,0.08)",
                    animation: "pulse-orb 3s ease-in-out infinite",
                  }}
                />
                <Brain className="w-16 h-16 text-blue-400 relative z-10" style={{ filter: "drop-shadow(0 0 10px rgba(59,130,246,0.5))" }} />
              </div>

              {/* Description Glass Panel */}
              <div
                className="relative w-full max-w-lg rounded-2xl p-8 text-center mb-8"
                style={glassCard}
              >
                <div style={topEdgeHighlight} />
                <div style={accentGlow("#3B82F6", 80)} />
                <h2 className="text-xl font-semibold text-white mb-3 relative z-10">Get a Personalized Review Session</h2>
                <p className="text-white/50 text-sm leading-relaxed relative z-10">
                  Our AI analyzes your study history to identify weak areas, overdue topics, and at-risk cards,
                  then builds a targeted review session designed just for you.
                </p>
              </div>

              {/* Generate CTA */}
              <motion.button
                onClick={generateReview}
                className="group relative px-10 py-4 rounded-2xl font-semibold text-white text-base overflow-hidden"
                style={{
                  ...glassSurface,
                  background: "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.15))",
                  border: "1px solid rgba(59,130,246,0.35)",
                  boxShadow:
                    "0 0 40px rgba(59,130,246,0.2), 0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
                whileHover={{
                  scale: 1.04,
                  boxShadow:
                    "0 0 60px rgba(59,130,246,0.35), 0 25px 70px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                  transition: { duration: 0.2 },
                }}
                whileTap={{ scale: 0.96 }}
              >
                {/* Gradient border glow top */}
                <div
                  className="absolute top-0 left-0 right-0 h-[1px] opacity-80"
                  style={{ background: "linear-gradient(90deg, transparent, #3B82F6, #8B5CF6, transparent)" }}
                />
                {/* Shimmer */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s linear infinite",
                  }}
                />
                <span className="relative z-10 flex items-center gap-3">
                  <Zap className="w-5 h-5 text-blue-400" />
                  Generate Smart Review
                </span>
              </motion.button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center py-20">
              {/* Glassmorphic loading orb */}
              <div
                className="relative w-32 h-32 rounded-full flex items-center justify-center mb-8"
                style={{
                  background: "radial-gradient(circle at 35% 35%, rgba(59,130,246,0.2), rgba(139,92,246,0.05))",
                  backdropFilter: "blur(40px)",
                  WebkitBackdropFilter: "blur(40px)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  boxShadow: "0 0 50px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
                  animation: "pulse-orb 2s ease-in-out infinite",
                }}
              >
                <div
                  className="absolute inset-[-2px] rounded-full"
                  style={{
                    border: "1px solid rgba(59,130,246,0.15)",
                    borderTopColor: "rgba(59,130,246,0.6)",
                    animation: "spin-slow 1.5s linear infinite",
                  }}
                />
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              </div>
              <p className="text-white/50 text-sm">Analyzing your study patterns...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl p-5 mb-6"
              style={{
                ...glassCard,
                background: "rgba(239, 68, 68, 0.06)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                boxShadow: "0 0 30px rgba(239, 68, 68, 0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div style={topEdgeHighlight} />
              <p className="text-red-400 text-sm relative z-10">{error}</p>
            </motion.div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Analysis Panel */}
              <div
                className="relative rounded-2xl p-6"
                style={{
                  ...glassCard,
                  border: "1px solid rgba(139, 92, 246, 0.2)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.3), 0 0 40px rgba(139,92,246,0.08)",
                }}
              >
                <div style={topEdgeHighlight} />
                <div style={accentGlow("#8B5CF6", 60)} />
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2 relative z-10">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Analysis
                </h3>
                <p className="text-white/60 text-sm leading-relaxed relative z-10">{result.reasoning}</p>
              </div>

              {/* Stat Cards - Circular Glass Orbs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Cards", value: result.stats.totalCards, color: "#3B82F6", delay: 0 },
                  { label: "Weak Cards", value: result.stats.weakCards, color: "#EF4444", delay: 0.1 },
                  { label: "Overdue", value: result.stats.overdueCards, color: "#F59E0B", delay: 0.2 },
                  { label: "At Risk", value: result.stats.atRiskCards, color: "#8B5CF6", delay: 0.3 },
                ].map((stat) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: stat.delay, duration: 0.5 }}
                    className="relative flex flex-col items-center justify-center rounded-full aspect-square p-4"
                    style={{
                      ...statOrb(stat.color),
                    boxShadow: `0 0 50px ${stat.color}10, 0 20px 50px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
                  }}
                  >
                    <div style={topEdgeHighlight} />
                    <span
                      className="text-3xl font-bold relative z-10"
                      style={{
                        color: stat.color,
                        textShadow: `0 0 20px ${stat.color}60`,
                      }}
                    >
                      {stat.value}
                    </span>
                    <span className="text-xs text-white/40 mt-1 relative z-10">{stat.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Focus Areas */}
              {result.focusAreas.length > 0 && (
                <div
                  className="relative rounded-2xl p-6"
                  style={glassCard}
                >
                  <div style={topEdgeHighlight} />
                  <h3 className="font-semibold text-white mb-4 flex items-center gap-2 relative z-10">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    Focus Areas
                  </h3>
                  <div className="flex flex-wrap gap-2 relative z-10">
                    {result.focusAreas.map((area) => (
                      <span
                        key={area}
                        className="px-4 py-2 rounded-full text-sm font-medium"
                        style={{
                          background: "rgba(239, 68, 68, 0.08)",
                          backdropFilter: "blur(20px)",
                          WebkitBackdropFilter: "blur(20px)",
                          color: "#F87171",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          boxShadow: "0 0 15px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
                        }}
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Review CTA */}
              <div
                className="relative rounded-2xl p-5 flex items-center justify-between"
                style={glassCard}
              >
                <div style={topEdgeHighlight} />
                <div className="flex items-center gap-3 relative z-10">
                  <Clock className="w-5 h-5 text-white/40" />
                  <span className="text-sm text-white/50">
                    Estimated time: <strong className="text-white">{result.estimatedTime} min</strong>
                  </span>
                  <span className="text-white/30">•</span>
                  <span className="text-sm text-white/50">
                    <strong className="text-white">{result.cards.length}</strong> cards
                  </span>
                </div>
                <motion.button
                  onClick={startReview}
                  className="group relative px-7 py-3 rounded-xl font-semibold text-white overflow-hidden"
                  style={{
                    ...glassSurface,
                    background: "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.1))",
                    border: "1px solid rgba(34,197,94,0.35)",
                    boxShadow:
                      "0 0 30px rgba(34,197,94,0.15), 0 15px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                  whileHover={{
                    scale: 1.05,
                    boxShadow:
                      "0 0 50px rgba(34,197,94,0.3), 0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
                    transition: { duration: 0.2 },
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-[1px] opacity-80"
                    style={{ background: "linear-gradient(90deg, transparent, #22C55E, #10B981, transparent)" }}
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Start Review
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </motion.button>
              </div>

              {/* Regenerate button */}
              <div className="flex justify-center pt-2">
                <motion.button
                  onClick={generateReview}
                  className="px-5 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 flex items-center gap-2"
                  style={{
                    ...glassSurface,
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Regenerate
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
