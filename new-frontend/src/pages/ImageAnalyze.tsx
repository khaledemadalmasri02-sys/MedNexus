/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2, Eye, Stethoscope, Plus, ImageIcon } from "lucide-react";
import * as api from "../lib/api";
import { AIContent } from "../components/AIContent";

export default function ImageAnalyzePage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<api.ImageAnalysisResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const res = await api.agentsApi.analyzeImage(image);
      setResult(res);
    } catch (err: any) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #F43F5E, #E11D48)" }}>
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Image Analyzer</h1>
            <p className="text-text-secondary">Upload medical images to generate flashcards</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            {!preview ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer hover:border-accent-rose transition-colors"
                style={{ borderColor: "var(--border-default)" }}
              >
                <ImageIcon className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary mb-2">Click to upload a medical image</p>
                <p className="text-xs text-text-secondary">PNG, JPEG, or WebP • Max 10MB</p>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="hidden" />
              </div>
            ) : (
              <div className="space-y-4">
                <img src={preview} alt="Preview" className="w-full rounded-2xl" style={{ border: "1px solid var(--border-default)" }} />
                <div className="flex gap-2">
                  <motion.button
                    onClick={analyze}
                    disabled={loading}
                    className="flex-1 py-3 rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #F43F5E, #E11D48)" }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</> : <><Stethoscope className="w-5 h-5" /> Analyze Image</>}
                  </motion.button>
                  <button
                    onClick={() => { setImage(null); setPreview(""); setResult(null); }}
                    className="px-4 py-3 rounded-xl text-text-secondary"
                    style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-accent-rose" />
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                  <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-accent-blue" /> Findings
                  </h3>
                   <AIContent content={result.findings} accentColor="#3B82F6" />
                </div>

                <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">Diagnosis / Description</h3>
                   <AIContent content={result.diagnosis} accentColor="#3B82F6" />
                </div>

                <div className="p-4 rounded-xl" style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.15)" }}>
                  <h3 className="text-sm font-semibold text-amber-400 mb-2">Teaching Points</h3>
                  <ul className="space-y-1">
                    {result.teachingPoints.map((p, i) => (
                      <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                {result.cards.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                    <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-accent-green" /> Generated Cards
                    </h3>
                    <div className="space-y-3">
                      {result.cards.map((c, i) => (
                        <div key={i} className="p-3 rounded-lg text-sm" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
                          <div className="text-text-primary font-medium">{c.front}</div>
                          <div className="text-text-secondary mt-1">{c.back}</div>
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
