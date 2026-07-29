import { Hono } from "hono";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { z } from "zod";
import type { AppEnv } from "../types";
import type { OsceDB } from "../db/index";
import {
  specialties, stations, stationTypes, osceExams, osceAttempts, scoringCriteria,
  attemptResponses, osceProgress, osceSettings, competencyProfile, skillRecommendations,
  osceAnalytics, studentLearningProfiles, osceClinicalHeatmap, osceKnowledgeDetection,
  osceSpacedRepetition, oscePracticePlan,
} from "../db/index";

const osceRoutes = new Hono<AppEnv>();

function getDb(c: any): OsceDB { return c.get("osceDb"); }
function getUserId(c: any): string { return c.get("user")?.id; }

function mapDifficulty(difficulty: string, level: number): string {
  if (level <= 2) return "Beginner";
  if (level <= 3) return "Intermediate";
  if (level <= 4) return "Advanced";
  return "Residency level";
}

function parseSkills(learningObjectives: string | undefined): string[] {
  if (!learningObjectives) return ["History Taking", "Communication", "Clinical Reasoning"];
  try {
    const parsed = JSON.parse(learningObjectives);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore parse errors
  }
  return ["History Taking", "Communication", "Clinical Reasoning"];
}

function mapFrontendDifficulty(difficulty: string): string {
  const map: Record<string, string> = {
    "Beginner": "easy",
    "Intermediate": "medium",
    "Advanced": "hard",
    "Residency level": "hard",
  };
  return map[difficulty] || "medium";
}

const specialtySchema = z.object({
  name: z.string().min(1, "Specialty name is required"),
});

osceRoutes.get("/specialties", async (c) => {
  const db = getDb(c);
  const specialtiesData = await db.select().from(specialties);
  return c.json(specialtiesData);
});

osceRoutes.post("/specialties", async (c) => {
  const db = getDb(c);
  const data = await c.req.json();
  const parsed = specialtySchema.parse(data);
  const specialty = await db.insert(specialties).values(parsed).returning();
  return c.json(specialty[0], 201);
});

osceRoutes.get("/station-types", async (c) => {
  const db = getDb(c);
  const types = await db.select().from(stationTypes);
  return c.json(types);
});

const stationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  specialtyId: z.number().int().positive(),
  stationTypeId: z.number().int().positive(),
  subspecialty: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  difficultyLevel: z.number().int().min(1).max(5).default(3),
  duration: z.number().int().positive().default(10),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  candidateInstructions: z.string().min(1, "Candidate instructions are required"),
  patientInstructions: z.string().min(1, "Patient instructions are required"),
  hiddenDiagnosis: z.string().optional(),
  expectedQuestions: z.string().optional(),
  expectedFindings: z.string().optional(),
  markingScheme: z.string().optional(),
  learningObjectives: z.string().optional(),
  references: z.string().optional(),
  clinicalPathway: z.string().optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

osceRoutes.get("/stations", async (c) => {
  const db = getDb(c);
  const { difficulty, stationType, isActive, status, specialty } = c.req.query();
  
  const whereConditions: any[] = [];
  
  if (difficulty) {
    const mappedDifficulty = mapFrontendDifficulty(difficulty as string);
    whereConditions.push(sql`difficulty = ${mappedDifficulty}`);
  }
  
  if (stationType) {
    const typeRecord = await db.query.stationTypes.findFirst({
      where: (t, ops) => eq(t.name, stationType as string),
    });
    if (typeRecord) {
      whereConditions.push(sql`station_type_id = ${typeRecord.id}`);
    }
  }
  
  if (isActive !== undefined) {
    whereConditions.push(sql`is_active = ${isActive === "true"}`);
  }
  
  if (status) {
    whereConditions.push(sql`status = ${status}`);
  }
  
  if (specialty) {
    const specialtyRecord = await db.query.specialties.findFirst({
      where: (s, ops) => eq(s.name, specialty as string),
    });
    if (specialtyRecord) {
      whereConditions.push(sql`specialty_id = ${specialtyRecord.id}`);
    }
  }
  
  const whereClause = whereConditions.length === 0 ? sql`true` : and(...whereConditions);
  
  const stationsData = await db.query.stations.findMany({
    where: whereClause,
    with: { specialty: true, stationType: true },
  });
  
  const mappedStations = stationsData.map(s => ({
    id: s.id,
    title: s.title,
    specialty: s.specialty?.name || "Unknown",
    subspecialty: s.subspecialty || undefined,
    type: s.stationType?.name || "History",
    difficulty: mapDifficulty(s.difficulty, s.difficultyLevel),
    difficultyLevel: s.difficultyLevel,
    durationMinutes: s.duration,
    skills: parseSkills(s.learningObjectives),
    description: s.candidateInstructions,
    status: s.status,
    isPublic: s.isPublic,
  }));
  
  return c.json(mappedStations);
});

