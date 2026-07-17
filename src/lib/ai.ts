import { getConfig, type AppConfig } from "./config";
import { logger } from "./logger";
import type { Bindings } from "../types";

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  // Max chunks generated in parallel. Bounds load on the AI provider.
  concurrency?: number;
  // Overall wall-clock budget (ms). When exceeded, in-flight calls abort and
  // a PartialGenerationError is thrown carrying whatever was produced so far.
  deadlineMs?: number;
  // External abort signal (e.g. a per-request deadline).
  signal?: AbortSignal;
}

export interface GeneratedCard {
  front: string;
  back: string;
  tags?: string[];
}

export interface GeneratedQuestion {
  front: string;
  back: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
}

function parseModel(model: string): { provider: string; modelName: string } {
  const parts = model.split("/");
  if (parts.length >= 2) return { provider: parts[0], modelName: parts.slice(1).join("/") };
  return { provider: "openrouter", modelName: model };
}

// Local LM Studio / Ollama-compatible servers (OpenAI-style /v1 API) don't need
// a key and use a self-hosted base URL.
function isLocalProvider(provider: string): boolean {
  return provider === "local" || provider === "lmstudio" || provider === "ollama";
}

function getApiKey(model: string, config: AppConfig): string | undefined {
  const { provider } = parseModel(model);
  if (isLocalProvider(provider)) return undefined;
  switch (provider) {
    case "openrouter": return config.OPENROUTER_API_KEY;
    case "openai": return config.OPENAI_API_KEY;
    case "groq": return config.GROQ_API_KEY;
    case "mistral": return config.MISTRAL_API_KEY;
    case "google": return config.GOOGLE_AI_API_KEY;
    case "nvidia":
    case "cohere": return config.OPENROUTER_API_KEY;
    default: return config.OPENROUTER_API_KEY;
  }
}

function getApiBaseUrl(model: string, config: AppConfig): string {
  const { provider } = parseModel(model);
  switch (provider) {
    case "local":
    case "lmstudio":
    case "ollama": {
      const base = (config.LOCAL_AI_URL || "http://192.168.100.99:1234/v1").replace(/\/+$/, "");
      return base.startsWith("http") ? base : `http://${base}`;
    }
    case "openrouter":
    case "nvidia":
    case "cohere": return "https://openrouter.ai/api/v1";
    case "openai": return "https://api.openai.com/v1";
    case "groq": return "https://api.groq.com/openai/v1";
    case "mistral": return "https://api.mistral.ai/v1";
    case "google": return "https://generativelanguage.googleapis.com/v1beta";
    default: return "https://openrouter.ai/api/v1";
  }
}

function getFullModelName(model: string): string {
  const { provider, modelName } = parseModel(model);
  // For OpenAI-compatible servers (local/lmstudio/ollama) the provider prefix
  // must be stripped so the real model id reaches the server.
  if (provider === "openrouter" || isLocalProvider(provider)) return modelName;
  return model;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const AI_TIMEOUT_MS = 60_000;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

// For local/self-hosted OpenAI-style servers (LM Studio, Ollama, or a tunnel
// exposing one), a 5xx / bad-gateway means the server (or tunnel) is simply
// DOWN — retrying is pointless and just adds seconds of latency before the
// caller's offline fallback. Network-level failures (fetch failed, ECONNREFUSED,
// bad gateway) are likewise non-retryable for local endpoints.
function isLocalProviderDown(status: number | null, err: unknown, provider: string): boolean {
  if (!isLocalProvider(provider)) return false;
  if (status !== null && (status === 502 || status === 503 || status === 504)) return true;
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return /fetch failed|econnrefused|bad gateway|502|503|504|enotfound|network/i.test(msg);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Run `worker` over `items` with a bounded number of concurrent executions.
// Remaining work is skipped once `externalAbort` fires. A single non-abort
// error rejects the whole pool; abort errors are swallowed (item skipped).
async function runPool<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
  externalAbort?: AbortSignal,
): Promise<R[]> {
  const results: (R | undefined)[] = new Array(items.length);
  let cursor = 0;
  const exec = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      if (externalAbort?.aborted) return;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        if ((err as any)?.name === "AbortError") {
          results[i] = undefined;
          continue;
        }
        throw err;
      }
    }
  };
  const pool = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => exec());
  await Promise.all(pool);
  return results.filter((r): r is R => r !== undefined);
}

