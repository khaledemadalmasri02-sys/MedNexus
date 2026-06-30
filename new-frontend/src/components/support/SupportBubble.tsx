import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import SupportPanel from "./SupportPanel";

export default function SupportBubble() {
  const [open, setOpen] = useState(false);
  const { accentColor } = useTheme();

  return (
    <>
      <AnimatePresence>
        {open && <SupportPanel onClose={() => setOpen(false)} />}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[150] w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
          boxShadow: `0 4px 24px ${accentColor}40`,
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={open ? { rotate: 180 } : { rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        aria-label={open ? "Close support" : "Open support"}
      >
        <motion.div
          animate={open ? { opacity: 0, scale: 0 } : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          style={{ position: "absolute" }}
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </motion.div>
        <motion.div
          animate={open ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ duration: 0.15 }}
          style={{ position: "absolute" }}
        >
          <X className="w-6 h-6 text-white" />
        </motion.div>
      </motion.button>
    </>
  );
}
