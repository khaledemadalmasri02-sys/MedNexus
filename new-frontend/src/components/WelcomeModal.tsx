import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ArrowRight, Sparkles, Brain, FileText, Star, ChevronRight,
  Zap, HelpCircle, GraduationCap, Calendar, Library, RefreshCw, MessageCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface WelcomeModalProps { isOpen: boolean; onClose: () => void; onDismissPermanently?: () => void }

interface Feature {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

const features: Feature[] = [
  { id: 1, title: 'Card Generation', description: 'Generate flashcards from any text using AI. Supports multiple providers for maximum flexibility.', icon: Zap, color: '#22C55E' },
  { id: 2, title: 'QBank Generation', description: 'Create MCQ-style question banks. Perfect for medical exams, certifications, and any subject.', icon: HelpCircle, color: '#3B82F6' },
  { id: 3, title: 'Study Mode', description: 'Spaced repetition flashcard study with flip cards and MCQ support for long-term retention.', icon: GraduationCap, color: '#8B5CF6' },
  { id: 4, title: 'Planner', description: 'Schedule study sessions with our weekly calendar. Plan your learning journey effectively.', icon: Calendar, color: '#F59E0B' },
  { id: 5, title: 'Professional Library', description: 'Organize decks, qbanks, and topics with powerful search and sort capabilities.', icon: Library, color: '#06B6D4' },
  { id: 6, title: 'PDF Summaries', description: 'Upload any PDF and watch as MedNexus intelligently extracts key concepts into ready-to-study flashcards.', icon: FileText, color: '#F43F5E' },
  { id: 7, title: 'AI Tutor', description: 'One-on-one AI tutoring with personalized learning paths. Get instant explanations and adaptive feedback.', icon: MessageCircle, color: '#EC4899' },
  { id: 8, title: 'Sync Everywhere', description: 'Your data syncs across all devices. Study offline and sync when connected. Never lose progress.', icon: RefreshCw, color: '#10B981' },
];

/* ─── DNA Helix SVG ─── */
function DNAHelix({ progress, activeIndex }: { progress: number; activeIndex: number }) {
  const svgW = 100;
  const svgH = 400;
  const amp = 35;
  const freq = 3;
  const segs = 80;

  const genPath = (ph: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= segs; i++) {
      const y = (i / segs) * svgH;
      const a = (i / segs) * Math.PI * 2 * freq + ph;
      pts.push((i === 0 ? 'M ' : 'L ') + (svgW / 2 + Math.sin(a) * amp) + ' ' + y);
    }
    return pts.join(' ');
  };

  const p1 = genPath(0);
  const p2 = genPath(Math.PI);
  const totalLen = 1600;
  const drawP = Math.min(progress * 1.2, 1);

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" preserveAspectRatio="xMidYMeet" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="dna-h1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#22C55E" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="dna-h2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#22C55E" stopOpacity="0.3" />
        </linearGradient>
        <filter id="dna-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={p1} fill="none" stroke="url(#dna-h1)" strokeWidth="2" strokeLinecap="round" filter="url(#dna-glow)"
        style={{ strokeDasharray: totalLen, strokeDashoffset: totalLen - totalLen * drawP }} />
      <path d={p2} fill="none" stroke="url(#dna-h2)" strokeWidth="2" strokeLinecap="round" filter="url(#dna-glow)"
        style={{ strokeDasharray: totalLen, strokeDashoffset: totalLen - totalLen * drawP }} />
      {features.map((feature, i) => {
        const t = i / (features.length - 1);
        const y = t * svgH;
        const angle = t * Math.PI * 2 * freq;
        const x = svgW / 2 + Math.sin(angle) * amp;
        const isActive = activeIndex === i;
        const isPast = i < activeIndex;
        const nodeProgress = Math.min(Math.max((progress - t * 0.7) * 3, 0), 1);
        return (
          <g key={i} style={{ opacity: nodeProgress }}>
            {isActive && <circle cx={x} cy={y} r="14" fill={feature.color} opacity="0.25" filter="url(#dna-glow)">
              <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite" />
            </circle>}
            <circle cx={x} cy={y} r={isActive ? 8 : isPast ? 6 : 4}
              fill={isActive ? feature.color : isPast ? feature.color + '80' : 'var(--bg-elevated)'}
              stroke={feature.color} strokeWidth={isActive ? 2 : 1} />
            <circle cx={x} cy={y} r={isActive ? 3 : 1.5} fill={isActive ? '#fff' : feature.color + '60'} />
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Feature Visual Previews ─── */
function CardGenerationPreview({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <motion.div className="w-full space-y-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {[1, 2, 3].map((i) => (
          <motion.div key={i} className="flex items-center gap-1.5 p-1.5 rounded" style={{ background: `${color}15` }}
            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.15 }}>
            <motion.div className="w-3 h-3 rounded" style={{ background: color }}
              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }} />
            <div className="flex-1 h-1.5 rounded" style={{ background: color + "30", width: (70 + i * 10) + "%" }} />
          </motion.div>
        ))}
      </motion.div>
      <motion.div className="mt-2 flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <Zap className="w-3 h-3" style={{ color }} />
        <span className="text-[8px] font-medium" style={{ color }}>AI Generated</span>
      </motion.div>
    </div>
  );
}

