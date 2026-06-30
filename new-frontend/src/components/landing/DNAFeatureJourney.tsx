import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Brain,
  Zap,
  BarChart3,
  Paintbrush,
  Users,
  Plug,
  Shield,
  Rocket,
  MessageCircle,
} from 'lucide-react';
import DNAHelix from './DNAHelix';
import VideoShowcase, { type FeatureVideo } from './VideoShowcase';

gsap.registerPlugin(ScrollTrigger);

const features: FeatureVideo[] = [
  {
    id: 1,
    title: 'AI Assistant',
    description:
      'Your intelligent copilot that understands context, learns your preferences, and automates complex tasks with natural language commands.',
    videoSrc: '/videos/features/ai-assistant.mp4',
    posterSrc: '',
    color: '#3B82F6',
    icon: <Brain className="w-6 h-6" style={{ color: '#3B82F6' }} />,
    ctaText: 'Try AI Assistant',
  },
  {
    id: 2,
    title: 'Automation Engine',
    description:
      'Build powerful automation workflows that trigger across your entire stack. No code required — just drag, drop, and deploy.',
    videoSrc: '/videos/features/automation.mp4',
    posterSrc: '',
    color: '#8B5CF6',
    icon: <Zap className="w-6 h-6" style={{ color: '#8B5CF6' }} />,
    ctaText: 'Explore Automations',
  },
  {
    id: 3,
    title: 'Smart Analytics',
    description:
      'Real-time dashboards with AI-powered insights. Predict trends, identify bottlenecks, and make data-driven decisions instantly.',
    videoSrc: '/videos/features/analytics.mp4',
    posterSrc: '',
    color: '#06B6D4',
    icon: <BarChart3 className="w-6 h-6" style={{ color: '#06B6D4' }} />,
    ctaText: 'View Analytics',
  },
  {
    id: 4,
    title: 'Workflow Builder',
    description:
      'Design complex workflows visually with our intuitive drag-and-drop builder. Connect any service, any trigger, any action.',
    videoSrc: '/videos/features/workflow.mp4',
    posterSrc: '',
    color: '#10B981',
    icon: <Paintbrush className="w-6 h-6" style={{ color: '#10B981' }} />,
    ctaText: 'Build Workflows',
  },
  {
    id: 5,
    title: 'Team Collaboration',
    description:
      'Real-time collaboration with live cursors, instant sync, shared workspaces, and granular permission controls for any team size.',
    videoSrc: '/videos/features/collaboration.mp4',
    posterSrc: '',
    color: '#F59E0B',
    icon: <Users className="w-6 h-6" style={{ color: '#F59E0B' }} />,
    ctaText: 'Start Collaborating',
  },
  {
    id: 6,
    title: 'Integrations',
    description:
      'Connect with 500+ tools and services through our extensive integration library. APIs, webhooks, and native connectors included.',
    videoSrc: '/videos/features/integrations.mp4',
    posterSrc: '',
    color: '#F43F5E',
    icon: <Plug className="w-6 h-6" style={{ color: '#F43F5E' }} />,
    ctaText: 'Browse Integrations',
  },
   {
     id: 7,
     title: 'Security',
     description:
       'Enterprise-grade security with end-to-end encryption, SOC 2 compliance, SSO, RBAC, and advanced threat detection.',
     videoSrc: '/videos/features/security.mp4',
     posterSrc: '',
     color: '#A78BFA',
     icon: <Shield className="w-6 h-6" style={{ color: '#A78BFA' }} />,
     ctaText: 'Learn About Security',
   },
   {
     id: 8,
     title: 'Enterprise Platform',
     description:
       'Scale confidently with dedicated infrastructure, custom SLAs, priority support, and advanced admin controls for large organizations.',
     videoSrc: '/videos/features/enterprise.mp4',
     posterSrc: '',
     color: '#3B82F6',
     icon: <Rocket className="w-6 h-6" style={{ color: '#3B82F6' }} />,
     ctaText: 'Go Enterprise',
   },
   {
     id: 9,
     title: 'AI Tutor',
     description:
       'One-on-one AI tutoring with personalized learning paths. Get instant explanations and adaptive feedback tailored to your pace.',
     videoSrc: '/videos/features/ai-tutor.mp4',
     posterSrc: '',
     color: '#EC4899',
     icon: <MessageCircle className="w-6 h-6" style={{ color: '#EC4899' }} />,
     ctaText: 'Try AI Tutor',
   },
];