osceRoutes.get("/stations/:id", async (c) => {
  const db = getDb(c);
  const id = parseInt(c.req.param("id"));
  const station = await db.query.stations.findFirst({
    where: (s, ops) => eq(s.id, id),
    with: { specialty: true, stationType: true },
  });
  
  if (!station) return c.json({ error: { code: "NOT_FOUND", message: "Station not found" } }, 404);
  
  return c.json({
    id: station.id,
    title: station.title,
    specialty: station.specialty?.name || "Unknown",
    subspecialty: station.subspecialty,
    type: station.stationType?.name || "History",
    difficulty: mapDifficulty(station.difficulty, station.difficultyLevel),
    difficultyLevel: station.difficultyLevel,
    durationMinutes: station.duration,
    skills: parseSkills(station.learningObjectives),
    description: station.candidateInstructions,
    status: station.status,
    isPublic: station.isPublic,
  });
});

osceRoutes.post("/stations", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json();
  const parsed = stationSchema.parse(data);
  
  const station = await db.insert(stations).values({
    ...parsed,
    createdByUserId: userId,
    subspecialty: parsed.subspecialty || "",
    expectedQuestions: parsed.expectedQuestions || "[]",
    expectedFindings: parsed.expectedFindings || "[]",
    markingScheme: parsed.markingScheme || "{}",
    learningObjectives: parsed.learningObjectives || "[]",
    references: parsed.references || "[]",
    clinicalPathway: parsed.clinicalPathway || "[]",
    isActive: parsed.isActive !== undefined ? parsed.isActive : true,
    isPublic: parsed.isPublic !== undefined ? parsed.isPublic : false,
  }).returning();
  return c.json(station[0], 201);
});

const examSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  stationIds: z.array(z.number().int().positive()).min(1, "At least one station is required"),
  totalTimeMinutes: z.number().int().positive().default(120),
  isMock: z.boolean().optional(),
});

osceRoutes.get("/exams", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const exams = await db.query.osceExams.findMany({
    where: (e, ops) => eq(e.userId, userId),
    orderBy: (e, ops) => desc(e.createdAt),
  });
  return c.json(exams);
});

osceRoutes.get("/exams/:id", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const id = parseInt(c.req.param("id"));
  
  const exam = await db.query.osceExams.findFirst({
    where: (e, ops) => and(eq(e.id, id), eq(e.userId, userId)),
    with: {
      stations: {
        with: {
          patientProfile: true,
          specialty: true,
          stationType: true,
        },
      },
    },
  });
  
  if (!exam) return c.json({ error: { code: "NOT_FOUND", message: "Exam not found" } }, 404);
  return c.json(exam);
});

osceRoutes.post("/exams", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json();
  const parsed = examSchema.parse(data);
  
  const exam = await db.insert(osceExams).values({
    userId,
    title: parsed.title,
    description: parsed.description,
    stationIds: JSON.stringify(parsed.stationIds),
    totalTimeMinutes: parsed.totalTimeMinutes,
    isMock: parsed.isMock || false,
  }).returning();
  return c.json(exam[0], 201);
});

const attemptStartSchema = z.object({
  examId: z.number().int().positive(),
  stationId: z.number().int().positive(),
});

osceRoutes.post("/attempts/start", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json();
  const parsed = attemptStartSchema.parse(data);
  
  const exam = await db.query.osceExams.findFirst({
    where: (e, ops) => and(eq(e.id, parsed.examId), eq(e.userId, userId)),
  });
  
  if (!exam) return c.json({ error: { code: "NOT_FOUND", message: "Exam not found" } }, 404);
  
  const station = await db.query.stations.findFirst({
    where: (s, ops) => eq(s.id, parsed.stationId),
  });
  
  if (!station) return c.json({ error: { code: "NOT_FOUND", message: "Station not found" } }, 404);
  
  const stationPatient = await db.query.stationPatients.findFirst({
    where: (sp, ops) => eq(sp.stationId, parsed.stationId),
    with: { patientProfile: true },
  });
  
  const attempt = await db.insert(osceAttempts).values({
    userId,
    examId: parsed.examId,
    stationId: parsed.stationId,
    patientProfileId: stationPatient?.patientProfileId || 1,
    startedAt: new Date(),
  }).returning();
  
  return c.json(attempt[0], 201);
});

const attemptCompleteSchema = z.object({
  attemptId: z.number().int().positive(),
  durationSeconds: z.number().int().positive(),
  conversationLog: z.string(),
  scoresByCategory: z.string(),
  feedback: z.string(),
  strengths: z.string(),
  weaknesses: z.string(),
  improvementPlan: z.string(),
  examinerNotes: z.string().optional(),
});

