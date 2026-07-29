import { Hono } from "hono";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { OsceDB } from "../db/index";
import {
  studentLearningProfiles, osceConfidenceTracking, osceProgressTimeline,
  osceExamReadiness, osceSpacedRepetition, osceClinicalHeatmap,
  osceKnowledgeDetection, oscePracticePlan, osceAttempts, osceProgress,
  osceAnalytics, skillRecommendations, stations, specialties,
} from "../db/index";

const osceAnalyticsRoutes = new Hono<AppEnv>();

function getDb(c: any): OsceDB { return c.get("osceDb"); }
function getUserId(c: any): string { return c.get("user")?.id; }

const SKILL_CATEGORIES = [
  "history_taking", "communication", "clinical_reasoning", "management",
  "emergency_response", "professional_skills"
];

osceAnalyticsRoutes.post("/profile", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json() as any;

  const existing = await db.query.studentLearningProfiles.findFirst({
    where: eq(studentLearningProfiles.userId, userId),
  });

  if (existing) {
    const updated = await db.update(studentLearningProfiles).set({
      clinicalSkills: JSON.stringify(data.clinicalSkills || existing.clinicalSkills),
      communicationSkills: JSON.stringify(data.communicationSkills || existing.communicationSkills),
      historySkills: JSON.stringify(data.historySkills || existing.historySkills),
      clinicalReasoning: data.clinicalReasoning ?? existing.clinicalReasoning,
      management: data.management ?? existing.management,
      emergencyResponse: data.emergencyResponse ?? existing.emergencyResponse,
      professionalSkills: data.professionalSkills ?? existing.professionalSkills,
      weakTopics: JSON.stringify(data.weakTopics || existing.weakTopics),
      strengths: JSON.stringify(data.strengths || existing.strengths),
      lastUpdated: new Date(),
    }).where(eq(studentLearningProfiles.userId, userId)).returning();
    return c.json(updated[0]);
  }

  const profile = await db.insert(studentLearningProfiles).values({
    userId,
    clinicalSkills: JSON.stringify(data.clinicalSkills || {}),
    communicationSkills: JSON.stringify(data.communicationSkills || {}),
    historySkills: JSON.stringify(data.historySkills || {}),
    clinicalReasoning: data.clinicalReasoning || 0,
    management: data.management || 0,
    emergencyResponse: data.emergencyResponse || 0,
    professionalSkills: data.professionalSkills || 0,
    weakTopics: JSON.stringify(data.weakTopics || []),
    strengths: JSON.stringify(data.strengths || []),
  }).returning();

  return c.json(profile[0], 201);
});

osceAnalyticsRoutes.get("/profile", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  let profile = await db.query.studentLearningProfiles.findFirst({
    where: eq(studentLearningProfiles.userId, userId),
  });

  if (!profile) {
    const result = await db.insert(studentLearningProfiles).values({ userId }).returning();
    profile = result[0];
  }

  return c.json(profile);
});

osceAnalyticsRoutes.get("/heatmap", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  let heatmap = await db.query.osceClinicalHeatmap.findFirst({
    where: eq(osceClinicalHeatmap.userId, userId),
  });

  if (!heatmap) {
    const attempts = await db.query.osceAttempts.findMany({
      where: and(
        eq(osceAttempts.userId, userId),
        eq(osceAttempts.isCompleted, true)
      ),
      orderBy: [desc(osceAttempts.createdAt)],
      limit: 50,
    });

    const skillScores: Record<string, number[]> = {};
    SKILL_CATEGORIES.forEach(cat => { skillScores[cat] = []; });

    for (const a of attempts) {
      const scoresByCategory = JSON.parse(a.scoresByCategory || "{}") as Record<string, number>;
      for (const [cat, score] of Object.entries(scoresByCategory)) {
        if (SKILL_CATEGORIES.includes(cat)) {
          skillScores[cat].push(typeof score === 'number' ? score : 0);
        }
      }
    }

    const calcAvg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

    const result = await db.insert(osceClinicalHeatmap).values({
      userId,
      historyTaking: calcAvg(skillScores.history_taking),
      communication: calcAvg(skillScores.communication),
      clinicalReasoning: calcAvg(skillScores.clinical_reasoning),
      management: calcAvg(skillScores.management),
      emergencyResponse: calcAvg(skillScores.emergency_response),
      professionalSkills: calcAvg(skillScores.professional_skills),
    }).returning();
    heatmap = result[0];
  }

  return c.json(heatmap);
});

