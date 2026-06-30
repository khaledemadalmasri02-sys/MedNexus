import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import router from "./routes/index.js";
import { authMiddleware } from "./middleware/auth.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { logger } from "./lib/logger.js";
import { getConfig, isDevelopment } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = isDevelopment()
  ? ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"]
  : [process.env.APP_URL, "https://ankeng.com", "https://www.ankeng.com"].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (origin && allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (!origin && isDevelopment()) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key", "X-CSRF-Token"],
}));

app.use((_req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com", "https://*.gstatic.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://openrouter.ai", "https://api.openai.com", "https://api.groq.com", "https://api.mistral.ai", "https://generativelanguage.googleapis.com", "https://accounts.google.com", "https://oauth2.googleapis.com", "https://www.googleapis.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["https://accounts.google.com"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true,
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.path.startsWith("/api")) {
    const contentType = req.headers["content-type"];
    if (!contentType || (!contentType.includes("application/json") && !contentType.includes("multipart/form-data"))) {
      res.status(415).json({
        error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Content-Type must be application/json or multipart/form-data" },
      });
      return;
    }
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const sanitizedUrl = req.url
      .replace(/token=[^&]+/g, "token=[REDACTED]")
      .replace(/key=[^&]+/g, "key=[REDACTED]");
    logger.info({
      method: req.method,
      url: sanitizedUrl,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
});

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (!req.cookies?.[CSRF_COOKIE]) {
      const token = crypto.randomBytes(32).toString("hex");
res.cookie(CSRF_COOKIE, token, {
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  domain: process.env.NODE_ENV === "production" ? undefined : "localhost",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
});
      res.locals.csrfToken = token;
    } else {
      res.locals.csrfToken = req.cookies[CSRF_COOKIE];
    }
    next();
    return;
  }

  if (req.path.startsWith("/api/")) {
    const cookieToken = req.cookies?.[CSRF_COOKIE];
    const headerToken = req.headers[CSRF_HEADER];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      res.status(403).json({
        error: { code: "CSRF_ERROR", message: "Invalid or missing CSRF token" },
      });
      return;
    }
  }
  next();
});

app.use(authMiddleware);

app.use("/api", apiRateLimit);

app.use("/api", router);

app.get("/healthz", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

if (!isDevelopment()) {
  const frontendPath = path.join(__dirname, "../new-frontend/dist");
  app.use(express.static(frontendPath));

  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Endpoint not found" },
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isDevelopment() ? err.message : "Internal server error",
    },
  });
});

export default app;
