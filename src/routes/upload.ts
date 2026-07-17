import { Hono } from "hono";
import { eq, inArray, sql } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { decks, cards as cardsTable } from "../db/index";
import { getDb, getUserId, serverError, insertBatched } from "../lib/helpers";

export const uploadRoutes = new Hono<AppEnv>();

interface ParsedCard {
  front: string;
  back: string;
  tags?: string;
  cardType?: string;
  choices?: string;
  correctIndex?: number;
}

// Minimal CSV/TSV line splitter (handles double-quoted fields and escaped quotes).
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delimiter) { out.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseDelimited(content: string, delimiter: string): ParsedCard[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitLine(lines[0], delimiter).map((h) => h.trim().toLowerCase());
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cols[idx] ?? "").trim(); });
    records.push(row);
  }
  return records
    .map((row) => ({
      front: row.front || row.question || row.q || row.term || "",
      back: row.back || row.answer || row.a || row.definition || "",
      tags: row.tags || row.tag || "",
      cardType: row.cardtype || row.type || "basic",
      choices: row.choices || row.options || "",
      correctIndex:
        row.correctindex !== undefined
          ? parseInt(row.correctindex, 10)
          : row.correct !== undefined
            ? parseInt(row.correct, 10)
            : undefined,
    }))
    .filter((c) => c.front && c.back);
}

function parseJSON(content: string): ParsedCard[] {
  const data = JSON.parse(content);
  const raw = Array.isArray(data) ? data : (data as any).cards || [];
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

// ---- Robust free-text note parser ----------------------------------------

const FRONT_RE = /^(q|question|front|prompt|term)\b[ \t]*[:.)-][ \t]*/i;
const BACK_RE = /^(a|answer|back|definition|def)\b[ \t]*[:.)-][ \t]*/i;
// Detects an answer marker embedded later in the same line, e.g.
// "What is X? A: Y" or "Q: Define apoptosis. Answer: cell death".
const EMBED_RE =
  /(.*?)(?:answer|back|definition|def|a)\b[ \t]*[:.)-][ \t]*(.*)/i;

function normalize(content: string): string {
  return content.replace(/\r\n?/g, "\n");
}

function splitFirst(s: string, sep: string): [string, string] {
  const i = s.indexOf(sep);
  if (i === -1) return ["", ""];
  return [s.slice(0, i), s.slice(i + sep.length)];
}

function makeCard(front: string, back: string, tags = ""): ParsedCard {
  const f = front.trim();
  const b = back.trim();
  if (!f || !b) return { front: "", back: "" };
  return { front: f, back: b, tags: tags.trim(), cardType: "basic" };
}

// Inline single-line parsing for non-marker lines (or the remainder of a
// numbered / bulleted line). Tries the documented separators in priority
// order and returns the first that yields both a front and a back.
function parseInlineLine(line: string): ParsedCard | null {
  let l = line.trim();

  const num = l.match(/^\d+[.)][ \t]+(.*)$/);
  if (num) l = num[1].trim();
  const bul = l.match(/^[-*•][ \t]+(.*)$/);
  if (bul) l = bul[1].trim();

  if (!l) return null;

  // Embedded answer marker on the same line ("Q: front A: back").
  const emb = l.match(EMBED_RE);
  if (emb && emb[2] !== undefined) {
    const c = makeCard(emb[1], emb[2]);
    if (c.front) return c;
  }

  // TAB-separated: front \t back [\t tags]
  if (l.includes("\t")) {
    const f = l.split("\t");
    if (f.length >= 2) {
      const c = makeCard(f[0], f[1], f[2] || "");
      if (c.front) return c;
    }
  }

  // "front :: back"
  if (l.includes("::")) {
    const [a, b] = splitFirst(l, "::");
    const c = makeCard(a, b);
    if (c.front) return c;
  }

  // "front | back"
  if (l.includes("|")) {
    const [a, b] = splitFirst(l, "|");
    const c = makeCard(a, b);
    if (c.front) return c;
  }

  // "front; back" (only a single, unambiguous semicolon)
  if ((l.match(/;/g) || []).length === 1) {
    const [a, b] = splitFirst(l, ";");
    const c = makeCard(a, b);
    if (c.front) return c;
  }

  // "front - back"
  if (l.includes(" - ")) {
    const [a, b] = splitFirst(l, " - ");
    const c = makeCard(a, b);
    if (c.front) return c;
  }

  // "front: back" (split on first colon+space)
  const ci = l.indexOf(": ");
  if (ci !== -1) {
    const c = makeCard(l.slice(0, ci), l.slice(ci + 2));
    if (c.front) return c;
  }

  // Last resort: a sentence ending in '?' with the rest as the answer.
  const qi = l.indexOf("?");
  if (qi !== -1) {
    const c = makeCard(l.slice(0, qi + 1), l.slice(qi + 1));
    if (c.front) return c;
  }

  return null;
}

