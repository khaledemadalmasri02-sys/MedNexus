import { type CSSProperties } from "react";

export const glassSurface: CSSProperties = {
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(40px) saturate(1.5)",
  WebkitBackdropFilter: "blur(40px) saturate(1.5)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
};

export const glassCard: CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  backdropFilter: "blur(40px) saturate(1.5)",
  WebkitBackdropFilter: "blur(40px) saturate(1.5)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 8px 32px rgba(0, 0, 0, 0.3)",
};

export const glassCardHover = (color: string): CSSProperties => ({
  border: `1px solid ${color}30`,
  boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 16px 48px rgba(0, 0, 0, 0.4), 0 0 30px ${color}10`,
});

export const glassInput: CSSProperties = {
  background: "rgba(255, 255, 255, 0.02)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.2)",
};

export const accentGlow = (color: string, size: number = 120): CSSProperties => ({
  position: "absolute",
  bottom: `-${size / 3}px`,
  left: "50%",
  transform: "translateX(-50%)",
  width: `${size}%`,
  height: "60px",
  background: `radial-gradient(ellipse, ${color}15 0%, transparent 70%)`,
  pointerEvents: "none" as const,
  filter: "blur(8px)",
});

export const topEdgeHighlight: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "1px",
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
};

export const userBubble: CSSProperties = {
  background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(34,197,94,0.15)",
  boxShadow: "0 4px 16px rgba(34,197,94,0.1)",
};

export const aiBubble: CSSProperties = {
  background: "rgba(139, 92, 246, 0.06)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(139, 92, 246, 0.1)",
  borderLeft: "2px solid rgba(139, 92, 246, 0.3)",
  boxShadow: "0 4px 16px rgba(139, 92, 246, 0.06)",
};

export const floatingKeyframes = `
@keyframes float-gentle {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33% { transform: translateY(-6px) rotate(0.5deg); }
  66% { transform: translateY(-3px) rotate(-0.3deg); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px currentColor; opacity: 0.6; }
  50% { box-shadow: 0 0 40px currentColor; opacity: 1; }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes streaming-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
`;

export const statOrb = (color: string): CSSProperties => ({
  background: `radial-gradient(circle at 30% 30%, ${color}20, ${color}05)`,
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: `1px solid ${color}15`,
  boxShadow: `0 0 40px ${color}08, inset 0 1px 0 rgba(255,255,255,0.05)`,
});
