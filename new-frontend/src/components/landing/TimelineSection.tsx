import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link, Settings, Zap, Rocket } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const timelineSteps = [
  {
    id: 1,
    title: 'Connect',
    description: 'Integrate your existing tools and data sources in minutes, not hours.',
    icon: Link,
    color: '#3B82F6',
    details: [
      'One-click integrations',
      'Secure API connections',
      'Real-time data sync',
    ],
  },
  {
    id: 2,
    title: 'Configure',
    description: 'Customize workflows and automation rules to match your unique needs.',
    icon: Settings,
    color: '#8B5CF6',
    details: [
      'Visual workflow builder',
      'Custom automation rules',
      'Template library',
    ],
  },
  {
    id: 3,
    title: 'Automate',
    description: 'Let AI handle the repetitive tasks while you focus on what matters.',
    icon: Zap,
    color: '#06B6D4',
    details: [
      'AI-powered automation',
      'Smart task routing',
      'Intelligent scheduling',
    ],
  },
  {
    id: 4,
    title: 'Scale',
    description: 'Grow confidently with enterprise-grade infrastructure and support.',
    icon: Rocket,
    color: '#10B981',
    details: [
      'Unlimited scalability',
      '99.99% uptime SLA',
      'Dedicated support',
    ],
  },
];

export default function TimelineSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const line = lineRef.current;

    if (!section || !line) return;

    // Animate the timeline line
    gsap.fromTo(
      line,
      { scaleY: 0, transformOrigin: 'top' },
      {
        scaleY: 1,
        scrollTrigger: {
          trigger: section,
          start: 'top 60%',
          end: 'bottom 60%',
          scrub: 1,
        },
      }
    );

    // Animate each step
    stepsRef.current.forEach((step, index) => {
      if (!step) return;

      const content = step.querySelector('.step-content');
      const icon = step.querySelector('.step-icon');
      const details = step.querySelectorAll('.step-detail');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: step,
          start: 'top 70%',
          end: 'top 40%',
          scrub: 1,
        },
      });

      if (content) {
        tl.fromTo(
          content,
          { opacity: 0, x: index % 2 === 0 ? -50 : 50 },
          { opacity: 1, x: 0 }
        );
      }

      if (icon) {
        tl.fromTo(
          icon,
          { scale: 0, rotation: -180 },
          { scale: 1, rotation: 0 },
          '-=0.3'
        );
      }

      details.forEach((detail, i) => {
        tl.fromTo(
          detail,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0 },
          `-=${0.2 - i * 0.05}`
        );
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-32 overflow-hidden"
      style={{ background: 'var(--bg-void)' }}
      id="timeline"
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)',
            top: '30%',
            left: '-10%',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #10B981 0%, transparent 70%)',
            bottom: '10%',
            right: '-10%',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-[rgba(6,182,212,0.1)] border border-[rgba(6,182,212,0.2)] text-[#06B6D4] mb-4">
            HOW IT WORKS
          </span>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Get started in{' '}
            <span className="gradient-text">4 steps</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            From setup to scale, we've made it simple to transform your workflow.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div
            ref={lineRef}
            className="timeline-line hidden md:block"
          />

          {/* Steps */}
          <div className="space-y-12 md:space-y-24">
            {timelineSteps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={step.id}
                  ref={(el) => { stepsRef.current[index] = el; }}
                  className={`relative flex flex-col md:flex-row items-center gap-8 ${
                    isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Content */}
                  <div
                    className={`step-content flex-1 ${isEven ? 'md:text-right' : 'md:text-left'}`}
                  >
                    <div
                      className={`glass-card rounded-3xl p-8 inline-block ${
                        isEven ? 'md:ml-auto' : 'md:mr-auto'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${step.color}08 0%, rgba(11, 18, 32, 0.6) 100%)`,
                      }}
                    >
                      <div
                        className={`flex items-center gap-3 mb-4 ${
                          isEven ? 'md:flex-row-reverse' : ''
                        }`}
                      >
                        <span
                          className="text-xs font-mono font-semibold px-2 py-1 rounded-md"
                          style={{
                            background: `${step.color}20`,
                            color: step.color,
                          }}
                        >
                          STEP {String(step.id).padStart(2, '0')}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl font-bold text-white mb-3">
                        {step.title}
                      </h3>
                      <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{step.description}</p>
                      <ul
                        className={`space-y-2 ${
                          isEven ? 'md:text-right' : 'md:text-left'
                        }`}
                      >
                        {step.details.map((detail, i) => (
                          <li
                            key={i}
                            className="step-detail flex items-center gap-2 text-sm"
                            style={{
                              color: 'var(--text-secondary)',
                              flexDirection: isEven ? 'row-reverse' : 'row',
                            }}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: step.color }}
                            />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="step-icon relative z-10 shrink-0">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}30 0%, ${step.color}10 100%)`,
                        boxShadow: `0 0 40px ${step.color}20`,
                      }}
                    >
                      <Icon className="w-8 h-8" style={{ color: step.color }} />
                    </div>
                    {/* Pulse ring */}
                    <div
                      className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                      style={{ background: step.color }}
                    />
                  </div>

                  {/* Spacer for alignment */}
                  <div className="flex-1 hidden md:block" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mt-20"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <button className="cta-primary px-8 py-4 rounded-2xl text-white font-semibold text-lg">
              Start Your Journey
            </button>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Free 14-day trial • No credit card required
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
