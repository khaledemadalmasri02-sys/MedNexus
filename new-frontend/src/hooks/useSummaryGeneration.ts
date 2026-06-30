import { useState, useCallback, useRef } from "react";
import * as api from "../lib/api";

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  ts: number;
}

export interface SummaryFile {
  id: string;
  file: File;
  name: string;
  size: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
  serverId?: string;
}

export interface SummaryProgress {
  stage: string;
  message: string;
  progress: number;
}

export interface FileProgressEntry {
  index: number;
  fileName: string;
  progress: number;
  stage: string;
  status: "waiting" | "processing" | "complete" | "error";
  outputPath: string | null;
  error: string | null;
  pdfUrl: string | null;
  previewUrl: string | null;
}

export type GenerationMode = "combined" | "separate";
export type GenerationStep = "upload" | "mode" | "style" | "processing" | "result";

export function useSummaryGeneration() {
  const [files, setFiles] = useState<SummaryFile[]>([]);
  const [step, setStep] = useState<GenerationStep>("upload");
  const [selectedStyle, setSelectedStyle] = useState<api.SummaryStyle>("modern");
  const [generationMode, setGenerationMode] = useState<GenerationMode>("combined");
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SummaryProgress>({
    stage: "",
    message: "",
    progress: 0,
  });
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [fileProgress, setFileProgress] = useState<FileProgressEntry[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const separateModeRef = useRef(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const mapped: SummaryFile[] = newFiles.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      name: f.name,
      size: f.size,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...mapped]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async () => {
    const pending = files.filter((f) => f.status === "pending" || f.status === "error");
    if (pending.length === 0) {
      setStep("mode");
      return;
    }

    setError(null);
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" || f.status === "error" ? { ...f, status: "uploading" as const } : f
      )
    );

    try {
      const result = await api.summaryApi.upload(pending.map((f) => f.file));
      const uploadedIds = result.files.map((sf) => sf.id);

      setFiles((prev) => {
        const uploading = prev.filter((f) => f.status === "uploading");
        const others = prev.filter((f) => f.status !== "uploading");
        const updated = uploading.map((f, i) => ({
          ...f,
          status: uploadedIds[i] ? "uploaded" as const : "error" as const,
          serverId: uploadedIds[i] || f.serverId,
          progress: uploadedIds[i] ? 100 : f.progress,
          error: uploadedIds[i] ? undefined : "Upload failed",
        }));
        return [...others, ...updated];
      });
      setStep("mode");
    } catch (err) {
      setError((err as Error).message);
      setFiles((prev) =>
        prev.map((f) => (f.status === "uploading" ? { ...f, status: "error" as const, error: (err as Error).message } : f))
      );
    }
  }, [files]);

  const generateAndStream = useCallback(async (
    fileIds: string[],
    style: api.SummaryStyle,
    mode: GenerationMode = "combined",
    generateAudio: boolean = false,
  ) => {
    setStep("processing");
    setError(null);
    setProgress({ stage: "", message: "Starting generation...", progress: 0 });
    setFileProgress([]);
    separateModeRef.current = mode === "separate";

    try {
      const result = await api.summaryApi.generate(fileIds, style, generateAudio, mode);
      const jId = result.jobId;
      setJobId(jId);

      const initialFp: FileProgressEntry[] = files
        .filter((f) => f.status === "uploaded" && f.serverId)
        .map((f, idx) => ({
          index: idx,
          fileName: f.name,
          progress: 0,
          stage: "waiting",
          status: "waiting" as const,
          outputPath: null,
          error: null,
          pdfUrl: null,
          previewUrl: null,
        }));
      setFileProgress(initialFp);

      cleanupRef.current = api.summaryApi.streamStatus(
        jId,
        (event) => {
          setEvents((prev) => [
            ...prev,
            { type: event.type as string, data: event as Record<string, unknown>, ts: Date.now() },
          ]);

          const type = event.type as string;

          if (type === "progress") {
            setProgress((prev) => ({
              ...prev,
              progress: (event.percent as number) || prev.progress,
              message: (event.message as string) || prev.message,
              stage: prev.stage || (event.stage as string) || "",
            }));
          } else if (type === "stage") {
            setProgress((prev) => ({
              ...prev,
              stage: (event.stage as string) || prev.stage,
              message: (event.message as string) || prev.message,
            }));
          } else if (type === "file_progress") {
            const fileIdx = event.index as number | undefined;
            const fileName = event.file as string;
            const fpStatus = event.status as string;
            setFileProgress((prev) => {
              const copy = [...prev];
              const idx = fileIdx !== undefined ? fileIdx : copy.findIndex((fp) => fp.fileName === fileName);
              if (idx >= 0 && copy[idx]) {
                copy[idx] = { ...copy[idx], stage: fpStatus, fileName };
                if (fpStatus === "done" || fpStatus === "complete") {
                  copy[idx].status = "complete";
                  copy[idx].progress = 100;
                } else if (fpStatus === "error") {
                  copy[idx].status = "error";
                } else if (fpStatus === "extracting") {
                  copy[idx].status = "processing";
                  copy[idx].progress = Math.max(copy[idx].progress, 10);
                } else if (fpStatus === "correcting" || fpStatus === "corrected") {
                  copy[idx].status = "processing";
                  copy[idx].progress = Math.max(copy[idx].progress, 20);
                } else if (fpStatus === "ai_explaining" || fpStatus === "ai_processing") {
                  copy[idx].status = "processing";
                  copy[idx].progress = Math.max(copy[idx].progress, 35);
                } else if (fpStatus === "ai_enhancing") {
                  copy[idx].status = "processing";
                  copy[idx].progress = Math.max(copy[idx].progress, 65);
                } else if (fpStatus === "ai_writing_pdf") {
                  copy[idx].status = "processing";
                  copy[idx].progress = Math.max(copy[idx].progress, 85);
                }
              }
              return copy;
            });
            setProgress((prev) => ({
              ...prev,
              message: `${fpStatus === "ai_explaining" ? "AI explaining" : fpStatus === "ai_enhancing" ? "AI enhancing" : fpStatus === "correcting" ? "Correcting" : fpStatus}: ${fileName}`,
            }));
          } else if (type === "complete") {
            setProgress({ stage: "complete", message: "PDF generation complete", progress: 100 });
            setGeneratedPdfUrl(api.summaryApi.previewUrl(jId));
            if (generateAudio) {
              setAudioUrl(`/api/summary/audio/${jId}`);
            }
            setFileProgress((prev) => prev.map((fp) => fp.status !== "error" ? { ...fp, status: "complete", progress: 100 } : fp));
            setStep("result");
          } else if (type === "all_complete") {
            const totalFiles = event.totalFiles as number;
            setProgress({ stage: "complete", message: `All ${totalFiles} summaries generated`, progress: 100 });
            setFileProgress((prev) =>
              prev.map((fp) => {
                if (fp.status === "error") return fp;
                return {
                  ...fp,
                  status: "complete" as const,
                  progress: 100,
                  previewUrl: api.summaryApi.previewUrl(`${jId}_${fp.index}`),
                  pdfUrl: api.summaryApi.downloadIndex(jId, fp.index),
                };
              })
            );
            setStep("result");
          } else if (type === "file_complete") {
            const fileIdx = event.index as number | undefined;
            if (fileIdx !== undefined) {
              setFileProgress((prev) => {
                const copy = [...prev];
                if (copy[fileIdx]) {
                  copy[fileIdx] = {
                    ...copy[fileIdx],
                    status: "complete" as const,
                    progress: 100,
                    stage: "complete",
                    previewUrl: api.summaryApi.previewUrl(`${jId}_${fileIdx}`),
                    pdfUrl: api.summaryApi.downloadIndex(jId, fileIdx),
                  };
                }
                return copy;
              });
            }
            setError((event.message as string) || "Generation failed");
            setProgress((prev) => ({ ...prev, stage: "error" }));
          }
        },
        (err) => {
          setError(err.message);
        }
      );
    } catch (err) {
      setError((err as Error).message);
      setStep("style");
    }
  }, [files]);

  const reset = useCallback(() => {
    cleanupRef.current?.();
    setFiles([]);
    setStep("upload");
    setSelectedStyle("modern");
    setGenerationMode("combined");
    setJobId(null);
    setProgress({ stage: "", message: "", progress: 0 });
    setGeneratedPdfUrl(null);
    setAudioUrl(null);
    setError(null);
    setEvents([]);
    setFileProgress([]);
    separateModeRef.current = false;
  }, []);

  return {
    files,
    setFiles,
    step,
    setStep,
    selectedStyle,
    setSelectedStyle,
    generationMode,
    setGenerationMode,
    jobId,
    setJobId,
    progress,
    generatedPdfUrl,
    audioUrl,
    error,
    events,
    fileProgress,
    addFiles,
    removeFile,
    uploadFiles,
    generateAndStream,
    reset,
  };
}
