import React, { useRef, useState, useCallback, useEffect, useMemo, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Bot, Brain, GraduationCap, FileText, Lightbulb, TrendingUp,
  Camera, Mic, Users, Stethoscope, Sparkles, ArrowRight, BookOpen,
  Search, X, Zap, Clock, BarChart3, Star, ThumbsUp, ThumbsDown,
  Pin, PinOff, ChevronDown, ChevronUp, HelpCircle, Play,
  MessageSquare, Wand2, AlertCircle, Activity, ArrowLeftRight,
  Layers, GitBranch, Sun, Moon, Coffee, MoonIcon,
  Flame, CheckCircle, XCircle, Bell, UsersRound, LightbulbIcon,
  Gauge, Info, Sparkle, Target, Trophy, CircleDot,
} from "lucide-react";
import { staggerContainer, listItem } from "../components/ui/constants";

type Category = "all" | "tutors" | "generators" | "analytics" | "tools";

const CATEGORIES: { id: Category; label: string; icon: typeof Bot }[] = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "tutors", label: "Tutors", icon: Mic },
  { id: "generators", label: "Generators", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "tools", label: "Tools", icon: Zap },
];

type Agent = {
  to: string;
  icon: typeof Bot;
  label: string;
  desc: string;
  longDesc: string;
  color: string;
  featured: boolean;
  status: "online" | "beta" | "offline";
  category: Exclude<Category, "all">;
  tags: string[];
  usageCount: number;
  lastUsed: string;
  examplePrompt: string;
  quickActionLabel: string;
  quickActionIcon: typeof Bot;
  emptyStateMessage: string;
  inputDescription: string;
  outputDescription: string;
  healthResponseTime: string;
  healthUptime: string;
  healthLastIncident: string;
  healthStatus: "healthy" | "degraded" | "down";
};

const agentHealthData: Record<string, { responseTime: string; uptime: string; lastIncident: string; status: "healthy" | "degraded" | "down" }> = {
  "/chat": { responseTime: "120ms", uptime: "99.9%", lastIncident: "5 days ago", status: "healthy" },
  "/smart-review": { responseTime: "350ms", uptime: "99.7%", lastIncident: "2 days ago", status: "healthy" },
  "/exam": { responseTime: "280ms", uptime: "99.8%", lastIncident: "1 week ago", status: "healthy" },
  "/summarize": { responseTime: "1.2s", uptime: "98.5%", lastIncident: "3 days ago", status: "degraded" },
  "/mnemonics": { responseTime: "180ms", uptime: "99.9%", lastIncident: "2 weeks ago", status: "healthy" },
  "/coach": { responseTime: "420ms", uptime: "99.6%", lastIncident: "4 days ago", status: "healthy" },
  "/image-analyze": { responseTime: "2.1s", uptime: "97.8%", lastIncident: "1 day ago", status: "degraded" },
  "/voice-study": { responseTime: "550ms", uptime: "99.4%", lastIncident: "6 days ago", status: "healthy" },
  "/group-study": { responseTime: "200ms", uptime: "99.0%", lastIncident: "1 week ago", status: "healthy" },
  "/deck/1/doctor": { responseTime: "310ms", uptime: "99.8%", lastIncident: "3 days ago", status: "healthy" },
  "/articles": { responseTime: "1.8s", uptime: "98.2%", lastIncident: "5 days ago", status: "degraded" },
};

const agentIOData: Record<string, { input: string; output: string }> = {
  "/chat": { input: "A question or topic", output: "Detailed explanation with markdown formatting" },
  "/smart-review": { input: "Your study history & cards", output: "Prioritized card queue for review" },
  "/exam": { input: "Select decks + question count", output: "Timed exam with scoring & analytics" },
  "/summarize": { input: "PDF or text notes", output: "Structured summary + suggested flashcards" },
  "/mnemonics": { input: "Concept or card IDs", output: "Creative mnemonics (acronym, story, rhyme)" },
  "/coach": { input: "Study history data", output: "Analytics dashboard + weekly plan" },
  "/image-analyze": { input: "Medical image upload", output: "Findings + teaching flashcards" },
  "/voice-study": { input: "Spoken answer via microphone", output: "Accuracy score + detailed feedback" },
  "/group-study": { input: "Room ID or create new room", output: "Shared quiz session with peers" },
  "/deck/1/doctor": { input: "Deck ID to analyze", output: "Health report + fix suggestions" },
  "/articles": { input: "Deck topics & material", output: "Long-form article with LaTeX + quizzes" },
};

const workflows = [
  {
    id: "exam-prep",
    title: "Exam Prep",
    description: "Prepare for exams with a complete workflow",
    agents: ["/deck/1/doctor", "/smart-review", "/exam"],
    icon: GraduationCap,
  },
  {
    id: "content-creation",
    title: "Content Creation",
    description: "Transform material into study resources",
    agents: ["/summarize", "/articles", "/mnemonics"],
    icon: FileText,
  },
  {
    id: "quick-study",
    title: "Quick Study",
    description: "Fast study session on the go",
    agents: ["/chat", "/voice-study", "/smart-review"],
    icon: Zap,
  },
];

const agentStreaks: Record<string, number> = {
  "/chat": 5,
  "/smart-review": 3,
  "/exam": 0,
  "/summarize": 2,
  "/mnemonics": 0,
  "/coach": 0,
  "/image-analyze": 0,
  "/voice-study": 1,
  "/group-study": 0,
  "/deck/1/doctor": 0,
  "/articles": 0,
};

const agentTips: Record<string, string> = {
  "/chat": "Pro tip: Use specific topics in your questions for better answers",
  "/smart-review": "Pro tip: Review daily for maximum retention",
  "/exam": "Pro tip: Take exams under timed conditions for best results",
  "/summarize": "Pro tip: Upload PDFs with clear section headings",
  "/mnemonics": "Pro tip: Visual mnemonics work best for anatomy",
  "/coach": "Pro tip: Check your coach weekly for progress insights",
  "/image-analyze": "Pro tip: High-resolution images yield better results",
  "/voice-study": "Pro tip: Speak clearly and at moderate pace",
  "/group-study": "Pro tip: Invite 3-5 peers for optimal collaboration",
  "/deck/1/doctor": "Pro tip: Audit your deck monthly for quality",
  "/articles": "Pro tip: Use decks with 20+ cards for richer articles",
};

const agentDifficulty: Record<string, { level: "beginner" | "intermediate" | "advanced"; label: string }> = {
  "/chat": { level: "beginner", label: "Beginner" },
  "/smart-review": { level: "intermediate", label: "Intermediate" },
  "/exam": { level: "advanced", label: "Advanced" },
  "/summarize": { level: "beginner", label: "Beginner" },
  "/mnemonics": { level: "beginner", label: "Beginner" },
  "/coach": { level: "intermediate", label: "Intermediate" },
  "/image-analyze": { level: "advanced", label: "Advanced" },
  "/voice-study": { level: "intermediate", label: "Intermediate" },
  "/group-study": { level: "intermediate", label: "Intermediate" },
  "/deck/1/doctor": { level: "beginner", label: "Beginner" },
  "/articles": { level: "advanced", label: "Advanced" },
};