osceRoutes.post("/attempts/complete", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json();
  const parsed = attemptCompleteSchema.parse(data);
  
  const attempt = await db.query.osceAttempts.findFirst({
    where: (a, ops) => and(eq(a.id, parsed.attemptId), eq(a.userId, userId)),
  });
  
  if (!attempt) return c.json({ error: { code: "NOT_FOUND", message: "Attempt not found" } }, 404);
  
  const scoresByCategory = JSON.parse(parsed.scoresByCategory || "{}");
  const scoreValues = Object.values(scoresByCategory) as number[];
  const overallScore = scoreValues.length > 0
    ? scoreValues.reduce((sum: number, v: number) => sum + v, 0) / scoreValues.length
    : 0;
  
  const updatedAttempt = await db.update(osceAttempts)
    .set({
      completedAt: new Date(),
      durationSeconds: parsed.durationSeconds,
      conversationLog: parsed.conversationLog,
      scoresByCategory: parsed.scoresByCategory,
      score: overallScore,
      feedback: parsed.feedback,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      improvementPlan: parsed.improvementPlan,
      examinerNotes: parsed.examinerNotes || "{}",
      isCompleted: true,
    })
    .where(eq(osceAttempts.id, parsed.attemptId))
    .returning();
  
  await db.insert(attemptResponses).values(
    (JSON.parse(parsed.feedback || "{}") as any[]).map((f: any, idx: number) => ({
      attemptId: parsed.attemptId,
      criterionId: f.criterionId || null,
      questionAsked: f.questionAsked || null,
      patientResponse: f.patientResponse || null,
      pointsAwarded: f.pointsAwarded || 0,
      feedback: f.feedback || "Good response",
      isMissed: f.isMissed || false,
    }))
  );
  
  const existingProgress = await db.query.osceProgress.findFirst({
    where: (p, ops) => and(eq(p.userId, userId), eq(p.stationId, attempt.stationId)),
  });
  
  const currentAttemptsCount = existingProgress?.attemptsCount || 0;
  
  await db.insert(osceProgress)
    .values({
      userId,
      stationId: attempt.stationId,
      attemptsCount: currentAttemptsCount + 1,
      bestScore: overallScore,
      averageScore: overallScore,
      lastAttemptAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [osceProgress.userId, osceProgress.stationId],
      set: {
        attemptsCount: sql`${osceProgress.attemptsCount} + 1`,
        bestScore: sql`CASE WHEN ${overallScore} > COALESCE(${osceProgress.bestScore}, 0) THEN ${overallScore} ELSE COALESCE(${osceProgress.bestScore}, 0) END`,
        averageScore: sql`(${osceProgress.averageScore} * ${osceProgress.attemptsCount} + ${overallScore}) / (${osceProgress.attemptsCount} + 1)`,
        lastAttemptAt: new Date(),
      },
    });
  
  return c.json(updatedAttempt[0]);
});

osceRoutes.get("/attempts/:id", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const id = parseInt(c.req.param("id"));
  
  const attempt = await db.query.osceAttempts.findFirst({
    where: (a, ops) => and(eq(a.id, id), eq(a.userId, userId)),
    with: {
      station: { with: { specialty: true, stationType: true } },
      patientProfile: true,
    },
  });
  
  if (!attempt) return c.json({ error: { code: "NOT_FOUND", message: "Attempt not found" } }, 404);
  return c.json(attempt);
});

osceRoutes.get("/progress", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const progressRecords = await db.query.osceProgress.findMany({
    where: (p, ops) => eq(p.userId, userId),
    with: { station: true },
  });
  
  const recentAttempts = await db.query.osceAttempts.findMany({
    where: and(
      eq(osceAttempts.userId, userId),
      eq(osceAttempts.isCompleted, true)
    ),
    orderBy: [desc(osceAttempts.createdAt)],
    limit: 10,
  });
  
  const totalStationsCompleted = progressRecords.reduce((sum, p) => sum + (p.attemptsCount || 0), 0);
  const totalScore = recentAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
  const averageScore = recentAttempts.length > 0 ? Math.round(totalScore / recentAttempts.length) : 0;
  
  const allWeaknesses: string[] = [];
  for (const attempt of recentAttempts) {
    const weaknesses = JSON.parse(attempt.weaknesses || "[]") as string[];
    allWeaknesses.push(...weaknesses);
  }
  
  const weaknessCounts: Record<string, number> = {};
  for (const w of allWeaknesses) {
    weaknessCounts[w] = (weaknessCounts[w] || 0) + 1;
  }
  
  const weakAreas = Object.entries(weaknessCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
  
  const skillMastery: Record<string, number> = {};
  for (const attempt of recentAttempts) {
    const scoresByCategory = JSON.parse(attempt.scoresByCategory || "{}") as Record<string, number>;
    for (const [category, score] of Object.entries(scoresByCategory)) {
      const skillName = category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      if (!skillMastery[skillName]) {
        skillMastery[skillName] = 0;
      }
      skillMastery[skillName] = Math.round((skillMastery[skillName] + score) / 2);
    }
  }
  
  return c.json({
    totalStationsCompleted,
    averageScore,
    weakAreas,
    recentAttempts,
    skillMastery,
  });
});

