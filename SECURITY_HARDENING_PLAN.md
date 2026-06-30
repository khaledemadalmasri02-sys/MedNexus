# MedNexus Security Hardening Implementation Plan

This plan addresses 12 critical security vulnerability categories across the MedNexus codebase (Express/TypeScript backend + React/Vite frontend). Each issue includes exact file paths, line numbers, current code, and replacement code.

**New dependencies required:**
```
npm install express-rate-limit pino-redact file-type uuid@10.0.0
npm install --save-dev @types/express-rate-limit
```

---

## P0 — CRITICAL (Fix Immediately)

### 1. Password Hashing (Already Partially Fixed — Verify)

**Status:** The codebase already uses `crypto.pbkdf2Sync` with SHA-512, 100k iterations, and random salt at `src/routes/auth.ts:31-35`. However, upgrading to `argon2id` provides better GPU/ASIC resistance.

**File:** `src/routes/auth.ts:31-42`

**Current code:**
```typescript
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return computed === hash;
}
```

**Replacement code:**
```typescript
import argon2 from "argon2";

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    return await argon2.verify(stored, password);
  } catch {
    return false;
  }
}
```

**Required changes across all call sites** — make login/register async-compatible:

**File:** `src/routes/auth.ts:98-140` (login route) — change `verifyPassword` call to `await verifyPassword`:

```typescript
// Line 117: change from sync to async
if (!(await verifyPassword(password, user.passwordHash))) {
```

**File:** `src/routes/auth.ts:168` (register route):
```typescript
// Change from: const passwordHash = hashPassword(password);
const passwordHash = await hashPassword(password);
```

**File:** `src/routes/auth.ts:538` (reset password route):
```typescript
// Change from: const passwordHash = hashPassword(newPassword);
const passwordHash = await hashPassword(newPassword);
```

**New dependency:** `npm install argon2`

---

### 2. Rate Limiting on Auth Endpoints

**File:** `src/app.ts` — add after line 47 (after `express.urlencoded`)

**Add after line 47:**
```typescript
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many attempts. Try again in 15 minutes." } },
  keyGenerator: (req) => req.ip || "unknown",
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many requests. Slow down." } },
  keyGenerator: (req) => req.ip || "unknown",
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
```

**New dependency:** `npm install express-rate-limit`

---

### 3. SQL Injection in Raw Queries

**Issue:** Several files use `sql` template tags with interpolated values that bypass parameterization.

#### 3a. `src/routes/study-sessions.ts:170`

**Current code:**
```typescript
orderBy: sql`${studySessions.startedAt} DESC`,
```

**Replacement code:**
```typescript
orderBy: desc(studySessions.startedAt),
```

#### 3b. `src/routes/planners.ts:45` and `src/routes/planners.ts:76`

**Current code:**
```typescript
const deckRecords = await db.select({ id: decks.id, name: decks.name }).from(decks).where(sql`${decks.id} IN (${sql.join(deckIds.map(id => sql`${id}`), sql`, `)})`);
```

**Replacement code (both occurrences):**
```typescript
const deckRecords = await db.select({ id: decks.id, name: decks.name }).from(decks).where(inArray(decks.id, deckIds));
```

#### 3c. `src/routes/decks.ts:72`, `src/routes/decks.ts:149`, `src/routes/decks.ts:197`, `src/routes/decks.ts:219`

These use `sql<number>\`count(${cards.id})\`` — the `cards.id` here is a column reference, not user input, so it's safe. No change needed.

#### 3d. `src/routes/qbanks.ts` — check for similar patterns (same as planners pattern).

---

### 4. Command Injection in Terminal

**File:** `src/routes/terminal.ts:81-139`

**Current code:** Uses `execAsync(command)` with a basic string blocklist (lines 14-24, 92-98).

