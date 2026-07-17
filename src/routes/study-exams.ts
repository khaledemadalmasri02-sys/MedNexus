import { Hono } from "hono";
import { eq, and, isNull, asc } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { studyExams } from "../db/index";
import { validate } from "../middleware/validate";
import { logger } from "../lib/logger";

export const studyExamRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }
function getUserId(c: any): string | null { return c.get("user")?.id ?? null; }

function ownerFilter(userId: string | null) {
  return userId ? eq(studyExams.userId, userId) : isNull(studyExams.userId);
}

async function getExamById(db: DB, examId: number, userId: string | null) {
  const exam = await db.query.studyExams.findFirst({ where: eq(studyExams.id, examId) });
  if (!exam) return null;
  if (userId && exam.userId !== userId) return null;
  if (!userId && exam.userId !== null) return null;
  return exam;
}

const createExamSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().max(200).optional(),
  examDate: z.string().datetime(),
  color: z.string().max(20).optional(),
});

const updateExamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.string().max(200).optional(),
  examDate: z.string().datetime().optional(),
  color: z.string().max(20).optional(),
});

// ── GET /api/study-exams ──
studyExamRoutes.get("/study-exams", async (c) => {
  try {
    const userId = getUserId(c);
    const exams = await getDb(c).query.studyExams.findMany({
      where: ownerFilter(userId),
      orderBy: (studyExams, { asc: a }) => a(studyExams.examDate),
    });
    return c.json(exams);
  } catch (err) {
    logger.error({ err }, "Failed to list exams");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to list exams" } }, 500);
  }
});

// ── POST /api/study-exams ──
studyExamRoutes.post("/study-exams", validate(createExamSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { title, subject, examDate, color } = c.get("validated") as any;

    const [exam] = await getDb(c).insert(studyExams).values({
      userId,
      title,
      subject: subject || null,
      examDate: new Date(examDate),
      color: color || "#06b6d4",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return c.json(exam, 201);
  } catch (err) {
    logger.error({ err }, "Failed to create exam");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create exam" } }, 500);
  }
});

// ── PATCH /api/study-exams/:id ──
studyExamRoutes.patch("/study-exams/:id", validate(updateExamSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const examId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(examId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getExamById(getDb(c), examId, userId);
    if (!existing) {
      return c.json({ error: { code: "NOT_FOUND", message: "Exam not found" } }, 404);
    }

    const { title, subject, examDate, color } = c.get("validated") as any;

    const [updated] = await getDb(c).update(studyExams).set({
      title: title ?? existing.title,
      subject: subject !== undefined ? subject : existing.subject,
      examDate: examDate ? new Date(examDate) : existing.examDate,
      color: color ?? existing.color,
      updatedAt: new Date(),
    }).where(and(eq(studyExams.id, examId), ownerFilter(userId))).returning();

    return c.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update exam");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to update exam" } }, 500);
  }
});

// ── DELETE /api/study-exams/:id ──
studyExamRoutes.delete("/study-exams/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const examId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(examId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getExamById(getDb(c), examId, userId);
    if (!existing) {
      return c.json({ error: { code: "NOT_FOUND", message: "Exam not found" } }, 404);
    }

    await getDb(c).delete(studyExams).where(and(eq(studyExams.id, examId), ownerFilter(userId)));
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to delete exam");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete exam" } }, 500);
  }
});