osceRoutes.get("/settings", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  let settings = await db.query.osceSettings.findFirst({
    where: (s, ops) => eq(s.userId, userId),
  });
  
  if (!settings) {
    const result = await db.insert(osceSettings).values({ userId }).returning();
    settings = result[0];
  }
  
  return c.json(settings);
});

const settingsUpdateSchema = z.object({
  voiceEnabled: z.boolean().optional(),
  autoSubmitEnabled: z.boolean().optional(),
  showHints: z.boolean().optional(),
  difficultyFilter: z.enum(["all", "easy", "medium", "hard"]).optional(),
  preferredStationTypes: z.array(z.string()).optional(),
});

osceRoutes.put("/settings", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json();
  const parsed = settingsUpdateSchema.parse(data);
  
  let settings = await db.query.osceSettings.findFirst({
    where: (s, ops) => eq(s.userId, userId),
  });
  
  if (!settings) {
    const result = await db.insert(osceSettings).values({
      userId,
      voiceEnabled: parsed.voiceEnabled ?? true,
      autoSubmitEnabled: parsed.autoSubmitEnabled ?? false,
      showHints: parsed.showHints ?? true,
      difficultyFilter: parsed.difficultyFilter ?? "all",
      preferredStationTypes: parsed.preferredStationTypes ? JSON.stringify(parsed.preferredStationTypes) : "[]",
    }).returning();
    settings = result[0];
  } else {
    const result = await db.update(osceSettings).set({
      voiceEnabled: parsed.voiceEnabled,
      autoSubmitEnabled: parsed.autoSubmitEnabled,
      showHints: parsed.showHints,
      difficultyFilter: parsed.difficultyFilter,
      preferredStationTypes: parsed.preferredStationTypes ? JSON.stringify(parsed.preferredStationTypes) : "[]",
    }).where(eq(osceSettings.userId, userId)).returning();
    settings = result[0];
  }
  
  return c.json(settings);
});

osceRoutes.post("/patient-response", async (c) => {
  const data = await c.req.json();
  const { attemptId, question } = data;
  
  if (!attemptId || !question) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "attemptId and question are required" } }, 400);
  }
  
  const db = getDb(c);
  const userId = getUserId(c);
  const attempt = await db.query.osceAttempts.findFirst({
    where: (a, ops) => and(eq(a.id, attemptId), eq(a.userId, userId)),
    with: { patientProfile: true },
  });
  
  if (!attempt) return c.json({ error: { code: "NOT_FOUND", message: "Attempt not found" } }, 404);
  
  const responses = [
    "I've been experiencing chest discomfort for about 3 days. It started in the center of my chest and feels like pressure.",
    "Yes, it does radiate to my left arm, especially when I'm feeling anxious.",
    "I haven't had any recent trauma. The Pain comes and goes, sometimes lasting 10-15 minutes.",
    "I'm a 55-year-old construction worker. I smoke about a pack a day for 30 years.",
    "I take metoprolol for high blood pressure. No known allergies.",
    "No family history of heart disease, but my father had a stroke at 60.",
    "I haven't been feeling well lately - I'm anxious about the pain and haven't slept well.",
    "The Pain is worse when I climb stairs or exert myself. It improves with rest.",
    "I've been taking ibuprofen for the Pain, which helps a bit.",
    "Should I go to the ER? Is this serious?",
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return c.json({
    response: randomResponse,
    suggestions: ["Ask about risk factors", "Check vital signs", "Consider ECG"],
  });
});

osceRoutes.get("/next-station", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  const completedAttempts = await db.query.osceProgress.findMany({
    where: eq(osceProgress.userId, userId),
    with: { station: true },
  });

  if (completedAttempts.length === 0) {
    const stationsData = await db.query.stations.findMany({
      where: eq(stations.isActive, true),
      with: { specialty: true, stationType: true },
      limit: 5,
    });
    return c.json({ station: stationsData[0], reason: "Start with an introductory station" });
  }

  const sortedAttempts = completedAttempts
    .filter(p => p.averageScore !== null)
    .sort((a, b) => (a.averageScore || 100) - (b.averageScore || 100));

  const weakestStationId = sortedAttempts[0]?.stationId;

  const station = await db.query.stations.findFirst({
    where: eq(stations.id, weakestStationId),
    with: { specialty: true, stationType: true },
  });

  return c.json({
    station,
    reason: `Practice this station to improve your score (current: ${Math.round(sortedAttempts[0].averageScore || 0)}%)`,
  });
});