osceAnalyticsRoutes.get("/progress/timeline", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const months = parseInt(c.req.query("months") || "6");

  const timeline = await db.query.osceProgressTimeline.findMany({
    where: and(
      eq(osceProgressTimeline.userId, userId),
      gte(osceProgressTimeline.date, new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
    ),
    orderBy: [osceProgressTimeline.date],
  });

  const allProgress = await db.query.osceProgress.findMany({
    where: eq(osceProgress.userId, userId),
  });

  const dateMap = new Map<string, { score: number; count: number }>();
  for (const p of allProgress) {
    if (p.lastAttemptAt) {
      const dateStr = new Date(p.lastAttemptAt).toISOString().split("T")[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { score: 0, count: 0 });
      }
      const current = dateMap.get(dateStr)!;
      current.score += p.averageScore || 0;
      current.count += 1;
    }
  }

  const computedTimeline: any[] = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      averageScore: Math.round(data.score / data.count),
      attemptsCount: data.count,
      stationsPracticed: data.count,
    })).sort((a, b) => a.date.localeCompare(b.date));

  const mergedTimeline = [...timeline];
  for (const computed of computedTimeline) {
    const existing = mergedTimeline.find(t => t.date === computed.date);
    if (!existing) {
      mergedTimeline.push({
        id: 0,
        userId,
        date: computed.date,
        averageScore: computed.averageScore,
        attemptsCount: computed.attemptsCount,
        stationsPracticed: computed.stationsPracticed,
        createdAt: new Date(),
      });
    }
  }

  return c.json({ timeline: mergedTimeline.sort((a, b) => a.date.localeCompare(b.date)) });
});

osceAnalyticsRoutes.post("/confidence", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json() as any;

  const tracking = await db.insert(osceConfidenceTracking).values({
    userId,
    attemptId: data.attemptId,
    confidenceRating: data.confidenceRating,
    selfScore: data.selfScore,
    actualScore: data.actualScore,
    calibrationGap: data.selfScore ? data.actualScore - data.selfScore : null,
  }).returning();

  return c.json(tracking[0], 201);
});

osceAnalyticsRoutes.get("/confidence", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  const trackings = await db.query.osceConfidenceTracking.findMany({
    where: eq(osceConfidenceTracking.userId, userId),
    orderBy: [desc(osceConfidenceTracking.createdAt)],
    limit: 50,
  });

  const validTrackings = trackings.filter(t => t.calibrationGap !== null);
  const avgCalibrationGap = validTrackings.reduce((sum, t) => sum + (t.calibrationGap || 0), 0) / (validTrackings.length || 1);

  return c.json({
    trackings,
    stats: {
      totalAttempts: trackings.length,
      averageCalibrationGap: Math.round(avgCalibrationGap * 100) / 100,
      overconfidentCount: validTrackings.filter(t => (t.calibrationGap || 0) < -10).length,
      underconfidentCount: validTrackings.filter(t => (t.calibrationGap || 0) > 10).length,
    },
  });
});

osceAnalyticsRoutes.get("/readiness", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  let readiness = await db.query.osceExamReadiness.findFirst({
    where: eq(osceExamReadiness.userId, userId),
  });

  if (!readiness) {
    const recentAttempts = await db.query.osceAttempts.findMany({
      where: and(
        eq(osceAttempts.userId, userId),
        gte(osceAttempts.startedAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
      ),
      orderBy: [desc(osceAttempts.startedAt)],
      limit: 20,
    });

    const completedAttempts = recentAttempts.filter(a => a.isCompleted && a.score !== null);
    const scores = completedAttempts.map(a => a.score || 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const consistency = scores.length > 1
      ? 100 - (Math.abs(scores[0] - scores[scores.length - 1]) || 0)
      : 50;

    const criticalErrorCount = completedAttempts.filter(a => (a.weaknesses || "").includes("critical") || (a.feedback || "").includes("failed")).length;

    const passProb = avgScore >= 80 ? "High" : avgScore >= 70 ? "Medium" : avgScore >= 60 ? "Low" : "Very Low";

    const result = await db.insert(osceExamReadiness).values({
      userId,
      readinessScore: Math.round(avgScore),
      passProbability: passProb,
      criticalErrors: criticalErrorCount,
      consistencyScore: consistency,
      recentScores: JSON.stringify(scores),
    }).returning();
    readiness = result[0];
  }

  return c.json(readiness);
});

osceAnalyticsRoutes.get("/recommendations", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  const recommendations = await db.query.skillRecommendations.findMany({
    where: and(
      eq(skillRecommendations.userId, userId),
      eq(skillRecommendations.isCompleted, false)
    ),
    orderBy: [sql`CASE ${skillRecommendations.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`],
    with: { station: true },
  });

  return c.json({ recommendations });
});

