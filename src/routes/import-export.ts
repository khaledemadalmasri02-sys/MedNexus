import { Hono } from "hono";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import type { AppEnv } from "../types";
import { decks, cards } from "../db/index";
import { getDb } from "../lib/helpers";
import { validate } from "../middleware/validate";
import { logger } from "../lib/logger";

export const importExportRoutes = new Hono<AppEnv>();

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

const bulkExportSchema = z.object({
  deckIds: z.array(z.number().int().positive()).min(1),
  format: z.enum(["csv", "json"]).optional().default("csv"),
});

const parseImportSchema = z.object({
  text: z.string().min(1).max(200000),
  format: z.enum(["csv", "tsv", "json", "text"]).optional(),
});

importExportRoutes.post("/decks/:id/import", validate(importCardsSchema), async (c) => {
  const deckId = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(deckId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
  }

  const { cards: importCards, skipDuplicates } = c.get("validated") as any;

  try {
    const db = getDb(c);
    const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) });
    if (!deck) {
      return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    }

    let cardsToInsert = importCards;
    if (skipDuplicates) {
      const existingCards = await db.query.cards.findMany({
        where: eq(cards.deckId, deckId),
      });
      const existingFronts = new Set(existingCards.map(c => c.front.trim().toLowerCase()));
      cardsToInsert = importCards.filter((c: { front: string }) => !existingFronts.has(c.front.trim().toLowerCase()));
    }

    if (cardsToInsert.length === 0) {
      return c.json({ imported: 0, skipped: importCards.length, message: "All cards were duplicates" });
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

    return c.json({
      imported: inserted.length,
      skipped: importCards.length - cardsToInsert.length,
      total: importCards.length,
    }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to import cards");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to import cards" } }, 500);
  }
});

importExportRoutes.get("/decks/:id/export", async (c) => {
  const deckId = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(deckId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid deck ID" } }, 400);
  }

  const format = c.req.query("format") || "csv";

  try {
    const db = getDb(c);
    const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) });
    if (!deck) {
      return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    }

    const deckCards = await db.query.cards.findMany({
      where: eq(cards.deckId, deckId),
      orderBy: (cards, { asc }) => [asc(cards.createdAt)],
    });

    if (format === "json") {
      return c.json({
        deckName: deck.name,
        description: deck.description,
        cards: deckCards.map(cc => ({
          front: cc.front,
          back: cc.back,
          tags: cc.tags,
          cardType: cc.cardType,
          choices: cc.choices,
          correctIndex: cc.correctIndex,
        })),
        cardCount: deckCards.length,
      });
    }

    if (format === "md") {
      const lines = deckCards.map((cc, i) => {
        const tags = cc.tags ? ` [${cc.tags}]` : "";
        return `## Card ${i + 1}${tags}\n\n**Q:** ${cc.front}\n\n**A:** ${cc.back}\n\n---`;
      });
      const markdown = `# ${deck.name}\n\n${lines.join("\n\n")}`;
      return new Response(markdown, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${deck.name}.md"`,
        },
      });
    }

    const rows = deckCards.map(cc => {
      const front = cc.front.replace(/\t/g, " ").replace(/\n/g, "<br>");
      const back = cc.back.replace(/\t/g, " ").replace(/\n/g, "<br>");
      const tags = cc.tags ? cc.tags.replace(/\t/g, " ") : "";
      return tags ? `${front}\t${back}\t${tags}` : `${front}\t${back}`;
    });

    return c.json({ deckName: deck.name, csv: rows.join("\n"), cardCount: deckCards.length });
  } catch (err) {
    logger.error({ err }, "Failed to export deck");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to export deck" } }, 500);
  }
});

importExportRoutes.post("/decks/bulk-export", validate(bulkExportSchema), async (c) => {
  const { deckIds, format } = c.get("validated") as any;

  try {
    const db = getDb(c);
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
          cards: deckCards.map(cc => ({
            front: cc.front, back: cc.back, tags: cc.tags, cardType: cc.cardType,
          })),
        }, null, 2);
        mimeType = "application/json";
      } else {
        const rows = deckCards.map(cc => {
          const front = cc.front.replace(/\t/g, " ").replace(/\n/g, "<br>");
          const back = cc.back.replace(/\t/g, " ").replace(/\n/g, "<br>");
          const tags = cc.tags ? cc.tags.replace(/\t/g, " ") : "";
          return tags ? `${front}\t${back}\t${tags}` : `${front}\t${back}`;
        });
        content = rows.join("\n");
        mimeType = "text/csv";
      }

      return { name: deck.name, content, mimeType, cardCount: deckCards.length };
    }));

    return c.json({ files: results, format });
  } catch (err) {
    logger.error({ err }, "Failed to bulk export decks");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to export decks" } }, 500);
  }
});

importExportRoutes.post("/import/parse", validate(parseImportSchema), async (c) => {
  const { text, format: hint } = c.get("validated") as any;

  try {
    let detectedFormat = hint;
    const results: Array<{ front: string; back: string; cardType: string; tags: string; error?: string }> = [];

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
        return c.json({ error: { code: "VALIDATION_ERROR", message: "JSON must be an array or have a 'cards' field" } }, 400);
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
      const lines = text.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        const parts = line.includes("\t") ? line.split("\t") : line.split(" - ").map((p: string) => p.trim());
        if (parts.length < 2) {
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

    return c.json({
      cards: results,
      total: results.length,
      valid: results.filter(r => !r.error).length,
      invalid: results.filter(r => !!r.error).length,
      format: detectedFormat,
    });
  } catch (err) {
    logger.error({ err }, "Failed to parse import");
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Failed to parse file content" } }, 400);
  }
});
