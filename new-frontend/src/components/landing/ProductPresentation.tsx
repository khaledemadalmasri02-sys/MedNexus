import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Monitor, Layers, Zap, Globe } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const dashboardModules = [
  { icon: Monitor, label: 'Dashboard', color: '#3B82F6' },
  { icon: Layers, label: 'Projects', color: '#8B5CF6' },
  { icon: Zap, label: 'Automations', color: '#06B6D4' },
  { icon: Globe, label: 'Analytics', color: '#10B981' },
];

export default function ProductPresentation() {
  const sectionRef = useRef<HTMLElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const mockup = mockupRef.current;

    if (!section || !mockup) return;

    // Rotate mockup on scroll
    gsap.fromTo(
      mockup,
      { rotateY: -15, rotateX: 10, scale: 0.8, opacity: 0 },
      {
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        opacity: 1,
        scrollTrigger: {
          trigger: section,
          start: 'top 60%',
          end: 'center center',
          scrub: 1,
        },
      }
    );

    // Animate panels into view
    panelsRef.current.forEach((panel, index) => {
      if (!panel) return;

      gsap.fromTo(
        panel,
        { opacity: 0, x: index % 2 === 0 ? -100 : 100, scale: 0.8 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          scrollTrigger: {
            trigger: panel,
            start: 'top 80%',
            end: 'top 50%',
            scrub: 1,
          },
        }
      );
    });

    // Parallax on background elements
    gsap.to(section.querySelector('.bg-orb-1'), {
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
      y: -150,
      x: 50,
    });

    gsap.to(section.querySelector('.bg-orb-2'), {
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
      y: 100,
      x: -30,
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen py-32 overflow-hidden"
      style={{ background: 'var(--bg-void)' }}
      id="product"
    >
      {/* Background orbs */}
      <div
        className="bg-orb-1 absolute w-[600px] h-[600px] rounded-full opacity-15 blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)',
          top: '10%',
          left: '10%',
        }}
      />
      <div
        className="bg-orb-2 absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[100px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
          bottom: '20%',
          right: '10%',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[#A78BFA] mb-4">
            PRODUCT OVERVIEW
          </span>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Designed for{' '}
            <span className="gradient-text">performance</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            A powerful platform that adapts to your workflow, not the other way around.
          </p>
        </motion.div>

        {/* Product mockup */}
        <div className="relative perspective-1000">
          <div
            ref={mockupRef}
            className="relative mx-auto max-w-4xl"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Main mockup container */}
            <div className="relative rounded-3xl overflow-hidden glass-card">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-[rgba(11,18,32,0.8)] border-b border-[rgba(148,163,184,0.1)]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#F43F5E]" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="w-full h-6 rounded-lg bg-[rgba(148,163,184,0.1)] flex items-center justify-center">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>app.ankigen.com</span>
                  </div>
                </div>
              </div>

              {/* Dashboard content */}
              <div className="p-6 min-h-[400px]" style={{ background: 'linear-gradient(135deg, var(--bg-deep) 0%, var(--bg-void) 100%)' }}>
                {/* Top bar */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="h-4 w-32 rounded bg-[rgba(148,163,184,0.2)]" />
                      <div className="h-3 w-24 rounded bg-[rgba(148,163,184,0.1)] mt-2" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-lg bg-[rgba(148,163,184,0.1)]" />
                    ))}
                  </div>
                </div>

                {/* Dashboard modules */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {dashboardModules.map((module, index) => {
                    const Icon = module.icon;
                    return (
                      <div
                        key={module.label}
                        ref={(el) => { panelsRef.current[index] = el; }}
                        className="rounded-2xl p-4 glass-card group cursor-pointer"
                        style={{
                          background: `linear-gradient(135deg, ${module.color}10 0%, rgba(11, 18, 32, 0.6) 100%)`,
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                          style={{
                            background: `${module.color}20`,
                            boxShadow: `0 0 20px ${module.color}10`,
                          }}
                        >
                          <Icon className="w-5 h-5" style={{ color: module.color }} />
                        </div>
                        <div className="h-3 w-20 rounded bg-[rgba(148,163,184,0.2)] mb-2" />
                        <div className="h-2 w-16 rounded bg-[rgba(148,163,184,0.1)]" />
                      </div>
                    );
                  })}
                </div>

                {/* Chart placeholder */}
                <div className="mt-6 rounded-2xl p-4 glass-card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-24 rounded bg-[rgba(148,163,184,0.2)]" />
                    <div className="flex gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-6 w-12 rounded bg-[rgba(148,163,184,0.1)]" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t transition-all duration-300"
                        style={{
                          height: `${height}%`,
                          background: `linear-gradient(to top, #3B82F6, #8B5CF6)`,
                          opacity: 0.3 + (height / 200),
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reflection/glow effect */}
            <div
              className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl -z-10"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #06B6D4 100%)',
              }}
            />
          </div>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20">
          {[
            {
              title: 'Intuitive Interface',
              description: 'Clean, modern design that puts your work front and center.',
              color: '#3B82F6',
            },
            {
              title: 'Lightning Fast',
              description: 'Optimized performance for seamless real-time collaboration.',
              color: '#8B5CF6',
            },
            {
              title: 'Infinitely Scalable',
              description: 'Grows with your team from startup to enterprise.',
              color: '#06B6D4',
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6 text-center"
            >
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: `${item.color}20`,
                  boxShadow: `0 0 20px ${item.color}10`,
                }}
              >
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
