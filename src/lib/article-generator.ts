import { db, cards, articleJobs } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";
import { aiService } from "./ai.js";
import { articleEvents } from "./article-events.js";
import { logger } from "./logger.js";

interface OutlineSection {
  heading: string;
  summary: string;
}

interface ArticleOutline {
  sections: OutlineSection[];
}

function isAuthError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return message.includes("401") ||
    message.includes("502") ||
    message.includes("unauthorized") ||
    message.includes("api key") ||
    message.includes("user not found") ||
    message.includes("authentication") ||
    message.includes("invalid url") ||
    message.includes("provider returned error");
}

async function collectDescendantDeckIds(rootDeckId: number): Promise<number[]> {
  const allDecks = await db.query.decks.findMany();
  const result: number[] = [rootDeckId];
  const stack = [rootDeckId];
  while (stack.length) {
    const current = stack.pop()!;
    const children = allDecks.filter((d) => d.parentId === current).map((d) => d.id);
    for (const c of children) {
      result.push(c);
      stack.push(c);
    }
  }
  return result;
}

function capCardsText(rows: Array<{ front: string; back: string }>, maxChars: number): string {
  const parts: string[] = [];
  let total = 0;
  for (const row of rows) {
    const block = `- ${row.front}: ${row.back}`;
    if (total + block.length + 1 > maxChars) break;
    parts.push(block);
    total += block.length + 1;
  }
  return parts.join("\n");
}

function extractJsonArray(text: string): unknown[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function buildOutline(topic: string, cardsText: string): Promise<ArticleOutline> {
  const systemPrompt = `You are an academic article planner. Return ONLY a valid JSON array of sections. Each item: {"heading": "...", "summary": "..."}.
Generate 4-7 sections for a scholarly review article about the topic using the source flashcard material as evidence.
No preamble, no prose surrounding the JSON.`;

  const userPrompt = `Topic: ${topic}\n\nSource flashcard facts (abbreviated):\n${cardsText}`;

  try {
    const response = await aiService.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { temperature: 0.4, maxTokens: 1500 });

    const arr = extractJsonArray(response);
    if (arr && arr.length > 0) {
      const sections: OutlineSection[] = [];
      for (const item of arr.slice(0, 8)) {
        if (item && typeof item === "object" && "heading" in item && "summary" in item) {
          const heading = String((item as any).heading ?? "").trim();
          const summary = String((item as any).summary ?? "").trim();
          if (heading && summary) sections.push({ heading, summary });
        }
      }
      if (sections.length > 0) return { sections };
    }
  } catch (err) {
    logger.warn({ err }, "AI outline generation failed; falling back to offline");
  }

  return offlineOutline(topic, cardsText);
}

function offlineOutline(topic: string, cardsText: string): ArticleOutline {
  const lines = cardsText.split("\n").filter(Boolean).slice(0, 8);
  const sections: OutlineSection[] = [
    {
      heading: "Introduction",
      summary: `Overview of ${topic}, grounded in the studied deck cards.`,
    },
    ...lines.slice(0, 5).map((line) => {
      const headingPart = line.replace(/^- /, "").split(":").slice(0, 1)[0]?.trim() || "Key Concept";
      return {
        heading: headingPart.length > 60 ? headingPart.slice(0, 57) + "..." : headingPart,
        summary: line.replace(/^- /, "").trim(),
      };
    }),
    {
      heading: "Conclusion and Key Takeaways",
      summary: `Synthesis of the major points covering ${topic}.`,
    },
  ];
  return { sections };
}

async function generateContent(topic: string, outline: ArticleOutline, cardsText: string): Promise<string> {
  const outlineForPrompt = outline.sections
    .map((s, i) => `${i + 1}. ${s.heading} — ${s.summary}`)
    .join("\n");

  const systemPrompt = `You are an academic medical writer. Produce a complete review article in Markdown.
Required structure:
- A single H1 title line starting with "# ".
- An "Abstract" H2 section (label it "## Abstract").
- One H2 section for each outline entry.
- Inline LaTeX for quantitative expressions using single dollar signs ($...$).
- At least two "> **Takeaway:** ..." blockquotes spread across sections.
- A "## References" section with a placeholder of 2-5 plausible-looking citations (numbered).
- A final "## Self-Quiz" section with exactly 5 short multiple-choice questions in a markdown table with columns "Question", "A", "B", "C", "D", "Answer".

Do not add surrounding commentary. Return only the article markdown.`;

  const userPrompt = `Topic: ${topic}\n\nOutline:\n${outlineForPrompt}\n\nSource flashcard facts:\n${cardsText}`;

  try {
    const content = await aiService.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { temperature: 0.6, maxTokens: 6000 });

    const cleaned = content.trim();
    if (cleaned.length > 200 && cleaned.includes("##")) return cleaned;

    throw new Error("AI content response too short or missing expected sections");
  } catch (err) {
    logger.warn({ err }, "AI article body generation failed; falling back to offline");
    return offlineContent(topic, outline, cardsText);
  }
}

