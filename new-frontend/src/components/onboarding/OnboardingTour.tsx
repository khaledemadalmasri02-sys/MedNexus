import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, Play, BarChart3, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TourStep {
  title: string;
  description: string;
  icon: typeof Sparkles;
  target?: string;
  action?: { label: string; path: string };
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to MedNexus! 🎉",
    description: "Let's take a quick tour to help you get the most out of your study experience.",
    icon: Sparkles,
  },
  {
    title: "Create Your First Deck",
    description: "Start by creating a deck or generating cards from your notes, PDFs, and more.",
    icon: BookOpen,
    action: { label: "Go to Library", path: "/library" },
  },
  {
    title: "Generate with AI",
    description: "Upload PDFs, paste notes, or provide URLs — our AI turns them into smart flashcards.",
    icon: Sparkles,
    action: { label: "Try Generator", path: "/generate" },
  },
  {
    title: "Study & Review",
    description: "Use spaced repetition to study efficiently. Track your progress and master every topic.",
    icon: Play,
    action: { label: "Start Studying", path: "/study" },
  },
  {
    title: "Track Your Progress",
    description: "View detailed stats, streaks, and mastery levels on your dashboard.",
    icon: BarChart3,
  },
  {
    title: "Explore AI Agents",
    description: "Chat with Study Buddy, use Smart Review, generate mnemonics, and much more.",
    icon: Bot,
    action: { label: "Explore Agents", path: "/chat" },
  },
];

interface OnboardingTourProps {
  forceShow?: boolean;
}

export function OnboardingTour({ forceShow = false }: OnboardingTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      return;
    }
    const seen = localStorage.getItem("onboarding_seen");
    if (!seen) {
      setIsOpen(true);
    }
  }, [forceShow]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem("onboarding_seen", "true");
  }, []);

  const handleNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  }, [step, handleClose]);

  const handlePrev = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  const handleAction = useCallback((path: string) => {
    handleClose();
    navigate(path);
  }, [handleClose, navigate]);

  const currentStep = TOUR_STEPS[step];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center px-4"
        >
          <div className="absolute inset-0" style={{ background: 'var(--bg-void)', backdropFilter: 'blur(24px)' }} onClick={handleClose} />
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--glass-border-light)",
              boxShadow: "0 32px 64px -16px rgba(0,0,0,0.5)",
            }}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))",
                  border: "1px solid rgba(6,182,212,0.2)",
                }}
              >
                <currentStep.icon className="h-7 w-7 text-accent-cyan" />
              </motion.div>

              <h2 className="font-display text-xl font-bold text-text-primary mb-3">{currentStep.title}</h2>
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">{currentStep.description}</p>

              {currentStep.action && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAction(currentStep.action!.path)}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                >
                  {currentStep.action.label}
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              )}
            </div>

            <div className="px-8 pb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1.5">
                  {TOUR_STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: i === step ? 24 : 6,
                        background: i === step ? "var(--accent-cyan)" : "var(--border-subtle)",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-text-muted">{step + 1} / {TOUR_STEPS.length}</span>
              </div>

              <div className="flex gap-2">
                {step > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handlePrev}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-1"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}
                >
                  {step === TOUR_STEPS.length - 1 ? "Get Started" : "Next"}
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>

              {step < TOUR_STEPS.length - 1 && (
                <button
                  onClick={handleClose}
                  className="w-full mt-2 text-[10px] text-text-muted hover:text-text-secondary transition-colors"
                >
                  Skip tour
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
