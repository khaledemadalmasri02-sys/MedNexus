import { Hono } from "hono";
import type { AppEnv } from "./types";
import { createDb } from "./db/index";
import { SESSION_COOKIE, getSession, readCookie } from "./lib/auth";

// Route modules
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
import { adminRoutes } from "./routes/admin";
import { supportRoutes } from "./routes/support";
import { agentRoutes } from "./routes/agents";
import { studypilotRoutes } from "./routes/studypilot";

const app = new Hono<AppEnv>();

// Attach the D1-backed drizzle instance to every request.
app.use("*", async (c, next) => {
  c.set("db", createDb(c.env.DB));
  await next();
});

// Session auth middleware — loads the user from the session cookie (if any).
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

// Admin key gate — MUST be registered before the admin routes below.
app.use("/api/admin/*", async (c, next) => {
  const adminKey = c.req.header("x-admin-key");
  const secret = c.env.ADMIN_SECRET_KEY;
  if (!secret || adminKey !== secret) {
    return c.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, 403);
  }
  await next();
});

// Health is mounted at root (e.g. GET /health, /healthz).
app.route("/", healthRoutes);

// All API routers are mounted under /api (paths inside already include their sub-prefix).
const apiRouters = [
  authRoutes, deckRoutes, cardRoutes,
  plannerRoutes, studySessionRoutes, plannerTemplateRoutes, notificationRoutes,
  studyExamRoutes, cardProgressRoutes, tagRoutes,
  dashboardRoutes, searchRoutes, settingsRoutes, feedbackRoutes,
  generationRoutes, explanationRoutes, qbankRoutes, importExportRoutes, errorRoutes,
  generateRoutes, explainRoutes, aiAnalysisRoutes, extractRoutes, offlineRoutes,
  summaryRoutes, uploadRoutes, terminalRoutes, backupRoutes, downloadRoutes, articleJobRoutes,
  adminRoutes, supportRoutes, agentRoutes, studypilotRoutes,
];
for (const r of apiRouters) app.route("/api", r);

// 404 for unknown /api routes
app.all("/api/*", (c) => c.json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } }, 404));

// Serve the built SPA for all other (non-API) routes via Workers Assets.
app.all("*", async (c) => c.env.ASSETS.fetch(c.req.raw));

export default {
  async fetch(request: Request, env: AppEnv["Bindings"], ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};
