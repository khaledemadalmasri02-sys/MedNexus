import { Router, Request, Response } from "express";
import { db, studyPlanTemplates, studyPlans, decks, cards } from "../db/index.js";
import { eq, and, isNull, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { aiService } from "../lib/ai.js";
import { validateBody } from "../middleware/validate.js";
import { generatePlanSchema, batchCreatePlansSchema, createTemplateSchema } from "./validators.js";

const router = Router();

function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

function templateOwnerFilter(userId: string | null) {
  return userId ? eq(studyPlanTemplates.userId, userId) : isNull(studyPlanTemplates.userId);
}

// ── POST /api/planners/generate — AI-powered study plan generation ──
router.post("/generate", validateBody(generatePlanSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { examDate, studyDays, hoursPerDay, deckIds, existingSessions } = req.body;

    if (!examDate || !studyDays || !hoursPerDay) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "examDate, studyDays, and hoursPerDay are required" } });
      return;
    }

    // Fetch deck info for the AI prompt
    let deckInfo: Array<{ name: string; cardCount: number; sampleCards: string[] }> = [];
    if (deckIds && Array.isArray(deckIds) && deckIds.length > 0) {
      for (const deckId of deckIds) {
        const deck = await db.query.decks.findFirst({ where: eq(decks.id, deckId) });
        if (deck) {
          const deckCards = await db.query.cards.findMany({
            where: eq(cards.deckId, deckId),
            limit: 5,
          });
          deckInfo.push({
            name: deck.name,
            cardCount: deckCards.length,
            sampleCards: deckCards.slice(0, 3).map(c => c.front),
          });
        }
      }
    }

    const examDateObj = new Date(examDate);
    const today = new Date();
    const daysUntilExam = Math.max(1, Math.ceil((examDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const studyDayNames = (studyDays as number[]).map((d: number) => dayNames[d]).join(', ');

    const systemPrompt = `You are an expert study planner specializing in spaced repetition and evidence-based learning. Create an optimal study schedule.`;

    const userPrompt = `Create a study plan with these parameters:
- Exam date: ${examDate} (${daysUntilExam} days from now)
- Available study days: ${studyDayNames}
- Hours per day: ${hoursPerDay}
- Source decks: ${deckInfo.map(d => `${d.name} (${d.cardCount} cards)`).join(', ') || 'General study'}

Sample topics from decks: ${deckInfo.map(d => `${d.name}: ${d.sampleCards.join('; ')}`).join('\n')}

${existingSessions && existingSessions.length > 0 ? `ALREADY-SCHEDULED SESSIONS (do NOT overlap these; pick different times/days or stack reviews around them):
${existingSessions.map((s: { title: string; dayOfWeek: number; startHour: number; durationMinutes: number }) => `- ${s.title} on day ${s.dayOfWeek} at ${s.startHour}:00 for ${s.durationMinutes}min`).join('\n')}` : ''}

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
7. Assign realistic start hours (${studyDays.length > 3 ? 'spread across the day' : 'morning or afternoon slots'})

Return ONLY valid JSON, no markdown or explanation.`;

    let generatedSessions: Array<{
      title: string;
      dayOfWeek: number;
      startHour: number;
      durationMinutes: number;
      deckId: number | null;
      color: string;
      recurrence: string;
    }> = [];

    try {
      const aiResponse = await aiService.complete([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ], { maxTokens: 8192 });

      const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        generatedSessions = JSON.parse(jsonMatch[0]);
      }
    } catch (aiErr) {
      logger.warn({ err: aiErr }, "AI plan generation failed, using fallback");
      // Fallback: generate a simple plan
      const colors = ['#22c55e', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];
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
            recurrence: 'weekly',
          });
          sessionIdx++;
          if (sessionIdx >= daysUntilExam * hoursPerDay / 2) break;
        }
      }
    }

    res.json({ sessions: generatedSessions, daysUntilExam, studyDays: studyDayNames });
  } catch (err) {
    logger.error({ err }, "Failed to generate study plan");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate study plan" } });
  }
});