**Full replacement for the exec route (lines 81-139):**
```typescript
const ALLOWED_COMMANDS = new Set([
  "ls", "cat", "echo", "mkdir", "pwd", "cd", "touch", "cp", "mv",
  "node", "npm", "npx", "python3", "pip", "pip3",
  "git", "head", "tail", "wc", "sort", "uniq", "grep", "find",
  "which", "env", "date", "whoami", "hostname",
]);

const MAX_OUTPUT_SIZE = 5 * 1024 * 1024; // 5MB

function isCommandAllowed(command: string): { allowed: boolean; binary: string | null } {
  const trimmed = command.trim();
  const parts = trimmed.split(/\s+/);
  const binary = parts[0];

  if (!ALLOWED_COMMANDS.has(binary)) {
    return { allowed: false, binary: null };
  }

  // Additional argument-level blocks
  const dangerousPatterns = [
    /;\s*rm\b/, /&&\s*rm\b/, /\|\s*rm\b/, /`\s*rm\b/, /\$\(.*rm/,
    /;\s*sudo\b/, /&&\s*sudo\b/, /\|\s*sudo\b/,
    /;\s*curl\b/, /;\s*wget\b/, /;\s*nc\b/, /;\s*ncat\b/,
    />\s*\/dev\//, />\s*\/etc\//, />\s*\/usr\//, />\s*\/bin\//,
    /<\s*\/etc\//, /<\s*\/proc\//, /<\s*\/sys\//,
    /mkfs/, /dd\s+if=/, /:\(\)\{:\|:&\};:/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { allowed: false, binary: null };
    }
  }

  return { allowed: true, binary };
}

// Replace the exec route handler (lines 81-139):
router.post("/terminal/exec", async (req: Request, res: Response) => {
  const { command, sessionId, timeout = 30000 } = req.body;

  if (!command || typeof command !== "string") {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Command is required" },
    });
    return;
  }

  if (command.length > 500) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Command too long (max 500 chars)" },
    });
    return;
  }

  const { allowed, binary } = isCommandAllowed(command);
  if (!allowed) {
    res.status(403).json({
      error: { code: "FORBIDDEN", message: `Command or pattern not allowed` },
    });
    return;
  }

  const session = sessionId ? sessions.get(sessionId) : null;
  const workspaceId = session?.workspaceId || "default";
  const workspacePath = ensureWorkspace(workspaceId);

  try {
    const effectiveTimeout = Math.min(timeout, 60000);

    const { stdout, stderr } = await execAsync(command, {
      cwd: workspacePath,
      timeout: effectiveTimeout,
      maxBuffer: MAX_OUTPUT_SIZE,
      env: {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        HOME: workspacePath,
        LANG: "C.UTF-8",
      },
      shell: "/bin/bash",
    });

    if (session) {
      session.lastActivity = new Date();
    }

    res.json({
      stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
      stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
      exitCode: 0,
      workspace: workspacePath,
    });
  } catch (err: any) {
    logger.warn({ err: err.message, command: command.slice(0, 100) }, "Command execution failed");

    res.json({
      stdout: (err.stdout || "").slice(0, MAX_OUTPUT_SIZE),
      stderr: (err.stderr || err.message || "").slice(0, MAX_OUTPUT_SIZE),
      exitCode: err.code || 1,
      workspace: workspacePath,
    });
  }
});
```

**Also remove the old BLOCKED_COMMANDS array (lines 13-24)** — it's replaced by the allowlist approach.

---

### 5. CORS Origin Bypass

**File:** `src/app.ts:27-29`

**Current code:**
```typescript
origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
},
```

**Replacement code:**
```typescript
origin: (origin, callback) => {
  if (origin && allowedOrigins.includes(origin)) {
    callback(null, true);
  } else if (!origin && isDevelopment()) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
},
```

**Also add Vary header** — add after the CORS block (after line 37):
```typescript
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  next();
});
```

---

## P1 — HIGH (Fix This Week)

### 6. Add Zod Validation to All Routes

Routes missing validation: `study-sessions.ts`, `planners.ts`, `notifications.ts`, `card-progress.ts`, `settings.ts`, `planner-templates.ts`, `tags.ts`.

#### 6a. Add new schemas to `src/routes/validators.ts`

**Add to the end of the file:**
```typescript
export const startStudySessionSchema = z.object({
  planId: z.number().int().positive().optional(),
  deckId: z.number().int().positive().optional(),
});