export default function DNAFeatureJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Main scroll-driven animation
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Kill existing triggers
    ScrollTrigger.getAll().forEach((t) => t.kill());

    if (isMobile) {
      // Mobile: simple scroll-based feature detection
      const featureElements = section.querySelectorAll('.mobile-feature-item');
      featureElements.forEach((el, index) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => {
            setActiveIndex(index);
            setScrollProgress(index / (features.length - 1));
          },
          onEnterBack: () => {
            setActiveIndex(index);
            setScrollProgress(index / (features.length - 1));
          },
        });
      });
    } else {
      // Desktop: pinned scroll section with 5000px scroll distance
      const scrollDistance = 5000;

      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: `+=${scrollDistance}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          setScrollProgress(progress);

          const newIndex = Math.min(
            Math.floor(progress * features.length),
            features.length - 1
          );
          setActiveIndex(newIndex);
        },
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [isMobile]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden"
      style={{ background: 'var(--bg-void)' }}
      id="dna-journey"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-[0.07] blur-[150px]"
          style={{
            background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)',
            top: '20%',
            left: '10%',
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-[0.05] blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
            bottom: '10%',
            right: '10%',
          }}
        />
      </div>

      {/* Section header - visible at start */}
      <div
        className="absolute top-0 left-0 right-0 z-30 pt-16 px-4 text-center transition-opacity duration-500"
        style={{
          opacity: scrollProgress < 0.05 ? 1 : 0,
          pointerEvents: scrollProgress < 0.05 ? 'auto' : 'none',
        }}
      >
        <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] text-[#60A5FA] mb-4">
          FEATURE JOURNEY
        </span>
        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
          Explore the{' '}
          <span className="gradient-text">DNA</span> of Innovation
        </h2>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Scroll to discover every feature that makes our platform extraordinary.
        </p>
      </div>

      {isMobile ? (
        /* ═══ Mobile: Vertical Journey ═══ */
        <div ref={scrollContainerRef} className="relative pt-48 pb-20">
          {/* Vertical progress line */}
          <div className="absolute left-8 top-48 bottom-20 w-0.5 bg-[rgba(148,163,184,0.1)]">
            <div
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] transition-all duration-500"
              style={{
                height: `${scrollProgress * 100}%`,
              }}
            />
          </div>

          {/* Feature items */}
          <div className="relative px-4">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                className="mobile-feature-item relative pl-20 pb-24 last:pb-0"
              >
                {/* Node on timeline */}
                <div
                  className="absolute left-6 top-0 w-5 h-5 rounded-full border-2 transition-all duration-500"
                  style={{
                    borderColor:
                      index <= activeIndex ? feature.color : 'rgba(148,163,184,0.2)',
                    background:
                      index <= activeIndex ? feature.color : 'transparent',
                    boxShadow:
                      index === activeIndex
                        ? `0 0 20px ${feature.color}60`
                        : 'none',
                    transform: index === activeIndex ? 'scale(1.3)' : 'scale(1)',
                  }}
                />

                {/* Feature card */}
                <div
                  className="glass-card rounded-2xl p-6 transition-all duration-500"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color}08 0%, rgba(11, 18, 32, 0.6) 100%)`,
                    opacity: index <= activeIndex + 1 ? 1 : 0.4,
                    transform: index <= activeIndex + 1 ? 'translateY(0)' : 'translateY(20px)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${feature.color}15` }}
                    >
                      {feature.icon}
                    </div>
                    <div>
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: feature.color }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-display text-lg font-bold text-white">
                        {feature.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {feature.description}
                  </p>

                  {/* Mobile video preview */}
                  <div className="mt-4 rounded-xl overflow-hidden aspect-video bg-[#0a0a0a]">
                    <video
                      muted
                      loop
                      playsInline
                      preload="none"
                      className="w-full h-full object-cover"
                      style={{ opacity: index === activeIndex ? 0.8 : 0.3 }}
                    >
                      <source src={feature.videoSrc} type="video/mp4" />
                    </video>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ═══ Desktop: DNA Helix + Video Showcase ═══ */
        <div
          ref={scrollContainerRef}
          className="relative h-screen flex items-center"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full flex items-center">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-center h-full">
              {/* Left: DNA Helix */}
              <div className="relative h-[80vh] flex items-center justify-center">
                <div className="relative w-[300px] h-full">
                  <DNAHelix
                    scrollProgress={scrollProgress}
                    totalNodes={features.length}
                  />

                  {/* Feature labels along the helix */}
                  {features.map((feature, index) => {
                    const t = index / (features.length - 1);
                    const isActive = index === activeIndex;
                    const isPast = index < activeIndex;

                    return (
                      <div
                        key={feature.id}
                        className="absolute left-0 transition-all duration-500"
                        style={{
                          top: `${t * 85 + 5}%`,
                          transform: `translateX(${isActive ? '-20px' : '0'})`,
                          opacity: isActive ? 1 : isPast ? 0.4 : 0.3,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full transition-all duration-500"
                            style={{
                              background: isActive ? feature.color : 'var(--text-muted)',
                              boxShadow: isActive
                                ? `0 0 12px ${feature.color}80`
                                : 'none',
                              transform: `scale(${isActive ? 1.5 : 1})`,
                            }}
                          />
                          <div
                            className="flex items-center gap-2 transition-all duration-500"
                            style={{
                              transform: `translateX(${isActive ? '8px' : '0'})`,
                            }}
                          >
                            <span
                              className="transition-all duration-300"
                              style={{
                                color: isActive ? feature.color : 'var(--text-secondary)',
                                fontSize: isActive ? '14px' : '12px',
                                fontWeight: isActive ? 600 : 400,
                              }}
                            >
                              {feature.title}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Video Showcase */}
              <div className="relative h-[70vh] flex items-center">
                <VideoShowcase
                  features={features}
                  activeIndex={activeIndex}
                />
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-30">
            <div className="flex gap-1.5">
              {features.map((feature, index) => (
                <div
                  key={feature.id}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: index === activeIndex ? '32px' : '8px',
                    background:
                      index === activeIndex
                        ? feature.color
                        : index < activeIndex
                        ? `${feature.color}60`
                        : 'rgba(148,163,184,0.2)',
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {String(activeIndex + 1).padStart(2, '0')} /{' '}
              {String(features.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