osceAnalyticsRoutes.post("/recommendations", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json() as any;

  const recommendation = await db.insert(skillRecommendations).values({
    userId,
    stationId: data.stationId,
    reason: data.reason,
    priority: data.priority || "medium",
  }).returning();

  return c.json(recommendation[0], 201);
});

osceAnalyticsRoutes.post("/recommendations/:id/complete", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const id = parseInt(c.req.param("id"));

  await db.update(skillRecommendations).set({
    isCompleted: true,
    completedAt: new Date(),
  }).where(and(
    eq(skillRecommendations.id, id),
    eq(skillRecommendations.userId, userId)
  ));

  return c.json({ success: true });
});

osceAnalyticsRoutes.post("/spaced-repetition", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json() as any;

  const existing = await db.query.osceSpacedRepetition.findFirst({
    where: and(
      eq(osceSpacedRepetition.userId, userId),
      eq(osceSpacedRepetition.stationId, data.stationId)
    ),
  });

  if (existing) {
    await db.update(osceSpacedRepetition).set({
      status: data.status || existing.status,
      quality: data.quality,
      easeFactor: data.easeFactor || existing.easeFactor,
      intervalDays: data.intervalDays || existing.intervalDays,
      repetitions: data.repetitions !== undefined ? data.repetitions : existing.repetitions,
      nextReviewAt: data.nextReviewAt,
      lastReviewedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(osceSpacedRepetition.id, existing.id));
  } else {
    await db.insert(osceSpacedRepetition).values({
      userId,
      stationId: data.stationId,
      status: data.status || "pending",
      nextReviewAt: data.nextReviewAt,
      easeFactor: data.easeFactor || 2.5,
      intervalDays: data.intervalDays || 0,
      repetitions: data.repetitions || 0,
      quality: data.quality,
      lastReviewedAt: new Date(),
    });
  }

  const updated = await db.query.osceSpacedRepetition.findFirst({
    where: and(
      eq(osceSpacedRepetition.userId, userId),
      eq(osceSpacedRepetition.stationId, data.stationId)
    ),
  });

  return c.json(updated);
});

osceAnalyticsRoutes.get("/spaced-repetition", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  const now = new Date();
  const items = await db.query.osceSpacedRepetition.findMany({
    where: and(
      eq(osceSpacedRepetition.userId, userId),
      lte(osceSpacedRepetition.nextReviewAt, now),
      eq(osceSpacedRepetition.status, "pending")
    ),
    with: { station: true },
    orderBy: [osceSpacedRepetition.nextReviewAt],
  });

  return c.json({ items });
});

osceAnalyticsRoutes.post("/detect-weakness", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json() as any;

  const attempts = await db.query.osceAttempts.findMany({
    where: and(
      eq(osceAttempts.userId, userId),
      eq(osceAttempts.stationId, data.stationId)
    ),
    orderBy: [desc(osceAttempts.createdAt)],
    limit: 5,
  });

  const missedPoints: string[] = [];
  attempts.forEach(a => {
    const weaknesses = JSON.parse(a.weaknesses || "[]");
    missedPoints.push(...weaknesses);
  });

  const missedCounts: Record<string, number> = {};
  missedPoints.forEach(m => {
    missedCounts[m] = (missedCounts[m] || 0) + 1;
  });

  const knowledgeDeficit = Object.keys(missedCounts).find(k => k.toLowerCase().includes("medication") || k.toLowerCase().includes("diagnosis") || k.toLowerCase().includes("treatment"));
  const skillDeficit = Object.keys(missedCounts).find(k => k.toLowerCase().includes("communication") || k.toLowerCase().includes("history") || k.toLowerCase().includes("explanation"));

  const detection = await db.insert(osceKnowledgeDetection).values({
    userId,
    stationId: data.stationId,
    knowledgeDeficit: knowledgeDeficit || "none",
    skillDeficit: skillDeficit || "none",
    relatedFlashcards: data.relatedFlashcards || "[]",
    relatedQuestions: data.relatedQuestions || "[]",
  }).returning();

  return c.json(detection[0]);
});

