import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, LayoutDashboard, Library, Sparkles, History, CalendarDays,
  Plus, Play, Settings, Bot, Brain, Stethoscope,
  FileText, Lightbulb, TrendingUp, Camera, Mic, Users, Command, ArrowRight,
} from "lucide-react";
import Fuse from "fuse.js";
import * as api from "../lib/api";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof Search;
  category: "navigation" | "deck" | "action" | "agent" | "settings";
  action: () => void;
  keywords: string[];
}

const NAV_COMMANDS: Omit<CommandItem, "action">[] = [
  { id: "nav-dashboard", label: "Dashboard", description: "Go to your dashboard", icon: LayoutDashboard, category: "navigation", keywords: ["home", "main", "overview"] },
  { id: "nav-library", label: "Library", description: "Browse your decks", icon: Library, category: "navigation", keywords: ["decks", "cards", "browse"] },
  { id: "nav-generate", label: "Generate Cards", description: "Create new flashcards", icon: Sparkles, category: "navigation", keywords: ["create", "ai", "new"] },
  { id: "nav-history", label: "History", description: "View generation history", icon: History, category: "navigation", keywords: ["past", "recent", "log"] },
  { id: "nav-planner", label: "Planner", description: "Study schedule", icon: CalendarDays, category: "navigation", keywords: ["schedule", "plan", "calendar"] },
  { id: "nav-settings", label: "Settings", description: "App preferences", icon: Settings, category: "navigation", keywords: ["preferences", "config", "options"] },
];

const ACTION_COMMANDS: Omit<CommandItem, "action">[] = [
  { id: "action-create-deck", label: "Create New Deck", description: "Start a new deck", icon: Plus, category: "action", keywords: ["new", "add", "deck"] },
  { id: "action-study", label: "Study Now", description: "Start a study session", icon: Play, category: "action", keywords: ["review", "learn", "practice"] },
  { id: "action-generate", label: "Generate Cards from PDF", description: "Upload and generate", icon: Sparkles, category: "action", keywords: ["ai", "create", "pdf"] },
];

