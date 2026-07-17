import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { logger } from "./logger.js";
import path from "path";
import fs from "fs";
// Configure PDF.js worker
// Use the bundled worker from pdfjs-dist
const workerPath = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.mjs");
// Set worker path if file exists
if (fs.existsSync(workerPath)) {
    GlobalWorkerOptions.workerSrc = workerPath;
}
export class PDFService {
    /**
     * Extract text from a PDF file buffer
     */
    async extractText(buffer, fileName = "document.pdf") {
        try {
            // Convert Buffer to Uint8Array
            const uint8Array = new Uint8Array(buffer);
            // Load the PDF document
            const pdf = await getDocument({ data: uint8Array }).promise;
            const pageCount = pdf.numPages;
            // Extract text from all pages in parallel
            const pagePromises = Array.from({ length: pageCount }, (_, i) => i + 1).map(async (pageNum) => {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item) => {
                    if ("str" in item) {
                        return item.str;
                    }
                    return "";
                })
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
                return { pageNumber: pageNum, text: pageText };
            });
            const pages = await Promise.all(pagePromises);
            // Combine all pages with page markers (already in order)
            const fullText = pages
                .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
                .join("\n\n");
            // Try to get metadata
            let metadata = {};
            try {
                const pdfMetadata = await pdf.getMetadata();
                if (pdfMetadata.info) {
                    const info = pdfMetadata.info;
                    metadata = {
                        title: info.Title,
                        author: info.Author,
                        subject: info.Subject,
                        keywords: info.Keywords,
                        creationDate: info.CreationDate,
                        modificationDate: info.ModDate,
                    };
                }
            }
            catch {
                // Metadata extraction failed, continue without it
            }
            return {
                text: fullText,
                pageCount,
                fileName,
                metadata,
            };
        }
        catch (error) {
            logger.error({ error, fileName }, "PDF extraction failed");
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
    }
    /**
     * Extract text from specific pages
     */
    async extractPages(buffer, pageNumbers, fileName = "document.pdf") {
        try {
            const uint8Array = new Uint8Array(buffer);
            const pdf = await getDocument({ data: uint8Array }).promise;
            const pages = [];
            for (const pageNum of pageNumbers) {
                if (pageNum < 1 || pageNum > pdf.numPages) {
                    continue;
                }
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item) => {
                    if ("str" in item) {
                        return item.str;
                    }
                    return "";
                })
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim();
                pages.push({
                    pageNumber: pageNum,
                    text: pageText,
                });
            }
            const fullText = pages
                .map((p) => `[Page ${p.pageNumber}]\n${p.text}`)
                .join("\n\n");
            return {
                text: fullText,
                pageCount: pages.length,
                fileName,
            };
        }
        catch (error) {
            logger.error({ error, fileName }, "PDF page extraction failed");
            throw new Error(`Failed to extract pages from PDF: ${error.message}`);
        }
    }
    /**
     * Get page count without extracting text
     */
    async getPageCount(buffer) {
        try {
            const uint8Array = new Uint8Array(buffer);
            const pdf = await getDocument({ data: uint8Array }).promise;
            return pdf.numPages;
        }
        catch (error) {
            logger.error({ error }, "Failed to get PDF page count");
            throw new Error(`Failed to get page count: ${error.message}`);
        }
    }
    /**
     * Clean extracted text
     */
    cleanText(text) {
        return text
            // Remove excessive whitespace
            .replace(/\s+/g, " ")
            // Remove page markers for cleaner output
            .replace(/\[Page \d+\]/g, "")
            // Fix common PDF extraction issues
            .replace(/-\s+/g, "") // Fix hyphenated words
            .replace(/\s+([.,;:!?])/g, "$1") // Fix spacing around punctuation
            // Remove multiple newlines
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }
}
// Singleton instance
export const pdfService = new PDFService();
//# sourceMappingURL=pdf.js.map