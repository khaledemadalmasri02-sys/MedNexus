/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Loader2, BookOpen, Lightbulb, Plus, Copy, Check } from "lucide-react";
import * as api from "../lib/api";
import { AIContent } from "../components/AIContent";

export default function SummarizePage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<api.SummaryResult | null>(null);
  const [copied, setCopied] = useState(false);

  const summarize = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await api.agentsApi.summarize(content.trim());
      setResult(res);
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const text = `# ${result.summary.title}\n\n${result.summary.summary}\n\n## Key Points\n${result.summary.keyPoints.map(p => `- ${p}`).join("\n")}\n\n## Clinical Pearls\n${result.summary.clinicalPearls.map(p => `- ${p}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06B6D4, #0891B2)" }}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Content Summarizer</h1>
            <p className="text-text-secondary">Transform any content into structured study notes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="p-4 rounded-2xl h-full" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your lecture notes, textbook paragraphs, or any study content here..."
                className="w-full h-80 resize-none bg-transparent text-sm text-text-primary placeholder-text-secondary focus:outline-none"
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-text-secondary">{content.length} characters</span>
                <motion.button
                  onClick={summarize}
                  disabled={loading || !content.trim()}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #06B6D4, #0891B2)" }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Summarizing...</> : <><FileText className="w-4 h-4" /> Summarize</>}
                </motion.button>
              </div>
            </div>
          </div>

          <div>
            {loading && (
              <div className="flex items-center justify-center h-80">
                <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
              </div>
            )}

            {!loading && !result && (
              <div className="flex flex-col items-center justify-center h-80 text-center">
                <BookOpen className="w-12 h-12 text-text-secondary mb-4" />
                <p className="text-text-secondary">Your summarized notes will appear here</p>
              </div>
            )}

            {result && (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-text-primary">{result.summary.title}</h2>
                  <button onClick={copyToClipboard} className="p-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors">
                    {copied ? <Check className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="p-4 rounded-xl text-sm leading-relaxed min-w-0 overflow-hidden" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                  <AIContent content={result.summary.summary} accentColor="#3B82F6" />
                </div>

                <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                  <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" /> Key Points
                  </h3>
                  <ul className="space-y-2">
                    {result.summary.keyPoints.map((p, i) => (
                      <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan mt-1.5 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {result.summary.definitions.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Definitions</h3>
                    <div className="space-y-2">
                      {result.summary.definitions.map((d, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-text-primary">{d.term}:</span>{" "}
                          <span className="text-text-secondary">{d.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.summary.clinicalPearls.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)" }}>
                    <h3 className="text-sm font-semibold text-amber-400 mb-3">Clinical Pearls</h3>
                    <ul className="space-y-2">
                      {result.summary.clinicalPearls.map((p, i) => (
                        <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.summary.suggestedCards.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-accent-green" /> Suggested Flashcards
                    </h3>
                    <div className="space-y-3">
                      {result.summary.suggestedCards.map((c, i) => (
                        <div key={i} className="p-3 rounded-lg text-sm" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
                          <div className="text-text-primary font-medium">{c.front}</div>
                          <div className="text-text-secondary mt-1">{c.back}</div>
                          {c.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {c.tags.map((t, ti) => (
                                <span key={ti} className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
