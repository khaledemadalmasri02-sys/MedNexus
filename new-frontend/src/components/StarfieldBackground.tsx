import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface Star {
  baseX: number;
  baseY: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  hue: number;
  saturation: number;
  layer: number;
  driftX: number;
  driftY: number;
  flowSpeed: number;
  flowRadius: number;
  flowPhase: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  hue: number;
  opacity: number;
}

const TAB_HUE_RANGES: Record<string, [number, number][]> = {
  '/': [[130, 170], [160, 190], [100, 140]],
  '/library': [[210, 240], [220, 260], [190, 220]],
  '/history': [[30, 55], [20, 45], [40, 60]],
  '/planner': [[260, 290], [270, 300], [250, 280]],
  '/generate': [[140, 170], [150, 180], [130, 160]],
};

function getHueRanges(pathname: string): [number, number][] {
  const routes = Object.keys(TAB_HUE_RANGES).sort((a, b) => b.length - a.length);
  for (const route of routes) {
    if (route === '/') {
      if (pathname === '/') return TAB_HUE_RANGES[route];
    } else if (pathname.startsWith(route)) {
      return TAB_HUE_RANGES[route];
    }
  }
  return TAB_HUE_RANGES['/'];
}

function pickHue(ranges: [number, number][]): number {
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return range[0] + Math.random() * (range[1] - range[0]);
}

