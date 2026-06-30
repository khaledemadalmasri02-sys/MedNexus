import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Sparkles, Lightbulb, BookOpen, Stethoscope,
  Cpu, Timer, GraduationCap, Flame, Target, Layers,
  ChevronDown, ChevronUp, Loader2, AlertCircle,
  List, Info, AlertTriangle, CheckCircle,
  Star, HelpCircle, Zap, Shield,
} from 'lucide-react';
import * as api from '../lib/api';

interface StudyExplanationProps {
  front: string;
  back: string;
  isRevealed: boolean;
  cardId: number;
  // Pre-generated explanations from the card
  explanations?: {
    full?: string | null;
    revision?: string | null;
    osce?: string | null;
    brief?: string | null;
    mnemonic?: string | null;
    clinical?: string | null;
    testtrap?: string | null;
  };
}

type ExplanationMode = 'full' | 'revision' | 'osce' | 'mnemonic' | 'quick' | 'clinical' | 'testtrap';

interface ModeConfig {
  id: ExplanationMode;
  label: string;
  icon: typeof BookOpen;
  color: string;
  description: string;
  explanationKey: keyof NonNullable<StudyExplanationProps['explanations']>;
}

const MODES: ModeConfig[] = [
  { id: 'full', label: 'Full Explanation', icon: BookOpen, color: 'var(--accent-green)', description: 'Complete detailed breakdown with all sections', explanationKey: 'full' },
  { id: 'revision', label: 'Revision', icon: Layers, color: 'var(--accent-blue)', description: 'Key points to review', explanationKey: 'revision' },
  { id: 'osce', label: 'OSCE', icon: Stethoscope, color: 'var(--accent-purple)', description: 'Clinical scenario framing', explanationKey: 'osce' },
  { id: 'mnemonic', label: 'Mnemonic', icon: Cpu, color: 'var(--accent-amber)', description: 'Memory aid & tricks', explanationKey: 'mnemonic' },
  { id: 'quick', label: 'Quick Review', icon: Timer, color: 'var(--accent-emerald)', description: 'Last-night cram notes', explanationKey: 'brief' },
  { id: 'clinical', label: 'Clinical Pearl', icon: Flame, color: 'var(--accent-rose)', description: 'High-yield clinical insight', explanationKey: 'clinical' },
  { id: 'testtrap', label: 'Test Trap', icon: Target, color: 'var(--accent-orange)', description: 'Common exam pitfalls', explanationKey: 'testtrap' },
];

// Section icons mapping based on common medical topics and revision sections
const SECTION_ICONS: Record<string, typeof BookOpen> = {
  // Standard medical sections
  'overview': BookOpen,
  'etiology': AlertTriangle,
  'pathophysiology': AlertTriangle,
  'clinical presentation': Stethoscope,
  'diagnosis': CheckCircle,
  'management': List,
  'treatment': List,
  'complications': AlertTriangle,
  'key takeaways': List,
  'introduction': Info,
  // Revision-specific sections
  'key concepts': Star,
  'must-know': Zap,
  'must know': Zap,
  'high-frequency': HelpCircle,
  'high frequency': HelpCircle,
  'exam topics': HelpCircle,
  'common pitfalls': Shield,
  'pitfalls': Shield,
};

function getSectionIcon(sectionName: string): typeof BookOpen {
  const lower = sectionName.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return BookOpen;
}

// Get section color based on section type for revision mode
function getSectionColor(sectionName: string, defaultColor: string): string {
  const lower = sectionName.toLowerCase();
  if (lower.includes('key concepts')) return 'var(--accent-blue)';
  if (lower.includes('must-know') || lower.includes('must know')) return 'var(--accent-amber)';
  if (lower.includes('high-frequency') || lower.includes('high frequency') || lower.includes('exam topics')) return 'var(--accent-purple)';
  if (lower.includes('common pitfalls') || lower.includes('pitfalls')) return 'var(--accent-rose)';
  return defaultColor;
}

