import { Hono } from "hono";
import { eq, inArray, sql } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { decks, cards, userSettings, generationLogs, studySessions, cardProgress } from "../db/index";
import { getDb, getUserId, unauthorized, serverError } from "../lib/helpers";

export const backupRoutes = new Hono<AppEnv>();

function csvEscape(s: string | null | undefined): string {
  return `"${(s || "").replace(/"/g, '""')}"`;
}

// ── GET /storage & /export & /data & /account: fully DB-backed ──
async function getStorageStats(db: DB, userId: string | null) {
  const deckCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(decks)
    .where(userId ? eq(decks.userId, userId) : sql`1=1`);
  const cardCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(cards)
    .innerJoin(decks, eq(cards.deckId, decks.id))
    .where(userId ? eq(decks.userId, userId) : sql`1=1`);
  const summaryCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(generationLogs)
    .where(userId ? eq(generationLogs.userId, userId) : sql`1=1`);
  const sessionCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(studySessions)
    .where(userId ? eq(studySessions.userId, userId) : sql`1=1`);

  return {
    totalDecks: Number(deckCount[0]?.count || 0),
    totalCards: Number(cardCount[0]?.count || 0),
    totalSummaries: Number(summaryCount[0]?.count || 0),
    totalStudySessions: Number(sessionCount[0]?.count || 0),
    storageUsedMb: 0,
    storageLimitMb: 10240,
  };
}

async function handleStorage(c: any) {
  try {
    const userId = getUserId(c);
    const stats = await getStorageStats(getDb(c), userId);
    return c.json(stats);
  } catch (err) {
    return serverError(c, "Failed to get storage stats");
  }
}

async function handleExport(c: any) {
  try {
    let body: any = {};
    try { body = await c.req.json(); } catch { /* no body */ }
    const { format = "json" } = body as { format?: string };
    const userId = getUserId(c);
    const db = getDb(c);

    const userDecks = await db.select().from(decks).where(userId ? eq(decks.userId, userId) : sql`1=1`);
    const deckIds = userDecks.map((d) => d.id);
    const userCards =
      deckIds.length > 0
        ? await db.select().from(cards).where(inArray(cards.deckId, deckIds))
        : [];

    if (format === "json") {
      const settings = await db.select().from(userSettings).where(eq(userSettings.userId, userId || ""));
      const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        format: "json",
        user: userId ? { id: userId } : null,
        settings: settings[0] || null,
        decks: userDecks,
        cards: userCards,
      };
      return c.json(exportData);
    }

    if (format === "csv") {
      const header = "deck_name,front,back,tags,card_type,choices,correct_index";
      const rows = userCards.map((card) => {
        const deck = userDecks.find((d) => d.id === card.deckId);
        return `${csvEscape(deck?.name)},${csvEscape(card.front)},${csvEscape(card.back)},${csvEscape(card.tags)},${card.cardType},${csvEscape(card.choices)},${card.correctIndex ?? ""}`;
      });
      const csv = [header, ...rows].join("\n");
      c.header("Content-Type", "text/csv");
      c.header("Content-Disposition", `attachment; filename="mednexus-export-${Date.now()}.csv"`);
      return c.body(csv);
    }

    return c.json({ error: { code: "VALIDATION_ERROR", message: "Unsupported format" } }, 400);
  } catch (err) {
    return serverError(c, "Failed to export data");
  }
}

async function handleImport(c: any) {
  return c.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Import via /api/.../import is deprecated. Use /api/decks/:id/import or POST /api/backup/restore.",
      },
    },
    501,
  );
}

async function handleDeleteData(c: any) {
  try {
    const userId = getUserId(c);
    if (!userId) return unauthorized(c);
    const db = getDb(c);
    const userDecks = await db.select().from(decks).where(eq(decks.userId, userId));
    const deckIds = userDecks.map((d) => d.id);
    if (deckIds.length > 0) {
      await db.delete(cards).where(inArray(cards.deckId, deckIds));
      await db.delete(decks).where(eq(decks.userId, userId));
    }
    await db.delete(studySessions).where(eq(studySessions.userId, userId));
    await db.delete(generationLogs).where(eq(generationLogs.userId, userId));
    await db.delete(cardProgress).where(eq(cardProgress.userId, userId));
    return c.json({ success: true, message: "All user data deleted" });
  } catch (err) {
    return serverError(c, "Failed to delete user data");
  }
}

async function handleDeleteAccount(c: any) {
  try {
    const userId = getUserId(c);
    if (!userId) return unauthorized(c);
    const db = getDb(c);
    const userDecks = await db.select().from(decks).where(eq(decks.userId, userId));
    const deckIds = userDecks.map((d) => d.id);
    if (deckIds.length > 0) {
      await db.delete(cards).where(inArray(cards.deckId, deckIds));
      await db.delete(decks).where(eq(decks.userId, userId));
    }
    await db.delete(studySessions).where(eq(studySessions.userId, userId));
    await db.delete(generationLogs).where(eq(generationLogs.userId, userId));
    await db.delete(cardProgress).where(eq(cardProgress.userId, userId));
    await db.delete(userSettings).where(eq(userSettings.userId, userId));
    return c.json({ success: true, message: "Account deleted" });
  } catch (err) {
    return serverError(c, "Failed to delete account");
  }
}

// ── File/process-based endpoints: STUBBED (no local filesystem on Workers) ──
function stubFileOp(c: any, op: string) {
  return c.json(
    {
      error: {
        code: "NOT_SUPPORTED",
        message: `${op} is not available on this deployment (requires local filesystem access).`,
      },
    },
    501,
  );
}

async function handleCreate(c: any) {
  return stubFileOp(c, "Backup creation");
}
async function handleList(c: any) {
  return stubFileOp(c, "Backup listing");
}
async function handleDownload(c: any) {
  return stubFileOp(c, "Backup download");
}
async function handleRestore(c: any) {
  return stubFileOp(c, "Backup restore");
}
async function handleDeleteName(c: any) {
  return stubFileOp(c, "Backup deletion");
}

// Register the full set of routes under BOTH /backup and /user prefixes
// (the original router was mounted at both in routes/index.ts).
function registerBackup(r: Hono<AppEnv>, prefix: string) {
  r.get(`${prefix}/storage`, handleStorage);
  r.post(`${prefix}/export`, handleExport);
  r.post(`${prefix}/import`, handleImport);
  r.post(`${prefix}/create`, handleCreate);
  r.get(`${prefix}/list`, handleList);
  r.get(`${prefix}/download/:name`, handleDownload);
  r.post(`${prefix}/restore`, handleRestore);
  r.delete(`${prefix}/data`, handleDeleteData);
  r.delete(`${prefix}/account`, handleDeleteAccount);
  r.delete(`${prefix}/:name`, handleDeleteName);
}

registerBackup(backupRoutes, "/backup");
registerBackup(backupRoutes, "/user");