function isDarkMode(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.classList.contains('dark') ||
         (!document.documentElement.classList.contains('light') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
}

const THEME_HUE_RANGES: Record<string, [number, number][]> = {
  nebula: [[190, 210], [260, 280], [170, 190]],
  ember: [[0, 20], [25, 45], [340, 360]],
  "clinical-white": [[200, 220], [160, 180], [250, 270]],
  "surgical-green": [[140, 160], [120, 140], [160, 180]],
  "warm-parchment": [[30, 55], [20, 45], [40, 60]],
  "lavender-mist": [[260, 280], [240, 260], [270, 290]],
};

function getThemeHueRanges(): [number, number][] {
  const themeId = document.documentElement.getAttribute("data-theme-id") || "nebula";
  return THEME_HUE_RANGES[themeId] || THEME_HUE_RANGES.nebula;
}

export default function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const location = useLocation();
  const hueRangesRef = useRef(getHueRanges(location.pathname));

  useEffect(() => {
    hueRangesRef.current = getHueRanges(location.pathname);
    const ranges = hueRangesRef.current;
    for (const star of starsRef.current) {
      star.hue = pickHue(ranges);
      star.saturation = 60 + Math.random() * 30;
    }
  }, [location.pathname]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme-id") {
          const ranges = getThemeHueRanges();
          hueRangesRef.current = ranges;
          for (const star of starsRef.current) {
            star.hue = pickHue(ranges);
            star.saturation = 60 + Math.random() * 30;
          }
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const STAR_COUNT = 600;
    const NEBULA_COUNT = 8;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initStars(w, h);
      initNebulae(w, h);
    };

    const initStars = (w: number, h: number) => {
      const stars: Star[] = [];
      const ranges = hueRangesRef.current;
      for (let i = 0; i < STAR_COUNT; i++) {
        const layer = Math.random() < 0.35 ? 0 : Math.random() < 0.7 ? 1 : 2;
        const x = Math.random() * w;
        const y = Math.random() * h;
        const driftAngle = Math.random() * Math.PI * 2;
        const driftSpeed = layer === 0 ? 0.02 + Math.random() * 0.04 : layer === 1 ? 0.04 + Math.random() * 0.08 : 0.06 + Math.random() * 0.12;
        stars.push({
          baseX: x, baseY: y,
          size: layer === 0 ? 0.5 + Math.random() * 0.9 : layer === 1 ? 0.7 + Math.random() * 1.5 : 1.0 + Math.random() * 2.2,
          brightness: 0.5 + Math.random() * 0.5,
          twinkleSpeed: 0.3 + Math.random() * 1.8,
          twinkleOffset: Math.random() * Math.PI * 2,
          hue: pickHue(ranges),
          saturation: 60 + Math.random() * 30,
          layer,
          driftX: Math.cos(driftAngle) * driftSpeed,
          driftY: Math.sin(driftAngle) * driftSpeed - 0.03,
          flowSpeed: 0.04 + Math.random() * 0.12,
          flowRadius: layer === 0 ? 4 + Math.random() * 10 : layer === 1 ? 12 + Math.random() * 25 : 25 + Math.random() * 45,
          flowPhase: Math.random() * Math.PI * 2,
        });
      }
      starsRef.current = stars;
    };

    const initNebulae = (w: number, h: number) => {
      const nebulae: Nebula[] = [];
      const ranges = hueRangesRef.current;
      for (let i = 0; i < NEBULA_COUNT; i++) {
        const range = ranges[i % ranges.length];
        nebulae.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius: 200 + Math.random() * 400,
          hue: range[0] + Math.random() * (range[1] - range[0]),
          opacity: 0.02 + Math.random() * 0.03,
        });
      }
      nebulaeRef.current = nebulae;
    };

    resize();
    window.addEventListener('resize', resize);

    let shootingStars: { x: number; y: number; vx: number; vy: number; life: number; hue: number }[] = [];

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const dark = isDarkMode();
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Clear canvas fully transparent
      ctx.clearRect(0, 0, w, h);

      // Nebulae — drawn with source-over for both modes
      const nebulae = nebulaeRef.current;
      for (const neb of nebulae) {
        const pulse = 1 + Math.sin(t * 0.15 + neb.hue * 0.01) * 0.12;
        const r = neb.radius * pulse;
        const grad = ctx.createRadialGradient(neb.x, neb.y, 0, neb.x, neb.y, r);
        if (dark) {
          grad.addColorStop(0, `hsla(${neb.hue}, 70%, 50%, ${neb.opacity * 1.2})`);
          grad.addColorStop(0.4, `hsla(${neb.hue}, 60%, 30%, ${neb.opacity * 0.5})`);
          grad.addColorStop(1, 'rgba(5,5,5,0)');
        } else {
          // Light mode: visible colored nebulae
          grad.addColorStop(0, `hsla(${neb.hue}, 50%, 55%, ${neb.opacity * 2.0})`);
          grad.addColorStop(0.4, `hsla(${neb.hue}, 40%, 70%, ${neb.opacity * 1.0})`);
          grad.addColorStop(1, 'rgba(248,250,252,0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(neb.x - r, neb.y - r, r * 2, r * 2);
      }

      // Stars
      const stars = starsRef.current;

      for (const star of stars) {
        star.baseX += star.driftX;
        star.baseY += star.driftY;

        if (star.baseX < -30) star.baseX += w + 60;
        if (star.baseX > w + 30) star.baseX -= w + 60;
        if (star.baseY < -30) star.baseY += h + 60;
        if (star.baseY > h + 30) star.baseY -= h + 60;

        const flowT = t * star.flowSpeed + star.flowPhase;
        const flowX = Math.sin(flowT) * star.flowRadius * 0.5 + Math.sin(flowT * 0.6 + 1.5) * star.flowRadius * 0.3;
        const flowY = Math.cos(flowT * 0.7) * star.flowRadius * 0.4 + Math.cos(flowT * 0.5 + 2.5) * star.flowRadius * 0.35;

        const sx = star.baseX + flowX;
        const sy = star.baseY + flowY;

        const twinkle = 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.twinkleOffset);
        const alpha = star.brightness * twinkle;

        if (dark) {
          // Dark mode: use lighter composite for glowing effect
          ctx.globalCompositeOperation = 'lighter';

          // Glow
          const glowSize = star.size * (star.layer === 2 ? 4.0 : star.layer === 1 ? 2.5 : 1.5);
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowSize);
          glow.addColorStop(0, `hsla(${star.hue}, ${star.saturation}%, 75%, ${alpha * 0.4})`);
          glow.addColorStop(1, 'rgba(5,5,5,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(sx - glowSize, sy - glowSize, glowSize * 2, glowSize * 2);

          // Core
          ctx.beginPath();
          ctx.arc(sx, sy, star.size * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${star.hue}, ${star.saturation}%, 85%, ${alpha * 0.9})`;
          ctx.fill();
        } else {
          // Light mode: use source-over with solid, opaque dark stars
          ctx.globalCompositeOperation = 'source-over';

          // Soft glow — uses the star color at low opacity
          const glowSize = star.size * (star.layer === 2 ? 3.5 : star.layer === 1 ? 2.2 : 1.3);
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowSize);
          glow.addColorStop(0, `hsla(${star.hue}, ${star.saturation}%, 40%, ${alpha * 0.25})`);
          glow.addColorStop(1, 'rgba(248,250,252,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(sx - glowSize, sy - glowSize, glowSize * 2, glowSize * 2);

          // Core — solid dark color, highly visible
          ctx.beginPath();
          ctx.arc(sx, sy, star.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${star.hue}, ${star.saturation}%, 30%, ${alpha * 0.85})`;
          ctx.fill();
        }

        // Cross-spike for bright near stars
        if (star.size > 1.2 && twinkle > 0.8 && star.layer >= 1) {
          const sl = star.size * 2.0 * twinkle;
          ctx.beginPath();
          ctx.moveTo(sx - sl, sy); ctx.lineTo(sx + sl, sy);
          ctx.moveTo(sx, sy - sl); ctx.lineTo(sx, sy + sl);
          const spikeColor = dark
            ? `hsla(${star.hue}, ${star.saturation}%, 90%, ${alpha * 0.4})`
            : `hsla(${star.hue}, ${star.saturation}%, 20%, ${alpha * 0.5})`;
          ctx.strokeStyle = spikeColor;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }
      }

      // Reset composite
      ctx.globalCompositeOperation = 'source-over';

      // Shooting stars
      if (Math.random() < 0.0007) {
        const ranges = hueRangesRef.current;
        const range = ranges[Math.floor(Math.random() * ranges.length)];
        shootingStars.push({
          x: Math.random() * w, y: Math.random() * h * 0.35,
          vx: 5 + Math.random() * 7, vy: 2 + Math.random() * 3,
          life: 1, hue: range[0] + Math.random() * (range[1] - range[0]),
        });
      }

      shootingStars = shootingStars.filter(s => s.life > 0);
      for (const ss of shootingStars) {
        ss.x += ss.vx; ss.y += ss.vy; ss.life -= 0.012;
        const tl = 70;
        const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - tl, ss.y - tl * 0.5);
        if (dark) {
          grad.addColorStop(0, `hsla(${ss.hue}, 70%, 85%, ${ss.life * 0.7})`);
          grad.addColorStop(0.3, `hsla(${ss.hue}, 60%, 65%, ${ss.life * 0.3})`);
        } else {
          grad.addColorStop(0, `hsla(${ss.hue}, 60%, 45%, ${ss.life * 0.6})`);
          grad.addColorStop(0.3, `hsla(${ss.hue}, 50%, 55%, ${ss.life * 0.2})`);
        }
        grad.addColorStop(1, dark ? 'rgba(5,5,5,0)' : 'rgba(248,250,252,0)');
        ctx.beginPath(); ctx.moveTo(ss.x, ss.y); ctx.lineTo(ss.x - tl, ss.y - tl * 0.5);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.0; ctx.stroke();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [location.pathname]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
