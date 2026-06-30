import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { SPRING } from "../ui/constants";
import type { AchievementItem } from "../../lib/api";

interface Particle {
  id: number;
  bg: string;
  left: number;
  endX: number;
  endY: number;
}

const COLORS = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e"];

function createParticles(): Particle[] {
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    bg: COLORS[i % 5],
    left: 50 + (Math.random() - 0.5) * 10,
    endX: (Math.random() - 0.5) * 200,
    endY: (Math.random() - 0.5) * 100,
  }));
}

interface CelebrationBannerProps {
  achievements: AchievementItem[];
  onDismiss: (id: number) => void;
}

export default function CelebrationBanner({ achievements, onDismiss }: CelebrationBannerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [particles] = useState<Particle[]>(() => createParticles());

  useEffect(() => {
    if (achievements.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % achievements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [achievements.length]);

  useEffect(() => {
    if (achievements.length === 0) return;
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [achievements.length]);

  if (!visible || achievements.length === 0) return null;

  const achievement = achievements[currentIdx % achievements.length];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="mb-6 rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.1))",
            border: "1px solid rgba(139, 92, 246, 0.2)",
          }}
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40, height: 0 }}
          transition={SPRING.bouncy}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: p.bg,
                  left: `${p.left}%`,
                  top: "50%",
                }}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{
                  x: p.endX,
                  y: p.endY,
                  opacity: 0,
                }}
                transition={{ duration: 2, delay: p.id * 0.08, ease: "easeOut" }}
              />
            ))}
          </div>

          <div className="relative flex items-center gap-3">
            <span className="text-2xl">{achievement.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary text-sm">{achievement.title}</p>
              <p className="text-xs text-text-secondary">{achievement.description}</p>
            </div>
            <button
              onClick={() => {
                onDismiss(achievement.id);
                setVisible(false);
              }}
              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 hover:bg-white/10 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {achievements.length > 1 && (
            <div className="flex gap-1 mt-3 justify-center">
              {achievements.map((_, idx) => (
                <div
                  key={idx}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: idx === currentIdx % achievements.length ? 16 : 6,
                    background: idx === currentIdx % achievements.length ? "var(--accent-purple)" : "rgba(148, 163, 184, 0.3)",
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
