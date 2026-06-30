import { motion } from "framer-motion";

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  isProcessing: boolean;
  color?: string;
  height?: number;
}

export default function AnimatedProgressBar({
  progress,
  isProcessing,
  color = "var(--accent-green)",
  height = 8,
}: AnimatedProgressBarProps) {
  return (
    <div className="w-full">
      <div
        className="relative w-full rounded-full overflow-hidden"
        style={{
          height: `${height}px`,
          background: "var(--glass-surface)",
          border: "1px solid var(--glass-border)",
        }}
      >
        {/* Background shimmer */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
            backgroundSize: "200% 100%",
          }}
          animate={{
            backgroundPosition: ["200% 0", "-200% 0"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Main progress bar */}
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            boxShadow: `0 0 10px ${color}60`,
          }}
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {/* Glowing tip */}
        {isProcessing && progress > 0 && progress < 100 && (
          <motion.div
            className="absolute top-0 h-full w-4 rounded-full"
            style={{
              left: `calc(${progress}% - 8px)`,
              background: `radial-gradient(circle, ${color}, transparent)`,
              filter: "blur(2px)",
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Particle effects */}
        {isProcessing && progress > 0 && progress < 100 && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-1/2 w-1 h-1 rounded-full"
                style={{
                  left: `${progress}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 4px ${color}`,
                }}
                animate={{
                  y: [-4, 4, -4],
                  x: [0, 10 + i * 5, 20 + i * 10],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* Progress text */}
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-text-secondary">
          {isProcessing ? "Processing..." : progress === 100 ? "Complete!" : "Waiting..."}
        </span>
        <span className="text-xs font-medium" style={{ color }}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