export const updateStudySessionSchema = z.object({
  cardsStudied: z.number().int().min(0).optional(),
  knownCount: z.number().int().min(0).optional(),
  unknownCount: z.number().int().min(0).optional(),
});

export const endStudySessionSchema = z.object({
  cardsStudied: z.number().int().min(0).optional(),
  knownCount: z.number().int().min(0).optional(),
  unknownCount: z.number().int().min(0).optional(),
});

export const createPlannerSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  color: z.string().max(20).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startHour: z.number().int().min(0).max(23),
  durationMinutes: z.number().int().positive().max(480).optional(),
  deckId: z.number().int().positive().optional(),
  recurrence: z.enum(["none", "weekly", "daily"]).optional(),
});

export const updatePlannerSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().max(20).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  durationMinutes: z.number().int().positive().max(480).optional(),
  deckId: z.number().int().positive().nullable().optional(),
  recurrence: z.enum(["none", "weekly", "daily"]).optional(),
});

export const createNotificationSchema = z.object({
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  actionUrl: z.string().url().max(500).optional(),
});

export const reviewCardSchema = z.object({
  quality: z.number().int().min(0).max(5),
});

export const updateSettingsSchema = z.object({
  dailyGoalMinutes: z.number().int().positive().max(1440).optional(),
  dailyGoalCards: z.number().int().positive().max(10000).optional(),
  reminderTime: z.string().max(10).nullable().optional(),
  accentColor: z.string().max(20).optional(),
  dashboardLayout: z.string().nullable().optional(),
  density: z.enum(["compact", "comfortable", "spacious"]).optional(),
  soundEnabled: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  animationsEnabled: z.boolean().optional(),
  fontSize: z.enum(["small", "medium", "large"]).optional(),
  defaultStyle: z.string().max(50).optional(),
  defaultMode: z.enum(["combined", "separate"]).optional(),
  autoTts: z.boolean().optional(),
  chunkSize: z.number().int().min(1).max(10).optional(),
  cardOrder: z.enum(["sequential", "random"]).optional(),
  autoReveal: z.boolean().optional(),
  autoRevealSeconds: z.number().int().min(1).max(60).optional(),
  showExplanation: z.boolean().optional(),
  streakFreeze: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  emailWeeklySummary: z.boolean().optional(),
  emailStreakAlert: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  pushReminderTime: z.string().max(10).optional(),
  pushReviewDue: z.boolean().optional(),
  pushSessionComplete: z.boolean().optional(),
  inAppSounds: z.boolean().optional(),
  soundVolume: z.number().int().min(0).max(100).optional(),
});

export const generatePlanSchema = z.object({
  examDate: z.string().datetime(),
  studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  hoursPerDay: z.number().int().positive().max(24),
  deckIds: z.array(z.number().int().positive()).optional(),
});

export const batchCreatePlansSchema = z.object({
  sessions: z.array(z.object({
    title: z.string().min(1).max(200),
    color: z.string().max(20).optional(),
    dayOfWeek: z.number().int().min(0).max(6),
    startHour: z.number().int().min(0).max(23),
    durationMinutes: z.number().int().positive().max(480).optional(),
    deckId: z.number().int().positive().optional(),
    recurrence: z.enum(["none", "weekly", "daily"]).optional(),
  })).min(1).max(100),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sessions: z.array(z.object({
    title: z.string().min(1).max(200),
    color: z.string().max(20).optional(),
    durationMinutes: z.number().int().positive().max(480).optional(),
    deckId: z.number().int().positive().optional(),
  })).optional(),
  scheduleType: z.enum(["weekly", "daily"]).optional(),
});

export const deckTagsSchema = z.object({
  tagIds: z.array(z.number().int().positive()).min(1).max(50),
});

export const terminalExecSchema = z.object({
  command: z.string().min(1).max(500),
  sessionId: z.string().uuid().optional(),
  timeout: z.number().int().positive().max(60000).optional(),
});

