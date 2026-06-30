import { motion } from 'framer-motion';
import { Sparkles, Layers, Brain, Flame, Sun, CloudSun, Sunset, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { smoothTransition } from '../ui/constants';
import type { DashboardState } from '../../lib/api';

interface SmartHeroProps {
  state: DashboardState | null;
  loading: boolean;
}

function getTimeOfDay(): { greeting: string; icon: typeof Sun; gradient: string; color: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { greeting: 'Good Morning', icon: Sun, gradient: 'linear-gradient(135deg, var(--accent-amber), var(--accent-danger))', color: 'var(--accent-amber)' };
  if (hour >= 12 && hour < 17) return { greeting: 'Good Afternoon', icon: CloudSun, gradient: 'linear-gradient(135deg, var(--accent-blue), var(--accent-cyan))', color: 'var(--accent-blue)' };
  if (hour >= 17 && hour < 22) return { greeting: 'Good Evening', icon: Sunset, gradient: 'linear-gradient(135deg, var(--accent-purple), var(--accent-danger))', color: 'var(--accent-purple)' };
  return { greeting: 'Burning the Midnight Oil', icon: Moon, gradient: 'var(--gradient-card)', color: 'var(--text-secondary)' };
}

const stateConfig: Record<string, {
  headline: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaTo?: string;
  ctaAction?: string;
  cta1Label?: string;
  cta1To?: string;
  cta2Label?: string;
  cta2To?: string;
  cta2Action?: string;
  particleTint: string;
}> = {
  new: {
    headline: 'Welcome to your learning journey',
    ctaLabel: 'Get Started — Upload Files',
    ctaTo: '/generate',
    particleTint: 'rgba(6, 182, 212, 0.4)',
  },
  caught_up: {
    headline: "You're all caught up",
    subtitle: 'No reviews due today. Take a break or get ahead.',
    cta1Label: 'Browse Library',
    cta1To: '/library',
    cta2Label: 'Generate New Cards',
    cta2To: '/generate',
    particleTint: 'rgba(16, 185, 129, 0.4)',
  },
  reviews_due: {
    headline: 'Cards waiting for review',
    subtitle: 'Based on your spaced repetition schedule.',
    cta1Label: 'Start Review',
    cta1To: '/study',
    cta2Label: 'Snooze 1h',
    cta2Action: 'snooze',
    particleTint: 'rgba(245, 158, 11, 0.4)',
  },
  streak_at_risk: {
    headline: "Don't lose your streak!",
    subtitle: 'Just 10 minutes of review keeps it alive.',
    ctaLabel: 'Quick 10-min Review',
    ctaTo: '/study',
    particleTint: 'rgba(239, 68, 68, 0.4)',
  },
  milestone: {
    headline: 'Milestone reached!',
    subtitle: '',
    ctaLabel: 'Thanks!',
    ctaAction: 'dismiss',
    particleTint: 'rgba(139, 92, 246, 0.5)',
  },
};

const MILESTLE_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'];

function createMilestoneParticles() {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i,
    bg: MILESTLE_COLORS[i % 5],
    left: 50 + (Math.random() - 0.5) * 20,
    top: 50 + (Math.random() - 0.5) * 20,
    endX: (Math.random() - 0.5) * 300,
    endY: (Math.random() - 0.5) * 300,
  }));
}

