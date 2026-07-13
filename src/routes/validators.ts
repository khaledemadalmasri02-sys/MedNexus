import { z } from "zod";
import { Request, Response, NextFunction } from "express";

export type ValidatedRequest<T> = Request & { validated: T };

export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid input", issues },
      });
      return;
    }
    (req as ValidatedRequest<z.infer<T>>).validated = result.data;
    next();
  };
}

export const createDeckSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  parentId: z.number().int().positive().optional(),
  kind: z.enum(["deck", "qbank"]).optional(),
});

export const updateDeckSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  parentId: z.number().int().positive().optional(),
  kind: z.enum(["deck", "qbank"]).optional(),
});

export const mergeDecksSchema = z.object({
  deckIds: z.array(z.number().int().positive()).min(2),
  newDeckName: z.string().min(1).max(200),
  parentId: z.number().int().positive().optional(),
  deleteOriginals: z.boolean().optional(),
});

export const createCardSchema = z.object({
  deckId: z.number().int().positive(),
  front: z.string().min(1).max(10000),
  back: z.string().min(1).max(10000),
  cardType: z.enum(["basic", "mcq"]).optional(),
  tags: z.string().max(500).optional(),
  choices: z.string().max(5000).optional(),
  correctIndex: z.number().int().min(0).max(10).optional(),
});

export const updateCardSchema = z.object({
  front: z.string().min(1).max(10000).optional(),
  back: z.string().min(1).max(10000).optional(),
  tags: z.string().max(500).optional(),
  cardType: z.enum(["basic", "mcq"]).optional(),
  choices: z.string().max(5000).optional(),
  correctIndex: z.number().int().min(0).max(10).optional(),
});

export const regenerateBatchSchema = z.object({
  cardIds: z.array(z.number().int().positive()).min(1),
});

export const createQBankSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.number().int().positive().optional(),
});

export const updateQBankSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  parentId: z.number().int().positive().optional(),
});

export const addQuestionSchema = z.object({
  front: z.string().min(1).max(10000),
  back: z.string().min(1).max(10000),
  choices: z.array(z.string().max(1000)).optional(),
  correctIndex: z.number().int().min(0).max(10).optional(),
  tags: z.string().max(500).optional(),
});

export const updateQuestionSchema = z.object({
  front: z.string().min(1).max(10000).optional(),
  back: z.string().min(1).max(10000).optional(),
  choices: z.array(z.string().max(1000)).optional(),
  correctIndex: z.number().int().min(0).max(10).optional(),
  tags: z.string().max(500).optional(),
});

export const importFromDeckSchema = z.object({
  deckId: z.number().int().positive(),
});

export const generateSchema = z.object({
  text: z.string().min(10).max(50000),
  deckName: z.string().min(1).max(200),
  cardCount: z.number().int().positive().max(100).optional(),
  deckType: z.enum(["deck", "qbank"]).optional(),
});

export const explainSchema = z.object({
  front: z.string().min(1).max(10000),
  back: z.string().min(1).max(10000),
  mode: z.enum(["full", "revision", "osce", "brief", "mnemonic", "clinical", "testtrap"]).optional(),
});

export const fullExplainSchema = z.object({
  front: z.string().min(1).max(10000),
  back: z.string().min(1).max(10000),
  topic: z.string().max(500).optional(),
});

export const batchExplainSchema = z.object({
  cards: z.array(z.object({
    front: z.string().min(1).max(10000),
    back: z.string().min(1).max(10000),
  })).min(1).max(50),
  mode: z.enum(["full", "revision", "osce", "brief", "mnemonic", "clinical", "testtrap"]).optional(),
});

export const extractTextSchema = z.object({
  text: z.string().min(1).max(100000),
});

