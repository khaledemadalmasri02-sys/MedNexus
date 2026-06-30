/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, BookOpen, ChevronDown, ChevronRight, Sparkles,
  HelpCircle, MessageSquare, ExternalLink, Loader2,
  ThumbsUp, ThumbsDown, Copy, Check, ArrowRight,
  Star, Send, Zap, Shield, Clock, Users, Award,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { supportApi, type SupportSearchResult } from "../lib/api";
import { AIContent } from "../components/AIContent";
import { PageTransition, FloatingWidget } from "../components/ui";
import { staggerContainer, listItem } from "../components/ui/constants";

const CATEGORY_ICONS: Record<string, string> = {
  "getting-started": "🚀",
  "study": "📚",
  "account": "👤",
  "troubleshooting": "🔧",
  "features": "✨",
  "billing": "💳",
};

const CATEGORY_LABELS: Record<string, string> = {
  "getting-started": "Getting Started",
  "study": "Study & Review",
  "account": "Account & Security",
  "troubleshooting": "Troubleshooting",
  "features": "Features",
  "billing": "Pricing & Billing",
};

const CATEGORY_COLORS: Record<string, string> = {
  "getting-started": "#22C55E",
  "study": "#3B82F6",
  "account": "#8B5CF6",
  "troubleshooting": "#F59E0B",
  "features": "#EC4899",
  "billing": "#06B6D4",
};

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

interface FeatureRow {
  feature: string;
  free: string;
  pro: string;
}

const PRICING_FEATURES: FeatureRow[] = [
  { feature: "Decks", free: "100", pro: "Unlimited" },
  { feature: "Cards per deck", free: "200", pro: "Unlimited" },
  { feature: "AI generations/day", free: "10", pro: "Unlimited" },
  { feature: "Study Buddy chat", free: "Unlimited", pro: "Unlimited" },
  { feature: "Explanations", free: "Basic", pro: "All modes" },
  { feature: "PDF upload", free: "5 MB", pro: "50 MB" },
  { feature: "Image analysis", free: "✗", pro: "✓" },
  { feature: "Exam simulator", free: "✗", pro: "✓" },
  { feature: "Progress coach", free: "✗", pro: "✓" },
  { feature: "Priority support", free: "✗", pro: "✓" },
];

const STATS = [
  { icon: Zap, label: "AI-Powered", desc: "Smart card generation from any text", color: "#F59E0B" },
  { icon: Shield, label: "Secure", desc: "Your data stays on your device", color: "#22C55E" },
  { icon: Clock, label: "Spaced Repetition", desc: "SM-2 algorithm for optimal learning", color: "#3B82F6" },
  { icon: Users, label: "Collaborative", desc: "Group study & shared decks", color: "#8B5CF6" },
  { icon: Award, label: "Exam Ready", desc: "Mock exams & performance analytics", color: "#EC4899" },
  { icon: BookOpen, label: "Rich Explanations", desc: "7 study modes for deep learning", color: "#06B6D4" },
];

