import { motion } from "framer-motion";
import { Check } from "lucide-react";

const COLORS = [
  { id: "green", hex: "#22C55E", name: "Emerald" },
  { id: "blue", hex: "#3B82F6", name: "Ocean" },
  { id: "purple", hex: "#8B5CF6", name: "Violet" },
  { id: "cyan", hex: "#06B6D4", name: "Cyan" },
  { id: "amber", hex: "#F59E0B", name: "Amber" },
  { id: "rose", hex: "#F43F5E", name: "Rose" },
  { id: "orange", hex: "#F97316", name: "Sunset" },
  { id: "emerald", hex: "#10B981", name: "Forest" },
];

interface ColorPickerProps {
  value: string;
  onChange: (colorId: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const selected = COLORS.find(c => c.id === value) || COLORS[0];

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        {COLORS.map(color => {
          const isSelected = value === color.id;
          return (
            <motion.button
              key={color.id}
              className="relative w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: color.hex }}
              onClick={() => onChange(color.id)}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              animate={isSelected ? { scale: [1, 1.2, 1] } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              aria-label={color.name}
            >
              {isSelected && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ boxShadow: `0 0 0 2px var(--bg-void), 0 0 0 4px ${color.hex}` }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              )}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} style={{ color: color.id === "amber" ? "#111827" : "var(--text-on-accent)" }} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      <span className="text-[10px] font-medium" style={{ color: selected.hex }}>{selected.name}</span>
    </div>
  );
}
