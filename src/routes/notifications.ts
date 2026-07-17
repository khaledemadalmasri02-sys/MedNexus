import { Hono } from "hono";
import { eq, and, isNull, or, lte, sql } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { notifications } from "../db/index";
import { validate } from "../middleware/validate";
import { logger } from "../lib/logger";

export const notificationRoutes = new Hono<AppEnv>();

function getDb(c: any): DB { return c.get("db"); }
function getUserId(c: any): string | null { return c.get("user")?.id ?? null; }

const createNotificationSchema = z.object({
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  actionUrl: z.string().url().max(500).optional(),
});

// ── GET /api/notifications ──
notificationRoutes.get("/notifications", async (c) => {
  try {
    const userId = getUserId(c);
    const unreadOnly = c.req.query("unread") === "true";

    const conditions = [userId ? eq(notifications.userId, userId) : isNull(notifications.userId)];
    conditions.push(or(isNull(notifications.scheduledAt), lte(notifications.scheduledAt, new Date()))!);
    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }

    const notifs = await getDb(c).query.notifications.findMany({ where: and(...conditions), limit: 50 });

    const [countResult] = await getDb(c).select({ count: sql<number>`count(*)` }).from(notifications).where(
      and(
        userId ? eq(notifications.userId, userId) : isNull(notifications.userId),
        or(isNull(notifications.scheduledAt), lte(notifications.scheduledAt, new Date()))!,
        eq(notifications.read, false),
      ),
    );

    return c.json({ notifications: notifs, unreadCount: countResult?.count || 0 });
  } catch (err) {
    logger.error({ err }, "Failed to get notifications");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get notifications" } }, 500);
  }
});

// ── POST /api/notifications/:id/read ──
notificationRoutes.post("/notifications/:id/read", async (c) => {
  try {
    const userId = getUserId(c);
    const notifId = parseInt(c.req.param("id") ?? "", 10);
    if (isNaN(notifId)) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid ID" } }, 400);
    }

    const existing = await getDb(c).query.notifications.findFirst({ where: eq(notifications.id, notifId) });
    if (!existing || (userId && existing.userId !== userId) || (!userId && existing.userId !== null)) {
      return c.json({ error: { code: "NOT_FOUND", message: "Notification not found" } }, 404);
    }

    await getDb(c).update(notifications).set({ read: true }).where(eq(notifications.id, notifId));
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to mark notification read");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to mark notification read" } }, 500);
  }
});

// ── POST /api/notifications/read-all ──
notificationRoutes.post("/notifications/read-all", async (c) => {
  try {
    const userId = getUserId(c);
    await getDb(c).update(notifications).set({ read: true }).where(
      userId ? eq(notifications.userId, userId) : isNull(notifications.userId),
    );
    return new Response(null, { status: 204 });
  } catch (err) {
    logger.error({ err }, "Failed to mark all notifications read");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to mark all notifications read" } }, 500);
  }
});

// ── POST /api/notifications ──
notificationRoutes.post("/notifications", validate(createNotificationSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { type, title, message, actionUrl } = c.get("validated") as any;

    if (!type || !title || !message) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "type, title, and message are required" } }, 400);
    }

    const [notif] = await getDb(c).insert(notifications).values({
      userId,
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      read: false,
      createdAt: new Date(),
    }).returning();

    return c.json(notif, 201);
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
    return c.json({ error: { code: "INTERNAL_ERROR", message: "Failed to create notification" } }, 500);
  }
});
