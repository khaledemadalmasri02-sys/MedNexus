import { Hono } from "hono";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { studyPlanTemplates, studyPlans, decks, cards } from "../db/index";
import { validate } from "../middleware/validate";
import { createAIService } from "../lib/ai";
import { logger } from "../lib/logger";

export const plannerTemplateRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }
function getUserId(c: any): string | null { return c.get("user")?.id ?? null; }

function templateOwnerFilter(userId: string | null) {
  return userId ? eq(studyPlanTemplates.userId, userId) : isNull(studyPlanTemplates.userId);
}

const generatePlanSchema = z.object({
  examDate: z.string().datetime(),
  studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  hoursPerDay: z.number().int().positive().max(24),
  deckIds: z.array(z.number().int().positive()).optional(),
  existingSessions: z.array(z.object({
    title: z.string(),
    dayOfWeek: z.number().int().min(0).max(6),
    startHour: z.number().int().min(0).max(23),
    durationMinutes: z.number().int().positive(),
  })).optional(),
});

const batchCreatePlansSchema = z.object({
  sessions: z.array(z.object({
    title: z.string().min(1).max(200),
    color: z.string().max(20).optional(),
    dayOfWeek: z.number().int().min(0).max(6),
    startHour: z.number().int().min(0).max(23),
    durationMinutes: z.number().int().positive().max(480).optional(),
    deckId: z.number().int().positive().optional(),
    recurrence: z.enum(["none", "weekly", "daily"]).optional(),
  })).min(1).max(100),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sessions: z.array(z.object({
    title: z.string().min(1).max(200),
    color: z.string().max(20).optional(),
    durationMinutes: z.number().int().positive().max(480).optional(),
    deckId: z.number().int().positive().optional(),
  })).optional(),
  scheduleType: z.enum(["weekly", "daily"]).optional(),
});

// ── POST /api/planner-templates/generate ──
plannerTemplateRoutes.post("/planner-templates/generate", validate(generatePlanSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { examDate, studyDays, hoursPerDay, deckIds, existingSessions } = c.get("validated") as any;

    if (!examDate || !studyDays || !hoursPerDay) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "examDate, studyDays, and hoursPerDay are required" } }, 400);
    }

    let deckInfo: Array<{ name: string; cardCount: number; sampleCards: string[] }> = [];
    if (deckIds && Array.isArray(deckIds) && deckIds.length > 0) {
      for (const deckId of deckIds) {
        const deck = await getDb(c).query.decks.findFirst({ where: eq(decks.id, deckId) });
        if (deck) {
          const deckCards = await getDb(c).query.cards.findMany({ where: eq(cards.deckId, deckId), limit: 5 });
          deckInfo.push({
            name: deck.name,
            cardCount: deckCards.length,
            sampleCards: deckCards.slice(0, 3).map((cc) => cc.front),
          });
        }
      }
    }

    const examDateObj = new Date(examDate);
    const today = new Date();
    const daysUntilExam = Math.max(1, Math.ceil((examDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const studyDayNames = (studyDays as number[]).map((d: number) => dayNames[d]).join(", ");

    const systemPrompt = `You are an expert study planner specializing in spaced repetition and evidence-based learning. Create an optimal study schedule.`;

    const userPrompt = `Create a study plan with these parameters:
- Exam date: ${examDate} (${daysUntilExam} days from now)
- Available study days: ${studyDayNames}
- Hours per day: ${hoursPerDay}
- Source decks: ${deckInfo.map((d) => `${d.name} (${d.cardCount} cards)`).join(", ") || "General study"}

Sample topics from decks: ${deckInfo.map((d) => `${d.name}: ${d.sampleCards.join("; ")}`).join("\n")}

${existingSessions && existingSessions.length > 0 ? `ALREADY-SCHEDULED SESSIONS (do NOT overlap these; pick different times/days or stack reviews around them):
${existingSessions.map((s: { title: string; dayOfWeek: number; startHour: number; durationMinutes: number }) => `- ${s.title} on day ${s.dayOfWeek} at ${s.startHour}:00 for ${s.durationMinutes}min`).join("\n")}` : ""}

Return a JSON array of study sessions:
[{
  "title": "Session title (specific topic)",
  "dayOfWeek": 0-6 (0=Monday),
  "startHour": 7-20,
  "durationMinutes": 30|60|90|120|180,
  "deckId": number or null,
  "color": "#hexcolor",
  "recurrence": "weekly"|"none"
}]

Rules:
1. Distribute sessions across available study days evenly
2. Prioritize topics with more cards
3. Use spaced repetition: review topics at increasing intervals (1d, 3d, 7d, 14d)
4. Include review sessions mixed with new material
5. Keep sessions between 60-120 minutes
6. Use varied colors for different topics
7. Assign realistic start hours (${studyDays.length > 3 ? "spread across the day" : "morning or afternoon slots"})

Return ONLY valid JSON, no markdown or explanation.`;

    let generatedSessions: Array<{
      title: string; dayOfWeek: number; startHour: number; durationMinutes: number;
      deckId: number | null; color: string; recurrence: string;
    }> = [];

    try {
      const ai = createAIService(c.env);
      const aiResponse = await ai.complete([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ], { maxTokens: 8192 });

      const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        generatedSessions = JSON.parse(jsonMatch[0]);
      }
    } catch (aiErr) {
      logger.warn({ err: aiErr }, "AI plan generation failed, using fallback");
      const colors = ["#22c55e", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];
      const dayList = (studyDays as number[]).sort((a: number, b: number) => a - b);
      let sessionIdx = 0;
      for (let week = 0; week < Math.ceil(daysUntilExam / 7); week++) {
        for (const day of dayList) {
          const topicIdx = sessionIdx % Math.max(1, deckInfo.length || 1);
          const topic = deckInfo[topicIdx]?.name || `Study Session ${sessionIdx + 1}`;
          generatedSessions.push({
            title: week === 0 ? `New: ${topic}` : `Review: ${topic} (Week ${week + 1})`,
            dayOfWeek: day,
            startHour: 10,
            durationMinutes: hoursPerDay >= 2 ? 120 : 60,
            deckId: deckIds?.[topicIdx] || null,
            color: colors[sessionIdx % colors.length],
            recurrence: "weekly",
          });
          sessionIdx++;
          if (sessionIdx >= (daysUntilExam * hoursPerDay) / 2) break;
        }
      }
    }

    return c.json({ sessions: generatedSessions, daysUntilExam, studyDays: studyDayNames });
  } catch (err) {
    logger.error({ err }, "Failed to generate study plan");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate study plan" } }, 500);
  }
});

