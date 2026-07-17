import { db } from "../db/index.js";
import { agentKnowledge, agentResponseCache, agentCacheAnalytics } from "../db/schema.js";
import { eq, and, sql, desc } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "./logger.js";
class LRUCache {
    map = new Map();
    maxSize;
    ttlMs;
    timestamps = new Map();
    constructor(maxSize, ttlMs = 3600000) { this.maxSize = maxSize; this.ttlMs = ttlMs; }
    get(key) {
        const entry = this.map.get(key);
        if (!entry)
            return undefined;
        const ts = this.timestamps.get(key) || 0;
        if (Date.now() - ts > this.ttlMs) {
            this.map.delete(key);
            this.timestamps.delete(key);
            return undefined;
        }
        this.map.delete(key);
        this.map.set(key, entry);
        this.timestamps.set(key, Date.now());
        return entry;
    }
    set(key, entry) {
        if (this.map.size >= this.maxSize) {
            const firstKey = this.map.keys().next().value;
            if (firstKey) {
                this.map.delete(firstKey);
                this.timestamps.delete(firstKey);
            }
        }
        this.map.set(key, entry);
        this.timestamps.set(key, Date.now());
    }
    get size() { return this.map.size; }
}
const memoryCache = new LRUCache(1000, 3600000);
function normalize(q) { return q.toLowerCase().trim().replace(/[?!.,;:'"]/g, "").replace(/\s+/g, " "); }
function hash(q) { return crypto.createHash("sha256").update(normalize(q)).digest("hex"); }
function tokenize(q) { return normalize(q).split(/\s+/).filter(w => w.length > 2); }
export async function getCachedResponse(agentId, question) {
    const hashKey = hash(question);
    const now = Date.now();
    const memEntry = memoryCache.get(hashKey);
    if (memEntry) {
        await trackAnalytics(agentId, "memory_hit");
        return memEntry;
    }
    const knowledgeHit = await searchKnowledgeBase(agentId, question);
    if (knowledgeHit) {
        const entry = { answer: knowledgeHit.answer, source: "knowledge", confidence: 0.95 };
        memoryCache.set(hashKey, entry);
        await trackAnalytics(agentId, "knowledge_hit");
        return entry;
    }
    const dbEntry = await db.query.agentResponseCache.findFirst({
        where: and(eq(agentResponseCache.agentId, agentId), eq(agentResponseCache.questionHash, hashKey), sql `${agentResponseCache.expiresAt} > ${Math.floor(Date.now() / 1000)}`),
    });
    if (dbEntry) {
        const entry = { answer: dbEntry.answer, source: "ai", confidence: dbEntry.confidence };
        memoryCache.set(hashKey, entry);
        await db.update(agentResponseCache).set({ hitCount: sql `${agentResponseCache.hitCount} + 1`, lastHitAt: new Date() }).where(eq(agentResponseCache.id, dbEntry.id));
        await trackAnalytics(agentId, "db_cache_hit");
        return entry;
    }
    await trackAnalytics(agentId, "miss");
    return null;
}
export async function storeCachedResponse(agentId, question, answer, source = "ai", confidence = 0.8) {
    const hashKey = hash(question);
    const now = new Date();
    const expires = new Date(now.getTime() + 86400000);
    memoryCache.set(hashKey, { answer, source, confidence });
    try {
        await db.insert(agentResponseCache).values({ agentId, questionHash: hashKey, questionOriginal: question.substring(0, 500), answer, source, confidence, expiresAt: expires });
    }
    catch {
        await db.update(agentResponseCache).set({ answer, hitCount: 1, lastHitAt: now, expiresAt: expires }).where(and(eq(agentResponseCache.agentId, agentId), eq(agentResponseCache.questionHash, hashKey)));
    }
}
async function searchKnowledgeBase(agentId, question) {
    const keywords = tokenize(question);
    if (keywords.length === 0)
        return null;
    const entries = await db.query.agentKnowledge.findMany({ where: and(eq(agentKnowledge.agentId, agentId), eq(agentKnowledge.isActive, true)), orderBy: [desc(agentKnowledge.priority)], limit: 20 });
    let bestMatch = null;
    for (const entry of entries) {
        let score = 0;
        const entryKeywords = JSON.parse(entry.keywords);
        for (const kw of keywords) {
            for (const ekw of entryKeywords) {
                if (ekw.includes(kw) || kw.includes(ekw))
                    score += 5;
            }
        }
        score += (entry.priority || 0) * 0.3;
        if (score > 8 && (!bestMatch || score > bestMatch.score))
            bestMatch = { answer: entry.answer, score };
    }
    return bestMatch ? { answer: bestMatch.answer } : null;
}
async function trackAnalytics(agentId, type) {
    const today = new Date().toISOString().split("T")[0];
    try {
        const existing = await db.query.agentCacheAnalytics.findFirst({ where: and(eq(agentCacheAnalytics.agentId, agentId), eq(agentCacheAnalytics.date, today)) });
        if (existing) {
            const u = { totalQuestions: sql `${agentCacheAnalytics.totalQuestions} + 1` };
            if (type === "memory_hit")
                u.memoryHits = sql `${agentCacheAnalytics.memoryHits} + 1`;
            if (type === "knowledge_hit")
                u.knowledgeHits = sql `${agentCacheAnalytics.knowledgeHits} + 1`;
            if (type === "db_cache_hit")
                u.dbCacheHits = sql `${agentCacheAnalytics.dbCacheHits} + 1`;
            if (type === "miss")
                u.apiCalls = sql `${agentCacheAnalytics.apiCalls} + 1`;
            await db.update(agentCacheAnalytics).set(u).where(eq(agentCacheAnalytics.id, existing.id));
        }
        else {
            await db.insert(agentCacheAnalytics).values({ agentId, date: today, totalQuestions: 1, memoryHits: type === "memory_hit" ? 1 : 0, knowledgeHits: type === "knowledge_hit" ? 1 : 0, dbCacheHits: type === "db_cache_hit" ? 1 : 0, apiCalls: type === "miss" ? 1 : 0 });
        }
    }
    catch (err) {
        logger.error({ err }, "Cache analytics error");
    }
}
export async function getCacheStats(agentId) {
    const stats = await db.query.agentCacheAnalytics.findMany({ where: eq(agentCacheAnalytics.agentId, agentId), orderBy: [desc(agentCacheAnalytics.date)], limit: 7 });
    const total = await db.select({ count: sql `count(*)` }).from(agentResponseCache).where(eq(agentResponseCache.agentId, agentId));
    return { daily: stats, totalCached: total[0]?.count || 0, memoryCacheSize: memoryCache.size };
}
export async function cleanExpiredCache() {
    const result = await db.delete(agentResponseCache).where(sql `${agentResponseCache.expiresAt} < ${Math.floor(Date.now() / 1000)}`);
    return result.changes || 0;
}
export async function searchKnowledge(agentId, query, limit = 5) {
    const keywords = tokenize(query);
    const entries = await db.query.agentKnowledge.findMany({ where: and(eq(agentKnowledge.agentId, agentId), eq(agentKnowledge.isActive, true)), orderBy: [desc(agentKnowledge.priority)], limit: 20 });
    return entries.map(entry => {
        const entryKeywords = JSON.parse(entry.keywords);
        let score = 0;
        for (const kw of keywords) {
            for (const ekw of entryKeywords) {
                if (ekw.includes(kw) || kw.includes(ekw))
                    score += 5;
            }
        }
        score += (entry.priority || 0) * 0.3;
        return { id: entry.id, question: entry.question, answer: entry.answer, category: entry.category, score };
    }).filter(s => s.score > 3).sort((a, b) => b.score - a.score).slice(0, limit);
}
//# sourceMappingURL=agent-cache.js.map