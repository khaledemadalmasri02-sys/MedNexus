import { Router } from "express";
import { db, cardProgress, cards, decks, studySessions, users, achievements, userSettings } from "../db/index.js";
import { eq, and, isNull, sql, lte, gte, inArray, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";
const router = Router();
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
function ownerFilter(userId) {
    return userId ? eq(cardProgress.userId, userId) : isNull(cardProgress.userId);
}
function sessionOwnerFilter(userId) {
    return userId ? eq(studySessions.userId, userId) : isNull(studySessions.userId);
}
const dashboardCache = new Map();
const DASHBOARD_CACHE_TTL = 30_000;
function getCached(userId, key) {
    const entry = dashboardCache.get(`${userId}:${key}`);
    if (entry && Date.now() - entry.ts < DASHBOARD_CACHE_TTL) {
        return entry.data;
    }
    return null;
}
function setCached(userId, key, data) {
    dashboardCache.set(`${userId}:${key}`, { data, ts: Date.now() });
}
function invalidateCache(userId) {
    for (const key of dashboardCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
            dashboardCache.delete(key);
        }
    }
}
router.get("/dashboard", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
            return;
        }
        const cached = getCached(userId, "full");
        if (cached) {
            res.json(cached);
            return;
        }
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const hour = today.getHours();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const [user, allDecks, dueRecords, recentAchievement, allSessions, settings,] = await Promise.all([
            db.query.users.findFirst({ where: eq(users.id, userId) }),
            db.query.decks.findMany({ where: eq(decks.userId, userId) }),
            db.query.cardProgress.findMany({
                where: and(lte(cardProgress.nextReviewDate, todayStr), ownerFilter(userId)),
            }),
            db.query.achievements.findFirst({
                where: and(eq(achievements.userId, userId), eq(achievements.seen, false)),
                orderBy: [desc(achievements.unlockedAt)],
            }),
            db.query.studySessions.findMany({
                where: and(sessionOwnerFilter(userId), gte(studySessions.startedAt, new Date(today.getTime() - 30 * 86400000))),
                orderBy: [desc(studySessions.startedAt)],
            }),
            db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) }),
        ]);
        const firstName = user?.firstName || "there";
        const totalDecks = allDecks.length;
        const dueCards = dueRecords.length;
        const studyDates = new Set();
        for (const s of allSessions) {
            if (s.startedAt) {
                const d = new Date(s.startedAt);
                d.setHours(0, 0, 0, 0);
                studyDates.add(d.toISOString().split("T")[0]);
            }
        }
        const studiedToday = studyDates.has(todayStr);
        let currentStreak = 0;
        const checkDate = new Date(today);
        if (!studiedToday) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        while (studyDates.has(checkDate.toISOString().split("T")[0])) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        let longestStreak = 0;
        let tempStreak = 0;
        let prevDate = null;
        const sortedDates = Array.from(studyDates).sort();
        for (const dateStr of sortedDates) {
            const d = new Date(dateStr);
            if (prevDate && (d.getTime() - prevDate.getTime()) === 86400000) {
                tempStreak++;
            }
            else {
                tempStreak = 1;
            }
            longestStreak = Math.max(longestStreak, tempStreak);
            prevDate = d;
        }
        const todaySessions = allSessions.filter(s => s.startedAt >= todayStart && s.startedAt <= todayEnd);
        const todayMinutes = todaySessions.reduce((s, r) => s + (r.durationMinutes || 0), 0);
        const todayCardsStudied = todaySessions.reduce((s, r) => s + (r.cardsStudied || 0), 0);
        const dailyGoalMinutes = settings?.dailyGoalMinutes || 20;
        const dailyGoalCards = settings?.dailyGoalCards || 30;
        const weeklyStudyMinutes = [];
        const streakHistory = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split("T")[0];
            const dayStart = new Date(d);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(d);
            dayEnd.setHours(23, 59, 59, 999);
            const daySessions = allSessions.filter(s => s.startedAt >= dayStart && s.startedAt <= dayEnd);
            const mins = daySessions.reduce((s, r) => s + (r.durationMinutes || 0), 0);
            const crds = daySessions.reduce((s, r) => s + (r.cardsStudied || 0), 0);
            if (i < 7)
                weeklyStudyMinutes.push(mins);
            streakHistory.push({ date: dStr, minutes: mins, cards: crds });
        }
        const lastStudyDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
        let state = "caught_up";
        let stateData = { state: "caught_up", dueCards: 0, streak: currentStreak, userName: firstName };
        if (totalDecks === 0) {
            stateData = { state: "new", dueCards: 0, streak: 0, userName: firstName };
        }
        else if (recentAchievement) {
            stateData = {
                state: "milestone",
                dueCards,
                streak: currentStreak,
                userName: firstName,
                milestoneText: `${recentAchievement.icon} ${recentAchievement.title}`,
            };
        }
        else if (dueCards > 0) {
            stateData = { state: "reviews_due", dueCards, streak: currentStreak, userName: firstName };
        }
        else if (!studiedToday && currentStreak > 0 && hour >= 18) {
            stateData = { state: "streak_at_risk", dueCards: 0, streak: currentStreak, userName: firstName };
        }
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        const recentSessions = allSessions.filter(s => s.startedAt >= oneWeekAgo);
        const olderSessions = allSessions.filter(s => s.startedAt >= twoWeeksAgo && s.startedAt <= oneWeekAgo);
        const recentKnown = recentSessions.reduce((s, r) => s + (r.knownCount || 0), 0);
        const recentTotal = recentSessions.reduce((s, r) => s + (r.cardsStudied || 0), 0);
        const olderKnown = olderSessions.reduce((s, r) => s + (r.knownCount || 0), 0);
        const olderTotal = olderSessions.reduce((s, r) => s + (r.cardsStudied || 0), 0);
        const recentRate = recentTotal > 0 ? recentKnown / recentTotal : 0;
        const olderRate = olderTotal > 0 ? olderKnown / olderTotal : 0;
        let trend = "stable";
        if (recentRate > olderRate + 0.05)
            trend = "improving";
        else if (recentRate < olderRate - 0.05)
            trend = "declining";
        const allDeckIds = allDecks.map(d => d.id);
        let mastery = { overall: 0, byDeck: [] };
        if (allDeckIds.length > 0) {
            const allCards = await db.query.cards.findMany({ where: inArray(cards.deckId, allDeckIds) });
            if (allCards.length > 0) {
                const allCardIds = allCards.map(c => c.id);
                const progressRecords = await db.query.cardProgress.findMany({
                    where: and(inArray(cardProgress.cardId, allCardIds), ownerFilter(userId)),
                });
                const progressMap = new Map(progressRecords.map(p => [p.cardId, p]));
                let totalMasterySum = 0;
                const byDeck = [];
                const deckColors = ["var(--accent-green)", "var(--accent-purple)", "var(--accent-amber)", "var(--accent-emerald)", "var(--accent-blue)", "var(--accent-rose)"];
                for (let i = 0; i < allDecks.length; i++) {
                    const deck = allDecks[i];
                    const deckCards = allCards.filter(c => c.deckId === deck.id);
                    if (deckCards.length === 0)
                        continue;
                    let mastered = 0, learning = 0, newCount = 0, deckMasterySum = 0;
                    for (const card of deckCards) {
                        const p = progressMap.get(card.id);
                        if (!p) {
                            newCount++;
                            continue;
                        }
                        const totalReviews = (p.knownCount || 0) + (p.unknownCount || 0);
                        const cardMastery = totalReviews > 0
                            ? Math.min(100, Math.round(((p.knownCount || 0) / totalReviews) * 100 * Math.min(1, (p.repetitions || 0) / 5)))
                            : 0;
                        deckMasterySum += cardMastery;
                        totalMasterySum += cardMastery;
                        if (cardMastery >= 80 && (p.repetitions || 0) >= 3)
                            mastered++;
                        else if (totalReviews > 0)
                            learning++;
                        else
                            newCount++;
                    }
                    byDeck.push({
                        deckId: deck.id,
                        deckName: deck.name,
                        totalCards: deckCards.length,
                        masteredCards: mastered,
                        learningCards: learning,
                        newCards: newCount,
                        masteryPct: deckCards.length > 0 ? Math.round(deckMasterySum / deckCards.length) : 0,
                        color: deckColors[i % deckColors.length],
                    });
                }
                mastery = {
                    overall: allCards.length > 0 ? Math.round(totalMasterySum / allCards.length) : 0,
                    byDeck,
                    trend,
                };
            }
        }
        const result = {
            state: stateData,
            streak: {
                currentStreak,
                longestStreak,
                lastStudyDate,
                studiedToday,
                todayMinutes,
                todayCardsStudied,
                dailyGoalMinutes,
                dailyGoalCards,
                weeklyStudyMinutes,
                streakHistory,
            },
            mastery,
            dueCards,
        };
        setCached(userId, "full", result);
        res.json(result);
    }
    catch (err) {
        logger.error({ err }, "Failed to get dashboard data");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get dashboard data" } });
    }
});
router.patch("/dashboard/goals", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
            return;
        }
        const { dailyGoalMinutes, dailyGoalCards, reminderTime, accentColor, density, soundEnabled } = req.body;
        const now = new Date();
        const existing = await db.query.userSettings.findFirst({
            where: eq(userSettings.userId, userId),
        });
        if (existing) {
            await db.update(userSettings).set({
                ...(dailyGoalMinutes !== undefined ? { dailyGoalMinutes } : {}),
                ...(dailyGoalCards !== undefined ? { dailyGoalCards } : {}),
                ...(reminderTime !== undefined ? { reminderTime } : {}),
                ...(accentColor !== undefined ? { accentColor } : {}),
                ...(density !== undefined ? { density } : {}),
                ...(soundEnabled !== undefined ? { soundEnabled } : {}),
                updatedAt: now,
            }).where(eq(userSettings.userId, userId));
        }
        else {
            await db.insert(userSettings).values({
                userId,
                dailyGoalMinutes: dailyGoalMinutes || 20,
                dailyGoalCards: dailyGoalCards || 30,
                reminderTime: reminderTime || null,
                accentColor: accentColor || "cyan",
                density: density || "comfortable",
                soundEnabled: soundEnabled || false,
                createdAt: now,
                updatedAt: now,
            });
        }
        invalidateCache(userId);
        const updated = await db.query.userSettings.findFirst({
            where: eq(userSettings.userId, userId),
        });
        res.json(updated);
    }
    catch (err) {
        logger.error({ err }, "Failed to update goals");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to update goals" } });
    }
});
router.get("/dashboard/queue", async (req, res) => {
    try {
        const userId = getUserId(req);
        const today = new Date().toISOString().split("T")[0];
        const items = [];
        const [dueRecords, recentSession, settings] = await Promise.all([
            db.query.cardProgress.findMany({
                where: and(lte(cardProgress.nextReviewDate, today), ownerFilter(userId)),
            }),
            db.query.studySessions.findFirst({
                where: and(sessionOwnerFilter(userId), isNull(studySessions.endedAt)),
                orderBy: [desc(studySessions.startedAt)],
            }),
            userId ? db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) }) : null,
        ]);
        if (dueRecords.length > 0) {
            const estimatedMin = Math.max(1, Math.round(dueRecords.length * 0.25));
            items.push({
                id: "review-due",
                type: "review",
                title: `Review ${dueRecords.length} due cards`,
                subtitle: `${dueRecords.length} cards are past their review deadline`,
                estimatedMin,
                actionLabel: "→ Start Review",
                actionUrl: "/study",
                color: "amber",
            });
        }
        if (recentSession) {
            items.push({
                id: "continue-session",
                type: "continue",
                title: `Continue studying`,
                subtitle: `Started ${new Date(recentSession.startedAt).toLocaleDateString()}`,
                estimatedMin: 10,
                actionLabel: "→ Continue",
                actionUrl: `/study?deck=${recentSession.deckId || ""}`,
                color: "purple",
            });
        }
        const dailyGoalMin = settings?.dailyGoalMinutes || 20;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const todaySessions = await db.query.studySessions.findMany({
            where: and(sessionOwnerFilter(userId), gte(studySessions.startedAt, todayStart), lte(studySessions.startedAt, todayEnd)),
        });
        const todayMins = todaySessions.reduce((s, r) => s + (r.durationMinutes || 0), 0);
        if (todayMins < dailyGoalMin) {
            items.push({
                id: "daily-goal",
                type: "goal",
                title: `Daily goal: ${dailyGoalMin - todayMins} min remaining`,
                subtitle: `You've studied ${todayMins} of ${dailyGoalMin} min today`,
                estimatedMin: dailyGoalMin - todayMins,
                actionLabel: "→ Quick Session",
                actionUrl: "/study",
                color: "cyan",
            });
        }
        const cachedStreak = getCached(userId || "anon", "full");
        if (cachedStreak) {
            const { currentStreak, studiedToday } = cachedStreak.streak;
            const hour = new Date().getHours();
            if (!studiedToday && currentStreak > 0 && hour >= 18) {
                items.push({
                    id: "streak-risk",
                    type: "streak",
                    title: `Don't lose your ${currentStreak}-day streak!`,
                    subtitle: "You haven't studied today. Your streak expires at midnight.",
                    estimatedMin: 10,
                    actionLabel: "→ Quick 10-min Review",
                    actionUrl: "/study",
                    color: "rose",
                });
            }
        }
        const allClear = items.length === 0;
        if (allClear) {
            items.push({
                id: "all-clear",
                type: "celebration",
                title: "You're all set! 🎉",
                subtitle: "Take a well-deserved break, or generate cards for a new topic.",
                estimatedMin: 0,
                actionLabel: "→ Generate Cards",
                actionUrl: "/generate",
                color: "emerald",
            });
        }
        res.json({ items, allClear });
    }
    catch (err) {
        logger.error({ err }, "Failed to get queue data");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get queue data" } });
    }
});
router.get("/achievements", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.json({ recent: [], total: 0, unseen: 0 });
            return;
        }
        const [userAchievements, total, unseen] = await Promise.all([
            db.query.achievements.findMany({
                where: eq(achievements.userId, userId),
                orderBy: [desc(achievements.unlockedAt)],
                limit: 10,
            }),
            db.select({ count: sql `count(*)` }).from(achievements).where(eq(achievements.userId, userId)),
            db.select({ count: sql `count(*)` }).from(achievements).where(and(eq(achievements.userId, userId), eq(achievements.seen, false))),
        ]);
        res.json({
            recent: userAchievements,
            total: total[0]?.count || 0,
            unseen: unseen[0]?.count || 0,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to get achievements");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to get achievements" } });
    }
});
router.post("/achievements/:id/seen", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
            return;
        }
        const achievementId = parseInt(req.params.id, 10);
        await db.update(achievements)
            .set({ seen: true })
            .where(and(eq(achievements.id, achievementId), eq(achievements.userId, userId)));
        res.json({ success: true });
    }
    catch (err) {
        logger.error({ err }, "Failed to mark achievement seen");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to mark achievement seen" } });
    }
});
router.post("/achievements/check", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            res.json({ newlyUnlocked: [] });
            return;
        }
        const newlyUnlocked = [];
        const [existingTypes, allSessions, totalDecksResult] = await Promise.all([
            db.query.achievements.findMany({ where: eq(achievements.userId, userId) }),
            db.query.studySessions.findMany({ where: sessionOwnerFilter(userId) }),
            db.query.decks.findMany({ where: eq(decks.userId, userId) }),
        ]);
        const existingTypeSet = new Set(existingTypes.map(a => a.type));
        const studyDates = new Set();
        for (const s of allSessions) {
            if (s.startedAt) {
                const d = new Date(s.startedAt);
                d.setHours(0, 0, 0, 0);
                studyDates.add(d.toISOString().split("T")[0]);
            }
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];
        const studiedToday = studyDates.has(todayStr);
        let currentStreak = 0;
        const checkDate = new Date(today);
        if (!studiedToday) {
            checkDate.setDate(checkDate.getDate() - 1);
        }
        while (studyDates.has(checkDate.toISOString().split("T")[0])) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        }
        const totalCardsStudied = allSessions.reduce((s, r) => s + (r.cardsStudied || 0), 0);
        const totalDecks = totalDecksResult.length;
        const checks = [
            { type: "first_deck", title: "First Deck!", desc: "Created your first deck", icon: "🎯", condition: totalDecks >= 1 },
            { type: "first_study", title: "First Study!", desc: "Completed your first study session", icon: "📚", condition: allSessions.length >= 1 },
            { type: "streak_3", title: "3-Day Streak!", desc: "Studied 3 days in a row", icon: "🔥", condition: currentStreak >= 3 },
            { type: "streak_7", title: "7-Day Streak!", desc: "Studied 7 days in a row", icon: "🔥", condition: currentStreak >= 7 },
            { type: "streak_30", title: "30-Day Streak!", desc: "Studied 30 days in a row", icon: "🔥", condition: currentStreak >= 30 },
            { type: "cards_100", title: "Century!", desc: "Studied 100 cards total", icon: "💯", condition: totalCardsStudied >= 100 },
            { type: "cards_500", title: "500 Cards!", desc: "Studied 500 cards total", icon: "📖", condition: totalCardsStudied >= 500 },
            { type: "cards_1000", title: "1000 Cards!", desc: "Studied 1,000 cards total", icon: "🏆", condition: totalCardsStudied >= 1000 },
        ];
        for (const check of checks) {
            if (check.condition && !existingTypeSet.has(check.type)) {
                await db.insert(achievements).values({
                    userId,
                    type: check.type,
                    title: check.title,
                    description: check.desc,
                    icon: check.icon,
                    unlockedAt: new Date(),
                    seen: false,
                });
                newlyUnlocked.push({ type: check.type, title: check.title, description: check.desc, icon: check.icon });
            }
        }
        res.json({ newlyUnlocked });
    }
    catch (err) {
        logger.error({ err }, "Failed to check achievements");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to check achievements" } });
    }
});
export default router;
//# sourceMappingURL=dashboard.js.map