const AGENT_COMMANDS: Omit<CommandItem, "action">[] = [
  { id: "agent-chat", label: "Study Buddy", description: "Chat with AI tutor", icon: Bot, category: "agent", keywords: ["chat", "tutor", "ask"] },
  { id: "agent-review", label: "Smart Review", description: "AI-powered review", icon: Brain, category: "agent", keywords: ["review", "smart", "ai"] },
  { id: "agent-exam", label: "Exam Simulator", description: "Practice exams", icon: Stethoscope, category: "agent", keywords: ["exam", "test", "quiz"] },
  { id: "agent-summarize", label: "Summarizer", description: "Summarize notes", icon: FileText, category: "agent", keywords: ["summary", "notes", "condense"] },
  { id: "agent-mnemonics", label: "Mnemonics", description: "Memory aids", icon: Lightbulb, category: "agent", keywords: ["memory", "tricks", "remember"] },
  { id: "agent-coach", label: "Study Coach", description: "Personal coaching", icon: TrendingUp, category: "agent", keywords: ["coach", "guide", "help"] },
  { id: "agent-image", label: "Image Analyzer", description: "Analyze medical images", icon: Camera, category: "agent", keywords: ["image", "photo", "scan"] },
  { id: "agent-voice", label: "Voice Tutor", description: "Voice-based study", icon: Mic, category: "agent", keywords: ["voice", "audio", "speak"] },
  { id: "agent-group", label: "Group Study", description: "Study with others", icon: Users, category: "agent", keywords: ["group", "multiplayer", "friends"] },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const [decks, setDecks] = useState<{ id: number; name: string }[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadDecks = useCallback(async () => {
    if (decks.length > 0) return;
    setLoadingDecks(true);
    try {
      const data = await api.decksApi.list();
      setDecks(data.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name })));
    } catch { /* ignore */ }
    setLoadingDecks(false);
  }, [decks.length]);

  const allCommands: CommandItem[] = useMemo(() => {
    const navItems: CommandItem[] = NAV_COMMANDS.map((item) => ({
      ...item,
      action: () => {
        const routeMap: Record<string, string> = {
          "nav-dashboard": "/",
          "nav-library": "/library",
          "nav-generate": "/generate",
          "nav-history": "/history",
          "nav-planner": "/planner",
          "nav-settings": "/settings",
        };
        navigate(routeMap[item.id] || "/");
        setIsOpen(false);
      },
    }));

    const actionItems: CommandItem[] = ACTION_COMMANDS.map((item) => ({
      ...item,
      action: () => {
        const routeMap: Record<string, string> = {
          "action-create-deck": "/library",
          "action-study": "/study",
          "action-generate": "/generate",
        };
        navigate(routeMap[item.id] || "/");
        setIsOpen(false);
      },
    }));

    const agentItems: CommandItem[] = AGENT_COMMANDS.map((item) => ({
      ...item,
      action: () => {
        const routeMap: Record<string, string> = {
          "agent-chat": "/chat",
          "agent-review": "/smart-review",
          "agent-exam": "/exam",
          "agent-summarize": "/summarize",
          "agent-mnemonics": "/mnemonics",
          "agent-coach": "/coach",
          "agent-image": "/image-analyze",
          "agent-voice": "/voice-study",
          "agent-group": "/group-study",
        };
        navigate(routeMap[item.id] || "/");
        setIsOpen(false);
      },
    }));

    const deckItems: CommandItem[] = decks.map((deck) => ({
      id: `deck-${deck.id}`,
      label: deck.name,
      description: "Open deck",
      icon: Library,
      category: "deck" as const,
      keywords: [deck.name.toLowerCase()],
      action: () => {
        navigate(`/deck/${deck.id}`);
        setIsOpen(false);
      },
    }));

    return [...navItems, ...actionItems, ...agentItems, ...deckItems];
  }, [decks, navigate]);

  const fuse = useMemo(() => new Fuse(allCommands, {
    keys: ["label", "description", "keywords"],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 1,
  }), [allCommands]);

  const results = useMemo(() => {
    if (!query.trim()) {
      const recentIds = new Set(recentItems.slice(0, 5));
      const recent = allCommands.filter((c) => recentIds.has(c.id));
      const rest = allCommands.filter((c) => c.category !== "deck").slice(0, 8 - recent.length);
      return [...recent, ...rest];
    }
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse, allCommands, recentItems]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          loadDecks();
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, loadDecks]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = useCallback((item: CommandItem) => {
    setRecentItems((prev) => {
      const filtered = prev.filter((id) => id !== item.id);
      return [item.id, ...filtered].slice(0, 10);
    });
    item.action();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, results, selectedIndex, handleSelect]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    results.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [results]);

  const categoryLabels: Record<string, string> = {
    navigation: "Navigation",
    action: "Quick Actions",
    agent: "AI Agents",
    deck: "Your Decks",
    settings: "Settings",
  };

  const categoryOrder = ["deck", "navigation", "action", "agent", "settings"];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4"
        onClick={() => setIsOpen(false)}
      >
        <div className="fixed inset-0" style={{ background: 'var(--bg-void)', backdropFilter: 'blur(24px)' }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-xl rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--glass-border-light)",
            boxShadow: "0 24px 48px -12px rgba(0,0,0,0.4), 0 0 80px rgba(6,182,212,0.05)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <Search className="h-5 w-5 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search decks, actions, agents..."
              className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
              autoFocus
            />
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-text-muted" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <Command className="h-3 w-3" />K
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto py-2" style={{ scrollbarWidth: "thin" }}>
            {loadingDecks && (
              <div className="px-5 py-3 text-xs text-text-muted flex items-center gap-2">
                <div className="w-3 h-3 border border-accent-green border-t-transparent rounded-full animate-spin" />
                Loading your decks...
              </div>
            )}

            {categoryOrder.map((category) => {
              const items = groupedResults[category];
              if (!items || items.length === 0) return null;
              return (
                <div key={category}>
                  <div className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {categoryLabels[category]}
                  </div>
                  {items.map((item) => {
                    const globalIndex = results.indexOf(item);
                    const isSelected = globalIndex === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors"
                        style={{
                          background: isSelected ? "rgba(6, 182, 212, 0.08)" : "transparent",
                          borderLeft: isSelected ? "2px solid var(--accent-cyan)" : "2px solid transparent",
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? "rgba(6, 182, 212, 0.15)" : "var(--bg-elevated)",
                            border: `1px solid ${isSelected ? "rgba(6, 182, 212, 0.3)" : "var(--border-subtle)"}`,
                          }}
                        >
                          <item.icon className="h-4 w-4" style={{ color: isSelected ? "var(--accent-cyan)" : "var(--text-secondary)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary truncate">{item.label}</div>
                          {item.description && (
                            <div className="text-xs text-text-muted truncate">{item.description}</div>
                          )}
                        </div>
                        {isSelected && (
                          <ArrowRight className="h-3.5 w-3.5 text-accent-cyan shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {results.length === 0 && (
              <div className="px-5 py-8 text-center">
                <Search className="h-8 w-8 text-text-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-text-muted">No results found for "{query}"</p>
              </div>
            )}
          </div>

          <div className="px-5 py-3 flex items-center gap-4 text-[10px] text-text-muted" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>↵</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded font-mono" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>Esc</kbd>
              Close
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
