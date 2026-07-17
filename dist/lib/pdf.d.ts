export interface PDFExtractionResult {
    text: string;
    pageCount: number;
    fileName: string;
    metadata?: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string;
        creationDate?: string;
        modificationDate?: string;
    };
}
export interface PDFPage {
    pageNumber: number;
    text: string;
}
export declare class PDFService {
    /**
     * Extract text from a PDF file buffer
     */
    extractText(buffer: Buffer, fileName?: string): Promise<PDFExtractionResult>;
    /**
     * Extract text from specific pages
     */
    extractPages(buffer: Buffer, pageNumbers: number[], fileName?: string): Promise<PDFExtractionResult>;
    /**
     * Get page count without extracting text
     */
    getPageCount(buffer: Buffer): Promise<number>;
    /**
     * Clean extracted text
     */
    cleanText(text: string): string;
}
export declare const pdfService: PDFService;
//# sourceMappingURL=pdf.d.ts.map