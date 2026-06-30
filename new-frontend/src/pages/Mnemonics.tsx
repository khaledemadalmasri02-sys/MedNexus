/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles, RefreshCw, Save, Check, Lightbulb, Eye, BookOpen, Music } from "lucide-react";
import * as api from "../lib/api";

export default function MnemonicsPage() {
  const [concept, setConcept] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<api.MnemonicResult | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const generate = async () => {
    if (!concept.trim()) return;
    setLoading(true);
    try {
      const res = await api.agentsApi.generateMnemonics(concept.trim());
      setResult(res);
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "acronym": return <BookOpen className="w-4 h-4" />;
      case "visual": return <Eye className="w-4 h-4" />;
      case "story": return <Lightbulb className="w-4 h-4" />;
      case "rhyme": return <Music className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "acronym": return { bg: "rgba(59, 130, 246, 0.1)", border: "rgba(59, 130, 246, 0.2)", color: "#60A5FA" };
      case "visual": return { bg: "rgba(139, 92, 246, 0.1)", border: "rgba(139, 92, 246, 0.2)", color: "#A78BFA" };
      case "story": return { bg: "rgba(34, 197, 94, 0.1)", border: "rgba(34, 197, 94, 0.2)", color: "#4ADE80" };
      case "rhyme": return { bg: "rgba(245, 158, 11, 0.1)", border: "rgba(245, 158, 11, 0.2)", color: "#FBBF24" };
      default: return { bg: "rgba(6, 182, 212, 0.1)", border: "rgba(6, 182, 212, 0.2)", color: "#22D3EE" };
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #A855F7, #9333EA)" }}>
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Mnemonic Generator</h1>
            <p className="text-text-secondary">Create memorable memory aids for any concept</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl mb-8" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
          <textarea
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Enter a medical concept, topic, or list of terms you need mnemonics for..."
            rows={4}
            className="w-full resize-none bg-transparent text-sm text-text-primary placeholder-text-secondary focus:outline-none"
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-text-secondary">Tip: Be specific for better mnemonics</span>
            <motion.button
              onClick={generate}
              disabled={loading || !concept.trim()}
              className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #A855F7, #9333EA)" }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Mnemonics</>}
            </motion.button>
          </div>
        </div>

        {result && result.mnemonics.length > 0 && (
          <div className="space-y-4">
            {result.mnemonics.map((m, i) => {
              const colors = typeColor(m.type);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-5 rounded-2xl"
                  style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2" style={{ color: colors.color }}>
                      {typeIcon(m.type)}
                      <span className="text-sm font-semibold capitalize">{m.type}</span>
                    </div>
                    <button
                      onClick={() => setSaved(prev => new Set(prev).add(i))}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {saved.has(i) ? <Check className="w-4 h-4 text-accent-green" /> : <Save className="w-4 h-4" />}
                    </button>
                  </div>
                  <h4 className="font-semibold text-text-primary mb-2">{m.title}</h4>
                  <p className="text-text-primary text-lg font-medium mb-2 leading-relaxed">{m.content}</p>
                  <p className="text-sm text-text-secondary">{m.explanation}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