osceRoutes.post("/update-profile", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json();

  let profile = await db.query.studentLearningProfiles.findFirst({
    where: eq(studentLearningProfiles.userId, userId),
  });

  if (!profile) {
    const result = await db.insert(studentLearningProfiles).values({
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
    profile = result[0];
  } else {
    const updates: any = {};
    if (data.clinicalSkills) updates.clinicalSkills = JSON.stringify(data.clinicalSkills);
    if (data.communicationSkills) updates.communicationSkills = JSON.stringify(data.communicationSkills);
    if (data.historySkills) updates.historySkills = JSON.stringify(data.historySkills);
    if (data.clinicalReasoning !== undefined) updates.clinicalReasoning = data.clinicalReasoning;
    if (data.management !== undefined) updates.management = data.management;
    if (data.emergencyResponse !== undefined) updates.emergencyResponse = data.emergencyResponse;
    if (data.professionalSkills !== undefined) updates.professionalSkills = data.professionalSkills;
    if (data.weakTopics) updates.weakTopics = JSON.stringify(data.weakTopics);
    if (data.strengths) updates.strengths = JSON.stringify(data.strengths);

    const result = await db.update(studentLearningProfiles).set({
      ...updates,
      lastUpdated: new Date(),
    }).where(eq(studentLearningProfiles.userId, userId)).returning();
    profile = result[0];
  }

  return c.json(profile);
});

osceRoutes.get("/coach", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);

  const recentAttempts = await db.query.osceAttempts.findMany({
    where: and(
      eq(osceAttempts.userId, userId),
      eq(osceAttempts.isCompleted, true)
    ),
    with: { station: { with: { specialty: true, stationType: true } } },
    orderBy: [desc(osceAttempts.createdAt)],
    limit: 5,
  });

  if (recentAttempts.length === 0) {
    return c.json({ message: "Complete a few OSCE stations to get personalized coaching feedback." });
  }

  const latest = recentAttempts[0];
  const scoresByCategory = JSON.parse(latest.scoresByCategory || "{}") as Record<string, number>;
  const weaknesses = JSON.parse(latest.weaknesses || "[]") as string[];
  const strengths = JSON.parse(latest.strengths || "[]") as string[];

  const entries = Object.entries(scoresByCategory) as [string, number][];
  const lowestCategory = entries.reduce((min, curr) => curr[1] < min[1] ? curr : min, ["", 100])[0];

  const improvementPlan = JSON.parse(latest.improvementPlan || "[]") as string[];

  let coachMessage = `Your ${(latest.station as any)?.title || "station"} performance was ${Math.round(latest.score || 0)}%. `;

  if (strengths.length > 0) {
    coachMessage += `Key Strengths: ${strengths.slice(0, 2).join(", ")}. `;
  }

  if (weaknesses.length > 0) {
    coachMessage += `Areas for Improvement: ${weaknesses.slice(0, 2).join(", ")}. `;
  }

  if (improvementPlan.length > 0) {
    coachMessage += `Recommended Practice: ${improvementPlan.slice(0, 2).join(", ")}.`;
  } else {
    coachMessage += `Try practicing stations focusing on ${lowestCategory.replace("_", " ")} to improve.`;
  }

  return c.json({
    message: coachMessage,
    latestScore: latest.score,
    strengths,
    weaknesses,
    improvementPlan,
    nextRecommendation: weaknesses.length > 0 ? weaknesses[0] : "general practice",
  });
});

