import { type ReactNode, type ButtonHTMLAttributes, useRef, useState, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { springTransition, smoothTransition } from "./constants";

export type { Transition, Variants } from "framer-motion";
export {
  DURATION, EASING, SPRING, STAGGER,
  springTransition, smoothTransition, fastTransition,
  fadeInUp, fadeInDown, fadeInLeft, fadeInRight,
  scaleReveal, blurReveal, staggerContainer,
  listItem, cardHover, deleteConfirm, pageTransition,
  backdrop, modal,
} from "./constants";

/* ═══════════════════════════════════════════════════════════
   GLASS CARD
   ═══════════════════════════════════════════════════════════ */

type GlassCardVariant = 'default' | 'elevated' | 'flat' | 'hero';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  variant?: GlassCardVariant;
  selected?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<GlassCardVariant, object> = {
  default: {
    background: 'var(--glass-card-bg)',
    border: '1px solid var(--glass-border)',
    boxShadow: 'none',
  },
  elevated: {
    background: 'var(--glass-card-bg-strong)',
    border: '1px solid var(--glass-border-light)',
    boxShadow: '0 8px 32px -8px rgba(0,0,0,0.3), 0 2px 8px -2px rgba(0,0,0,0.2)',
  },
  flat: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    boxShadow: 'none',
  },
  hero: {
    background: 'var(--glass-card-bg-strong)',
    border: '1px solid var(--glass-border-light)',
    boxShadow: '0 12px 40px -8px rgba(0,0,0,0.25), 0 4px 16px -4px rgba(0,0,0,0.15)',
  },
};

