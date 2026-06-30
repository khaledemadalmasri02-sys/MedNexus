import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Star, Check, Bug, Lightbulb, HelpCircle } from "lucide-react";
import { useToast } from "../../components/Toast";
import * as api from "../../lib/api";

const CATEGORIES = [
  { id: "bug", label: "Bug Report", icon: Bug, color: "var(--accent-rose)" },
  { id: "feature", label: "Feature Request", icon: Lightbulb, color: "var(--accent-amber)" },
  { id: "other", label: "Other", icon: HelpCircle, color: "var(--accent-blue)" },
];

export function FeedbackSection() {
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
        setSubmitted(false);
        setCategory(null);
        setRating(0);
        setMessage("");
      }, 3000);
    } catch {
      toast("Failed to send feedback. Please try again.", "error");
    }
    setSending(false);
  }, [category, rating, message, toast]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Send Feedback</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Help us improve MedNexus with your feedback and suggestions.</p>
      </div>

      <div className="p-6 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
        {submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)" }}
            >
              <Check className="h-7 w-7" style={{ color: "var(--accent-emerald)" }} />
            </motion.div>
            <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Thank you!</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Your feedback helps us improve.</p>
          </motion.div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold mb-2.5 block" style={{ color: "var(--text-secondary)" }}>Category</label>
              <div className="flex gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: category === cat.id ? `${cat.color}15` : "var(--bg-elevated)",
                      border: `1px solid ${category === cat.id ? `${cat.color}40` : "var(--border-subtle)"}`,
                      color: category === cat.id ? cat.color : "var(--text-secondary)",
                    }}
                  >
                    <cat.icon className="h-5 w-5" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-2.5 block" style={{ color: "var(--text-secondary)" }}>Rating</label>
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
                      className="h-6 w-6 transition-colors"
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
              <label className="text-xs font-semibold mb-2.5 block" style={{ color: "var(--text-secondary)" }}>Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind..."
                rows={4}
                className="w-full rounded-xl text-sm outline-none resize-none p-4"
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
              className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--accent-purple), var(--accent-blue))" }}
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Feedback
                </>
              )}
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}