function QBankPreview({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="w-full space-y-1.5">
        {['A', 'B', 'C', 'D'].map((letter, i) => (
          <motion.div key={i} className="flex items-center gap-2 p-1 rounded" style={{ background: i === 1 ? `${color}25` : `${color}10` }}
            animate={{ scale: i === 1 ? [1, 1.05, 1] : 1 }} transition={{ duration: 1.5, repeat: Infinity }}>
            <div className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold"
              style={{ background: i === 1 ? color : `${color}30`, color: i === 1 ? '#fff' : color }}>{letter}</div>
            <div className="flex-1 h-1 rounded" style={{ background: `${color}20` }} />
            {i === 1 && <motion.div className="w-2 h-2 rounded-full bg-green-500" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />}
          </motion.div>
        ))}
      </div>
      <span className="text-[8px] text-text-secondary mt-1">Question 1/24</span>
    </div>
  );
}

function StudyModePreview({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <motion.div className="relative w-16 h-20 rounded-lg" style={{ background: `${color}20`, border: `1px solid ${color}40`, perspective: '500px' }}
        animate={{ rotateY: [0, 180, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
        <motion.div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color }}
          animate={{ opacity: [1, 0, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>Q</motion.div>
        <motion.div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color, rotateY: '180deg', backfaceVisibility: 'hidden' }}
          animate={{ opacity: [0, 1, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>A</motion.div>
      </motion.div>
      <div className="flex gap-1 mt-2">
        {['Again', 'Good', 'Easy'].map((text, i) => (
          <motion.div key={i} className="px-1.5 py-0.5 rounded text-[7px] font-medium" style={{ background: `${color}20`, color }}
            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}>{text}</motion.div>
        ))}
      </div>
    </div>
  );
}

function PlannerPreview({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="grid grid-cols-7 gap-0.5 w-full">
        {[...Array(14)].map((_, i) => (
          <motion.div key={i} className="aspect-square rounded-sm" style={{ background: [2, 5, 8, 10, 12].includes(i) ? color : `${color}15` }}
            animate={{ scale: [2, 5, 8, 10, 12].includes(i) ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 1, delay: i * 0.05, repeat: Infinity }} />
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2">
        <Calendar className="w-3 h-3" style={{ color }} />
        <span className="text-[8px] text-text-secondary">5 sessions this week</span>
      </div>
    </div>
  );
}

function LibraryPreview({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="w-full grid grid-cols-2 gap-1.5">
        {['Anatomy', 'Pharma', 'Path', 'Biochem'].map((name, i) => (
          <motion.div key={i} className="p-1.5 rounded" style={{ background: `${color}15`, border: `1px solid ${color}25` }}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <div className="w-full h-1 rounded mb-1" style={{ background: `${color}40` }} />
            <div className="h-1 rounded" style={{ background: `${color}20`, width: '60%' }} />
            <span className="text-[7px] font-medium" style={{ color }}>{name}</span>
          </motion.div>
        ))}
      </div>
      <motion.div className="mt-2 flex items-center gap-1" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
        <Library className="w-3 h-3" style={{ color }} />
        <span className="text-[8px] text-text-secondary">4 decks</span>
      </motion.div>
    </div>
  );
}

function PDFSummaryPreview({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="relative w-full">
        <motion.div className="w-10 h-12 rounded mx-auto mb-2 flex flex-col items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          initial={{ y: -10 }} animate={{ y: 0 }} transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}>
          <FileText className="w-4 h-4" style={{ color }} />
          <span className="text-[6px] mt-0.5" style={{ color }}>PDF</span>
        </motion.div>
        <motion.div className="flex justify-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          {[1, 2, 3].map((i) => (
            <motion.div key={i} className="w-6 h-4 rounded" style={{ background: `${color}15`, border: `1px solid ${color}30` }}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + i * 0.15 }} />
          ))}
        </motion.div>
      </div>
      <motion.div className="flex items-center gap-1 mt-1" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <Sparkles className="w-2.5 h-2.5" style={{ color }} />
        <span className="text-[7px]" style={{ color }}>Extracting...</span>
      </motion.div>
    </div>
  );
}

function SyncPreview({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="flex items-center justify-center gap-3">
        {['💻', '☁️', '📱'].map((emoji, i) => (
          <motion.div key={i} className="relative"
            animate={{ y: [0, -3, 0] }} transition={{ duration: 1.5, delay: i * 0.2, repeat: Infinity }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>{emoji}</div>
            {i < 2 && (
              <motion.div className="absolute top-1/2 -right-3 w-2 h-0.5" style={{ background: color }}
                animate={{ scaleX: [0, 1, 0] }} transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }} />
            )}
          </motion.div>
        ))}
      </div>
      <motion.div className="mt-2 flex items-center gap-1" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}>
        <RefreshCw className="w-3 h-3" style={{ color }} />
        <span className="text-[8px] font-medium" style={{ color }}>Synced</span>
      </motion.div>
    </div>
  );
}

