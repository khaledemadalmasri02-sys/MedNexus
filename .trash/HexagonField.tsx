import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

interface Hexagon {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  opacity: number;
  color: string;
}

const TAB_PALETTES: Record<string, string[]> = {
  '/': [
    'rgba(34, 197, 94, 0.18)', 'rgba(34, 197, 94, 0.1)',
    'rgba(16, 185, 129, 0.15)', 'rgba(20, 184, 166, 0.12)',
    'rgba(74, 222, 128, 0.09)', 'rgba(22, 163, 74, 0.14)',
  ],
  '/library': [
    'rgba(59, 130, 246, 0.18)', 'rgba(59, 130, 246, 0.1)',
    'rgba(99, 102, 241, 0.15)', 'rgba(129, 140, 248, 0.12)',
    'rgba(37, 99, 235, 0.14)', 'rgba(165, 180, 252, 0.09)',
  ],
  '/history': [
    'rgba(245, 158, 11, 0.18)', 'rgba(245, 158, 11, 0.1)',
    'rgba(249, 115, 22, 0.15)', 'rgba(251, 191, 36, 0.12)',
    'rgba(217, 119, 6, 0.14)', 'rgba(253, 224, 71, 0.09)',
  ],
  '/planner': [
    'rgba(139, 92, 246, 0.18)', 'rgba(139, 92, 246, 0.1)',
    'rgba(167, 139, 250, 0.15)', 'rgba(196, 181, 253, 0.12)',
    'rgba(124, 58, 237, 0.14)', 'rgba(168, 85, 247, 0.09)',
  ],
  '/generate': [
    'rgba(16, 185, 129, 0.18)', 'rgba(16, 185, 129, 0.1)',
    'rgba(34, 197, 94, 0.15)', 'rgba(52, 211, 153, 0.12)',
    'rgba(5, 150, 105, 0.14)', 'rgba(110, 231, 183, 0.09)',
  ],
};

function getPalette(pathname: string): string[] {
  const routes = Object.keys(TAB_PALETTES).sort((a, b) => b.length - a.length);
  for (const route of routes) {
    if (route === '/') {
      if (pathname === '/') return TAB_PALETTES[route];
    } else if (pathname.startsWith(route)) {
      return TAB_PALETTES[route];
    }
  }
  return TAB_PALETTES['/'];
}

function makeHex(id: number, _palette: string[]): Hexagon {
  const color = _palette[Math.floor(Math.random() * _palette.length)];
  return {
    id,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 55 + Math.random() * 50,
    rotation: Math.random() * 360,
    delay: Math.random() * 8,
    duration: 10 + Math.random() * 8,
    opacity: 0.25 + Math.random() * 0.35,
    color,
  };
}

