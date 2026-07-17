// Browser-side OCR via Tesseract.js. Lazy-loaded so it never bloats the
// initial bundle. Tesseract accuracy varies (especially on handwriting), so
// callers should surface an "OCR may be imperfect" notice and let the user
// edit the extracted text before ingestion.
import { ApiError } from "./api";

export interface OcrResult {
  text: string;
  progress: number; // 0..1
}

export async function ocrImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Dynamic import keeps tesseract.js out of the main chunk.
  const Tesseract = (await import("tesseract.js")).default;
  const result = await Tesseract.recognize(file, "eng", {
    logger: (m: { status: string; progress?: number }) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(m.progress);
      }
    },
  });
  return (result.data.text || "").trim();
}

export { ApiError };
