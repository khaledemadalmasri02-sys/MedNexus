/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { GraduationCap, TrendingUp, TrendingDown, Calendar, Clock, Target, AlertTriangle, Loader2, Zap } from "lucide-react";
import * as api from "../lib/api";

const springTransition = {
  type: "spring",
  stiffness: 260,
  damping: 20,
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
} as const;

const floatAnimation = {
  y: [0, -6, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut",
  },
} as const;

const floatAnimationSlow = {
  y: [0, -4, 0],
  transition: {
    duration: 5.5,
    repeat: Infinity,
    ease: "easeInOut",
  },
} as const;

const floatAnimationFast = {
  y: [0, -8, 0],
  transition: {
    duration: 3.2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

const floatAnimations = [floatAnimation, floatAnimationSlow, floatAnimationFast] as const;

export default function CoachPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<api.CoachResult | null>(null);
  const [error, setError] = useState("");

  const loadCoach = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.agentsApi.getCoach();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load coaching data");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-accent-purple" />
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
        >
          <div
            className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              boxShadow: "0 0 40px rgba(239, 68, 68, 0.15)",
            }}
          >
            <AlertTriangle className="w-10 h-10 text-amber-400" />
          </div>
          <p className="text-text-secondary text-lg">{error || "No data available"}</p>
        </motion.div>
      </div>
    );
  }

  const stats = [
    { label: "Sessions", value: data.stats.totalSessions, icon: Zap, color: "#8B5CF6", glow: "rgba(139, 92, 246, 0.4)" },
    { label: "Cards Studied", value: data.stats.totalCardsStudied, icon: Target, color: "#3B82F6", glow: "rgba(59, 130, 246, 0.4)" },
    { label: "Accuracy", value: `${data.stats.overallAccuracy}%`, icon: TrendingUp, color: "#22C55E", glow: "rgba(34, 197, 94, 0.4)" },
    { label: "Days Since", value: data.stats.daysSinceLastSession, icon: Clock, color: data.stats.daysSinceLastSession > 2 ? "#EF4444" : "#F59E0B", glow: data.stats.daysSinceLastSession > 2 ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)" },
  ];

  const patternDots = ["#8B5CF6", "#3B82F6", "#22C55E"];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center gap-4 mb-10">
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
            style={{
              background: "linear-gradient(135deg, #EC4899, #DB2777)",
              boxShadow: "0 8px 32px rgba(236, 72, 153, 0.35)",
            }}
            whileHover={{ scale: 1.05 }}
            transition={springTransition}
          >
            <GraduationCap className="w-7 h-7 text-white" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Progress Coach</h1>
            <p className="text-text-secondary text-sm mt-0.5">AI-powered study analytics & recommendations</p>
          </div>
        </motion.div>

        {/* Stat Cards - Floating Glass Orbs */}
        <motion.div variants={itemVariants} className="mb-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="relative flex flex-col items-center justify-center p-6 rounded-3xl overflow-hidden"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  backdropFilter: "blur(40px)",
                  WebkitBackdropFilter: "blur(40px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                }}
                animate={floatAnimations[index % 3] as any}
                whileHover={{
                  scale: 1.04,
                  boxShadow: `0 12px 40px ${stat.glow}, inset 0 1px 0 rgba(255, 255, 255, 0.08)`,
                }}
                transition={springTransition}
              >
                {/* Colored glow underneath */}
                <div
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-20 h-8 rounded-full opacity-60 blur-xl"
                  style={{ background: stat.glow }}
                />
                <stat.icon
                  className="w-5 h-5 mb-3 relative z-10"
                  style={{ color: stat.color }}
                />
                <div
                  className="text-2xl font-extrabold relative z-10"
                  style={{
                    color: stat.color,
                    textShadow: `0 0 20px ${stat.glow}, 0 0 40px ${stat.glow}`,
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-text-secondary mt-1.5 relative z-10 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Study Patterns & Weekly Plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Study Patterns Panel */}
          <motion.div
            variants={itemVariants}
            className="p-6 rounded-3xl relative overflow-hidden"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            }}
            whileHover={{ borderColor: "rgba(255, 255, 255, 0.12)" }}
          >
            <h3 className="font-semibold text-text-primary mb-5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent-blue" /> Study Patterns
            </h3>
            <div className="space-y-0">
              {[
                { label: "Best Day", value: data.patterns.bestDay },
                { label: "Best Time", value: data.patterns.bestHour },
                { label: "Avg Session", value: `${data.patterns.averageSessionLength} min` },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-3"
                  style={{
                    borderBottom: i < 2 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                  }}
                >
                  <span className="text-sm text-text-secondary flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: patternDots[i], boxShadow: `0 0 8px ${patternDots[i]}` }}
                    />
                    {row.label}
                  </span>
                  <span className="text-sm text-text-primary font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Weekly Plan Panel */}
          <motion.div
            variants={itemVariants}
            className="p-6 rounded-3xl relative overflow-hidden"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              backdropFilter: "blur(30px)",
              WebkitBackdropFilter: "blur(30px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            }}
            whileHover={{ borderColor: "rgba(255, 255, 255, 0.12)" }}
          >
            <h3 className="font-semibold text-text-primary mb-5 flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-green" /> Weekly Plan
            </h3>
            <div className="space-y-2.5">
              {data.weeklyPlan.map((plan, i) => (
                <motion.div
                  key={i}
                  className="flex items-center justify-between text-sm p-3 rounded-xl"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                  }}
                  whileHover={{
                    background: "rgba(255, 255, 255, 0.06)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <span className="text-text-primary font-medium w-10">{plan.day}</span>
                  <span className="text-text-secondary flex-1 text-center truncate px-2">{plan.focus}</span>
                  <span className="text-xs text-text-secondary font-mono">{plan.duration}m</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <motion.div variants={itemVariants} className="mb-8">
            <h3 className="font-semibold text-text-primary mb-4 text-lg">Recommendations</h3>
            <div className="space-y-3">
              {data.recommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 24,
                    delay: i * 0.08,
                  }}
                  className="p-4 rounded-2xl flex items-start gap-3 relative overflow-hidden"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    boxShadow: "0 4px 20px rgba(245, 158, 11, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
                  }}
                  whileHover={{
                    borderColor: "rgba(245, 158, 11, 0.35)",
                    boxShadow: "0 8px 30px rgba(245, 158, 11, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
                  }}
                >
                  {/* Warning icon glow */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    <div
                      className="absolute inset-0 rounded-full blur-md"
                      style={{ background: "rgba(245, 158, 11, 0.4)" }}
                    />
                    <AlertTriangle className="w-4 h-4 text-amber-400 relative z-10" />
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{rec}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Weak/Strong Topics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.weakTopics.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="p-6 rounded-3xl relative overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(30px)",
                WebkitBackdropFilter: "blur(30px)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                boxShadow: "0 8px 32px rgba(239, 68, 68, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
              }}
              whileHover={{ borderColor: "rgba(239, 68, 68, 0.25)" }}
            >
              <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" /> Weak Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.weakTopics.map((t, i) => (
                  <motion.span
                    key={t}
                    className="px-3.5 py-2 rounded-xl text-sm font-medium"
                    style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      color: "#F87171",
                      border: "1px solid rgba(239, 68, 68, 0.15)",
                      boxShadow: "0 2px 10px rgba(239, 68, 68, 0.1)",
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.05 }}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 4px 16px rgba(239, 68, 68, 0.2)",
                      borderColor: "rgba(239, 68, 68, 0.3)",
                    }}
                  >
                    {t}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {data.strongTopics.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="p-6 rounded-3xl relative overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(30px)",
                WebkitBackdropFilter: "blur(30px)",
                border: "1px solid rgba(34, 197, 94, 0.15)",
                boxShadow: "0 8px 32px rgba(34, 197, 94, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
              }}
              whileHover={{ borderColor: "rgba(34, 197, 94, 0.25)" }}
            >
              <h3 className="font-semibold text-accent-green mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Strong Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {data.strongTopics.map((t, i) => (
                  <motion.span
                    key={t}
                    className="px-3.5 py-2 rounded-xl text-sm font-medium"
                    style={{
                      background: "rgba(34, 197, 94, 0.08)",
                      color: "#4ADE80",
                      border: "1px solid rgba(34, 197, 94, 0.15)",
                      boxShadow: "0 2px 10px rgba(34, 197, 94, 0.1)",
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20, delay: i * 0.05 }}
                    whileHover={{
                      scale: 1.05,
                      boxShadow: "0 4px 16px rgba(34, 197, 94, 0.2)",
                      borderColor: "rgba(34, 197, 94, 0.3)",
                    }}
                  >
                    {t}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
