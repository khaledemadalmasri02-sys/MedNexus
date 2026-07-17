import { Hono } from "hono";
import { z } from "zod";
import { eq, and, isNull, asc, inArray, sql } from "drizzle-orm";
import type { AppEnv } from "../types";
import { qbanks, questions, decks, cards } from "../db/index";
import { getDb, getUserId } from "../lib/helpers";
import { validate } from "../middleware/validate";
import { logger } from "../lib/logger";

export const qbankRoutes = new Hono<AppEnv>();

const createQBankSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.number().int().positive().optional(),
});

const updateQBankSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  parentId: z.number().int().positive().nullable().optional(),
});

function qbankOwnerFilter(userId: string | null) {
  return userId ? eq(qbanks.userId, userId) : isNull(qbanks.userId);
}

function ownsResource(resourceUserId: string | null, requestUserId: string | null): boolean {
  return resourceUserId === requestUserId;
}

qbankRoutes.get("/qbanks", async (c) => {
  try {
    const userId = getUserId(c);
    const db = getDb(c);

    const qbankList = await db.select({
      id: qbanks.id,
      name: qbanks.name,
      parentId: qbanks.parentId,
      createdAt: qbanks.createdAt,
      updatedAt: qbanks.updatedAt,
      questionCount: sql<number>`count(${questions.id})`,
    })
      .from(qbanks)
      .leftJoin(questions, eq(questions.qbankId, qbanks.id))
      .where(qbankOwnerFilter(userId))
      .groupBy(qbanks.id)
      .orderBy(asc(qbanks.createdAt));

    return c.json(qbankList);
  } catch (err) {
    logger.error({ err }, "Failed to list qbanks");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to list question banks" } }, 500);
  }
});

qbankRoutes.post("/qbanks", validate(createQBankSchema), async (c) => {
  const { name, parentId } = c.get("validated") as any;

  try {
    const userId = getUserId(c);
    const db = getDb(c);

    const [qbank] = await db.insert(qbanks).values({
      name,
      parentId: parentId || null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return c.json({ ...qbank, questionCount: 0 }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to create qbank");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create question bank" } }, 500);
  }
});

qbankRoutes.get("/qbanks/:id", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
  }

  try {
    const userId = getUserId(c);
    const db = getDb(c);

    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });

    if (!qbank || !ownsResource(qbank.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Question bank not found" } }, 404);
    }

    const qbankQuestions = await db.query.questions.findMany({
      where: eq(questions.qbankId, id),
      orderBy: [asc(questions.createdAt)],
    });

    const subQbanks = await db.select({
      id: qbanks.id,
      name: qbanks.name,
      parentId: qbanks.parentId,
      createdAt: qbanks.createdAt,
    })
      .from(qbanks)
      .where(and(eq(qbanks.parentId, id), qbankOwnerFilter(userId)))
      .orderBy(asc(qbanks.name));

    return c.json({
      ...qbank,
      questions: qbankQuestions,
      subQbanks,
      questionCount: qbankQuestions.length,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get qbank");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get question bank" } }, 500);
  }
});

qbankRoutes.patch("/qbanks/:id", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
  }

  const parsed = updateQBankSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input" } }, 400);
  }
  const { name, parentId } = parsed.data;

  try {
    const userId = getUserId(c);
    const db = getDb(c);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });

    if (!qbank || !ownsResource(qbank.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Question bank not found" } }, 404);
    }

    const [updated] = await db.update(qbanks).set({
      name: name ?? qbank.name,
      parentId: parentId !== undefined ? parentId : qbank.parentId,
      updatedAt: new Date(),
    }).where(and(eq(qbanks.id, id), qbankOwnerFilter(userId))).returning();

    return c.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update qbank");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update question bank" } }, 500);
  }
});

qbankRoutes.delete("/qbanks/:id", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
  }

  try {
    const userId = getUserId(c);
    const db = getDb(c);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });

    if (!qbank || !ownsResource(qbank.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Question bank not found" } }, 404);
    }

    const allQbanks = await db.query.qbanks.findMany();
    function collectDescendants(parentId: number): number[] {
      const children = allQbanks.filter(q => q.parentId === parentId);
      return [...children.map(q => q.id), ...children.flatMap(cc => collectDescendants(cc.id))];
    }
    const idsToDelete = [id, ...collectDescendants(id)];

    await db.delete(questions).where(inArray(questions.qbankId, idsToDelete));
    await db.delete(qbanks).where(inArray(qbanks.id, idsToDelete));

    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to delete qbank");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete question bank" } }, 500);
  }
});

