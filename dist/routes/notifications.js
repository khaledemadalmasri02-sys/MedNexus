import { Router } from "express";
import { db, notifications } from "../db/index.js";
import { eq, and, isNull, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { validateBody } from "../middleware/validate.js";
import { createNotificationSchema } from "./validators.js";
const router = Router();
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
// ── GET /api/notifications ──
router.get("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        const unreadOnly = req.query.unread === 'true';
        const conditions = [userId ? eq(notifications.userId, userId) : isNull(notifications.userId)];
        if (unreadOnly) {
            conditions.push(eq(notifications.read, false));
        }
        const notifs = await db.query.notifications.findMany({
            where: and(...conditions),
            limit: 50,
        });
        const [countResult] = await db.select({ count: sql `count(*)` }).from(notifications).where(and(userId ? eq(notifications.userId, userId) : isNull(notifications.userId), eq(notifications.read, false)));
        res.json({ notifications: notifs, unreadCount: countResult?.count || 0 });
    }
    catch (err) {
        logger.error({ err }, "Failed to get notifications");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get notifications" } });
    }
});
// ── POST /api/notifications/:id/read ──
router.post("/:id/read", async (req, res) => {
    try {
        const userId = getUserId(req);
        const notifId = parseInt(req.params.id, 10);
        if (isNaN(notifId)) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } });
            return;
        }
        const existing = await db.query.notifications.findFirst({ where: eq(notifications.id, notifId) });
        if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Notification not found" } });
            return;
        }
        await db.update(notifications).set({ read: true }).where(eq(notifications.id, notifId));
        res.status(204).send();
    }
    catch (err) {
        logger.error({ err }, "Failed to mark notification read");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to mark notification read" } });
    }
});
// ── POST /api/notifications/read-all ──
router.post("/read-all", async (req, res) => {
    try {
        const userId = getUserId(req);
        await db.update(notifications).set({ read: true }).where(userId ? eq(notifications.userId, userId) : isNull(notifications.userId));
        res.status(204).send();
    }
    catch (err) {
        logger.error({ err }, "Failed to mark all notifications read");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to mark all notifications read" } });
    }
});
// ── POST /api/notifications — create (internal use) ──
router.post("/", validateBody(createNotificationSchema), async (req, res) => {
    try {
        const userId = getUserId(req);
        const { type, title, message, actionUrl } = req.body;
        if (!type || !title || !message) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "type, title, and message are required" } });
            return;
        }
        const [notif] = await db.insert(notifications).values({
            userId,
            type,
            title,
            message,
            actionUrl: actionUrl || null,
            read: false,
            createdAt: new Date(),
        }).returning();
        res.status(201).json(notif);
    }
    catch (err) {
        logger.error({ err }, "Failed to create notification");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create notification" } });
    }
});
export default router;
//# sourceMappingURL=notifications.js.map