osceAnalyticsRoutes.get("/adaptive-plan", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  const profile = await db.query.studentLearningProfiles.findFirst({
    where: eq(studentLearningProfiles.userId, userId),
  });

  const heatmap = await db.query.osceClinicalHeatmap.findFirst({
    where: eq(osceClinicalHeatmap.userId, userId),
  });

  const weakStations = await db.query.osceProgress.findMany({
    where: eq(osceProgress.userId, userId),
    with: { station: true },
  });

  const sortedWeakStations = weakStations
    .filter(p => p.averageScore !== null)
    .sort((a, b) => (a.averageScore || 100) - (b.averageScore || 100))
    .slice(0, 10);

  const planStations = sortedWeakStations.map(p => p.stationId);

  const stationsData = await db.query.stations.findMany({
    where: and(
      sql`id IN (${planStations.join(",")})`,
      eq(stations.isActive, true)
    ),
  });

  const focusAreasMap: Record<string, number> = {};
  if (heatmap) {
    focusAreasMap.history_taking = heatmap.historyTaking;
    focusAreasMap.communication = heatmap.communication;
    focusAreasMap.clinical_reasoning = heatmap.clinicalReasoning;
    focusAreasMap.management = heatmap.management;
    focusAreasMap.emergency_response = heatmap.emergencyResponse;
    focusAreasMap.professional_skills = heatmap.professionalSkills;
  }

  const focusAreas = Object.entries(focusAreasMap)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([k]) => k.replace("_", " "));

  const plan = await db.insert(oscePracticePlan).values({
    userId,
    dayNumber: 1,
    stations: JSON.stringify(stationsData.map(s => s.id)),
    focusAreas: JSON.stringify(focusAreas),
    difficultyLevel: "medium",
  }).returning();

  return c.json({ plan: plan[0], stationsData });
});

osceAnalyticsRoutes.get("/coach-feedback", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  const recentAttempts = await db.query.osceAttempts.findMany({
    where: and(
      eq(osceAttempts.userId, userId),
      eq(osceAttempts.isCompleted, true)
    ),
    orderBy: [desc(osceAttempts.createdAt)],
    limit: 3,
  });

  if (recentAttempts.length === 0) {
    return c.json({ message: "No recent attempts found. Complete an OSCE station to get personalized feedback." });
  }

  const latest = recentAttempts[0];
  const scoresByCategory = JSON.parse(latest.scoresByCategory || "{}") as Record<string, number>;

  const weaknesses = JSON.parse(latest.weaknesses || "[]") as string[];
  const strengths = JSON.parse(latest.strengths || "[]") as string[];

  const entries = Object.entries(scoresByCategory) as [string, number][];
  const lowestCategory = entries.reduce((min, curr) => curr[1] < min[1] ? curr : min, ["", 100]);

  let message = `Your history structure improved significantly. However, you often miss psychosocial questions. `;

  if (weaknesses.length > 0) {
    message += `Try the ${weaknesses[0]} station next.`;
  } else {
    message += "Try the depression assessment station next.";
  }

  return c.json({
    message,
    latestScore: latest.score,
    strengths,
    weaknesses,
    recommendations: weaknesses.length > 0
      ? [`Practice ${weaknesses[0]} stations`, "Review communication techniques"]
      : ["Continue practicing history stations", "Focus on psychosocial questions"],
  });
});

osceAnalyticsRoutes.get("/faculty/analytics", async (c) => {
  const db = getDb(c);

  const allAttempts = await db.query.osceAttempts.findMany({
    where: and(eq(osceAttempts.isCompleted, true)),
    with: { station: { with: { specialty: true } } },
  });

  const classPerformance: Record<string, { total: number; sum: number; average: number }> = {};
  for (const attempt of allAttempts) {
    const spec = (attempt.station as any)?.specialty?.name || "Unknown";
    if (!classPerformance[spec]) {
      classPerformance[spec] = { total: 0, sum: 0, average: 0 };
    }
    classPerformance[spec].total++;
    classPerformance[spec].sum += attempt.score || 0;
    classPerformance[spec].average = classPerformance[spec].sum / classPerformance[spec].total;
  }

  const commonWeaknesses: Record<string, number> = {};
  for (const attempt of allAttempts) {
    const weaknesses = JSON.parse(attempt.weaknesses || "[]");
    weaknesses.forEach((w: string) => {
      commonWeaknesses[w] = (commonWeaknesses[w] || 0) + 1;
    });
  }

  const sortedWeaknesses = Object.entries(commonWeaknesses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  return c.json({
    classPerformance,
    commonWeaknesses: sortedWeaknesses,
    totalAttempts: allAttempts.length,
    averageScore: allAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / allAttempts.length,
  });
});

export { osceAnalyticsRoutes };