import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

interface CustomCursorProps {
  enabled: boolean;
}

export function CustomCursor({ enabled }: CustomCursorProps) {
  const { colors } = useTheme();
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const trailX = useMotionValue(-100);
  const trailY = useMotionValue(-100);

  const springX = useSpring(cursorX, { stiffness: 300, damping: 30 });
  const springY = useSpring(cursorY, { stiffness: 300, damping: 30 });
  const trailSpringX = useSpring(trailX, { stiffness: 150, damping: 20 });
  const trailSpringY = useSpring(trailY, { stiffness: 150, damping: 20 });

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine)");
    setIsFinePointer(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!enabled || !isFinePointer) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const moveHandler = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      trailX.set(e.clientX);
      trailY.set(e.clientY);
    };

    const overHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const computed = window.getComputedStyle(target);
      setIsPointer(computed.cursor === "pointer" || target.tagName === "BUTTON" || target.closest("button") != null || target.closest("a") != null);
    };

    window.addEventListener("mousemove", moveHandler);
    window.addEventListener("mouseover", overHandler);
    return () => {
      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("mouseover", overHandler);
    };
  }, [enabled, isFinePointer, cursorX, cursorY, trailX, trailY]);

  if (!enabled || !isFinePointer || !isVisible) return null;

  const size = isPointer ? 20 : 12;
  const color = colors.accentPrimary;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none rounded-full mix-blend-difference"
        style={{
          x: springX,
          y: springY,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}`,
          zIndex: 9999,
          willChange: "transform",
        }}
        animate={{ scale: isPointer ? 1.3 : 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        className="fixed top-0 left-0 pointer-events-none rounded-full"
        style={{
          x: trailSpringX,
          y: trailSpringY,
          width: 6,
          height: 6,
          marginLeft: -3,
          marginTop: -3,
          backgroundColor: color,
          opacity: 0.4,
          zIndex: 9998,
          willChange: "transform",
        }}
      />
    </>
  );
}
