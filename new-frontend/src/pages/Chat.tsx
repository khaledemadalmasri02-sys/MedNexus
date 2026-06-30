import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, Bot, User, Loader2, Sparkles, ThumbsUp, ThumbsDown, Star, MessageSquarePlus, Zap, GraduationCap } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { AIContent } from "../components/AIContent";
import ChatModeSelector from "../components/chat/ChatModeSelector";

const QUICK_PROMPTS = [
  { label: "Explain a concept", prompt: "Explain a key concept from my study material in simple terms" },
  { label: "Clinical vignette", prompt: "Give me a clinical vignette question based on my decks" },
  { label: "Quiz me", prompt: "Quiz me on a random topic from my study material" },
  { label: "Weak areas", prompt: "Based on my study history, what topics should I focus on?" },
];

const messageVariants = {
  hidden: (index: number) => ({
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { delay: index * 0.05 },
  }),
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: index * 0.05,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

export default function ChatPage() {
  const { messages, loading, historyLoading, mode, sendMessage, loadHistory, clearHistory, changeMode } = useChat();
  const [input, setInput] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [rating, setRating] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setFeedbackSent(false);
    setRating(0);
    setFeedbackMsg("");
    sendMessage(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = async () => {
    if (!feedbackMsg.trim() && rating === 0) return;
    try {
      const { supportApi } = await import("../lib/api");
      await supportApi.submitFeedback({
        type: "agent_feedback",
        rating: rating || null,
        message: feedbackMsg || `Rating: ${rating}/5`,
      });
      setFeedbackSent(true);
    } catch { /* ignore */ }
  };

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant" && !m.streaming);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-4">
      <style>{`
        @keyframes auraPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.2); }
          50% { box-shadow: 0 0 30px rgba(139,92,246,0.6), 0 0 60px rgba(139,92,246,0.3); }
        }
        @keyframes streamPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes glowHover {
          0%, 100% { box-shadow: 0 0 10px rgba(139,92,246,0.2); }
          50% { box-shadow: 0 0 20px rgba(139,92,246,0.4); }
        }
        .glass-panel {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 25px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .glass-input-area {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .glass-quick-prompt {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.3s ease;
        }
        .glass-quick-prompt:hover {
          background: rgba(139,92,246,0.08);
          border-color: rgba(139,92,246,0.2);
          box-shadow: 0 0 20px rgba(139,92,246,0.15);
        }
        .user-bubble {
          background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(34,197,94,0.15);
        }
        .ai-bubble {
          background: rgba(139,92,246,0.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(139,92,246,0.1);
          border-left: 2px solid rgba(139,92,246,0.3);
        }
        .ai-avatar-orb {
          background: linear-gradient(135deg, #8B5CF6, #7C3AED);
          animation: auraPulse 2.5s ease-in-out infinite;
        }
        .send-btn-orb {
          background: linear-gradient(135deg, #8B5CF6, #7C3AED);
          transition: all 0.3s ease;
        }
        .send-btn-orb:hover:not(:disabled) {
          box-shadow: 0 0 25px rgba(139,92,246,0.5), 0 0 50px rgba(139,92,246,0.2);
        }
        .streaming-dot {
          animation: streamPulse 1.2s ease-in-out infinite;
        }
        .rating-widget {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .header-glass {
          background: rgba(255,255,255,0.02);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
      `}</style>

      <div className="rounded-2xl glass-panel flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 header-glass">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center ai-avatar-orb">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Study Buddy</h1>
              <div className="flex items-center gap-1.5">
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>AI study tutor</p>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: mode === "brief" ? "rgba(245,158,11,0.12)" : "rgba(139,92,246,0.12)", color: mode === "brief" ? "#F59E0B" : "#8B5CF6" }}>
                  {mode === "brief" ? <Zap className="w-2.5 h-2.5" /> : <GraduationCap className="w-2.5 h-2.5" />}
                  {mode === "brief" ? "Brief" : "Academic"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="p-2 rounded-lg transition-all hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {historyLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-secondary)" }} />
            </div>
          )}

          {messages.length === 0 && !historyLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 ai-avatar-orb"
              >
                <Sparkles className="w-9 h-9 text-white" />
              </motion.div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Hi! I'm your Study Buddy</h2>
              <p className="text-sm mb-7 max-w-md" style={{ color: "var(--text-secondary)" }}>
                Ask me anything about your study material. I can explain concepts, quiz you, and help you learn.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-md">
                {QUICK_PROMPTS.map((qp, i) => (
                  <motion.button
                    key={qp.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                    onClick={() => { setInput(qp.prompt); inputRef.current?.focus(); }}
                    className="glass-quick-prompt px-4 py-3 rounded-xl text-xs font-medium text-left"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {qp.label}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                custom={idx}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 ai-avatar-orb">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed min-w-0 overflow-hidden ${
                    msg.role === "user" ? "user-bubble" : "ai-bubble"
                  }`}
                  style={msg.role === "user"
                    ? { color: "white" }
                    : { color: "var(--text-primary)" }
                  }
                >
                  {msg.role === "user" ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <AIContent content={msg.content} accentColor="#8B5CF6" compact />
                  )}
                  {msg.streaming && (
                    <span className="inline-block w-2 h-2 rounded-full ml-1 align-middle streaming-dot" style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }} />
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <User className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {lastAssistantMsg && !loading && !feedbackSent && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="ml-12 p-4 rounded-xl rating-widget"
            >
              <div className="flex items-center gap-2 mb-3">
                <MessageSquarePlus className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Rate this response</span>
              </div>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110">
                    <Star className={`w-4 h-4 transition-colors ${s <= rating ? "fill-yellow-400 text-yellow-400" : ""}`} style={s > rating ? { color: "var(--text-muted)" } : undefined} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleFeedback}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
                >
                  <ThumbsUp className="w-3 h-3" /> Helpful
                </button>
                <button
                  onClick={handleFeedback}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
                >
                  <ThumbsDown className="w-3 h-3" /> Not helpful
                </button>
              </div>
            </motion.div>
          )}

          {feedbackSent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-12 text-xs py-2" style={{ color: "var(--text-muted)" }}>
              Thanks for your feedback!
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="px-5 py-4 glass-input-area border-t border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <ChatModeSelector mode={mode} onModeChange={changeMode} disabled={loading} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {mode === "brief" ? "Concise, short answers" : "Detailed, scholarly explanations"}
            </span>
          </div>
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "brief" ? "Ask for a quick answer..." : "Ask for a detailed explanation..."}
              rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "var(--text-primary)",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
              }}
            />
            <motion.button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-4 rounded-xl text-white disabled:opacity-30 disabled:cursor-not-allowed send-btn-orb"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
