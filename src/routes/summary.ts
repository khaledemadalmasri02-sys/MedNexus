import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { summaries } from "../db/index";
import { createAIService } from "../lib/ai";
import { extractPdfText } from "../lib/pdfText";
import { logger } from "../lib/logger";

export const summaryRoutes = new Hono<AppEnv>();

function getDb(c: any): DB {
  return c.get("db");
}
function getUserId(c: any): string | null {
  return c.get("user")?.id ?? null;
}

// Standard error envelope matching the rest of the API.
function err(c: any, status: number, code: string, message: string) {
  return c.json({ error: { code, message } }, status);
}

// ── Structured summary shape ──
interface Definition {
  term: string;
  definition: string;
}
interface Section {
  heading: string;
  body: string;
}
interface StructuredSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  definitions: Definition[];
  clinicalPearls: string[];
  sections: Section[];
}

// Reuse the same text cleanup as POST /extract/text.
function cleanText(text: string): string {
  return (text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// Robust JSON extraction: strip ```json fences, locate the object, drop trailing commas.
function parseJsonObject(raw: string): any {
  let s = (raw || "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("No JSON object found in AI response");
  s = s.slice(start, end + 1);
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(s);
}

function normalizeSummary(obj: any, fallbackTitle: string): StructuredSummary {
  const asStr = (v: any, d = "") => (typeof v === "string" ? v : d);
  const asStrArr = (v: any): string[] => {
    if (!Array.isArray(v)) return [];
    return v.map((x) => (typeof x === "string" ? x : x == null ? "" : String(x))).filter(Boolean);
  };
  const defs: Definition[] = Array.isArray(obj.definitions)
    ? obj.definitions
        .map((d: any) => ({ term: asStr(d?.term), definition: asStr(d?.definition) }))
        .filter((d: Definition) => d.term || d.definition)
    : [];
  const sections: Section[] = Array.isArray(obj.sections)
    ? obj.sections
        .map((s: any) => ({ heading: asStr(s?.heading), body: asStr(s?.body) }))
        .filter((s: Section) => s.heading || s.body)
    : [];
  return {
    title: asStr(obj.title, fallbackTitle),
    summary: asStr(obj.summary),
    keyPoints: asStrArr(obj.keyPoints),
    definitions: defs,
    clinicalPearls: asStrArr(obj.clinicalPearls),
    sections,
  };
}

function renderMarkdown(s: StructuredSummary): string {
  const parts: string[] = [];
  parts.push(`# ${s.title || "Summary"}`, "");
  if (s.summary) parts.push(s.summary.trim(), "");
  for (const sec of s.sections) {
    parts.push(`## ${sec.heading}`.trim(), "");
    if (sec.body) parts.push(sec.body.trim(), "");
  }
  if (s.keyPoints.length) {
    parts.push("## Key Points", "");
    for (const k of s.keyPoints) parts.push(`- ${k}`.trim());
    parts.push("");
  }
  if (s.definitions.length) {
    parts.push("## Definitions", "");
    for (const d of s.definitions) parts.push(`- **${d.term}**: ${d.definition}`.trim());
    parts.push("");
  }
  if (s.clinicalPearls.length) {
    parts.push("## Clinical Pearls", "");
    for (const p of s.clinicalPearls) parts.push(`> ${p}`.trim());
    parts.push("");
  }
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// Pure-text fallback when no AI provider is configured or the AI call fails.
function fallbackSummary(text: string, title: string, style?: string): StructuredSummary {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const keyPoints = lines
    .filter((l) => l.length > 20 && l.length < 220 && !/^#+\s/.test(l))
    .slice(0, 8);

  const definitions: Definition[] = lines
    .filter((l) => /^[^:]{1,40}:/.test(l))
    .slice(0, 10)
    .map((l) => {
      const idx = l.indexOf(":");
      return { term: l.slice(0, idx).trim(), definition: l.slice(idx + 1).trim() };
    })
    .filter((d) => d.term && d.definition);

  const preview = lines.slice(0, 40).join("\n");

  return {
    title,
    summary:
      `> Auto-extracted summary${style ? ` (style: ${style})` : ""}. No AI provider is configured, ` +
      `so this is a best-effort extraction from the source text.`,
    keyPoints,
    definitions,
    clinicalPearls: [],
    sections: [{ heading: "Source Extract", body: preview }],
  };
}

async function generateSummary(
  ai: ReturnType<typeof createAIService>,
  text: string,
  style: string | undefined,
  title: string
): Promise<StructuredSummary> {
  const promptTitle = title || "Untitled";
  if (ai.hasAnyProvider()) {
    try {
      const system = `You are an expert medical summarizer. Produce a structured JSON summary of the provided text.
Return ONLY a JSON object with exactly these keys:
{
  "title": string,
  "summary": string (markdown overview),
  "keyPoints": string[],
  "definitions": [{"term": string, "definition": string}],
  "clinicalPearls": string[],
  "sections": [{"heading": string, "body": string}]
}
Respond with valid JSON only. Do not wrap it in code fences.`;
      const user = `Style requested: ${style || "default"}.
Title: ${promptTitle}

Text to summarize:
${text.slice(0, 30000)}`;

      const raw = await ai.complete([
        { role: "system", content: system },
        { role: "user", content: user },
      ]);
      const parsed = parseJsonObject(raw);
      return normalizeSummary(parsed, promptTitle);
    } catch (e: any) {
      logger.warn({ err: e?.message, title: promptTitle }, "AI summary failed, using offline fallback");
    }
  }
  return fallbackSummary(text, promptTitle, style);
}

function findSummary(db: DB, id: string, userId: string | null) {
  return userId
    ? db.query.summaries.findFirst({ where: (t: any, { and, eq }: any) => and(eq(t.id, id), eq(t.userId, userId)) })
    : db.query.summaries.findFirst({ where: eq(summaries.id, id) });
}

// ── POST /summary/upload ──
summaryRoutes.post("/summary/upload", async (c) => {
  try {
    const userId = getUserId(c);
    let rawText = "";
    let fileName = "untitled";
    let style: string | undefined;

    const ct = c.req.header("content-type") || "";
    if (ct.includes("multipart/form-data")) {
      const form = await c.req.raw.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return err(c, 400, "VALIDATION_ERROR", "No file provided");
      }
      const f = file as File;
      fileName = f.name || "document";
      style = (form.get("style") as string) || undefined;
      const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name || "");
      if (isPdf) {
        const buf = new Uint8Array(await f.arrayBuffer());
        const { text } = await extractPdfText(buf);
        rawText = text || "";
      } else {
        rawText = await f.text();
      }
    } else {
      const body = (await c.req.json().catch(() => ({}))) as any;
      rawText = body.text || "";
      fileName = body.fileName || "untitled";
      style = body.style || undefined;
    }

    const cleaned = cleanText(rawText);
    if (!cleaned) {
      return err(c, 400, "VALIDATION_ERROR", "No usable text found in the upload");
    }
    const wordCount = countWords(cleaned);
    const id = crypto.randomUUID();

    await getDb(c)
      .insert(summaries)
      .values({
        id,
        userId: userId || null,
        title: fileName,
        style: style || null,
        sourceText: cleaned,
        status: "ready",
        wordCount,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return c.json({ id, fileName, wordCount, status: "ready" }, 201);
  } catch (e: any) {
    logger.error({ err: e?.message }, "Failed to upload summary");
    return err(c, 500, "INTERNAL_ERROR", "Failed to upload summary");
  }
});

// ── POST /summary/generate ──
summaryRoutes.post("/summary/generate", async (c) => {
  try {
    const userId = getUserId(c);
    const body = (await c.req.json().catch(() => ({}))) as any;
    const ai = createAIService(c.env);

    let sourceText = "";
    let title = body.title || "Untitled Summary";
    let style: string | undefined = body.style;

    if (body.id) {
      const row = await findSummary(getDb(c), body.id, userId);
      if (!row) return err(c, 404, "NOT_FOUND", "Summary not found");
      sourceText = row.sourceText || "";
      title = body.title || row.title || title;
      style = body.style || (row.style as string | undefined);
    } else {
      sourceText = cleanText(body.text || "");
      if (!sourceText) return err(c, 400, "VALIDATION_ERROR", "No text or id provided");
    }

    const structured = await generateSummary(ai, sourceText, style, title);
    const markdown = renderMarkdown(structured);

    const values: any = {
      title: structured.title,
      style: style || null,
      summaryMarkdown: markdown,
      summaryJson: JSON.stringify(structured),
      status: "completed",
      updatedAt: new Date(),
    };

    if (body.id) {
      await getDb(c).update(summaries).set(values).where(eq(summaries.id, body.id));
    } else {
      const id = crypto.randomUUID();
      await getDb(c)
        .insert(summaries)
        .values({
          id,
          userId: userId || null,
          sourceText,
          wordCount: countWords(sourceText),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...values,
        });
      (structured as any).id = id;
    }

    return c.json(structured, 200);
  } catch (e: any) {
    logger.error({ err: e?.message }, "Failed to generate summary");
    return err(c, 500, "INTERNAL_ERROR", "Failed to generate summary");
  }
});

// ── GET /summary/status/:id ──
summaryRoutes.get("/summary/status/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param("id");
    const row = await findSummary(getDb(c), id, userId);
    if (!row) return err(c, 404, "NOT_FOUND", "Summary not found");
    const completed = row.status === "completed";
    return c.json({
      id: row.id,
      status: row.status,
      title: row.title,
      style: row.style,
      wordCount: row.wordCount,
      error: row.error,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ...(completed
        ? { summaryMarkdown: row.summaryMarkdown, summaryJson: row.summaryJson }
        : {}),
    });
  } catch (e: any) {
    return err(c, 500, "INTERNAL_ERROR", "Failed to get summary status");
  }
});

// ── GET /summary/download/:id ──
summaryRoutes.get("/summary/download/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param("id");
    const format = (c.req.query("format") || "md").toLowerCase();
    const row = await findSummary(getDb(c), id, userId);
    if (!row || !row.summaryMarkdown) return err(c, 404, "NOT_FOUND", "Summary not found");
    const contentType = format === "txt" ? "text/plain; charset=utf-8" : "text/markdown; charset=utf-8";
    return c.text(row.summaryMarkdown, 200, { "Content-Type": contentType });
  } catch (e: any) {
    return err(c, 500, "INTERNAL_ERROR", "Failed to download summary");
  }
});

// ── GET /summary/list ──
summaryRoutes.get("/summary/list", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ summaries: [] });
    const rows = await getDb(c).query.summaries.findMany({
      where: eq(summaries.userId, userId),
      orderBy: desc(summaries.updatedAt),
    });
    const list = rows.map((r) => ({
      id: r.id,
      title: r.title,
      style: r.style,
      status: r.status,
      wordCount: r.wordCount,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    return c.json({ summaries: list });
  } catch (e: any) {
    return err(c, 500, "INTERNAL_ERROR", "Failed to list summaries");
  }
});

