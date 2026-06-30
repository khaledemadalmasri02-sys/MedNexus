/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/refs */
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  fileName: string;
  downloadUrl: string;
  onClose: () => void;
}

export default function PdfViewer({ url, fileName, downloadUrl, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetch(url).then((r) => r.arrayBuffer());
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load PDF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      pdfDocRef.current?.destroy();
    };
  }, [url]);

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    if (!pdf || renderedPages.has(pageNum)) return;

    const canvas = canvasRefs.current.get(pageNum);
    if (!canvas) return;

    try {
      const page = await pdf.getPage(pageNum);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport }).promise;
      setRenderedPages((prev) => new Set(prev).add(pageNum));
    } catch {
      /* cancelled */
    }
  }, [renderedPages]);

  useEffect(() => {
    if (!loading && numPages > 0) {
      const start = Math.max(1, currentPage - 1);
      const end = Math.min(numPages, currentPage + 2);
      for (let i = start; i <= end; i++) {
        renderPage(i);
      }
    }
  }, [loading, numPages, currentPage, renderPage]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && currentPage > 1) setCurrentPage((p) => p - 1);
      if (e.key === "ArrowRight" && currentPage < numPages) setCurrentPage((p) => p + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentPage, numPages, onClose]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    const el = document.getElementById(`pdf-page-${page}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "var(--bg-void)", backdropFilter: "blur(24px) saturate(1.5)", WebkitBackdropFilter: "blur(24px) saturate(1.5)" }}>
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3"
        style={{ background: "linear-gradient(135deg, #C4B5FD, #A78BFA)" }}
      >
        <span className="text-sm font-medium text-white truncate mr-4">{fileName}</span>
        <div className="flex items-center gap-2">
          {numPages > 1 && (
            <div className="flex items-center gap-1 text-sm text-white/80 mr-2">
              <button
                onClick={() => goToPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-white/15 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="tabular-nums text-xs min-w-[3rem] text-center">
                {currentPage} / {numPages}
              </span>
              <button
                onClick={() => goToPage(Math.min(numPages, currentPage + 1))}
                disabled={currentPage >= numPages}
                className="p-1 rounded hover:bg-white/15 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <a
            href={downloadUrl}
            download
            className="p-2 rounded-lg hover:bg-white/15 transition-colors"
            title="Download"
          >
            <Download className="h-5 w-5 text-white" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="Close (Esc)"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-6 flex flex-col items-center gap-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}
        {!loading && !error && numPages > 0 && (
          Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} id={`pdf-page-${pageNum}`} className="flex flex-col items-center gap-2">
              <span className="text-xs text-text-muted">
                Page {pageNum} of {numPages}
              </span>
              <canvas
                ref={(el) => {
                  if (el) {
                    canvasRefs.current.set(pageNum, el);
                    if (!renderedPages.has(pageNum)) {
                      renderPage(pageNum);
                    }
                  }
                }}
                className="rounded-lg shadow-lg bg-white"
                style={{ maxWidth: "100%", height: "auto" }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