// Extract sections from markdown
function extractSections(markdown: string): string[] {
  const sectionRegex = /^#{2,3}\s+(.+)$/gm;
  const sections: string[] = [];
  let match;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    sections.push(match[1]);
  }
  return sections;
}

// Live writing hook - displays content letter by letter over 12 seconds
function useLiveWriting(content: string, durationMs: number = 12000, isPlaying: boolean = false) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!content || !isPlaying) {
      setDisplayedContent('');
      setIsComplete(false);
      return;
    }

    // If content is short (< 50 chars), show immediately
    if (content.length < 50) {
      setDisplayedContent(content);
      setIsComplete(true);
      return;
    }

    startTimeRef.current = Date.now();
    const totalChars = content.length;
    
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      
      // Linear progress for consistent letter-by-letter reveal
      const charsToShow = Math.floor(totalChars * progress);
      
      // Display content up to the current character count
      setDisplayedContent(content.slice(0, charsToShow));
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure final content is complete
        setDisplayedContent(content);
        setIsComplete(true);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [content, durationMs, isPlaying]);

  return { displayedContent, isComplete };
}

export default function StudyExplanation({ front, back, isRevealed, cardId, explanations }: StudyExplanationProps) {
  const [activeMode, setActiveMode] = useState<ExplanationMode | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedContent, setFetchedContent] = useState<string | null>(null);
  const prevCardIdRef = useRef(cardId);
  const abortControllerRef = useRef<(() => void) | null>(null);

  const resetState = useCallback(() => {
    setActiveMode(null);
    setExpanded(false);
    setFetchedContent(null);
    setError(null);
    abortControllerRef.current?.();
    abortControllerRef.current = null;
  }, []);

  // Handle card change
  useEffect(() => {
    if (prevCardIdRef.current !== cardId) {
      prevCardIdRef.current = cardId;
      resetState();
    }
  }, [cardId, resetState]);

  // Handle reveal state change
  useEffect(() => {
    if (!isRevealed) {
      resetState();
    }
  }, [isRevealed, resetState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.();
    };
  }, []);

  // Get the explanation content for the active mode
  const getExplanationContent = useCallback((mode: ExplanationMode): string | null => {
    if (!explanations) return null;
    const modeConfig = MODES.find(m => m.id === mode);
    if (!modeConfig) return null;
    return explanations[modeConfig.explanationKey] || null;
  }, [explanations]);

  // Fetch explanation from API if not pre-generated
  const fetchExplanation = useCallback(async (mode: ExplanationMode) => {
    // Cancel any existing request
    abortControllerRef.current?.();
    
    setLoading(true);
    setError(null);
    setFetchedContent(null);

    try {
      const modeMap: Record<ExplanationMode, string> = {
        full: 'full',
        revision: 'revision',
        osce: 'osce',
        mnemonic: 'mnemonic',
        quick: 'brief',
        clinical: 'clinical',
        testtrap: 'testtrap',
      };

      const response = await api.explainApi.explain({
        front,
        back,
        mode: modeMap[mode] as "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap"
      });
      setFetchedContent(response.explanation);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [front, back]);

  const handleModeSelect = (modeConfig: ModeConfig) => {
    if (activeMode === modeConfig.id) {
      setActiveMode(null);
      return;
    }
    setActiveMode(modeConfig.id);
    
    // Check if we have pre-generated explanation
    const preGenerated = getExplanationContent(modeConfig.id);
    if (!preGenerated) {
      // Fetch from API if not pre-generated
      fetchExplanation(modeConfig.id);
    }
  };

  const activeConfig = MODES.find(m => m.id === activeMode);
  
  // Get the content to display (pre-generated or fetched)
  const rawContent = activeMode 
    ? (getExplanationContent(activeMode) || fetchedContent || '')
    : '';
  
  // Apply live writing animation
  const { displayedContent, isComplete } = useLiveWriting(rawContent, 6000, !!rawContent && !!activeMode);
  
  const sections = extractSections(rawContent);

  return (
    <AnimatePresence>
      {isRevealed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }}
          className="mt-4 overflow-hidden"
        >
          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--glass-border-light), transparent)' }} />
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-accent-green" />
              <span className="text-[10px] font-display font-semibold text-accent-green tracking-widest uppercase">AI Explanation</span>
            </div>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--glass-border-light), transparent)' }} />
          </div>

          {/* Answer */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Answer</span>
          </div>
          <p className="text-center text-text-secondary leading-relaxed mb-4">{back}</p>

          {/* Mode selector buttons */}
          <div className="mb-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
              }}
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Study Modes</span>
                {activeMode && activeConfig && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: `${activeConfig.color}20`, color: activeConfig.color }}>
                    {activeConfig.label}
                  </span>
                )}
              </div>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {MODES.map((mode) => {
                      const Icon = mode.icon;
                      const isActive = activeMode === mode.id;
                      const hasContent = explanations?.[mode.explanationKey];
                      return (
                        <button
                          key={mode.id}
                          onClick={() => handleModeSelect(mode)}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all"
                          style={{
                            background: isActive ? `${mode.color}15` : 'var(--glass-surface)',
                            border: isActive ? `1px solid ${mode.color}30` : '1px solid var(--glass-border)',
                          }}
                        >
                          <div
                            className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${mode.color}18` }}
                          >
                            <Icon className="h-3 w-3" style={{ color: mode.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <p className="text-[11px] font-semibold truncate" style={{ color: isActive ? mode.color : 'var(--text-secondary)' }}>
                                {mode.label}
                              </p>
                              {hasContent && (
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-green shrink-0" title="Pre-generated" />
                              )}
                            </div>
                            <p className="text-[9px] text-text-muted truncate">{mode.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Loading state */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-3 py-8"
            >
              <Loader2 className="h-5 w-5 animate-spin text-accent-green" />
              <span className="text-sm text-text-secondary">Generating explanation...</span>
            </motion.div>
          )}

          {/* Error state */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-4 rounded-xl mb-4"
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid rgba(244, 63, 94, 0.2)',
              }}
            >
              <AlertCircle className="h-5 w-5 text-accent-rose shrink-0" />
              <span className="text-sm text-accent-rose">{error}</span>
            </motion.div>
          )}

          {/* Active mode content with live writing animation */}
          <AnimatePresence mode="wait">
            {activeMode && displayedContent && activeConfig && (
              <motion.div
                key={activeMode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${activeConfig.color}08 0%, ${activeConfig.color}03 100%)`,
                  border: `1px solid ${activeConfig.color}15`,
                }}
              >
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${activeConfig.color}25, transparent)` }} />

                {/* Live writing indicator */}
                {!isComplete && (
                  <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-accent-green animate-pulse" />
                    <span className="text-[10px] text-accent-green font-medium">Writing...</span>
                  </div>
                )}

                {/* Section navigation for full explanation (only when complete) */}
                {activeMode === 'full' && sections.length > 0 && isComplete && (
                  <div className="px-4 pt-4 pb-2 border-b" style={{ borderColor: `${activeConfig.color}10` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <List className="h-3.5 w-3.5" style={{ color: activeConfig.color }} />
                      <span className="text-[10px] font-display font-bold tracking-widest uppercase" style={{ color: activeConfig.color }}>
                        Sections
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sections.map((section, idx) => {
                        const SectionIcon = getSectionIcon(section);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              const element = document.getElementById(`section-${idx}`);
                              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
                            style={{
                              background: `${activeConfig.color}10`,
                              color: activeConfig.color,
                            }}
                          >
                            <SectionIcon className="h-3 w-3" />
                            {section}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Markdown content */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${activeConfig.color}15` }}
                    >
                      <activeConfig.icon className="h-3.5 w-3.5" style={{ color: activeConfig.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-display font-bold tracking-widest uppercase" style={{ color: activeConfig.color }}>
                          {activeConfig.label}
                        </span>
                      </div>
                      
                      {/* Rendered Markdown with live writing */}
                      <div className="markdown-content text-sm text-text-secondary leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            h1: ({ children, ...props }) => (
                              <h1 className="text-xl font-bold text-text-primary mb-4 mt-2" {...props}>
                                {children}
                              </h1>
                            ),
                            h2: ({ children, ...props }) => {
                              const text = String(children);
                              const idx = sections.indexOf(text);
                              // Use section-specific colors for revision mode
                              const sectionColor = activeMode === 'revision'
                                ? getSectionColor(text, activeConfig.color)
                                : activeConfig.color;
                              const SectionIcon = getSectionIcon(text);
                              
                              return (
                                <h2
                                  id={idx >= 0 ? `section-${idx}` : undefined}
                                  className="text-lg font-bold text-text-primary mb-3 mt-6 flex items-center gap-2 first:mt-0"
                                  {...props}
                                >
                                  <span className="w-1 h-5 rounded-full" style={{ background: sectionColor }} />
                                  {activeMode === 'revision' && (
                                    <SectionIcon className="h-4 w-4" style={{ color: sectionColor }} />
                                  )}
                                  {children}
                                </h2>
                              );
                            },
                            h3: ({ children, ...props }) => (
                              <h3 className="text-base font-semibold text-text-primary mb-2 mt-4" {...props}>
                                {children}
                              </h3>
                            ),
                            p: ({ children, ...props }) => (
                              <p className="mb-3 leading-relaxed" {...props}>
                                {children}
                              </p>
                            ),
                            ul: ({ children, ...props }) => (
                              <ul className="mb-3 space-y-1.5 list-none" {...props}>
                                {children}
                              </ul>
                            ),
                            ol: ({ children, ...props }) => (
                              <ol className="mb-3 space-y-1.5 list-decimal list-inside" {...props}>
                                {children}
                              </ol>
                            ),
                            li: ({ children, ...props }) => {
                              // For revision mode, use a slightly larger bullet with glow effect
                              const isInRevisionContext = activeMode === 'revision';
                              
                              return (
                                <li className="flex items-start gap-2.5" {...props}>
                                  <span
                                    className={`rounded-full shrink-0 ${isInRevisionContext ? 'w-2 h-2 mt-1.5' : 'w-1.5 h-1.5 mt-2'}`}
                                    style={{
                                      background: activeConfig.color,
                                      boxShadow: isInRevisionContext ? `0 0 6px ${activeConfig.color}50` : 'none'
                                    }}
                                  />
                                  <span>{children}</span>
                                </li>
                              );
                            },
                            strong: ({ children, ...props }) => (
                              <strong className="font-semibold text-text-primary" {...props}>
                                {children}
                              </strong>
                            ),
                            table: ({ children, ...props }) => {
                              // Check if we're in a High-Frequency Exam Topics section (revision mode)
                              const isInRevisionContext = activeMode === 'revision';
                              const tableColor = isInRevisionContext ? 'var(--accent-purple)' : activeConfig.color;
                              
                              return (
                                <div className="mb-4 overflow-x-auto rounded-xl" style={{ border: `1px solid ${tableColor}20`, boxShadow: `0 2px 8px ${tableColor}10` }}>
                                  <table className="w-full text-sm" {...props}>
                                    {children}
                                  </table>
                                </div>
                              );
                            },
                            thead: ({ children, ...props }) => {
                              const isInRevisionContext = activeMode === 'revision';
                              const headerColor = isInRevisionContext ? 'var(--accent-purple)' : activeConfig.color;
                              
                              return (
                                <thead style={{ background: `${headerColor}15` }} {...props}>
                                  {children}
                                </thead>
                              );
                            },
                            th: ({ children, ...props }) => {
                              const isInRevisionContext = activeMode === 'revision';
                              const headerColor = isInRevisionContext ? 'var(--accent-purple)' : activeConfig.color;
                              
                              return (
                                <th className="px-4 py-3 text-left text-xs font-semibold text-text-primary" style={{ borderBottom: `2px solid ${headerColor}30` }} {...props}>
                                  {children}
                                </th>
                              );
                            },
                            td: ({ children, ...props }) => {
                              const isInRevisionContext = activeMode === 'revision';
                              const cellColor = isInRevisionContext ? 'var(--accent-purple)' : activeConfig.color;
                              
                              return (
                                <td className="px-4 py-3 text-text-secondary" style={{ borderBottom: `1px solid ${cellColor}10` }} {...props}>
                                  {children}
                                </td>
                              );
                            },
                            blockquote: ({ children, ...props }) => {
                              const content = String(children);
                              let calloutIcon = <Info className="h-4 w-4" />;
                              let calloutColor = 'var(--accent-blue)';
                              
                              // Enhanced detection for revision mode Must-Know sections
                              const lowerContent = content.toLowerCase();
                              
                              if (lowerContent.includes('crucial') || lowerContent.includes('must-know') || lowerContent.includes('must know') || lowerContent.includes('critical distinction')) {
                                calloutIcon = <Zap className="h-4 w-4" />;
                                calloutColor = 'var(--accent-amber)';
                              } else if (lowerContent.includes('misconception') || lowerContent.includes('common mistake')) {
                                calloutIcon = <AlertTriangle className="h-4 w-4" />;
                                calloutColor = 'var(--accent-rose)';
                              } else if (lowerContent.includes('warning') || lowerContent.includes('caution')) {
                                calloutIcon = <AlertTriangle className="h-4 w-4" />;
                                calloutColor = 'var(--accent-amber)';
                              } else if (lowerContent.includes('important') || lowerContent.includes('note')) {
                                calloutIcon = <AlertCircle className="h-4 w-4" />;
                                calloutColor = 'var(--accent-rose)';
                              } else if (lowerContent.includes('tip') || lowerContent.includes('pearl')) {
                                calloutIcon = <Sparkles className="h-4 w-4" />;
                                calloutColor = 'var(--accent-green)';
                              }

                              return (
                                <blockquote
                                  className="mb-4 p-4 rounded-xl flex gap-3"
                                  style={{
                                    background: `${calloutColor}10`,
                                    borderLeft: `4px solid ${calloutColor}`,
                                    boxShadow: `0 2px 8px ${calloutColor}15`,
                                  }}
                                  {...props}
                                >
                                  <span className="shrink-0 mt-0.5" style={{ color: calloutColor }}>
                                    {calloutIcon}
                                  </span>
                                  <div className="text-sm">{children}</div>
                                </blockquote>
                              );
                            },
                            code: ({ children, ...props }) => {
                              const isInline = !String(children).includes('\n');
                              if (isInline) {
                                return (
                                  <code
                                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                                    style={{ background: `${activeConfig.color}15`, color: activeConfig.color }}
                                    {...props}
                                  >
                                    {children}
                                  </code>
                                );
                              }
                              return (
                                <code
                                  className="block p-3 rounded-lg text-xs font-mono overflow-x-auto mb-3"
                                  style={{ background: 'rgba(15, 23, 42, 0.5)', border: `1px solid ${activeConfig.color}15` }}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                            hr: () => (
                              <hr className="my-4" style={{ borderColor: `${activeConfig.color}15` }} />
                            ),
                          }}
                        >
                          {displayedContent}
                        </ReactMarkdown>
                        {/* Blinking cursor during writing */}
                        {!isComplete && (
                          <span className="inline-block w-[2px] h-[14px] ml-0.5 align-middle animate-pulse" style={{ background: activeConfig.color }} />
                        )}
                      </div>

                      {/* Status indicator */}
                      {!isComplete ? (
                        <div className="mt-4 pt-3 text-[10px] text-accent-green flex items-center gap-1.5" style={{ borderTop: `1px solid ${activeConfig.color}10` }}>
                          <div className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse" />
                          AI is writing...
                        </div>
                      ) : (
                        <div className="mt-4 pt-3 text-[10px] text-text-muted flex items-center gap-1.5" style={{ borderTop: `1px solid ${activeConfig.color}10` }}>
                          <CheckCircle className="h-3 w-3" />
                          Complete
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