// Thrown when the overall deadline is exceeded but some items were already
// produced. Carries those items so the caller can persist a partial result
// instead of discarding all work.
export class PartialGenerationError extends Error {
  items: any[];
  constructor(items: any[], message = "Generation timed out before all items were produced") {
    super(message);
    this.name = "PartialGenerationError";
    this.items = items;
  }
}

// ── Robust JSON-array extraction for AI outputs ──
// Models frequently return fenced JSON (```json ... ```), a wrapped object
// ({"cards":[...]}), or trailing commas. This parses all of those safely.

function stripCodeFences(raw: string): string {
  const s = (raw || "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fence ? fence[1].trim() : s;
}

// Find the first balanced [...] block, respecting nested brackets and strings.
function findBalancedArray(raw: string): string | null {
  const start = raw.indexOf("[");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

function parseTolerant(json: string): any {
  try {
    return JSON.parse(json);
  } catch {
    // Tolerate trailing commas before } or ].
    return JSON.parse(json.replace(/,\s*([}\]])/g, "$1"));
  }
}

function extractRawArray(raw: string): unknown[] | null {
  const stripped = stripCodeFences(raw);
  const arrStr = findBalancedArray(stripped);
  if (arrStr) {
    const parsed = parseTolerant(arrStr);
    if (Array.isArray(parsed)) return parsed;
  }
  // Handle a wrapped object like {"cards":[...]} / {"questions":[...]}.
  const objMatch = stripped.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const obj = parseTolerant(objMatch[0]);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const arr = (obj as Record<string, unknown>).cards ??
        (obj as Record<string, unknown>).questions ??
        (obj as Record<string, unknown>).items ??
        (obj as Record<string, unknown>).data;
      if (Array.isArray(arr)) return arr;
    }
  }
  return null;
}

// Extract a validated array of items that each have a non-empty front
// (or question/prompt) and back (or answer), mapping those aliases to
// {front, back}. Returns T[] for the caller's expected shape.
export function parseJsonArray<T extends Record<string, any>>(raw: string): T[] {
  const arr = extractRawArray(raw);
  if (!arr) throw new Error("Invalid response format from AI: no JSON array found");
  const out: T[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const obj = item as Record<string, any>;
    const front = obj.front ?? obj.question ?? obj.prompt ?? obj.q ?? obj.term;
    const back = obj.back ?? obj.answer ?? obj.a ?? obj.definition;
    if (typeof front !== "string" || typeof back !== "string") continue;
    if (!front.trim() || !back.trim()) continue;
    const normalized: Record<string, any> = { ...obj, front: front.trim(), back: back.trim() };
    if ("question" in normalized && front === obj.question) delete normalized.question;
    if ("answer" in normalized && back === obj.answer) delete normalized.answer;
    out.push(normalized as T);
  }
  return out;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit & { signal?: AbortSignal },
  label: string,
  provider = "openrouter",
): Promise<Response> {
  const external = init.signal;
  const { signal: _omit, ...restInit } = init;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1));
    }
    if (external?.aborted) {
      const e = new Error("Generation aborted by deadline");
      e.name = "AbortError";
      throw e;
    }
    const controller = new AbortController();
    let onExternal: (() => void) | undefined;
    if (external) {
      onExternal = () => controller.abort();
      external.addEventListener("abort", onExternal, { once: true });
    }
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...restInit, signal: controller.signal });
      if (response.ok || !isRetryableStatus(response.status)) return response;
      if (isLocalProviderDown(response.status, null, provider)) {
        const body = await response.text().catch(() => "");
        throw new Error(`AI API ${response.status}: ${body}`);
      }
      const body = await response.text().catch(() => "");
      lastError = new Error(`AI API ${response.status}: ${body}`);
      logger.warn({ label, status: response.status, attempt: attempt + 1 }, "Retryable AI error");
    } catch (err: any) {
      if (isLocalProviderDown(null, err, provider)) {
        const msg = (err?.message || "AI request failed").toString();
        throw new Error(msg.includes("AI API") ? err : new Error(`AI request failed: ${msg}`));
      }
      if (external?.aborted) {
        const e = new Error("Generation aborted by deadline");
        e.name = "AbortError";
        lastError = e;
        break;
      }
      lastError = err?.name === "AbortError" ? new Error("AI request timed out") : (err as Error);
      logger.warn({ label, attempt: attempt + 1, err: lastError.message }, "AI request network error");
    } finally {
      clearTimeout(timeout);
      if (external && onExternal) external.removeEventListener("abort", onExternal);
    }
  }
  throw lastError || new Error("AI request failed after retries");
}