osceRoutes.get("/recommendations", async (c) => {
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

osceRoutes.post("/exam-simulation", async (c) => {
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
    .sort((a, b) => (a.averageScore || 100) - (b.averageScore || 100));

  const weakStationIds = sortedWeakStations.slice(0, 2).map(p => p.stationId);

  const allStations = await db.query.stations.findMany({
    where: and(
      eq(stations.isActive, true),
      lte(stations.difficultyLevel, 3)
    ),
    with: { stationType: true },
    orderBy: [desc(stations.createdAt)],
  });

  const randomStations = allStations
    .filter(s => !weakStationIds.includes(s.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const emergencyStations = await db.query.stations.findMany({
    where: and(
      eq(stations.isActive, true),
      eq(stations.stationTypeId, 1)
    ),
    with: { stationType: true },
    limit: 1,
  });

  const recommendedStations = [
    ...weakStationIds.map(id => sortedWeakStations.find(p => p.stationId === id)?.station).filter(Boolean),
    ...randomStations,
    ...emergencyStations,
  ].filter(Boolean).slice(0, 5);

  return c.json({
    stations: recommendedStations,
    rationale: `Your mock exam should include: 2 weak stations, 3 random stations, and 1 emergency station to target your areas for improvement.`,
  });
});

osceRoutes.get("/faculty/analytics", async (c) => {
  const db = getDb(c);

  const allAttempts = await db.query.osceAttempts.findMany({
    where: and(eq(osceAttempts.isCompleted, true)),
    with: { station: { with: { specialty: true, stationType: true } } },
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
    const weaknesses = JSON.parse(attempt.weaknesses || "[]") as string[];
    weaknesses.forEach((w: string) => {
      commonWeaknesses[w] = (commonWeaknesses[w] || 0) + 1;
    });
  }

  const sortedWeaknesses = Object.entries(commonWeaknesses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));

  const stationTypePerformance: Record<string, number[]> = {};
  for (const attempt of allAttempts) {
    const typeName = (attempt.station as any)?.stationType?.name || "Unknown";
    if (!stationTypePerformance[typeName]) {
      stationTypePerformance[typeName] = [];
    }
    stationTypePerformance[typeName].push(attempt.score || 0);
  }

  const typeAverages: Record<string, number> = {};
  for (const [type, scores] of Object.entries(stationTypePerformance)) {
    typeAverages[type] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  return c.json({
    classPerformance,
    commonWeaknesses: sortedWeaknesses,
    stationTypePerformance: typeAverages,
    totalAttempts: allAttempts.length,
    overallAverage: allAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / allAttempts.length,
  });
});

osceRoutes.get("/generate-flashcards", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json() as any;

  const attemptId = data.attemptId;

  const attempt = await db.query.osceAttempts.findFirst({
    where: eq(osceAttempts.id, attemptId),
    with: { station: true },
  });

  if (!attempt) {
    return c.json({ error: { code: "NOT_FOUND", message: "Attempt not found" } }, 404);
  }

  const weaknesses = JSON.parse(attempt.weaknesses || "[]") as string[];
  const stationTitle = (attempt.station as any)?.title || "";

  const flashcardTopics = weaknesses.map((w: string) => {
    const topics = w.toLowerCase().split(/[\s,]+/).filter((t: string) => t.length > 2);
    return topics;
  }).flat();

  const uniqueTopics = [...new Set(flashcardTopics)].slice(0, 5);

  return c.json({
    topics: uniqueTopics,
    station: stationTitle,
    message: `Generated flashcard topics based on your weaknesses in ${stationTitle}.`,
  });
});

osceRoutes.get("/generate-mcquestions", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const data = await c.req.json() as any;

  const attemptId = data.attemptId;

  const attempt = await db.query.osceAttempts.findFirst({
    where: eq(osceAttempts.id, attemptId),
    with: { station: true },
  });

  if (!attempt) {
    return c.json({ error: { code: "NOT_FOUND", message: "Attempt not found" } }, 404);
  }

  const weaknesses = JSON.parse(attempt.weaknesses || "[]") as string[];
  const stationTitle = (attempt.station as any)?.title || "";

  const questionTopics = weaknesses.map((w: string) => {
    if (w.toLowerCase().includes("chest pain")) {
      return ["acute coronary syndrome", "pulmonary embolism", "aortic dissection", "esophageal spasm"];
    }
    if (w.toLowerCase().includes("medication") || w.toLowerCase().includes("drug")) {
      return ["ACE inhibitor adverse effects", "beta blocker contraindications", "diuretic side effects"];
    }
    if (w.toLowerCase().includes("diagnosis") || w.toLowerCase().includes("differential")) {
      return ["red flag identification", "risk stratification", "diagnostic criteria"];
    }
    return [w];
  }).flat();

  const uniqueTopics = [...new Set(questionTopics)].slice(0, 5);

  return c.json({
    topics: uniqueTopics,
    station: stationTitle,
    message: `Generated question topics based on your weaknesses in ${stationTitle}.`,
  });
});

osceRoutes.post("/exam/start", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const { stationId } = await c.req.json() as { stationId: number };

  const station = await db.query.stations.findFirst({
    where: eq(stations.id, stationId),
    with: { specialty: true, stationType: true },
  });

  if (!station) {
    return c.json({ error: { code: "NOT_FOUND", message: "Station not found" } }, 404);
  }

  const attempt = await db.insert(osceAttempts).values({
    userId,
    examId: 0,
    stationId,
    startedAt: new Date(),
  }).returning();

  return c.json({
    sessionId: `session_${attempt[0].id}`,
    attemptId: attempt[0].id,
    station,
  });
});

osceRoutes.post("/exam/input", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const { sessionId, text, audioUrl } = await c.req.json() as { sessionId: string; text: string; audioUrl?: string };

  const attemptId = parseInt(sessionId.replace("session_", ""), 10);
  const attempt = await db.query.osceAttempts.findFirst({
    where: eq(osceAttempts.id, attemptId),
  });

  if (!attempt) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  const responses = [
    "I've been experiencing chest discomfort for about 3 days. It started in the center of my chest and feels like pressure.",
    "Yes, it does radiate to my left arm, especially when I'm feeling anxious.",
    "I haven't had any recent trauma. The pain comes and goes, sometimes lasting 10-15 minutes.",
    "I'm a 55-year-old construction worker. I smoke about a pack a day for 30 years.",
    "I take metoprolol for high blood pressure. No known allergies.",
    "No family history of heart disease, but my father had a stroke at 60.",
    "I haven't been feeling well lately - I'm anxious about the pain and haven't slept well.",
    "The pain is worse when I climb stairs or exert myself. It improves with rest.",
    "I've been taking ibuprofen for the pain, which helps a bit.",
    "Should I go to the ER? Is this serious?",
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  return c.json({
    response: randomResponse,
    audioUrl: null,
    emotion: "neutral",
    trustLevel: 50,
  });
});

osceRoutes.post("/exam/end", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const { sessionId } = await c.req.json() as { sessionId: string };

  const attemptId = parseInt(sessionId.replace("session_", ""), 10);
  const attempt = await db.query.osceAttempts.findFirst({
    where: eq(osceAttempts.id, attemptId),
    with: { station: true },
  });

  if (!attempt) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  const mockFeedback = {
    overallScore: 85,
    status: "Pass" as const,
    competencies: [
      { id: "1", name: "Communication", score: 18, maxScore: 20, feedback: "Good introduction and empathy", missed: false },
      { id: "2", name: "History Taking", score: 14, maxScore: 15, feedback: "Good history obtained", missed: false },
      { id: "3", name: "Clinical Reasoning", score: 16, maxScore: 20, feedback: "Good differential diagnosis", missed: false },
      { id: "4", name: "Management", score: 12, maxScore: 15, feedback: "Appropriate initial management", missed: false },
      { id: "5", name: "Professionalism", score: 13, maxScore: 15, feedback: "Good time management", missed: false },
    ],
    missedPoints: ["Consider ordering ECG immediately", "Discuss pain medication options"],
    modelAnswer: [
      "Introduce yourself and confirm patient identity",
      "Take focused history using SOCRATES framework",
      "Identify red flags and risk factors",
      "Generate differential diagnosis",
      "Order appropriate investigations (ECG, troponin)",
      "Provide immediate management (aspirin, oxygen if needed)",
    ],
    recommendations: [
      { stationId: "1", stationTitle: "Chest Pain History", reason: "Practice history taking", priority: "high" as const },
      { stationId: "2", stationTitle: "Anaphylaxis Management", reason: "Emergency scenarios", priority: "medium" as const },
    ],
  };

  return c.json(mockFeedback);
});

osceRoutes.get("/exam/:sessionId/feedback", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const sessionId = c.req.param("sessionId");

  const attemptId = parseInt(sessionId.replace("session_", ""), 10);
  const attempt = await db.query.osceAttempts.findFirst({
    where: eq(osceAttempts.id, attemptId),
  });

  if (!attempt) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  const scoresByCategory = JSON.parse(attempt.scoresByCategory || "{}") as Record<string, number>;
  const weaknesses = JSON.parse(attempt.weaknesses || "[]") as string[];
  const strengths = JSON.parse(attempt.strengths || "[]") as string[];

  const mockFeedback = {
    overallScore: attempt.score || 85,
    status: (attempt.score || 85) >= 70 ? "Pass" : "Fail" as const,
    competencies: Object.entries(scoresByCategory).map(([name, score], idx) => ({
      id: String(idx),
      name: name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      score,
      maxScore: 20,
      feedback: `Good performance in ${name}`,
      missed: score < 10,
    })),
    missedPoints: weaknesses,
    modelAnswer: ["Complete history and examination performed", "Appropriate investigations ordered"],
    recommendations: [],
  };

  return c.json(mockFeedback);
});

