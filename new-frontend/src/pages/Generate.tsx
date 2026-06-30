import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, FileText, Upload, X, Check, AlertCircle, Loader2,
  Stethoscope, Library, Wand2, ArrowRight, Eye, Save, RefreshCw,
  Trash2, Plus, Brain, WifiOff, FileOutput, Layers, FileStack,
} from "lucide-react";
import ParticleField from "../components/ParticleField";
import * as api from "../lib/api";
import { GlowingInput, GlowingTextarea } from "../components/ui";
import { springTransition, smoothTransition } from "../components/ui/constants";
import AnimatedProgressBar from "../components/AnimatedProgressBar";
import FileUploadZone from "../components/summary/FileUploadZone";
import FileQueueList from "../components/summary/FileQueueList";
import StyleSelector from "../components/summary/StyleSelector";
import SummaryProgressBar from "../components/summary/SummaryProgressBar";
import SummaryResult from "../components/summary/SummaryResult";
import PerFileProgressList from "../components/summary/PerFileProgressList";
import { useSummaryGeneration } from "../hooks/useSummaryGeneration";

type Mode = "deck" | "qbank" | "summary";
type DeckStep = "input" | "processing" | "preview" | "saved";

interface PreviewCard {
  front: string;
  back: string;
  tags?: string[];
  choices?: string[];
  correctIndex?: number;
}

interface DeckFile {
  file: File;
  status: "pending" | "extracting" | "done" | "error";
  progress: number;
  error?: string;
}

const FEATURES = [
  { icon: FileText, title: "From PDFs & Text", desc: "Drop files or paste notes — we turn them into smart cards.", color: "var(--accent-emerald)", bg: "var(--glow-emerald)" },
  { icon: Upload, title: "Multi-File Upload", desc: "Upload multiple PDFs at once for comprehensive study sets.", color: "var(--accent-purple)", bg: "var(--glow-purple)" },
  { icon: Library, title: "Organized Library", desc: "Group cards into topics, subdecks, and study sessions.", color: "var(--accent-cyan)", bg: "var(--glow-cyan)" },
  { icon: Brain, title: "AI Explanations", desc: "Get detailed explanations, mnemonics, and clinical pearls.", color: "var(--accent-amber)", bg: "var(--glow-amber)" },
];

const MODES: { id: Mode; label: string; icon: typeof Sparkles; color: string; gradient: string; shadow: string }[] = [
  { id: "deck", label: "Flashcards", icon: Sparkles, color: "var(--accent-green)", gradient: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", shadow: "var(--glow-cyan)" },
  { id: "qbank", label: "Question Bank", icon: Stethoscope, color: "var(--accent-purple)", gradient: "linear-gradient(135deg, var(--accent-purple), var(--accent-violet))", shadow: "var(--glow-purple)" },
  { id: "summary", label: "Summary", icon: FileOutput, color: "var(--accent-cyan)", gradient: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))", shadow: "var(--glow-cyan)" },
];