// Parse free-form study notes (txt / md) into cards. Handles Q/A markers
// (across consecutive lines or inline), term/definition, colon/dash/pipe/
// semicolon/TAB separators, numbered & bulleted lists, and a '?' fallback.
function parseText(content: string): ParsedCard[] {
  const lines = normalize(content).split("\n");
  const cards: ParsedCard[] = [];

  let pending: { front: string; back: string[]; hasBack: boolean } | null = null;

  const flush = () => {
    if (!pending) return;
    const front = pending.front.trim();
    const back = pending.back.join("\n").trim();
    if (front && back) cards.push({ front, back, tags: "", cardType: "basic" });
    pending = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      // A blank line closes an open Q/A block.
      flush();
      continue;
    }

    const bMatch = line.match(BACK_RE);
    if (bMatch) {
      const rest = line.slice(bMatch[0].length).trim();
      if (pending) {
        pending.hasBack = true;
        if (rest) pending.back.push(rest);
      }
      continue;
    }

    const fMatch = line.match(FRONT_RE);
    if (fMatch) {
      flush();
      const rest = line.slice(fMatch[0].length).trim();
      const keyword = (fMatch[1] || "").toLowerCase();

      // Front + answer on the same line.
      const emb = rest.match(EMBED_RE);
      if (emb && emb[2] !== undefined) {
        const c = makeCard(emb[1], emb[2]);
        if (c.front) cards.push(c);
        continue;
      }

      if (rest) {
        if (keyword === "term") {
          // "Term: definition" -> split on the first colon of the whole line.
          const ci = line.indexOf(":");
          const c = makeCard(line.slice(0, ci), line.slice(ci + 1));
          if (c.front) cards.push(c);
          continue;
        }
        // "Question: ..." (answer expected on following lines).
        pending = { front: rest, back: [], hasBack: false };
        continue;
      }

      // Marker with no inline text: following lines are the front/back.
      pending = { front: "", back: [], hasBack: false };
      continue;
    }

    // Non-marker line.
    if (pending) {
      if (pending.hasBack) pending.back.push(line);
      else pending.front += (pending.front ? "\n" : "") + line;
    } else {
      const c = parseInlineLine(line);
      if (c) cards.push(c);
    }
  }

  flush();
  return cards;
}