osceRoutes.post("/exam/:sessionId/evaluate", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const sessionId = c.req.param("sessionId");

  const attemptId = parseInt(sessionId.replace("session_", ""), 10);
  const attempt = await db.query.osceAttempts.findFirst({
    where: eq(osceAttempts.id, attemptId),
    with: { station: true },
  });

  if (!attempt) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  const scores: Record<string, number> = {
    communication: 18,
    history: 14,
    examination: 15,
    clinicalReasoning: 16,
    management: 12,
    professionalism: 13,
    total: 88,
  };

  const strengths = ["Good history taking", "Empathetic communication", "Appropriate investigations"];
  const weaknesses = ["Consider ordering ECG immediately", "Discuss pain medication options"];

  await db.update(osceAttempts).set({
    score: 88,
    scoresByCategory: JSON.stringify(scores),
    strengths: JSON.stringify(strengths),
    weaknesses: JSON.stringify(weaknesses),
    isCompleted: true,
    completedAt: new Date(),
  }).where(eq(osceAttempts.id, attemptId));

  return c.json({
    scores,
    strengths,
    weaknesses,
    feedback: "Good performance overall. Focus on ordering immediate investigations.",
  });
});

osceRoutes.post("/conversation/start", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const { attemptId, stationId } = await c.req.json() as { attemptId: number; stationId: number };

  const attempt = await db.query.osceAttempts.findFirst({
    where: eq(osceAttempts.id, attemptId),
  });

  if (!attempt || attempt.userId !== userId) {
    return c.json({ error: { code: "NOT_FOUND", message: "Attempt not found" } }, 404);
  }

  return c.json({
    sessionId: `session_${attemptId}`,
    attemptId,
  });
});