qbankRoutes.post("/qbanks/:id/questions", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
  }

  const body = await c.req.json().catch(() => ({})) as any;
  const { front, back, choices, correctIndex, tags } = body;

  if (!front || !back) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Front and back are required" } }, 400);
  }

  try {
    const userId = getUserId(c);
    const db = getDb(c);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });

    if (!qbank || !ownsResource(qbank.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Question bank not found" } }, 404);
    }

    const [question] = await db.insert(questions).values({
      qbankId: id,
      front,
      back,
      choices: choices ? JSON.stringify(choices) : null,
      correctIndex: correctIndex ?? null,
      tags: tags || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return c.json(question, 201);
  } catch (err) {
    logger.error({ err }, "Failed to add question");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to add question" } }, 500);
  }
});

qbankRoutes.patch("/qbanks/:qbankId/questions/:questionId", async (c) => {
  const qbankId = parseInt(c.req.param("qbankId") ?? "", 10);
  const questionId = parseInt(c.req.param("questionId") ?? "", 10);

  if (isNaN(qbankId) || isNaN(questionId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid IDs" } }, 400);
  }

  const body = await c.req.json().catch(() => ({})) as any;
  const { front, back, choices, correctIndex, tags } = body;

  try {
    const userId = getUserId(c);
    const db = getDb(c);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, qbankId),
    });

    if (!qbank || !ownsResource(qbank.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Question bank not found" } }, 404);
    }

    const [updated] = await db.update(questions).set({
      front: front,
      back: back,
      choices: choices ? JSON.stringify(choices) : undefined,
      correctIndex: correctIndex,
      tags: tags,
      updatedAt: new Date(),
    }).where(eq(questions.id, questionId)).returning();

    if (!updated) {
      return c.json({ error: { code: "NOT_FOUND", message: "Question not found" } }, 404);
    }

    return c.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update question");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update question" } }, 500);
  }
});

qbankRoutes.delete("/qbanks/:qbankId/questions/:questionId", async (c) => {
  const qbankId = parseInt(c.req.param("qbankId") ?? "", 10);
  const questionId = parseInt(c.req.param("questionId") ?? "", 10);

  if (isNaN(qbankId) || isNaN(questionId)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid IDs" } }, 400);
  }

  try {
    const userId = getUserId(c);
    const db = getDb(c);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, qbankId),
    });

    if (!qbank || !ownsResource(qbank.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Question bank not found" } }, 404);
    }

    const [deleted] = await db.delete(questions).where(eq(questions.id, questionId)).returning();

    if (!deleted) {
      return c.json({ error: { code: "NOT_FOUND", message: "Question not found" } }, 404);
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to delete question");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete question" } }, 500);
  }
});

qbankRoutes.post("/qbanks/:id/import", async (c) => {
  const id = parseInt(c.req.param("id") ?? "", 10);
  if (isNaN(id)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
  }

  const body = await c.req.json().catch(() => ({})) as any;
  const { deckId } = body;

  if (!deckId) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Deck ID is required" } }, 400);
  }

  try {
    const userId = getUserId(c);
    const db = getDb(c);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });

    if (!qbank || !ownsResource(qbank.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Question bank not found" } }, 404);
    }

    const deck = await db.query.decks.findFirst({
      where: eq(decks.id, deckId),
    });

    if (!deck || !ownsResource(deck.userId, userId)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Deck not found" } }, 404);
    }

    const deckCards = await db.query.cards.findMany({
      where: eq(cards.deckId, deckId),
    });

    const importedQuestions = await db.insert(questions).values(
      deckCards.map(card => ({
        qbankId: id,
        front: card.front,
        back: card.back,
        choices: null,
        correctIndex: null,
        tags: card.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    ).returning();

    return c.json({
      imported: importedQuestions.length,
      questions: importedQuestions,
    }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to import from deck");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to import from deck" } }, 500);
  }
});
