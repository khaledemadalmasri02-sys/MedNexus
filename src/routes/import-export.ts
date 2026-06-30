import { Router, Request, Response } from "express";
import { db, decks, cards } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";

const router = Router();

function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

function deckOwnerFilter(userId: string | null) {
  return userId ? eq(decks.userId, userId) : ((decks.userId as unknown) === null);
}

// ── Import schema ──
const importCardsSchema = z.object({
  cards: z.array(z.object({
    front: z.string().min(1).max(10000),
    back: z.string().min(1).max(10000),
    cardType: z.enum(["basic", "mcq"]).optional(),
    tags: z.string().max(500).optional(),
    choices: z.string().max(5000).optional(),
    correctIndex: z.number().int().min(0).max(10).optional(),
  })).min(1).max(1000),
  skipDuplicates: z.boolean().optional().default(false),
});

// ── POST /api/decks/:id/import — import cards into a deck ──
router.post("/decks/:id/import", validateBody(importCardsSchema), async (req: Request, res: Response) => {
  const deckId = parseInt(req.params.id, 10);
  if (isNaN(deckId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
    return;
  }

  const { cards: importCards, skipDuplicates } = req.body;

  try {
    const userId = getUserId(req);
    const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) });
    if (!deck) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
      return;
    }

    // Check for duplicates if requested
    let cardsToInsert = importCards;
    if (skipDuplicates) {
      const existingCards = await db.query.cards.findMany({
        where: eq(cards.deckId, deckId),
      });
      const existingFronts = new Set(existingCards.map(c => c.front.trim().toLowerCase()));
      cardsToInsert = importCards.filter((c: { front: string }) => !existingFronts.has(c.front.trim().toLowerCase()));
    }

    if (cardsToInsert.length === 0) {
      res.json({ imported: 0, skipped: importCards.length, message: "All cards were duplicates" });
      return;
    }

    const now = new Date();
    const inserted = await db.insert(cards).values(
      cardsToInsert.map((c: { front: string; back: string; cardType?: string; tags?: string; choices?: string; correctIndex?: number }) => ({
        deckId,
        front: c.front,
        back: c.back,
        cardType: c.cardType || "basic",
        tags: c.tags || null,
        choices: c.choices || null,
        correctIndex: c.correctIndex ?? null,
        createdAt: now,
        updatedAt: now,
      }))
    ).returning();

    res.status(201).json({
      imported: inserted.length,
      skipped: importCards.length - cardsToInsert.length,
      total: importCards.length,
    });
  } catch (err) {
    logger.error({ err }, "Failed to import cards");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to import cards" } });
  }
});

// ── GET /api/decks/:id/export?format=csv|json|md — extended export ──
router.get("/decks/:id/export", async (req: Request, res: Response) => {
  const deckId = parseInt(req.params.id, 10);
  if (isNaN(deckId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } });
    return;
  }

  const format = (req.query.format as string) || "csv";

  try {
    const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) });
    if (!deck) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
      return;
    }

    const deckCards = await db.query.cards.findMany({
      where: eq(cards.deckId, deckId),
      orderBy: (cards, { asc }) => [asc(cards.createdAt)],
    });

    if (format === "json") {
      res.json({
        deckName: deck.name,
        description: deck.description,
        cards: deckCards.map(c => ({
          front: c.front,
          back: c.back,
          tags: c.tags,
          cardType: c.cardType,
          choices: c.choices,
          correctIndex: c.correctIndex,
        })),
        cardCount: deckCards.length,
      });
      return;
    }

    if (format === "md") {
      const lines = deckCards.map((c, i) => {
        const tags = c.tags ? ` [${c.tags}]` : "";
        return `## Card ${i + 1}${tags}\n\n**Q:** ${c.front}\n\n**A:** ${c.back}\n\n---`;
      });
      res.setHeader("Content-Type", "text/markdown");
      res.setHeader("Content-Disposition", `attachment; filename="${deck.name}.md"`);
      res.send(`# ${deck.name}\n\n${lines.join("\n\n")}`);
      return;
    }

    // Default CSV
    const rows = deckCards.map(c => {
      const front = c.front.replace(/\t/g, " ").replace(/\n/g, "<br>");
      const back = c.back.replace(/\t/g, " ").replace(/\n/g, "<br>");
      const tags = c.tags ? c.tags.replace(/\t/g, " ") : "";
      return tags ? `${front}\t${back}\t${tags}` : `${front}\t${back}`;
    });

    res.json({ deckName: deck.name, csv: rows.join("\n"), cardCount: deckCards.length });
  } catch (err) {
    logger.error({ err }, "Failed to export deck");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to export deck" } });
  }
});

// ── POST /api/decks/bulk-export — export multiple decks as ZIP ──
const bulkExportSchema = z.object({
  deckIds: z.array(z.number().int().positive()).min(1),
  format: z.enum(["csv", "json"]).optional().default("csv"),
});