// POST /api/upload/cards
// Accepts BOTH multipart FormData (field name 'file' — txt/md/csv/tsv/json)
// and the legacy JSON body { content, fileName }. Binary formats (pdf/docx)
// are not parsed server-side; the client must extract text and POST it to
// /api/upload/pdf-cards.
uploadRoutes.post("/upload/cards", async (c) => {
  try {
    let content: string | null = null;
    let fileName = "";

    const contentType = c.req.header("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await c.req.raw.formData();
      const fileEntry = form.get("file");
      if (fileEntry && typeof fileEntry !== "string") {
        const file = fileEntry as File;
        content = await file.text();
        fileName = file.name || "";
      } else {
        // Allow a 'content' field as a fallback within the multipart body.
        const contentField = form.get("content");
        if (typeof contentField === "string") {
          content = contentField;
          fileName = typeof form.get("fileName") === "string" ? (form.get("fileName") as string) : "";
        }
      }
    } else {
      let body: any = {};
      try { body = await c.req.json(); } catch { /* no JSON body */ }
      content = typeof body.content === "string" ? body.content : null;
      fileName = typeof body.fileName === "string" ? body.fileName : "";
    }

    const ext = (fileName || "").toLowerCase().split(".").pop() || "";

    if (content === null || content.trim().length === 0) {
      return c.json(
        {
          error: {
            code: "NOT_SUPPORTED",
            message:
              "No readable text was provided. Send a multipart FormData with a 'file' field, or a JSON body { content, fileName } (csv/tsv/json/txt/md), or use /api/upload/pdf-cards with your extracted text.",
          },
        },
        501,
      );
    }

    if (ext === "pdf" || ext === "docx") {
      return c.json(
        {
          error: {
            code: "NOT_SUPPORTED",
            message: `Binary ${ext.toUpperCase()} parsing is not supported on this deployment. Extract the text client-side and POST it to /api/upload/pdf-cards.`,
          },
        },
        501,
      );
    }

    let parsed: ParsedCard[] = [];
    try {
      switch (ext) {
        case "csv": parsed = parseDelimited(content, ","); break;
        case "tsv": parsed = parseDelimited(content, "\t"); break;
        case "json": parsed = parseJSON(content); break;
        case "txt":
        case "md":
        case "": parsed = parseText(content); break;
        default: parsed = parseText(content);
      }
    } catch (parseErr) {
      return c.json(
        { error: { code: "PARSE_ERROR", message: `Failed to parse file: ${(parseErr as Error).message}` } },
        400,
      );
    }

    return c.json({
      type: "cards" as const,
      cards: parsed.map((cd, i) => ({
        index: i,
        front: cd.front,
        back: cd.back,
        tags: cd.tags || "",
        cardType: cd.cardType || "basic",
        choices: cd.choices || "",
        correctIndex: cd.correctIndex,
      })),
      total: parsed.length,
      format: ext || "txt",
    });
  } catch (err) {
    return serverError(c, "Upload failed");
  }
});

// POST /api/upload/pdf-cards — convert already-extracted TEXT into cards.
uploadRoutes.post("/upload/pdf-cards", async (c) => {
  try {
    let body: any = {};
    try { body = await c.req.json(); } catch { /* no body */ }
    const { text } = body as { text?: string };
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "text is required" } }, 400);
    }
    const parsed = parseText(text);
    return c.json({
      type: "cards" as const,
      cards: parsed.map((cd, i) => ({
        index: i,
        front: cd.front,
        back: cd.back,
        tags: cd.tags || "",
        cardType: cd.cardType || "basic",
      })),
      total: parsed.length,
      format: "txt",
    });
  } catch (err) {
    return serverError(c, "Conversion failed");
  }
});

// POST /api/upload/cards/create — create a deck/Qbank from parsed cards (DB-backed).
uploadRoutes.post("/upload/cards/create", async (c) => {
  try {
    let body: any = {};
    try { body = await c.req.json(); } catch { /* no body */ }
    const { cards, deckName, deckType, skipDuplicates } = body as {
      cards: ParsedCard[];
      deckName: string;
      deckType: "deck" | "qbank";
      skipDuplicates?: boolean;
    };

    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "No cards provided" } }, 400);
    }
    if (!deckName || !deckType) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "deckName and deckType are required" } }, 400);
    }

    const db: DB = getDb(c);
    let cardsToInsert = cards;
    if (skipDuplicates) {
      const existing = await db.query.cards.findMany();
      const existingFronts = new Set(existing.map((cd) => cd.front.trim().toLowerCase()));
      cardsToInsert = cards.filter((cd) => !existingFronts.has(cd.front.trim().toLowerCase()));
    }

    if (cardsToInsert.length === 0) {
      return c.json({ imported: 0, skipped: cards.length, message: "All cards were duplicates" });
    }

    const userId = getUserId(c);
    const now = new Date();
    const [deck] = await db
      .insert(decks)
      .values({
        name: deckName,
        description: `Created from file upload (${deckType})`,
        kind: deckType,
        userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const inserted = await insertBatched(
      db,
      cardsTable,
      cardsToInsert.map((cd) => ({
        deckId: deck.id,
        front: cd.front,
        back: cd.back,
        tags: cd.tags || null,
        cardType: cd.cardType || "basic",
        choices: cd.choices || null,
        correctIndex: cd.correctIndex ?? null,
        createdAt: now,
        updatedAt: now,
      })),
    );

    return c.json(
      {
        deckId: deck.id,
        deckName: deck.name,
        deckType,
        imported: inserted.length,
        skipped: cards.length - cardsToInsert.length,
        total: cards.length,
      },
      201,
    );
  } catch (err) {
    return serverError(c, "Failed to create deck");
  }
});
