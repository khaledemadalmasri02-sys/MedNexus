import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";
import mammoth from "mammoth";
import { logger } from "../lib/logger.js";

const router = Router();

const UPLOAD_DIR = "./data/card_uploads";
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Allowed upload extensions for flashcard / Qbank import
const ALLOWED_EXTENSIONS = new Set([
  ".csv", ".tsv", ".txt", ".md", ".json", ".docx", ".pdf",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: csv, tsv, txt, md, json, docx, pdf`));
    }
  },
});

interface ParsedCard {
  front: string;
  back: string;
  tags?: string;
  cardType?: string;
  choices?: string;
  correctIndex?: number;
}

// Parse CSV / TSV content (with header row)
function parseDelimited(content: string, delimiter: string): ParsedCard[] {
  const records = parse(content, {
    delimiter,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  return records
    .map((row) => ({
      front: row.front || row.question || row.q || row.term || "",
      back: row.back || row.answer || row.a || row.definition || "",
      tags: row.tags || row.tag || "",
      cardType: row.cardType || row.type || "basic",
      choices: row.choices || row.options || "",
      correctIndex:
        row.correctIndex !== undefined
          ? parseInt(row.correctIndex, 10)
          : row.correct !== undefined
            ? parseInt(row.correct, 10)
            : undefined,
    }))
    .filter((c) => c.front && c.back);
}

// Parse JSON content (array of cards or { cards: [...] })
function parseJSON(content: string): ParsedCard[] {
  const data = JSON.parse(content);
  const raw = Array.isArray(data) ? data : data.cards || [];
  return raw
    .map((item: Record<string, unknown>) => ({
      front: String(item.front || item.question || item.q || ""),
      back: String(item.back || item.answer || item.a || ""),
      tags: String(item.tags || item.tag || ""),
      cardType: String(item.cardType || item.type || "basic"),
      choices: item.choices ? JSON.stringify(item.choices) : String(item.options || ""),
      correctIndex:
        item.correctIndex !== undefined
          ? Number(item.correctIndex)
          : item.correct !== undefined
            ? Number(item.correct)
            : undefined,
    }))
    .filter((c: ParsedCard) => c.front && c.back);
}

// Parse plain text: one card per line, separated by tab or " - "
function parseText(content: string): ParsedCard[] {
  const lines = content.split("\n").filter((l) => l.trim());
  return lines
    .map((line) => {
      let parts: string[];
      if (line.includes("\t")) parts = line.split("\t");
      else if (line.includes(" - ")) parts = line.split(" - ");
      else parts = [line, ""];
      return {
        front: (parts[0] || "").trim(),
        back: (parts[1] || "").trim(),
        tags: (parts[2] || "").trim(),
        cardType: (parts[3] || "basic").trim(),
      };
    })
    .filter((c) => c.front && c.back);
}

// Parse DOCX using mammoth (convert to text then parse as plain text)
async function parseDOCX(buffer: Buffer): Promise<ParsedCard[]> {
  const result = await mammoth.extractRawText({ buffer });
  return parseText(result.value);
}

// Cleanup helper
function cleanup(filePath?: string) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
}

// POST /api/upload/cards  -> parse an uploaded file into a card preview
router.post("/cards", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No file uploaded" } });
      return;
    }

    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    logger.info({ fileName: file.originalname, size: file.size, ext }, "Processing card upload");

    let cards: ParsedCard[] = [];
    let type: "cards" | "pdf" = "cards";

    try {
      switch (ext) {
        case ".csv":
          cards = parseDelimited(fs.readFileSync(file.path, "utf-8"), ",");
          break;
        case ".tsv":
          cards = parseDelimited(fs.readFileSync(file.path, "utf-8"), "\t");
          break;
        case ".json":
          cards = parseJSON(fs.readFileSync(file.path, "utf-8"));
          break;
        case ".txt":
        case ".md":
          cards = parseText(fs.readFileSync(file.path, "utf-8"));
          break;
        case ".docx":
          cards = await parseDOCX(fs.readFileSync(file.path));
          break;
        case ".pdf": {
          const { pdfService } = await import("../lib/pdf.js");
          const result = await pdfService.extractText(fs.readFileSync(file.path), file.originalname);
          cleanup(file.path);
          res.json({
            type: "pdf",
            text: pdfService.cleanText(result.text),
            pageCount: result.pageCount,
            fileName: file.originalname,
            message: "PDF extracted. Use /api/upload/pdf-cards to convert text into cards.",
          });
          return;
        }
        default:
          cleanup(file.path);
          res.status(400).json({ error: { code: "VALIDATION_ERROR", message: `Unsupported file type: ${ext}` } });
          return;
      }
    } catch (parseErr) {
      logger.error({ err: parseErr, file: file.originalname }, "File parsing failed");
      cleanup(file.path);
      res.status(400).json({
        error: { code: "PARSE_ERROR", message: `Failed to parse file: ${(parseErr as Error).message}` },
      });
      return;
    }

    cleanup(file.path);

    res.json({
      type,
      cards: cards.map((c, i) => ({
        index: i,
        front: c.front,
        back: c.back,
        tags: c.tags || "",
        cardType: c.cardType || "basic",
        choices: c.choices || "",
        correctIndex: c.correctIndex,
      })),
      total: cards.length,
      format: ext.slice(1),
    });
  } catch (err) {
    logger.error({ err }, "Card upload failed");
    if (req.file) cleanup(req.file.path);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Upload failed" } });
  }
});

// POST /api/upload/pdf-cards -> convert already-extracted text into cards (for PDFs)
router.post("/pdf-cards", async (req: Request, res: Response) => {
  try {
    const { text, deckName } = req.body as { text?: string; deckName?: string };
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "text is required" } });
      return;
    }
    const cards = parseText(text);
    res.json({
      type: "cards",
      cards: cards.map((c, i) => ({
        index: i,
        front: c.front,
        back: c.back,
        tags: c.tags || "",
        cardType: c.cardType || "basic",
      })),
      total: cards.length,
    });
  } catch (err) {
    logger.error({ err }, "PDF card conversion failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Conversion failed" } });
  }
});

// POST /api/upload/cards/create -> create a deck / Qbank from parsed cards
router.post("/cards/create", async (req: Request, res: Response) => {
  try {
    const { cards, deckName, deckType, skipDuplicates } = req.body as {
      cards: ParsedCard[];
      deckName: string;
      deckType: "deck" | "qbank";
      skipDuplicates?: boolean;
    };

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No cards provided" } });
      return;
    }
    if (!deckName || !deckType) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "deckName and deckType are required" } });
      return;
    }

    const { db, decks, cards: cardsTable } = await import("../db/index.js");

    let cardsToInsert = cards;
    if (skipDuplicates) {
      const existing = await db.query.cards.findMany();
      const existingFronts = new Set(existing.map((c) => c.front.trim().toLowerCase()));
      cardsToInsert = cards.filter((c) => !existingFronts.has(c.front.trim().toLowerCase()));
    }

    if (cardsToInsert.length === 0) {
      res.json({ imported: 0, skipped: cards.length, message: "All cards were duplicates" });
      return;
    }

    const now = new Date();
    const [deck] = await db
      .insert(decks)
      .values({
        name: deckName,
        description: `Created from file upload (${deckType})`,
        kind: deckType,
        userId: req.isAuthenticated() ? (req.user as { id: string }).id : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const inserted = await db
      .insert(cardsTable)
      .values(
        cardsToInsert.map((c) => ({
          deckId: deck.id,
          front: c.front,
          back: c.back,
          tags: c.tags || null,
          cardType: c.cardType || "basic",
          choices: c.choices || null,
          correctIndex: c.correctIndex ?? null,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();

    res.status(201).json({
      deckId: deck.id,
      deckName: deck.name,
      deckType,
      imported: inserted.length,
      skipped: cards.length - cardsToInsert.length,
      total: cards.length,
    });
  } catch (err) {
    logger.error({ err }, "Create deck from upload failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create deck" } });
  }
});

export default router;
