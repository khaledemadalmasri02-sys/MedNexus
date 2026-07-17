import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { getConfig } from "../config.js";
import { logger } from "../lib/logger.js";
import { migrate, loadMigrations } from "./migrate.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = getConfig().DATABASE_URL;
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("cache_size = -64000");
sqlite.pragma("mmap_size = 268435456");
sqlite.pragma("temp_store = MEMORY");
sqlite.pragma("synchronous = NORMAL");
export const db = drizzle(sqlite, { schema });
export { sqlite };
export const { users, sessions, decks, cards, qbanks, questions, mindMaps, topics, feedback, generationLogs, freeTierUsage, agentSessions, terminalSessions, auditLogs, errorLogs, studyPlans, studySessions, studyPlanTemplates, notifications, cardProgress, tags, deckTags, qbankTags, achievements, userSettings, milestoneAcknowledgments, emailVerificationTokens, passwordResetTokens, chatMessages, agentUsage, exams, groupStudyRooms, supportKnowledge, supportConversations, supportMessages, agentKnowledge, agentResponseCache, agentCacheAnalytics, articleJobs, } = schema;
export async function initializeDatabase() {
    logger.info("Running database migrations...");
    const migrationsDir = path.join(__dirname, "migrations");
    const migrations = loadMigrations(migrationsDir);
    migrate(sqlite, migrations);
    logger.info(`Database migrations complete. Applied ${migrations.length} migrations.`);
}
export function closeDatabase() {
    sqlite.close();
    logger.info("Database connection closed");
}
//# sourceMappingURL=index.js.map