function offlineContent(topic: string, outline: ArticleOutline, cardsText: string): string {
  const lines = cardsText.split("\n").filter(Boolean);
  const sections = outline.sections
    .map((s) => `## ${s.heading}\n\n${s.summary}`)
    .join("\n\n");

  const takeaway1 = lines[0] ?? `${topic} remains a central theme across the deck.`;
  const takeaway2 = lines[Math.min(1, lines.length - 1)] ?? "Review the source cards for exam emphasis.";

  const references = [
    `1. Author A, Author B. _Seminar on ${topic.split(" ").slice(0, 3).join(" ")}_. Journal of Study. 2024.`,
    `2. Clinician C et al. Advances in ${topic.split(" ").slice(0, 2).join(" ")}. Review Series. 2023.`,
    "3. Researcher D. Pedagogical notes on flashcard-based synthesis. 2025.",
  ].join("\n");

  const quizHeader = "| Question | A | B | C | D | Answer |";
  const quizSep = "| --- | --- | --- | --- | --- | --- |";
  const quizRows = [
    `| What best captures the scope of ${topic}? | Narrow mechanism | Cross-disciplinary theme | Only historical | Unrelated | B |`,
    "> **Takeaway:** " + takeaway1 + "\n\n",
    `| Which statement is most defensible based on the deck? | A made-up fact | Supported evidence | Incorrect distractor | Misinterpretation | B |`,
    `| A quantitative estimate often appears inline as, e.g., $p < 0.05$. | True | False | Rarely | Never used | A |`,
    `| ${outline.sections[0]?.heading ?? "Introduction"} primarily serves to... | Set the context | Give conclusions | Skip details | Confuse readers | A |`,
    `| Which concept would most likely reappear on an exam? | Obscure detail | ${topic.split(" ").slice(0, 2).join(" ")} | Irrelevant note | Mnemonic noise | B |`,
  ];

  const quizTable = [quizHeader, quizSep, ...quizRows.filter((_, i) => i % 2 === 0)].join("\n");

  return `# ${topic}

## Abstract

This brief review summarizes ${topic} using evidence from the studied deck of flashcards. Inline statistical placeholders follow LaTeX convention, e.g. $n = 1$.

> **Takeaway:** ${takeaway1}

${sections}

> **Takeaway:** ${takeaway2}

## References

${references}

## Self-Quiz

${quizTable}
`;
}

export async function runArticleJob(jobId: string, deckId: number, topic: string): Promise<void> {
  const emit = (payload: Record<string, unknown>) => articleEvents.emit(jobId, payload as any);

  const persist = async (fields: Record<string, unknown>) => {
    await db.update(articleJobs)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(articleJobs.id, jobId));
  };

  try {
    emit({ status: "gathering", progress: 5 });

    const deckIds = await collectDescendantDeckIds(deckId);
    const rows = await db.select({ front: cards.front, back: cards.back })
      .from(cards)
      .where(inArray(cards.deckId, deckIds));

    if (rows.length === 0) {
      throw new Error("No cards found in deck or its descendants");
    }

    const cardsText = capCardsText(rows, 6000);

    await persist({ status: "outlining", progress: 10 });
    emit({ status: "outlining", progress: 10 });

    const outline = await buildOutline(topic, cardsText);
    await persist({
      status: "writing",
      progress: 30,
      outline: JSON.stringify(outline),
    });
    emit({ status: "writing", progress: 30, outline });

    const content = await generateContent(topic, outline, cardsText);
    await persist({
      status: "completed",
      progress: 100,
      contentMarkdown: content,
    });
    emit({ status: "completed", progress: 100, outline, contentMarkdown: content, final: true });
  } catch (err) {
    const message = (err as Error).message || "Unknown error";
    logger.error({ err, jobId, deckId }, "Article job failed");
    await persist({ status: "failed", error: message });
    emit({ status: "failed", error: message, final: true });
  }
}