const MODE_PROMPTS: Record<string, string> = {
  full: `Generate a comprehensive and detailed breakdown of this medical concept, suitable for in-depth learning. Use Markdown headings (##, ###), bullet points, **bold** for key terms, blockquotes (>) for clinical pearls, and pipe tables where useful. Cover Overview, Etiology/Pathophysiology, Clinical Presentation, Diagnosis, Management/Treatment, Complications, and Key Takeaways.`,
  revision: "Provide a concise revision summary focusing on high-yield facts and common exam points.",
  osce: "Provide an OSCE-style explanation including what to look for, key findings, and how to present.",
  brief: "Provide a brief, bullet-point summary of the key points.",
  mnemonic: "Create helpful mnemonics and memory aids for this topic.",
  clinical: "Focus on clinical relevance, presentation, diagnosis, and management.",
  testtrap: "Highlight common exam pitfalls, trick questions, and frequent misconceptions. Use ## headings, bullet points, and **bold** for key terms.",
};

export type ExplainMode = "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap";

export class AIService {
  private config: AppConfig;

  constructor(env: Bindings) {
    this.config = getConfig(env);
  }

  hasAnyProvider(): boolean {
    if (this.config.LOCAL_AI_URL) return true;
    return !!(this.config.OPENROUTER_API_KEY || this.config.OPENAI_API_KEY ||
      this.config.GROQ_API_KEY || this.config.MISTRAL_API_KEY || this.config.GOOGLE_AI_API_KEY);
  }

  private sanitizePromptInput(input: string): string {
    let s = (input || "").slice(0, 1_000_000);
    s = s.replace(/ignore\s+(previous|above|all|system)\s+instructions?/gi, "[FILTERED]");
    s = s.replace(/forget\s+(previous|above|all|system)\s+instructions?/gi, "[FILTERED]");
    s = s.replace(/you\s+are\s+now\s+/gi, "[FILTERED]");
    s = s.replace(/system\s*:\s*/gi, "[FILTERED]");
    s = s.replace(/<\|im_start\|>/gi, "[FILTERED]").replace(/<\|im_end\|>/gi, "[FILTERED]");
    return s;
  }