export const terminalFileContentSchema = z.object({
  sessionId: z.string().uuid().optional(),
  path: z.string().min(1).max(500),
  content: z.string().max(10 * 1024 * 1024),
});
```

#### 6b. Apply validators to `src/routes/study-sessions.ts`

**Line 13 — add import:**
```typescript
import { validateBody } from "../middleware/validate.js";
import { startStudySessionSchema, updateStudySessionSchema, endStudySessionSchema } from "./validators.js";
```

**Line 13 — change route:**
```typescript
router.post("/", validateBody(startStudySessionSchema), async (req: Request, res: Response) => {
```

**Line 35 — change route:**
```typescript
router.patch("/:id", validateBody(updateStudySessionSchema), async (req: Request, res: Response) => {
```

**Line 68 — change route:**
```typescript
router.post("/:id/end", validateBody(endStudySessionSchema), async (req: Request, res: Response) => {
```

#### 6c. Apply validators to `src/routes/planners.ts`

**Add import:**
```typescript
import { validateBody } from "../middleware/validate.js";
import { createPlannerSchema, updatePlannerSchema } from "./validators.js";
```

**Line 145:**
```typescript
router.post("/", validateBody(createPlannerSchema), async (req: Request, res: Response) => {
```

**Line 178:**
```typescript
router.patch("/:id", validateBody(updatePlannerSchema), async (req: Request, res: Response) => {
```

#### 6d. Apply validators to `src/routes/notifications.ts`

**Add import:**
```typescript
import { validateBody } from "../middleware/validate.js";
import { createNotificationSchema } from "./validators.js";
```

**Line 81:**
```typescript
router.post("/", validateBody(createNotificationSchema), async (req: Request, res: Response) => {
```

#### 6e. Apply validators to `src/routes/card-progress.ts`

**Add import:**
```typescript
import { validateBody } from "../middleware/validate.js";
import { reviewCardSchema } from "./validators.js";
```

**Line 54:**
```typescript
router.post("/cards/:id/review", validateBody(reviewCardSchema), async (req: Request, res: Response) => {
```

#### 6f. Apply validators to `src/routes/settings.ts`

**Add import:**
```typescript
import { validateBody } from "../middleware/validate.js";
import { updateSettingsSchema } from "./validators.js";
```

**Line 80:**
```typescript
router.put("/settings", requireAuth, validateBody(updateSettingsSchema), async (req: Request, res: Response) => {
```

#### 6g. Apply validators to `src/routes/planner-templates.ts`

**Add import:**
```typescript
import { validateBody } from "../middleware/validate.js";
import { generatePlanSchema, batchCreatePlansSchema, createTemplateSchema } from "./validators.js";
```

**Line 18:**
```typescript
router.post("/generate", validateBody(generatePlanSchema), async (req: Request, res: Response) => {
```

**Line 138:**
```typescript
router.post("/batch-create", validateBody(batchCreatePlansSchema), async (req: Request, res: Response) => {
```

**Line 188:**
```typescript
router.post("/templates", validateBody(createTemplateSchema), async (req: Request, res: Response) => {
```

#### 6h. Apply validators to `src/routes/tags.ts`

**Line 106 — add schema and validation:**
```typescript
router.post("/decks/:id/tags", validateBody(deckTagsSchema), async (req: Request, res: Response) => {
```

#### 6i. Apply validators to `src/routes/terminal.ts`

**Add import:**
```typescript
import { validateBody } from "../middleware/validate.js";
import { terminalExecSchema, terminalFileContentSchema } from "./validators.js";
```

**Line 81 (exec route):**
```typescript
router.post("/terminal/exec", validateBody(terminalExecSchema), async (req: Request, res: Response) => {
```

**Line 211 (write file):**
```typescript
router.post("/terminal/files/content", validateBody(terminalFileContentSchema), (req: Request, res: Response) => {
```

---

### 7. Strict CSP Headers

**File:** `src/app.ts:40-43`

**Current code:**
```typescript
app.use(helmet({
  contentSecurityPolicy: isDevelopment() ? false : undefined,
  frameguard: false,
}));
```

**Replacement code:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://openrouter.ai", "https://api.openai.com", "https://api.groq.com", "https://api.mistral.ai", "https://generativelanguage.googleapis.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: { action: "deny" },
}));
```

---

### 8. Path Traversal in Terminal

**File:** `src/routes/terminal.ts:149-157` and `src/routes/terminal.ts:190-198`

**Current code (both occurrences):**
```typescript
const targetPath = path.resolve(workspacePath, filePath as string);
if (!targetPath.startsWith(workspacePath)) {
```

**Replacement code (both occurrences):**
```typescript
const targetPath = path.resolve(workspacePath, filePath as string);
const normalizedWorkspace = path.resolve(workspacePath);
if (!targetPath.startsWith(normalizedWorkspace + path.sep) && targetPath !== normalizedWorkspace) {
```

**Also add file size limit to the read endpoint** (`src/routes/terminal.ts:200-201`):

**Current code:**
```typescript
const content = fs.readFileSync(targetPath, "utf-8");
```

**Replacement code:**
```typescript
const stats = fs.statSync(targetPath);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
if (stats.size > MAX_FILE_SIZE) {
  res.status(400).json({
    error: { code: "ERROR", message: "File too large (max 5MB)" },
  });
  return;
}
const content = fs.readFileSync(targetPath, "utf-8");
```

---

### 9. File Type Validation (Magic Bytes)

**File:** `src/middleware/upload.ts`

**Current code:** Only validates file extensions (lines 13-17, 35-42).

**Full replacement:**
```typescript
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileTypeFromFile } from "file-type";

const UPLOAD_DIR = "./data/summary_uploads";
const OUTPUT_DIR = "./data/summary_outputs";

[UPLOAD_DIR, OUTPUT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ALLOWED_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "text/csv": [".csv"],
  "text/plain": [".txt", ".md"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(ALLOWED_TYPES));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = Object.values(ALLOWED_TYPES).flat();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  },
});

export async function validateFileType(filePath: string): Promise<boolean> {
  const fileType = await fileTypeFromFile(filePath);
  if (!fileType) {
    return false;
  }
  return ALLOWED_MIME_TYPES.has(fileType.mime);
}

export { UPLOAD_DIR, OUTPUT_DIR };
```

**New dependency:** `npm install file-type`

**Also update `src/routes/summary.ts`** — add MIME validation after upload. In the upload handler (line 101-130), add after line 118:

```typescript
for (const f of files) {
  const valid = await validateFileType(f.path);
  if (!valid) {
    fs.unlinkSync(f.path);
    res.status(400).json({ error: { code: "UPLOAD_ERROR", message: `File ${f.originalname} content does not match its extension` } });
    return;
  }
}
```

---

### 10. API Key Exposure via CLI Args

**File:** `src/routes/summary.ts:213-229` (spawnPipeline function)

**Current code:**
```typescript
const args = [
  scriptPath,
  "--files", filePath,
  "--style", style,
  "--output", outputPath,
  "--chunk-size", "3",
  "--api-key", config.OPENROUTER_API_KEY || "",
  "--api-base", "https://openrouter.ai/api/v1",
  "--mode", isClinical ? "pipeline" : "generate",
];
```

**Replacement code:**
```typescript
const args = [
  scriptPath,
  "--files", filePath,
  "--style", style,
  "--output", outputPath,
  "--chunk-size", "3",
  "--api-base", "https://openrouter.ai/api/v1",
  "--mode", isClinical ? "pipeline" : "generate",
];
```

And change the spawn call (line 226-229) to pass the API key via environment only:
```typescript
return spawn(pythonPath, args, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PYTHONUNBUFFERED: "1",
    OPENROUTER_API_KEY: config.OPENROUTER_API_KEY || "",
  },
});
```

**Also fix the same issue in the `/ask` endpoint** (`src/routes/summary.ts:728-738):

**Current code includes:**
```typescript
"--api-key", config.OPENROUTER_API_KEY || "",
"--api-base", "https://openrouter.ai/api/v1",
```

**Remove the `--api-key` arg** and pass via env instead:
```typescript
const args = [
  scriptPath,
  "--files", "/dev/null",
  "--style", "academic",
  "--output", "/dev/null",
  "--mode", "qa",
  "--job-data", JSON.stringify(job.events),
  "--question", question,
  "--api-base", "https://openrouter.ai/api/v1",
];

const proc = spawn(process.env.PYTHON_PATH || "python3", args, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PYTHONUNBUFFERED: "1",
    OPENROUTER_API_KEY: config.OPENROUTER_API_KEY || "",
  },
});
```

---

## P2 — MEDIUM (Fix This Month)

### 11. HSTS and HTTPS Redirect

**File:** `src/app.ts` — add after line 19 (after `app.set("trust proxy", 1)`):

```typescript
if (!isDevelopment()) {
  app.use((req, res, next) => {
    if (!req.secure) {
      res.redirect(301, `https://${req.headers.host}${req.url}`);
      return;
    }
    next();
  });
}

app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true,
}));
```

---

### 12. Redact Sensitive Data from Logs

**File:** `src/lib/logger.ts`

**Current code:**
```typescript
export const logger = pino({
  level: getConfig().LOG_LEVEL,
  transport: getConfig().NODE_ENV === "development" 
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
```

**Replacement code:**
```typescript
import pinoRedact from "pino-redact";

const redact = pinoRedact({
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "req.headers[\"x-admin-key\"]",
    "res.headers[\"set-cookie\"]",
    "*.password",
    "*.passwordHash",
    "*.token",
    "*.apiKey",
    "*.api_key",
    "*.secret",
    "*.accessToken",
    "*.idToken",
    "inputData",
    "messages[*].content",
    "OPENROUTER_API_KEY",
    "OPENAI_API_KEY",
    "GROQ_API_KEY",
    "MISTRAL_API_KEY",
    "GOOGLE_AI_API_KEY",
    "SMTP_PASS",
    "ADMIN_SECRET_KEY",
  ],
  censor: "[REDACTED]",
});

export const logger = redact;
```

**Also update the request logger in `src/app.ts:50-62`** to redact URLs with tokens:

**Current code:**
```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
});
```

**Replacement code:**
```typescript
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
```

**New dependency:** `npm install pino-redact`

---

### 13. CSRF Protection (Double-Submit Cookie)

**File:** `src/app.ts` — add after the rate limiter block.

**Add new middleware after line 47 (after rate limiters):**
```typescript
import crypto from "crypto";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

app.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    if (!req.cookies?.[CSRF_COOKIE]) {
      const token = crypto.randomBytes(32).toString("hex");
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
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

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      error: { code: "CSRF_ERROR", message: "Invalid or missing CSRF token" },
    });
    return;
  }
  next();
});
```

**Frontend change needed:** The React app must read the `csrf_token` cookie and include it in the `X-CSRF-Token` header on all state-changing requests. Update `new-frontend/src/lib/api.ts` to include:
```typescript
headers: {
  "X-CSRF-Token": getCookie("csrf_token"),
  "Content-Type": "application/json",
},
```

---

### 14. Session Rotation on Login

**File:** `src/routes/auth.ts:98-140` (login route)

**Add before creating the new session (before line 124):**
```typescript
const existingSessionId = req.cookies?.[SESSION_COOKIE];
if (existingSessionId) {
  await deleteSession(existingSessionId);
}
```

---

### 15. Dependency Audit

**Add to `package.json` scripts:**
```json
{
  "scripts": {
    "audit:security": "npm audit --audit-level=high",
    "audit:fix": "npm audit fix"
  }
}
```

**Create `.github/dependabot.yml`** (if not existing):
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "security"
      - "dependencies"
```

---

## P3 — LOW (Nice to Have)

### 16. Content-Type Validation on POST Endpoints

**File:** `src/app.ts` — add after line 47:

```typescript
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
```

---

### 17. Cookie SameSite Strict

**File:** `src/routes/auth.ts:48-56`

**Current code:**
```typescript
function setSessionCookie(res: Response, sessionId: string, rememberMe?: boolean): void {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionTtl(rememberMe),
  });
}
```

**Replacement code:**
```typescript
function setSessionCookie(res: Response, sessionId: string, rememberMe?: boolean): void {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: getSessionTtl(rememberMe),
  });
}
```

---

### 18. .gitignore Verification

**Create/update `.gitignore`:**
```
node_modules/
dist/
.env
.env.local
.env.production
.env.*.local
data/
workspaces/
logs/
*.log
.DS_Store
```

---

### 19. Password Complexity Requirements

**File:** `src/routes/auth.ts:152-157` and `src/routes/auth.ts:522-527`

**Current code:**
```typescript
if (password.length < 8) {
  res.status(400).json({
    error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters" },
  });
  return;
}
```

**Replacement code (both occurrences):**
```typescript
if (password.length < 12) {
  res.status(400).json({
    error: { code: "VALIDATION_ERROR", message: "Password must be at least 12 characters" },
  });
  return;
}
if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
  res.status(400).json({
    error: { code: "VALIDATION_ERROR", message: "Password must contain uppercase, lowercase, and a number" },
  });
  return;
}
```

---

### 20. Account Lockout After Failed Logins

**File:** `src/routes/auth.ts` — add at the top of the file:

```typescript
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function isLockedOut(identifier: string): boolean {
  const record = failedAttempts.get(identifier);
  if (!record) return false;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    if (Date.now() - record.lastAttempt < LOCKOUT_DURATION) {
      return true;
    }
    failedAttempts.delete(identifier);
  }
  return false;
}

function recordFailedAttempt(identifier: string): void {
  const record = failedAttempts.get(identifier);
  if (record) {
    record.count++;
    record.lastAttempt = Date.now();
  } else {
    failedAttempts.set(identifier, { count: 1, lastAttempt: Date.now() });
  }
}

function clearFailedAttempts(identifier: string): void {
  failedAttempts.delete(identifier);
}
```

**In the login route** (`src/routes/auth.ts:98`), add after line 99:
```typescript
const clientIp = req.ip || "unknown";
if (isLockedOut(email) || isLockedOut(clientIp)) {
  res.status(429).json({
    error: { code: "ACCOUNT_LOCKED", message: "Too many failed attempts. Try again in 15 minutes." },
  });
  return;
}
```

**Replace line 110-115 (failed login):**
```typescript
if (!user || !user.passwordHash) {
  recordFailedAttempt(email);
  recordFailedAttempt(clientIp);
  res.status(401).json({
    error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
  });
  return;
}
```

**Replace line 117-122 (wrong password):**
```typescript
if (!(await verifyPassword(password, user.passwordHash))) {
  recordFailedAttempt(email);
  recordFailedAttempt(clientIp);
  res.status(401).json({
    error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
  });
  return;
}
```

**Add after successful login (after line 122, before creating session):**
```typescript
clearFailedAttempts(email);
clearFailedAttempts(clientIp);
```

---

## Summary of New Dependencies

```bash
# Production
npm install argon2 express-rate-limit pino-redact file-type

# Dev
npm install --save-dev @types/express-rate-limit
```

## Files Modified Summary

| File | Changes |
|------|---------|
| `src/app.ts` | CORS fix, CSP, rate limiting, HSTS, CSRF, Content-Type validation, request logging redaction |
| `src/routes/auth.ts` | Argon2 password hashing, session rotation, account lockout, password complexity, SameSite strict |
| `src/routes/terminal.ts` | Command allowlist, path traversal fix, file size limits, Zod validation |
| `src/routes/summary.ts` | API key via env vars, MIME type validation, secure filenames |
| `src/routes/decks.ts` | SQL injection fix (already safe for column refs) |
| `src/routes/study-sessions.ts` | SQL injection fix, Zod validation |
| `src/routes/planners.ts` | SQL injection fix, Zod validation |
| `src/routes/planner-templates.ts` | Zod validation |
| `src/routes/notifications.ts` | Zod validation |
| `src/routes/card-progress.ts` | Zod validation |
| `src/routes/settings.ts` | Zod validation |
| `src/routes/tags.ts` | Zod validation |
| `src/routes/validators.ts` | New validation schemas |
| `src/middleware/upload.ts` | Magic bytes validation, MIME type checking |
| `src/lib/logger.ts` | Pino redaction for sensitive fields |
| `src/lib/ai.ts` | Redact PHI from error logs |
| `.gitignore` | Ensure .env, data/, logs/ are excluded |
| `package.json` | New dependencies, audit scripts |
| `.github/dependabot.yml` | Automated dependency updates |