export function GlassCard({ children, className = '', hover = true, glow = false, variant = 'default', selected = false, onClick }: GlassCardProps) {
  const vStyle = variantStyles[variant];

  return (
    <motion.div
      className={`rounded-2xl relative overflow-hidden ${hover ? 'card-hover' : ''} ${glow ? 'glow-border' : ''} ${selected ? 'glass-card-selected' : ''} ${className}`}
      style={{
        ...vStyle,
        backdropFilter: variant === 'flat' ? 'none' : 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: variant === 'flat' ? 'none' : 'blur(20px) saturate(1.3)',
        border: selected ? '1px solid rgba(6, 182, 212, 0.4)' : (vStyle as { border: string }).border,
        boxShadow: selected
          ? '0 0 20px rgba(6, 182, 212, 0.15), 0 8px 32px -8px rgba(0,0,0,0.3)'
          : (vStyle as { boxShadow: string }).boxShadow,
      }}
      onClick={onClick}
      whileHover={hover ? { y: -4, transition: { type: 'spring', stiffness: 200, damping: 20 } } : undefined}
      data-hover="true"
    >
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.08)' }} />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {selected && (
        <motion.div
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ background: 'var(--accent-cyan)', boxShadow: '0 0 8px var(--accent-cyan)' }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        />
      )}
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED TABS
   ═══════════════════════════════════════════════════════════ */

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface AnimatedTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function AnimatedTabs({ tabs, activeTab, onChange, className = '' }: AnimatedTabsProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 rounded-2xl relative ${className}`}
      style={{
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="relative z-10 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200"
            style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab-pill"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.1))',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.1)',
                }}
                transition={springTransition}
              />
            )}
            {tab.icon && <span className="relative">{tab.icon}</span>}
            <span className="relative">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className="relative text-xs px-1.5 py-0.5 rounded-md"
                style={{
                  background: isActive ? 'rgba(6, 182, 212, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                  color: isActive ? 'var(--accent-green)' : 'var(--text-muted)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GRADIENT ORB (Background decoration)
   ═══════════════════════════════════════════════════════════ */

interface GradientOrbProps {
  color?: 'cyan' | 'purple' | 'emerald' | 'blue' | 'rose';
  size?: number;
  className?: string;
  delay?: number;
}

const orbColors = {
  cyan: 'rgba(6, 182, 212, 0.12)',
  purple: 'rgba(139, 92, 246, 0.1)',
  emerald: 'rgba(16, 185, 129, 0.08)',
  blue: 'rgba(59, 130, 246, 0.1)',
  rose: 'rgba(244, 63, 94, 0.08)',
};

export function GradientOrb({ color = 'cyan', size = 400, className = '', delay = 0 }: GradientOrbProps) {
  return (
    <motion.div
      className={`rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${orbColors[color]} 0%, transparent 70%)`,
        filter: 'blur(60px)',
      }}
      animate={{
        x: [0, 30, -10, -30, 0],
        y: [0, -20, 20, -10, 0],
        scale: [1, 1.05, 0.95, 1.02, 1],
      }}
      transition={{
        duration: 12,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════════════════════ */

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', variant = 'text', width, height }: SkeletonProps) {
  const baseStyle = {
    width: width || (variant === 'circular' ? 40 : variant === 'text' ? '100%' : 200),
    height: height || (variant === 'circular' ? 40 : variant === 'text' ? 16 : 100),
  };

  return (
    <div
      className={`rounded-lg animate-shimmer ${className}`}
      style={{
        ...baseStyle,
        borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? '4px' : '12px',
        background: 'linear-gradient(90deg, var(--border-subtle) 0%, var(--border-default) 50%, var(--border-subtle) 100%)',
        backgroundSize: '200% auto',
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={10} />
        </div>
      </div>
      <Skeleton width="100%" height={8} />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Skeleton width="50%" height={24} />
      <Skeleton width="70%" height={12} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAGNETIC BUTTON
   ═══════════════════════════════════════════════════════════ */

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function MagneticButton({ children, className = '', variant = 'primary', size = 'md', ...props }: MagneticButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * 0.2;
    const deltaY = (e.clientY - centerY) * 0.2;
    setOffset({ x: deltaX, y: deltaY });
  };

  const handleMouseLeave = () => setOffset({ x: 0, y: 0 });

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))',
      boxShadow: '0 4px 20px rgba(6, 182, 212, 0.25)',
      color: 'white',
      border: 'none',
    },
    secondary: {
      background: 'var(--bg-elevated)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-default)',
      color: 'var(--text-primary)',
    },
    ghost: {
      background: 'transparent',
      border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)',
    },
  };

  return (
    <motion.div
      ref={btnRef as unknown as React.Ref<HTMLDivElement>}
      className={`relative rounded-xl font-semibold flex items-center justify-center gap-2 overflow-hidden ${sizeClasses[size]} ${className}`}
      style={{
        ...variantStyles[variant],
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        cursor: 'pointer',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      data-hover="true"
      {...props as unknown as Record<string, unknown>}
    >
      <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity shine-effect" />
      <span className="relative flex items-center gap-2">{children}</span>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE TRANSITION WRAPPER
   ═══════════════════════════════════════════════════════════ */

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STAGGER CHILD
   ═══════════════════════════════════════════════════════════ */

interface StaggerChildProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerChild({ children, className = '', delay = 0 }: StaggerChildProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...smoothTransition, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FLOATING WIDGET
   ═══════════════════════════════════════════════════════════ */

interface FloatingWidgetProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}

export function FloatingWidget({ children, className = '', delay = 0, style: styleProp }: FloatingWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...smoothTransition, delay }}
      className={`rounded-2xl relative overflow-hidden ${className}`}
      style={{
        background: 'var(--glass-card-bg)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.15), inset 0 1px 0 0 var(--glass-highlight)',
        ...styleProp,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════ */

interface AnimatedCounterProps {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({ value, className = '', prefix = '', suffix = '' }: AnimatedCounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {prefix}{value.toLocaleString()}{suffix}
    </motion.span>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS RING
   ═══════════════════════════════════════════════════════════ */

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
}

export function ProgressRing({ progress, size = 120, strokeWidth = 8, color = 'var(--accent-green)', className = '' }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] as const }}
          style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold font-display" style={{ color }}>
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GLOWING INPUT
   ═══════════════════════════════════════════════════════════ */

interface GlowingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
}

export function GlowingInput({ label, icon, className = '', style, ...props }: GlowingInputProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        <input
          className="w-full rounded-xl text-sm outline-none transition-all duration-300 focus-ring"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            paddingLeft: icon ? '2.75rem' : '1rem',
            paddingRight: '1rem',
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--border-active)';
            e.target.style.boxShadow = '0 0 0 3px var(--glow-cyan), 0 0 20px var(--glow-cyan)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-default)';
            e.target.style.boxShadow = 'none';
          }}
          {...props}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   GLOWING TEXTAREA
   ═══════════════════════════════════════════════════════════ */

interface GlowingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function GlowingTextarea({ label, className = '', style, ...props }: GlowingTextareaProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary">{label}</label>
      )}
      <textarea
        className="w-full rounded-xl text-sm outline-none transition-all duration-300 resize-none focus-ring"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
          padding: '1rem',
          ...style,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--border-active)';
          e.target.style.boxShadow = '0 0 0 3px var(--glow-cyan), 0 0 20px var(--glow-cyan)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-default)';
          e.target.style.boxShadow = 'none';
        }}
        {...props}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOOLTIP
   ═══════════════════════════════════════════════════════════ */

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div
        className={`absolute z-50 px-3 py-1.5 rounded-lg text-xs font-medium pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 ${
          position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' :
          position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' :
          position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' :
          'left-full top-1/2 -translate-y-1/2 ml-2'
        }`}
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
        }}
      >
        {content}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════════ */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto overscroll-none"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={smoothTransition}
        className="relative w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          backdropFilter: 'blur(40px)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.2)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-6 pb-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <motion.button
            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
            transition={{ delay: 0.15, duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            whileHover={{ scale: 1.15, rotate: 90, backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.35)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)' }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-xl flex items-center justify-center group"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X className="h-4 w-4 transition-colors duration-200 group-hover:text-[#8B5CF6]" />
          </motion.button>
          {title && (
            <h3 className="font-display text-lg font-semibold text-text-primary mb-4 pr-8">{title}</h3>
          )}
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 pt-4" style={{ scrollbarGutter: 'stable' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
