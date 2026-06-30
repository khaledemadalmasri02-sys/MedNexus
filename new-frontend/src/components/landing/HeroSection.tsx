import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Play, Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const sublineRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const headline = headlineRef.current;
    const subline = sublineRef.current;
    const buttons = buttonsRef.current;

    if (!section || !headline || !subline || !buttons) return;

    // Initial animation timeline
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(
      headline,
      { opacity: 0, y: 80, filter: 'blur(20px)', scale: 0.95 },
      { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1, duration: 1.2 }
    )
      .fromTo(
        subline,
        { opacity: 0, y: 40, filter: 'blur(10px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8 },
        '-=0.6'
      )
      .fromTo(
        buttons,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.4'
      );

    // Parallax effect on scroll
    gsap.to(section.querySelector('.hero-bg'), {
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      y: 200,
      scale: 1.1,
    });

    gsap.to(section.querySelector('.hero-content'), {
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      y: -100,
      opacity: 0,
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-screen w-full overflow-hidden"
      id="hero"
    >
      {/* Video Background */}
      <div className="hero-bg absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-void/30 via-bg-void/50 to-bg-void z-10" />
        
        {/* Animated gradient orbs as fallback/augmentation */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
            style={{
              background: 'radial-gradient(circle, var(--accent-primary) 0%, transparent 70%)',
              top: '10%',
              left: '20%',
              animation: 'gradient-orb-float 15s ease-in-out infinite',
            }}
          />
          <div
            className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
            style={{
              background: 'radial-gradient(circle, var(--accent-secondary) 0%, transparent 70%)',
              top: '30%',
              right: '10%',
              animation: 'gradient-orb-float 18s ease-in-out infinite reverse',
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full opacity-10 blur-[80px]"
            style={{
              background: 'radial-gradient(circle, var(--accent-cyan) 0%, transparent 70%)',
              bottom: '20%',
              left: '40%',
              animation: 'gradient-orb-float 20s ease-in-out infinite',
            }}
          />
        </div>

        {/* Video element - using a placeholder for now */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoLoaded ? 'opacity-40' : 'opacity-0'
          }`}
          onLoadedData={() => setVideoLoaded(true)}
          poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'%3E%3Crect fill='%23050505' width='1920' height='1080'/%3E%3C/svg%3E"
        >
          {/* Placeholder - in production, add actual video source */}
          {/* <source src="/videos/hero-bg.mp4" type="video/mp4" /> */}
        </video>
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 z-5 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="hero-content relative z-20 h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            style={{
              background: 'var(--glow-primary)',
              border: '1px solid var(--border-active)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span style={{ color: 'var(--accent-primary-light)' }}>AI-Powered Innovation</span>
          </div>
        </motion.div>

        {/* Main Headline */}
        <h1
          ref={headlineRef}
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-center max-w-5xl leading-tight"
          style={{ opacity: 0 }}
        >
          <span className="text-text-primary">Build Faster.</span>
          <br />
          <span className="gradient-text">Scale Smarter.</span>
        </h1>

        {/* Subline */}
        <p
          ref={sublineRef}
          className="mt-6 text-lg sm:text-xl md:text-2xl text-text-secondary text-center max-w-2xl"
          style={{ opacity: 0 }}
        >
          Transform your workflow with intelligent automation.
          <br className="hidden sm:block" />
          The future of productivity is here.
        </p>

        {/* CTA Buttons */}
        <div
          ref={buttonsRef}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          style={{ opacity: 0 }}
        >
          <button
            className="cta-primary group flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg"
          >
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            className="cta-secondary flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg"
          >
            <Play className="w-5 h-5" />
            Watch Demo
          </button>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-text-muted uppercase tracking-widest">Scroll</span>
            <div className="w-6 h-10 rounded-full border-2 border-text-muted flex items-start justify-center p-2">
              <motion.div
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent-primary)' }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-bg-void to-transparent z-20" />
    </section>
  );
}
