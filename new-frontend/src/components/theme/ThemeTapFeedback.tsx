import { useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";

interface Ripple {
  x: number;
  y: number;
  id: number;
}

export function ThemeTapFeedback() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const nextIdRef = useRef(0);
  const animRef = useRef(0);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleClick = (e: MouseEvent) => {
      let enabled = true;
      try {
        const saved = window.localStorage.getItem("guest_settings");
        if (saved) {
          const parsed = JSON.parse(saved);
          enabled = parsed.ripplesEnabled !== false;
        }
      } catch { /* ignore */ }
      if (!enabled) return;
      ripplesRef.current.push({ x: e.clientX, y: e.clientY, id: nextIdRef.current++ });
    };

    window.addEventListener("click", handleClick);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const tapColor = getComputedStyle(document.documentElement).getPropertyValue("--tap-color").trim() || "rgba(56, 189, 248, 0.3)";
      const tapGlow = getComputedStyle(document.documentElement).getPropertyValue("--tap-glow").trim() || "rgba(56, 189, 248, 0.15)";

      ripplesRef.current = ripplesRef.current.filter((ripple) => {
        const age = Date.now() - ripple.id;
        const duration = 600;
        const progress = age / duration;

        if (progress >= 1) return false;

        const radius = progress * 80;
        const alpha = 1 - progress;

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = tapColor.replace(/[\d.]+\)$/, `${alpha * 0.5})`);
        ctx.lineWidth = 2 * (1 - progress);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = tapGlow.replace(/[\d.]+\)$/, `${alpha * 0.3})`);
        ctx.fill();

        return true;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", handleClick);
      cancelAnimationFrame(animRef.current);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
      aria-hidden="true"
    />
  );
}
