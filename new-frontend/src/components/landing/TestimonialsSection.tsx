import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Chen',
    position: 'Product Manager at TechCorp',
    avatar: 'SC',
    color: '#3B82F6',
    rating: 5,
    review: 'This platform has completely transformed how our team works. The AI automation features alone have saved us countless hours every week.',
  },
  {
    id: 2,
    name: 'Marcus Johnson',
    position: 'CTO at StartupXYZ',
    avatar: 'MJ',
    color: '#8B5CF6',
    rating: 5,
    review: 'The best investment we made this year. Our productivity has increased by 300% since implementing this solution across our organization.',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    position: 'Design Lead at Creative Co',
    avatar: 'ER',
    color: '#06B6D4',
    rating: 5,
    review: 'The visual builder is incredibly intuitive. I was able to create complex workflows in minutes without any technical knowledge.',
  },
  {
    id: 4,
    name: 'David Kim',
    position: 'Engineering Manager at Scale',
    avatar: 'DK',
    color: '#10B981',
    rating: 5,
    review: 'Enterprise-grade security with consumer-grade simplicity. Exactly what we needed for our growing team.',
  },
  {
    id: 5,
    name: 'Lisa Thompson',
    position: 'CEO at Innovate Inc',
    avatar: 'LT',
    color: '#F59E0B',
    rating: 5,
    review: 'The analytics dashboard gives us insights we never had before. Data-driven decision making has never been easier.',
  },
  {
    id: 6,
    name: 'Alex Rivera',
    position: 'Founder at NextGen',
    avatar: 'AR',
    color: '#F43F5E',
    rating: 5,
    review: 'From startup to enterprise, this platform scales with us. The API integrations are seamless and the support is exceptional.',
  },
];

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const itemsPerView = typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 3;
  const maxIndex = Math.max(0, testimonials.length - itemsPerView);

  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 5000);
  }, [maxIndex]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isAutoPlaying) {
      startAutoPlay();
    }
    return () => stopAutoPlay();
  }, [isAutoPlaying, startAutoPlay, stopAutoPlay]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <section className="relative py-32 overflow-hidden" style={{ background: 'var(--bg-void)' }} id="testimonials">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[700px] h-[700px] rounded-full opacity-10 blur-[150px]"
          style={{
            background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
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
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[#10B981] mb-4">
            TESTIMONIALS
          </span>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Loved by{' '}
            <span className="gradient-text">thousands</span>
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            See what our customers have to say about their experience.
          </p>
        </motion.div>

        {/* Testimonials carousel */}
        <div
          className="relative"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          <div className="overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {testimonials
                  .slice(currentIndex, currentIndex + itemsPerView)
                  .map((testimonial) => (
                    <div
                      key={testimonial.id}
                      className="testimonial-card glass-card rounded-3xl p-8 relative overflow-hidden group"
                    >
                      {/* Quote icon */}
                      <div
                        className="absolute top-6 right-6 opacity-20"
                        style={{ color: testimonial.color }}
                      >
                        <Quote className="w-12 h-12" />
                      </div>

                      {/* Stars */}
                      <div className="flex gap-1 mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="w-4 h-4 fill-current"
                            style={{ color: testimonial.color }}
                          />
                        ))}
                      </div>

                      {/* Review text */}
                      <p className="leading-relaxed mb-6 relative z-10" style={{ color: 'var(--text-secondary)' }}>
                        "{testimonial.review}"
                      </p>

                      {/* Author */}
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{
                            background: `linear-gradient(135deg, ${testimonial.color}, ${testimonial.color}80)`,
                          }}
                        >
                          {testimonial.avatar}
                        </div>
                        <div>
                          <h4 className="font-display font-semibold text-white">
                            {testimonial.name}
                          </h4>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{testimonial.position}</p>
                        </div>
                      </div>

                      {/* Hover glow */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, ${testimonial.color}10 0%, transparent 70%)`,
                        }}
                      />
                    </div>
                  ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <button
              onClick={handlePrev}
              className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-white hover:bg-[rgba(59,130,246,0.2)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots indicator */}
            <div className="flex gap-2">
              {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDirection(index > currentIndex ? 1 : -1);
                    setCurrentIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-8 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]'
                      : 'bg-[rgba(148,163,184,0.3)] hover:bg-[rgba(148,163,184,0.5)]'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-white hover:bg-[rgba(59,130,246,0.2)] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Logos section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20"
        >
          <p className="text-center text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
            TRUSTED BY LEADING COMPANIES
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50">
            {['TechCorp', 'StartupXYZ', 'Creative Co', 'Scale', 'Innovate Inc', 'NextGen'].map(
              (company) => (
                <div
                  key={company}
                  className="font-display text-lg font-bold" style={{ color: 'var(--text-secondary)' }}
                >
                  {company}
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
