import { Router, Request, Response } from "express";
import multer from "multer";
import { logger } from "../lib/logger.js";
import { pdfService } from "../lib/pdf.js";
import { validateBody } from "../middleware/validate.js";
import { extractTextSchema } from "./validators.js";

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(pdf|txt|md|doc|docx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, TXT, MD, DOC, and DOCX files are allowed."));
    }
  },
});

// Extract text from PDF
router.post("/pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "No file uploaded" },
      });
      return;
    }
    
    const file = req.file;
    logger.info({ fileName: file.originalname, size: file.size }, "Processing PDF upload");
    
    // Check if it's a PDF
    if (!file.originalname.toLowerCase().endsWith(".pdf") && file.mimetype !== "application/pdf") {
      // For non-PDF files, try to read as text
      const text = file.buffer.toString("utf-8");
      res.json({
        text,
        pageCount: 1,
        fileName: file.originalname,
        type: "text",
      });
      return;
    }
    
    // Extract text from PDF
    const result = await pdfService.extractText(file.buffer, file.originalname);
    
    // Clean the text
    const cleanedText = pdfService.cleanText(result.text);
    
    res.json({
      text: cleanedText,
      pageCount: result.pageCount,
      fileName: result.fileName,
      metadata: result.metadata,
      type: "pdf",
    });
  } catch (err) {
    logger.error({ err }, "PDF extraction failed");
    res.status(500).json({
      error: { code: "EXTRACTION_ERROR", message: "Failed to extract text from file" },
    });
  }
});

// Extract text from multiple files
router.post("/pdf/batch", upload.array("files", 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "No files uploaded" },
      });
      return;
    }

    const results = await Promise.all(
      files.map(async (file) => {
        logger.info({ fileName: file.originalname, size: file.size }, "Processing file upload");
        
        // Check if it's a PDF
        if (!file.originalname.toLowerCase().endsWith(".pdf") && file.mimetype !== "application/pdf") {
          // For non-PDF files, try to read as text
          const text = file.buffer.toString("utf-8");
          return {
            text,
            pageCount: 1,
            fileName: file.originalname,
            type: "text",
          };
        }
        
        // Extract text from PDF
        const result = await pdfService.extractText(file.buffer, file.originalname);
        
        // Clean the text
        const cleanedText = pdfService.cleanText(result.text);
        
        return {
          text: cleanedText,
          pageCount: result.pageCount,
          fileName: result.fileName,
          metadata: result.metadata,
          type: "pdf",
        };
      })
    );

    // Combine all text
    const combinedText = results.map(r => `--- ${r.fileName} ---\n${r.text}`).join("\n\n");
    const totalPages = results.reduce((sum, r) => sum + r.pageCount, 0);
    const totalWords = combinedText.split(/\s+/).filter(Boolean).length;

    res.json({
      text: combinedText,
      pageCount: totalPages,
      wordCount: totalWords,
      fileCount: results.length,
      files: results.map(r => ({ fileName: r.fileName, pageCount: r.pageCount, type: r.type })),
      type: "batch",
    });
  } catch (err) {
    logger.error({ err }, "Batch PDF extraction failed");
    res.status(500).json({
      error: { code: "EXTRACTION_ERROR", message: "Failed to extract text from files" },
    });
  }
});

// Process raw text input
router.post("/text", validateBody(extractTextSchema), async (req: Request, res: Response) => {
  const { text } = req.body;

  try {
    // Clean and process the text
    const cleanedText = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, " ")
      .replace(/[^\S\n]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    
    // Calculate approximate word count
    const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
    
    res.json({
      text: cleanedText,
      wordCount,
      charCount: cleanedText.length,
    });
  } catch (err) {
    logger.error({ err }, "Text processing failed");
    res.status(500).json({
      error: { code: "PROCESSING_ERROR", message: "Failed to process text" },
    });
  }
});

// Get file info without extracting content
router.post("/info", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "No file uploaded" },
      });
      return;
    }
    
    const file = req.file;
    const isPdf = file.originalname.toLowerCase().endsWith(".pdf") && file.mimetype === "application/pdf";
    
    let pageCount = 1;
    if (isPdf) {
      pageCount = await pdfService.getPageCount(file.buffer);
    }
    
    res.json({
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      pageCount,
      isPdf,
    });
  } catch (err) {
    logger.error({ err }, "File info extraction failed");
    res.status(500).json({
      error: { code: "PROCESSING_ERROR", message: "Failed to get file info" },
    });
  }
});

export default router;
