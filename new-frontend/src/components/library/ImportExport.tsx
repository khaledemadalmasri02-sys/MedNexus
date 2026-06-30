import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Download, X, AlertCircle, Loader2,
  FileSpreadsheet, FileJson, FileCode, ChevronDown, ChevronUp,
} from "lucide-react";
import * as api from "../../lib/api";
import { GlowingInput } from "../ui/index.tsx";

interface ImportExportHubProps {
  deckId?: number;
  deckName?: string;
}

interface ParsedCard {
  front: string;
  back: string;
  cardType: string;
  tags: string;
  error?: string;
}

type ImportStep = "upload" | "preview" | "importing" | "done";

export default function ImportExportHub({ deckId, deckName }: ImportExportHubProps) {
  const [activeTab, setActiveTab] = useState<"import" | "export">(deckId ? "import" : "import");
  const [dragOver, setDragOver] = useState(false);
  const [rawText, setRawText] = useState("");
  const [parseFormat, setParseFormat] = useState<string>("");
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([]);
  const [parseStep, setParseStep] = useState<ImportStep>("upload");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetDeckName, setTargetDeckName] = useState(deckName || "");
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [decks, setDecks] = useState<api.Deck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(deckId || null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const loadDecks = useCallback(async () => {
    try {
      const data = await api.decksApi.list();
      setDecks(data);
    } catch { /* ignore */ }
  }, []);

  const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawText(text);
      // Auto-detect format
      if (file.name.endsWith(".json")) setParseFormat("json");
      else if (file.name.endsWith(".tsv")) setParseFormat("tsv");
      else if (file.name.endsWith(".csv")) setParseFormat("csv");
      else setParseFormat("text");
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }, [handleFileRead]);

  const handleParse = useCallback(async () => {
    if (!rawText.trim()) return;
    setError(null);
    try {
      const result = await api.importExportApi.parse(rawText, parseFormat || undefined);
      setParsedCards(result.cards);
      setParseStep("preview");
    } catch (err) {
      setError((err as Error).message || "Failed to parse file");
    }
  }, [rawText, parseFormat]);

  const handleImport = useCallback(async () => {
    const targetId = selectedDeckId;
    if (!targetId && !targetDeckName.trim()) {
      setError("Select a target deck or enter a new deck name");
      return;
    }

    setParseStep("importing");
    setError(null);

    try {
      let finalDeckId = targetId;
      if (!finalDeckId) {
        const newDeck = await api.decksApi.create({ name: targetDeckName.trim() });
        finalDeckId = newDeck.id;
      }

      const validCards = parsedCards.filter(c => !c.error);
      const result = await api.importExportApi.importToDeck(finalDeckId, validCards, skipDuplicates);
      setImportResult(result);
      setParseStep("done");
    } catch (err) {
      setError((err as Error).message || "Failed to import cards");
      setParseStep("preview");
    }
  }, [selectedDeckId, targetDeckName, parsedCards, skipDuplicates]);

  const handleExport = useCallback(async (format: "csv" | "json" | "md") => {
    const targetId = selectedDeckId;
    if (!targetId) { setError("Select a deck to export"); return; }
    try {
      const result = await api.decksApi.export(targetId);
      let content: string;
      let mimeType: string;
      let ext: string;

      if (format === "json") {
        content = JSON.stringify(result, null, 2);
        mimeType = "application/json";
        ext = "json";
      } else if (format === "md") {
        const lines = (result as unknown as { csv: string }).csv.split("\n").map((line: string, i: number) => {
          const parts = line.split("\t");
          return `## Card ${i + 1}\n\n**Q:** ${parts[0]}\n\n**A:** ${parts[1] || ""}\n\n---`;
        });
        content = `# ${deckName || "Deck"}\n\n${lines.join("\n\n")}`;
        mimeType = "text/markdown";
        ext = "md";
      } else {
        content = (result as unknown as { csv: string }).csv;
        mimeType = "text/csv";
        ext = "csv";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deckName || "deck"}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message || "Failed to export");
    }
  }, [selectedDeckId, deckName]);

  const validCards = parsedCards.filter(c => !c.error);
  const invalidCards = parsedCards.filter(c => !!c.error);

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="inline-flex items-center gap-1 p-1 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
        <button onClick={() => { setActiveTab("import"); setParseStep("upload"); setParsedCards([]); setImportResult(null); setError(null); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === "import" ? "text-white" : "text-text-secondary"}`}
          style={activeTab === "import" ? { background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.1))", border: "1px solid rgba(6, 182, 212, 0.2)" } : {}}>
          <Upload className="h-4 w-4 inline mr-1.5" /> Import
        </button>
        <button onClick={() => { setActiveTab("export"); setError(null); loadDecks(); }}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === "export" ? "text-white" : "text-text-secondary"}`}
          style={activeTab === "export" ? { background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))", border: "1px solid rgba(16, 185, 129, 0.2)" } : {}}>
          <Download className="h-4 w-4 inline mr-1.5" /> Export
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ═══ IMPORT TAB ═══ */}
      {activeTab === "import" && (
        <div className="space-y-6">
          {parseStep === "upload" && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className="rounded-2xl p-8 text-center transition-colors cursor-pointer"
                style={{
                  border: `2px dashed ${dragOver ? "var(--accent-cyan)" : "var(--glass-border-light)"}`,
                  background: dragOver ? "rgba(6, 182, 212, 0.05)" : "transparent",
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".csv,.tsv,.json,.txt";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileRead(file);
                  };
                  input.click();
                }}
              >
                <Upload className="h-12 w-12 text-text-muted mx-auto mb-4" />
                <h3 className="font-display text-lg font-bold text-text-primary mb-2">Drop file or click to upload</h3>
                <p className="text-sm text-text-secondary">Supports CSV, TSV, JSON, TXT</p>
              </div>

              {/* Or paste text */}
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
                <h4 className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Or paste content</h4>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={"Paste cards here...\n\nFormat examples:\nFront\tBack\tTags\nQuestion - Answer\n{\"front\": \"Q\", \"back\": \"A\"}"}
                  className="w-full h-40 rounded-xl text-sm outline-none resize-none p-4"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                />
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="space-y-1">
                    <label className="text-xs text-text-secondary">Format</label>
                    <select value={parseFormat} onChange={e => setParseFormat(e.target.value)}
                      className="h-9 px-3 rounded-lg text-xs outline-none" style={{ background: "var(--glass-input-bg)", border: "1px solid var(--glass-border-light)", color: "var(--text-primary)" }}>
                      <option value="">Auto-detect</option>
                      <option value="csv">CSV</option>
                      <option value="tsv">TSV</option>
                      <option value="json">JSON</option>
                      <option value="text">Plain Text</option>
                    </select>
                  </div>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleParse} disabled={!rawText.trim()}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40 mt-5"
                    style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))" }}>
                    <FileText className="h-4 w-4" /> Parse Preview
                  </motion.button>
                </div>
              </div>
            </>
          )}

          {parseStep === "preview" && (
            <>
              {/* Target deck */}
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
                <h4 className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Target Deck</h4>
                {deckId ? (
                  <p className="text-sm text-text-primary">Importing to: <strong>{deckName}</strong></p>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <GlowingInput placeholder="Select or create a deck…" value={targetDeckName} onChange={e => setTargetDeckName(e.target.value)}
                        onFocus={() => { setShowDeckPicker(true); loadDecks(); }} />
                      <AnimatePresence>
                        {showDeckPicker && decks.length > 0 && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                            {decks.map(d => (
                              <button key={d.id} onClick={() => { setSelectedDeckId(d.id); setTargetDeckName(d.name); setShowDeckPicker(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-glass-surface flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-text-muted" />
                                {d.name} <span className="text-[10px] text-text-muted">({d.cardCount} cards)</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                  <input type="checkbox" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} className="accent-accent-green" />
                  Skip duplicate cards (matching front text)
                </label>
              </div>

              {/* Preview */}
              <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">
                    Preview ({validCards.length} valid{invalidCards.length > 0 ? `, ${invalidCards.length} errors` : ""})
                  </h4>
                  <div className="flex gap-2">
                    <button onClick={() => { setParseStep("upload"); setParsedCards([]); }} className="text-xs text-text-muted hover:text-text-secondary">← Back</button>
                  </div>
                </div>

                {invalidCards.length > 0 && (
                  <div className="p-3 rounded-xl" style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
                    <p className="text-xs text-red-400 font-medium mb-2">{invalidCards.length} cards with errors:</p>
                    {invalidCards.slice(0, 3).map((c, i) => (
                      <p key={i} className="text-[10px] text-red-400/70 truncate">• {c.error}: "{c.front.slice(0, 40)}…"</p>
                    ))}
                    {invalidCards.length > 3 && <p className="text-[10px] text-red-400/50">+{invalidCards.length - 3} more</p>}
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {validCards.slice(0, 50).map((card, idx) => (
                    <div key={idx} className="rounded-lg p-3" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
                      <div className="flex items-start gap-2 cursor-pointer" onClick={() => setExpandedCard(expandedCard === idx ? null : idx)}>
                        {expandedCard === idx ? <ChevronUp className="h-3.5 w-3.5 text-text-muted mt-0.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-text-muted mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{card.front}</p>
                          {expandedCard === idx && <p className="text-xs text-text-secondary mt-1">{card.back}</p>}
                        </div>
                        {card.tags && <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--accent-purple)" }}>{card.tags}</span>}
                      </div>
                    </div>
                  ))}
                  {validCards.length > 50 && <p className="text-xs text-text-muted text-center py-2">+ {validCards.length - 50} more cards</p>}
                </div>

                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleImport}
                  className="w-full px-4 py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, var(--accent-green), var(--accent-blue))", boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)" }}>
                  <Upload className="h-4 w-4" /> Import {validCards.length} Cards
                </motion.button>
              </div>
            </>
          )}

          {parseStep === "importing" && (
            <div className="text-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-accent-green mx-auto mb-4" />
              <p className="text-text-secondary">Importing cards…</p>
            </div>
          )}

          {parseStep === "done" && importResult && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 rounded-2xl" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
              <div className="text-4xl mb-4">✅</div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-2">Import Complete!</h3>
              <p className="text-sm text-text-secondary">
                Imported {importResult.imported} cards{importResult.skipped > 0 ? ` (${importResult.skipped} skipped as duplicates)` : ""}
              </p>
              <button onClick={() => { setParseStep("upload"); setParsedCards([]); setImportResult(null); setRawText(""); }}
                className="mt-4 px-4 py-2 rounded-lg text-sm text-accent-blue hover:bg-[rgba(59,130,246,0.1)] transition-colors">
                Import More
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ═══ EXPORT TAB ═══ */}
      {activeTab === "export" && (
        <div className="space-y-6">
          {!deckId && (
            <div className="rounded-2xl p-5 space-y-3" style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
              <h4 className="text-xs font-display font-semibold text-text-secondary tracking-wider uppercase">Select Deck</h4>
              <div className="relative">
                <GlowingInput placeholder="Search decks…" value={targetDeckName} onChange={e => setTargetDeckName(e.target.value)}
                  onFocus={() => { setShowDeckPicker(true); loadDecks(); }} />
                <AnimatePresence>
                  {showDeckPicker && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                      className="absolute z-10 w-full mt-1 rounded-xl overflow-hidden max-h-48 overflow-y-auto"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}>
                      {decks.filter(d => d.name.toLowerCase().includes(targetDeckName.toLowerCase())).map(d => (
                        <button key={d.id} onClick={() => { setSelectedDeckId(d.id); setTargetDeckName(d.name); setShowDeckPicker(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-text-primary hover:bg-glass-surface flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-text-muted" />
                          {d.name} <span className="text-[10px] text-text-muted">({d.cardCount} cards)</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { format: "csv" as const, label: "CSV", desc: "Universal, opens in Excel", icon: FileSpreadsheet, color: "var(--accent-green)" },
              { format: "json" as const, label: "JSON", desc: "Structured, re-importable", icon: FileJson, color: "var(--accent-blue)" },
              { format: "md" as const, label: "Markdown", desc: "For Obsidian/Notion", icon: FileCode, color: "var(--accent-purple)" },
            ].map(({ format, label, desc, icon: Icon, color }) => (
              <motion.button key={format} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleExport(format)}
                disabled={!selectedDeckId && !deckId}
                className="rounded-2xl p-5 text-left disabled:opacity-40 transition-opacity"
                style={{ background: "var(--glass-card-bg)", border: "1px solid var(--glass-border)" }}>
                <Icon className="h-8 w-8 mb-3" style={{ color }} />
                <p className="font-display text-sm font-bold text-text-primary">{label}</p>
                <p className="text-[10px] text-text-muted mt-1">{desc}</p>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
