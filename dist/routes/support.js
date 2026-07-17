import { Router } from "express";
import { db, supportConversations, supportMessages } from "../db/index.js";
import { sql, eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { aiService } from "../lib/ai.js";
import crypto from "crypto";
const router = Router();
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
// GET /api/support/search — Search knowledge base
router.get("/search", async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q || q.length < 2) {
            const popular = await getPopularQuestions();
            res.json({ results: [], suggestions: popular });
            return;
        }
        const keywords = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const entries = await db.all(sql `
      SELECT id, category, question, answer, keywords, is_pinned as isPinned,
             views, helpful_count as helpfulCount, not_helpful_count as notHelpfulCount
      FROM support_knowledge
      WHERE is_active = 1
    `);
        const scored = entries.map((entry) => {
            let score = 0;
            const entryKeywords = JSON.parse(entry.keywords || "[]");
            const questionLower = entry.question.toLowerCase();
            for (const kw of keywords) {
                if (questionLower.includes(kw))
                    score += 10;
                for (const ekw of entryKeywords) {
                    if (ekw.includes(kw) || kw.includes(ekw))
                        score += 5;
                }
            }
            if (entry.isPinned)
                score += 2;
            const total = (entry.helpfulCount || 0) + (entry.notHelpfulCount || 0);
            if (total > 0) {
                score += ((entry.helpfulCount || 0) / total) * 3;
            }
            return { entry, score };
        });
        const results = scored
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map((s) => ({
            id: s.entry.id,
            question: s.entry.question,
            answer: s.entry.answer,
            category: s.entry.category,
            score: s.score,
        }));
        if (results.length > 0) {
            try {
                db.run(sql `UPDATE support_knowledge SET views = views + 1 WHERE id = ${results[0].id}`);
            }
            catch { /* ignore */ }
        }
        res.json({ results, query: q });
    }
    catch (err) {
        logger.error({ err }, "Support search failed");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Search failed" } });
    }
});
// POST /api/support/ask — AI-powered answer with knowledge base fallback
router.post("/ask", async (req, res) => {
    const { question } = req.body;
    const _userId = getUserId(req);
    if (!question || typeof question !== "string" || question.trim().length < 3) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Question is required (min 3 chars)" } });
        return;
    }
    let bestMatch = null;
    try {
        const keywords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const entries = await db.all(sql `
      SELECT id, category, question, answer, keywords, is_pinned as isPinned,
             helpful_count as helpfulCount, not_helpful_count as notHelpfulCount
      FROM support_knowledge
      WHERE is_active = 1
    `);
        let bestScore = 0;
        for (const entry of entries) {
            const entryKeywords = JSON.parse(entry.keywords || "[]");
            const questionLower = entry.question.toLowerCase();
            let score = 0;
            for (const kw of keywords) {
                if (questionLower.includes(kw))
                    score += 10;
                for (const ekw of entryKeywords) {
                    if (ekw.includes(kw) || kw.includes(ekw))
                        score += 5;
                }
            }
            if (entry.isPinned)
                score += 2;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = { id: entry.id, question: entry.question, answer: entry.answer, category: entry.category };
            }
        }
        if (bestMatch && bestScore > 15) {
            try {
                db.run(sql `UPDATE support_knowledge SET views = views + 1 WHERE id = ${bestMatch.id}`);
            }
            catch { /* ignore */ }
            res.json({
                answer: bestMatch.answer,
                source: "knowledge",
                knowledgeId: bestMatch.id,
                question: bestMatch.question,
                category: bestMatch.category,
                confidence: Math.min(bestScore / 30, 1),
            });
            return;
        }
        const systemPrompt = `You are a technical support agent for MedNexus, a medical flashcard study app. 

- Keep responses under 300 words. Use markdown formatting.`;
        const knowledgeContext = bestMatch
            ? `\n\nRelated knowledge base entry: Q: ${bestMatch.question} A: ${bestMatch.answer.substring(0, 200)}`
            : "";
        const aiAnswer = await aiService.complete([
            { role: "system", content: systemPrompt + knowledgeContext },
            { role: "user", content: question },
        ], { maxTokens: 500, temperature: 0.3 });
        res.json({
            answer: aiAnswer,
            source: "ai",
            knowledgeId: null,
            question: question,
            category: "general",
            confidence: 0.5,
        });
    }
    catch (err) {
        logger.error({ err }, "Support ask failed");
        const fallbackAnswer = bestMatch
            ? `I found a related support answer, but AI generation is temporarily unavailable.\n\n${bestMatch.answer}`
            : `I couldn't generate a live AI answer right now. Please try these steps first:\n\n1. Refresh the page and try again.\n2. Check your internet connection.\n3. Clear browser cache if the issue continues.\n4. Use the Help Center or feedback form for account-specific issues.`;
        res.status(200).json({
            answer: fallbackAnswer,
            source: "knowledge",
            knowledgeId: bestMatch?.id ?? null,
            question,
            category: "general",
            confidence: bestMatch ? 0.35 : 0.2,
        });
    }
});
// POST /api/support/rate — Rate a knowledge base answer
router.post("/rate", async (req, res) => {
    const { knowledgeId, helpful } = req.body;
    if (!knowledgeId) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "knowledgeId required" } });
        return;
    }
    try {
        const field = helpful ? "helpful_count" : "not_helpful_count";
        await db.run(sql `UPDATE support_knowledge SET ${sql.raw(field)} = ${sql.raw(field)} + 1 WHERE id = ${knowledgeId}`);
        res.json({ success: true });
    }
    catch (err) {
        logger.error({ err }, "Support rate failed");
        res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
});
// GET /api/support/categories
router.get("/categories", async (_req, res) => {
    try {
        const rows = await db.all(sql `
      SELECT DISTINCT category FROM support_knowledge WHERE is_active = 1 ORDER BY category
    `);
        const categories = rows.map(r => r.category);
        const totalRows = await db.all(sql `SELECT COUNT(*) as cnt FROM support_knowledge WHERE is_active = 1`);
        const total = totalRows[0]?.cnt || 0;
        res.json({ categories, total });
    }
    catch (err) {
        logger.error({ err }, "Support categories failed");
        res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
});
// GET /api/support/popular
router.get("/popular", async (_req, res) => {
    try {
        const entries = await db.all(sql `
      SELECT id, question, category FROM support_knowledge
      WHERE is_active = 1
      ORDER BY views DESC
      LIMIT 8
    `);
        res.json({ questions: entries });
    }
    catch (err) {
        logger.error({ err }, "Support popular failed");
        res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
});
async function getPopularQuestions() {
    try {
        const entries = await db.all(sql `
      SELECT id, question, category FROM support_knowledge
      WHERE is_active = 1
      ORDER BY views DESC
      LIMIT 5
    `);
        return entries;
    }
    catch {
        return [];
    }
}
// POST /api/support/chat — Streaming AI support chat with conversation persistence
router.post("/chat", async (req, res) => {
    const userId = getUserId(req);
    const { message, sessionId } = req.body;
    if (!message || typeof message !== "string" || message.trim().length < 2) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Message is required" } });
        return;
    }
    try {
        let convId;
        let sid = sessionId || crypto.randomBytes(8).toString("hex");
        const existing = sessionId
            ? await db.query.supportConversations.findFirst({ where: eq(supportConversations.sessionId, sid) })
            : null;
        if (existing) {
            convId = existing.id;
        }
        else {
            const [conv] = await db.insert(supportConversations).values({
                userId: userId || null,
                sessionId: sid,
                status: "active",
                createdAt: new Date(),
                updatedAt: new Date(),
            }).returning();
            convId = conv.id;
        }
        await db.insert(supportMessages).values({
            conversationId: convId,
            role: "user",
            content: message,
            createdAt: new Date(),
        });
        const history = await db.query.supportMessages.findMany({
            where: eq(supportMessages.conversationId, convId),
            orderBy: [sql `${supportMessages.createdAt} ASC`],
            limit: 10,
        });
        const systemPrompt = `You are a technical support agent for MedNexus, a medical flashcard study app.

- Keep responses under 300 words. Use markdown formatting.`;
        const messages = [
            { role: "system", content: systemPrompt },
            ...history.slice(-6).map(m => ({
                role: m.role,
                content: m.content,
            })),
        ];
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();
        res.write(`data: ${JSON.stringify({ sessionId: sid })}\n\n`);
        let fullAnswer = "";
        const stream = aiService.streamComplete(messages, { maxTokens: 500, temperature: 0.3 });
        for await (const chunk of stream) {
            fullAnswer += chunk;
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        await db.insert(supportMessages).values({
            conversationId: convId,
            role: "assistant",
            content: fullAnswer,
            source: "ai",
            createdAt: new Date(),
        });
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
    catch (err) {
        logger.error({ err }, "Support chat failed");
        res.write(`data: ${JSON.stringify({ error: "Chat failed" })}\n\n`);
        res.end();
    }
});
// GET /api/support/history — Get support chat history (no auth required, uses session)
router.get("/history", async (req, res) => {
    try {
        const sessionId = req.query.sessionId;
        if (!sessionId) {
            res.json({ messages: [] });
            return;
        }
        const conv = await db.query.supportConversations.findFirst({
            where: eq(supportConversations.sessionId, sessionId),
        });
        if (!conv) {
            res.json({ messages: [] });
            return;
        }
        const msgs = await db.query.supportMessages.findMany({
            where: eq(supportMessages.conversationId, conv.id),
            orderBy: [sql `${supportMessages.createdAt} ASC`],
            limit: 50,
        });
        res.json({
            messages: msgs.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                source: m.source,
                createdAt: m.createdAt,
            })),
            sessionId: conv.id,
        });
    }
    catch (err) {
        logger.error({ err }, "Support history failed");
        res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
});
// POST /api/support/conversations/:id/rate — Rate a support conversation
router.post("/conversations/:id/rate", async (req, res) => {
    const { rating, feedback } = req.body;
    try {
        await db.update(supportConversations).set({
            rating: rating || null,
            feedback: feedback || null,
            updatedAt: new Date(),
        }).where(eq(supportConversations.id, parseInt(req.params.id)));
        res.json({ success: true });
    }
    catch (err) {
        logger.error({ err }, "Support rate failed");
        res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
});
export default router;
//# sourceMappingURL=support.js.map