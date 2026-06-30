import { useEffect, useRef } from "react";

const SYMBOLS = [
  "∑", "∫", "∂", "√", "∞", "π", "Δ", "λ", "φ", "θ",
  "≠", "≈", "≤", "≥", "±", "×", "÷", "∈", "∉", "∪",
  "∩", "→", "←", "↔", "∴", "∵", "∇", "⊗", "⊕", "⊥",
  "∥", "∠", "∡", "∢", "ℓ", "ℵ", "ℜ", "ℑ", "℘", "∮",
  "∯", "∰", "∱", "∲", "∳", "ℏ", "ℜ", "℘", "ℑ", "℞",
];

interface FloatingSymbol {
  x: number;
  y: number;
  baseY: number;
  symbol: string;
  size: number;
  speed: number;
  amplitude: number;
  phase: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

export default function SceneFormula() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let time = 0;
    let particles: FloatingSymbol[] = [];
    let lastSpawn = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnParticle = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      particles.push({
        x: Math.random() * w,
        y: h + 40,
        baseY: h + 40,
        symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        size: 10 + Math.random() * 16,
        speed: 0.15 + Math.random() * 0.35,
        amplitude: 20 + Math.random() * 35,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.06 + Math.random() * 0.12,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
      });
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      time += 0.008;

      if (time - lastSpawn > 0.6 && particles.length < 55) {
        spawnParticle();
        lastSpawn = time;
      }

      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cx = w * 0.5;
      const cy = h * 0.5;
      const radius = Math.min(w, h) * 0.25;

      ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
      ctx.stroke();

      const points = 6;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2 + time * 0.4;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;

        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        const innerAngle = angle + Math.PI;
        const ix = cx + Math.cos(innerAngle) * radius * 0.65;
        const iy = cy + Math.sin(innerAngle) * radius * 0.65;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(ix, iy);
        ctx.stroke();
      }

      particles = particles.filter((p) => p.y > -50);

      for (const p of particles) {
        p.y -= p.speed;
        p.x += Math.sin(time * 0.5 + p.phase) * 0.2;
        p.rotation += p.rotationSpeed;

        const drift = Math.sin(time * 0.8 + p.phase) * p.amplitude * 0.3;
        const screenX = p.x + drift;
        const screenY = p.y;

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.symbol, 0, 0);
        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
