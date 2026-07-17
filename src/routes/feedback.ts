import { Hono } from "hono";
import type { AppEnv } from "../types";
import { feedback } from "../db/index";
import { getDb, getUserId } from "../lib/helpers";

export const feedbackRoutes = new Hono<AppEnv>();

feedbackRoutes.post("/feedback", async (c) => {
  try {
    const userId = getUserId(c);
    const body = await c.req.json().catch(() => ({})) as any;
    const { type, message, rating } = body;

    if (!message || typeof message !== "string") {
      return c.json({ error: { message: "Message is required", code: "VALIDATION_ERROR" } }, 400);
    }

    await getDb(c).insert(feedback).values({
      userId: userId || null,
      type: type || "other",
      message: message.trim(),
      rating: rating || null,
    });

    return c.json({ success: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return c.json({ error: { message: "Failed to submit feedback", code: "FEEDBACK_ERROR" } }, 500);
  }
});
