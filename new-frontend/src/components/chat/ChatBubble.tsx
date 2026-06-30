import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

interface ChatBubbleProps {
  onClick: () => void;
}

export default function ChatBubble({ onClick }: ChatBubbleProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 1 }}
    >
      <button
        onClick={onClick}
        className="relative w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg group"
        style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent-green text-[10px] font-bold flex items-center justify-center text-white">AI</span>
        <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "#8B5CF6" }} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
        className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center text-text-secondary hover:text-text-primary"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
