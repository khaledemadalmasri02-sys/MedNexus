import { Router, Request, Response } from "express";
import { db, studyExams } from "../db/index.js";
import { eq, and, isNull, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { validateBody } from "../middleware/validate.js";
import { createExamSchema, updateExamSchema } from "./validators.js";

const router = Router();

function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

function ownerFilter(userId: string | null) {
  return userId ? eq(studyExams.userId, userId) : isNull(studyExams.userId);
}

async function getExamById(examId: number, userId: string | null) {
  const exam = await db.query.studyExams.findFirst({ where: eq(studyExams.id, examId) });
  if (!exam) return null;
  if (userId && exam.userId !== userId) return null;
  if (!userId && exam.userId !== null) return null;
  return exam;
}

// ── GET /api/study-exams — list exams (soonest first) ──
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const exams = await db.query.studyExams.findMany({
      where: ownerFilter(userId),
      orderBy: (row, { asc }) => asc(row.examDate),
    });
    res.json(exams);
  } catch (err) {
    logger.error({ err }, "Failed to list exams");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list exams" } });
  }
});

// ── POST /api/study-exams ──
router.post("/", validateBody(createExamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { title, subject, examDate, color } = req.body;

    const [exam] = await db.insert(studyExams).values({
      userId,
      title,
      subject: subject || null,
      examDate: new Date(examDate),
      color: color || "#06b6d4",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.status(201).json(exam);
  } catch (err) {
    logger.error({ err }, "Failed to create exam");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create exam" } });
  }
});

// ── PATCH /api/study-exams/:id ──
router.patch("/:id", validateBody(updateExamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const examId = parseInt(req.params.id, 10);
    if (isNaN(examId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const existing = await getExamById(examId, userId);
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exam not found" } });
      return;
    }

    const { title, subject, examDate, color } = req.body;

    const [updated] = await db.update(studyExams).set({
      title: title ?? existing.title,
      subject: subject !== undefined ? subject : existing.subject,
      examDate: examDate ? new Date(examDate) : existing.examDate,
      color: color ?? existing.color,
      updatedAt: new Date(),
    }).where(and(eq(studyExams.id, examId), ownerFilter(userId))).returning();

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update exam");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update exam" } });
  }
});

// ── DELETE /api/study-exams/:id ──
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const examId = parseInt(req.params.id, 10);
    if (isNaN(examId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const existing = await getExamById(examId, userId);
    if (!existing) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Exam not found" } });
      return;
    }

    await db.delete(studyExams).where(and(eq(studyExams.id, examId), ownerFilter(userId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete exam");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete exam" } });
  }
});

export default router;