// ── POST /api/planner-templates/batch-create ──
plannerTemplateRoutes.post("/planner-templates/batch-create", validate(batchCreatePlansSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { sessions } = c.get("validated") as any;

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "sessions array required" } }, 400);
    }

    const created = [];
    for (const s of sessions) {
      const [plan] = await getDb(c).insert(studyPlans).values({
        userId,
        title: s.title || "Study Session",
        color: s.color || "#06b6d4",
        dayOfWeek: s.dayOfWeek ?? 0,
        startHour: s.startHour ?? 9,
        durationMinutes: s.durationMinutes || 60,
        deckId: s.deckId || null,
        recurrence: s.recurrence || "none",
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      created.push(plan);
    }

    return c.json({ created: created.length, plans: created }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to batch create plans");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to batch create plans" } }, 500);
  }
});

// ── GET /api/planner-templates/templates ──
plannerTemplateRoutes.get("/planner-templates/templates", async (c) => {
  try {
    const userId = getUserId(c);
    const templates = await getDb(c).query.studyPlanTemplates.findMany({ where: templateOwnerFilter(userId) });
    return c.json(templates);
  } catch (err) {
    logger.error({ err }, "Failed to list templates");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to list templates" } }, 500);
  }
});

// ── POST /api/planner-templates/templates ──
plannerTemplateRoutes.post("/planner-templates/templates", validate(createTemplateSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { name, description, sessions, scheduleType } = c.get("validated") as any;

    if (!name) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "name is required" } }, 400);
    }

    const [template] = await getDb(c).insert(studyPlanTemplates).values({
      userId,
      name,
      description: description || null,
      sessions: typeof sessions === "string" ? sessions : JSON.stringify(sessions || []),
      scheduleType: scheduleType || "weekly",
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return c.json(template, 201);
  } catch (err) {
    logger.error({ err }, "Failed to create template");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create template" } }, 500);
  }
});

// ── DELETE /api/planner-templates/templates/:id ──
plannerTemplateRoutes.delete("/planner-templates/templates/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const templateId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(templateId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getDb(c).query.studyPlanTemplates.findFirst({ where: eq(studyPlanTemplates.id, templateId) });
    if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Template not found" } }, 404);
    }

    await getDb(c).delete(studyPlanTemplates).where(and(eq(studyPlanTemplates.id, templateId), templateOwnerFilter(userId)));
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to delete template");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete template" } }, 500);
  }
});

// ── POST /api/planner-templates/templates/:id/generate ──
plannerTemplateRoutes.post("/planner-templates/templates/:id/generate", async (c) => {
  try {
    const userId = getUserId(c);
    const templateId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(templateId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const template = await getDb(c).query.studyPlanTemplates.findFirst({ where: eq(studyPlanTemplates.id, templateId) });
    if (!template || (userId && template.userId !== userId) || (!userId && template.userId !== null)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Template not found" } }, 404);
    }

    const sessions = JSON.parse(template.sessions || "[]");
    const created: Array<any> = [];

    const today = new Date();
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      const dow = targetDate.getDay();
      const adjustedDow = dow === 0 ? 6 : dow - 1;

      const daySessions = (sessions as Array<{ title: string; color: string; durationMinutes: number; deckId: number | null }>)
        .filter((s, i) => i % 7 === adjustedDow || template.scheduleType === "weekly");

      for (const s of daySessions) {
        const [newPlan] = await getDb(c).insert(studyPlans).values({
          userId,
          title: s.title || `${template.name} Session`,
          color: s.color || "#06b6d4",
          dayOfWeek: adjustedDow,
          startHour: 10 + (created.length % 8),
          durationMinutes: s.durationMinutes || 60,
          deckId: s.deckId || null,
          recurrence: template.scheduleType === "weekly" ? "weekly" : "none",
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        created.push(newPlan);
      }
    }

    await getDb(c).update(studyPlanTemplates).set({ lastGeneratedAt: new Date() }).where(eq(studyPlanTemplates.id, templateId));

    return c.json({ created: created.length, plans: created }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to generate from template");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate from template" } }, 500);
  }
});
