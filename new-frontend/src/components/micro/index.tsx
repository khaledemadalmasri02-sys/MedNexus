import { type ReactNode, type ButtonHTMLAttributes, useRef, useState, useEffect, useMemo, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function generateBurstParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    angle: (i / count) * Math.PI * 2,
    distance: 40 + Math.random() * 30,
  }));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  rippleColor?: string;
}

export function RippleButton({ children, className = '', rippleColor, ...props }: RippleButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const btnRef = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const idRef = useRef(0);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!reduced && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = idRef.current++;
      setRipples(prev => [...prev, { id, x, y }]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    }
    props.onClick?.(e);
  };

  return (
    <button
      ref={btnRef}
      {...props}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            background: rippleColor || 'rgba(255,255,255,0.2)',
          }}
          initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.5 }}
          animate={{
            width: 300,
            height: 300,
            x: -150,
            y: -150,
            opacity: 0,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

interface MagneticHoverProps {
  children: ReactNode;
  className?: string;
  strength?: number;
}

export function MagneticHover({ children, className = '', strength = 8 }: MagneticHoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = Math.max(-strength, Math.min(strength, (e.clientX - centerX) * 0.15));
    const deltaY = Math.max(-strength, Math.min(strength, (e.clientY - centerY) * 0.15));
    ref.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  };

  const handleMouseLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0px, 0px)';
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={reduced ? undefined : { type: 'spring', stiffness: 150, damping: 15 }}
    >
      {children}
    </motion.div>
  );
}

interface GlowOnHoverProps {
  children: ReactNode;
  className?: string;
  color?: string;
  radius?: number;
}

export function GlowOnHover({ children, className = '', color = 'rgba(6,182,212,0.15)', radius = 200 }: GlowOnHoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ref.current.style.background = `radial-gradient(${radius}px circle at ${x}px ${y}px, ${color}, transparent)`;
  };

  const handleMouseLeave = () => {
    if (ref.current) ref.current.style.background = 'transparent';
  };

  return (
    <div ref={ref} className={`relative ${className}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      {children}
    </div>
  );
}

interface ToggleAnimationProps {
  isDark: boolean;
  className?: string;
}

export function ToggleAnimation({ isDark, className = '' }: ToggleAnimationProps) {
  return (
    <AnimatePresence mode="wait">
      {isDark ? (
        <motion.svg key="sun" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </motion.svg>
      ) : (
        <motion.svg key="moon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </motion.svg>
      )}
    </AnimatePresence>
  );
}

interface SuccessFeedbackProps {
  show: boolean;
  type?: 'success' | 'error';
  message?: string;
  onDismiss?: () => void;
}

export function SuccessFeedback({ show, type = 'success', message, onDismiss }: SuccessFeedbackProps) {
  const reduced = usePrefersReducedMotion();

  if (!show) return null;

  const isSuccess = type === 'success';
  const color = isSuccess ? 'var(--accent-emerald)' : 'var(--accent-rose)';
  const bg = isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)';
  const border = isSuccess ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)';

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{
        background: 'var(--bg-glass-strong)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${color}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.2), 0 0 20px ${bg}`,
      }}
      onClick={onDismiss}
    >
      <motion.div
        initial={reduced ? {} : { scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
      >
        {isSuccess ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M20 6L9 17l-5-5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.2 }} />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path d="M18 6L6 18M6 6l12 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.2 }} />
          </svg>
        )}
      </motion.div>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{message || (isSuccess ? 'Success!' : 'Something went wrong')}</span>
    </motion.div>
  );
}

export function OrbitingDots({ className = '', color = 'var(--accent-green)' }: { className?: string; color?: string }) {
  return (
    <div className={`relative w-6 h-6 ${className}`}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            background: color,
            top: '50%',
            left: '50%',
            marginTop: -3,
            marginLeft: -3,
          }}
          animate={{
            x: [0, Math.cos((i * 2 * Math.PI) / 3) * 12, 0],
            y: [0, Math.sin((i * 2 * Math.PI) / 3) * 12, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.2,
            delay: i * 0.15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export function BrandedLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <motion.div
        className="relative"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="absolute -inset-4 rounded-2xl blur-xl animate-gradient-shift" style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue), var(--accent-green))', opacity: 0.3 }} />
        <div className="relative h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
      </motion.div>
      <motion.span
        className="text-sm font-display font-semibold tracking-wider"
        style={{ color: 'var(--text-secondary)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Loading...
      </motion.span>
    </div>
  );
}

interface ConfettiBurstProps {
  count?: number;
  colors?: string[];
  duration?: number;
}

export function ConfettiBurst({ count = 12, colors = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'], duration = 0.3 }: ConfettiBurstProps) {
  const reduced = usePrefersReducedMotion();
  const particles = useMemo(() => generateBurstParticles(count), [count]);
  if (reduced) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {particles.map((p, i) => {
        const angle = p.angle;
        const distance = p.distance;
        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: colors[i % colors.length],
              left: '50%',
              top: '50%',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
