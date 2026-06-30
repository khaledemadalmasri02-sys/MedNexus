import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  description: string;
  color: string;
}

const stats: StatItem[] = [
  {
    value: 10,
    suffix: 'M+',
    label: 'Tasks Automated',
    description: 'Automated every day by our users',
    color: 'var(--accent-primary)',
  },
  {
    value: 500,
    suffix: 'K+',
    label: 'Active Users',
    description: 'Trust our platform worldwide',
    color: 'var(--accent-secondary)',
  },
  {
    value: 99.99,
    suffix: '%',
    label: 'Uptime',
    description: 'Enterprise-grade reliability',
    color: 'var(--accent-cyan)',
  },
  {
    value: 150,
    suffix: '+',
    label: 'Countries',
    description: 'Global reach and support',
    color: 'var(--accent-emerald)',
  },
];

function AnimatedCounter({ value, suffix, isInView }: { value: number; suffix: string; isInView: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isInView) return;

    const duration = 2;
    const startTime = Date.now();
    const isDecimal = value % 1 !== 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = value * easeOutQuart;

      if (isDecimal) {
        setDisplayValue(parseFloat(currentValue.toFixed(2)));
      } else {
        setDisplayValue(Math.floor(currentValue));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value]);

  return (
    <span ref={counterRef} className="counter-value">
      {value % 1 !== 0 ? displayValue.toFixed(2) : displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function StatisticsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(section);

    // Animate background elements
    gsap.to(section.querySelector('.stat-orb-1'), {
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
      y: -100,
      rotation: 45,
    });

    gsap.to(section.querySelector('.stat-orb-2'), {
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
      y: 80,
      rotation: -30,
    });

    return () => {
      observer.disconnect();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 overflow-hidden"
      style={{ background: 'var(--bg-void)' }}
      id="statistics"
    >
      {/* Background elements */}
      <div
        className="stat-orb-1 absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)',
          top: '0%',
          left: '20%',
        }}
      />
      <div
        className="stat-orb-2 absolute w-[400px] h-[400px] rounded-full opacity-10 blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--accent-secondary) 0%, transparent 70%)',
          bottom: '0%',
          right: '20%',
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--accent-primary) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span
            className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-4"
            style={{
              background: 'var(--glow-cyan)',
              border: '1px solid var(--border-active)',
              color: 'var(--accent-cyan)',
            }}
          >
            BY THE NUMBERS
          </span>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-text-primary mb-4">
            Trusted by{' '}
            <span className="gradient-text">millions</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Join the growing community of innovators transforming their workflow.
          </p>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              <div
                className="glass-card rounded-3xl p-8 text-center h-full relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${stat.color}08 0%, var(--bg-glass) 100%)`,
                }}
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${stat.color}15 0%, transparent 70%)`,
                  }}
                />

                {/* Icon indicator */}
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-6 flex items-center justify-center relative"
                  style={{
                    background: `${stat.color}15`,
                    boxShadow: `0 0 30px ${stat.color}10`,
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ background: stat.color }}
                  />
                </div>

                {/* Value */}
                <div
                  className="font-display text-4xl sm:text-5xl font-bold mb-2"
                  style={{ color: stat.color }}
                >
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} isInView={isInView} />
                </div>

                {/* Label */}
                <h3 className="font-display text-lg font-semibold text-text-primary mb-2">
                  {stat.label}
                </h3>

                {/* Description */}
                <p className="text-sm text-text-secondary">{stat.description}</p>

                {/* Decorative line */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-1 rounded-full opacity-50"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${stat.color}, transparent)`,
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-full glass-card">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-bg-void"
                  style={{ background: ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-cyan)', 'var(--accent-emerald)'][i] }}
                />
              ))}
            </div>
            <span className="text-sm text-text-secondary">
              Join <span className="text-text-primary font-semibold">500,000+</span> users already on board
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