function FAQAccordion({ faq, isOpen, onToggle, accentColor }: {
  faq: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  const [copied, setCopied] = useState(false);
  const [helpful, setHelpful] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(faq.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRate = async (isHelpful: boolean) => {
    setHelpful(isHelpful);
    try {
      await supportApi.rate(faq.id, isHelpful);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 text-left group"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium pr-4 transition-colors" style={{ color: "var(--text-primary)" }}>
          {faq.question}
        </span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-4">
              <AIContent content={faq.answer} accentColor={accentColor} />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-highlight)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[10px] mr-1" style={{ color: "var(--text-muted)" }}>Helpful?</span>
                  <button
                    onClick={() => handleRate(true)}
                    className="p-1 rounded transition-colors"
                    style={{ background: helpful === true ? "var(--accent-green)" : "var(--border-subtle)", color: helpful === true ? "#fff" : "var(--text-muted)" }}
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleRate(false)}
                    className="p-1 rounded transition-colors"
                    style={{ background: helpful === false ? "#EF4444" : "var(--border-subtle)", color: helpful === false ? "#fff" : "var(--text-muted)" }}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SupportPage() {
  const { accentColor } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SupportSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [popularItems, setPopularItems] = useState<FAQItem[]>([]);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"faq" | "pricing" | "about">("faq");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [_categoriesRes, popularRes] = await Promise.all([
          supportApi.getCategories(),
          supportApi.getPopular(),
        ]);

        const allQuestions = popularRes.questions;
        setPopularItems(allQuestions.map((q: { id: number; question: string; category: string }) => ({
          id: q.id,
          question: q.question,
          answer: "",
          category: q.category,
        })));

        const faqPromises = allQuestions.map((q: { id: number; question: string; category: string }) => supportApi.search(q.question));
        const faqResults = await Promise.all(faqPromises);
        const faqs: FAQItem[] = [];
        for (let i = 0; i < faqResults.length; i++) {
          const result = faqResults[i];
          if (result.results.length > 0) {
            faqs.push({
              id: allQuestions[i].id,
              question: allQuestions[i].question,
              answer: result.results[0].answer,
              category: allQuestions[i].category,
            });
          }
        }
        setFaqItems(faqs);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const result = await supportApi.search(query);
      setSearchResults(result.results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const filteredFAQs = selectedCategory
    ? faqItems.filter(f => f.category === selectedCategory)
    : faqItems;

  const categories = [...new Set(faqItems.map(f => f.category))];

  if (loading) {
    return (
      <PageTransition className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentColor }} />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Help & Support
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Find answers, explore features, or chat with our AI support agent
        </p>
      </div>

      {/* Feature Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {STATS.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-2xl"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <stat.icon className="w-5 h-5 mb-2" style={{ color: stat.color }} />
            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{stat.label}</div>
            <div className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>{stat.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
        {(["faq", "pricing", "about"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all capitalize"
            style={{
              background: activeTab === tab ? accentColor : "transparent",
              color: activeTab === tab ? "#fff" : "var(--text-secondary)",
            }}
          >
            {tab === "faq" ? "FAQ" : tab === "pricing" ? "Pricing" : "About"}
          </button>
        ))}
      </div>

      {/* FAQ Tab */}
      {activeTab === "faq" && (
        <>
          {/* Search */}
          <div
            className="relative rounded-2xl overflow-hidden mb-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
          >
            <div className="flex items-center gap-3 px-5 py-4">
              <Search className="w-5 h-5 shrink-0" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for answers..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              {searchLoading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: accentColor }} />}
            </div>
          </div>

          {/* Search Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 rounded-2xl overflow-hidden"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
              >
                {searchResults.map((result, i) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      setOpenFAQ(result.id);
                      setSelectedCategory(null);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-3 transition-colors"
                    style={{ borderBottom: i < searchResults.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-highlight)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <ChevronRight className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{result.question}</p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                        {CATEGORY_LABELS[result.category] || result.category}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <motion.button
              onClick={() => setSelectedCategory(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: !selectedCategory ? accentColor : "var(--border-subtle)",
                color: !selectedCategory ? "#fff" : "var(--text-secondary)",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              All
            </motion.button>
            {categories.map(cat => (
              <motion.button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: selectedCategory === cat ? (CATEGORY_COLORS[cat] || accentColor) : "var(--border-subtle)",
                  color: selectedCategory === cat ? "#fff" : "var(--text-secondary)",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {CATEGORY_ICONS[cat] || "📋"} {CATEGORY_LABELS[cat] || cat}
              </motion.button>
            ))}
          </div>

          {/* FAQ List */}
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
            <motion.div variants={listItem}>
              <FloatingWidget className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="h-4 w-4" style={{ color: accentColor }} />
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selectedCategory ? CATEGORY_LABELS[selectedCategory] || selectedCategory : "Frequently Asked Questions"}
                  </h2>
                </div>
                <div>
                  {filteredFAQs.length === 0 ? (
                    <p className="text-sm py-4" style={{ color: "var(--text-muted)" }}>No questions found in this category.</p>
                  ) : (
                    filteredFAQs.map((faq) => (
                      <FAQAccordion
                        key={faq.id}
                        faq={faq}
                        isOpen={openFAQ === faq.id}
                        onToggle={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}
                        accentColor={accentColor}
                      />
                    ))
                  )}
                </div>
              </FloatingWidget>
            </motion.div>

            {/* Popular Questions */}
            {!selectedCategory && (
              <motion.div variants={listItem}>
                <FloatingWidget className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-4 w-4" style={{ color: accentColor }} />
                    <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Popular Questions</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {popularItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setOpenFAQ(item.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-colors"
                        style={{ background: "var(--border-subtle)", border: "1px solid var(--border-subtle)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-highlight)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "var(--border-subtle)")}
                      >
                        <span className="text-base">{CATEGORY_ICONS[item.category] || "📋"}</span>
                        <span className="text-xs font-medium flex-1" style={{ color: "var(--text-secondary)" }}>{item.question}</span>
                        <ArrowRight className="w-3 h-3 shrink-0" style={{ color: "var(--text-muted)" }} />
                      </button>
                    ))}
                  </div>
                </FloatingWidget>
              </motion.div>
            )}
          </motion.div>
        </>
      )}

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <FloatingWidget className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Star className="h-4 w-4" style={{ color: accentColor }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Feature Comparison</h2>
            </div>
            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border-default)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--bg-elevated)" }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>Feature</th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--text-secondary)" }}>Free</th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: accentColor }}>Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {PRICING_FEATURES.map((row) => (
                    <tr key={row.feature} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                      <td className="px-4 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>{row.feature}</td>
                      <td className="px-4 py-2.5 text-center" style={{ color: "var(--text-secondary)" }}>{row.free}</td>
                      <td className="px-4 py-2.5 text-center font-medium" style={{ color: accentColor }}>{row.pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                <strong style={{ color: "var(--text-primary)" }}>Pro pricing:</strong> $9.99/month or $79.99/year. Cancel anytime. All features include a 14-day free trial.
              </p>
            </div>
          </FloatingWidget>
        </motion.div>
      )}

      {/* About Tab */}
      {activeTab === "about" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <FloatingWidget className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4" style={{ color: accentColor }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>About MedNexus</h2>
            </div>
            <div className="space-y-3">
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                MedNexus is an AI-powered medical flashcard study platform. Generate high-quality flashcards from any text, study with spaced repetition, and master medical concepts faster.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "AI Models", value: "GPT-4, Claude, Gemini" },
                  { label: "Study Modes", value: "7 explanation styles" },
                  { label: "Spaced Repetition", value: "SM-2 algorithm" },
                  { label: "Max File Size", value: "50 MB (Pro)" },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                    <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{item.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </FloatingWidget>

          <FloatingWidget className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4" style={{ color: accentColor }} />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Quick Start Guide</h2>
            </div>
            <div className="space-y-2">
              {[
                { step: "1", title: "Create or Generate Cards", desc: "Upload PDFs, paste notes, or create cards manually.", link: "/generate" },
                { step: "2", title: "Organize Your Library", desc: "Group cards into decks and folders by topic.", link: "/library" },
                { step: "3", title: "Study with Spaced Repetition", desc: "Review cards daily using our SM-2 algorithm.", link: "/study" },
                { step: "4", title: "Track Your Progress", desc: "Monitor streaks, mastery, and study time on your dashboard.", link: "/" },
              ].map((item) => (
                <Link
                  key={item.step}
                  to={item.link}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-highlight)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30`, color: accentColor }}
                  >
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>{item.desc}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                </Link>
              ))}
            </div>
          </FloatingWidget>
        </motion.div>
      )}

      {/* Still Need Help */}
      <div className="mt-6">
        <FloatingWidget className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4" style={{ color: accentColor }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Still Need Help?</h2>
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Can't find what you're looking for? Chat with our AI support agent for instant help.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link to="/chat">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-white"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #7C3AED)" }}
              >
                <Send className="h-3.5 w-3.5" />
                Chat with AI Support
              </motion.button>
            </Link>
            <Link to="/">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                style={{ background: "var(--border-subtle)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit Dashboard
              </motion.button>
            </Link>
          </div>
        </FloatingWidget>
      </div>
    </PageTransition>
  );
}

export default function HelpPage() {
  return <SupportPage />;
}
