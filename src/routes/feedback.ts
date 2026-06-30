import { Router, Request, Response } from "express";
import { db, feedback } from "../db/index.js";

const router = Router();

function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

router.post("/feedback", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const { type, message, rating } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: { message: "Message is required", code: "VALIDATION_ERROR" } });
      return;
    }

    await db.insert(feedback).values({
      userId: userId || null,
      type: type || "other",
      message: message.trim(),
      rating: rating || null,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({ error: { message: "Failed to submit feedback", code: "FEEDBACK_ERROR" } });
  }
});

export default router;