export default function Generate() {
  const [mode, setMode] = useState<Mode>("deck");

  // Deck/QBank state
  const [deckStep, setDeckStep] = useState<DeckStep>("input");
  const [deckName, setDeckName] = useState("");
  const [text, setText] = useState("");
  const [cardCount, setCardCount] = useState(10);
  const [deckFiles, setDeckFiles] = useState<DeckFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [savedDeckId, setSavedDeckId] = useState<number | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [overallProgress, setOverallProgress] = useState(0);
  const [usedOfflineFallback, setUsedOfflineFallback] = useState(false);
  const deckFileInputRef = useRef<HTMLInputElement>(null);
  const summaryFileInputRef = useRef<HTMLInputElement>(null);
  const deckCleanupRef = useRef<(() => void) | null>(null);

  // Summary state via hook
  const summary = useSummaryGeneration();

  const isQbank = mode === "qbank";
  const isSummary = mode === "summary";
  const isDeck = mode === "deck";

  const stickySentinelRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const sentinel = stickySentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { rootMargin: "0px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => { deckCleanupRef.current?.(); };
  }, []);

  const activeMode = MODES.find((m) => m.id === mode)!;

  // ── Deck/QBank file handling ──
  const handleDeckFilesSelect = useCallback(async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    const newFiles: DeckFile[] = fileArray.map((file) => ({ file, status: "pending", progress: 0 }));
    setDeckFiles((prev) => [...prev, ...newFiles]);
    setDeckError(null);
    setIsProcessing(true);
    setProgress(["Extracting text from files..."]);
    try {
      setDeckFiles((prev) => prev.map((f, i) => i >= prev.length - fileArray.length ? { ...f, status: "extracting" } : f));
      const result = await api.extractApi.extractPDFsWithProgress(
        fileArray,
        (pct) => {
          setDeckFiles((prev) => prev.map((f, i) => i >= prev.length - fileArray.length ? { ...f, progress: pct } : f));
        },
      );
      setText((prev) => prev + (prev ? "\n\n" : "") + result.text);
      setDeckFiles((prev) => prev.map((f, i) => i >= prev.length - fileArray.length ? { ...f, status: "done", progress: 100 } : f));
      setProgress((prev) => [...prev, `Extracted ${result.wordCount} words from ${result.pageCount} pages across ${result.fileCount} files`]);
    } catch (err) {
      setDeckError((err as Error).message);
      setDeckFiles((prev) => prev.map((f, i) => i >= prev.length - fileArray.length ? { ...f, status: "error", error: (err as Error).message } : f));
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDeckDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleDeckFilesSelect(e.dataTransfer.files);
  }, [handleDeckFilesSelect]);

  const handleDeckDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDeckDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const removeDeckFile = (index: number) => setDeckFiles((prev) => prev.filter((_, i) => i !== index));

  const handleDeckGenerate = async () => {
    if (!text.trim()) { setDeckError("Please enter some text or upload a file"); return; }
    if (!deckName.trim()) { setDeckError("Please enter a deck name"); return; }
    setDeckStep("processing"); setDeckError(null); setProgress(["Starting generation..."]);
    setPreviewCards([]); setOverallProgress(0); setUsedOfflineFallback(false);
    try {
      if (useStreaming) {
        deckCleanupRef.current = api.generateApi.stream(
          { text, deckName, cardCount, deckType: mode as "deck" | "qbank" },
          (event, data) => {
            if (event === "status") { setProgress((p) => [...p, (data as { message: string }).message]); setOverallProgress((p) => Math.min(p + 10, 90)); if ((data as { message: string }).message.includes("offline generator")) setUsedOfflineFallback(true); }
            else if (event === "card") { setPreviewCards((p) => [...p, data as PreviewCard]); setOverallProgress((p) => Math.min(p + 5, 95)); }
            else if (event === "complete") { setSavedDeckId((data as { deck: { id: number } }).deck.id); setUsedOfflineFallback((data as { usedOfflineFallback?: boolean }).usedOfflineFallback || false); setDeckStep("saved"); setOverallProgress(100); }
            else if (event === "error") { setDeckError((data as { message: string }).message); setDeckStep("input"); }
          },
          (err) => { setDeckError(err.message); setDeckStep("input"); }
        );
      } else {
        setProgress(["Generating cards..."]); setOverallProgress(30);
        const result = await api.generateApi.generate({ text, deckName, cardCount, deckType: mode as "deck" | "qbank" });
        setOverallProgress(100); setUsedOfflineFallback(result.usedOfflineFallback || false);
        setPreviewCards(result.cards.map((c) => ({ front: c.front, back: c.back, tags: c.tags ? c.tags.split(",") : undefined, choices: c.choices ? JSON.parse(c.choices) : undefined, correctIndex: c.correctIndex ?? undefined })));
        setSavedDeckId(result.deck.id); setDeckStep("saved");
      }
    } catch (err) { setDeckError((err as Error).message); setDeckStep("input"); }
  };

  const handleDeckReset = () => {
    deckCleanupRef.current?.();
    setDeckStep("input"); setDeckName(""); setText(""); setDeckFiles([]); setDeckError(null); setProgress([]); setPreviewCards([]); setSavedDeckId(null); setOverallProgress(0); setUsedOfflineFallback(false);
  };

  const handleSaveToLibrary = async () => {
    if (previewCards.length === 0) return;
    try {
      setIsProcessing(true);
      const deck = await api.decksApi.create({ name: deckName, kind: mode as "deck" | "qbank" });
      for (const card of previewCards) { await api.cardsApi.create({ deckId: deck.id, front: card.front, back: card.back, tags: card.tags?.join(","), cardType: card.choices ? "mcq" : "basic", choices: card.choices ? JSON.stringify(card.choices) : undefined, correctIndex: card.correctIndex }); }
      setSavedDeckId(deck.id); setDeckStep("saved");
    } catch (err) { setDeckError((err as Error).message); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="relative">
      {/* Hero */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 mb-8 overflow-hidden rounded-3xl">
        <ParticleField />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0" style={{ background: "var(--gradient-mesh)" }} />
        <div className="relative px-6 sm:px-12 lg:px-16 py-12 sm:py-16 text-center">
          <motion.div
            key={mode}
            initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1.4, 0.36, 1] as const }}
            className="relative inline-flex mb-6"
          >
            <div className="absolute -inset-4 rounded-2xl blur-xl animate-gradient-shift" style={{ background: `linear-gradient(135deg, ${activeMode.color}, var(--accent-purple), ${activeMode.color})`, opacity: 0.3 }} />
            <div className="relative h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: activeMode.gradient, boxShadow: `0 8px 30px ${activeMode.shadow}` }}>
              <activeMode.icon className="h-7 w-7" style={{ color: "var(--text-on-accent)" }} />
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.h1 key={mode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight gradient-text mb-3">
              {mode === "summary" ? "Generate Summary" : mode === "qbank" ? "Generate Question Bank" : "Generate Flashcards"}
            </motion.h1>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.p key={`sub-${mode}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }} className="text-text-secondary text-base sm:text-lg max-w-lg mx-auto mb-8">
              {mode === "summary" ? "Upload files, extract text, and generate a styled PDF summary with AI." : mode === "qbank" ? "Drop PDFs or paste notes — we build vignette MCQs with full explanations." : "Turn any PDF, text, or topic into a polished study deck in seconds."}
            </motion.p>
          </AnimatePresence>

          {/* Mode Toggle — 3 tabs (inside hero, scrolls away) */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="inline-flex p-1 rounded-2xl relative gap-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--glass-border-light)", backdropFilter: "blur(20px)" }}>
            {MODES.map((m) => {
              const isActive = mode === m.id;
              return (
                <button key={m.id} onClick={() => setMode(m.id)} className={`relative z-10 flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 ${isActive ? "text-[var(--text-on-accent)]" : "text-text-secondary hover:text-text-primary"}`}>
                  {isActive && (
                    <motion.div layoutId="generate-mode-pill" className="absolute inset-0 rounded-xl" style={{ background: m.gradient, boxShadow: `0 4px 20px ${m.shadow}` }} transition={springTransition} />
                  )}
                  <m.icon className="relative h-4 w-4" />
                  <span className="relative hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </motion.div>
        </div>
      </div>

      {/* Sticky sentinel — detects when hero scrolls out of view */}
      <div ref={stickySentinelRef} className="absolute left-0 right-0 h-1 pointer-events-none" style={{ top: 0 }} />

      {/* Sticky centered tabs — clean, no background box */}
      <div
        className="z-30 transition-all duration-500"
        style={{
          position: isSticky ? "fixed" : "absolute",
          top: isSticky ? 64 : "auto",
          left: isSticky ? 0 : undefined,
          right: isSticky ? 0 : undefined,
          opacity: isSticky ? 1 : 0,
          pointerEvents: isSticky ? "auto" : "none",
          transform: isSticky ? "translateY(0)" : "translateY(-12px)",
        }}
      >
        <div className="flex justify-center pt-3 pb-3">
          <div className="inline-flex p-1 rounded-2xl relative gap-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--glass-border-light)", backdropFilter: "blur(20px)" }}>
            {MODES.map((m) => {
              const isActive = mode === m.id;
              return (
                <button key={m.id} onClick={() => setMode(m.id)} className={`relative z-10 flex items-center gap-1.5 px-5 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 ${isActive ? "text-[var(--text-on-accent)]" : "text-text-secondary hover:text-text-primary"}`}>
                  {isActive && (
                    <motion.div layoutId="generate-mode-pill-sticky" className="absolute inset-0 rounded-xl" style={{ background: m.gradient, boxShadow: `0 4px 20px ${m.shadow}` }} transition={springTransition} />
                  )}
                  <m.icon className="relative h-4 w-4" />
                  <span className="relative">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spacer to prevent content jump when tabs become fixed */}
      {isSticky && <div style={{ height: 56 }} />}

      {/* Features — only for deck mode */}
      <AnimatePresence mode="wait">
        {isDeck && (
          <motion.div key="features-deck" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="grid grid-cols-2 gap-4 mb-8">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }, idx) => (
              <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + idx * 0.08, ...springTransition }} whileHover={{ y: -4 }} className="rounded-2xl p-5 card-hover" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }} data-hover="true">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg, boxShadow: `0 0 10px ${color}15` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <p className="font-semibold text-sm text-text-primary mb-1">{title}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
        {isQbank && (
          <motion.div key="features-qbank" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }} className="mb-8">
            <motion.button whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} className="w-full rounded-2xl overflow-hidden text-left relative" style={{ border: "1px solid rgba(139, 92, 246, 0.2)" }} data-hover="true">
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(167, 139, 250, 0.1))" }} />
              <div className="relative flex items-center gap-4 p-6">
                <div className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, var(--accent-purple), var(--accent-violet))", boxShadow: "0 4px 20px rgba(139, 92, 246, 0.25)" }}>
                  <Stethoscope className="h-7 w-7 text-[var(--text-on-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-text-primary">Build a Question Bank</p>
                  <p className="text-sm text-text-secondary mt-0.5">Vignette MCQs with full distractors and detailed explanations.</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-accent-purple" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Mode Content (full-width, single panel) ── */}
      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════════════════════
            FLASHCARDS PANEL
            ═══════════════════════════════════════════════════════════ */}
        {isDeck && (
          <motion.div key="deck-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={smoothTransition}>
            {deckStep === "input" && (
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.15)" }}>
                    <Sparkles className="h-5 w-5 text-accent-green" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-text-primary">Build Flashcards with AI</h3>
                    <p className="text-xs text-text-secondary">Upload files, paste notes, or both.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <GlowingInput label="Deck Name" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="e.g. Cardiology Basics" />
                    <GlowingInput label="Number of Cards" type="number" value={cardCount} onChange={(e) => setCardCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))} min={1} max={50} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Upload Files (Optional)</label>
                    <div onDrop={handleDeckDrop} onDragOver={handleDeckDragOver} onDragLeave={handleDeckDragLeave} onClick={() => deckFileInputRef.current?.click()} className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging ? "border-accent-green bg-[rgba(6,182,212,0.05)]" : "border-glass-border hover:border-glass-border-light"}`}>
                      <input ref={deckFileInputRef} type="file" accept=".pdf,.txt,.md,.doc,.docx" multiple onChange={(e) => e.target.files && handleDeckFilesSelect(e.target.files)} className="hidden" />
                      <Upload className="h-8 w-8 text-text-secondary mx-auto mb-2" />
                      <p className="text-sm text-text-secondary">Drag & drop files here, or <span className="text-accent-green">browse</span></p>
                      <p className="text-xs text-text-muted mt-1">PDF, TXT, MD up to 50MB each</p>
                    </div>
                    <AnimatePresence>
                      {deckFiles.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2">
                          {deckFiles.map((f, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
                              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: f.status === "done" ? "rgba(16,185,129,0.1)" : f.status === "error" ? "rgba(239,68,68,0.1)" : "rgba(6,182,212,0.1)" }}>
                                {f.status === "done" ? <Check className="h-4 w-4 text-accent-emerald" /> : f.status === "error" ? <AlertCircle className="h-4 w-4 text-red-400" /> : f.status === "extracting" ? <Loader2 className="h-4 w-4 text-accent-green animate-spin" /> : <FileText className="h-4 w-4 text-text-secondary" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-text-primary truncate">{f.file.name}</p>
                                  {f.status === "extracting" && <span className="text-xs font-mono text-accent-green shrink-0">{f.progress}%</span>}
                                </div>
                                {(f.status === "extracting" || f.status === "pending") && (
                                  <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ background: "linear-gradient(90deg, var(--accent-green), var(--accent-blue))" }}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${f.progress}%` }}
                                      transition={{ duration: 0.3 }}
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-text-secondary mt-0.5">{(f.file.size / 1024).toFixed(1)} KB {f.status === "done" && "• Extracted"}</p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); removeDeckFile(idx); }} className="p-1 rounded-lg hover:bg-glass-surface"><X className="h-4 w-4 text-text-secondary" /></button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <GlowingTextarea label="Or Paste Your Content" value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Paste your notes, textbook content, or any text you want to generate cards from..." />
                  <p className="text-xs text-text-muted">{text.length} characters</p>

                  <div className="flex items-center gap-3">
                    <button onClick={() => setUseStreaming(!useStreaming)} className="relative w-12 h-6 rounded-full transition-colors" style={{ background: useStreaming ? "var(--accent-green)" : "var(--glass-border)", border: "1px solid var(--glass-border-light)" }}>
                      <motion.div className="absolute top-0.5 w-5 h-5 rounded-full bg-white" animate={{ x: useStreaming ? 26 : 2 }} transition={springTransition} style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
                    </button>
                    <span className="text-sm text-text-secondary">Enable streaming preview</span>
                  </div>

                  <AnimatePresence>
                    {deckError && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                        <p className="text-sm text-red-400">{deckError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.99 }} onClick={handleDeckGenerate} disabled={isProcessing || !text.trim() || !deckName.trim()} className="w-full py-3.5 rounded-xl text-[var(--text-on-accent)] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 4px 20px rgba(6,182,212,0.25)" }} data-hover="true">
                    {isProcessing ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</> : <><Wand2 className="h-5 w-5" /> Generate Flashcards</>}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {deckStep === "processing" && (
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <div className="text-center mb-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="inline-flex mb-4"><Loader2 className="h-12 w-12 text-accent-green" /></motion.div>
                  <h3 className="font-display text-xl font-semibold text-text-primary mb-2">Generating Your Flashcards</h3>
                  <p className="text-sm text-text-secondary">This may take a moment...</p>
                </div>
                <div className="mb-6"><AnimatedProgressBar progress={overallProgress} isProcessing={true} color="var(--accent-green)" /></div>
                <div className="space-y-2 mb-6">
                  {progress.map((msg, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-accent-emerald shrink-0" /><span className="text-text-secondary">{msg}</span>
                    </motion.div>
                  ))}
                </div>
                {previewCards.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-3">Generated {previewCards.length} cards so far...</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {previewCards.map((card, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
                          <p className="text-sm font-medium text-text-primary line-clamp-2">{card.front}</p>
                          <p className="text-xs text-text-secondary mt-1 line-clamp-1">{card.back}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {deckStep === "preview" && (
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-text-primary">Preview Your Cards</h3>
                    <p className="text-sm text-text-secondary">{previewCards.length} cards generated</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDeckReset} className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border-light)", color: "var(--text-secondary)" }}><RefreshCw className="h-4 w-4" /> Start Over</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSaveToLibrary} disabled={isProcessing} className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-[var(--text-on-accent)]" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>{isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save to Library</motion.button>
                  </div>
                </div>
                <div className="space-y-4">
                  {previewCards.map((card, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="p-5 rounded-xl" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <span className="text-xs font-medium text-text-muted">#{idx + 1}</span>
                        <button onClick={() => setPreviewCards((p) => p.filter((_, i) => i !== idx))} className="p-1 rounded-lg hover:bg-[rgba(239,68,68,0.1)]"><Trash2 className="h-4 w-4 text-red-400" /></button>
                      </div>
                      <div className="space-y-3">
                        <div><label className="text-xs font-medium text-text-muted mb-1 block">Front</label><textarea value={card.front} onChange={(e) => setPreviewCards((p) => p.map((c, i) => i === idx ? { ...c, front: e.target.value } : c))} rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} /></div>
                        <div><label className="text-xs font-medium text-text-muted mb-1 block">Back</label><textarea value={card.back} onChange={(e) => setPreviewCards((p) => p.map((c, i) => i === idx ? { ...c, back: e.target.value } : c))} rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} /></div>
                        {card.choices && (
                          <div><label className="text-xs font-medium text-text-muted mb-1 block">Choices</label>
                            <div className="space-y-1">{card.choices.map((choice, cidx) => (<div key={cidx} className={`px-3 py-1.5 rounded-lg text-sm ${cidx === card.correctIndex ? "bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-accent-emerald" : "bg-glass-surface border border-glass-border text-text-secondary"}`}>{String.fromCharCode(65 + cidx)}. {choice}</div>))}</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {deckStep === "saved" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl p-8 text-center relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid rgba(16, 185, 129, 0.2)", backdropFilter: "blur(20px)" }}>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="inline-flex mb-6"><div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "rgba(16, 185, 129, 0.15)" }}><Check className="h-8 w-8 text-accent-emerald" /></div></motion.div>
                <h3 className="font-display text-2xl font-semibold text-text-primary mb-2">Flashcards Saved!</h3>
                <p className="text-text-secondary mb-2">Your {previewCards.length} cards have been saved to your library.</p>
                {usedOfflineFallback && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl flex items-center gap-3 justify-center" style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}><WifiOff className="h-5 w-5 text-accent-amber shrink-0" /><p className="text-sm text-accent-amber">Generated using offline mode. For AI-powered cards, please check your API key configuration.</p></motion.div>}
                <div className="flex justify-center gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => (window.location.href = `/deck/${savedDeckId}`)} className="px-6 py-3 rounded-xl text-[var(--text-on-accent)] font-medium flex items-center gap-2" style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}><Eye className="h-5 w-5" /> View in Library</motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDeckReset} className="px-6 py-3 rounded-xl font-medium flex items-center gap-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}><Plus className="h-5 w-5" /> Create Another</motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            QUESTION BANK PANEL
            ═══════════════════════════════════════════════════════════ */}
        {isQbank && (
          <motion.div key="qbank-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={smoothTransition}>
            {deckStep === "input" && (
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139, 92, 246, 0.12)", border: "1px solid rgba(139, 92, 246, 0.2)" }}>
                    <Stethoscope className="h-5 w-5 text-accent-purple" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-text-primary">Build a Question Bank</h3>
                    <p className="text-xs text-text-secondary">Upload PDFs, paste notes, or both.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <GlowingInput label="Question Bank Name" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="e.g. Cardiology MCQs" />
                    <GlowingInput label="Number of Questions" type="number" value={cardCount} onChange={(e) => setCardCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))} min={1} max={50} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Upload Files (Optional)</label>
                    <div onDrop={handleDeckDrop} onDragOver={handleDeckDragOver} onDragLeave={handleDeckDragLeave} onClick={() => deckFileInputRef.current?.click()} className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging ? "border-[var(--accent-purple)] bg-[var(--glow-purple)]" : "border-glass-border hover:border-glass-border-light"}`}>
                      <input ref={deckFileInputRef} type="file" accept=".pdf,.txt,.md,.doc,.docx" multiple onChange={(e) => e.target.files && handleDeckFilesSelect(e.target.files)} className="hidden" />
                      <Upload className="h-8 w-8 text-text-secondary mx-auto mb-2" />
                      <p className="text-sm text-text-secondary">Drag & drop files here, or <span className="text-accent-purple">browse</span></p>
                      <p className="text-xs text-text-muted mt-1">PDF, TXT, MD up to 50MB each</p>
                    </div>
                    <AnimatePresence>
                      {deckFiles.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-2">
                          {deckFiles.map((f, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
                              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: f.status === "done" ? "var(--glow-emerald)" : f.status === "error" ? "var(--glow-primary)" : "var(--glow-purple)" }}>
                                {f.status === "done" ? <Check className="h-4 w-4 text-accent-emerald" /> : f.status === "error" ? <AlertCircle className="h-4 w-4 text-red-400" /> : f.status === "extracting" ? <Loader2 className="h-4 w-4 text-accent-purple animate-spin" /> : <FileText className="h-4 w-4 text-text-secondary" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium text-text-primary truncate">{f.file.name}</p>
                                  {f.status === "extracting" && <span className="text-xs font-mono text-accent-purple shrink-0">{f.progress}%</span>}
                                </div>
                                {(f.status === "extracting" || f.status === "pending") && (
                                  <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-border)" }}>
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ background: "linear-gradient(90deg, var(--accent-purple), var(--accent-violet))" }}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${f.progress}%` }}
                                      transition={{ duration: 0.3 }}
                                    />
                                  </div>
                                )}
                                <p className="text-xs text-text-secondary mt-0.5">{(f.file.size / 1024).toFixed(1)} KB {f.status === "done" && "• Extracted"}</p>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); removeDeckFile(idx); }} className="p-1 rounded-lg hover:bg-glass-surface"><X className="h-4 w-4 text-text-secondary" /></button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <GlowingTextarea label="Or Paste Your Content" value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Paste your notes, textbook content, or any text you want to generate questions from..." />
                  <p className="text-xs text-text-muted">{text.length} characters</p>

                  <div className="flex items-center gap-3">
                    <button onClick={() => setUseStreaming(!useStreaming)} className="relative w-12 h-6 rounded-full transition-colors" style={{ background: useStreaming ? "var(--accent-purple)" : "var(--glass-border)", border: "1px solid var(--glass-border-light)" }}>
                      <motion.div className="absolute top-0.5 w-5 h-5 rounded-full bg-white" animate={{ x: useStreaming ? 26 : 2 }} transition={springTransition} style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
                    </button>
                    <span className="text-sm text-text-secondary">Enable streaming preview</span>
                  </div>

                  <AnimatePresence>
                    {deckError && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                        <p className="text-sm text-red-400">{deckError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.99 }} onClick={handleDeckGenerate} disabled={isProcessing || !text.trim() || !deckName.trim()} className="w-full py-3.5 rounded-xl text-[var(--text-on-accent)] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: "var(--gradient-cta)", boxShadow: "0 4px 20px var(--glow-primary)" }} data-hover="true">
                    {isProcessing ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</> : <><Wand2 className="h-5 w-5" /> Generate Question Bank</>}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {deckStep === "processing" && (
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <div className="text-center mb-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="inline-flex mb-4"><Loader2 className="h-12 w-12 text-accent-purple" /></motion.div>
                  <h3 className="font-display text-xl font-semibold text-text-primary mb-2">Generating Your Question Bank</h3>
                  <p className="text-sm text-text-secondary">This may take a moment...</p>
                </div>
                <div className="mb-6"><AnimatedProgressBar progress={overallProgress} isProcessing={true} color="var(--accent-purple)" /></div>
                <div className="space-y-2 mb-6">
                  {progress.map((msg, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-accent-emerald shrink-0" /><span className="text-text-secondary">{msg}</span>
                    </motion.div>
                  ))}
                </div>
                {previewCards.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-3">Generated {previewCards.length} questions so far...</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {previewCards.map((card, idx) => (
                        <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
                          <p className="text-sm font-medium text-text-primary line-clamp-2">{card.front}</p>
                          <p className="text-xs text-text-secondary mt-1 line-clamp-1">{card.back}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {deckStep === "preview" && (
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-xl font-semibold text-text-primary">Preview Your Questions</h3>
                    <p className="text-sm text-text-secondary">{previewCards.length} questions generated</p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDeckReset} className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border-light)", color: "var(--text-secondary)" }}><RefreshCw className="h-4 w-4" /> Start Over</motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSaveToLibrary} disabled={isProcessing} className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 text-[var(--text-on-accent)]" style={{ background: "linear-gradient(135deg, var(--accent-purple), var(--accent-violet))" }}>{isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save to Library</motion.button>
                  </div>
                </div>
                <div className="space-y-4">
                  {previewCards.map((card, idx) => (
                    <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="p-5 rounded-xl" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <span className="text-xs font-medium text-text-muted">#{idx + 1}</span>
                        <button onClick={() => setPreviewCards((p) => p.filter((_, i) => i !== idx))} className="p-1 rounded-lg hover:bg-[rgba(239,68,68,0.1)]"><Trash2 className="h-4 w-4 text-red-400" /></button>
                      </div>
                      <div className="space-y-3">
                        <div><label className="text-xs font-medium text-text-muted mb-1 block">Front</label><textarea value={card.front} onChange={(e) => setPreviewCards((p) => p.map((c, i) => i === idx ? { ...c, front: e.target.value } : c))} rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} /></div>
                        <div><label className="text-xs font-medium text-text-muted mb-1 block">Back</label><textarea value={card.back} onChange={(e) => setPreviewCards((p) => p.map((c, i) => i === idx ? { ...c, back: e.target.value } : c))} rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)", color: "var(--text-primary)" }} /></div>
                        {card.choices && (
                          <div><label className="text-xs font-medium text-text-muted mb-1 block">Choices</label>
                            <div className="space-y-1">{card.choices.map((choice, cidx) => (<div key={cidx} className={`px-3 py-1.5 rounded-lg text-sm ${cidx === card.correctIndex ? "bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-accent-emerald" : "bg-glass-surface border border-glass-border text-text-secondary"}`}>{String.fromCharCode(65 + cidx)}. {choice}</div>))}</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {deckStep === "saved" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl p-8 text-center relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid rgba(139, 92, 246, 0.2)", backdropFilter: "blur(20px)" }}>
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="inline-flex mb-6"><div className="h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "rgba(139, 92, 246, 0.15)" }}><Check className="h-8 w-8 text-accent-purple" /></div></motion.div>
                <h3 className="font-display text-2xl font-semibold text-text-primary mb-2">Question Bank Saved!</h3>
                <p className="text-text-secondary mb-2">Your {previewCards.length} questions have been saved to your library.</p>
                {usedOfflineFallback && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl flex items-center gap-3 justify-center" style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.2)" }}><WifiOff className="h-5 w-5 text-accent-amber shrink-0" /><p className="text-sm text-accent-amber">Generated using offline mode. For AI-powered questions, please check your API key configuration.</p></motion.div>}
                <div className="flex justify-center gap-3">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => (window.location.href = `/deck/${savedDeckId}`)} className="px-6 py-3 rounded-xl text-[var(--text-on-accent)] font-medium flex items-center gap-2" style={{ background: "linear-gradient(135deg, var(--accent-purple), var(--accent-violet))" }}><Eye className="h-5 w-5" /> View in Library</motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleDeckReset} className="px-6 py-3 rounded-xl font-medium flex items-center gap-2" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}><Plus className="h-5 w-5" /> Create Another</motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SUMMARY PANEL
            ═══════════════════════════════════════════════════════════ */}
        {isSummary && (
          <motion.div key="summary-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={smoothTransition}>
            <AnimatePresence mode="wait">
              {summary.step === "upload" && (
                <motion.div key="sum-upload" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.15)" }}>
                      <FileOutput className="h-5 w-5 text-accent-cyan" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-text-primary">Generate Summary PDF</h3>
                      <p className="text-xs text-text-secondary">Upload files, extract text, and generate a styled PDF summary.</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <FileUploadZone onFilesSelected={summary.addFiles} />
                    <FileQueueList files={summary.files} onRemove={summary.removeFile} onAddMore={() => summaryFileInputRef.current?.click()} />
                    <input
                      ref={summaryFileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.pptx,.ppt,.xlsx,.xls,.csv,.txt,.md,.docx"
                      multiple
                      onChange={(e) => { if (e.target.files) summary.addFiles(Array.from(e.target.files)); e.target.value = ""; }}
                      className="hidden"
                    />
                    {summary.files.length > 0 && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                        <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={summary.uploadFiles} className="px-6 py-3 rounded-xl text-[var(--text-on-accent)] font-semibold flex items-center gap-2" style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }} data-hover="true">
                          Continue <ArrowRight className="h-4 w-4" />
                        </motion.button>
                      </motion.div>
                    )}
                  </div>
                  <AnimatePresence>{summary.error && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3 p-4 rounded-xl mt-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}><AlertCircle className="h-5 w-5 shrink-0 text-red-400" /><p className="text-sm text-red-400">{summary.error}</p></motion.div>)}</AnimatePresence>
                </motion.div>
              )}

              {summary.step === "mode" && (
                <motion.div key="sum-mode" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.15)" }}>
                      <FileOutput className="h-5 w-5 text-accent-cyan" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-text-primary">Choose Generation Mode</h3>
                      <p className="text-xs text-text-secondary">How do you want your summaries generated?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { summary.setGenerationMode("combined"); summary.setStep("style"); }}
                      className="relative rounded-2xl p-5 text-left transition-all"
                      style={{
                        background: summary.generationMode === "combined" ? "rgba(6, 182, 212, 0.08)" : "var(--glass-surface)",
                        border: `2px solid ${summary.generationMode === "combined" ? "var(--accent-cyan)" : "var(--glass-border)"}`,
                      }}
                    >
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.2)" }}>
                        <FileStack className="h-5 w-5 text-accent-cyan" />
                      </div>
                      <p className="text-sm font-semibold text-text-primary mb-1">Combined Summary</p>
                      <p className="text-xs text-text-secondary leading-relaxed">Merge all files into a single PDF with one unified summary.</p>
                      {summary.generationMode === "combined" && (
                        <motion.div layoutId="mode-check" className="absolute top-3 right-3"><Check className="h-5 w-5 text-accent-cyan" /></motion.div>
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { summary.setGenerationMode("separate"); summary.setStep("style"); }}
                      className="relative rounded-2xl p-5 text-left transition-all"
                      style={{
                        background: summary.generationMode === "separate" ? "rgba(139, 92, 246, 0.08)" : "var(--glass-surface)",
                        border: `2px solid ${summary.generationMode === "separate" ? "var(--accent-purple)" : "var(--glass-border)"}`,
                      }}
                    >
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)" }}>
                        <Layers className="h-5 w-5 text-accent-purple" />
                      </div>
                      <p className="text-sm font-semibold text-text-primary mb-1">Separate Summaries</p>
                      <p className="text-xs text-text-secondary leading-relaxed">Generate individual PDFs for each file with per-file progress.</p>
                      {summary.generationMode === "separate" && (
                        <motion.div layoutId="mode-check" className="absolute top-3 right-3"><Check className="h-5 w-5 text-accent-purple" /></motion.div>
                      )}
                    </motion.button>
                  </div>

                    <div className="flex justify-between">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { summary.setStep("upload"); }} className="px-5 py-3 rounded-xl font-medium text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}>
                      <span className="flex items-center gap-2"><ArrowRight className="h-4 w-4 rotate-180" /> Back</span>
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => summary.setStep("style")} className="px-5 py-3 rounded-xl font-medium text-sm text-[var(--text-on-accent)]" style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }}>
                      <span className="flex items-center gap-2">Continue <ArrowRight className="h-4 w-4" /></span>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {summary.step === "style" && (
                <motion.div key="sum-style" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.15)" }}>
                      <FileOutput className="h-5 w-5 text-accent-cyan" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-text-primary">Choose Style & Generate</h3>
                      <p className="text-xs text-text-secondary">
                        Mode: <span className="font-medium" style={{ color: summary.generationMode === "separate" ? "var(--accent-purple)" : "var(--accent-cyan)" }}>{summary.generationMode === "separate" ? "Separate PDFs" : "Combined PDF"}</span> · Select a style template.
                      </p>
                    </div>
                  </div>
                  <StyleSelector selectedStyle={summary.selectedStyle} onSelect={summary.setSelectedStyle} />
                  <div className="flex justify-end gap-3 mt-6">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { summary.setStep("mode"); }} className="px-5 py-3 rounded-xl font-medium text-sm" style={{ background: "var(--bg-elevated)", border: "1px solid var(--glass-border)", color: "var(--text-secondary)" }}>Back</motion.button>
                    <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={async () => { const uploaded = summary.files.filter((f) => f.status === "uploaded" && f.serverId); if (uploaded.length > 0) await summary.generateAndStream(uploaded.map((f) => f.serverId!), summary.selectedStyle, summary.generationMode); }} className="px-6 py-3 rounded-xl text-[var(--text-on-accent)] font-semibold flex items-center gap-2" style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }} data-hover="true"><Wand2 className="h-4 w-4" /> {summary.generationMode === "separate" ? "Generate Summaries" : "Generate Summary"}</motion.button>
                  </div>
                  <AnimatePresence>{summary.error && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3 p-4 rounded-xl mt-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}><AlertCircle className="h-5 w-5 shrink-0 text-red-400" /><p className="text-sm text-red-400">{summary.error}</p></motion.div>)}</AnimatePresence>
                </motion.div>
              )}

              {summary.step === "processing" && (
                <motion.div key="sum-processing" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                  <div className="text-center mb-8">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="inline-flex mb-4"><Loader2 className="h-12 w-12 text-accent-cyan" /></motion.div>
                    <h3 className="font-display text-xl font-semibold text-text-primary mb-2">
                      {summary.generationMode === "separate" ? "Generating Your Summaries" : "Generating Your Summary"}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {summary.generationMode === "separate"
                        ? `Processing ${summary.files.filter((f) => f.status === "uploaded").length} files individually...`
                        : `Processing ${summary.files.filter((f) => f.status === "uploaded").length} files — each file gets its own AI summary...`}
                    </p>
                  </div>
                  <SummaryProgressBar progress={summary.progress} isProcessing={true} />
                  {summary.fileProgress.length > 0 && (
                    <div className="mt-8">
                      <PerFileProgressList files={summary.fileProgress} isProcessing={true} />
                    </div>
                  )}
                  <AnimatePresence>{summary.error && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-3 p-4 rounded-xl mt-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}><AlertCircle className="h-5 w-5 shrink-0 text-red-400" /><p className="text-sm text-red-400">{summary.error}</p></motion.div>)}</AnimatePresence>
                </motion.div>
              )}

              {summary.step === "result" && summary.jobId && (
                <motion.div key="sum-result" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }}>
                  <SummaryResult
                    pdfUrl={summary.generatedPdfUrl}
                    jobId={summary.jobId}
                    onReset={summary.reset}
                    mode={summary.generationMode}
                    fileProgress={summary.fileProgress}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