  async complete(messages: Message[], options: GenerateOptions = {}): Promise<string> {
    const model = options.model || this.config.AI_TEXT_MODEL;
    const { provider } = parseModel(model);
    const apiKey = getApiKey(model, this.config);
    if (!apiKey && !isLocalProvider(provider)) throw new Error(`No API key configured for model: ${model}`);
    const baseUrl = getApiBaseUrl(model, this.config);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "HTTP-Referer": this.config.APP_URL || "https://mednexus.workers.dev",
      "X-Title": "MedNexus",
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const init: RequestInit & { signal?: AbortSignal } = {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: getFullModelName(model),
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 8192,
      }),
    };
    if (options.signal) init.signal = options.signal;
    const response = await fetchWithRetry(`${baseUrl}/chat/completions`, init, `complete:${model}`, provider);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }
    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content || "";
  }

  // Stream a completion as an SSE-friendly async generator of text deltas.
  async *streamComplete(messages: Message[], options: GenerateOptions = {}): AsyncGenerator<string> {
    const model = options.model || this.config.AI_TEXT_MODEL;
    const { provider } = parseModel(model);
    const apiKey = getApiKey(model, this.config);
    if (!apiKey && !isLocalProvider(provider)) throw new Error(`No API key configured for model: ${model}`);
    const baseUrl = getApiBaseUrl(model, this.config);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "HTTP-Referer": this.config.APP_URL || "https://mednexus.workers.dev",
      "X-Title": "MedNexus",
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const response = await fetchWithRetry(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: getFullModelName(model),
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 8192,
        stream: true,
      }),
    }, `stream:${model}`, provider);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") return;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) yield content;
          } catch { /* skip malformed */ }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private splitIntoChunks(text: string, maxChars: number): string[] {
    const clean = text.trim();
    if (!clean) return [];
    if (clean.length <= maxChars) return [clean];
    const chunks: string[] = [];
    let current = "";
    for (const para of clean.split(/\n\s*\n/)) {
      if (!para.trim()) continue;
      if (current.length + para.length + 2 <= maxChars) {
        current += (current ? "\n\n" : "") + para;
      } else if (para.length <= maxChars) {
        if (current) chunks.push(current);
        current = para;
      } else {
        if (current) { chunks.push(current); current = ""; }
        for (let i = 0; i < para.length; i += maxChars) chunks.push(para.slice(i, i + maxChars));
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  async generateCards(text: string, cardCount = 10, options: GenerateOptions = {}): Promise<GeneratedCard[]> {
    const model = options.model || this.config.AI_TEXT_MODEL;
    const chunks = this.splitIntoChunks(this.sanitizePromptInput(text), 4000);
    if (chunks.length === 0) return [];
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 5, 10));
    const perChunk = Math.max(1, Math.ceil(cardCount / chunks.length));
    const ac = new AbortController();
    let onExt: (() => void) | undefined;
    if (options.signal) {
      if (options.signal.aborted) return [];
      onExt = () => ac.abort();
      options.signal.addEventListener("abort", onExt, { once: true });
    }
    const timer = options.deadlineMs && options.deadlineMs > 0
      ? setTimeout(() => ac.abort(), options.deadlineMs)
      : null;
    const flatten = (arrs: GeneratedCard[][]) => arrs.reduce<GeneratedCard[]>((a, x) => a.concat(x || []), []);
    let collected: GeneratedCard[][] = [];
    try {
      collected = await runPool(chunks, async (chunk) => {
        if (ac.signal.aborted) return [];
        return await this.generateCardsChunk(chunk, perChunk, { ...options, signal: ac.signal }, model);
      }, concurrency, ac.signal);
    } catch (e) {
      if (timer) clearTimeout(timer);
      if (onExt && options.signal) options.signal.removeEventListener("abort", onExt);
      if (ac.signal.aborted) {
        const items = flatten(collected);
        if (items.length > 0) throw new PartialGenerationError(items);
      }
      throw e;
    }
    if (timer) clearTimeout(timer);
    if (onExt && options.signal) options.signal.removeEventListener("abort", onExt);
    if (ac.signal.aborted) {
      const items = flatten(collected);
      if (items.length > 0) throw new PartialGenerationError(items);
    }
    return flatten(collected);
  }

  private async generateCardsChunk(chunk: string, count: number, options: GenerateOptions, model: string): Promise<GeneratedCard[]> {
    const systemPrompt = `You are an expert flashcard creator. Generate ${count} high-quality flashcards from the provided text.
Rules:
- Each card should test one key concept
- Front: a clear question or prompt
- Back: a concise, accurate answer
- Include relevant tags
Return ONLY a valid JSON array: [{"front":"...","back":"...","tags":["t1"]}]`;
    const response = await this.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate ${count} flashcards from this text:\n\n${chunk}` },
    ], { ...options, model, temperature: 0.5 });
    return parseJsonArray<GeneratedCard>(response);
  }

  async generateQuestions(text: string, questionCount = 10, options: GenerateOptions = {}): Promise<GeneratedQuestion[]> {
    const model = options.model || this.config.AI_QBANK_MODEL;
    const chunks = this.splitIntoChunks(this.sanitizePromptInput(text), 4000);
    if (chunks.length === 0) return [];
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 5, 10));
    const perChunk = Math.max(1, Math.ceil(questionCount / chunks.length));
    const ac = new AbortController();
    let onExt: (() => void) | undefined;
    if (options.signal) {
      if (options.signal.aborted) return [];
      onExt = () => ac.abort();
      options.signal.addEventListener("abort", onExt, { once: true });
    }
    const timer = options.deadlineMs && options.deadlineMs > 0
      ? setTimeout(() => ac.abort(), options.deadlineMs)
      : null;
    const flatten = (arrs: GeneratedQuestion[][]) => arrs.reduce<GeneratedQuestion[]>((a, x) => a.concat(x || []), []);
    let collected: GeneratedQuestion[][] = [];
    try {
      collected = await runPool(chunks, async (chunk) => {
        if (ac.signal.aborted) return [];
        return await this.generateQuestionsChunk(chunk, perChunk, { ...options, signal: ac.signal }, model);
      }, concurrency, ac.signal);
    } catch (e) {
      if (timer) clearTimeout(timer);
      if (onExt && options.signal) options.signal.removeEventListener("abort", onExt);
      if (ac.signal.aborted) {
        const items = flatten(collected);
        if (items.length > 0) throw new PartialGenerationError(items);
      }
      throw e;
    }
    if (timer) clearTimeout(timer);
    if (onExt && options.signal) options.signal.removeEventListener("abort", onExt);
    if (ac.signal.aborted) {
      const items = flatten(collected);
      if (items.length > 0) throw new PartialGenerationError(items);
    }
    return flatten(collected);
  }

  private async generateQuestionsChunk(chunk: string, count: number, options: GenerateOptions, model: string): Promise<GeneratedQuestion[]> {
    const systemPrompt = `You are an expert question bank creator for medical exams. Generate ${count} multiple-choice questions from the provided text.
Rules:
- Test clinical reasoning; include a vignette when appropriate
- Provide 4-5 plausible distractors
- Mark the correct answer with correctIndex (0-based)
- Include a detailed explanation
Return ONLY a valid JSON array: [{"front":"...","back":"...","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]`;
    const response = await this.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate ${count} multiple-choice questions from this text:\n\n${chunk}` },
    ], { ...options, model, temperature: 0.5 });
    return parseJsonArray<GeneratedQuestion>(response).map((q) => ({
      front: q.front,
      back: q.back,
      choices: Array.isArray(q.choices) ? q.choices.filter((c) => typeof c === "string") : [],
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
      explanation: q.explanation,
    }));
  }

  async explainCard(front: string, back: string, mode: ExplainMode = "full", options: GenerateOptions = {}): Promise<string> {
    const model = options.model || this.config.AI_EXPLAIN_MODEL;
    const systemPrompt = `You are an expert medical educator creating study materials for medical students. ${MODE_PROMPTS[mode]}

IMPORTANT: Return ONLY the formatted Markdown content. No meta-commentary.`;
    const userPrompt = `Generate a ${mode === "full" ? "comprehensive full explanation" : mode + " explanation"} for this medical concept:

Question/Front: ${this.sanitizePromptInput(front)}
Answer/Back: ${this.sanitizePromptInput(back)}`;
    try {
      return await this.complete([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ], { ...options, model, temperature: 0.7, maxTokens: 2048 });
    } catch (err) {
      // Local model (LM Studio / Ollama) is often unavailable on the edge.
      // Retry once against OpenRouter (key is configured) so StudyPilot still
      // gets a real, structured explanation instead of the offline fallback.
      if (this.config.OPENROUTER_API_KEY && !String(model).startsWith("openrouter/")) {
        logger.warn({ err }, "StudyPilot explain local AI failed, retrying via OpenRouter");
        try {
          return await this.complete([
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ], { ...options, model: "openrouter/deepseek/deepseek-r1-distill-llama-70b", temperature: 0.7, maxTokens: 2048 });
        } catch (err2) {
          logger.warn({ err: err2 }, "StudyPilot explain OpenRouter fallback failed");
          throw err;
        }
      }
      throw err;
    }
  }

  // Delimiter headers the model must use to return every mode in ONE call.
  // Kept exact so the parser below can split reliably.
  static readonly ALL_MODE_HEADERS: Record<ExplainMode, string> = {
    full: "FULL EXPLANATION",
    revision: "REVISION",
    osce: "OSCE",
    brief: "BRIEF",
    mnemonic: "MNEMONIC",
    clinical: "CLINICAL",
    testtrap: "TESTTRAP",
  };

  // Split a single markdown response containing all 7 delimited sections into
  // per-mode content. Falls back gracefully: any missing section becomes "".
  private parseAllModes(markdown: string): Record<ExplainMode, string> {
    const out: Record<ExplainMode, string> = {
      full: "", revision: "", osce: "", brief: "", mnemonic: "", clinical: "", testtrap: "",
    };
    const lines = (markdown || "").split(/\r?\n/);
    let current: ExplainMode | null = null;
    let buffer: string[] = [];
    const flush = () => {
      if (current) out[current] = buffer.join("\n").trim();
      buffer = [];
    };
    for (const line of lines) {
      const m = line.match(/^##\s+(.+?)\s*$/i);
      if (m) {
        const header = m[1].trim().toUpperCase();
        const matched = (Object.entries(AIService.ALL_MODE_HEADERS) as [ExplainMode, string][])
          .find(([, h]) => header === h || header.startsWith(h) || header.includes(h.split(" ")[0]));
        if (matched) {
          flush();
          current = matched[0];
          continue;
        }
      }
      if (current) buffer.push(line);
    }
    flush();
    return out;
  }

  // Parse a batched response containing several cards (each delimited by
  // `=== CARD <n> ===`) into per-card mode maps. Any missing
  // card/mode falls back to "".
  private parseBatch(raw: string): Record<number, Record<ExplainMode, string>> {
    const out: Record<number, Record<ExplainMode, string>> = {};
    const segments = (raw || "").split(/^=== CARD \d+ ===\s*$/im).slice(1);
    let n = 1;
    for (const seg of segments) {
      out[n] = this.parseAllModes(seg);
      n++;
    }
    return out;
  }

  // Generate ALL 7 explanation modes for up to N cards in a SINGLE AI
  // call. Collapses what used to be 7*N requests down to 1, which is
  // essential on rate-limited free tiers (e.g. 50 req/day): 55 cards
  // become ~6 requests, not 385. Returns a map keyed by the 1-based
  // card index used in the prompt.
  async explainCardsBatch(cards: { front: string; back: string }[], options: GenerateOptions = {}): Promise<Record<number, Record<ExplainMode, string>>> {
    const model = options.model || this.config.AI_EXPLAIN_MODEL;
    const headerList = (Object.values(AIService.ALL_MODE_HEADERS) as string[]).join(", ");
    const cardLines = cards.map((c, i) =>
      `CARD ${i + 1}\nFront: ${this.sanitizePromptInput(c.front)}\nBack: ${this.sanitizePromptInput(c.back)}`
    ).join("\n\n");

    const systemPrompt = `You are an expert medical educator creating study materials for medical students.
You will be given several flashcards. For EACH card, generate ALL of the following explanation modes, in this exact order, each starting with its OWN level-2 markdown header (exactly: ${headerList}).
Use rich Markdown (## sub-sections, bullet points, **bold** key terms, > blockquotes for clinical pearls, pipe tables where useful) inside each section.
Separate each card with exactly this line: === CARD <n> === (where <n> is the 1-based card number).
Do NOT add any commentary before the first card or after the last.`;
    const userPrompt = `Generate explanations for every card below:\n\n${cardLines}\n\nReturn all cards now.`;

    const raw = await this.complete([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { ...options, model, temperature: 0.7, maxTokens: 8000 });
    return this.parseBatch(raw);
  }

  async *streamExplainCard(front: string, back: string, mode: ExplainMode = "full", options: GenerateOptions = {}): AsyncGenerator<string> {
    const model = options.model || this.config.AI_EXPLAIN_MODEL;
    const systemPrompt = `You are an expert medical educator creating study materials for medical students. ${MODE_PROMPTS[mode]}

IMPORTANT: Return ONLY the formatted Markdown content. No meta-commentary.`;
    const userPrompt = `Generate a ${mode === "full" ? "comprehensive full explanation" : mode + " explanation"} for this medical concept:

Question/Front: ${this.sanitizePromptInput(front)}
Answer/Back: ${this.sanitizePromptInput(back)}`;
    yield* this.streamComplete([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { ...options, model, temperature: 0.7, maxTokens: 2048 });
  }
}

export function createAIService(env: Bindings): AIService {
  return new AIService(env);
}