function AITutorPreview({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2">
      <div className="w-full space-y-1.5">
        <motion.div className="flex items-start gap-1.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}30` }}>
            <MessageCircle className="w-2.5 h-2.5" style={{ color }} />
          </div>
          <div className="flex-1 p-1 rounded" style={{ background: `${color}15` }}>
            <div className="h-1 rounded" style={{ background: `${color}40`, width: '70%' }} />
          </div>
        </motion.div>
        <motion.div className="flex items-start gap-1.5" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }}>
          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}30` }}>
            <Brain className="w-2.5 h-2.5" style={{ color }} />
          </div>
          <div className="flex-1 p-1 rounded" style={{ background: `${color}20` }}>
            <div className="h-1 rounded mb-0.5" style={{ background: `${color}40`, width: '90%' }} />
            <div className="h-1 rounded" style={{ background: `${color}30`, width: '50%' }} />
          </div>
        </motion.div>
        <motion.div className="flex items-start gap-1.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}>
          <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}30` }}>
            <MessageCircle className="w-2.5 h-2.5" style={{ color }} />
          </div>
          <div className="flex-1 p-1 rounded" style={{ background: `${color}15` }}>
            <div className="h-1 rounded" style={{ background: `${color}40`, width: '60%' }} />
          </div>
        </motion.div>
      </div>
      <motion.div className="mt-2 flex items-center gap-1" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
        <span className="text-[7px] font-medium" style={{ color }}>AI is thinking...</span>
        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity }}>.</motion.span>
        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, delay: 0.2, repeat: Infinity }}>.</motion.span>
        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, delay: 0.4, repeat: Infinity }}>.</motion.span>
      </motion.div>
    </div>
  );
}

const featurePreviews = [CardGenerationPreview, QBankPreview, StudyModePreview, PlannerPreview, LibraryPreview, PDFSummaryPreview, AITutorPreview, SyncPreview];

/* ─── Feature Preview Card ─── */
function FeaturePreview({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;
  const PreviewComponent = featurePreviews[index];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.5 }}
      className="p-3 rounded-xl"
      style={{
        background: `linear-gradient(135deg, ${feature.color}10 0%, var(--glass-surface-faint) 100%)`,
        border: `1px solid ${feature.color}25`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${feature.color}20` }}>
          <Icon className="w-4 h-4" style={{ color: feature.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-mono font-semibold" style={{ color: feature.color }}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="font-display text-xs font-bold text-text-primary truncate">{feature.title}</h3>
        </div>
      </div>
      <div className="w-full h-24 rounded-lg mb-2 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${feature.color}15 0%, var(--glass-surface) 100%)`, border: `1px solid ${feature.color}20` }}>
        <PreviewComponent color={feature.color} />
      </div>
      <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-2">{feature.description}</p>
    </motion.div>
  );
}

