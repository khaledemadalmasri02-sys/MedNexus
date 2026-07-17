// Client-side PDF text extraction using pdfjs-dist.
//
// The Cloudflare Worker edge extractor (src/lib/pdfText.ts on the backend)
// only understands 8-bit Latin-1 string operators and cannot decode CID /
// Identity-H fonts (e.g. PDFs produced by WeasyPrint), so it returns
// garbled 2-byte text for those files. pdfjs renders the content streams
// with the font's ToUnicode CMap, recovering real Unicode text — which is
// exactly what we want before sending the text to /api/generate.
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface ClientExtractResult {
  text: string;
  pageCount: number;
  wordCount: number;
}

// Join text items into lines, breaking on vertical position changes so the
// output keeps a sensible reading order instead of one giant paragraph.
export async function extractPdfTextClient(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<ClientExtractResult> {
  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
  const numPages = doc.numPages;
  const lines: string[] = [];

  let prevY: number | null = null;
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    for (const item of content.items as Array<Record<string, any>>) {
      if (!("str" in item)) continue;
      const y = item.transform ? (item.transform[5] as number) : null;
      if (prevY !== null && y !== null && Math.abs(y - prevY) > 2 && line) {
        lines.push(line.trim());
        line = "";
      }
      line += item.str as string;
      if (item.hasEOL) {
        lines.push(line.trim());
        line = "";
      }
      prevY = y;
    }
    if (line.trim()) lines.push(line.trim());
    onProgress?.(i, numPages);
  }
  await doc.destroy();

  const text = lines
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return { text, pageCount: numPages, wordCount };
}