router.post("/decks/bulk-export", validateBody(bulkExportSchema), async (req: Request, res: Response) => {
  const { deckIds, format } = req.body;

  try {
    const allDecks = await db.query.decks.findMany({
      where: inArray(decks.id, deckIds),
    });

    const results = await Promise.all(allDecks.map(async (deck) => {
      const deckCards = await db.query.cards.findMany({
        where: eq(cards.deckId, deck.id),
        orderBy: (cards, { asc }) => [asc(cards.createdAt)],
      });

      let content: string;
      let mimeType: string;

      if (format === "json") {
        content = JSON.stringify({
          deckName: deck.name,
          cards: deckCards.map(c => ({
            front: c.front, back: c.back, tags: c.tags, cardType: c.cardType,
          })),
        }, null, 2);
        mimeType = "application/json";
      } else {
        const rows = deckCards.map(c => {
          const front = c.front.replace(/\t/g, " ").replace(/\n/g, "<br>");
          const back = c.back.replace(/\t/g, " ").replace(/\n/g, "<br>");
          const tags = c.tags ? c.tags.replace(/\t/g, " ") : "";
          return tags ? `${front}\t${back}\t${tags}` : `${front}\t${back}`;
        });
        content = rows.join("\n");
        mimeType = "text/csv";
      }

      return { name: deck.name, content, mimeType, cardCount: deckCards.length };
    }));

    // Return as JSON array of files (frontend will handle ZIP)
    res.json({ files: results, format });
  } catch (err) {
    logger.error({ err }, "Failed to bulk export decks");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to export decks" } });
  }
});

// ── POST /api/import/parse — parse uploaded file into cards preview ──
const parseImportSchema = z.object({
  text: z.string().min(1).max(200000),
  format: z.enum(["csv", "tsv", "json", "text"]).optional(),
});

router.post("/import/parse", validateBody(parseImportSchema), async (req: Request, res: Response) => {
  const { text, format: hint } = req.body;

  try {
    let detectedFormat = hint;
    const results: Array<{ front: string; back: string; cardType: string; tags: string; error?: string }> = [];

    // Auto-detect format
    if (!detectedFormat) {
      const trimmed = text.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        detectedFormat = "json";
      } else if (trimmed.includes("\t")) {
        detectedFormat = "tsv";
      } else {
        detectedFormat = "text";
      }
    }

    if (detectedFormat === "json") {
      const parsed = JSON.parse(text);
      const cardsArray = Array.isArray(parsed) ? parsed : parsed.cards;
      if (!Array.isArray(cardsArray)) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "JSON must be an array or have a 'cards' field" } });
        return;
      }
      for (const item of cardsArray) {
        const front = (item.front || item.question || "").trim();
        const back = (item.back || item.answer || "").trim();
        if (!front || !back) {
          results.push({ front: front || "(empty)", back: back || "(empty)", cardType: "basic", tags: "", error: "Missing front or back" });
        } else {
          results.push({ front, back, cardType: item.cardType || "basic", tags: item.tags || "" });
        }
      }
    } else if (detectedFormat === "csv" || detectedFormat === "tsv") {
      const delimiter = detectedFormat === "tsv" ? "\t" : ",";
      const lines = text.split("\n").filter((l: string) => l.trim() && !l.startsWith("#"));
      for (const line of lines) {
        const parts = line.split(delimiter).map((p: string) => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length < 2) {
          results.push({ front: parts[0] || "(empty)", back: "(empty)", cardType: "basic", tags: "", error: "Need at least 2 columns (front, back)" });
        } else {
          results.push({ front: parts[0], back: parts[1], cardType: parts[3] || "basic", tags: parts[2] || "" });
        }
      }
    } else {
      // Text: one card per line, front/back separated by tab or " - "
      const lines = text.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        const parts = line.includes("\t") ? line.split("\t") : line.split(" - ").map((p: string) => p.trim());
        if (parts.length < 2) {
          // Try splitting by first period or question mark
          const match = line.match(/^(.+?)[.?]\s+(.+)$/);
          if (match) {
            results.push({ front: match[1].trim(), back: match[2].trim(), cardType: "basic", tags: "" });
          } else {
            results.push({ front: line.trim(), back: "", cardType: "basic", tags: "", error: "Could not parse: no separator found" });
          }
        } else {
          results.push({ front: parts[0].trim(), back: parts[1].trim(), cardType: "basic", tags: parts[2] || "" });
        }
      }
    }

    res.json({
      cards: results,
      total: results.length,
      valid: results.filter(r => !r.error).length,
      invalid: results.filter(r => !!r.error).length,
      format: detectedFormat,
    });
  } catch (err) {
    logger.error({ err }, "Failed to parse import");
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Failed to parse file content" } });
  }
});

export default router;
