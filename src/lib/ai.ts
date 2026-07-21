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
  // External abort signal (e.g. client disconnect). Cancels in-flight calls.
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
      const base = (config.LOCAL_AI_URL || "http://192.168.100.205:1234/v1").replace(/\/+$/, "");
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
// Self-hosted models (LM Studio over a tunnel) can be slow. The per-request
// local timeout is now configurable via LOCAL_AI_TIMEOUT_MS (default 0 = no
// timeout) so a slow-but-working model isn't cut off. The overall generation
// budget is still bounded separately by GEN_DEADLINE_MS.

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
  return /fetch failed|econnrefused|bad gateway|502|503|504|enotfound|network|aborted|timed out|timeout/i.test(msg);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Run `worker` over `items` with a bounded number of concurrent executions.
// Remaining work is skipped once `externalAbort` fires. A per-item error does
// NOT abort the whole pool: the failing item is recorded as undefined and the
// other items continue, so one stalling/failing chunk can't kill an entire
// generation batch. Abort errors are also swallowed (item skipped).
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
        // One chunk failing (local model stall, timeout, parse error, network)
        // must not abort the rest of the batch. Leave it undefined and move on;
        // the caller still returns whatever the other chunks produced.
        logger.warn({ err: (err as Error)?.message, index: i }, "runPool item failed, continuing batch");
        results[i] = undefined;
        continue;
      }
    }
  };
  const pool = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, () => exec());
  await Promise.all(pool);
  return results.filter((r): r is R => r !== undefined);
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
  if (out.length === 0) {
    throw new Error("Invalid response format from AI: no valid cards found in response");
  }
  return out;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit & { signal?: AbortSignal },
  label: string,
  provider = "openrouter",
  localTimeoutMs = 0,
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
    // Bound local/self-hosted requests so a stalled model fails fast. A
    // localTimeoutMs of 0 means no per-request timeout (let it run).
    const localTimeout = isLocalProvider(provider) && localTimeoutMs > 0
      ? setTimeout(() => controller.abort(), localTimeoutMs)
      : null;
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
    if (isLocalProvider(provider)) {
      // Local/self-hosted servers are best-effort. ANY failure here (stall,
      // abort, empty, network) should be reported as a provider-availability
      // error so callers fall back to offline generation instead of failing.
      const msg = (err?.message || err?.name || "AI request failed").toString();
      const wrapped = `AI request failed: ${msg}`;
      logger.warn({ label, err: msg }, "Local AI request failed, will fall back");
      throw new Error(wrapped);
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
      if (external && onExternal) external.removeEventListener("abort", onExternal);
      if (localTimeout) clearTimeout(localTimeout);
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
        // Qwen3 / reasoning models put the answer in `reasoning_content` and
        // leave `content` empty unless thinking is disabled. Disable it so the
        // OpenAI-style completion we parse comes back in `message.content`.
        enable_thinking: false,
        reasoning_format: "none",
      }),
    };
    if (options.signal) init.signal = options.signal;
    const response = await fetchWithRetry(`${baseUrl}/chat/completions`, init, `complete:${model}`, provider, this.config.LOCAL_AI_TIMEOUT_MS);
    if (!response.ok) {
      const error = await response.text();
      // Local/self-hosted servers (LM Studio) frequently answer with a 4xx/5xx
      // when the model isn't loaded or the tunnel drops. Route these as
      // provider-availability errors so callers fall back to offline generation
      // instead of surfacing a generic "Generation failed".
      if (isLocalProvider(provider)) {
        logger.warn({ status: response.status, error }, "Local AI returned an error, will fall back");
        throw new Error(`AI request failed: AI API error: ${response.status} - ${error}`);
      }
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }
    const data = (await response.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const content = data?.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) {
      throw new Error("Invalid response format from AI: empty completion (no JSON content)");
    }
    return content;
  }

  private async completeWithFallback(messages: Message[], options: GenerateOptions, attemptedModel: string): Promise<string> {
    try {
      return await this.complete(messages, options);
    } catch (primaryErr) {
      const { provider } = parseModel(attemptedModel);
      if (isLocalProvider(provider)) {
        logger.warn({ err: (primaryErr as Error)?.message, model: attemptedModel }, "Local AI failed, retrying locally");
        const fallbackModel = options.model?.includes("qbank") ? this.config.AI_QBANK_MODEL
          : options.model?.includes("vision") ? this.config.AI_VISION_MODEL
          : this.config.AI_TEXT_MODEL;
        if (fallbackModel && fallbackModel !== "not configured") {
          try {
            return await this.complete(messages, { ...options, model: fallbackModel });
          } catch (fbErr) {
            logger.warn({ err: (fbErr as Error)?.message }, "Local AI fallback also failed");
            throw primaryErr;
          }
        }
      }
      throw primaryErr;
    }
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
        enable_thinking: false,
        reasoning_format: "none",
      }),
    }, `stream:${model}`, provider, this.config.LOCAL_AI_TIMEOUT_MS);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    let hasContent = false;
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
            if (content) {
              hasContent = true;
              yield content;
            }
          } catch { /* skip malformed */ }
        }
      }
      if (!hasContent) {
        throw new Error("Invalid response format from AI: empty streaming response (no JSON content)");
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
    // No overall deadline: generation runs until the model finishes every
    // chunk. Only an external abort signal (e.g. client disconnect) cancels.
    const ac = new AbortController();
    let onExt: (() => void) | undefined;
    if (options.signal) {
      if (options.signal.aborted) return [];
      onExt = () => ac.abort();
      options.signal.addEventListener("abort", onExt, { once: true });
    }
    const flatten = (arrs: GeneratedCard[][]) => arrs.reduce<GeneratedCard[]>((a, x) => a.concat(x || []), []);
    logger.info({ chunks: chunks.length, concurrency, perChunk }, "generateCards: starting parallel chunk pool");
    try {
      return flatten(await runPool(chunks, async (chunk) => {
        if (ac.signal.aborted) return [];
        return await this.generateCardsChunk(chunk, perChunk, { ...options, signal: ac.signal }, model);
      }, concurrency, ac.signal));
    } finally {
      if (onExt && options.signal) options.signal.removeEventListener("abort", onExt);
    }
  }

  private async generateCardsChunk(chunk: string, count: number, options: GenerateOptions, model: string): Promise<GeneratedCard[]> {
    const systemPrompt = `You are an expert flashcard creator. Generate ${count} high-quality flashcards from the provided text.

Rules:
- Each card should test ONE key concept
- Front: a clear, specific question or prompt (1-2 sentences max)
- Back: a concise, accurate answer (1-3 sentences max)  
- Include relevant tags as an array of strings
- Each card must have NON-EMPTY front and back after trimming
- Return ONLY a valid JSON array - nothing else, no code fences, no explanations

VALIDATION (MUST FOLLOW):
- Validate each card: front and back must be non-empty strings
- Count must match the number of cards returned
- Tags array can be empty but must be valid JSON
- If any card fails validation, regenerate that card only

Return format: [{"front":"?","back":"?","tags":[]}]`;
    const response = await this.completeWithFallback([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate ${count} flashcards from this text:\n\n${chunk}` },
    ], { ...options, model, temperature: 0.5, maxTokens: 4000 }, model);
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
    const flatten = (arrs: GeneratedQuestion[][]) => arrs.reduce<GeneratedQuestion[]>((a, x) => a.concat(x || []), []);
    try {
      return flatten(await runPool(chunks, async (chunk) => {
        if (ac.signal.aborted) return [];
        return await this.generateQuestionsChunk(chunk, perChunk, { ...options, signal: ac.signal }, model);
      }, concurrency, ac.signal));
    } finally {
      if (onExt && options.signal) options.signal.removeEventListener("abort", onExt);
    }
  }

  private async generateQuestionsChunk(chunk: string, count: number, options: GenerateOptions, model: string): Promise<GeneratedQuestion[]> {
    const systemPrompt = `You are an expert question bank creator for medical exams. Generate ${count} multiple-choice questions from the provided text.

Rules:
- Test clinical reasoning; include a vignette when appropriate
- Provide 4-5 plausible distractors (choices array)
- Mark the correct answer with correctIndex (0-based integer)
- Include a detailed explanation
- Front and back must be non-empty strings after trimming
- Choices must be an array of non-empty strings
- correctIndex must be a valid integer within choices array bounds

VALIDATION (MUST FOLLOW):
- Validate each question: front, back, choices, correctIndex all present
- Choices array must have 3-5 items
- correctIndex must be >= 0 and < choices.length
- Explanation is optional but recommended
- Return ONLY a valid JSON array - nothing else

Return format: [{"front":"?","back":"?","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]`;
    const response = await this.completeWithFallback([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate ${count} multiple-choice questions from this text:\n\n${chunk}` },
    ], { ...options, model, temperature: 0.5, maxTokens: 4000 }, model);
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
      logger.warn({ err }, "Local AI explain failed");
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

  async *streamGenerateCards(text: string, count = 10, options: GenerateOptions = {}): AsyncGenerator<{ type: "progress" | "card"; data: GeneratedCard | { message: string } }> {
    const model = options.model || this.config.AI_TEXT_MODEL;
    const systemPrompt = `You are an expert flashcard creator. Generate ${count} high-quality flashcards from the provided text.

Rules:
- Each card should test ONE key concept
- Front: a clear, specific question or prompt (1-2 sentences max)
- Back: a concise, accurate answer (1-3 sentences max)  
- Include relevant tags as an array of strings
- Each card must have NON-EMPTY front and back after trimming
- Return ONLY a valid JSON array - nothing else, no code fences, no explanations

VALIDATION (MUST FOLLOW):
- Validate each card: front and back must be non-empty strings
- Count must match the number of cards returned
- Tags array can be empty but must be valid JSON
- If any card fails validation, regenerate that card only

Return format: [{"front":"?","back":"?","tags":[]}]`;
    const userPrompt = `Generate ${count} flashcards from this text:\n\n${this.sanitizePromptInput(text)}`;

    yield { type: "progress", data: { message: "Generating flashcards..." } };

    let fullResponse = "";
    for await (const chunk of this.streamComplete([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { ...options, model, temperature: 0.5, maxTokens: 4000 })) {
      fullResponse += chunk;
    }

    const cards = parseJsonArray<GeneratedCard>(fullResponse);
    for (const card of cards) {
      yield { type: "card", data: card };
    }
    yield { type: "progress", data: { message: `Generated ${cards.length} cards` } };
  }

  async *streamGenerateQuestions(text: string, count = 10, options: GenerateOptions = {}): AsyncGenerator<{ type: "progress" | "card"; data: GeneratedQuestion | { message: string } }> {
    const model = options.model || this.config.AI_QBANK_MODEL;
    const systemPrompt = `You are an expert question bank creator for medical exams. Generate ${count} multiple-choice questions from the provided text.

Rules:
- Test clinical reasoning; include a vignette when appropriate
- Provide 4-5 plausible distractors (choices array)
- Mark the correct answer with correctIndex (0-based integer)
- Include a detailed explanation
- Front and back must be non-empty strings after trimming
- Choices must be an array of non-empty strings
- correctIndex must be a valid integer within choices array bounds

VALIDATION (MUST FOLLOW):
- Validate each question: front, back, choices, correctIndex all present
- Choices array must have 3-5 items
- correctIndex must be >= 0 and < choices.length
- Explanation is optional but recommended
- Return ONLY a valid JSON array - nothing else

Return format: [{"front":"?","back":"?","choices":["A","B","C","D"],"correctIndex":0,"explanation":"..."}]`;
    const userPrompt = `Generate ${count} multiple-choice questions from this text:\n\n${this.sanitizePromptInput(text)}`;

    yield { type: "progress", data: { message: "Generating questions..." } };

    let fullResponse = "";
    for await (const chunk of this.streamComplete([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { ...options, model, temperature: 0.5, maxTokens: 4000 })) {
      fullResponse += chunk;
    }

    const questions = parseJsonArray<GeneratedQuestion>(fullResponse).map((q) => ({
      front: q.front,
      back: q.back,
      choices: Array.isArray(q.choices) ? q.choices.filter((c) => typeof c === "string") : [],
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
      explanation: q.explanation,
    }));

    for (const question of questions) {
      yield { type: "card", data: question };
    }
    yield { type: "progress", data: { message: `Generated ${questions.length} questions` } };
  }
}

export function createAIService(env: Bindings): AIService {
  return new AIService(env);
}
