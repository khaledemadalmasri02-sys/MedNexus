import { Router, Request, Response } from "express";
import { db, qbanks, questions, decks, cards } from "../db/index.js";
import { eq, and, isNull, asc, inArray, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import {
  createQBankSchema, updateQBankSchema, addQuestionSchema,
  updateQuestionSchema, importFromDeckSchema, idParamSchema,
} from "./validators.js";

const router = Router();

// Get user ID from request
function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

// QBank owner filter
function qbankOwnerFilter(userId: string | null) {
  return userId ? eq(qbanks.userId, userId) : isNull(qbanks.userId);
}

// Check if user owns resource
function ownsResource(resourceUserId: string | null, requestUserId: string | null): boolean {
  return resourceUserId === requestUserId;
}

// List question banks
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
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
    
    res.json(qbankList);
  } catch (err) {
    logger.error({ err }, "Failed to list qbanks");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list question banks" } });
  }
});

// Create question bank
router.post("/", validateBody(createQBankSchema), async (req: Request, res: Response) => {
  const { name, parentId } = req.body;

  try {
    const userId = getUserId(req);

    const [qbank] = await db.insert(qbanks).values({
      name,
      parentId: parentId || null,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.status(201).json({ ...qbank, questionCount: 0 });
  } catch (err) {
    logger.error({ err }, "Failed to create qbank");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create question bank" } });
  }
});

// Get QBank with questions
router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
    return;
  }
  
  try {
    const userId = getUserId(req);
    
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });
    
    if (!qbank || !ownsResource(qbank.userId, userId)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Question bank not found" } });
      return;
    }
    
    // Get questions
    const qbankQuestions = await db.query.questions.findMany({
      where: eq(questions.qbankId, id),
      orderBy: [asc(questions.createdAt)],
    });
    
    // Get sub-qbanks
    const subQbanks = await db.select({
      id: qbanks.id,
      name: qbanks.name,
      parentId: qbanks.parentId,
      createdAt: qbanks.createdAt,
    })
    .from(qbanks)
    .where(and(eq(qbanks.parentId, id), qbankOwnerFilter(userId)))
    .orderBy(asc(qbanks.name));
    
    res.json({
      ...qbank,
      questions: qbankQuestions,
      subQbanks,
      questionCount: qbankQuestions.length,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get qbank");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get question bank" } });
  }
});

// Update QBank
router.patch("/:id", validateParams(idParamSchema), validateBody(updateQBankSchema), async (req: Request, res: Response) => {
  const id = req.params.id as unknown as number;
  const { name, parentId } = req.body;

  try {
    const userId = getUserId(req);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });

    if (!qbank || !ownsResource(qbank.userId, userId)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Question bank not found" } });
      return;
    }

    const [updated] = await db.update(qbanks).set({
      name: name ?? qbank.name,
      parentId: parentId !== undefined ? parentId : qbank.parentId,
      updatedAt: new Date(),
    }).where(and(eq(qbanks.id, id), qbankOwnerFilter(userId))).returning();

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update qbank");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update question bank" } });
  }
});

// Delete QBank
router.delete("/:id", validateParams(idParamSchema), async (req: Request, res: Response) => {
  const id = req.params.id as unknown as number;

  try {
    const userId = getUserId(req);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });

    if (!qbank || !ownsResource(qbank.userId, userId)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Question bank not found" } });
      return;
    }
    
    // Get all descendant qbank IDs
    const allQbanks = await db.query.qbanks.findMany();
    function collectDescendants(parentId: number): number[] {
      const children = allQbanks.filter(q => q.parentId === parentId);
      return [...children.map(q => q.id), ...children.flatMap(c => collectDescendants(c.id))];
    }
    const idsToDelete = [id, ...collectDescendants(id)];
    
    // Delete questions first
    await db.delete(questions).where(inArray(questions.qbankId, idsToDelete));
    
    // Delete qbanks
    await db.delete(qbanks).where(inArray(qbanks.id, idsToDelete));
    
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete qbank");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete question bank" } });
  }
});

// Add question to QBank
router.post("/:id/questions", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
    return;
  }
  
  const { front, back, choices, correctIndex, tags } = req.body;
  
  if (!front || !back) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Front and back are required" } });
    return;
  }
  
  try {
    const userId = getUserId(req);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });
    
    if (!qbank || !ownsResource(qbank.userId, userId)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Question bank not found" } });
      return;
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
    
    res.status(201).json(question);
  } catch (err) {
    logger.error({ err }, "Failed to add question");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to add question" } });
  }
});

// Update question
router.patch("/:qbankId/questions/:questionId", async (req: Request, res: Response) => {
  const qbankId = parseInt(req.params.qbankId, 10);
  const questionId = parseInt(req.params.questionId, 10);
  
  if (isNaN(qbankId) || isNaN(questionId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid IDs" } });
    return;
  }
  
  const { front, back, choices, correctIndex, tags } = req.body;
  
  try {
    const userId = getUserId(req);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, qbankId),
    });
    
    if (!qbank || !ownsResource(qbank.userId, userId)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Question bank not found" } });
      return;
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
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Question not found" } });
      return;
    }
    
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update question");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update question" } });
  }
});

// Delete question
router.delete("/:qbankId/questions/:questionId", async (req: Request, res: Response) => {
  const qbankId = parseInt(req.params.qbankId, 10);
  const questionId = parseInt(req.params.questionId, 10);
  
  if (isNaN(qbankId) || isNaN(questionId)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid IDs" } });
    return;
  }
  
  try {
    const userId = getUserId(req);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, qbankId),
    });
    
    if (!qbank || !ownsResource(qbank.userId, userId)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Question bank not found" } });
      return;
    }
    
    const [deleted] = await db.delete(questions).where(eq(questions.id, questionId)).returning();
    
    if (!deleted) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Question not found" } });
      return;
    }
    
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete question");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete question" } });
  }
});

// Import from deck (convert cards to questions)
router.post("/:id/import", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
    return;
  }
  
  const { deckId } = req.body;
  
  if (!deckId) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Deck ID is required" } });
    return;
  }
  
  try {
    const userId = getUserId(req);
    const qbank = await db.query.qbanks.findFirst({
      where: eq(qbanks.id, id),
    });
    
    if (!qbank || !ownsResource(qbank.userId, userId)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Question bank not found" } });
      return;
    }
    
    const deck = await db.query.decks.findFirst({
      where: eq(decks.id, deckId),
    });
    
    if (!deck || !ownsResource(deck.userId, userId)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Deck not found" } });
      return;
    }
    
    const deckCards = await db.query.cards.findMany({
      where: eq(cards.deckId, deckId),
    });
    
    // Convert cards to questions (basic cards become MCQ with 4 options)
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
    
    res.status(201).json({
      imported: importedQuestions.length,
      questions: importedQuestions,
    });
  } catch (err) {
    logger.error({ err }, "Failed to import from deck");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to import from deck" } });
  }
});

export default router;
