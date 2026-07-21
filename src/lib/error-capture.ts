import { eq, and } from "drizzle-orm";
import type { DB } from "../db/index";
import { errorLogs, generationLogs } from "../db/index";

export type ErrorCategory = "auth" | "rate_limit" | "network" | "timeout" | "parse" | "model_error" | "unknown";

export interface CaptureContext {
  userId?: string | null;
  operation: string;
  model: string;
  inputText: string;
  extra?: Record<string, unknown>;
}

export interface FailureSummary {
  category: ErrorCategory;
  problem: string;
  why: string;
}

const PREVIEW_MAX = 280;

function classifyError(err: Error): ErrorCategory {
  const msg = err.message.toLowerCase();
  if (/401|402|403|unauthorized|api key|auth|token/.test(msg)) return "auth";
  if (/\b429\b|rate limit|quota|too many requests|daily limit/.test(msg)) return "rate_limit";
  if (/econnrefused|enotfound|fetch failed|network|dns|econnreset/.test(msg)) return "network";
  if (/timeout|timed out|deadline|etimedout|eagi/.test(msg)) return "timeout";
  if (/invalid response format|no json|parse|unexpected token|syntax error/.test(msg)) return "parse";
  if (/model|provider returned error|server error|500|502|503|504/.test(msg)) return "model_error";
  return "unknown";
}

function summarizeError(err: Error, category: ErrorCategory, operation: string, model: string): FailureSummary {
  const raw = err.message || String(err);
  const short = raw.length > 200 ? raw.slice(0, 200) + "..." : raw;

  const summaries: Record<ErrorCategory, { problem: string; why: string }> = {
    auth: {
      problem: `Authentication or authorization failure during ${operation}`,
      why: `Model provider rejected the request (invalid key, expired token, or unauthorized access). Model: ${model}. Raw: ${short}`,
    },
    rate_limit: {
      problem: `Rate limit or quota exceeded during ${operation}`,
      why: `Provider throttled the request because daily quota or rate limit was reached. Model: ${model}. Raw: ${short}`,
    },
    network: {
      problem: `Network connectivity error during ${operation}`,
      why: `Could not reach the model provider (DNS failure, connection refused, or network unreachable). Model: ${model}. Raw: ${short}`,
    },
    timeout: {
      problem: `Request timed out during ${operation}`,
      why: `Provider did not respond within the deadline or the model took too long to generate. Model: ${model}. Raw: ${short}`,
    },
    parse: {
      problem: `Invalid response format during ${operation}`,
      why: `Provider returned data that could not be parsed as expected JSON. Model: ${model}. Raw: ${short}`,
    },
    model_error: {
      problem: `Provider or model error during ${operation}`,
      why: `Provider returned an error response (5xx or other). Model: ${model}. Raw: ${short}`,
    },
    unknown: {
      problem: `Unexpected error during ${operation}`,
      why: `An unknown error occurred while generating with model ${model}. Raw: ${short}`,
    },
  };

  return summaries[category] as FailureSummary;
}

function inputHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0");
}

function inputPreview(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > PREVIEW_MAX ? t.slice(0, PREVIEW_MAX) + "..." : t;
}

export async function captureGenerationError(db: DB, err: Error, ctx: CaptureContext): Promise<void> {
  const category = classifyError(err);
  const summary = summarizeError(err, category, ctx.operation, ctx.model);
  const now = new Date();
  const ts = now.getTime();

  const hash = inputHash(ctx.inputText);
  const preview = inputPreview(ctx.inputText);

  const row: Record<string, unknown> = {
    errorType: category,
    errorCode: extractErrorCode(err.message),
    model: ctx.model,
    operation: ctx.operation,
    inputHash: hash,
    inputPreview: preview,
    errorMessage: summary.problem + " " + summary.why,
    errorStack: err.stack || undefined,
    context: JSON.stringify({ ...ctx.extra, why: summary.why }),
    resolved: false,
    occurrenceCount: 1,
    firstSeenAt: ts,
    lastSeenAt: ts,
    createdAt: now,
  };

  try {
    const existing = await db.query.errorLogs.findFirst({
      where: and(
        eq(errorLogs.operation, ctx.operation),
        eq(errorLogs.model, ctx.model),
        eq(errorLogs.inputHash, hash),
        eq(errorLogs.resolved, false)
      ),
    });

    if (existing) {
      await db
        .update(errorLogs)
        .set({
          occurrenceCount: existing.occurrenceCount + 1,
          lastSeenAt: new Date(ts),
          errorMessage: summary.problem + " " + summary.why,
          errorStack: err.stack || existing.errorStack,
          context: JSON.stringify({ ...ctx.extra, why: summary.why }),
        })
        .where(eq(errorLogs.id, existing.id));
    } else {
      await db.insert(errorLogs).values(row as any);
    }
  } catch {
    /* best-effort: error logging must never break the request */
  }

  try {
    await db.insert(generationLogs).values({
      userId: ctx.userId ?? null,
      type: ctx.operation,
      model: ctx.model,
      success: false,
      errorMessage: summary.problem + " — " + summary.why,
      createdAt: now,
    });
  } catch {
    /* best-effort */
  }
}

function extractErrorCode(message: string): string | undefined {
  const match = message.match(/\b(\d{3})\b/);
  return match ? match[1] : undefined;
}

