import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Star, Check, Bug, Lightbulb, HelpCircle } from "lucide-react";
import { useToast } from "./Toast";
import * as api from "../lib/api";

const CATEGORIES = [
  { id: "bug", label: "Bug Report", icon: Bug, color: "var(--accent-rose)" },
  { id: "feature", label: "Feature Request", icon: Lightbulb, color: "var(--accent-amber)" },
  { id: "other", label: "Other", icon: HelpCircle, color: "var(--accent-blue)" },
];

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await api.submitFeedback({
        type: category || "other",
        rating,
        message: message.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setCategory(null);
        setRating(0);
        setMessage("");
      }, 2000);
    } catch {
      toast("Failed to send feedback. Please try again.", "error");
    }
    setSending(false);
  }, [category, rating, message, toast]);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-[150] w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
        style={{
          background: "linear-gradient(135deg, var(--accent-purple), var(--accent-blue))",
          boxShadow: "0 4px 20px rgba(139, 92, 246, 0.3)",
        }}
        title="Send feedback"
      >
        <MessageSquare className="h-5 w-5 text-white" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-20 left-6 z-[150] w-80 rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--glass-border-light)",
              boxShadow: "0 24px 48px -12px rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-accent-purple" />
                <span className="text-sm font-semibold text-text-primary">Send Feedback</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)" }}
                  >
                    <Check className="h-6 w-6 text-accent-emerald" />
                  </motion.div>
                  <p className="text-sm font-medium text-text-primary">Thank you!</p>
                  <p className="text-xs text-text-muted mt-1">Your feedback helps us improve.</p>
                </motion.div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-2 block">Category</label>
                    <div className="flex gap-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className="flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-xl text-[10px] font-medium transition-all"
                          style={{
                            background: category === cat.id ? `${cat.color}15` : "var(--bg-elevated)",
                            border: `1px solid ${category === cat.id ? `${cat.color}40` : "var(--border-subtle)"}`,
                            color: category === cat.id ? cat.color : "var(--text-secondary)",
                          }}
                        >
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-2 block">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className="h-5 w-5 transition-colors"
                            style={{
                              color: star <= (hoverRating || rating) ? "var(--accent-amber)" : "var(--border-subtle)",
                              fill: star <= (hoverRating || rating) ? "var(--accent-amber)" : "transparent",
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-2 block">Message</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what's on your mind..."
                      rows={3}
                      className="w-full rounded-xl text-xs outline-none resize-none p-3"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    disabled={!message.trim() || sending}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, var(--accent-purple), var(--accent-blue))" }}
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Send Feedback
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
