import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const TAB_COLORS: Record<string, string> = {
  '/': '#22C55E',
  '/library': '#3B82F6',
  '/history': '#F59E0B',
  '/planner': '#8B5CF6',
  '/generate': '#10B981',
};

function getActiveColor(pathname: string): string {
  const routes = Object.keys(TAB_COLORS).sort((a, b) => b.length - a.length);
  for (const route of routes) {
    if (route === '/') {
      if (pathname === '/') return TAB_COLORS[route];
    } else if (pathname.startsWith(route)) {
      return TAB_COLORS[route];
    }
  }
  return '#22C55E';
}

interface TrailParticle {
  x: number;
  y: number;
  age: number;
  vx: number;
  vy: number;
}

export default function ParticleMouse() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<TrailParticle[]>([]);
  const mouseRef = useRef({ x: -100, y: -100 });
  const animRef = useRef<number>(0);
  const location = useLocation();
  const colorRef = useRef(getActiveColor(location.pathname));

  useEffect(() => {
    colorRef.current = getActiveColor(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      for (let i = 0; i < 2; i++) {
        trailRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 6,
          y: e.clientY + (Math.random() - 0.5) * 6,
          age: 0,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
        });
      }
      if (trailRef.current.length > 12) {
        trailRef.current = trailRef.current.slice(-12);
      }
    };

    const handleClick = (e: MouseEvent) => {
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        const speed = 1.5 + Math.random() * 2;
        trailRef.current.push({
          x: e.clientX,
          y: e.clientY,
          age: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const color = colorRef.current;
      const particles = trailRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += 0.016;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;

        const life = 1 - p.age / 1.5;
        if (life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        const size = 2.5 * life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.round(life * 80).toString(16).padStart(2, '0');
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
}
