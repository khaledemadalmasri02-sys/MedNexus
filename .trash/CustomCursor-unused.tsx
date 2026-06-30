import { useEffect, useRef, useCallback, useState } from 'react';
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

function isDark(): boolean {
  if (typeof document === 'undefined') return true;
  return document.documentElement.classList.contains('dark') ||
         (!document.documentElement.classList.contains('light') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [clicking, setClicking] = useState(false);
  const location = useLocation();
  const color = getActiveColor(location.pathname);

  const onMove = useCallback((e: MouseEvent) => {
    const d = dotRef.current;
    const r = ringRef.current;
    if (!d || !r) return;
    d.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    r.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  }, []);

  const onDown = useCallback(() => setClicking(true), []);
  const onUp = useCallback(() => setClicking(false), []);
  const onOver = useCallback((e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName === 'A' || t.tagName === 'BUTTON' || t.closest('a') || t.closest('button') || t.dataset.hover === 'true') {
      setHovering(true);
    }
  }, []);
  const onOut = useCallback((e: MouseEvent) => {
    const r = e.relatedTarget as HTMLElement;
    if (!r || (r.tagName !== 'A' && r.tagName !== 'BUTTON' && !r.closest('a') && !r.closest('button') && r.dataset.hover !== 'true')) {
      setHovering(false);
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, [onMove, onDown, onUp, onOver, onOut]);

  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return null;

  const dark = isDark();
  const dotSize = clicking ? 6 : 4;
  const ringSize = hovering ? 40 : 28;
  const ringOpacity = hovering ? 0.5 : 0.25;

  return (
    <>
      {/* Center dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: dotSize,
          height: dotSize,
          marginTop: -dotSize / 2,
          marginLeft: -dotSize / 2,
          zIndex: 10000,
          willChange: 'transform',
          mixBlendMode: dark ? 'screen' : 'multiply',
        }}
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}60, 0 0 2px ${color}`,
            transition: 'width 0.15s, height 0.15s',
          }}
        />
      </div>

      {/* Outer ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: ringSize,
          height: ringSize,
          marginTop: -ringSize / 2,
          marginLeft: -ringSize / 2,
          zIndex: 9999,
          willChange: 'transform, width, height, opacity',
          transition: 'width 0.2s ease-out, height 0.2s ease-out, opacity 0.2s ease-out',
        }}
      >
        <svg width={ringSize} height={ringSize} viewBox="0 0 40 40" fill="none">
          <circle
            cx="20" cy="20" r="17"
            fill="none"
            stroke={color}
            strokeWidth="1.2"
            strokeOpacity={ringOpacity}
          />
          {hovering && (
            <circle
              cx="20" cy="20" r="17"
              fill={color}
              fillOpacity={0.06}
            />
          )}
        </svg>
      </div>
    </>
  );
}
