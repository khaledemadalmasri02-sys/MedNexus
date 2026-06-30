import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

interface AmbientBackgroundProps {
  enabled: boolean;
}

function getIsLowEnd(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as any).hardwareConcurrency != null && (navigator as any).hardwareConcurrency < 4;
}

function OrbDrift({ index, color, size, speed }: { index: number; color: string; size: number; speed: number }) {
  const delay = index * (speed / 3);
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(60px)",
        opacity: 0.08,
        willChange: "transform",
      }}
      animate={{
        x: [0, 100, -50, 80, 0],
        y: [0, -80, 60, -40, 0],
        scale: [1, 1.2, 0.9, 1.1, 1],
      }}
      transition={{
        duration: speed,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function AmbientBackground({ enabled }: AmbientBackgroundProps) {
  const { colors } = useTheme();

  const particles = useMemo(() => {
    if (!enabled) return null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
    const lowEnd = getIsLowEnd();
    const count = lowEnd ? 2 : 3;

    return Array.from({ length: count }, (_, i) => (
      <OrbDrift
        key={i}
        index={i}
        color={i === 0 ? colors.accentPrimary : i === 1 ? colors.accentSecondary : "#8B5CF6"}
        size={i === 0 ? 600 : i === 1 ? 400 : 350}
        speed={20}
      />
    ));
  }, [enabled, colors.accentPrimary, colors.accentSecondary]);

  if (!particles) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {particles}
    </div>
  );
}