const agentRequirements: Record<string, { requirement: string; met: boolean }[]> = {
  "/chat": [{ requirement: "Account created", met: true }],
  "/smart-review": [{ requirement: "At least 10 cards studied", met: true }, { requirement: "Study history available", met: true }],
  "/exam": [{ requirement: "Deck with 20+ cards", met: false }],
  "/summarize": [{ requirement: "PDF or text input", met: true }],
  "/mnemonics": [{ requirement: "Cards or concept provided", met: true }],
  "/coach": [{ requirement: "3+ days of study data", met: false }],
  "/image-analyze": [{ requirement: "Medical image file", met: true }],
  "/voice-study": [{ requirement: "Microphone access", met: true }, { requirement: "Cards available", met: true }],
  "/group-study": [{ requirement: "Internet connection", met: true }],
  "/deck/1/doctor": [{ requirement: "Deck with 5+ cards", met: true }],
  "/articles": [{ requirement: "Deck with 20+ cards", met: false }],
};

const agentNotifications: Record<string, { message: string; type: "new" | "update" | "reminder" }[]> = {
  "/chat": [{ message: "New: Academic mode now supports citations", type: "update" }],
  "/smart-review": [{ message: "Your review session is ready!", type: "reminder" }],
  "/exam": [{ message: "New: Clinical vignette questions added", type: "new" }],
  "/image-analyze": [{ message: "New: Now supports radiology scans", type: "new" }],
  "/group-study": [{ message: "3 classmates used this today", type: "update" }],
};

const agentProgress: Record<string, { label: string; percentage: number }> = {
  "/deck/1/doctor": { label: "Deck audit", percentage: 40 },
  "/exam": { label: "Last exam", percentage: 0 },
  "/smart-review": { label: "Cards due", percentage: 65 },
  "/coach": { label: "Weekly goal", percentage: 80 },
};

const agents: Agent[] = [
  {
    to: "/chat", icon: Bot, label: "Study Buddy",
    desc: "Conversational AI tutor that explains, quizzes, and adapts to your learning style",
    longDesc: "An adaptive AI tutor that explains medical concepts, quizzes you on material, and adjusts to your learning pace. Supports both brief and academic response modes.",
    color: "#8B5CF6", featured: true, status: "online", category: "tutors",
    tags: ["AI-powered", "Adaptive", "Chat"], usageCount: 847, lastUsed: "2h ago",
    examplePrompt: "Explain the mechanism of action of ACE inhibitors",
    quickActionLabel: "Ask a question", quickActionIcon: MessageSquare,
    emptyStateMessage: "Start by creating a deck, then come back to chat with me about your cards.",
  },
  {
    to: "/smart-review", icon: Brain, label: "Smart Review",
    desc: "AI-curated review sessions targeting your weakest areas with spaced repetition",
    longDesc: "Analyzes your study history to identify weak areas and generates targeted review sessions using spaced repetition principles.",
    color: "#3B82F6", featured: true, status: "online", category: "analytics",
    tags: ["Spaced repetition", "Adaptive", "AI-powered"], usageCount: 623, lastUsed: "5h ago",
    examplePrompt: "Start a review session for my weakest cards",
    quickActionLabel: "Start review", quickActionIcon: Play,
    emptyStateMessage: "Study some cards first, then I'll identify your weak areas.",
  },
  {
    to: "/exam", icon: GraduationCap, label: "Exam Simulator",
    desc: "Full-length mock exams with timing, scoring, and detailed analytics",
    longDesc: "Generate full-length mock exams from your decks with realistic timing, detailed scoring, topic breakdowns, and performance analytics.",
    color: "#F59E0B", featured: true, status: "online", category: "tools",
    tags: ["Timed", "Scoring", "Analytics"], usageCount: 412, lastUsed: "1d ago",
    examplePrompt: "Generate a 50-question exam from my cardiology deck",
    quickActionLabel: "Generate exam", quickActionIcon: Wand2,
    emptyStateMessage: "Add cards to a deck first to generate exams from your material.",
  },
  {
    to: "/summarize", icon: FileText, label: "Summarizer",
    desc: "Transform PDFs and notes into concise study summaries",
    longDesc: "Upload PDFs or paste notes to generate structured study summaries with key points, definitions, clinical pearls, and suggested flashcards.",
    color: "#06B6D4", featured: false, status: "online", category: "generators",
    tags: ["PDF support", "AI-powered", "Flashcards"], usageCount: 389, lastUsed: "3h ago",
    examplePrompt: "Summarize this pharmacology chapter into key points",
    quickActionLabel: "Summarize content", quickActionIcon: FileText,
    emptyStateMessage: "Upload a PDF or paste notes to get started.",
  },
  {
    to: "/mnemonics", icon: Lightbulb, label: "Mnemonics",
    desc: "Generate memorable acronyms and mental frameworks",
    longDesc: "Create creative mnemonics — acronyms, visual stories, rhymes — to help you memorize complex medical information.",
    color: "#A855F7", featured: false, status: "online", category: "generators",
    tags: ["Memory aids", "Creative", "AI-powered"], usageCount: 256, lastUsed: "1d ago",
    examplePrompt: "Create a mnemonic for the cranial nerves",
    quickActionLabel: "Generate mnemonic", quickActionIcon: Wand2,
    emptyStateMessage: "Select cards or enter a concept to generate mnemonics.",
  },
  {
    to: "/coach", icon: TrendingUp, label: "Progress Coach",
    desc: "AI analytics and weekly study plan recommendations",
    longDesc: "Analyzes your study patterns, identifies weak topics, and generates personalized weekly study plans with actionable recommendations.",
    color: "#EC4899", featured: false, status: "online", category: "analytics",
    tags: ["Analytics", "Planning", "AI-powered"], usageCount: 198, lastUsed: "2d ago",
    examplePrompt: "Show my study progress and recommend focus areas",
    quickActionLabel: "View analytics", quickActionIcon: BarChart3,
    emptyStateMessage: "Study for a few days to unlock personalized analytics.",
  },
  {
    to: "/image-analyze", icon: Camera, label: "Image AI",
    desc: "Convert medical images and diagrams into flashcards",
    longDesc: "Upload medical images, diagrams, or histopathology slides to get AI-generated teaching points and flashcards.",
    color: "#F43F5E", featured: false, status: "online", category: "tools",
    tags: ["Image input", "Flashcards", "AI-powered"], usageCount: 145, lastUsed: "3d ago",
    examplePrompt: "Analyze this ECG image and explain the findings",
    quickActionLabel: "Upload image", quickActionIcon: Camera,
    emptyStateMessage: "Upload a medical image to generate teaching points.",
  },
  {
    to: "/voice-study", icon: Mic, label: "Voice Tutor",
    desc: "Practice with spoken Q&A and verbal explanations",
    longDesc: "Study hands-free with voice-based Q&A. Speak your answers and get instant feedback on accuracy and completeness.",
    color: "#10B981", featured: false, status: "online", category: "tutors",
    tags: ["Voice input", "Hands-free", "Feedback"], usageCount: 134, lastUsed: "4d ago",
    examplePrompt: "Quiz me on pharmacology using voice",
    quickActionLabel: "Start voice session", quickActionIcon: Mic,
    emptyStateMessage: "Connect a microphone and add cards to start voice study.",
  },
  {
    to: "/group-study", icon: Users, label: "Group Study",
    desc: "Collaborative study rooms with shared questions",
    longDesc: "Create or join study rooms to collaborate with peers. Share decks, generate questions together, and compete on quizzes.",
    color: "#06B6D4", featured: false, status: "beta", category: "tools",
    tags: ["Collaborative", "Multiplayer", "Real-time"], usageCount: 89, lastUsed: "1w ago",
    examplePrompt: "Create a group study room for anatomy",
    quickActionLabel: "Create room", quickActionIcon: Users,
    emptyStateMessage: "Invite friends to study together in real-time.",
  },
  {
    to: "/deck/1/doctor", icon: Stethoscope, label: "Deck Doctor",
    desc: "AI-powered deck quality audit and auto-fix",
    longDesc: "Analyzes your flashcard deck for duplicates, vague questions, missing explanations, and suggests AI-powered fixes.",
    color: "#22C55E", featured: false, status: "online", category: "analytics",
    tags: ["Quality audit", "Auto-fix", "AI-powered"], usageCount: 167, lastUsed: "6h ago",
    examplePrompt: "Audit my deck for quality issues",
    quickActionLabel: "Audit deck", quickActionIcon: Stethoscope,
    emptyStateMessage: "Create a deck first to run a quality audit.",
  },
  {
    to: "/articles", icon: BookOpen, label: "Articles",
    desc: "Generate long-form articles from your deck topics with LaTeX and self-quizzes",
    longDesc: "Transform your study material into comprehensive long-form articles with LaTeX formatting, embedded diagrams, and self-assessment quizzes.",
    color: "#14B8A6", featured: false, status: "online", category: "generators",
    tags: ["Long-form", "LaTeX", "Self-quizzes"], usageCount: 112, lastUsed: "5d ago",
    examplePrompt: "Write an article on heart failure based on my deck",
    quickActionLabel: "Write article", quickActionIcon: BookOpen,
    emptyStateMessage: "Add cards to generate articles from your material.",
  },
];