export default function SmartHero({ state, loading }: SmartHeroProps) {
  const timeOfDay = getTimeOfDay();
  const TimeIcon = timeOfDay.icon;
  const milestoneParticles = createMilestoneParticles();

  if (loading || !state) {
    return (
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 mb-8 overflow-hidden rounded-3xl" style={{ minHeight: 220 }}>
        <div className="absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
        <div className="relative px-6 sm:px-12 lg:px-16 py-12 text-center">
          <div className="w-48 h-8 rounded-lg animate-shimmer mx-auto mb-4" style={{ background: 'var(--border-subtle)' }} />
          <div className="w-64 h-5 rounded-lg animate-shimmer mx-auto" style={{ background: 'var(--border-subtle)' }} />
        </div>
      </div>
    );
  }

  const config = stateConfig[state.state];
  const firstName = state.userName || 'there';
  const isMilestone = state.state === 'milestone';
  const isStreakRisk = state.state === 'streak_at_risk';
  const isReviewsDue = state.state === 'reviews_due';

  const headlineText = state.state === 'caught_up'
    ? `${config.headline}, ${firstName}!`
    : state.state === 'reviews_due'
    ? `You have ${state.dueCards} cards waiting for review`
    : state.state === 'streak_at_risk'
    ? `${config.headline} (${state.streak}-day streak)`
    : isMilestone && state.milestoneText
    ? state.milestoneText
    : config.headline;

  const subtitleText = isReviewsDue
    ? `${config.subtitle} A ~${Math.max(1, Math.round(state.dueCards * 0.25))}-minute session.`
    : isMilestone
    ? "You've hit a new milestone. Keep up the great work!"
    : config.subtitle;

  return (
    <motion.div
      className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 mb-8 overflow-hidden rounded-3xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={smoothTransition}
    >
      <div className="absolute inset-0" style={{ background: 'var(--gradient-hero)' }} />
      <div className="absolute inset-0" style={{ background: 'var(--gradient-mesh)' }} />

      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.06, 0.12, 0.06] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: timeOfDay.gradient, filter: 'blur(80px)' }}
      />

      {isStreakRisk && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.3) 0%, transparent 70%)' }}
        />
      )}

      {isMilestone && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {milestoneParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: p.bg,
                left: `${p.left}%`,
                top: `${p.top}%`,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: p.endX,
                y: p.endY,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 2, delay: p.id * 0.05, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}

      <div className="relative px-6 sm:px-12 lg:px-16 py-10 sm:py-14 text-center">
        <motion.div
          key={state.state}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={smoothTransition}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{
              background: `${timeOfDay.color}15`,
              border: `1px solid ${timeOfDay.color}30`,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <TimeIcon className="h-3.5 w-3.5" style={{ color: timeOfDay.color }} />
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: timeOfDay.color }}>
              {timeOfDay.greeting}
            </span>
          </motion.div>

          <motion.h1
            className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3"
            initial={{ opacity: 0, filter: 'blur(10px)', y: 30 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <span className="text-text-primary">{headlineText}</span>
          </motion.h1>

          {subtitleText && (
            <motion.p
              className="text-text-secondary text-base max-w-lg mx-auto mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {subtitleText}
            </motion.p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {state.state === 'caught_up' ? (
              <>
                <Link to={config.cta1To!}>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-3 rounded-2xl font-semibold text-sm flex items-center gap-2"
                    style={{ border: '1px solid var(--glass-border-light)', color: 'var(--accent-green)', background: 'var(--glow-cyan)', backdropFilter: 'blur(12px)' }}
                  >
                    <Layers className="h-4 w-4" />
                    {config.cta1Label}
                  </motion.button>
                </Link>
                <Link to={config.cta2To!}>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-3 rounded-2xl text-white font-semibold text-sm flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))', boxShadow: '0 8px 30px rgba(6, 182, 212, 0.25)' }}
                  >
                    <Sparkles className="h-4 w-4" />
                    {config.cta2Label}
                  </motion.button>
                </Link>
              </>
            ) : isMilestone ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-6 py-3 rounded-2xl font-semibold text-sm"
                style={{ border: '1px solid var(--glass-border-light)', color: 'var(--accent-green)', background: 'var(--glow-cyan)', backdropFilter: 'blur(12px)' }}
              >
                {config.ctaLabel}
              </motion.button>
            ) : (
              <>
                <Link to={config.ctaTo!}>
                  <motion.button
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-3 rounded-2xl text-white font-semibold text-sm flex items-center gap-2"
                    style={{
                      background: isStreakRisk
                        ? 'linear-gradient(135deg, var(--accent-danger), var(--accent-amber))'
                        : 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))',
                      boxShadow: isStreakRisk
                        ? '0 8px 30px color-mix(in srgb, var(--accent-danger) 25%, transparent)'
                        : '0 8px 30px rgba(6, 182, 212, 0.25)',
                    }}
                  >
                    {isReviewsDue ? <Brain className="h-4 w-4" /> : isStreakRisk ? <Flame className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {config.ctaLabel}
                  </motion.button>
                </Link>
                {isReviewsDue && (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-6 py-3 rounded-2xl font-semibold text-sm"
                    style={{ border: '1px solid var(--glass-border-light)', color: 'var(--text-secondary)', background: 'var(--glow-cyan)', backdropFilter: 'blur(12px)' }}
                  >
                    Snooze 1h
                  </motion.button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
