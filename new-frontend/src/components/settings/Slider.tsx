import { motion } from "framer-motion";
import { useState, useCallback, useRef, type ReactNode } from "react";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  labels?: { min?: ReactNode; max?: ReactNode; current?: ReactNode };
}

export function Slider({ value, min, max, step = 1, onChange, formatValue, labels }: SliderProps) {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const percent = ((value - min) / (max - min)) * 100;

  const updateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + pct * (max - min);
    const stepped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, stepped)));
  }, [min, max, step, onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateValue(e.clientX);
  }, [updateValue]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging) updateValue(e.clientX);
  }, [dragging, updateValue]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const displayValue = labels?.current ?? (formatValue ? formatValue(value) : value.toString());

  return (
    <div className="flex flex-col items-end gap-1 w-full max-w-[240px]">
      {dragging && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-[10px] font-semibold"
          style={{ color: "var(--accent-green)" }}
        >
          {displayValue}
        </motion.span>
      )}
      <div
        ref={trackRef}
        className="relative w-full h-6 flex items-center cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className="absolute inset-x-0 h-1 rounded-full"
          style={{ background: "var(--border-default)" }}
        />
        <motion.div
          className="absolute left-0 h-1 rounded-full"
          style={{ background: "var(--accent-green)", width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <motion.div
          className="absolute w-5 h-5 rounded-full bg-white shadow-md"
          style={{
            left: `calc(${percent}% - 10px)`,
            border: "2px solid var(--accent-green)",
            boxShadow: dragging ? "0 0 12px var(--accent-green)" : "0 2px 8px rgba(0,0,0,0.15)",
          }}
          animate={{ scale: dragging ? 1.2 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        />
      </div>
      <div className="flex justify-between w-full">
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {labels?.min ?? min}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {labels?.max ?? max}
        </span>
      </div>
    </div>
  );
}
