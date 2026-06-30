import { useState, useCallback, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
  duration: number;
}

let rippleId = 0;

function InkDropRipple({ ripple }: { ripple: Ripple }) {
  return (
    <motion.div
      key={ripple.id}
      className="absolute rounded-full pointer-events-none"
      style={{
        left: ripple.x,
        top: ripple.y,
        width: 200,
        height: 200,
        marginLeft: -100,
        marginTop: -100,
        background: `radial-gradient(circle, ${ripple.color} 0%, transparent 70%)`,
      }}
      initial={{ scale: 0, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: ripple.duration / 1000, ease: "easeOut" }}
    />
  );
}

function RippleRenderer({ ripples }: { ripples: Ripple[] }) {
  return (
    <AnimatePresence>
      {ripples.map(r => <InkDropRipple key={r.id} ripple={r} />)}
    </AnimatePresence>
  );
}

export function useRipple(enabled: boolean) {
  const { theme } = useTheme();
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const createRipple = useCallback((e: MouseEvent<HTMLElement>) => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const color = theme.tapColor;
    const ripple: Ripple = {
      id: ++rippleId,
      x, y,
      color,
      duration: 600,
    };
    setRipples(prev => [...prev, ripple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id));
    }, 650);
  }, [enabled, theme.tapColor]);

  return { ripples, createRipple, RippleRenderer };
}
