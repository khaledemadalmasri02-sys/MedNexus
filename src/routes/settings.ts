import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppEnv } from "../types";
import { userSettings } from "../db/index";
import { getDb, getUserId, isAuthenticated, unauthorized, serverError } from "../lib/helpers";
import { logger } from "../lib/logger";

export const settingsRoutes = new Hono<AppEnv>();

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

const ALLOWED_FIELDS = [
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

settingsRoutes.get("/settings", async (c) => {
  try {
    const userId = getUserId(c);
    if (!userId) {
      return c.json(getDefaultSettings("guest"));
    }

    const db = getDb(c);
    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (existing) {
      return c.json(existing);
    }

    const now = new Date();
    const defaults = getDefaultSettings(userId);
    const [created] = await db.insert(userSettings).values({
      ...defaults,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return c.json(created);
  } catch (err) {
    logger.error({ err }, "Failed to get settings");
    return serverError(c, "Failed to get settings");
  }
});

settingsRoutes.put("/settings", async (c) => {
  try {
    if (!isAuthenticated(c)) return unauthorized(c);
    const userId = getUserId(c)!;
    const now = new Date();
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;

    const updateData: Record<string, unknown> = { updatedAt: now };

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const db = getDb(c);
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
    return c.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update settings");
    return serverError(c, "Failed to update settings");
  }
});

settingsRoutes.post("/settings/reset", async (c) => {
  try {
    if (!isAuthenticated(c)) return unauthorized(c);
    const userId = getUserId(c)!;
    const now = new Date();
    const db = getDb(c);

    await db.delete(userSettings).where(eq(userSettings.userId, userId));

    const defaults = getDefaultSettings(userId);
    const [created] = await db.insert(userSettings).values({
      ...defaults,
      createdAt: now,
      updatedAt: now,
    }).returning();

    return c.json(created);
  } catch (err) {
    logger.error({ err }, "Failed to reset settings");
    return serverError(c, "Failed to reset settings");
  }
});

settingsRoutes.post("/settings/sync", async (c) => {
  try {
    if (!isAuthenticated(c)) return unauthorized(c);
    const userId = getUserId(c)!;
    const guestSettings = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const db = getDb(c);

    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (existing) {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      for (const field of ALLOWED_FIELDS) {
        const value = guestSettings[field];
        if (value !== undefined &&
            value !== null &&
            !(typeof value === "object" && Object.keys(value).length === 0)) {
          updateData[field] = value;
        }
      }

      await db.update(userSettings).set(updateData).where(eq(userSettings.userId, userId));
    } else {
      const now = new Date();
      const defaults = getDefaultSettings(userId);

      const merged: Record<string, unknown> = { ...defaults, userId, createdAt: now, updatedAt: now };
      for (const field of ALLOWED_FIELDS) {
        const value = guestSettings[field];
        if (value !== undefined &&
            value !== null &&
            !(typeof value === "object" && Object.keys(value).length === 0)) {
          merged[field] = value;
        }
      }

      await db.insert(userSettings).values(merged as any);
    }

    const updated = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    return c.json({ success: true, settings: updated });
  } catch (err) {
    logger.error({ err }, "Failed to sync settings");
    return serverError(c, "Failed to sync settings");
  }
});
