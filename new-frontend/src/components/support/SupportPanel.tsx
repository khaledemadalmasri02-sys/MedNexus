import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Send, ThumbsUp, ThumbsDown, Copy, Check,
  Sparkles, BookOpen, ChevronRight, Loader2,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { supportApi } from "../../lib/api";
import { AIContent } from "../AIContent";
import { smoothTransition, springTransition } from "../ui/constants";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  source?: "knowledge" | "ai";
  knowledgeId?: number | null;
  confidence?: number;
  category?: string;
  timestamp: Date;
  rated?: boolean;
}

const SUGGESTED_QUESTIONS = [
  "How do I create my first deck?",
  "How does spaced repetition work?",
  "What file types can I upload?",
  "How do I share my decks?",
  "Is MedNexus free?",
];

export default function SupportPanel({ onClose }: { onClose: () => void }) {
  const { accentColor } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await supportApi.ask(text.trim());
      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content: response.answer,
        source: response.source,
        knowledgeId: response.knowledgeId,
        confidence: response.confidence,
        category: response.category,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMsg]);
    } catch {
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "agent",
        content: "I couldn't reach the support service right now. Please try again in a moment.",
        source: "ai",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleRate = async (messageId: string, knowledgeId: number, helpful: boolean) => {
    try {
      await supportApi.rate(knowledgeId, helpful);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, rated: true } : m));
    } catch { /* ignore */ }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={smoothTransition}
      className="fixed bottom-24 right-6 z-[150] w-[420px] max-w-[calc(100vw-2rem)] rounded-3xl overflow-hidden flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        backdropFilter: "blur(40px)",
        border: '1px solid var(--border-default)',
        boxShadow: `0 24px 80px rgba(0,0,0,0.3), 0 0 0 1px ${accentColor}15`,
        height: "min(600px, calc(100vh - 8rem))",
      }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)` }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Support Agent
            </h3>
            <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Instant answers
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-highlight)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          aria-label="Close support panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "thin" }}>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-6"
          >
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: `${accentColor}15` }}
            >
              <BookOpen className="w-7 h-7" style={{ color: accentColor }} />
            </div>
            <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              How can I help you?
            </h4>
            <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
              Ask me anything about MedNexus
            </p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <motion.button
                  key={q}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors"
                  style={{
                    background: 'var(--bg-deep)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                  }}
                  whileHover={{ x: 4, background: `${accentColor}10` }}
                  whileTap={{ scale: 0.98 }}
                >
                  <ChevronRight className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={springTransition}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
                  msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
                }`}
                style={{
                  background: msg.role === "user"
                    ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
                    : 'var(--bg-deep)',
                  color: msg.role === "user" ? "#FFFFFF" : 'var(--text-primary)',
                  border: msg.role === "agent" ? '1px solid var(--border-default)' : "none",
                  fontWeight: msg.role === "agent" ? 500 : 400,
                }}
              >
                {msg.role === "agent" && (
                  <div className="flex items-center gap-1.5 mb-2">
                    {msg.source === "knowledge" ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${accentColor}30`, color: accentColor }}>
                        Knowledge Base
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${accentColor}25`, color: accentColor }}>
                        AI Generated
                      </span>
                    )}
                    {msg.category && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        {msg.category}
                      </span>
                    )}
                  </div>
                )}
                  <AIContent content={msg.content} accentColor={accentColor} compact />
                {msg.role === "agent" && (
                  <div className="flex items-center gap-2 mt-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-highlight)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === msg.id ? "Copied" : "Copy"}
                    </button>
                    {msg.knowledgeId && !msg.rated && (
                      <>
                        <button
                          onClick={() => handleRate(msg.id, msg.knowledgeId!, true)}
                          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors hover:bg-emerald-500/10"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <ThumbsUp className="w-3 h-3" /> Helpful
                        </button>
                        <button
                          onClick={() => handleRate(msg.id, msg.knowledgeId!, false)}
                          className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors hover:bg-rose-500/10"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <ThumbsDown className="w-3 h-3" /> Not helpful
                        </button>
                      </>
                    )}
                    {msg.rated && (
                      <span className="text-[10px] font-medium" style={{ color: accentColor }}>Thanks for feedback</span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3"
              style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: accentColor }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-2"
          style={{
            background: 'var(--bg-deep)',
            border: '1px solid var(--border-default)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted"
            style={{ color: 'var(--text-primary)' }}
            disabled={loading}
          />
          <motion.button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="p-2 rounded-xl disabled:opacity-30"
            style={{ background: accentColor }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </motion.button>
        </div>
        <p className="text-[9px] text-center mt-2" style={{ color: 'var(--text-muted)' }}>
          Powered by AI - Answers from knowledge base + AI generation
        </p>
      </div>
    </motion.div>
  );
}
