import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ArrowRight, Monitor, Smartphone } from 'lucide-react';

interface VideoShowcaseProps {
  features: FeatureVideo[];
  activeIndex: number;
}

export interface FeatureVideo {
  id: number;
  title: string;
  description: string;
  videoSrc: string;
  posterSrc: string;
  color: string;
  icon: React.ReactNode;
  ctaText?: string;
}

export default function VideoShowcase({ features, activeIndex }: VideoShowcaseProps) {
  const [loadedVideos, setLoadedVideos] = useState<Set<number>>(new Set());
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  const activeFeature = features[activeIndex];

  // Preload adjacent videos
  useEffect(() => {
    const indicesToLoad = [
      activeIndex - 1,
      activeIndex,
      activeIndex + 1,
    ].filter((i) => i >= 0 && i < features.length);

    indicesToLoad.forEach((i) => {
      const video = videoRefs.current.get(i);
      if (video) {
        video.load();
        setLoadedVideos((prev) => new Set(prev).add(i));
      }
    });
  }, [activeIndex, features.length]);

  // Play active video, pause others
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (index === activeIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex]);

  if (!activeFeature) return null;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeFeature.id}
          initial={{ opacity: 0, scale: 0.85, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
          className="relative w-full max-w-2xl mx-auto"
        >
          {/* Device mockup frame */}
          <div className="relative group">
            {/* Outer glow */}
            <div
              className="absolute -inset-4 rounded-[2rem] opacity-30 blur-2xl transition-opacity duration-700 group-hover:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${activeFeature.color} 0%, transparent 60%)`,
              }}
            />

            {/* Device frame */}
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(11, 18, 32, 0.9) 100%)',
                border: `1px solid ${activeFeature.color}30`,
                boxShadow: `0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 40px -10px ${activeFeature.color}20`,
              }}
            >
              {/* Browser/app chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(148,163,184,0.1)]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                </div>
                <div className="flex-1 mx-3">
                  <div className="w-full h-5 rounded-md bg-[rgba(148,163,184,0.08)] flex items-center justify-center">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>app.ankigen.com</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Monitor className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  <Smartphone className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              {/* Video content area */}
              <div className="relative aspect-video" style={{ background: 'var(--bg-void)' }}>
                {/* Video element */}
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(activeIndex, el);
                  }}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  poster={activeFeature.posterSrc}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    opacity: loadedVideos.has(activeIndex) ? 1 : 0,
                    transition: 'opacity 0.5s ease',
                  }}
                >
                  <source src={activeFeature.videoSrc} type="video/mp4" />
                </video>

                {/* Video loading state / poster */}
                {!loadedVideos.has(activeIndex) && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--bg-void)' }}>
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: `${activeFeature.color}20` }}
                      >
                        <Play className="w-5 h-5" style={{ color: activeFeature.color }} />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading preview...</span>
                    </div>
                  </div>
                )}

                {/* Video overlay gradient */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `linear-gradient(180deg, transparent 60%, rgba(var(--bg-void-rgb), 0.8) 100%)`,
                  }}
                />
              </div>
            </div>

            {/* Reflection effect */}
            <div
              className="absolute -bottom-8 left-4 right-4 h-8 rounded-b-2xl opacity-20 blur-sm"
              style={{
                background: `linear-gradient(180deg, ${activeFeature.color}30 0%, transparent 100%)`,
              }}
            />
          </div>

          {/* Feature info below device */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-8 text-center px-4"
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
              style={{
                background: `${activeFeature.color}15`,
                boxShadow: `0 0 30px ${activeFeature.color}10`,
              }}
            >
              {activeFeature.icon}
            </div>

            {/* Step indicator */}
            <span
              className="inline-block text-xs font-mono font-semibold px-2 py-1 rounded-md mb-3"
              style={{
                background: `${activeFeature.color}15`,
                color: activeFeature.color,
              }}
            >
              FEATURE {String(activeIndex + 1).padStart(2, '0')}
            </span>

            {/* Title */}
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-3">
              {activeFeature.title}
            </h3>

            {/* Description */}
            <p className="text-base sm:text-lg max-w-md mx-auto mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {activeFeature.description}
            </p>

            {/* CTA Button */}
            <button
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${activeFeature.color} 0%, ${activeFeature.color}CC 100%)`,
                boxShadow: `0 8px 30px ${activeFeature.color}30`,
              }}
            >
              {activeFeature.ctaText || 'Learn More'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
