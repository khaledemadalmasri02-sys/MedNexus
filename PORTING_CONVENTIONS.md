# Porting conventions — original Express API → Cloudflare Workers (Hono + D1)

You are porting route files from the ORIGINAL project at
`/home/khaled/Desktop/version my app/v2/src/` into the NEW Workers project at
`/home/khaled/Desktop/cloudflare/src/`.

## Golden rules
1. **Preserve the exact HTTP contract**: same paths, methods, status codes, request
   body shape, and JSON response shape as the original. The frontend depends on it.
2. **Framework**: use **Hono** (`import { Hono } from "hono"`), not Express.
3. **DB**: use Drizzle with the D1 instance from the request via `getDb(c)`. All the
   same tables exist in `src/db/index.ts` (import from there). Drizzle query/`select`
   APIs are identical to the original.
4. **No Node built-ins that don't exist on Workers**: no `fs`, `path`, `http`, `https`,
   `crypto` from "node:crypto" (use global `crypto` / Web Crypto), no `Buffer` unless
   `nodejs_compat` is relied on (prefer `atob`/`btoa`/`TextEncoder`). `crypto.randomUUID()`
   and `crypto.getRandomValues()` are available globally.
5. Timestamps in the schema use `timestamp_ms` mode → Drizzle gives/takes `Date` objects,
   same as before. Keep using `new Date()`.

## Route module shape

```ts
import { Hono } from "hono";
import { eq, and, desc, asc, inArray, sql, isNull } from "drizzle-orm";
import type { AppEnv } from "../types";
import { <tables> } from "../db/index";
import { getDb, getUserId, isAuthenticated, errorJson, unauthorized, notFound, serverError, readJson, clientIp, sseFromGenerator } from "../lib/helpers";
import { createAIService } from "../lib/ai"; // only if the route uses AI

export const <name>Routes = new Hono<AppEnv>();

// Paths must include the SAME prefix the original had once mounted.
// The original index.ts mounts each router under "/api" plus an optional sub-path.
// e.g. router.use("/planners", plannersRouter)  AND route "/" inside  => final path "/api/planners".
//      router.use(cardProgressRouter) with route "/cards/:id/progress" => final path "/api/cards/:id/progress".
// In the NEW project every router is mounted with app.route("/api", <name>Routes),
// so inside your router you must write the FULL path AFTER /api.
//   - planners.ts routes originally "/" and "/:id" mounted at "/planners"
//     => write them here as "/planners" and "/planners/:id".
//   - card-progress.ts routes were mounted at root => keep "/cards/:id/progress" etc.

<name>Routes.get("/planners", async (c) => {
  const db = getDb(c);
  const userId = getUserId(c);
  ...
  return c.json(result);
});
```

## Auth
- `isAuthenticated(c)` ⇔ original `req.isAuthenticated()`.
- `getUserId(c)` ⇔ `req.user?.id` (or null).
- For routes the original guarded with `requireAuth`, return `unauthorized(c)` when
  `!isAuthenticated(c)`.
- The session middleware already runs globally in `worker.ts`; do not re-implement it.

## Validation
- Use the `validate(schema)` middleware from `src/middleware/validate.ts` when the
  original used a zod schema, OR validate inline with zod. Access parsed data via
  `c.get("validated")`. Add any new zod schemas you need to `src/middleware/validate.ts`
  (append; don't rewrite existing exports).
- `c.req.param("id")` returns `string | undefined`; parse with `parseInt(c.req.param("id") ?? "", 10)`.
- Query params: `c.req.query("deckId")`.

## Body / params
- `const body = await readJson(c);` instead of `req.body`.
- Send 204: `return new Response(null, { status: 204 });`

## AI
- `const ai = createAIService(c.env);` then `await ai.complete(...)`, `ai.generateCards(...)`,
  `ai.generateQuestions(...)`, `ai.explainCard(...)`, or streaming `ai.streamComplete(...)` /
  `ai.streamExplainCard(...)`.
- For SSE endpoints, return `sseFromGenerator(ai.streamComplete(messages, opts))` or build
  a custom ReadableStream. Match the original event names if the frontend parses them; if
  unsure, the `sseFromGenerator` format emits `data: {"content":"..."}` lines + `data: [DONE]`.
- If no provider key is configured, `ai.hasAnyProvider()` is false — mirror the original's
  fallback behavior (often an offline generator or a stub message).

## Features that CANNOT run on Workers → adapt or stub
- **terminal.ts** (shell exec, fs): cannot run. Implement the same endpoints but return
  `501` `{ error: { code: "NOT_SUPPORTED", message: "Terminal is not available on this deployment" } }`
  for exec/file ops; keep session create/get/close working against the `terminalSessions`
  table (no real workspace).
- **PDF/OCR/DOCX parsing** (`extract.ts`, `upload.ts`, `summary.ts` ingestion via pdfjs,
  tesseract.js, mammoth): these need Node builtins. For endpoints that accept already-extracted
  TEXT, port them normally (AI generation works). For endpoints that parse binary files,
  return `501 NOT_SUPPORTED` with a clear message, but keep the DB/job bookkeeping intact.
- **backup.ts / download.ts** (local filesystem, apk downloads): stub file operations with
  `501`, but keep any DB-backed pieces (e.g. export as JSON) working.
- **Email** (nodemailer): replace with a no-op that logs; return success like the original
  did when SMTP was unconfigured.

## Registration
- Do NOT edit `src/worker.ts` (the lead will wire routers). Just export your router as a
  named const `export const <name>Routes`.
- Note in your final message the exact export name(s) and file path(s) you created, plus
  any schemas you appended to `middleware/validate.ts`.

## Verify
- Keep TypeScript strict-clean. You can run `cd /home/khaled/Desktop/cloudflare && npx tsc --noEmit`
  but note other agents may be writing files simultaneously; only worry about YOUR files'
  type errors. Prefer precise types but `as any` on `c.get("validated")` is acceptable
  (that's the established pattern).