export const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const deckIdQuerySchema = z.object({
  deckId: z.string().regex(/^\d+$/).transform(Number),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>;
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
export type MergeDecksInput = z.infer<typeof mergeDecksSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type CreateQBankInput = z.infer<typeof createQBankSchema>;
export type UpdateQBankInput = z.infer<typeof updateQBankSchema>;
export type AddQuestionInput = z.infer<typeof addQuestionSchema>;
export type GenerateInput = z.infer<typeof generateSchema>;
export type ExplainInput = z.infer<typeof explainSchema>;

export const startStudySessionSchema = z.object({
  planId: z.number().int().positive().optional(),
  deckId: z.number().int().positive().optional(),
});

export const updateStudySessionSchema = z.object({
  cardsStudied: z.number().int().min(0).optional(),
  knownCount: z.number().int().min(0).optional(),
  unknownCount: z.number().int().min(0).optional(),
});

export const endStudySessionSchema = z.object({
  cardsStudied: z.number().int().min(0).optional(),
  knownCount: z.number().int().min(0).optional(),
  unknownCount: z.number().int().min(0).optional(),
  focusRating: z.number().int().min(1).max(5).optional(),
});

export const createExamSchema = z.object({
  title: z.string().min(1).max(200),
  subject: z.string().max(200).optional(),
  examDate: z.string().datetime(),
  color: z.string().max(20).optional(),
});

export const updateExamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  subject: z.string().max(200).optional(),
  examDate: z.string().datetime().optional(),
  color: z.string().max(20).optional(),
});

export const expandPlannerSchema = z.object({
  weeks: z.number().int().min(1).max(12).optional(),
});

export const createPlannerSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  color: z.string().max(20).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startHour: z.number().int().min(0).max(23),
  durationMinutes: z.number().int().positive().max(480).optional(),
  deckId: z.number().int().positive().optional(),
  recurrence: z.enum(["none", "weekly", "daily"]).optional(),
});

export const updatePlannerSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().max(20).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  durationMinutes: z.number().int().positive().max(480).optional(),
  deckId: z.number().int().positive().nullable().optional(),
  recurrence: z.enum(["none", "weekly", "daily"]).optional(),
});

export const createNotificationSchema = z.object({
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  actionUrl: z.string().url().max(500).optional(),
});

export const reviewCardSchema = z.object({
  quality: z.number().int().min(0).max(5),
});

export const updateSettingsSchema = z.object({
  dailyGoalMinutes: z.number().int().positive().max(1440).optional(),
  dailyGoalCards: z.number().int().positive().max(10000).optional(),
  reminderTime: z.string().max(10).nullable().optional(),
  accentColor: z.string().max(20).optional(),
  dashboardLayout: z.string().nullable().optional(),
  density: z.enum(["compact", "comfortable", "spacious"]).optional(),
  soundEnabled: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  animationsEnabled: z.boolean().optional(),
  fontSize: z.enum(["small", "medium", "large"]).optional(),
  defaultStyle: z.string().max(50).optional(),
  defaultMode: z.enum(["combined", "separate"]).optional(),
  autoTts: z.boolean().optional(),
  chunkSize: z.number().int().min(1).max(10).optional(),
  cardOrder: z.enum(["sequential", "random"]).optional(),
  autoReveal: z.boolean().optional(),
  autoRevealSeconds: z.number().int().min(1).max(60).optional(),
  showExplanation: z.boolean().optional(),
  streakFreeze: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  emailWeeklySummary: z.boolean().optional(),
  emailStreakAlert: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  pushReminderTime: z.string().max(10).optional(),
  pushReviewDue: z.boolean().optional(),
  pushSessionComplete: z.boolean().optional(),
  inAppSounds: z.boolean().optional(),
  soundVolume: z.number().int().min(0).max(100).optional(),
  ambientEnabled: z.boolean().optional(),
  customCursorEnabled: z.boolean().optional(),
  ripplesEnabled: z.boolean().optional(),
  animationSpeed: z.number().int().min(25).max(400).optional(),
  reduceMotion: z.boolean().optional(),
});

export const generatePlanSchema = z.object({
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

export const batchCreatePlansSchema = z.object({
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

export const createTemplateSchema = z.object({
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

export const deckTagsSchema = z.object({
  tagIds: z.array(z.number().int().positive()).min(1).max(50),
});

export const terminalExecSchema = z.object({
  command: z.string().min(1).max(500),
  sessionId: z.string().uuid().optional(),
  timeout: z.number().int().positive().max(60000).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(1024),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(1024)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  rememberMe: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(256),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(1024)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});

export const sendVerificationSchema = z.object({
  email: z.string().email().max(254),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1).max(256),
});

export const oauthSchema = z.object({
  idToken: z.string().max(8192).optional(),
  accessToken: z.string().max(8192).optional(),
  identityToken: z.string().max(8192).optional(),
  fullName: z.object({
    givenName: z.string().max(200).optional(),
    familyName: z.string().max(200).optional(),
  }).optional(),
  email: z.string().email().max(254).optional(),
  rememberMe: z.boolean().optional(),
});
