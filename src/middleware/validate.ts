import { z } from "zod";
import type { Context, Next } from "hono";

export function validate<T extends z.ZodTypeAny>(schema: T) {
  return async (c: Context, next: Next) => {
    let body: unknown = {};
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      try {
        body = await c.req.json();
      } catch {
        body = {};
      }
    }
    const result = schema.safeParse(body ?? {});
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", issues } }, 400);
    }
    c.set("validated", result.data);
    await next();
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

export const oauthSchema = z.object({
  idToken: z.string().max(8192).optional(),
  accessToken: z.string().max(8192).optional(),
  identityToken: z.string().max(8192).optional(),
  fullName: z.object({ givenName: z.string().max(200).optional(), familyName: z.string().max(200).optional() }).optional(),
  email: z.string().email().max(254).optional(),
  rememberMe: z.boolean().optional(),
});

export const generateSchema = z.object({
  text: z.string().min(10).max(1000000),
  deckName: z.string().min(1).max(200),
  cardCount: z.number().int().positive().max(300).optional(),
  deckType: z.enum(["deck", "qbank"]).optional(),
});

export const explainSchema = z.object({
  front: z.string().min(1).max(10000),
  back: z.string().min(1).max(10000),
  mode: z.enum(["full", "revision", "osce", "brief", "mnemonic", "clinical", "testtrap"]).optional(),
  cardId: z.number().int().positive().optional(),
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