/* ─── Single 3D Hexagonal Prism ─── */
function Hex3D({ hex }: { hex: Hexagon }) {
  const s = hex.size;
  const depth = 10;
  const cosX = Math.cos(Math.PI / 6);
  const sinX = Math.sin(Math.PI / 6);
  const cosY = Math.cos(Math.PI / 9);
  const sinY = Math.sin(Math.PI / 9);

  function project(x: number, y: number, z: number): [number, number] {
    const cx = x - 50, cy2 = y - 50;
    const y1 = cy2 * cosX - z * sinX;
    const z1 = cy2 * sinX + z * cosX;
    const x2 = cx * cosY + z1 * sinY;
    return [50 + x2, 50 + y1];
  }

  const hexPts2D: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    hexPts2D.push([50 + 38 * Math.cos(a), 50 + 38 * Math.sin(a)]);
  }

  const topPts = hexPts2D.map(([x, y]) => project(x, y, -depth / 2));
  const botPts = hexPts2D.map(([x, y]) => project(x, y, depth / 2));

  const sides: [number, number][][] = [];
  for (let i = 0; i < 6; i++) {
    const next = (i + 1) % 6;
    sides.push([topPts[i], topPts[next], botPts[next], botPts[i]]);
  }

  function sideBrightness(idx: number): number {
    const angle = (Math.PI / 3) * idx - Math.PI / 6;
    return 0.12 + Math.cos(angle + Math.PI * 0.75) * 0.22;
  }

  const rgbMatch = hex.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  const r = rgbMatch ? parseInt(rgbMatch[1]) : 34;
  const g = rgbMatch ? parseInt(rgbMatch[2]) : 197;
  const b = rgbMatch ? parseInt(rgbMatch[3]) : 94;

  const shadowPts: [number, number][] = [];
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI / 6) * i;
    shadowPts.push(project(50 + 36 * Math.cos(a), 50 + 36 * Math.sin(a), depth / 2 + 6));
  }

  return (
    <svg viewBox="0 0 100 100" width={s} height={s} fill="none">
      <defs>
        <filter id={`g3d-${hex.id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor={`rgb(${r},${g},${b})`} floodOpacity="0.2" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`tg3d-${hex.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={`rgba(${r},${g},${b},0.35)`} />
          <stop offset="100%" stopColor={`rgba(${r},${g},${b},0.1)`} />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <polygon points={shadowPts.map(p => p.join(',')).join(' ')}
        fill={`rgba(${r},${g},${b},0.12)`} opacity="0.5" />

      {/* Side faces */}
      {sides.map((side, i) => (
        <polygon key={`s${i}`}
          points={side.map(p => p.join(',')).join(' ')}
          fill={`rgba(${r},${g},${b},${sideBrightness(i)})`}
          stroke={`rgba(${r},${g},${b},${Math.min(sideBrightness(i) + 0.15, 0.55)})`}
          strokeWidth="0.4" />
      ))}

      {/* Bottom face */}
      <polygon points={botPts.map(p => p.join(',')).join(' ')}
        fill={`rgba(${r},${g},${b},0.06)`} stroke={`rgba(${r},${g},${b},0.12)`} strokeWidth="0.3" />

      {/* Top face */}
      <polygon points={topPts.map(p => p.join(',')).join(' ')}
        fill={`url(#tg3d-${hex.id})`}
        stroke={`rgba(${r},${g},${b},0.45)`} strokeWidth="0.7"
        filter={`url(#g3d-${hex.id})`} />

      {/* Top edge highlight */}
      <line x1={topPts[0][0]} y1={topPts[0][1]} x2={topPts[1][0]} y2={topPts[1][1]}
        stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round" />
      <line x1={topPts[1][0]} y1={topPts[1][1]} x2={topPts[2][0]} y2={topPts[2][1]}
        stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" strokeLinecap="round" />

      {/* Sparkle */}
      <circle cx={topPts[1][0]} cy={topPts[1][1]} r="1.2" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

/* ─── Animated Hexagon using CSS keyframes ─── */
function HexagonShape({ hex }: { hex: Hexagon }) {
  const rgbMatch = hex.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  const r = rgbMatch ? parseInt(rgbMatch[1]) : 34;
  const g = rgbMatch ? parseInt(rgbMatch[2]) : 197;
  const b = rgbMatch ? parseInt(rgbMatch[3]) : 94;

  const animName = `hex-float-${hex.id}`;
  const glowColor = `rgba(${r},${g},${b},0.2)`;
  const shadowColor = `rgba(${r},${g},${b},0.25)`;

  return (
    <>
      {/* Inject keyframe animation per hexagon */}
      <style>{`
        @keyframes ${animName} {
          0%   { opacity: 0; transform: scale(0.3) rotate(${hex.rotation}deg) translateY(0px); }
          15%  { opacity: ${hex.opacity}; transform: scale(1) rotate(${hex.rotation + 5}deg) translateY(-3px); }
          50%  { opacity: ${hex.opacity * 0.7}; transform: scale(1.02) rotate(${hex.rotation - 3}deg) translateY(2px); }
          85%  { opacity: ${hex.opacity * 0.3}; transform: scale(0.95) rotate(${hex.rotation + 8}deg) translateY(-5px); }
          100% { opacity: 0; transform: scale(0.5) rotate(${hex.rotation + 12}deg) translateY(-8px); }
        }
      `}</style>
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${hex.x}%`,
          top: `${hex.y}%`,
          width: hex.size,
          height: hex.size,
          marginLeft: -hex.size / 2,
          marginTop: -hex.size / 2,
          animation: `${animName} ${hex.duration}s ${hex.delay}s ease-in-out infinite`,
          filter: `drop-shadow(0 3px 12px ${shadowColor}) drop-shadow(0 0 8px ${glowColor})`,
          willChange: 'transform, opacity',
        }}
      >
        <Hex3D hex={hex} />
      </div>
    </>
  );
}

export default function HexagonField() {
  const location = useLocation();
  const palette = getPalette(location.pathname);

  const hexagons = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => makeHex(i, palette));
  }, [palette]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {hexagons.map((hex) => (
        <HexagonShape key={hex.id} hex={hex} />
      ))}
    </div>
  );
}