osceRoutes.post("/conversation/message", async (c) => {
  const { sessionId, message } = await c.req.json() as { sessionId: string; message: string };

  const responses = [
    "I've been experiencing chest discomfort for about 3 days. It started in the center of my chest.",
    "Yes, it does radiate to my left arm when I'm anxious.",
    "The pain comes and goes, sometimes lasting 10-15 minutes.",
    "I'm a 55-year-old construction worker. I smoke about a pack a day.",
    "I take metoprolol for high blood pressure. No known allergies.",
    "No family history of heart disease, but my father had a stroke at 60.",
    "I haven't been feeling well lately - I'm anxious about the pain.",
    "The pain is worse when I climb stairs or exert myself.",
    "I've been taking ibuprofen for the pain, which helps a bit.",
    "Should I go to the ER? Is this serious?",
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  return c.json({
    response: randomResponse,
    emotion: "neutral",
    trustLevel: 50,
  });
});

osceRoutes.get("/conversation/evaluate/:sessionId", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const sessionId = c.req.param("sessionId");

  const attemptId = parseInt(sessionId.replace("session_", ""), 10);
  const attempt = await db.query.osceAttempts.findFirst({
    where: eq(osceAttempts.id, attemptId),
  });

  if (!attempt) {
    return c.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, 404);
  }

  const scores = {
    communication: 18,
    history: 14,
    examination: 15,
    clinicalReasoning: 16,
    management: 12,
    professionalism: 13,
    total: 88,
  };

  const strengths = ["Good history taking", "Empathetic communication"];
  const weaknesses = ["Consider ordering ECG immediately"];

  await db.update(osceAttempts).set({
    score: 88,
    scoresByCategory: JSON.stringify(scores),
    strengths: JSON.stringify(strengths),
    weaknesses: JSON.stringify(weaknesses),
    isCompleted: true,
    completedAt: new Date(),
  }).where(eq(osceAttempts.id, attemptId));

  return c.json({
    scores,
    strengths,
    weaknesses,
    feedback: "Good performance overall.",
  });
});

osceRoutes.get("/voice-config", async (c) => {
  return c.json({
    whisper: {
      model: "whisper-large",
      language: "en",
      sampleRate: 16000,
    },
    tts: {
      engine: "elevenlabs",
      voices: [
        { id: "v1", name: "Rachel", language: "en", gender: "female", age: 30 },
        { id: "v2", name: "Adam", language: "en", gender: "male", age: 35 },
      ],
    },
    vad: {
      silenceThreshold: 0.01,
      silenceDurationMs: 500,
      speechSensitivity: 0.5,
    },
    streaming: {
      chunkSizeMs: 100,
      maxDelayMs: 500,
    },
  });
});

osceRoutes.post("/voice-session", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  const { attemptId, patientProfileId, stationInstructions } = await c.req.json() as {
    attemptId: number;
    patientProfileId: number;
    stationInstructions: string;
  };

  const sessionId = `voice_${crypto.randomUUID().slice(0, 8)}`;

  return c.json({
    sessionId,
    instructions: stationInstructions || "Please proceed with the examination.",
  });
});

osceRoutes.post("/voice-session/:sessionId/process", async (c) => {
  const { audio } = await c.req.json() as { audio: string };

  const responses = [
    "I've been experiencing chest discomfort for about 3 days.",
    "Yes, it does radiate to my left arm.",
    "I haven't had any recent trauma.",
    "I'm a 55-year-old construction worker.",
    "I take metoprolol for high blood pressure.",
    "No family history of heart disease.",
    "I haven't been feeling well lately.",
    "The pain is worse when I climb stairs.",
    "I've been taking ibuprofen for the pain.",
    "Should I go to the ER?",
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];

  return c.json({
    response: randomResponse,
    audio: "dGVzdC1hdnBpY2FsLWJhc2U2NA==",
    emotion: "neutral",
  });
});

export { osceRoutes };
