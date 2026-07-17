import { Hono } from "hono";
import { extractPdfText } from "../lib/pdfText";
import type { AppEnv } from "../types";
import { validate, extractTextSchema } from "../middleware/validate";

export const extractRoutes = new Hono<AppEnv>();

function pdSizeErr(c:any,err:any){ const msg=err?.message||"unknown error"; const tooLarge=/too large for edge/i.test(msg); return c.json({error:{code: tooLarge?"FILE_TOO_LARGE":"PROCESSING_ERROR", message: msg}}, tooLarge?413:500); }

type UploadFile = File;

// Edge CPU budget is limited; PDFs larger than this are rejected with guidance
// rather than silently exceeding the Worker CPU time limit.
const MAX_PDF_BYTES = 2 * 1024 * 1024; // 2 MB

async function extractFromFile(file: UploadFile): Promise<{ text: string; pageCount: number; metadata?: any }> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(
      `PDF is too large for edge processing (${Math.round(file.size / 1024)} KB). ` +
        `Paste the text directly, or export the document as .txt/.csv/.md and upload that.`
    );
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const { text, pageCount } = await extractPdfText(buf);
  return { text: text || "", pageCount: pageCount || 0, metadata: undefined };
}

// POST /api/extract/pdf  (FormData field "file")
extractRoutes.post("/extract/pdf", async (c) => {
  try {
    const form = await c.req.raw.formData();
    const file = form.get("file") as UploadFile | null;
    if (!file || typeof file === "string") {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "No file provided" } }, 400);
    }
    const { text, pageCount, metadata } = await extractFromFile(file);
    return c.json({
      text,
      pageCount,
      fileName: file.name || "document.pdf",
      type: file.type || "application/pdf",
      metadata,
    });
  } catch (err: any) {
    return pdSizeErr(c, err);
  }
});

// POST /api/extract/pdf/batch  (FormData field "files" = multiple Files)
extractRoutes.post("/extract/pdf/batch", async (c) => {
  try {
    const form = await c.req.raw.formData();
    const rawFiles = form.getAll("files");
    const files: UploadFile[] = [];
    for (const f of rawFiles) {
      if (typeof f !== "string") files.push(f as UploadFile);
    }
    if (!files.length) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "No files provided" } }, 400);
    }
    const perFile: Array<{ fileName: string; pageCount: number; type: string }> = [];
    const texts: string[] = [];
    let totalPages = 0;
    for (const file of files) {
      const { text, pageCount } = await extractFromFile(file);
      perFile.push({ fileName: file.name || "document.pdf", pageCount, type: file.type || "application/pdf" });
      totalPages += pageCount;
      if (text.trim()) texts.push(text.trim());
    }
    const combined = texts.join("\n\n");
    const wordCount = combined.split(/\s+/).filter(Boolean).length;
    return c.json({
      text: combined,
      pageCount: totalPages,
      fileName: files[0]?.name || "batch.pdf",
      type: "application/pdf",
      wordCount,
      fileCount: files.length,
      files: perFile,
    });
  } catch (err: any) {
    return pdSizeErr(c, err);
  }
});

// PDF metadata/page-count only — now backed by the same extractor.
extractRoutes.post("/extract/info", async (c) => {
  try {
    const form = await c.req.raw.formData();
    const file = form.get("file") as UploadFile | null;
    if (!file || typeof file === "string") {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "No file provided" } }, 400);
    }
    const buf = new Uint8Array(await file.arrayBuffer());
    const { pageCount } = await extractPdfText(buf);
    return c.json({ pageCount, fileName: file.name || "document.pdf", type: file.type || "application/pdf" });
  } catch (err: any) {
    return pdSizeErr(c, err);
  }
});

// Accepts already-extracted text — fully ported (pure JS, AI-call-free).
extractRoutes.post("/extract/text", validate(extractTextSchema), async (c) => {
  const { text } = c.get("validated") as any;
  try {
    const cleanedText = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;

    return c.json({
      text: cleanedText,
      wordCount,
      charCount: cleanedText.length,
    });
  } catch (err) {
    return c.json({ error: { code: "PROCESSING_ERROR", message: "Failed to process text" } }, 500);
  }
});
