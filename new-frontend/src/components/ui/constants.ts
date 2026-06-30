import type { Transition, Variants } from "framer-motion";

export const DURATION = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.35,
  slow: 0.5,
  glacial: 0.8,
} as const;

export const EASING = {
  default: [0.22, 1, 0.36, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const,
  bounce: [0.34, 1.56, 0.64, 1] as const,
  linear: [0, 0, 1, 1] as const,
} as const;

export const SPRING = {
  gentle: { type: "spring" as const, stiffness: 200, damping: 25 },
  snappy: { type: "spring" as const, stiffness: 380, damping: 32 },
  bouncy: { type: "spring" as const, stiffness: 500, damping: 20 },
} as const;

export const STAGGER = {
  fast: 0.04,
  normal: 0.08,
  slow: 0.12,
} as const;

export const springTransition: Transition = SPRING.snappy;
export const smoothTransition: Transition = { duration: DURATION.slow, ease: EASING.default as [number, number, number, number] };
export const fastTransition: Transition = { duration: DURATION.fast, ease: EASING.default as [number, number, number, number] };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};
export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: smoothTransition },
};
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: smoothTransition },
};
export const scaleReveal: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: smoothTransition },
};
export const blurReveal: Variants = {
  hidden: { opacity: 0, filter: "blur(12px)" },
  visible: { opacity: 1, filter: "blur(0px)", transition: { duration: DURATION.slow, ease: EASING.default as [number, number, number, number] } },
};
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER.normal, delayChildren: 0.1 } },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
  exit: { opacity: 0, x: -100, transition: { duration: DURATION.fast, ease: EASING.default as [number, number, number, number] } },
};

export const cardHover = {
  rest: { y: 0, transition: SPRING.gentle },
  hover: { y: -3, transition: SPRING.gentle },
};

export const deleteConfirm: Variants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: "auto", transition: { duration: DURATION.fast, ease: EASING.default as [number, number, number, number] } },
  exit: { opacity: 0, height: 0, transition: { duration: DURATION.instant } },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
  exit: { opacity: 0, y: -12, transition: fastTransition },
};

export const backdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

export const modal: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: smoothTransition },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: fastTransition },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, x: -60, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

export const focusTransition: Variants = {
  hidden: { opacity: 0, scale: 0.92, filter: 'blur(8px)' },
  visible: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, scale: 1.05, filter: 'blur(8px)', transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

export const heroZoom: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, scale: 1.1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

export function getAnimationDuration(baseDuration: number, speedMultiplier: number = 1): number {
  if (speedMultiplier <= 0) return 0.01;
  return baseDuration / speedMultiplier;
}
