import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Plus, AlertCircle, Loader2, BarChart3, BookOpen, Stethoscope, Search, X, FileOutput, Download, Eye, Trash2, FolderTree as FolderTreeIcon, PanelLeftClose, PanelLeft, Layers, Merge, FolderInput } from "lucide-react";
import { useDecks, useQbanks } from "../hooks/useLibraryData";
import { useLibraryFilter, type SortOption } from "../hooks/useLibraryFilter";
import { useExplanationGeneration } from "../hooks/useExplanationGeneration";
import { DeckList } from "../components/library/DeckList";
import { QBankList } from "../components/library/QBankList";
import { AnimatedTabs, Modal } from "../components/ui";
import SummaryTab from "../components/SummaryTab";
import PdfViewer from "../components/library/PdfViewer";
import FolderTree from "../components/library/FolderTree";
import * as api from "../lib/api";

type Tab = "overview" | "decks" | "qbanks" | "summaries";

const glassStyle = {
  background: "var(--glass-card-bg)",
  border: "1px solid var(--glass-border)",
  backdropFilter: "blur(20px)",
} as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Library() {
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  const { decks, loading: decksLoading, deleteDeck, refreshDecks, error: decksError, setError: setDecksError } = useDecks();
  const { qbanks, loading: qbanksLoading, deleteQBank, error: qbanksError, setError: setQbanksError } = useQbanks();
  const { search, setSearch, sortBy, setSortBy, selectedTag, setSelectedTag, filteredDecks, filteredQbanks, allTags } = useLibraryFilter(decks, qbanks);
  const { generatingDecks, explanationProgress, explanationStats, startGeneration } = useExplanationGeneration(decks, refreshDecks);

  const [summaries, setSummaries] = useState<Array<{
    id: string; fileName: string; size: number; createdAt: string; downloadUrl: string; previewUrl: string; sourceDeckIds: number[];
  }>>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [summariesError, setSummariesError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [selectedDecks, setSelectedDecks] = useState<Set<number>>(new Set());
  const [showBulkMerge, setShowBulkMerge] = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkMergeName, setBulkMergeName] = useState("");

  useEffect(() => {
    if (previewId) {
      document.body.classList.add("preview-open");
    } else {
      document.body.classList.remove("preview-open");
    }
    return () => document.body.classList.remove("preview-open");
  }, [previewId]);

  const loading = decksLoading || qbanksLoading;
  const error = decksError || qbanksError;
  const setError = (msg: string | null) => {
    setDecksError(null); setQbanksError(null);
    if (msg) setDecksError(msg);
  };

  const handleGenerateExplanations = async (deckId: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try { await startGeneration(deckId); }
    catch (err) { setError("Failed to start explanation generation"); console.error(err); }
  };

  const totalCards = decks.reduce((sum, d) => sum + (d.cardCount || 0), 0);

  const loadSummaries = async () => {
    setSummariesLoading(true); setSummariesError(null);
    try {
      const result = await api.summaryApi.list();
      setSummaries(result.summaries);
    } catch (err) {
      setSummariesError((err as Error).message);
    } finally {
      setSummariesLoading(false);
    }
  };

  const handleDeleteSummary = async (id: string) => {
    try {
      await api.summaryApi.delete(id);
      setSummaries((prev) => prev.filter((s) => s.id !== id));
      if (previewId === id) setPreviewId(null);
    } catch { /* ignore */ }
  };

  const folderFilteredDecks = selectedFolderId !== null
    ? filteredDecks.filter(d => d.parentId === selectedFolderId)
    : filteredDecks;
  const folderFilteredQbanks = selectedFolderId !== null
    ? filteredQbanks.filter(q => q.parentId === selectedFolderId)
    : filteredQbanks;

  const handleBulkMerge = async () => {
    if (selectedDecks.size < 2 || !bulkMergeName.trim()) return;
    try {
      await api.decksApi.merge(Array.from(selectedDecks), bulkMergeName, true);
      setSelectedDecks(new Set());
      setShowBulkMerge(false);
      setBulkMergeName("");
      await refreshDecks();
    } catch { setError("Failed to merge decks"); }
  };

  const handleBulkDelete = async () => {
    if (selectedDecks.size === 0) return;
    try {
      for (const id of selectedDecks) {
        await api.decksApi.delete(id);
      }
      setSelectedDecks(new Set());
      setShowBulkDelete(false);
      await refreshDecks();
    } catch { setError("Failed to delete decks"); }
  };

  const handleDeckMove = async (deckId: number, targetFolderId: number | null) => {
    try {
      await api.decksApi.move(deckId, targetFolderId);
      await refreshDecks();
    } catch { setError("Failed to move deck"); }
  };

  const tabItems = [
    { id: "overview" as const, label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "decks" as const, label: "Decks", icon: <BookOpen className="h-4 w-4" />, count: decks.length },
    { id: "qbanks" as const, label: "Question Banks", icon: <Stethoscope className="h-4 w-4" />, count: qbanks.length },
    { id: "summaries" as const, label: "Summaries", icon: <FileOutput className="h-4 w-4" />, count: summaries.length },
  ];

  const showSidebar = (tab === "decks" || tab === "qbanks") && sidebarOpen;

  return (
    <div>
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 relative"
      >
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 mb-2"
            >
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-accent-cyan" />
              <span className="text-[10px] font-display font-semibold tracking-[0.2em] uppercase text-accent-cyan">Your Collection</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="font-display text-3xl sm:text-4xl font-bold text-text-primary tracking-tight"
            >
              Library
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-text-secondary text-sm mt-1.5 flex items-center gap-2"
            >
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-accent-blue" />
                {decks.length} decks
              </span>
              <span className="w-1 h-1 rounded-full bg-text-muted" />
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5 text-accent-emerald" />
                {totalCards} cards
              </span>
              <span className="w-1 h-1 rounded-full bg-text-muted" />
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5 text-accent-purple" />
                {qbanks.length} QBanks
              </span>
            </motion.p>
          </div>
          <Link to="/generate">
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 relative overflow-hidden group"
              style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))", boxShadow: "0 4px 24px rgba(6, 182, 212, 0.3), 0 0 60px rgba(6, 182, 212, 0.1)" }}
              data-hover="true"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Plus className="h-4 w-4" /> Create Deck
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-6 flex items-center gap-3 p-4 rounded-2xl overflow-hidden"
            style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
              <AlertCircle className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-sm text-red-400 flex-1 font-medium">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <AnimatedTabs tabs={tabItems} activeTab={tab} onChange={(id) => { setTab(id as Tab); if (id === "summaries") loadSummaries(); }} />
      </motion.div>

      {/* Search & filters for deck/qbank tabs */}
      {tab !== "overview" && tab !== "summaries" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted group-focus-within:text-accent-cyan transition-colors duration-300" />
              <input
                type="text"
                placeholder="Search decks, cards, and tags…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 h-11 rounded-xl text-sm outline-none transition-all duration-300 focus-ring"
                style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
              />
              <AnimatePresence>
                {search && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-11 px-4 rounded-xl text-sm outline-none cursor-pointer transition-all duration-300 hover:border-border-active"
              style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}
            >
              <option value="name">Name (A→Z)</option>
              <option value="created">Date created</option>
              <option value="cards">Card count</option>
              <option value="mastery">Mastery %</option>
            </select>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-11 px-4 rounded-xl flex items-center gap-2 text-sm font-medium transition-all duration-300"
              style={{
                background: sidebarOpen ? "rgba(6, 182, 212, 0.08)" : "var(--glass-input-bg)",
                border: `1px solid ${sidebarOpen ? "rgba(6, 182, 212, 0.2)" : "var(--glass-border-light)"}`,
                color: sidebarOpen ? "var(--accent-cyan)" : "var(--text-secondary)",
                boxShadow: sidebarOpen ? "0 0 20px rgba(6, 182, 212, 0.08)" : "none",
              }}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              <span className="hidden sm:inline">Folders</span>
            </motion.button>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTag(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-300"
                style={!selectedTag ? {
                  background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
                  color: "white",
                  border: "1px solid transparent",
                  boxShadow: "0 2px 12px rgba(6, 182, 212, 0.2)",
                } : {
                  color: "var(--text-secondary)",
                  border: "1px solid var(--glass-border-light)",
                  background: "var(--glass-surface)",
                }}
              >
                All
              </motion.button>
              {allTags.map((tag) => (
                <motion.button
                  key={tag}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-300"
                  style={selectedTag === tag ? {
                    background: "linear-gradient(135deg, var(--accent-purple), var(--accent-violet))",
                    color: "white",
                    border: "1px solid transparent",
                    boxShadow: "0 2px 12px rgba(139, 92, 246, 0.2)",
                  } : {
                    color: "var(--text-secondary)",
                    border: "1px solid var(--glass-border-light)",
                    background: "var(--glass-surface)",
                  }}
                >
                  {tag}
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Loading state */}
      {loading && tab !== "summaries" && (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-8 w-8 text-accent-cyan" />
          </motion.div>
        </div>
      )}

      {/* Overview tab */}
      {!loading && tab === "overview" && <SummaryTab decks={decks} qbanks={qbanks} loading={loading} />}

      {/* Decks tab with sidebar */}
      {!loading && tab === "decks" && (
        <div className="flex gap-6">
          <AnimatePresence>
            {showSidebar && (
              <motion.aside
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 260 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
                className="shrink-0 overflow-hidden"
              >
                <div className="w-[260px] rounded-2xl p-3 sticky top-20" style={glassStyle}>
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <FolderTreeIcon className="h-4 w-4 text-accent-amber" />
                  </div>
                  <FolderTree
                    type="deck"
                    selectedId={selectedFolderId}
                    onSelect={setSelectedFolderId}
                    onMove={handleDeckMove}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <div className="flex-1 min-w-0">
            {selectedFolderId !== null && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 mb-4 text-xs text-text-muted"
              >
                <button onClick={() => setSelectedFolderId(null)} className="hover:text-text-primary transition-colors">All Decks</button>
                <ChevronRight className="h-3 w-3" />
                <span className="text-text-secondary">{decks.find(d => d.id === selectedFolderId)?.name || "Folder"}</span>
              </motion.div>
            )}

            {/* Bulk selection toolbar */}
            <AnimatePresence>
              {selectedDecks.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-4 p-3 rounded-xl flex items-center gap-3 flex-wrap overflow-hidden"
                  style={{ background: "rgba(6, 182, 212, 0.06)", border: "1px solid rgba(6, 182, 212, 0.12)" }}
                >
                  <span className="text-sm font-semibold text-text-primary">{selectedDecks.size} selected</span>
                  <button onClick={() => setSelectedDecks(new Set())} className="text-xs text-text-muted hover:underline">Clear</button>
                  <div className="flex-1" />
                  <button onClick={() => setShowBulkMerge(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-accent-blue hover:bg-[rgba(59,130,246,0.1)] transition-colors flex items-center gap-1">
                    <Merge className="h-3 w-3" /> Merge
                  </button>
                  <button onClick={() => setShowBulkMove(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-accent-purple hover:bg-[rgba(139,92,246,0.1)] transition-colors flex items-center gap-1">
                    <FolderInput className="h-3 w-3" /> Move
                  </button>
                  <button onClick={() => setShowBulkDelete(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-[rgba(239,68,68,0.1)] transition-colors flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <DeckList
              decks={folderFilteredDecks}
              generatingDecks={generatingDecks}
              explanationProgress={explanationProgress}
              explanationStats={explanationStats}
              onGenerateExplanations={handleGenerateExplanations}
              onDelete={deleteDeck}
              selectedDecks={selectedDecks}
              onToggleSelect={(id) => {
                setSelectedDecks(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                });
              }}
            />
          </div>
        </div>
      )}

      {/* QBanks tab with sidebar */}
      {!loading && tab === "qbanks" && (
        <div className="flex gap-6">
          <AnimatePresence>
            {showSidebar && (
              <motion.aside
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 260 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
                className="shrink-0 overflow-hidden"
              >
                <div className="w-[260px] rounded-2xl p-3 sticky top-20" style={glassStyle}>
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <FolderTreeIcon className="h-4 w-4 text-accent-amber" />
                    <span className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Folders</span>
                  </div>
                  <FolderTree
                    type="qbank"
                    selectedId={selectedFolderId}
                    onSelect={setSelectedFolderId}
                    onMove={() => {}}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          <div className="flex-1 min-w-0">
            {selectedFolderId !== null && (
              <div className="flex items-center gap-1.5 mb-4 text-xs text-text-muted">
                <button onClick={() => setSelectedFolderId(null)} className="hover:text-text-primary transition-colors">All QBanks</button>
                <ChevronRight className="h-3 w-3" />
                <span className="text-text-secondary">{qbanks.find(q => q.id === selectedFolderId)?.name || "Folder"}</span>
              </div>
            )}
            <QBankList
              qbanks={folderFilteredQbanks}
              onDelete={deleteQBank}
              glassStyle={glassStyle}
            />
          </div>
        </div>
      )}

      {/* Summaries tab */}
      {tab === "summaries" && (
        <div>
          {summariesLoading && (
            <div className="flex items-center justify-center py-20">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                <Loader2 className="h-8 w-8 text-accent-cyan" />
              </motion.div>
            </div>
          )}
          {summariesError && (
            <div className="flex items-center gap-3 p-4 rounded-2xl mb-6" style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{summariesError}</p>
            </div>
          )}
          {!summariesLoading && !summariesError && summaries.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16 rounded-2xl"
              style={{ background: "var(--glass-card-bg)", border: "2px dashed var(--glass-border-light)", backdropFilter: "blur(20px)" }}
            >
              <FileOutput className="h-16 w-16 text-text-muted mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold text-text-primary mb-2">No Summaries Yet</h3>
              <p className="text-text-secondary max-w-md mx-auto mb-6">Generate a summary PDF from the Generate tab to see it here.</p>
              <Link to="/generate">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-6 py-3 rounded-xl text-white font-semibold text-sm flex items-center gap-2 mx-auto" style={{ background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }} data-hover="true">
                  <Plus className="h-4 w-4" /> Generate Summary
                </motion.button>
              </Link>
            </motion.div>
          )}
          {!summariesLoading && summaries.length > 0 && (
            <div className="space-y-3">
              {summaries.map((summary) => (
                <motion.div key={summary.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4 flex items-center gap-4 group"
                  style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.15)" }}>
                    <FileOutput className="h-6 w-6 text-accent-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{summary.fileName}</p>
                    <p className="text-xs text-text-muted mt-0.5">{formatSize(summary.size)} · {formatDate(summary.createdAt)}</p>
                    {summary.sourceDeckIds && summary.sourceDeckIds.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-[10px] text-text-muted">From:</span>
                        {summary.sourceDeckIds.map(deckId => {
                          const srcDeck = decks.find(d => d.id === deckId);
                          return srcDeck ? (
                            <Link key={deckId} to={`/deck/${deckId}`}
                              className="text-[10px] px-1.5 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                              style={{ background: "rgba(6, 182, 212, 0.1)", color: "var(--accent-cyan)", border: "1px solid rgba(6, 182, 212, 0.15)", maxWidth: 120 }}>
                              {srcDeck.name}
                            </Link>
                          ) : null;
                        })}
      {/* Bulk Move Modal */}
      <Modal isOpen={showBulkMove} onClose={() => setShowBulkMove(false)} title="Move Decks">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Move {selectedDecks.size} decks to a folder.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowBulkMove(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-glass-border transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setPreviewId(summary.id)}
                      className="p-2 rounded-lg" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }} title="Preview">
                      <Eye className="h-4 w-4 text-text-secondary" />
                    </motion.button>
                    <a href={summary.downloadUrl} download={summary.fileName} className="p-2 rounded-lg inline-flex" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }} title="Download">
                      <Download className="h-4 w-4 text-text-secondary" />
                    </a>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteSummary(summary.id)}
                      className="p-2 rounded-lg" style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.15)" }} title="Delete">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {previewId && (() => {
          const summary = summaries.find((s) => s.id === previewId);
          if (!summary) return null;
          return (<PdfViewer url={summary.previewUrl} fileName={summary.fileName} downloadUrl={summary.downloadUrl} onClose={() => setPreviewId(null)} />);
        })()}
      </AnimatePresence>

      {/* Bulk Merge Modal */}
      <Modal isOpen={showBulkMerge} onClose={() => setShowBulkMerge(false)} title="Merge Decks">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Merge {selectedDecks.size} decks into a new deck. All cards will be combined.</p>
          <input type="text" placeholder="New deck name…" value={bulkMergeName} onChange={e => setBulkMergeName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowBulkMerge(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-glass-border transition-colors">Cancel</button>
            <button onClick={handleBulkMerge} disabled={!bulkMergeName.trim() || selectedDecks.size < 2}
              className="px-4 py-2 rounded-lg text-sm bg-accent-blue text-white font-medium disabled:opacity-40">Merge</button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal isOpen={showBulkDelete} onClose={() => setShowBulkDelete(false)} title="Delete Decks?">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Delete {selectedDecks.size} decks? This cannot be undone.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowBulkDelete(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-glass-border transition-colors">Cancel</button>
            <button onClick={handleBulkDelete} className="px-4 py-2 rounded-lg text-sm bg-red-500/90 text-white font-medium hover:bg-red-600">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Bulk Move Modal */}
      <Modal isOpen={showBulkMove} onClose={() => setShowBulkMove(false)} title="Move Decks">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">Move {selectedDecks.size} decks to a folder.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowBulkMove(false)} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:bg-glass-border transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ChevronRight(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
