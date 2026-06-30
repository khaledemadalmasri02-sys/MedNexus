import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Brain,
  BarChart3,
  Users,
  Paintbrush,
  Plug,
  Shield,
  ArrowRight,
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Brain,
    title: 'AI Automation',
    description: 'Intelligent workflows that learn from your patterns and automate repetitive tasks with precision.',
    color: '#3B82F6',
    gradient: 'from-[#3B82F6] to-[#2563EB]',
  },
  {
    icon: BarChart3,
    title: 'Smart Analytics',
    description: 'Real-time insights and predictive analytics to drive data-informed decisions.',
    color: '#8B5CF6',
    gradient: 'from-[#8B5CF6] to-[#7C3AED]',
  },
  {
    icon: Users,
    title: 'Real-Time Collaboration',
    description: 'Seamless teamwork with instant sync, live cursors, and collaborative editing.',
    color: '#06B6D4',
    gradient: 'from-[#06B6D4] to-[#0891B2]',
  },
  {
    icon: Paintbrush,
    title: 'Visual Builder',
    description: 'Drag-and-drop interface to build complex workflows without writing code.',
    color: '#10B981',
    gradient: 'from-[#10B981] to-[#059669]',
  },
  {
    icon: Plug,
    title: 'API Integrations',
    description: 'Connect with 500+ tools and services through our extensive integration library.',
    color: '#F59E0B',
    gradient: 'from-[#F59E0B] to-[#D97706]',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, SOC 2 compliance, and advanced access controls.',
    color: '#F43F5E',
    gradient: 'from-[#F43F5E] to-[#E11D48]',
  },
];

export default function FeatureShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    const cardsWrapper = cardsWrapperRef.current;

    if (!section || !container || !cardsWrapper) return;

    // Pin the section and create horizontal scroll
    const cards = cardsWrapper.querySelectorAll('.feature-card');
    const scrollWidth = cardsWrapper.scrollWidth - window.innerWidth + 100;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${scrollWidth}`,
        scrub: 1,
        pin: true,
        anticipatePin: 1,
      },
    });

    tl.to(cardsWrapper, {
      x: -scrollWidth,
      ease: 'none',
    });

    // Animate each card on scroll
    cards.forEach((card, index) => {
      const cardElement = card as HTMLElement;
      
      gsap.fromTo(
        cardElement,
        { opacity: 0.3, scale: 0.9 },
        {
          opacity: 1,
          scale: 1,
          scrollTrigger: {
            trigger: section,
            start: `top+=${index * (scrollWidth / cards.length)} top`,
            end: `top+=${(index + 1) * (scrollWidth / cards.length)} top`,
            scrub: 1,
          },
        }
      );
    });

    // Animate section title
    const title = section.querySelector('.section-title');
    if (title) {
      gsap.fromTo(
        title,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'top 50%',
            scrub: 1,
          },
        }
      );
    }

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden"
      style={{ background: 'var(--bg-void)' }}
      id="features"
    >
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-10 blur-[150px]"
          style={{
            background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)',
            top: '20%',
            left: '-20%',
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-10 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
            bottom: '10%',
            right: '-10%',
          }}
        />
      </div>

      {/* Content container */}
      <div ref={containerRef} className="relative h-full">
        {/* Section header */}
        <div className="absolute top-0 left-0 right-0 z-10 pt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] text-[#60A5FA] mb-4">
                POWERFUL FEATURES
              </span>
              <h2 className="section-title font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
                Everything you need to{' '}
                <span className="gradient-text">succeed</span>
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Powerful tools designed to streamline your workflow and boost productivity.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Horizontal scrolling cards */}
        <div className="h-full flex items-center pt-32">
          <div
            ref={cardsWrapperRef}
            className="flex gap-8 px-4 sm:px-6 lg:px-8"
            style={{ willChange: 'transform' }}
          >
            {/* Spacer for initial viewport */}
            <div className="w-[10vw] shrink-0" />

            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="feature-card shrink-0 w-[340px] sm:w-[400px] md:w-[450px]"
                >
                  <div
                    className="glass-card rounded-3xl p-8 h-full relative overflow-hidden group"
                    style={{
                      background: `linear-gradient(135deg, ${feature.color}10 0%, rgba(11, 18, 32, 0.6) 100%)`,
                    }}
                  >
                    {/* Glow effect on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${feature.color}20 0%, transparent 70%)`,
                      }}
                    />

                    {/* Icon */}
                    <div
                      className="relative w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                      style={{
                        background: `linear-gradient(135deg, ${feature.color}30 0%, ${feature.color}10 100%)`,
                        boxShadow: `0 0 30px ${feature.color}20`,
                      }}
                    >
                      <Icon className="w-8 h-8" style={{ color: feature.color }} />
                    </div>

                    {/* Content */}
                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          className="text-xs font-mono font-semibold px-2 py-1 rounded-md"
                          style={{
                            background: `${feature.color}20`,
                            color: feature.color,
                          }}
                        >
                          0{index + 1}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl font-bold text-white mb-3">
                        {feature.title}
                      </h3>
                      <p className="leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
                        {feature.description}
                      </p>
                      <button
                        className="flex items-center gap-2 text-sm font-medium group/btn transition-colors"
                        style={{ color: feature.color }}
                      >
                        Learn more
                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>

                    {/* Decorative corner */}
                    <div
                      className="absolute top-0 right-0 w-32 h-32 opacity-20"
                      style={{
                        background: `radial-gradient(circle at top right, ${feature.color} 0%, transparent 70%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {/* End spacer */}
            <div className="w-[10vw] shrink-0" />
          </div>
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <div className="w-32 h-1 rounded-full bg-[rgba(148,163,184,0.1)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]"
              initial={{ width: '0%' }}
              whileInView={{ width: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
            />
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Scroll to explore</span>
        </div>
      </div>
    </section>
  );
}