// ── POST /summary/ask ──
summaryRoutes.post("/summary/ask", async (c) => {
  try {
    const userId = getUserId(c);
    const body = (await c.req.json().catch(() => ({}))) as any;
    const question = (body.question || "").trim();
    if (!question) return err(c, 400, "VALIDATION_ERROR", "No question provided");

    let context = "";
    if (body.id) {
      const row = await findSummary(getDb(c), body.id, userId);
      if (!row) return err(c, 404, "NOT_FOUND", "Summary not found");
      context = row.summaryMarkdown || row.sourceText || "";
    } else {
      context = cleanText(body.text || "");
    }
    if (!context) return err(c, 400, "VALIDATION_ERROR", "No summary or text provided to answer against");

    const ai = createAIService(c.env);
    if (ai.hasAnyProvider()) {
      try {
        const answer = await ai.complete([
          {
            role: "system",
            content:
              "You are an expert medical tutor. Answer the user's question using ONLY the provided summary context. " +
              "Be concise and accurate. If the answer is not in the context, say so.",
          },
          {
            role: "user",
            content: `Summary context:\n\n${context.slice(0, 30000)}\n\nQuestion: ${question}`,
          },
        ]);
        return c.json({ answer });
      } catch (e: any) {
        logger.warn({ err: e?.message }, "AI ask failed");
      }
    }

    return c.json({
      answer:
        "AI answering requires a configured AI provider key. Add an API key (OpenRouter, OpenAI, Groq, Mistral, or Google) " +
        "in your environment to enable question answering over summaries.",
    });
  } catch (e: any) {
    return err(c, 500, "INTERNAL_ERROR", "Failed to answer question");
  }
});

// ── GET /summary/preview/:id ──
summaryRoutes.get("/summary/preview/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const id = c.req.param("id");
    const row = await findSummary(getDb(c), id, userId);
    if (!row) return err(c, 404, "NOT_FOUND", "Summary not found");
    if (row.summaryJson) {
      try {
        return c.json(JSON.parse(row.summaryJson));
      } catch {
        return c.json(row);
      }
    }
    return c.json(row);
  } catch (e: any) {
    return err(c, 500, "INTERNAL_ERROR", "Failed to preview summary");
  }
});

// ── Unsupported stubs (TTS / shell are not available on Workers) ──
const NOT_SUPPORTED = "This feature is not supported on Cloudflare Workers (TTS/terminal pipelines are unavailable).";
function stub(c: any) {
  return c.json({ error: { code: "NOT_SUPPORTED", message: NOT_SUPPORTED } }, 501);
}

summaryRoutes.post("/summary/shell", (c) => stub(c));
summaryRoutes.get("/summary/audio/:id", (c) => stub(c));
