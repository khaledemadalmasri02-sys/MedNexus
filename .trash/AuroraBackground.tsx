import { useRef, useEffect } from 'react';

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const bands = [
      { hue: 160, opacity: 0.04, width: 0.4, speed: 0.003, offset: 0 },
      { hue: 210, opacity: 0.05, width: 0.35, speed: 0.004, offset: Math.PI * 0.5 },
      { hue: 270, opacity: 0.03, width: 0.3, speed: 0.0025, offset: Math.PI },
    ];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * 0.5 * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight * 0.5}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      time += 0.016;
      const w = window.innerWidth;
      const h = window.innerHeight * 0.5;
      ctx.clearRect(0, 0, w, h);

      for (const band of bands) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) {
          const y = h * 0.3 +
            Math.sin(x * 0.003 + time * band.speed * 60 + band.offset) * h * 0.15 +
            Math.sin(x * 0.007 + time * band.speed * 40 + band.offset * 2) * h * 0.05;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, `hsla(${band.hue}, 80%, 50%, 0)`);
        grad.addColorStop(0.3, `hsla(${band.hue}, 80%, 50%, ${band.opacity})`);
        grad.addColorStop(0.5, `hsla(${band.hue + 20}, 70%, 55%, ${band.opacity * 1.3})`);
        grad.addColorStop(0.7, `hsla(${band.hue}, 80%, 50%, ${band.opacity})`);
        grad.addColorStop(1, `hsla(${band.hue}, 80%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 pointer-events-none w-full"
      style={{ zIndex: 0, opacity: document.documentElement.classList.contains('light') ? 0 : 1 }}
    />
  );
}
