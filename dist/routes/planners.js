import { Router } from "express";
import { db, studyPlans, decks } from "../db/index.js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { validateBody } from "../middleware/validate.js";
import { createPlannerSchema, updatePlannerSchema } from "./validators.js";
const router = Router();
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
function planOwnerFilter(userId) {
    return userId ? eq(studyPlans.userId, userId) : isNull(studyPlans.userId);
}
async function getPlanById(planId, userId) {
    const plan = await db.query.studyPlans.findFirst({
        where: eq(studyPlans.id, planId),
    });
    if (!plan)
        return null;
    if (userId && plan.userId !== userId)
        return null;
    if (!userId && plan.userId !== null)
        return null;
    return plan;
}
// ── GET /api/planners — list all plans for user, optional ?day=0-6 filter ──
router.get("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        const day = req.query.day !== undefined ? parseInt(req.query.day, 10) : undefined;
        const conditions = [planOwnerFilter(userId)];
        if (day !== undefined && !isNaN(day)) {
            conditions.push(eq(studyPlans.dayOfWeek, day));
        }
        const plans = await db.query.studyPlans.findMany({
            where: and(...conditions),
        });
        // Attach deck name if deck_id is set
        const deckIds = [...new Set(plans.filter(p => p.deckId).map(p => p.deckId))];
        const deckMap = new Map();
        if (deckIds.length > 0) {
            const deckRecords = await db.select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
            deckRecords.forEach(d => deckMap.set(d.id, d.name));
        }
        const result = plans.map(p => ({
            ...p,
            deckName: p.deckId ? deckMap.get(p.deckId) || null : null,
            duration: p.durationMinutes,
        }));
        res.json(result);
    }
    catch (err) {
        logger.error({ err }, "Failed to list planners");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list planners" } });
    }
});
// ── GET /api/planners/today ──
router.get("/today", async (req, res) => {
    try {
        const userId = getUserId(req);
        const todayIdx = new Date().getDay();
        const adjustedTodayIdx = todayIdx === 0 ? 6 : todayIdx - 1;
        const plans = await db.query.studyPlans.findMany({
            where: and(planOwnerFilter(userId), eq(studyPlans.dayOfWeek, adjustedTodayIdx)),
        });
        const deckIds = [...new Set(plans.filter(p => p.deckId).map(p => p.deckId))];
        const deckMap = new Map();
        if (deckIds.length > 0) {
            const deckRecords = await db.select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
            deckRecords.forEach(d => deckMap.set(d.id, d.name));
        }
        const result = plans.map(p => ({
            ...p,
            deckName: p.deckId ? deckMap.get(p.deckId) || null : null,
            duration: p.durationMinutes,
        }));
        res.json(result);
    }
    catch (err) {
        logger.error({ err }, "Failed to get today's planners");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get today's planners" } });
    }
});
// ── GET /api/planners/week ──
router.get("/week", async (req, res) => {
    try {
        const userId = getUserId(req);
        const plans = await db.query.studyPlans.findMany({
            where: planOwnerFilter(userId),
        });
        const deckIds = [...new Set(plans.filter(p => p.deckId).map(p => p.deckId))];
        const deckMap = new Map();
        if (deckIds.length > 0) {
            const deckRecords = await db.select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
            deckRecords.forEach(d => deckMap.set(d.id, d.name));
        }
        const totalSessions = plans.length;
        const completedSessions = plans.filter(p => p.completed).length;
        const totalMinutes = plans.reduce((s, p) => s + p.durationMinutes, 0);
        const completedMinutes = plans.filter(p => p.completed).reduce((s, p) => s + p.durationMinutes, 0);
        const perDay = {};
        for (let i = 0; i < 7; i++) {
            const dayPlans = plans.filter(p => p.dayOfWeek === i);
            perDay[i] = {
                total: dayPlans.length,
                completed: dayPlans.filter(p => p.completed).length,
            };
        }
        const result = plans.map(p => ({
            ...p,
            deckName: p.deckId ? deckMap.get(p.deckId) || null : null,
            duration: p.durationMinutes,
        }));
        res.json({
            plans: result,
            stats: {
                totalSessions,
                completedSessions,
                totalMinutes,
                completedMinutes,
                perDay,
            },
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to get week planners");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get week planners" } });
    }
});
// ── POST /api/planners ──
router.post("/", validateBody(createPlannerSchema), async (req, res) => {
    try {
        const userId = getUserId(req);
        const { title, description, color, dayOfWeek, startHour, durationMinutes, deckId, recurrence } = req.body;
        if (!title || typeof dayOfWeek !== "number" || typeof startHour !== "number") {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "title, dayOfWeek, and startHour are required" } });
            return;
        }
        const [plan] = await db.insert(studyPlans).values({
            userId,
            title,
            description: description || null,
            color: color || "#06b6d4",
            dayOfWeek,
            startHour,
            durationMinutes: durationMinutes || 60,
            deckId: deckId || null,
            recurrence: recurrence || "none",
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        res.status(201).json({ ...plan, duration: plan.durationMinutes });
    }
    catch (err) {
        logger.error({ err }, "Failed to create planner");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create planner" } });
    }
});
// ── PATCH /api/planners/:id ──
router.patch("/:id", validateBody(updatePlannerSchema), async (req, res) => {
    try {
        const userId = getUserId(req);
        const planId = parseInt(req.params.id, 10);
        if (isNaN(planId)) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
            return;
        }
        const existing = await getPlanById(planId, userId);
        if (!existing) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
            return;
        }
        const { title, description, color, dayOfWeek, startHour, durationMinutes, deckId, recurrence } = req.body;
        const [updated] = await db.update(studyPlans).set({
            title: title ?? existing.title,
            description: description !== undefined ? description : existing.description,
            color: color ?? existing.color,
            dayOfWeek: dayOfWeek ?? existing.dayOfWeek,
            startHour: startHour ?? existing.startHour,
            durationMinutes: durationMinutes ?? existing.durationMinutes,
            deckId: deckId !== undefined ? deckId : existing.deckId,
            recurrence: recurrence ?? existing.recurrence,
            updatedAt: new Date(),
        }).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId))).returning();
        res.json({ ...updated, duration: updated.durationMinutes });
    }
    catch (err) {
        logger.error({ err }, "Failed to update planner");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update planner" } });
    }
});
// ── DELETE /api/planners/:id ──
router.delete("/:id", async (req, res) => {
    try {
        const userId = getUserId(req);
        const planId = parseInt(req.params.id, 10);
        if (isNaN(planId)) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
            return;
        }
        const existing = await getPlanById(planId, userId);
        if (!existing) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
            return;
        }
        await db.delete(studyPlans).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId)));
        res.status(204).send();
    }
    catch (err) {
        logger.error({ err }, "Failed to delete planner");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete planner" } });
    }
});
// ── POST /api/planners/:id/complete ──
router.post("/:id/complete", async (req, res) => {
    try {
        const userId = getUserId(req);
        const planId = parseInt(req.params.id, 10);
        if (isNaN(planId)) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
            return;
        }
        const existing = await getPlanById(planId, userId);
        if (!existing) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
            return;
        }
        const [updated] = await db.update(studyPlans).set({
            completed: true,
            completedAt: new Date(),
            updatedAt: new Date(),
        }).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId))).returning();
        res.json({ ...updated, duration: updated.durationMinutes });
    }
    catch (err) {
        logger.error({ err }, "Failed to complete planner");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to complete planner" } });
    }
});
// ── POST /api/planners/:id/uncomplete ──
router.post("/:id/uncomplete", async (req, res) => {
    try {
        const userId = getUserId(req);
        const planId = parseInt(req.params.id, 10);
        if (isNaN(planId)) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
            return;
        }
        const existing = await getPlanById(planId, userId);
        if (!existing) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Plan not found" } });
            return;
        }
        const [updated] = await db.update(studyPlans).set({
            completed: false,
            completedAt: null,
            updatedAt: new Date(),
        }).where(and(eq(studyPlans.id, planId), planOwnerFilter(userId))).returning();
        res.json({ ...updated, duration: updated.durationMinutes });
    }
    catch (err) {
        logger.error({ err }, "Failed to uncomplete planner");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to uncomplete planner" } });
    }
});
// ── GET /api/planners/streak ──
router.get("/streak", async (req, res) => {
    try {
        const userId = getUserId(req);
        const plans = await db.query.studyPlans.findMany({
            where: planOwnerFilter(userId),
        });
        let currentStreak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dow = checkDate.getDay();
            const adjustedDow = dow === 0 ? 6 : dow - 1;
            const dayPlans = plans.filter(p => p.dayOfWeek === adjustedDow);
            if (dayPlans.length === 0)
                continue;
            const allCompleted = dayPlans.every(p => p.completed);
            if (allCompleted) {
                currentStreak++;
            }
            else {
                break;
            }
        }
        res.json({ currentStreak });
    }
    catch (err) {
        logger.error({ err }, "Failed to get streak");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get streak" } });
    }
});
export default router;
//# sourceMappingURL=planners.js.map