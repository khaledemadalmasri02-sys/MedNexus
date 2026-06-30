/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Play, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Flag, Loader2, RotateCcw, Home } from "lucide-react";
import * as api from "../lib/api";
import { AIContent } from "../components/AIContent";
import { glassCard, glassSurface, glassInput, accentGlow, topEdgeHighlight, floatingKeyframes } from "../components/ui/glass";

type ExamMode = "config" | "taking" | "results";

export default function ExamPage() {
  const [mode, setMode] = useState<ExamMode>("config");
  const [questionCount, setQuestionCount] = useState(50);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [exam, setExam] = useState<(api.Exam & { questions: api.ExamQuestion[] }) | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<api.ExamResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitExamRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (mode !== "taking" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitExamRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, timeLeft]);

  const generateExam = async () => {
    setGenerating(true);
    try {
      const decks = await (api.decksApi as any).getDecks();
      const deckIds = decks.map((d: any) => d.id).slice(0, 5);
      if (deckIds.length === 0) return;
      const res = await api.agentsApi.generateExam(deckIds, questionCount, durationMinutes);
      setExam(res.exam);
      setMode("taking");
      setTimeLeft(durationMinutes * 60);
      setCurrentQ(0);
      setAnswers({});
      setFlagged(new Set());
    } catch (err: any) {
      console.error(err);
    }
    setGenerating(false);
  };

  const submitExam = useCallback(async () => {
    if (!exam || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.agentsApi.submitExam(exam.id, answers);
      setResult(res);
      setMode("results");
    } catch (err: any) {
      console.error(err);
    }
    setSubmitting(false);
  }, [exam, submitting, answers]);

  useEffect(() => {
    submitExamRef.current = submitExam;
  }, [submitExam]);

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ)) next.delete(currentQ);
      else next.add(currentQ);
      return next;
    });
  };

  const resetExam = () => {
    setMode("config");
    setExam(null);
    setResult(null);
    setAnswers({});
    setFlagged(new Set());
    setTimeLeft(0);
  };

  const springTransition = { type: "spring" as const, stiffness: 260, damping: 24 };

  return (
    <>
      <style>{floatingKeyframes}</style>
      <AnimatePresence mode="wait">
        {mode === "config" && (
          <motion.div
            key="config"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={springTransition}
            className="max-w-2xl mx-auto px-4 py-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="relative"
            >
              <div style={glassCard}>
                <div style={topEdgeHighlight} />
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-8">
                    <motion.div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
                      style={{
                        background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))",
                        border: "1px solid rgba(245,158,11,0.2)",
                        boxShadow: "0 0 30px rgba(245,158,11,0.15)",
                      }}
                    >
                      <GraduationCap className="w-7 h-7" style={{ color: "#F59E0B" }} />
                    </motion.div>
                    <div>
                      <h1 className="text-2xl font-bold text-text-primary">Exam Simulator</h1>
                      <p className="text-text-secondary text-sm">AI-generated mock exams from your decks</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div style={glassSurface} className="p-6 rounded-2xl relative">
                      <div style={topEdgeHighlight} />
                      <h3 className="font-semibold text-text-primary mb-4 text-sm uppercase tracking-wider">
                        Number of Questions
                      </h3>
                      <div className="flex gap-3">
                        {[20, 50, 100].map((n) => (
                          <motion.button
                            key={n}
                            onClick={() => setQuestionCount(n)}
                            className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden"
                            style={
                              questionCount === n
                                ? {
                                    background: "linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.8))",
                                    color: "white",
                                    border: "1px solid rgba(245,158,11,0.4)",
                                    boxShadow: "0 0 25px rgba(245,158,11,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                                  }
                                : {
                                    ...glassCard,
                                    color: "var(--text-secondary)",
                                  }
                            }
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {questionCount === n && (
                              <motion.div
                                className="absolute inset-0"
                                style={{
                                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                                  backgroundSize: "200% 100%",
                                }}
                                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              />
                            )}
                            {n}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div style={glassSurface} className="p-6 rounded-2xl relative">
                      <div style={topEdgeHighlight} />
                      <h3 className="font-semibold text-text-primary mb-4 text-sm uppercase tracking-wider">
                        Time Limit
                      </h3>
                      <div className="flex gap-3">
                        {[30, 60, 120].map((n) => (
                          <motion.button
                            key={n}
                            onClick={() => setDurationMinutes(n)}
                            className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all relative overflow-hidden"
                            style={
                              durationMinutes === n
                                ? {
                                    background: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(37,99,235,0.8))",
                                    color: "white",
                                    border: "1px solid rgba(59,130,246,0.4)",
                                    boxShadow: "0 0 25px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                                  }
                                : {
                                    ...glassCard,
                                    color: "var(--text-secondary)",
                                  }
                            }
                            whileHover={{ scale: 1.03, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {durationMinutes === n && (
                              <motion.div
                                className="absolute inset-0"
                                style={{
                                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                                  backgroundSize: "200% 100%",
                                }}
                                animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              />
                            )}
                            {n} min
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <motion.button
                      onClick={generateExam}
                      disabled={generating}
                      className="w-full py-4 rounded-2xl text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
                      style={{
                        background: "linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.8))",
                        border: "1px solid rgba(245,158,11,0.3)",
                        boxShadow: "0 0 40px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                      }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div style={accentGlow("#F59E0B", 80)} />
                      {generating ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Generating Exam...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Start Exam
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {mode === "taking" && exam && (
          <motion.div
            key="taking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={springTransition}
            className="max-w-5xl mx-auto px-4 py-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <motion.div
                  className="relative px-4 py-2 rounded-xl"
                  style={{
                    ...glassCard,
                    color: "var(--text-secondary)",
                  }}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className="text-sm">
                    Question <strong className="text-text-primary">{currentQ + 1}</strong> / {exam.questions.length}
                  </span>
                </motion.div>
                <motion.div
                  className="w-56 h-2.5 rounded-full overflow-hidden relative"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div
                    className="h-full rounded-full relative"
                    style={{
                      width: `${Object.keys(answers).length / exam.questions.length * 100}%`,
                      background: "linear-gradient(90deg, #F59E0B, #D97706)",
                      boxShadow: "0 0 12px rgba(245,158,11,0.5)",
                    }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 2s infinite linear",
                      }}
                    />
                  </motion.div>
                </motion.div>
              </div>
              <div className="flex items-center gap-3">
                <motion.div
                  className={`relative px-4 py-2 rounded-xl flex items-center gap-2 ${
                    timeLeft < 300 ? "animate-pulse" : ""
                  }`}
                  style={{
                    ...glassCard,
                    color: timeLeft < 300 ? "#EF4444" : "var(--text-secondary)",
                    borderColor: timeLeft < 300 ? "rgba(239,68,68,0.3)" : undefined,
                    boxShadow: timeLeft < 300
                      ? "0 0 20px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.06)"
                      : undefined,
                  }}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  {timeLeft < 300 && (
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{ boxShadow: "0 0 20px rgba(239,68,68,0.3)" }}
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-mono font-semibold">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                </motion.div>
                <motion.button
                  onClick={toggleFlag}
                  className="p-2.5 rounded-xl relative"
                  style={{
                    ...glassCard,
                    color: flagged.has(currentQ) ? "#F59E0B" : "var(--text-secondary)",
                    borderColor: flagged.has(currentQ) ? "rgba(245,158,11,0.3)" : undefined,
                    boxShadow: flagged.has(currentQ)
                      ? "0 0 15px rgba(245,158,11,0.2)"
                      : undefined,
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Flag className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-9">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQ}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={springTransition}
                  >
                    <div style={glassSurface} className="p-6 rounded-2xl mb-6 relative">
                      <div style={topEdgeHighlight} />
                      <div className="relative">
                        <AIContent content={exam.questions[currentQ].front} accentColor="#3B82F6" />
                      </div>
                    </div>

                    <div className="space-y-3">
                      {exam.questions[currentQ].choices.map((choice, ci) => (
                        <motion.button
                          key={ci}
                          onClick={() => setAnswers((prev) => ({ ...prev, [currentQ]: ci }))}
                          className="w-full text-left p-4 rounded-xl text-sm transition-all relative overflow-hidden"
                          style={
                            answers[currentQ] === ci
                              ? {
                                  background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))",
                                  border: "1px solid rgba(245,158,11,0.35)",
                                  color: "white",
                                  boxShadow: "0 0 20px rgba(245,158,11,0.15), inset 0 1px 0 rgba(255,255,255,0.08)",
                                }
                              : {
                                  ...glassCard,
                                  color: "var(--text-primary)",
                                }
                          }
                          whileHover={{ scale: 1.01, x: 4 }}
                          whileTap={{ scale: 0.99 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: ci * 0.05 }}
                        >
                          {answers[currentQ] === ci && (
                            <motion.div
                              className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                              style={{ background: "linear-gradient(180deg, #F59E0B, #D97706)" }}
                              layoutId="answerIndicator"
                            />
                          )}
                          <span className="font-semibold mr-2" style={{ color: answers[currentQ] === ci ? "#F59E0B" : undefined }}>
                            {String.fromCharCode(65 + ci)}.
                          </span>
                          {choice.replace(/^[A-D]\.\s*/, "")}
                        </motion.button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-6">
                      <motion.button
                        onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                        disabled={currentQ === 0}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-secondary disabled:opacity-30 inline-flex items-center gap-1"
                        style={{
                          ...glassCard,
                        }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </motion.button>
                      {currentQ === exam.questions.length - 1 ? (
                        <motion.button
                          onClick={submitExam}
                          disabled={submitting}
                          className="px-6 py-3 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2 relative overflow-hidden"
                          style={{
                            background: "linear-gradient(135deg, rgba(34,197,94,0.9), rgba(16,185,129,0.8))",
                            border: "1px solid rgba(34,197,94,0.3)",
                            boxShadow: "0 0 25px rgba(34,197,94,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
                          }}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Submit Exam
                        </motion.button>
                      ) : (
                        <motion.button
                          onClick={() => setCurrentQ(Math.min(exam.questions.length - 1, currentQ + 1))}
                          className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-secondary inline-flex items-center gap-1"
                          style={{
                            ...glassCard,
                          }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="col-span-12 lg:col-span-3">
                <motion.div
                  className="p-4 rounded-2xl sticky top-20 relative"
                  style={{ ...glassSurface }}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div style={topEdgeHighlight} />
                  <div className="relative">
                    <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                      Navigator
                    </h4>
                    <div className="grid grid-cols-5 gap-1.5">
                      {exam.questions.map((_, qi) => (
                        <motion.button
                          key={qi}
                          onClick={() => setCurrentQ(qi)}
                          className="w-9 h-9 rounded-lg text-xs font-medium transition-all relative"
                          style={
                            qi === currentQ
                              ? {
                                  background: "linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.8))",
                                  color: "white",
                                  border: "1px solid rgba(245,158,11,0.4)",
                                  boxShadow: "0 0 12px rgba(245,158,11,0.3)",
                                }
                              : answers[qi] !== undefined
                              ? {
                                  background: "rgba(34,197,94,0.1)",
                                  border: "1px solid rgba(34,197,94,0.25)",
                                  color: "#22C55E",
                                }
                              : flagged.has(qi)
                              ? {
                                  background: "rgba(245,158,11,0.1)",
                                  border: "1px solid rgba(245,158,11,0.25)",
                                  color: "#F59E0B",
                                }
                              : {
                                  ...glassInput,
                                  color: "var(--text-secondary)",
                                }
                          }
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {qi + 1}
                        </motion.button>
                      ))}
                    </div>
                    <div className="mt-4 space-y-1.5 text-xs text-text-secondary">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={glassInput} />
                        Unanswered
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.3)" }} />
                        Answered
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.3)" }} />
                        Flagged
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {mode === "results" && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: 30 }}
            transition={springTransition}
            className="max-w-4xl mx-auto px-4 py-8"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="text-center mb-10"
            >
              <motion.div
                className="relative w-40 h-40 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${
                    result.score >= 70 ? "rgba(34,197,94,0.15)" : result.score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)"
                  }, transparent)`,
                  backdropFilter: "blur(40px)",
                  WebkitBackdropFilter: "blur(40px)",
                  border: `2px solid ${
                    result.score >= 70 ? "rgba(34,197,94,0.25)" : result.score >= 50 ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"
                  }`,
                  boxShadow: `0 0 60px ${
                    result.score >= 70 ? "rgba(34,197,94,0.15)" : result.score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)"
                  }, inset 0 1px 0 rgba(255,255,255,0.05)`,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              >
                <div
                  className="text-5xl font-bold"
                  style={{
                    color: result.score >= 70 ? "#22C55E" : result.score >= 50 ? "#F59E0B" : "#EF4444",
                    textShadow: `0 0 30px ${
                      result.score >= 70 ? "rgba(34,197,94,0.4)" : result.score >= 50 ? "rgba(245,158,11,0.4)" : "rgba(239,68,68,0.4)"
                    }`,
                  }}
                >
                  {result.score}%
                </div>
              </motion.div>
              <motion.p
                className="text-text-secondary text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <span className="text-text-primary font-semibold">{result.correct}</span> / {result.total} correct
              </motion.p>
            </motion.div>

            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {result.topicBreakdown.map((t, i) => (
                <motion.div
                  key={t.topic}
                  className="p-4 rounded-xl text-center relative overflow-hidden"
                  style={{
                    ...glassCard,
                    borderColor: t.percentage >= 70
                      ? "rgba(34,197,94,0.15)"
                      : t.percentage >= 50
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(239,68,68,0.15)",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  whileHover={{ scale: 1.03, y: -3 }}
                >
                  <div style={topEdgeHighlight} />
                  <div
                    className="text-2xl font-bold mb-1"
                    style={{
                      color: t.percentage >= 70 ? "#22C55E" : t.percentage >= 50 ? "#F59E0B" : "#EF4444",
                    }}
                  >
                    {t.percentage}%
                  </div>
                  <div className="text-xs text-text-secondary font-medium">{t.topic}</div>
                  <div className="text-xs text-text-secondary/60 mt-0.5">
                    {t.correct}/{t.total}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {result.weakTopics.length > 0 && (
              <motion.div
                className="p-5 rounded-2xl mb-6 relative overflow-hidden"
                style={{
                  ...glassCard,
                  borderColor: "rgba(239,68,68,0.15)",
                  boxShadow: "0 0 30px rgba(239,68,68,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div style={topEdgeHighlight} />
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#F87171" }}>
                  <span className="w-2 h-2 rounded-full bg-red-400" style={{ boxShadow: "0 0 8px rgba(239,68,68,0.5)" }} />
                  Weak Topics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.weakTopics.map((t) => (
                    <motion.span
                      key={t}
                      className="px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        color: "#F87171",
                        boxShadow: "0 0 10px rgba(239,68,68,0.08)",
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {t}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="font-semibold text-text-primary text-lg">Review Answers</h3>
              {exam?.questions.map((q, qi) => {
                const r = result.results[qi];
                return (
                  <motion.div
                    key={qi}
                    className="p-5 rounded-2xl relative overflow-hidden"
                    style={{
                      ...glassCard,
                      borderColor: r.isCorrect
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(239,68,68,0.2)",
                      boxShadow: r.isCorrect
                        ? "0 0 20px rgba(34,197,94,0.05), inset 0 1px 0 rgba(255,255,255,0.04)"
                        : "0 0 20px rgba(239,68,68,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 + qi * 0.03 }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{
                        background: r.isCorrect
                          ? "linear-gradient(180deg, #22C55E, #10B981)"
                          : "linear-gradient(180deg, #EF4444, #DC2626)",
                      }}
                    />
                    <div className="flex items-start gap-3">
                      {r.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary font-medium mb-2">{q.front}</p>
                        <p className="text-xs text-text-secondary">
                          Your answer:{" "}
                          <span className={r.isCorrect ? "text-green-400" : "text-red-400"}>
                            {q.choices[r.userAnswer] || "Not answered"}
                          </span>
                        </p>
                        {!r.isCorrect && (
                          <p className="text-xs text-text-secondary">
                            Correct: <span className="text-green-400">{q.choices[r.correctAnswer]}</span>
                          </p>
                        )}
                        <AIContent content={r.explanation} accentColor="#3B82F6" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              className="mt-10 text-center flex items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <motion.button
                onClick={resetExam}
                className="px-6 py-3 rounded-xl text-white font-semibold inline-flex items-center gap-2 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.9), rgba(217,119,6,0.8))",
                  border: "1px solid rgba(245,158,11,0.3)",
                  boxShadow: "0 0 25px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCcw className="w-4 h-4" />
                New Exam
              </motion.button>
              <motion.button
                onClick={() => window.location.href = "/dashboard"}
                className="px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2"
                style={{
                  ...glassCard,
                  color: "var(--text-secondary)",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Home className="w-4 h-4" />
                Dashboard
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
