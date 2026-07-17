import { Router } from "express";
import { db, decks, cards, userSettings, generationLogs, studySessions, cardProgress, sqlite } from "../db/index.js";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import path from "path";
import fs from "fs";
import { getConfig, isDevelopment } from "../config.js";
const router = Router();
const BACKUP_DIR = getConfig().BACKUP_PATH;
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
function generateBackupName(userId) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const userPart = userId ? userId.slice(0, 8) : "guest";
    return `backup_${userPart}_${ts}.db`;
}
async function getStorageStats(userId) {
    const deckCount = await db.select({ count: sql `count(*)` }).from(decks).where(userId ? eq(decks.userId, userId) : sql `1=1`);
    const cardCount = await db.select({ count: sql `count(*)` }).from(cards).innerJoin(decks, eq(cards.deckId, decks.id)).where(userId ? eq(decks.userId, userId) : sql `1=1`);
    const summaryCount = await db.select({ count: sql `count(*)` }).from(generationLogs).where(userId ? eq(generationLogs.userId, userId) : sql `1=1`);
    const sessionCount = await db.select({ count: sql `count(*)` }).from(studySessions).where(userId ? eq(studySessions.userId, userId) : sql `1=1`);
    const dbPath = getConfig().DATABASE_URL;
    let storageUsedMb = 0;
    try {
        const stat = fs.statSync(dbPath);
        storageUsedMb = Math.round((stat.size / 1024 / 1024) * 100) / 100;
    }
    catch { /* ignore */ }
    return {
        totalDecks: Number(deckCount[0]?.count || 0),
        totalCards: Number(cardCount[0]?.count || 0),
        totalSummaries: Number(summaryCount[0]?.count || 0),
        totalStudySessions: Number(sessionCount[0]?.count || 0),
        storageUsedMb,
        storageLimitMb: 10240,
    };
}
// ── GET /api/user/storage — get storage usage stats ──
router.get("/storage", async (req, res) => {
    try {
        const userId = getUserId(req);
        const stats = await getStorageStats(userId);
        res.json(stats);
    }
    catch (err) {
        logger.error({ err }, "Failed to get storage stats");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get storage stats" } });
    }
});
// ── POST /api/user/export — export user data as JSON ──
router.post("/export", async (req, res) => {
    const { format = "json" } = req.body;
    const userId = getUserId(req);
    try {
        if (format === "json") {
            const userDecks = await db.select().from(decks).where(userId ? eq(decks.userId, userId) : sql `1=1`);
            const deckIds = userDecks.map(d => d.id);
            const userCards = deckIds.length > 0
                ? await db.select().from(cards).where(sql `${cards.deckId} IN (${sql.join(deckIds.map(id => sql `${id}`), sql `,`)})`)
                : [];
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
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", `attachment; filename="ankigen-export-${Date.now()}.json"`);
            res.json(exportData);
            return;
        }
        if (format === "csv") {
            const userDecks = await db.select().from(decks).where(userId ? eq(decks.userId, userId) : sql `1=1`);
            const deckIds = userDecks.map(d => d.id);
            const userCards = deckIds.length > 0
                ? await db.select().from(cards).where(sql `${cards.deckId} IN (${sql.join(deckIds.map(id => sql `${id}`), sql `,`)})`)
                : [];
            const header = "deck_name,front,back,tags,card_type,choices,correct_index";
            const rows = userCards.map(c => {
                const deck = userDecks.find(d => d.id === c.deckId);
                const escape = (s) => `"${(s || "").replace(/"/g, '""')}"`;
                return `${escape(deck?.name)},${escape(c.front)},${escape(c.back)},${escape(c.tags)},${c.cardType},"${(c.choices || "").replace(/"/g, '""')}",${c.correctIndex ?? ""}`;
            });
            const csv = [header, ...rows].join("\n");
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="ankigen-export-${Date.now()}.csv"`);
            res.send(csv);
            return;
        }
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Unsupported format" } });
    }
    catch (err) {
        logger.error({ err }, "Failed to export data");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to export data" } });
    }
});
// ── POST /api/user/import ──
router.post("/import", async (req, res) => {
    res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "Import via /api/user/import is deprecated. Use /api/decks/:id/import or POST /api/backup/restore." } });
});
// ── POST /api/backup/create ──
router.post("/create", async (req, res) => {
    try {
        const userId = getUserId(req);
        const backupName = generateBackupName(userId);
        const backupPath = path.join(BACKUP_DIR, backupName);
        await new Promise((resolve, reject) => {
            sqlite.backup(backupPath).then(() => resolve()).catch(reject);
        });
        const stat = fs.statSync(backupPath);
        const backupInfo = {
            id: backupName.replace(".db", ""),
            name: backupName,
            size: stat.size,
            createdAt: new Date().toISOString(),
            userId: userId,
        };
        logger.info({ backup: backupName, userId }, "Backup created successfully");
        res.status(201).json(backupInfo);
    }
    catch (err) {
        logger.error({ err }, "Failed to create backup");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to create backup" } });
    }
});
// ── GET /api/backup/list ──
router.get("/list", async (_req, res) => {
    try {
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(".db")).map(f => {
            const filePath = path.join(BACKUP_DIR, f);
            const stat = fs.statSync(filePath);
            return {
                id: f.replace(".db", ""),
                name: f,
                size: stat.size,
                createdAt: stat.mtime.toISOString(),
            };
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ backups: files });
    }
    catch (err) {
        logger.error({ err }, "Failed to list backups");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list backups" } });
    }
});
// ── GET /api/backup/download/:name ──
router.get("/download/:name", (req, res) => {
    const name = req.params.name;
    if (!name.endsWith(".db") || name.includes("..") || name.includes("/")) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid backup name" } });
        return;
    }
    const filePath = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Backup not found" } });
        return;
    }
    res.setHeader("Content-Type", "application/x-sqlite3");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
});
// ── POST /api/backup/restore ──
router.post("/restore", async (req, res) => {
    if (!req.isAuthenticated()) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required for backup restore" } });
        return;
    }
    const adminKey = req.headers["x-admin-key"];
    const secret = getConfig().ADMIN_SECRET_KEY;
    if (!secret || adminKey !== secret) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required for backup restore" } });
        return;
    }
    const { backupId } = req.body;
    if (!backupId) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "backupId is required" } });
        return;
    }
    const name = backupId.endsWith(".db") ? backupId : `${backupId}.db`;
    if (name.includes("..") || name.includes("/")) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid backup ID" } });
        return;
    }
    const filePath = path.join(BACKUP_DIR, name);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Backup not found" } });
        return;
    }
    try {
        const Database = (await import("better-sqlite3")).default;
        const restoreDb = new Database(filePath);
        const tableCount = restoreDb.prepare("SELECT count(*) as c FROM sqlite_master WHERE type='table'").get();
        restoreDb.close();
        if (tableCount.c < 5) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid backup file" } });
            return;
        }
        res.json({
            success: true,
            message: "Restore initiated. The server will restart with the restored data.",
            backupId,
        });
        logger.info({ backupId }, "Restore requested, will apply on next restart");
        setTimeout(() => {
            try {
                const currentDbPath = getConfig().DATABASE_URL;
                const currentBackupPath = `${currentDbPath}.pre-restore-${Date.now()}`;
                fs.copyFileSync(currentDbPath, currentBackupPath);
                fs.copyFileSync(filePath, currentDbPath);
                logger.info({ backupId, currentDbPath }, "Backup restored successfully");
                if (isDevelopment()) {
                    logger.info("Development mode: skipping process.exit, server continues running");
                }
                else {
                    process.exit(0);
                }
            }
            catch (err) {
                logger.error({ err }, "Failed to restore backup");
            }
        }, 1000);
    }
    catch (err) {
        logger.error({ err }, "Failed to validate backup");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to restore backup" } });
    }
});
// ── DELETE /api/user/data — delete all user data ──
router.delete("/data", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Must be logged in" } });
            return;
        }
        const userDecks = await db.select().from(decks).where(eq(decks.userId, userId));
        const deckIds = userDecks.map(d => d.id);
        if (deckIds.length > 0) {
            await db.delete(cards).where(sql `${cards.deckId} IN (${sql.join(deckIds.map(id => sql `${id}`), sql `,`)})`);
            await db.delete(decks).where(eq(decks.userId, userId));
        }
        await db.delete(studySessions).where(eq(studySessions.userId, userId));
        await db.delete(generationLogs).where(eq(generationLogs.userId, userId));
        await db.delete(cardProgress).where(eq(cardProgress.userId, userId));
        logger.info({ userId }, "User data deleted");
        res.json({ success: true, message: "All user data deleted" });
    }
    catch (err) {
        logger.error({ err }, "Failed to delete user data");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete user data" } });
    }
});
// ── DELETE /api/user/account — delete account ──
router.delete("/account", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Must be logged in" } });
            return;
        }
        const userDecks = await db.select().from(decks).where(eq(decks.userId, userId));
        const deckIds = userDecks.map(d => d.id);
        if (deckIds.length > 0) {
            await db.delete(cards).where(sql `${cards.deckId} IN (${sql.join(deckIds.map(id => sql `${id}`), sql `,`)})`);
            await db.delete(decks).where(eq(decks.userId, userId));
        }
        await db.delete(studySessions).where(eq(studySessions.userId, userId));
        await db.delete(generationLogs).where(eq(generationLogs.userId, userId));
        await db.delete(cardProgress).where(eq(cardProgress.userId, userId));
        await db.delete(userSettings).where(eq(userSettings.userId, userId));
        logger.info({ userId }, "Account deleted");
        res.json({ success: true, message: "Account deleted" });
    }
    catch (err) {
        logger.error({ err }, "Failed to delete account");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete account" } });
    }
});
// ── DELETE /api/backup/:name ──
router.delete("/:name", (req, res) => {
    const name = req.params.name;
    const dbName = name.endsWith(".db") ? name : `${name}.db`;
    if (!dbName.startsWith("backup_") || dbName.includes("..") || dbName.includes("/")) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid backup name" } });
        return;
    }
    const filePath = path.join(BACKUP_DIR, dbName);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Backup not found" } });
        return;
    }
    try {
        fs.unlinkSync(filePath);
        logger.info({ backup: name }, "Backup deleted");
        res.json({ success: true, message: "Backup deleted" });
    }
    catch (err) {
        logger.error({ err }, "Failed to delete backup");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to delete backup" } });
    }
});
export default router;
//# sourceMappingURL=backup.js.map