/* ─── Main WelcomeModal ─── */
export default function WelcomeModal({ isOpen, onClose, onDismissPermanently }: WelcomeModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dnaProgress, setDnaProgress] = useState(0);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const totalSlides = 3;
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    const wasClosed = !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) {
      document.documentElement.classList.add('welcome-open');
      if (wasClosed) {
        setCurrentSlide(0);
        setDnaProgress(0);
        setActiveFeatureIndex(0);
      }
    } else {
      document.documentElement.classList.remove('welcome-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.classList.remove('welcome-open');
    };
  }, [isOpen]);

  const handleClose = () => {
    if (dontShowAgain && onDismissPermanently) onDismissPermanently();
    onClose();
  };

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => handleClose();

  const stats = [
    { value: '500,000+', label: 'Active Users', color: '#22C55E' },
    { value: '98.5%', label: 'Satisfaction', color: '#06B6D4' },
    { value: '10M+', label: 'Cards Created', color: '#3B82F6' },
  ];

  useEffect(() => {
    if (currentSlide === 1) {
      const interval = setInterval(() => {
        setDnaProgress(prev => {
          const next = prev + 0.004;
          return next >= 1 ? 0 : next;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [currentSlide]);

  useEffect(() => {
    const newIndex = Math.min(Math.floor(dnaProgress * features.length * 1.1), features.length - 1);
    setActiveFeatureIndex(newIndex);
  }, [dnaProgress]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 md:p-8"
           style={{ background: 'rgba(var(--bg-void-rgb), 0.78)', backdropFilter: 'blur(20px)' }}
          onClick={handleSkip}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute w-[500px] h-[500px] rounded-full blur-[120px]"
              style={{ background: 'radial-gradient(circle, #22C55E 0%, transparent 70%)', opacity: 0.04, top: '10%', left: '5%' }}
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-[400px] h-[400px] rounded-full blur-[100px]"
              style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)', opacity: 0.03, bottom: '10%', right: '10%' }}
              animate={{ x: [0, -25, 0], y: [0, 25, 0] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl"
            style={{
              background: 'var(--glass-card-bg)',
              border: '1px solid rgba(34, 197, 94, 0.1)',
              boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.9), 0 0 60px -20px rgba(34, 197, 94, 0.1), inset 0 1px 0 0 var(--glass-highlight)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent 0%, #22C55E 30%, #06B6D4 70%, transparent 100%)', opacity: 0.4 }} />

            <button onClick={handleSkip}
              className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition-all hover:scale-110 hover:bg-glass-surface">
              <X className="w-5 h-5" />
            </button>

            <div className="absolute top-5 left-6 flex gap-2 z-50">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <div key={i} className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: i === currentSlide ? 32 : 8,
                    background: i === currentSlide ? 'linear-gradient(90deg, #22C55E, #06B6D4)' : i < currentSlide ? 'rgba(6, 182, 212, 0.5)' : 'var(--glass-border)',
                  }} />
              ))}
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 70px)' }}>
              <AnimatePresence mode="wait">
                <motion.div key={currentSlide}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="p-5 sm:p-8 md:p-10">

                  {/* ═══ Slide 0: Welcome ═══ */}
                  {currentSlide === 0 && (
                    <div className="text-center py-6 sm:py-8">
                      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
                        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl mx-auto mb-6 sm:mb-8 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #22C55E 0%, #06B6D4 100%)', boxShadow: '0 20px 60px rgba(34, 197, 94, 0.25)' }}>
                        <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                        <motion.div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#22C55E]"
                          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }} />
                      </motion.div>
                      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                        <span className="text-text-primary">Welcome to </span><span className="gradient-text">MedNexus</span>
                      </motion.h1>
                      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="text-base sm:text-lg font-medium mb-4" style={{ color: '#22C55E' }}>Study Smarter. Retain More. Master Anything.</motion.p>
                      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="text-sm sm:text-base text-text-secondary max-w-md mx-auto mb-8 sm:mb-10">
                        AI-Powered Flashcard Study Platform. Join a global community transforming their learning journey.
                      </motion.p>
                      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-10">
                        {stats.map((stat, i) => (
                          <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + i * 0.1, type: 'spring' }} className="text-center">
                            <div className="font-display text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                            <div className="text-[10px] sm:text-xs text-text-secondary mt-1">{stat.label}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ═══ Slide 1: DNA Feature Journey ═══ */}
                  {currentSlide === 1 && (
                    <div className="py-2">
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-center mb-6">
                        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22C55E' }}>FEATURE JOURNEY</span>
                        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary mb-2">
                          Explore the <span className="gradient-text">DNA</span> of MedNexus
                        </h2>
                        <p className="text-sm text-text-secondary">Discover every feature that makes studying effortless.</p>
                      </motion.div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                          <div className="sticky top-0">
                            <div className="relative h-[350px] sm:h-[400px] flex items-center justify-center">
                              <div className="relative w-[100px] h-full">
                                <DNAHelix progress={dnaProgress} activeIndex={activeFeatureIndex} />
                                {features.map((feature, i) => {
                                  const t = i / (features.length - 1);
                                  const isActive = i === activeFeatureIndex;
                                  const isPast = i < activeFeatureIndex;
                                  return (
                                    <div key={i} className="absolute left-full ml-3 transition-all duration-500"
                                      style={{ top: (t * 85 + 5) + "%", opacity: isActive ? 1 : isPast ? 0.5 : 0.3 }}>
                                      <div className="flex items-center gap-2">
<div className="w-2 h-2 rounded-full transition-all duration-500"
                                           style={{ background: isActive ? feature.color : 'var(--text-muted)', boxShadow: isActive ? "0 0 12px " + feature.color + "80" : 'none', transform: "scale(" + (isActive ? 1.5 : 1) + ")" }} />
                                        <span className="text-xs sm:text-sm font-medium transition-all duration-300" style={{ color: isActive ? feature.color : 'var(--text-secondary)' }}>{feature.title}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 mt-4">
                              <div className="flex gap-1">
                                {features.map((feature, i) => (
                                  <div key={i} className="h-1 rounded-full transition-all duration-500"
                                    style={{ width: i === activeFeatureIndex ? 24 : 6, background: i === activeFeatureIndex ? feature.color : i < activeFeatureIndex ? `${feature.color}60` : 'var(--glass-border)' }} />
                                ))}
                              </div>
                              <span className="text-xs text-text-muted font-mono">
                                {String(activeFeatureIndex + 1).padStart(2, '0')}/{String(features.length).padStart(2, '0')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                            {features.map((feature, i) => (
                              <FeaturePreview key={feature.id} feature={feature} index={i} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ═══ Slide 2: CTA ═══ */}
                  {currentSlide === 2 && (
                    <div className="text-center py-6 sm:py-8">
                      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
                        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl mx-auto mb-6 sm:mb-8 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #22C55E 0%, #06B6D4 100%)', boxShadow: '0 20px 60px rgba(34, 197, 94, 0.25)' }}>
                        <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                      </motion.div>
                      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
                        <span className="text-text-primary">Ready to </span><span className="gradient-text">Get Started?</span>
                      </motion.h2>
                      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="text-sm sm:text-base text-text-secondary max-w-md mx-auto mb-6 sm:mb-8">
                        Join thousands of students and professionals who are achieving their goals with MedNexus.
                      </motion.p>
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="flex flex-col items-center gap-3 sm:gap-4 mb-8">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#F59E0B', fill: '#F59E0B' }} />)}</div>
                          <span className="text-base sm:text-lg font-bold text-text-primary">4.8/5</span>
                          <span className="text-xs sm:text-sm text-text-secondary">from 500,000+ users</span>
                        </div>
                        <div className="text-xs sm:text-sm text-text-secondary">
                          Start your <strong className="text-text-primary">Free Forever Plan</strong> today — No credit card required!
                        </div>
                      </motion.div>
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                        className="flex flex-col items-center gap-4">
                        <motion.button onClick={onClose}
                          className="group relative flex items-center gap-3 px-8 sm:px-10 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-white font-semibold text-base sm:text-lg transition-all duration-300"
                          style={{ background: 'linear-gradient(135deg, #22C55E 0%, #06B6D4 100%)', boxShadow: '0 10px 40px rgba(34, 197, 94, 0.25)' }}
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                          Get Started <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                        <button onClick={handleSkip} className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors">Explore Features</button>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-4 h-4 rounded accent-accent-green cursor-pointer"
                          />
                          <span className="text-xs text-text-muted">Don&apos;t show this again</span>
                        </label>
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-between p-4 sm:p-6"
              style={{ borderTop: '1px solid var(--glass-border)', background: 'var(--glass-surface)' }}>
              <button onClick={handleSkip} className="text-text-secondary hover:text-text-primary transition-colors text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg hover:bg-glass-surface">Skip Intro</button>
              <motion.button onClick={handleNext}
                className="group flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-white font-semibold text-sm sm:text-base transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #22C55E 0%, #06B6D4 100%)', boxShadow: '0 8px 30px rgba(34, 197, 94, 0.2)' }}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                {currentSlide < totalSlides - 1 ? 'Next' : 'Start Using MedNexus'}
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
