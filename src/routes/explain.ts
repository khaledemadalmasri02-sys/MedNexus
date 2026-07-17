import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppEnv } from "../types";
import { readJson } from "../lib/helpers";
import { createAIService } from "../lib/ai";
import { cards } from "../db/index";
import { validate, explainSchema, fullExplainSchema, batchExplainSchema } from "../middleware/validate";

export const explainRoutes = new Hono<AppEnv>();

type ExplanationMode = "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap";

// Map an explanation mode to the card column that stores it, so on-demand
// generation can persist the result back to the card for instant reuse.
const MODE_COLUMN: Record<ExplanationMode, string> = {
  full: "explanationFull",
  revision: "explanationRevision",
  osce: "explanationOsce",
  brief: "explanationBrief",
  mnemonic: "explanationMnemonic",
  clinical: "explanationClinical",
  testtrap: "explanationTesttrap",
};

// Persist a freshly generated explanation onto its card so Study mode can read
// it instantly next time (instead of hitting the AI API again).
async function persistExplanation(c: any, cardId: number, mode: ExplanationMode, content: string) {
  if (!cardId || !content || content.trim() === "") return;
  try {
    await c.get("db").update(cards)
      .set({ [MODE_COLUMN[mode]]: content, updatedAt: new Date() })
      .where(eq(cards.id, cardId));
  } catch (err) {
    // Persisting is best-effort; never fail the explanation request over it.
    console.error("Failed to persist explanation", err);
  }
}

const VALID_MODES: ExplanationMode[] = ["full", "revision", "osce", "brief", "mnemonic", "clinical", "testtrap"];

// Extract section headers (## / ###) from markdown
function extractSections(markdown: string): string[] {
  const sectionRegex = /^#{2,3}\s+(.+)$/gm;
  const sections: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(markdown)) !== null) {
    sections.push(match[1]);
  }
  return sections;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ── POST /api/explain ──
explainRoutes.post("/explain", validate(explainSchema), async (c) => {
  const { front, back, mode = "full", cardId } = c.get("validated") as any;
  try {
    const ai = createAIService(c.env);
    const explanation = await ai.explainCard(front, back, mode);
    await persistExplanation(c, cardId, mode, explanation);
    return c.json({
      explanation,
      mode,
      front,
      back,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return c.json({ error: { code: "GENERATION_ERROR", message: "Failed to generate explanation" } }, 500);
  }
});

// ── POST /api/explain/full ──
explainRoutes.post("/explain/full", validate(fullExplainSchema), async (c) => {
  const { front, back, topic } = c.get("validated") as any;
  try {
    const ai = createAIService(c.env);
    const explanation = await ai.explainCard(front, back, "full");
    const titleMatch = explanation.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : topic || front;
    return c.json({
      explanation,
      mode: "full" as const,
      front,
      back,
      title,
      sections: extractSections(explanation),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return c.json({ error: { code: "GENERATION_ERROR", message: "Failed to generate full explanation" } }, 500);
  }
});

// ── POST /api/explain/stream (SSE) ──
explainRoutes.post("/explain/stream", async (c) => {
  const body = await readJson(c);
  const { front, back, mode = "full" } = body as any;

  if (!front || !back) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Front and back of card are required" } }, 400);
  }
  if (!VALID_MODES.includes(mode)) {
    return c.json({
      error: { code: "VALIDATION_ERROR", message: `Invalid mode. Must be one of: ${VALID_MODES.join(", ")}` },
    }, 400);
  }

  const ai = createAIService(c.env);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      try {
        send("status", { message: "Generating explanation..." });
        let fullExplanation = "";
        for await (const chunk of ai.streamExplainCard(front, back, mode)) {
          fullExplanation += chunk;
          send("chunk", { content: chunk });
        }
        const sections = extractSections(fullExplanation);
        const titleMatch = fullExplanation.match(/^#\s+(.+)$/m);
        send("complete", {
          explanation: fullExplanation,
          mode,
          front,
          back,
          title: titleMatch ? titleMatch[1] : front,
          sections,
          generatedAt: new Date().toISOString(),
        });
      } catch (err) {
        send("error", { message: "Failed to generate explanation" });
      } finally {
        controller.close();
      }
    },
  });

  return sseResponse(stream);
});

// ── POST /api/explain/batch ──
explainRoutes.post("/explain/batch", validate(batchExplainSchema), async (c) => {
  const { cards, mode = "full" } = c.get("validated") as any;
  try {
    const ai = createAIService(c.env);
    const results = await Promise.all(
      cards.map(async (card: { front: string; back: string }) => {
        if (!card.front || !card.back) {
          return { error: "Missing front or back" };
        }
        const explanation = await ai.explainCard(card.front, card.back, mode);
        return { front: card.front, back: card.back, explanation, mode };
      })
    );
    return c.json({ results, count: results.length, mode });
  } catch (err) {
    return c.json({ error: { code: "GENERATION_ERROR", message: "Failed to generate batch explanations" } }, 500);
  }
});
