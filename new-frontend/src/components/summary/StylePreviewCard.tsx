import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { springTransition } from "../ui/constants";
import type { SummaryStyle } from "../../lib/api";

interface StylePreviewCardProps {
  style: SummaryStyle;
  name: string;
  description: string;
  tags?: string[];
  isSelected: boolean;
  onClick: () => void;
  delay?: number;
  previewContent: React.ReactNode;
}

export default function StylePreviewCard({
  name, description, tags = [], isSelected, onClick, delay = 0, previewContent,
}: StylePreviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative shrink-0 w-[190px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
        isSelected ? "ring-2 ring-accent-cyan shadow-[0_0_30px_rgba(6,182,212,0.15)]" : ""
      }`}
      style={{
        background: "var(--glass-card-bg)",
        border: `1px solid ${isSelected ? "var(--accent-cyan)" : "var(--glass-border)"}`,
        backdropFilter: "blur(20px)",
      }}
      data-hover="true"
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full flex items-center justify-center"
          style={{ background: "var(--accent-cyan)", boxShadow: "0 0 12px rgba(6,182,212,0.4)" }}
        >
          <Check className="h-3.5 w-3.5 text-white" />
        </motion.div>
      )}

      <div
        className="h-36 w-full overflow-hidden"
        style={{
          background: "var(--glass-surface)",
          borderBottom: "1px solid var(--glass-border)",
        }}
      >
        {previewContent}
      </div>

      <div className="p-3">
        <p className="text-sm font-semibold text-text-primary mb-0.5">{name}</p>
        <p className="text-[10px] text-text-muted mb-2 leading-relaxed">{description}</p>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[8px] font-medium"
              style={{
                background: isSelected
                  ? "rgba(6, 182, 212, 0.1)"
                  : "var(--glass-surface)",
                border: `1px solid ${isSelected ? "rgba(6, 182, 212, 0.25)" : "var(--glass-border)"}`,
                color: isSelected ? "var(--accent-cyan)" : "var(--text-muted)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
