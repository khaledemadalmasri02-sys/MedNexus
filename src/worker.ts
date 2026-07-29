import { Hono } from "hono";
import type { AppEnv } from "./types";
import { createDb, createFlashcardDb, createStudyPilotDb, createOsceDb } from "./db/index";
import { SESSION_COOKIE, getSession, readCookie } from "./lib/auth";

import { authRoutes } from "./routes/auth";
import { deckRoutes } from "./routes/decks";
import { cardRoutes } from "./routes/cards";
import { healthRoutes } from "./routes/health";
import { plannerRoutes } from "./routes/planners";
import { studySessionRoutes } from "./routes/study-sessions";
import { plannerTemplateRoutes } from "./routes/planner-templates";
import { notificationRoutes } from "./routes/notifications";
import { studyExamRoutes } from "./routes/study-exams";
import { cardProgressRoutes } from "./routes/card-progress";
import { tagRoutes } from "./routes/tags";
import { dashboardRoutes } from "./routes/dashboard";
import { searchRoutes } from "./routes/search";
import { settingsRoutes } from "./routes/settings";
import { feedbackRoutes } from "./routes/feedback";
import { generationRoutes } from "./routes/generations";
import { explanationRoutes } from "./routes/explanations";
import { qbankRoutes } from "./routes/qbanks";
import { importExportRoutes } from "./routes/import-export";
import { errorRoutes } from "./routes/errors";
import { generateRoutes } from "./routes/generate";
import { explainRoutes } from "./routes/explain";
import { aiAnalysisRoutes } from "./routes/ai-analysis";
import { extractRoutes } from "./routes/extract";
import { offlineRoutes } from "./routes/offline";
import { summaryRoutes } from "./routes/summary";
import { uploadRoutes } from "./routes/upload";
import { terminalRoutes } from "./routes/terminal";
import { backupRoutes } from "./routes/backup";
import { downloadRoutes } from "./routes/download";
import { articleJobRoutes } from "./routes/articleJobs";
import { generationJobRoutes } from "./routes/generation-jobs";
import { adminRoutes } from "./routes/admin";
import { supportRoutes } from "./routes/support";
import { agentRoutes } from "./routes/agents";
import { studypilotRoutes } from "./routes/studypilot";
import { voiceRoutes } from "./routes/voice";
import { wsRoutes } from "./routes/ws";

const app = new Hono<AppEnv>();

app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  await next();
});

app.use("*", async (c, next) => {
  const db = c.env.LOCAL_DB || c.env.DB;
  c.set("db", createDb(db as any));
  c.set("flashcardDb", createFlashcardDb(db as any));
  c.set("studypilotDb", createStudyPilotDb(db as any));
  c.set("osceDb", createOsceDb(db as any));
  await next();
});

app.use("*", async (c, next) => {
  const sessionId = readCookie(c, SESSION_COOKIE);
  if (sessionId) {
    try {
      const session = await getSession(c.get("db")!, sessionId);
      if (session) c.set("user", session.user);
    } catch {
      /* ignore invalid sessions */
    }
  }
  await next();
});

app.use("/api/admin/*", async (c, next) => {
  const adminKey = c.req.header("x-admin-key");
  const secret = c.env.ADMIN_SECRET_KEY;
  if (!secret || adminKey !== secret) {
    return c.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, 403);
  }
  await next();
});

app.use("/api/*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  await next();
});

app.route("/", healthRoutes);

const apiRouters = [
  authRoutes, deckRoutes, cardRoutes,
  plannerRoutes, studySessionRoutes, plannerTemplateRoutes, notificationRoutes,
  studyExamRoutes, cardProgressRoutes, tagRoutes,
  dashboardRoutes, searchRoutes, settingsRoutes, feedbackRoutes,
  generationRoutes, explanationRoutes, qbankRoutes, importExportRoutes, errorRoutes,
  generateRoutes, explainRoutes, aiAnalysisRoutes, extractRoutes, offlineRoutes,
  summaryRoutes, uploadRoutes, terminalRoutes, backupRoutes, downloadRoutes, articleJobRoutes,
  generationJobRoutes, adminRoutes, supportRoutes, agentRoutes, studypilotRoutes, voiceRoutes,
  wsRoutes,
];
for (const r of apiRouters) app.route("/api", r);

app.all("/api/*", (c) => c.json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }, 404));

app.all("*", async (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  async fetch(request: Request, env: AppEnv["Bindings"], ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};