const recommendedAgents = [
  { agentId: "/chat", reason: "You study most in the morning — start with a quick chat session" },
  { agentId: "/deck/1/doctor", reason: "Your deck hasn't been audited recently — check for quality issues" },
  { agentId: "/smart-review", reason: "You have 47 cards due for review today" },
];

const TOUR_STEPS = [
  { target: ".agents-header", title: "Welcome to AI Agents", content: "Your personal study assistants. Each agent helps you learn in a different way." },
  { target: ".agents-search", title: "Search & Filter", content: "Find agents by name, capability, or category. Try searching for 'PDF' or 'voice'." },
  { target: ".agents-recommended", title: "Recommended for You", content: "Personalized suggestions based on your study patterns." },
  { target: ".agents-featured", title: "Featured Agents", content: "The most popular agents used by students." },
  { target: ".agents-all", title: "All Agents", content: "Browse all available agents. Pin your favorites to the top!" },
];

function useTilt(maxTilt = 12) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]), { stiffness: 300, damping: 30 });

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(relX);
    y.set(relY);
  }, [x, y]);

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave };
}

function StatusDot({ status }: { status: string }) {
  const dotColor = status === "online" ? "#22C55E" : status === "beta" ? "#F59E0B" : "#6B7280";
  return (
    <span
      className="relative flex items-center justify-center"
      style={{ width: 10, height: 10 }}
      aria-label={status === "online" ? "Available" : status === "beta" ? "Beta" : "Offline"}
    >
      <span
        className="absolute inset-0 rounded-full animate-ping"
        style={{ background: dotColor, opacity: 0.4 }}
      />
      <span
        className="relative block rounded-full"
        style={{ width: 6, height: 6, background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
      />
    </span>
  );
}

function UsageBadge({ count, lastUsed }: { count: number; lastUsed: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
      <span className="flex items-center gap-1">
        <BarChart3 style={{ width: 10, height: 10 }} />
        {count.toLocaleString()} uses
      </span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span className="flex items-center gap-1">
        <Clock style={{ width: 10, height: 10 }} />
        {lastUsed}
      </span>
    </div>
  );
}

function FeedbackWidget({ agentId }: { agentId: string }) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`feedback-${agentId}`);
    if (stored === "up" || stored === "down") setFeedback(stored);
  }, [agentId]);

  const handleFeedback = (type: "up" | "down") => {
    const newVal = feedback === type ? null : type;
    setFeedback(newVal);
    if (newVal) localStorage.setItem(`feedback-${agentId}`, newVal);
    else localStorage.removeItem(`feedback-${agentId}`);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFeedback("up"); }}
        className="p-1 rounded-md transition-colors"
        style={{
          color: feedback === "up" ? "#22C55E" : "var(--text-muted)",
          background: feedback === "up" ? "rgba(34,197,94,0.15)" : "transparent",
        }}
        aria-label="Helpful"
      >
        <ThumbsUp style={{ width: 11, height: 11 }} fill={feedback === "up" ? "currentColor" : "none"} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFeedback("down"); }}
        className="p-1 rounded-md transition-colors"
        style={{
          color: feedback === "down" ? "#EF4444" : "var(--text-muted)",
          background: feedback === "down" ? "rgba(239,68,68,0.15)" : "transparent",
        }}
        aria-label="Not helpful"
      >
        <ThumbsDown style={{ width: 11, height: 11 }} fill={feedback === "down" ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function AgentCard({
  agent,
  rank,
  isPinned,
  onTogglePin,
  isCompareSelected,
  onToggleCompare,
  onTrackUsage,
}: {
  agent: Agent;
  rank?: number;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  isCompareSelected: boolean;
  onToggleCompare: (id: string) => void;
  onTrackUsage: (agent: Agent) => void;
}) {
  const { ref, rotateX, rotateY, handleMouseMove, handleMouseLeave } = useTilt(10);
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);
  const Icon = agent.icon;
  const QuickActionIcon = agent.quickActionIcon;
  const isFeatured = agent.featured;
  const health = agentHealthData[agent.to];
  const io = agentIOData[agent.to];

  const handleCardClick = () => {
    onTrackUsage(agent);
  };

  return (
    <React.Fragment>
      <motion.div
        variants={listItem}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { handleMouseLeave(); setIsHovered(false); }}
        onMouseEnter={() => setIsHovered(true)}
        style={{
          perspective: 1200,
          transformStyle: "preserve-3d",
        }}
        className={isPinned ? "ring-2 ring-yellow-500/30 rounded-[20px]" : ""}
      >
        <Link to={agent.to} className="block outline-none" onClick={handleCardClick}>
          <motion.div
            ref={ref}
            className="relative group"
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
            whileHover={{
              translateY: -8,
              translateZ: 20,
              scale: 1.02,
              transition: { type: "spring", stiffness: 300, damping: 25 },
            }}
            whileTap={{ scale: 0.98 }}
            tabIndex={0}
          >
            <motion.div
              className="absolute -inset-[1px] rounded-[20px] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${agent.color}40, transparent 50%, ${agent.color}20)`,
                zIndex: -1,
              }}
            />

            <motion.div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
              style={{
                width: isFeatured ? 180 : 120,
                height: isFeatured ? 40 : 28,
                background: `radial-gradient(ellipse, ${agent.color}30 0%, transparent 70%)`,
                filter: "blur(12px)",
              }}
              animate={isHovered ? { opacity: 1, scale: 1.3 } : { opacity: 0.6, scale: 1 }}
              transition={{ duration: 0.4 }}
            />

            <motion.div
              className="relative rounded-[20px] p-5 pt-10 h-full overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(40px) saturate(1.5)",
                WebkitBackdropFilter: "blur(40px) saturate(1.5)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: isHovered
                  ? `inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.4), 0 0 60px ${agent.color}15`
                  : "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              {rank !== undefined && rank < 3 && (
                <div
                  className="absolute top-3 left-5 flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, #F59E0B, #EF4444)",
                    fontSize: "0.6rem",
                    fontWeight: 600,
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(245,158,11,0.3)",
                  }}
                >
                  <Star style={{ width: 8, height: 8 }} fill="currentColor" />
                  TOP {rank + 1}
                </div>
              )}
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleCompare(agent.to); }}
                  className="p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  style={{
                    color: isCompareSelected ? "#8B5CF6" : "var(--text-muted)",
                    background: isCompareSelected ? "rgba(139,92,246,0.15)" : "transparent",
                    border: isCompareSelected ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                  }}
                  aria-label={isCompareSelected ? "Remove from compare" : "Add to compare"}
                >
                  <ArrowLeftRight style={{ width: 10, height: 10 }} />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(agent.to); }}
                  className="p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  style={{
                    color: isPinned ? "#F59E0B" : "var(--text-muted)",
                    background: isPinned ? "rgba(245,158,11,0.15)" : "transparent",
                  }}
                  aria-label={isPinned ? "Unpin" : "Pin to top"}
                >
                  {isPinned ? <Pin style={{ width: 10, height: 10 }} /> : <PinOff style={{ width: 10, height: 10 }} />}
                </button>
              </div>

              <div className="relative flex items-start gap-4" style={{ transform: "translateZ(30px)" }}>
                <motion.div
                  className="rounded-2xl flex items-center justify-center shrink-0 relative"
                  style={{
                    width: isFeatured ? 56 : 48,
                    height: isFeatured ? 56 : 48,
                    background: `linear-gradient(135deg, ${agent.color}18, ${agent.color}08)`,
                    border: `1px solid ${agent.color}25`,
                    boxShadow: isHovered ? `0 0 20px ${agent.color}20, inset 0 1px 0 rgba(255,255,255,0.05)` : "inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                  animate={isHovered ? { scale: 1.08 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Icon
                    style={{ color: agent.color, width: isFeatured ? 26 : 22, height: isFeatured ? 26 : 22 }}
                    strokeWidth={1.8}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: `radial-gradient(circle, ${agent.color}10 0%, transparent 70%)` }}
                    animate={isHovered ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.3 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>

                 <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className="font-semibold truncate"
                      style={{
                        color: "var(--text-primary)",
                        fontSize: isFeatured ? "1.05rem" : "0.95rem",
                      }}
                    >
                      {agent.label}
                    </h3>
                    <StatusDot status={agent.status} />
                    <StreakBadge agentId={agent.to} />
                  </div>
                  <p
                    className="leading-relaxed mb-2"
                    style={{
                      color: "var(--text-muted)",
                      fontSize: isFeatured ? "0.85rem" : "0.8rem",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {agent.desc}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DifficultyBadge agentId={agent.to} />
                    <NotificationBadge agentId={agent.to} />
                  </div>
                </div>

                <motion.div
                  className="shrink-0 mt-1"
                  initial={{ x: -6, opacity: 0 }}
                  animate={isHovered ? { x: 0, opacity: 1 } : { x: -6, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ArrowRight style={{ color: agent.color, width: 16, height: 16 }} />
                </motion.div>
              </div>

              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 pt-3"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex items-center justify-between">
                      <FeedbackWidget agentId={agent.to} />
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQuickAction(true); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[0.65rem] font-medium transition-colors"
                        style={{
                          color: agent.color,
                          background: `${agent.color}15`,
                          border: `1px solid ${agent.color}25`,
                        }}
                      >
                        <QuickActionIcon style={{ width: 10, height: 10 }} />
                        {agent.quickActionLabel}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isFeatured && (
                <div
                  className="mt-4 pt-3 flex items-center gap-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span
                    className="text-[0.65rem] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      color: agent.color,
                      background: `${agent.color}12`,
                      border: `1px solid ${agent.color}20`,
                    }}
                  >
                    Featured
                  </span>
                  <span className="text-[0.7rem]" style={{ color: "var(--text-muted)" }}>
                    Most popular
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        </Link>
      </motion.div>

      <AnimatePresence>
        {showQuickAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowQuickAction(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md rounded-2xl p-6"
              style={{
                background: "rgba(20,20,30,0.95)",
                border: `1px solid ${agent.color}30`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${agent.color}15`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowQuickAction(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg"
                style={{ color: "var(--text-muted)" }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${agent.color}20, ${agent.color}10)`,
                    border: `1px solid ${agent.color}30`,
                  }}
                >
                  <QuickActionIcon style={{ color: agent.color, width: 18, height: 18 }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    {agent.quickActionLabel}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{agent.label}</p>
                </div>
              </div>

              <div
                className="rounded-xl p-4 mb-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                  To use this agent, you need to:
                </p>
                <p className="text-sm" style={{ color: agent.color }}>
                  {agent.emptyStateMessage}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuickAction(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--text-muted)",
                  }}
                >
                  Cancel
                </button>
                <Link
                  to={agent.to}
                  onClick={() => setShowQuickAction(false)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{
                    background: `linear-gradient(135deg, ${agent.color}, ${agent.color}CC)`,
                    boxShadow: `0 4px 15px ${agent.color}30`,
                  }}
                >
                  Open Agent
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md rounded-2xl p-6"
              style={{
                background: "rgba(20,20,30,0.95)",
                border: `1px solid ${agent.color}30`,
                boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${agent.color}15`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg"
                style={{ color: "var(--text-muted)" }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${agent.color}20, ${agent.color}10)`,
                    border: `1px solid ${agent.color}30`,
                  }}
                >
                  <Icon style={{ color: agent.color, width: 24, height: 24 }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{agent.label}</h3>
                  <StatusDot status={agent.status} />
                </div>
              </div>

              <p className="text-sm mb-4" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
                {agent.longDesc}
              </p>

              <div className="mb-4">
                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Capabilities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        color: agent.color,
                        background: `${agent.color}15`,
                        border: `1px solid ${agent.color}25`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl p-3 mb-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Input</p>
                    <p className="text-xs" style={{ color: "var(--text-primary)" }}>{io?.input || "-"}</p>
                  </div>
                  <ArrowRight style={{ width: 14, height: 14, color: agent.color }} />
                  <div className="flex-1">
                    <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Output</p>
                    <p className="text-xs" style={{ color: "var(--text-primary)" }}>{io?.output || "-"}</p>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-3 mb-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Try asking:</p>
                <p className="text-sm italic" style={{ color: agent.color }}>"{agent.examplePrompt}"</p>
              </div>

              <div className="flex items-center justify-between">
                <UsageBadge count={agent.usageCount} lastUsed={agent.lastUsed} />
                <Link
                  to={agent.to}
                  onClick={() => setShowPreview(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                  style={{
                    background: `linear-gradient(135deg, ${agent.color}, ${agent.color}CC)`,
                    boxShadow: `0 4px 15px ${agent.color}30`,
                  }}
                >
                  Open Agent
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </React.Fragment>
  );
}

function SearchAndFilter({
  search,
  onSearchChange,
  category,
  onCategoryChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  category: Category;
  onCategoryChange: (v: Category) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mb-8 space-y-4 agents-search"
    >
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "var(--text-muted)", width: 18, height: 18 }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search agents by name or capability... (Press / to focus)"
          className="w-full pl-12 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(139,92,246,0.1)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const CatIcon = cat.icon;
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 shrink-0"
              style={{
                background: isActive ? "linear-gradient(135deg, #8B5CF6, #3B82F6)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isActive ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: isActive ? "#fff" : "var(--text-muted)",
                boxShadow: isActive ? "0 4px 15px rgba(139,92,246,0.25)" : "none",
              }}
            >
              <CatIcon style={{ width: 14, height: 14 }} />
              {cat.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function RecommendedSection({ agents: recommended }: { agents: Agent[] }) {
  if (recommended.length === 0) return null;

  return (
    <motion.div
      className="mb-10 agents-recommended"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Star style={{ width: 14, height: 14, color: "#F59E0B" }} fill="#F59E0B" />
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Recommended for You
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommended.map((agent) => {
          const Icon = agent.icon;
          return (
            <Link
              key={agent.to}
              to={agent.to}
              className="group flex items-center gap-3 p-4 rounded-xl transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${agent.color}40`;
                e.currentTarget.style.background = `${agent.color}08`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${agent.color}15, ${agent.color}08)`,
                  border: `1px solid ${agent.color}25`,
                }}
              >
                <Icon style={{ color: agent.color, width: 18, height: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {agent.label}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {agent.reason}
                </p>
              </div>
              <ArrowRight
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: agent.color, width: 14, height: 14 }}
              />
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}

function OnboardingTour({
  isActive,
  onComplete,
}: {
  isActive: boolean;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);

  if (!isActive || step >= TOUR_STEPS.length) return null;

  const current = TOUR_STEPS[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100]"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-2xl p-6"
        style={{
          background: "rgba(20,20,30,0.98)",
          border: "1px solid rgba(139,92,246,0.3)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.15)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}
          >
            <HelpCircle style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Step {step + 1} of {TOUR_STEPS.length}
          </span>
        </div>

        <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
          {current.title}
        </h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          {current.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  background: i === step ? "#8B5CF6" : i < step ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
              >
                Back
              </button>
            )}
            {step < TOUR_STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #3B82F6)" }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #22C55E, #16A34A)" }}
              >
                Get Started
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onComplete}
          className="mt-3 text-xs w-full text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Skip tour
        </button>
      </motion.div>
    </motion.div>
  );
}

function HealthIndicator({ agentId }: { agentId: string }) {
  const health = agentHealthData[agentId];
  if (!health) return null;

  const color = health.status === "healthy" ? "#22C55E" : health.status === "degraded" ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative group">
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 4px ${color}` }}
      />
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
        style={{
          background: "rgba(20,20,30,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--text-primary)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Activity style={{ width: 10, height: 10, color }} />
          <span className="font-medium">Health</span>
        </div>
        <div style={{ color: "var(--text-muted)" }}>
          <div>Response: {health.responseTime}</div>
          <div>Uptime: {health.uptime}</div>
          <div>Last incident: {health.lastIncident}</div>
        </div>
      </div>
    </div>
  );
}

function CompareBar({
  selectedAgents,
  onClear,
  onCompare,
}: {
  selectedAgents: Agent[];
  onClear: () => void;
  onCompare: () => void;
}) {
  if (selectedAgents.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-4 rounded-2xl"
      style={{
        background: "rgba(20,20,30,0.95)",
        border: "1px solid rgba(139,92,246,0.3)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-2">
        <ArrowLeftRight style={{ width: 16, height: 16, color: "#8B5CF6" }} />
        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {selectedAgents.length} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        {selectedAgents.map((agent) => {
          const Icon = agent.icon;
          return (
            <div
              key={agent.to}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: `${agent.color}20`,
                border: `1px solid ${agent.color}30`,
              }}
            >
              <Icon style={{ width: 14, height: 14, color: agent.color }} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onClear}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
        >
          Clear
        </button>
        <button
          onClick={onCompare}
          disabled={selectedAgents.length < 2}
          className="px-4 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-50"
          style={{
            background: selectedAgents.length >= 2
              ? "linear-gradient(135deg, #8B5CF6, #3B82F6)"
              : "rgba(255,255,255,0.1)",
          }}
        >
          Compare
        </button>
      </div>
    </motion.div>
  );
}

function CompareModal({
  agents: compareAgents,
  onClose,
}: {
  agents: Agent[];
  onClose: () => void;
}) {
  const rows = [
    { label: "Category", key: "category" },
    { label: "Status", key: "status" },
    { label: "Usage", key: "usageCount" },
    { label: "Response Time", key: "healthResponseTime" },
    { label: "Uptime", key: "healthUptime" },
    { label: "Capabilities", key: "tags" },
    { label: "Input", key: "inputDescription" },
    { label: "Output", key: "outputDescription" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-3xl max-h-[80vh] overflow-auto rounded-2xl p-6"
        style={{
          background: "rgba(20,20,30,0.95)",
          border: "1px solid rgba(139,92,246,0.3)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg"
          style={{ color: "var(--text-muted)" }}
        >
          <X style={{ width: 16, height: 16 }} />
        </button>

        <h3 className="font-semibold text-lg mb-6" style={{ color: "var(--text-primary)" }}>
          Compare Agents
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-3" style={{ color: "var(--text-muted)" }}>Feature</th>
                {compareAgents.map((agent) => {
                  const Icon = agent.icon;
                  return (
                    <th key={agent.to} className="text-center p-3">
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: `${agent.color}15`,
                            border: `1px solid ${agent.color}25`,
                          }}
                        >
                          <Icon style={{ width: 18, height: 18, color: agent.color }} />
                        </div>
                        <span style={{ color: "var(--text-primary)" }}>{agent.label}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <td className="p-3 font-medium" style={{ color: "var(--text-muted)" }}>{row.label}</td>
                  {compareAgents.map((agent) => {
                    const health = agentHealthData[agent.to];
                    const io = agentIOData[agent.to];
                    let value: React.ReactNode = "";

                    if (row.key === "category") value = agent.category;
                    else if (row.key === "status") value = agent.status;
                    else if (row.key === "usageCount") value = agent.usageCount.toLocaleString();
                    else if (row.key === "healthResponseTime") value = health?.responseTime || "-";
                    else if (row.key === "healthUptime") value = health?.uptime || "-";
                    else if (row.key === "tags") {
                      value = (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {agent.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[0.6rem] px-1.5 py-0.5 rounded-full"
                              style={{
                                color: agent.color,
                                background: `${agent.color}12`,
                                border: `1px solid ${agent.color}20`,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      );
                    } else if (row.key === "inputDescription") value = io?.input || "-";
                    else if (row.key === "outputDescription") value = io?.output || "-";

                    return (
                      <td key={agent.to} className="p-3 text-center" style={{ color: "var(--text-primary)" }}>
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RecentActivityFeed({ onAgentClick }: { onAgentClick: (agent: Agent) => void }) {
  const [recentAgents, setRecentAgents] = useState<{ agent: Agent; timestamp: string }[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("recent-agents");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const withAgents = parsed
          .map((item: { agentId: string; timestamp: string }) => {
            const agent = agents.find((a) => a.to === item.agentId);
            return agent ? { agent, timestamp: item.timestamp } : null;
          })
          .filter(Boolean)
          .slice(0, 5);
        setRecentAgents(withAgents);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleClick = (agent: Agent) => {
    const newRecent = [
      { agentId: agent.to, timestamp: new Date().toISOString() },
      ...(recentAgents.map((r) => ({ agentId: r.agent.to, timestamp: r.timestamp })).filter((r) => r.agentId !== agent.to)),
    ].slice(0, 10);
    localStorage.setItem("recent-agents", JSON.stringify(newRecent));
    onAgentClick(agent);
  };

  if (recentAgents.length === 0) return null;

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock style={{ width: 14, height: 14, color: "#06B6D4" }} />
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Recently Used
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {recentAgents.map(({ agent, timestamp }) => {
          const Icon = agent.icon;
          return (
            <Link
              key={agent.to}
              to={agent.to}
              onClick={() => handleClick(agent)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl shrink-0 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${agent.color}40`;
                e.currentTarget.style.background = `${agent.color}08`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  background: `${agent.color}15`,
                  border: `1px solid ${agent.color}25`,
                }}
              >
                <Icon style={{ width: 14, height: 14, color: agent.color }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{agent.label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatTime(timestamp)}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}

function TimeBasedBanner() {
  const hour = new Date().getHours();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  let banner: { icon: typeof Sun; text: string; suggestion: string; agentTo: string; color: string } | null = null;

  if (hour >= 6 && hour < 12) {
    banner = {
      icon: Coffee,
      text: "Good morning! Start your day with a quick review session",
      suggestion: "Try Smart Review",
      agentTo: "/smart-review",
      color: "#3B82F6",
    };
  } else if (hour >= 12 && hour < 18) {
    banner = {
      icon: Sun,
      text: "Afternoon study boost? Try Voice Tutor for hands-free learning",
      suggestion: "Try Voice Tutor",
      agentTo: "/voice-study",
      color: "#10B981",
    };
  } else if (hour >= 18 && hour < 22) {
    banner = {
      icon: MoonIcon,
      text: "Wind down with some mnemonics or a quick chat",
      suggestion: "Try Mnemonics",
      agentTo: "/mnemonics",
      color: "#A855F7",
    };
  } else {
    banner = {
      icon: Moon,
      text: "Late night study? Exam Simulator is ready when you are",
      suggestion: "Try Exam Simulator",
      agentTo: "/exam",
      color: "#F59E0B",
    };
  }

  if (!banner) return null;

  const BannerIcon = banner.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-6 flex items-center justify-between px-5 py-4 rounded-xl"
      style={{
        background: `linear-gradient(135deg, ${banner.color}15, ${banner.color}08)`,
        border: `1px solid ${banner.color}25`,
      }}
    >
      <div className="flex items-center gap-3">
        <BannerIcon style={{ width: 20, height: 20, color: banner.color }} />
        <span className="text-sm" style={{ color: "var(--text-primary)" }}>{banner.text}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to={banner.agentTo}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{
            background: `linear-gradient(135deg, ${banner.color}, ${banner.color}CC)`,
            boxShadow: `0 4px 15px ${banner.color}30`,
          }}
        >
          {banner.suggestion}
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg"
          style={{ color: "var(--text-muted)" }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </motion.div>
  );
}

function WorkflowSection() {
  return (
    <motion.div
      className="mt-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    >
      <div className="flex items-center gap-2 mb-4">
        <GitBranch style={{ width: 14, height: 14, color: "#8B5CF6" }} />
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Suggested Workflows
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {workflows.map((workflow) => {
          const WorkflowIcon = workflow.icon;
          const firstAgent = agents.find((a) => a.to === workflow.agents[0]);
          return (
            <Link
              key={workflow.id}
              to={workflow.agents[0]}
              className="group p-5 rounded-xl transition-all duration-200 block"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
                e.currentTarget.style.background = "rgba(139,92,246,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))",
                    border: "1px solid rgba(139,92,246,0.25)",
                  }}
                >
                  <WorkflowIcon style={{ width: 18, height: 18, color: "#8B5CF6" }} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{workflow.title}</h4>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{workflow.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {workflow.agents.map((agentId, i) => {
                  const agent = agents.find((a) => a.to === agentId);
                  if (!agent) return null;
                  const Icon = agent.icon;
                  return (
                    <div key={agentId} className="flex items-center gap-1">
                      {i > 0 && <ArrowRight style={{ width: 10, height: 10, color: "var(--text-muted)", flexShrink: 0 }} />}
                      <div
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                        style={{
                          background: `${agent.color}10`,
                          border: `1px solid ${agent.color}20`,
                        }}
                      >
                        <Icon style={{ width: 8, height: 8, color: agent.color }} />
                        <span className="text-[0.6rem]" style={{ color: agent.color }}>{agent.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}

function DifficultyBadge({ agentId }: { agentId: string }) {
  const difficulty = agentDifficulty[agentId];
  if (!difficulty) return null;

  const colors = {
    beginner: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)", text: "#22C55E" },
    intermediate: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", text: "#F59E0B" },
    advanced: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", text: "#EF4444" },
  };

  const style = colors[difficulty.level];

  return (
    <span
      className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded"
      style={{ color: style.text, background: style.bg, border: `1px solid ${style.border}` }}
    >
      {difficulty.label}
    </span>
  );
}

function StreakBadge({ agentId }: { agentId: string }) {
  const streak = agentStreaks[agentId];
  if (!streak || streak < 2) return null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{
        background: "rgba(245,158,11,0.12)",
        border: "1px solid rgba(245,158,11,0.25)",
      }}
    >
      <Flame style={{ width: 8, height: 8, color: "#F59E0B" }} />
      <span className="text-[0.6rem] font-medium" style={{ color: "#F59E0B" }}>{streak} day streak</span>
    </div>
  );
}

function NotificationBadge({ agentId }: { agentId: string }) {
  const notifications = agentNotifications[agentId];
  if (!notifications || notifications.length === 0) return null;

  const notification = notifications[0];
  const colors = {
    new: { bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.3)", text: "#8B5CF6" },
    update: { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)", text: "#3B82F6" },
    reminder: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)", text: "#F59E0B" },
  };

  const style = colors[notification.type];

  return (
    <div
      className="relative group"
    >
      <div
        className="flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer"
        style={{ background: style.bg, border: `1px solid ${style.border}` }}
      >
        <Bell style={{ width: 8, height: 8, color: style.text }} />
        <span className="text-[0.6rem] font-medium" style={{ color: style.text }}>
          {notification.type === "new" ? "New" : notification.type === "update" ? "Update" : "Alert"}
        </span>
      </div>
      <div
        className="absolute top-full left-0 mt-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
        style={{
          background: "rgba(20,20,30,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "var(--text-primary)",
        }}
      >
        {notification.message}
      </div>
    </div>
  );
}

function RequirementsChecklist({ agentId }: { agentId: string }) {
  const requirements = agentRequirements[agentId];
  if (!requirements) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {requirements.map((req, i) => (
        <div key={i} className="flex items-center gap-1">
          {req.met ? (
            <CheckCircle style={{ width: 8, height: 8, color: "#22C55E" }} />
          ) : (
            <XCircle style={{ width: 8, height: 8, color: "#6B7280" }} />
          )}
          <span className="text-[0.6rem]" style={{ color: req.met ? "#22C55E" : "var(--text-muted)" }}>
            {req.requirement}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProgressIndicator({ agentId }: { agentId: string }) {
  const progress = agentProgress[agentId];
  if (!progress) return null;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[0.6rem]" style={{ color: "var(--text-muted)" }}>{progress.label}</span>
        <span className="text-[0.6rem] font-medium" style={{ color: "var(--text-primary)" }}>{progress.percentage}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress.percentage}%`,
            background: progress.percentage >= 70 ? "linear-gradient(90deg, #22C55E, #16A34A)" :
              progress.percentage >= 40 ? "linear-gradient(90deg, #F59E0B, #D97706)" :
              "linear-gradient(90deg, #3B82F6, #2563EB)",
          }}
        />
      </div>
    </div>
  );
}

function ProTipCard({ agentId }: { agentId: string }) {
  const tip = agentTips[agentId];
  if (!tip) return null;

  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-lg"
      style={{
        background: "rgba(139,92,246,0.08)",
        border: "1px solid rgba(139,92,246,0.15)",
      }}
    >
      <LightbulbIcon style={{ width: 10, height: 10, color: "#8B5CF6", marginTop: 2, flexShrink: 0 }} />
      <span className="text-[0.65rem]" style={{ color: "var(--text-muted)", lineHeight: 1.4 }}>{tip}</span>
    </div>
  );
}

function SocialPresenceIndicator({ agentId }: { agentId: string }) {
  const notifications = agentNotifications[agentId];
  const socialNotification = notifications?.find(n => n.message.includes("classmates"));
  if (!socialNotification) return null;

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{
        background: "rgba(6,182,212,0.1)",
        border: "1px solid rgba(6,182,212,0.2)",
      }}
    >
      <UsersRound style={{ width: 10, height: 10, color: "#06B6D4" }} />
      <span className="text-[0.6rem]" style={{ color: "#06B6D4" }}>{socialNotification.message}</span>
    </div>
  );
}

function InlineChatPreview() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      <div
        className="p-5 rounded-xl"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))",
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}
            >
              <MessageSquare style={{ width: 14, height: 14, color: "#8B5CF6" }} />
            </div>
            <div>
              <h4 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Quick Chat</h4>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Ask Study Buddy a question without leaving this page</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg"
            style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
          >
            {isExpanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
          </button>
        </div>

        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask a medical question..."
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-primary)",
                }}
              />
              <Link
                to="/chat"
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
              >
                Send
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Explain ACE inhibitors", "What is CRISPR?", "Summarize diabetes types"].map((suggestion) => (
                <Link
                  key={suggestion}
                  to={`/chat?q=${encodeURIComponent(suggestion)}`}
                  className="px-3 py-1.5 rounded-lg text-xs"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-muted)",
                  }}
                >
                  {suggestion}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function AgentCollections() {
  const [collections, setCollections] = useState<{ name: string; agents: string[] }[]>(() => {
    const stored = localStorage.getItem("agent-collections");
    return stored ? JSON.parse(stored) : [
      { name: "Exam Prep", agents: ["/exam", "/smart-review", "/deck/1/doctor"] },
      { name: "Content Creation", agents: ["/summarize", "/articles", "/mnemonics"] },
    ];
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const saveCollections = (updated: { name: string; agents: string[] }[]) => {
    setCollections(updated);
    localStorage.setItem("agent-collections", JSON.stringify(updated));
  };

  const addCollection = () => {
    if (!newName.trim()) return;
    saveCollections([...collections, { name: newName.trim(), agents: [] }]);
    setNewName("");
    setShowCreate(false);
  };

  const deleteCollection = (index: number) => {
    saveCollections(collections.filter((_, i) => i !== index));
  };

  return (
    <motion.div
      className="mb-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers style={{ width: 14, height: 14, color: "#EC4899" }} />
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            My Collections
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-xs px-2 py-1 rounded-lg"
          style={{ color: "#EC4899", background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.2)" }}
        >
          + New
        </button>
      </div>

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4 flex gap-2"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Collection name..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-primary)",
            }}
          />
          <button
            onClick={addCollection}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #EC4899, #DB2777)" }}
          >
            Create
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {collections.map((collection, index) => (
          <div
            key={index}
            className="p-4 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{collection.name}</h4>
              <button
                onClick={() => deleteCollection(index)}
                className="p-1 rounded"
                style={{ color: "var(--text-muted)" }}
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {collection.agents.map((agentId) => {
                const agent = agents.find((a) => a.to === agentId);
                if (!agent) return null;
                const Icon = agent.icon;
                return (
                  <Link
                    key={agentId}
                    to={agent.to}
                    className="flex items-center gap-1 px-2 py-1 rounded-md"
                    style={{
                      background: `${agent.color}10`,
                      border: `1px solid ${agent.color}20`,
                    }}
                  >
                    <Icon style={{ width: 8, height: 8, color: agent.color }} />
                    <span className="text-[0.6rem]" style={{ color: agent.color }}>{agent.label}</span>
                  </Link>
                );
              })}
              {collection.agents.length === 0 && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>No agents yet</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [pinnedAgents, setPinnedAgents] = useState<string[]>(() => {
    const stored = localStorage.getItem("pinned-agents");
    return stored ? JSON.parse(stored) : [];
  });
  const [showAllAgents, setShowAllAgents] = useState(true);
  const [showTour, setShowTour] = useState(() => {
    return !localStorage.getItem("agents-tour-completed");
  });
  const [compareAgents, setCompareAgents] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcut: / to focus search, Cmd+K for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(".agents-search input");
        searchInput?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        navigate("/agents?command=palette");
        const searchInput = document.querySelector<HTMLInputElement>(".agents-search input");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const togglePin = useCallback((agentId: string) => {
    setPinnedAgents((prev) => {
      const next = prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId];
      localStorage.setItem("pinned-agents", JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleCompare = useCallback((agentId: string) => {
    setCompareAgents((prev) => {
      if (prev.includes(agentId)) return prev.filter((id) => id !== agentId);
      if (prev.length >= 3) return prev;
      return [...prev, agentId];
    });
  }, []);

  const trackUsage = useCallback((agent: Agent) => {
    const stored = localStorage.getItem("recent-agents");
    const recent = stored ? JSON.parse(stored) : [];
    const updated = [
      { agentId: agent.to, timestamp: new Date().toISOString() },
      ...recent.filter((r: { agentId: string }) => r.agentId !== agent.to),
    ].slice(0, 10);
    localStorage.setItem("recent-agents", JSON.stringify(updated));
  }, []);

  const completeTour = useCallback(() => {
    setShowTour(false);
    localStorage.setItem("agents-tour-completed", "true");
  }, []);

  const filteredAgents = useMemo(() => {
    let result = agents;

    if (category !== "all") {
      result = result.filter((a) => a.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.label.toLowerCase().includes(q) ||
          a.desc.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [search, category]);

  const featuredAgents = filteredAgents.filter((a) => a.featured);
  const otherAgents = filteredAgents.filter((a) => !a.featured);

  const sortedByUsage = [...agents].sort((a, b) => b.usageCount - a.usageCount);
  const topAgentIds = new Set(sortedByUsage.slice(0, 3).map((a) => a.to));

  const recommendedForYou = useMemo(() => {
    return recommendedAgents
      .map((r) => agents.find((a) => a.to === r.agentId))
      .filter((a): a is Agent => a !== undefined)
      .map((a) => ({
        ...a,
        reason: recommendedAgents.find((r) => r.agentId === a.to)?.reason || "",
      }));
  }, []);

  const compareAgentsData = useMemo(() => {
    return compareAgents.map((id) => agents.find((a) => a.to === id)).filter((a): a is Agent => a !== undefined);
  }, [compareAgents]);

  const hasActiveFilter = search.trim() !== "" || category !== "all";

  const pinnedFirst = useMemo(() => {
    const pinned = otherAgents.filter((a) => pinnedAgents.includes(a.to));
    const unpinned = otherAgents.filter((a) => !pinnedAgents.includes(a.to));
    return [...pinned, ...unpinned];
  }, [otherAgents, pinnedAgents]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24" style={{ perspective: 1500 }}>
      <OnboardingTour isActive={showTour} onComplete={completeTour} />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 agents-header"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
                boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
              }}
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                AI Agents
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Your AI-powered study assistants · Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: "rgba(255,255,255,0.08)" }}>/</kbd> to search
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTour(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-muted)",
            }}
          >
            <HelpCircle style={{ width: 14, height: 14 }} />
            Tour
          </button>
        </div>
      </motion.div>

      <SearchAndFilter
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
      />

      <TimeBasedBanner />

      {!hasActiveFilter && <RecentActivityFeed onAgentClick={trackUsage} />}

      {!hasActiveFilter && <InlineChatPreview />}

      {!hasActiveFilter && <AgentCollections />}

      {!hasActiveFilter && <RecommendedSection agents={recommendedForYou} />}

      {filteredAgents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <AlertCircle className="mx-auto mb-4" style={{ color: "var(--text-muted)", width: 40, height: 40 }} />
          <p className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>No agents found</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Try adjusting your search or filter
          </p>
        </motion.div>
      ) : (
        <>
          {featuredAgents.length > 0 && !hasActiveFilter && (
            <motion.div
              className="mb-12 agents-featured"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              <motion.p
                variants={listItem}
                className="text-xs font-medium uppercase tracking-wider mb-4"
                style={{ color: "var(--text-muted)" }}
              >
                Featured Agents
              </motion.p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{ transformStyle: "preserve-3d" }}>
                {featuredAgents.map((agent) => (
                  <AgentCard
                    key={agent.to}
                    agent={agent}
                    rank={topAgentIds.has(agent.to) ? sortedByUsage.findIndex((a) => a.to === agent.to) : undefined}
                    isPinned={pinnedAgents.includes(agent.to)}
                    onTogglePin={togglePin}
                    isCompareSelected={compareAgents.includes(agent.to)}
                    onToggleCompare={toggleCompare}
                    onTrackUsage={trackUsage}
                  />
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="agents-all"
          >
            <div className="flex items-center justify-between mb-4">
              <motion.p
                variants={listItem}
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {hasActiveFilter ? `Results (${filteredAgents.length})` : "All Agents"}
              </motion.p>
              {!hasActiveFilter && (
                <button
                  onClick={() => setShowAllAgents(!showAllAgents)}
                  className="flex items-center gap-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showAllAgents ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
                  {showAllAgents ? "Collapse" : "Expand"}
                </button>
              )}
            </div>

            {showAllAgents && (
              <>
                {pinnedAgents.length > 0 && !hasActiveFilter && (
                  <div className="mb-4">
                    <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#F59E0B" }}>
                      Pinned
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ transformStyle: "preserve-3d" }}>
                      {pinnedFirst.filter((a) => pinnedAgents.includes(a.to)).map((agent) => (
                        <AgentCard
                          key={agent.to}
                          agent={agent}
                          rank={topAgentIds.has(agent.to) ? sortedByUsage.findIndex((a) => a.to === agent.to) : undefined}
                          isPinned={true}
                          onTogglePin={togglePin}
                          isCompareSelected={compareAgents.includes(agent.to)}
                          onToggleCompare={toggleCompare}
                          onTrackUsage={trackUsage}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ transformStyle: "preserve-3d" }}>
                   {(hasActiveFilter ? filteredAgents : pinnedFirst.filter((a) => !pinnedAgents.includes(a.to))).map((agent) => (
                    <AgentCard
                      key={agent.to}
                      agent={agent}
                      rank={topAgentIds.has(agent.to) ? sortedByUsage.findIndex((a) => a.to === agent.to) : undefined}
                      isPinned={pinnedAgents.includes(agent.to)}
                      onTogglePin={togglePin}
                      isCompareSelected={compareAgents.includes(agent.to)}
                      onToggleCompare={toggleCompare}
                      onTrackUsage={trackUsage}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}

      {!hasActiveFilter && <WorkflowSection />}

      <CompareBar
        selectedAgents={compareAgentsData}
        onClear={() => setCompareAgents([])}
        onCompare={() => setShowCompareModal(true)}
      />

      <AnimatePresence>
        {showCompareModal && compareAgentsData.length >= 2 && (
          <CompareModal agents={compareAgentsData} onClose={() => setShowCompareModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
