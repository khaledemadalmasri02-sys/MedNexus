import { useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2, Wand2, ArrowRight, Volume2 } from "lucide-react";
import { smoothTransition, springTransition } from "../ui/constants";
import FileUploadZone from "./FileUploadZone";
import FileQueueList from "./FileQueueList";
import ModeSelector from "./ModeSelector";
import StyleSelector from "./StyleSelector";
import SummaryProgressBar from "./SummaryProgressBar";
import SummaryResult from "./SummaryResult";
import TerminalView from "./TerminalView";
import { useSummaryGeneration } from "../../hooks/useSummaryGeneration";

export default function SummaryGenerator() {
  const {
    files, step, setStep, selectedStyle, setSelectedStyle,
    generationMode, setGenerationMode,
    jobId, progress, generatedPdfUrl, error, events,
    fileProgress,
    addFiles, removeFile, uploadFiles, generateAndStream, reset,
  } = useSummaryGeneration();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generateAudio, setGenerateAudio] = useState(false);

  const handleAddMore = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleGenerate = async () => {
    const uploadedFiles = files.filter((f) => f.status === "uploaded" && f.serverId);
    if (uploadedFiles.length === 0) return;
    await generateAndStream(
      uploadedFiles.map((f) => f.serverId!),
      selectedStyle,
      generationMode,
      generateAudio
    );
  };

  const uploadedCount = files.filter((f) => f.status === "uploaded" && f.serverId).length;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div
            key="upload-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={smoothTransition}
            className="space-y-6"
          >
            <FileUploadZone onFilesSelected={addFiles} />

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.pptx,.ppt,.xlsx,.xls,.csv,.txt,.md,.docx"
              multiple
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                e.target.value = "";
              }}
              className="hidden"
            />

            <FileQueueList
              files={files}
              onRemove={removeFile}
              onAddMore={handleAddMore}
            />

            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-end"
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={uploadFiles}
                  className="px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                    boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)",
                  }}
                  data-hover="true"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === "mode" && (
          <ModeSelector
            key="mode-step"
            selectedMode={generationMode}
            onSelect={setGenerationMode}
            onNext={() => setStep("style")}
            onBack={reset}
            fileCount={uploadedCount}
          />
        )}

        {step === "style" && (
          <motion.div
            key="style-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={smoothTransition}
            className="space-y-6"
          >
            <StyleSelector selectedStyle={selectedStyle} onSelect={setSelectedStyle} />

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--glass-surface)", border: "1px solid var(--glass-border)" }}>
              <button
                onClick={() => setGenerateAudio(!generateAudio)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: generateAudio ? "var(--accent-cyan)" : "var(--glass-border)" }}
              >
                <motion.div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
                  animate={{ x: generateAudio ? 22 : 2 }}
                  transition={springTransition}
                  style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}
                />
              </button>
              <Volume2 className="h-4 w-4 text-text-secondary" />
              <span className="text-sm text-text-secondary">Generate audio summary (TTS)</span>
            </div>

            <div className="flex justify-end gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={reset}
                className="px-5 py-3 rounded-xl font-medium text-sm"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                Start Over
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                className="px-6 py-3 rounded-xl text-white font-semibold flex items-center gap-2"
                style={{
                  background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                  boxShadow: "0 4px 20px rgba(6, 182, 212, 0.25)",
                }}
                data-hover="true"
              >
                <Wand2 className="h-4 w-4" />
                Generate Summary
              </motion.button>
            </div>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div
            key="processing-step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={smoothTransition}
            className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
            style={{
              background: "var(--glass-card-bg)",
              border: "1px solid var(--glass-border)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            <div className="text-center mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-flex mb-4"
              >
                <Loader2 className="h-12 w-12 text-accent-cyan" />
              </motion.div>
              <h3 className="font-display text-xl font-semibold text-text-primary mb-2">
                Generating Your Summary
              </h3>
              <p className="text-sm text-text-secondary">This may take a moment...</p>
            </div>
            <SummaryProgressBar progress={progress} isProcessing={true} />
            <TerminalView events={events} style={selectedStyle} isProcessing={true} />
          </motion.div>
        )}

        {step === "result" && jobId && (
          <SummaryResult
            key="result-step"
            pdfUrl={generatedPdfUrl}
            jobId={jobId}
            onReset={reset}
            mode={generationMode}
            fileProgress={fileProgress}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl"
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
