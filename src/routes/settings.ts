import { Router, Request, Response } from "express";
import { db, userSettings } from "../db/index.js";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { updateSettingsSchema } from "./validators.js";

const router = Router();

function getUserId(req: Request): string | null {
  return req.isAuthenticated() ? req.user!.id : null;
}

function getDefaultSettings(userId: string) {
  return {
    userId,
    dailyGoalMinutes: 20,
    dailyGoalCards: 30,
    reminderTime: null,
    accentColor: "cyan",
    dashboardLayout: null,
    density: "comfortable",
    soundEnabled: false,
    streakFreezeUsedAt: null,
    theme: "dark",
    animationsEnabled: true,
    fontSize: "medium",
    defaultStyle: "modern",
    defaultMode: "combined",
    autoTts: false,
    chunkSize: 3,
    cardOrder: "sequential",
    autoReveal: false,
    autoRevealSeconds: 5,
    showExplanation: true,
    streakFreeze: true,
    emailNotifications: true,
    emailWeeklySummary: true,
    emailStreakAlert: true,
    pushNotifications: true,
    pushReminderTime: "18:00",
    pushReviewDue: true,
    pushSessionComplete: true,
    inAppSounds: false,
    soundVolume: 70,
    ambientEnabled: true,
    customCursorEnabled: true,
    ripplesEnabled: true,
    animationSpeed: 100,
    reduceMotion: false,
    studyBuddyEnabled: true,
    smartReviewEnabled: true,
    deckDoctorEnabled: true,
    examSimulatorEnabled: true,
    contentSummarizerEnabled: true,
    mnemonicGeneratorEnabled: true,
    progressCoachEnabled: true,
    imageAnalyzerEnabled: true,
    voiceTutorEnabled: true,
    collaborativeStudyEnabled: true,
  };
}

router.get("/settings", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.json(getDefaultSettings("guest"));
      return;
    }

    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (existing) {
      res.json(existing);
      return;
    }

    const now = new Date();
    const defaults = getDefaultSettings(userId);
    const [created] = await db.insert(userSettings).values({
      ...defaults,
      createdAt: now,
      updatedAt: now,
    }).returning();

    res.json(created);
  } catch (err) {
    logger.error({ err }, "Failed to get settings");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get settings" } });
  }
});

router.put("/settings", requireAuth, validateBody(updateSettingsSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    const body = req.body;

    const updateData: Record<string, unknown> = { updatedAt: now };

    const allowedFields = [
      "dailyGoalMinutes", "dailyGoalCards", "reminderTime", "accentColor",
      "dashboardLayout", "density", "soundEnabled", "theme",
      "animationsEnabled", "fontSize", "defaultStyle", "defaultMode",
      "autoTts", "chunkSize", "cardOrder", "autoReveal", "autoRevealSeconds",
      "showExplanation", "streakFreeze", "emailNotifications",
      "emailWeeklySummary", "emailStreakAlert", "pushNotifications",
      "pushReminderTime", "pushReviewDue", "pushSessionComplete",
      "inAppSounds", "soundVolume",
      "ambientEnabled", "customCursorEnabled",
      "ripplesEnabled", "animationSpeed", "reduceMotion",
      "studyBuddyEnabled", "smartReviewEnabled", "deckDoctorEnabled",
      "examSimulatorEnabled", "contentSummarizerEnabled", "mnemonicGeneratorEnabled",
      "progressCoachEnabled", "imageAnalyzerEnabled", "voiceTutorEnabled",
      "collaborativeStudyEnabled",
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (existing) {
      await db.update(userSettings).set(updateData).where(eq(userSettings.userId, userId));
    } else {
      await db.insert(userSettings).values({ userId, ...updateData, createdAt: now });
    }

    const updated = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update settings");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update settings" } });
  }
});

router.post("/settings/reset", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const now = new Date();

    await db.delete(userSettings).where(eq(userSettings.userId, userId));

    const defaults = getDefaultSettings(userId);
    const [created] = await db.insert(userSettings).values({
      ...defaults,
      createdAt: now,
      updatedAt: now,
    }).returning();

    res.json(created);
  } catch (err) {
    logger.error({ err }, "Failed to reset settings");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to reset settings" } });
  }
});

router.post("/settings/sync", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const guestSettings = req.body;

    const allowedFields = [
      "dailyGoalMinutes", "dailyGoalCards", "reminderTime", "accentColor",
      "dashboardLayout", "density", "soundEnabled", "theme",
      "animationsEnabled", "fontSize", "defaultStyle", "defaultMode",
      "autoTts", "chunkSize", "cardOrder", "autoReveal", "autoRevealSeconds",
      "showExplanation", "streakFreeze", "emailNotifications",
      "emailWeeklySummary", "emailStreakAlert", "pushNotifications",
      "pushReminderTime", "pushReviewDue", "pushSessionComplete",
      "inAppSounds", "soundVolume",
      "ambientEnabled", "customCursorEnabled",
      "ripplesEnabled", "animationSpeed", "reduceMotion",
      "studyBuddyEnabled", "smartReviewEnabled", "deckDoctorEnabled",
      "examSimulatorEnabled", "contentSummarizerEnabled", "mnemonicGeneratorEnabled",
      "progressCoachEnabled", "imageAnalyzerEnabled", "voiceTutorEnabled",
      "collaborativeStudyEnabled",
    ];

    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (existing) {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      for (const field of allowedFields) {
        if (guestSettings[field] !== undefined &&
            guestSettings[field] !== null &&
          !(typeof guestSettings[field] === "object" && Object.keys(guestSettings[field]).length === 0)) {
          updateData[field] = guestSettings[field];
        }
      }

      await db.update(userSettings).set(updateData).where(eq(userSettings.userId, userId));
    } else {
      const now = new Date();
      const defaults = getDefaultSettings(userId);

      const merged = { ...defaults, userId, createdAt: now, updatedAt: now };
      for (const field of allowedFields) {
        const value = guestSettings[field];
        if (value !== undefined &&
            value !== null &&
          !(typeof value === "object" && Object.keys(value).length === 0)) {
          (merged as Record<string, unknown>)[field] = value;
        }
      }

      await db.insert(userSettings).values(merged as any);
    }

    const updated = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    res.json({ success: true, settings: updated });
  } catch (err) {
    logger.error({ err }, "Failed to sync settings");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to sync settings" } });
  }
});

export default router;
