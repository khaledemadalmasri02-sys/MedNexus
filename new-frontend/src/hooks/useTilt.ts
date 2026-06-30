import { useState, useCallback, useRef, type MouseEvent } from "react";

interface TiltStyle {
  transform: string;
  transition?: string;
}

export function useTilt(intensity: number = 8) {
  const [style, setStyle] = useState<TiltStyle>({ transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)" });
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -intensity;
      const rotateY = ((x - centerX) / centerX) * intensity;
      setStyle({
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`,
        transition: "transform 0.1s ease-out",
      });
    },
    [intensity]
  );

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)",
      transition: "transform 0.5s ease-out",
    });
  }, []);

  return { ref, style, handleMouseMove, handleMouseLeave };
}
