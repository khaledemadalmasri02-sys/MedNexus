import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface EmptyScanStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyScanState({ title, description, icon, action }: EmptyScanStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16 rounded-2xl"
      style={{
        background: "var(--glass-card-bg)",
        border: "2px dashed var(--glass-border-light)",
        backdropFilter: "blur(20px)",
      }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.12)" }}>
          {icon || <BookOpen className="h-8 w-8 text-accent-cyan" />}
        </div>
      </motion.div>
      <h3 className="font-display text-xl font-bold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary max-w-md mx-auto mb-6">{description}</p>
      {action}
    </motion.div>
  );
}