// ── POST /api/planners/batch-create ──
router.post("/batch-create", validateBody(batchCreatePlansSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { sessions } = req.body;

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "sessions array required" } });
      return;
    }

    const created = [];
    for (const s of sessions) {
      const [plan] = await db.insert(studyPlans).values({
        userId,
        title: s.title || 'Study Session',
        color: s.color || '#06b6d4',
        dayOfWeek: s.dayOfWeek ?? 0,
        startHour: s.startHour ?? 9,
        durationMinutes: s.durationMinutes || 60,
        deckId: s.deckId || null,
        recurrence: s.recurrence || 'none',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      created.push(plan);
    }

    res.status(201).json({ created: created.length, plans: created });
  } catch (err) {
    logger.error({ err }, "Failed to batch create plans");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to batch create plans" } });
  }
});

// ── GET /api/planners/templates ──
router.get("/templates", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templates = await db.query.studyPlanTemplates.findMany({
      where: templateOwnerFilter(userId),
    });
    res.json(templates);
  } catch (err) {
    logger.error({ err }, "Failed to list templates");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list templates" } });
  }
});

// ── POST /api/planners/templates ──
router.post("/templates", validateBody(createTemplateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { name, description, sessions, scheduleType } = req.body;

    if (!name) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "name is required" } });
      return;
    }

    const [template] = await db.insert(studyPlanTemplates).values({
      userId,
      name,
      description: description || null,
      sessions: typeof sessions === 'string' ? sessions : JSON.stringify(sessions || []),
      scheduleType: scheduleType || 'weekly',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.status(201).json(template);
  } catch (err) {
    logger.error({ err }, "Failed to create template");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create template" } });
  }
});

// ── DELETE /api/planners/templates/:id ──
router.delete("/templates/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templateId = parseInt(req.params.id, 10);
    if (isNaN(templateId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const existing = await db.query.studyPlanTemplates.findFirst({
      where: eq(studyPlanTemplates.id, templateId),
    });
    if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Template not found" } });
      return;
    }

    await db.delete(studyPlanTemplates).where(and(eq(studyPlanTemplates.id, templateId), templateOwnerFilter(userId)));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Failed to delete template");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete template" } });
  }
});

// ── POST /api/planners/templates/:id/generate ──
router.post("/templates/:id/generate", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const templateId = parseInt(req.params.id, 10);
    if (isNaN(templateId)) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
      return;
    }

    const template = await db.query.studyPlanTemplates.findFirst({
      where: eq(studyPlanTemplates.id, templateId),
    });
    if (!template || (userId && template.userId !== userId) || (!userId && template.userId !== null)) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Template not found" } });
      return;
    }

    const sessions = JSON.parse(template.sessions || '[]');
    const created: Array<{ id: number; title: string; color: string; dayOfWeek: number; startHour: number; durationMinutes: number; deckId: number | null; recurrence: string; completed: boolean; createdAt: Date; updatedAt: Date }> = [];

    // Generate sessions for the next 7 days
    const today = new Date();
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      const dow = targetDate.getDay();
      const adjustedDow = dow === 0 ? 6 : dow - 1;

      const daySessions = (sessions as Array<{ title: string; color: string; durationMinutes: number; deckId: number | null }>)
        .filter((s, i) => i % 7 === adjustedDow || template.scheduleType === 'weekly');

      for (const s of daySessions) {
        const [newPlan] = await db.insert(studyPlans).values({
          userId,
          title: s.title || `${template.name} Session`,
          color: s.color || '#06b6d4',
          dayOfWeek: adjustedDow,
          startHour: 10 + created.length % 8,
          durationMinutes: s.durationMinutes || 60,
          deckId: s.deckId || null,
          recurrence: template.scheduleType === 'weekly' ? 'weekly' : 'none',
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();
        created.push(newPlan);
      }
    }

    await db.update(studyPlanTemplates).set({ lastGeneratedAt: new Date() }).where(eq(studyPlanTemplates.id, templateId));

    res.status(201).json({ created: created.length, plans: created });
  } catch (err) {
    logger.error({ err }, "Failed to generate from template");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to generate from template" } });
  }
});

export default router;
