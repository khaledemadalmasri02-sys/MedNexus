import { type ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

export type TransitionType = 'default' | 'hero-zoom' | 'slide-right' | 'focus' | 'modal';

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

const defaultVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.98 },
};

const slideRightVariants: Variants = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

const focusVariants: Variants = {
  initial: { opacity: 0, scale: 0.92, filter: 'blur(8px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 1.05, filter: 'blur(8px)' },
};

const heroZoomVariants: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.1 },
};

const variantsMap: Record<TransitionType, Variants> = {
  default: defaultVariants,
  'slide-right': slideRightVariants,
  focus: focusVariants,
  'hero-zoom': heroZoomVariants,
  modal: defaultVariants,
};

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  type?: TransitionType;
}

export function PageTransition({ children, className = '', type }: PageTransitionProps) {
  const reduced = usePrefersReducedMotion();
  const effectiveType = type || 'default';
  const variants = variantsMap[effectiveType];

  if (reduced) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={
        effectiveType === 'focus'
          ? { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
          : effectiveType === 'hero-zoom'
          ? { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
          : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerChildren({ children, className = '', staggerDelay = 0.05 }: StaggerChildrenProps) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduced ? 0 : staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] as const } },
      }}
    >
      {children}
    </motion.div>
  );
}

interface ModalTransitionProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function ModalTransition({ isOpen, onClose, children, className = '' }: ModalTransitionProps) {
  const reduced = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            className="absolute inset-0 bg-black/60"
            style={{ backdropFilter: reduced ? 'none' : 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.15 : 0.3 }}
          />
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 300, damping: 25 }
            }
            className={`relative z-10 ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
