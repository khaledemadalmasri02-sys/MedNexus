/* eslint-disable @typescript-eslint/no-explicit-any */
// API Client for MedNexus Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

// Types
export interface Deck {
  id: number;
  name: string;
  description?: string | null;
  parentId?: number | null;
  kind: "deck" | "qbank";
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  cardCount?: number;
  subDecks?: Deck[];
}

export interface Card {
  id: number;
  deckId: number;
  front: string;
  back: string;
  tags?: string | null;
  cardType: string;
  choices?: string | null;
  correctIndex?: number | null;
  pageNumber?: number | null;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
  // Pre-generated study mode explanations
  explanationFull?: string | null;
  explanationRevision?: string | null;
  explanationOsce?: string | null;
  explanationBrief?: string | null;
  explanationMnemonic?: string | null;
  explanationClinical?: string | null;
  explanationTesttrap?: string | null;
  explanationsGeneratedAt?: string | null;
  // StudyPilot AI path
  aiFront?: string | null;
  aiBack?: string | null;
  aiExplanation?: string | null;
  aiGenerated?: boolean | null;
  source?: "ai" | "heuristic" | null;
}

export interface QBank {
  id: number;
  name: string;
  parentId?: number | null;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  questions?: Question[];
  subQbanks?: QBank[];
}

export interface Question {
  id: number;
  qbankId: number;
  front: string;
  back: string;
  choices?: string | null;
  correctIndex?: number | null;
  tags?: string | null;
  pageNumber?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationLog {
  id: number;
  type: string;
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  durationMs?: number | null;
  success: boolean;
  errorMessage?: string | null;
  createdAt: string;
  deckName?: string | null;
  deckId?: number | null;
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

export interface GenerateResponse {
  deck: Deck;
  cards: Card[];
  generationId: number;
  duration: number;
  usedOfflineFallback?: boolean;
}

export interface ExtractPDFResponse {
  text: string;
  pageCount: number;
  fileName: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
  type: string;
}

export interface ExtractTextResponse {
  text: string;
  wordCount: number;
  charCount: number;
}

export interface ExplainResponse {
  explanation: string;
  mode: string;
  front: string;
  back: string;
  title?: string;
  sections?: string[];
  generatedAt?: string;
}

export interface FullExplainResponse extends ExplainResponse {
  title: string;
  sections: string[];
}

export interface OfflineQueueItem {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  type: string;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items?: T[];
  generations?: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface DashboardStats {
  totalDecks: number;
  totalCards: number;
  totalQbanks: number;
  totalQuestions: number;
  recentGenerations: GenerationLog[];
  studyStreak: number;
}

export interface CardProgressReview {
  nextReviewDate: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  newMasteryPct: number;
}

export interface ReviewQueueCard {
  id: number;
  deckId: number;
  front: string;
  back: string;
  tags?: string | null;
  cardType: string;
  choices?: string | null;
  correctIndex?: number | null;
  progress: {
    easeFactor: number;
    intervalDays: number;
    repetitions: number;
    nextReviewDate: string;
    knownCount: number;
    unknownCount: number;
  } | null;
}

export interface ReviewQueue {
  cards: ReviewQueueCard[];
  total: number;
  dueCount: number;
  newCount: number;
}

export interface DeckProgress {
  total: number;
  dueToday: number;
  mastered: number;
  learning: number;
  new: number;
  masteryPct: number;
}

// API Error class
export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// Helper to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(
      error.error?.message || "An error occurred",
      error.error?.code || "UNKNOWN_ERROR",
      response.status
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// Auth token management
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem("auth_token");
  }
  return authToken;
}

function getCsrfToken(): string | null {
  try {
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// Base fetch with auth
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["x-csrf-token"] = csrfToken;
  }

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const isIdempotent = !options.method || options.method === "GET" || options.method === "HEAD";
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= (isIdempotent ? MAX_RETRIES : 0); attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      if (isIdempotent && isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        lastError = new ApiError(
          "Server temporarily unavailable",
          "RETRYABLE_ERROR",
          response.status
        );
        continue;
      }

      return handleResponse<T>(response);
    } catch (err) {
      lastError = err as Error;
      if (!isIdempotent || attempt >= MAX_RETRIES) throw err;
    }
  }

  throw lastError || new Error("Request failed after retries");
}

// File upload helper (without progress - for simple uploads)
async function uploadFile<T>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const formData = new FormData();
  formData.append("file", file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const headers: Record<string, string> = {};
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["x-csrf-token"] = csrfToken;
  }
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
    credentials: "include",
  });

  return handleResponse<T>(response);
}

// File upload helper WITH progress tracking using XMLHttpRequest
interface UploadProgressOptions {
  files: File[];
  onProgress: (progress: number) => void;
  fieldName?: string;
  additionalData?: Record<string, string>;
}

async function uploadFilesWithProgress<T>(
  endpoint: string,
  options: UploadProgressOptions
): Promise<T> {
  const { files, onProgress, fieldName = "files", additionalData } = options;
  const url = `${API_BASE_URL}${endpoint}`;
  
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    files.forEach(file => formData.append(fieldName, file));
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const xhr = new XMLHttpRequest();
    const token = getAuthToken();
    const csrfToken = getCsrfToken();
    
    xhr.open("POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (csrfToken) xhr.setRequestHeader("x-csrf-token", csrfToken);
    xhr.withCredentials = true;
    
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error("Invalid response")); }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new ApiError(
            error.error?.message || `Upload failed: ${xhr.statusText}`,
            error.error?.code || "UPLOAD_ERROR",
            xhr.status
          ));
        } catch {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      }
    };
    
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timeout"));
    xhr.send(formData);
  });
}

// SSE streaming helper
export function streamEvents(
  endpoint: string,
  body: Record<string, unknown>,
  onEvent: (event: string, data: unknown) => void,
  onError?: (error: Error) => void
): () => void {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();

  const startStream = async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }

      const token = getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        credentials: "include",
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.error?.message || "Stream error",
          error.error?.code || "STREAM_ERROR",
          response.status
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let pendingEvent = "message";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed) {
            pendingEvent = "message";
            continue;
          }

          if (trimmed.startsWith("event: ")) {
            pendingEvent = trimmed.slice(7);
            continue;
          }

          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              onEvent(pendingEvent, data);
            } catch {
              onEvent(pendingEvent, trimmed.slice(6));
            }
            pendingEvent = "message";
            continue;
          }

          if (trimmed.startsWith(":")) {
            continue;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onError?.(err as Error);
      }
    }
  };

  startStream();

  return () => controller.abort();
}

// ==================== API Methods ====================

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  emailVerified?: boolean;
  authProvider?: string;
}

export interface AuthResponse {
  user: AuthUser;
  isNewUser?: boolean;
  verificationSent?: boolean;
}

// Auth API
export const authApi = {
  login: (email: string, password: string, rememberMe?: boolean) =>
    apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, rememberMe }),
    }),

  register: (email: string, password: string, firstName?: string, lastName?: string, rememberMe?: boolean) =>
    apiFetch<AuthResponse & { verificationSent: boolean }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, firstName, lastName, rememberMe }),
    }),

  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  logoutAll: () => apiFetch("/auth/logout-all", { method: "POST" }),

  me: () => apiFetch<{ user: AuthUser | null }>("/auth/user"),

  loginWithGoogle: (idToken: string, rememberMe?: boolean) =>
    apiFetch<AuthResponse>("/auth/oauth/google", {
      method: "POST",
      body: JSON.stringify({ idToken, rememberMe }),
    }),

  loginWithMicrosoft: (accessToken: string, rememberMe?: boolean) =>
    apiFetch<AuthResponse>("/auth/oauth/microsoft", {
      method: "POST",
      body: JSON.stringify({ accessToken, rememberMe }),
    }),

  loginWithApple: (identityToken: string, fullName?: { givenName?: string; familyName?: string }, email?: string, rememberMe?: boolean) =>
    apiFetch<AuthResponse>("/auth/oauth/apple", {
      method: "POST",
      body: JSON.stringify({ identityToken, fullName, email, rememberMe }),
    }),

  sendVerification: (email: string) =>
    apiFetch<{ success: boolean }>("/auth/send-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyEmail: (token: string) =>
    apiFetch<{ success: boolean }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: (email: string) =>
    apiFetch<{ success: boolean }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ success: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    apiFetch<{ success: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  syncSettings: (settings: Record<string, unknown>) =>
    apiFetch<{ success: boolean; settings: UserSettings }>("/settings/sync", {
      method: "POST",
      body: JSON.stringify(settings),
    }),
};

// Decks API
export const decksApi = {
  list: () => apiFetch<Deck[]>("/decks"),

  get: (id: number) => apiFetch<Deck>(`/decks/${id}`),

  create: (data: { name: string; description?: string; parentId?: number; kind?: "deck" | "qbank" }) =>
    apiFetch<Deck>("/decks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<{ name: string; description: string; parentId: number; kind: string }>) =>
    apiFetch<Deck>(`/decks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/decks/${id}`, { method: "DELETE" }),

  getCards: (id: number) => apiFetch<Card[]>(`/decks/${id}/cards`),

  export: (id: number) => apiFetch<{ deckName: string; csv: string; cardCount: number }>(`/decks/${id}/export`),

  merge: (deckIds: number[], newDeckName: string, deleteOriginals?: boolean) =>
    apiFetch<Deck>("/decks/merge", {
      method: "POST",
      body: JSON.stringify({ deckIds, newDeckName, deleteOriginals }),
    }),

  move: (id: number, parentId: number | null) =>
    apiFetch<Deck>(`/decks/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ parentId }),
    }),

  tree: () => apiFetch<DeckTreeNode[]>("/decks/tree"),
};

export interface DeckTreeNode {
  id: number;
  name: string;
  kind: string;
  parentId: number | null;
  cardCount: number;
  children: DeckTreeNode[];
}

export interface QBankTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  questionCount: number;
  children: QBankTreeNode[];
}

// Cards API
export const cardsApi = {
  list: (deckId: number) => apiFetch<Card[]>(`/cards?deckId=${deckId}`),

  create: (data: { deckId: number; front: string; back: string; cardType?: string; tags?: string; choices?: string; correctIndex?: number }) =>
    apiFetch<Card>("/cards", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<{ front: string; back: string; tags: string; cardType: string; choices: string; correctIndex: number }>) =>
    apiFetch<Card>(`/cards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/cards/${id}`, { method: "DELETE" }),

  regenerateBatch: (cardIds: number[]) =>
    apiFetch<{ regeneratedCount: number; cards: Card[]; message: string }>("/cards/regenerate-batch", {
      method: "POST",
      body: JSON.stringify({ cardIds }),
    }),
};

// Generate API
export const generateApi = {
  generate: (data: { text: string; deckName: string; cardCount?: number; deckType?: "deck" | "qbank" }) =>
    apiFetch<GenerateResponse>("/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  stream: (
    data: { text: string; deckName: string; cardCount?: number; deckType?: "deck" | "qbank" },
    onEvent: (event: string, data: unknown) => void,
    onError?: (error: Error) => void
  ) => streamEvents("/generate/stream", data, onEvent, onError),
};

// Extract API
export const extractApi = {
  extractPDF: (file: File) => uploadFile<ExtractPDFResponse>("/extract/pdf", file),

  extractPDFs: async (files: File[]): Promise<ExtractPDFResponse & { wordCount: number; fileCount: number; files: Array<{ fileName: string; pageCount: number; type: string }> }> => {
    const url = `${API_BASE_URL}/extract/pdf/batch`;
    
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
    
    const headers: Record<string, string> = {};
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    return handleResponse(response);
  },

  extractPDFsWithProgress: (
    files: File[],
    onProgress: (progress: number) => void,
  ): Promise<ExtractPDFResponse & { wordCount: number; fileCount: number; files: Array<{ fileName: string; pageCount: number; type: string }> }> => {
    return new Promise((resolve, reject) => {
      const url = `${API_BASE_URL}/extract/pdf/batch`;
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));
      const xhr = new XMLHttpRequest();
      const token = getAuthToken();
      xhr.open("POST", url);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error("Invalid response")); }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  },

  extractText: (text: string) =>
    apiFetch<ExtractTextResponse>("/extract/text", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  getFileInfo: (file: File) => uploadFile<{ fileName: string; fileSize: number; mimeType: string; pageCount: number; isPdf: boolean }>("/extract/info", file),
};

// Explain API
export const explainApi = {
  explain: (data: { front: string; back: string; mode?: "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap"; cardId?: number }) =>
    apiFetch<ExplainResponse>("/explain", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Dedicated full explanation endpoint with enhanced metadata
  fullExplain: (data: { front: string; back: string; topic?: string }) =>
    apiFetch<FullExplainResponse>("/explain/full", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  stream: (
    data: { front: string; back: string; mode?: "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap" },
    onEvent: (event: string, data: unknown) => void,
    onError?: (error: Error) => void
  ) => streamEvents("/explain/stream", data, onEvent, onError),

  batch: (cards: Array<{ front: string; back: string }>, mode?: string) =>
    apiFetch<{ results: ExplainResponse[]; count: number }>("/explain/batch", {
      method: "POST",
      body: JSON.stringify({ cards, mode }),
    }),
};

// Generations API
export const generationsApi = {
  list: (limit?: number, offset?: number) =>
    apiFetch<PaginatedResponse<GenerationLog>>(`/generations?limit=${limit || 50}&offset=${offset || 0}`),

  stats: () => apiFetch<{
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    totalDuration: number;
    avgDuration: number;
    totalTokens: number;
    byType: Array<{ type: string; count: number }>;
  }>("/generations/stats"),

  get: (id: number) => apiFetch<GenerationLog>(`/generations/${id}`),

  clear: (options?: { before?: string; type?: string }) =>
    apiFetch<void>("/generations", {
      method: "DELETE",
      body: JSON.stringify(options || {}),
    }),
};

// QBank API
export const qbanksApi = {
  list: () => apiFetch<QBank[]>("/qbanks"),

  get: (id: number) => apiFetch<QBank>(`/qbanks/${id}`),

  create: (data: { name: string; parentId?: number }) =>
    apiFetch<QBank>("/qbanks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<{ name: string; parentId: number }>) =>
    apiFetch<QBank>(`/qbanks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/qbanks/${id}`, { method: "DELETE" }),

  addQuestion: (qbankId: number, data: { front: string; back: string; choices?: string[]; correctIndex?: number; tags?: string }) =>
    apiFetch<Question>(`/qbanks/${qbankId}/questions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateQuestion: (qbankId: number, questionId: number, data: Partial<{ front: string; back: string; choices: string[]; correctIndex: number; tags: string }>) =>
    apiFetch<Question>(`/qbanks/${qbankId}/questions/${questionId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteQuestion: (qbankId: number, questionId: number) =>
    apiFetch<void>(`/qbanks/${qbankId}/questions/${questionId}`, { method: "DELETE" }),

  importFromDeck: (qbankId: number, deckId: number) =>
    apiFetch<{ imported: number; questions: Question[] }>(`/qbanks/${qbankId}/import`, {
      method: "POST",
      body: JSON.stringify({ deckId }),
    }),

  tree: () => apiFetch<QBankTreeNode[]>("/qbanks/tree"),
};

// Offline API
export const offlineApi = {
  queue: (type: string, payload: Record<string, unknown>) =>
    apiFetch<{ id: string; status: string; message: string }>("/offline/queue", {
      method: "POST",
      body: JSON.stringify({ type, payload }),
    }),

  getQueue: (status?: string) =>
    apiFetch<{ items: OfflineQueueItem[]; total: number }>(`/offline/queue${status ? `?status=${status}` : ""}`),

  getQueueItem: (id: string) => apiFetch<OfflineQueueItem>(`/offline/queue/${id}`),

  updateQueueItem: (id: string, data: { status?: string; result?: Record<string, unknown>; error?: string }) =>
    apiFetch<OfflineQueueItem>(`/offline/queue/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteQueueItem: (id: string) =>
    apiFetch<void>(`/offline/queue/${id}`, { method: "DELETE" }),

  clearQueue: () => apiFetch<void>("/offline/queue", { method: "DELETE" }),

  processQueue: () => apiFetch<{ processed: number; total: number }>("/offline/process", { method: "POST" }),
};

// Dashboard stats
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const [decks, generations] = await Promise.all([
      decksApi.list(),
      generationsApi.list(5),
    ]);

    const totalCards = decks.reduce((sum, d) => sum + (d.cardCount || 0), 0);

    return {
      totalDecks: decks.length,
      totalCards,
      totalQbanks: 0, // Will be fetched separately
      totalQuestions: 0,
      recentGenerations: generations.generations || [],
      studyStreak: 0, // Would need a study sessions table
    };
  },
};

// Planner API
export interface PlannerPlan {
  id: number;
  userId: string | null;
  title: string;
  description: string | null;
  color: string;
  dayOfWeek: number;
  startHour: number;
  durationMinutes: number;
  duration: number;
  deckId: number | null;
  deckName: string | null;
  recurrence: string;
  completed: boolean | number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasConflict?: boolean;
}

export interface PlannerWeekStats {
  totalSessions: number;
  completedSessions: number;
  totalMinutes: number;
  completedMinutes: number;
  perDay: Record<number, { total: number; completed: number }>;
}

export interface PlannerWeekResponse {
  plans: PlannerPlan[];
  stats: PlannerWeekStats;
}

export interface StudySession {
  id: number;
  userId: string | null;
  planId: number | null;
  deckId: number | null;
  deckName?: string | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  cardsStudied: number;
  knownCount: number | null;
  unknownCount: number | null;
  focusRating: number | null;
  createdAt: string;
}

export interface StudySessionStats {
  totalMinutes: number;
  totalSessions: number;
  avgSessionMin: number;
  dailyBreakdown: Array<{ date: string; minutes: number; sessions: number }>;
}

const PLANNERS_BASE = "/planners";
const STUDY_SESSIONS_BASE = "/study-sessions";

export const plannersApi = {
  list: (day?: number) =>
    apiFetch<PlannerPlan[]>(`${PLANNERS_BASE}${day !== undefined ? `?day=${day}` : ""}`),

  today: () => apiFetch<PlannerPlan[]>(`${PLANNERS_BASE}/today`),

  week: () => apiFetch<PlannerWeekResponse>(`${PLANNERS_BASE}/week`),

  create: (data: { title: string; description?: string; color?: string; dayOfWeek: number; startHour: number; durationMinutes?: number; deckId?: number; recurrence?: string }) =>
    apiFetch<PlannerPlan>(PLANNERS_BASE, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<{ title: string; description: string; color: string; dayOfWeek: number; startHour: number; durationMinutes: number; deckId: number; recurrence: string }>) =>
    apiFetch<PlannerPlan>(`${PLANNERS_BASE}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<void>(`${PLANNERS_BASE}/${id}`, { method: "DELETE" }),

  complete: (id: number) =>
    apiFetch<PlannerPlan>(`${PLANNERS_BASE}/${id}/complete`, { method: "POST" }),

  uncomplete: (id: number) =>
    apiFetch<PlannerPlan>(`${PLANNERS_BASE}/${id}/uncomplete`, { method: "POST" }),

  streak: () => apiFetch<{ currentStreak: number }>(`${PLANNERS_BASE}/streak`),

  expand: (id: number, weeks?: number) =>
    apiFetch<{ planId: number; weeks: number; created: number }>(`${PLANNERS_BASE}/${id}/expand`, {
      method: "POST",
      body: JSON.stringify({ weeks }),
    }),

  streakHistory: (days?: number) =>
    apiFetch<{ days: Array<{ date: string; plannedMinutes: number; actualMinutes: number; sessionsCompleted: number; hasActivity: boolean }> }>(`${PLANNERS_BASE}/streak-history${days ? `?days=${days}` : ""}`),

  exportIcs: () => {
    const url = `${API_BASE_URL}${PLANNERS_BASE}/export/ics`;
    return fetch(url, { credentials: "include" }).then((r) => r.text());
  },
};

export interface StudyExam {
  id: number;
  userId: string | null;
  title: string;
  subject: string | null;
  examDate: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export const examsApi = {
  list: () => apiFetch<StudyExam[]>("/study-exams"),

  create: (data: { title: string; subject?: string; examDate: string; color?: string }) =>
    apiFetch<StudyExam>("/study-exams", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<{ title: string; subject: string; examDate: string; color: string }>) =>
    apiFetch<StudyExam>(`/study-exams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<void>(`/study-exams/${id}`, { method: "DELETE" }),
};

export const studySessionsApi = {
  start: (data: { planId?: number; deckId?: number }) =>
    apiFetch<StudySession>(STUDY_SESSIONS_BASE, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { cardsStudied?: number; knownCount?: number; unknownCount?: number }) =>
    apiFetch<StudySession>(`${STUDY_SESSIONS_BASE}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  end: (id: number, data: { cardsStudied?: number; knownCount?: number; unknownCount?: number; focusRating?: number }) =>
    apiFetch<StudySession>(`${STUDY_SESSIONS_BASE}/${id}/end`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  stats: () => apiFetch<StudySessionStats>(`${STUDY_SESSIONS_BASE}/stats`),

  focusAverage: (days?: number) =>
    apiFetch<{ average: number | null; count: number; days: number }>(
      `${STUDY_SESSIONS_BASE}/focus-average${days ? `?days=${days}` : ""}`
    ),

  history: (limit?: number, offset?: number) =>
    apiFetch<{ sessions: StudySession[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>(
      `${STUDY_SESSIONS_BASE}/history?limit=${limit || 20}&offset=${offset || 0}`
    ),

  recent: (limit?: number) =>
    apiFetch<{ sessions: StudySession[] }>(`${STUDY_SESSIONS_BASE}/recent?limit=${limit || 10}`),

  summary: (days?: number) =>
    apiFetch<{ totalMinutes: number; sessionsCount: number; dailyBreakdown: Array<{ date: string; minutes: number; sessions: number }> }>(
      `${STUDY_SESSIONS_BASE}/summary?days=${days || 7}`
    ),
};

// Planner Templates API
export interface PlannerTemplate {
  id: number;
  userId: string | null;
  name: string;
  description: string | null;
  sessions: string;
  scheduleType: string;
  active: boolean | number;
  lastGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedPlanSession {
  title: string;
  dayOfWeek: number;
  startHour: number;
  durationMinutes: number;
  deckId: number | null;
  color: string;
  recurrence: string;
}

const TEMPLATES_BASE = "/planner-templates";
const NOTIFICATIONS_BASE = "/notifications";

export const plannerTemplatesApi = {
  list: () => apiFetch<PlannerTemplate[]>(TEMPLATES_BASE),

  create: (data: { name: string; description?: string; sessions?: string; scheduleType?: string }) =>
    apiFetch<PlannerTemplate>(TEMPLATES_BASE, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    apiFetch<void>(`${TEMPLATES_BASE}/${id}`, { method: "DELETE" }),

  generate: (id: number) =>
    apiFetch<{ created: number; plans: PlannerPlan[] }>(`${TEMPLATES_BASE}/${id}/generate`, { method: "POST" }),
};

export const plannerGenerateApi = {
  generate: (data: { examDate: string; studyDays: number[]; hoursPerDay: number; deckIds?: number[]; existingSessions?: Array<{ title: string; dayOfWeek: number; startHour: number; durationMinutes: number }> }) =>
    apiFetch<{ sessions: GeneratedPlanSession[]; daysUntilExam: number; studyDays: string }>("/planners/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  batchCreate: (sessions: Array<{ title: string; dayOfWeek: number; startHour: number; durationMinutes: number; deckId: number | null; color: string; recurrence: string }>) =>
    apiFetch<{ created: number; plans: PlannerPlan[] }>("/planners/batch-create", {
      method: "POST",
      body: JSON.stringify({ sessions }),
    }),
};

// Notifications API
export interface AppNotification {
  id: number;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean | number;
  actionUrl: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    apiFetch<{ notifications: AppNotification[]; unreadCount: number }>(`${NOTIFICATIONS_BASE}${unreadOnly ? '?unread=true' : ''}`),

  markRead: (id: number) =>
    apiFetch<void>(`${NOTIFICATIONS_BASE}/${id}/read`, { method: "POST" }),

  markAllRead: () =>
    apiFetch<void>(`${NOTIFICATIONS_BASE}/read-all`, { method: "POST" }),
};

// Summary API
export interface SummaryUploadedFile {
  id: string;
  name: string;
  size: number;
  path: string;
  type: string;
}

export interface SummaryJob {
  jobId: string;
  status: string;
}

export type SummaryStyle = "academic" | "modern" | "minimal" | "clinical" | "cornell" | "smart-briefing";

const SUMMARY_BASE = "/summary";

export const summaryApi = {
  upload: async (
    files: File[],
    onProgress?: (progress: number) => void
  ): Promise<{ files: SummaryUploadedFile[]; count: number }> => {
    if (onProgress) {
      return uploadFilesWithProgress(`${SUMMARY_BASE}/upload`, {
        files,
        onProgress,
        fieldName: "files",
      });
    }
    // Fallback to simple fetch if no progress callback
    const url = `${API_BASE_URL}${SUMMARY_BASE}/upload`;
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const headers: Record<string, string> = {};
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });
    return handleResponse(response);
  },

  generate: (fileIds: string[], style: SummaryStyle, generateAudio: boolean = false, mode: "combined" | "separate" = "combined") =>
    apiFetch<SummaryJob>(`${SUMMARY_BASE}/generate`, {
      method: "POST",
      body: JSON.stringify({ fileIds, style, generateAudio, mode }),
    }),

  download: (jobId: string): string =>
    `${API_BASE_URL}${SUMMARY_BASE}/download/${jobId}`,

  downloadIndex: (jobId: string, index: number): string =>
    `${API_BASE_URL}${SUMMARY_BASE}/download/${jobId}/${index}`,

  listJobFiles: (jobId: string) =>
    apiFetch<{
      files: Array<{
        index: number;
        fileName: string;
        status: string;
        progress: number;
        stage: string;
        error: string | null;
        downloadUrl: string | null;
        previewUrl: string | null;
      }>;
      mode: string;
      status: string;
      totalFiles: number;
      completedFiles: number;
    }>(`${SUMMARY_BASE}/files/${jobId}`),

  streamStatus: (
    jobId: string,
    onEvent: (event: Record<string, unknown>) => void,
    onError?: (error: Error) => void
  ): (() => void) => {
    const url = `${API_BASE_URL}${SUMMARY_BASE}/status/${jobId}`;
    let stopped = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let lastEventCount = 0;

    const poll = async () => {
      if (stopped) return;
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        const token = getAuthToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(url, {
          headers,
          credentials: "include",
        });

        if (!response.ok) {
          throw new ApiError("Status check failed", "STATUS_ERROR", response.status);
        }

        const data = await response.json();

        // Emit only new events since last poll
        const events = (data.events as Array<{ type: string; data: Record<string, unknown>; ts: number }>) || [];
        const newEvents = events.slice(lastEventCount);
        lastEventCount = events.length;

        for (const evt of newEvents) {
          onEvent(evt.data);
        }

        // If job is still running, poll again
        if (data.status === "running" || data.status === "pending") {
          pollTimer = setTimeout(poll, 1500);
        }
      } catch (err) {
        if (!stopped) {
          onError?.(err as Error);
        }
      }
    };

    // Start polling immediately
    poll();

    // Return cleanup function
    return () => {
      stopped = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  },

  delete: (jobId: string) =>
    apiFetch<void>(`${SUMMARY_BASE}/${jobId}`, { method: "DELETE" }),

  list: () =>
    apiFetch<{ summaries: Array<{
      id: string;
      fileName: string;
      size: number;
      createdAt: string;
      downloadUrl: string;
      previewUrl: string;
      sourceDeckIds: number[];
    }> }>(`${SUMMARY_BASE}/list`),

  previewUrl: (id: string) => `${API_BASE_URL}${SUMMARY_BASE}/preview/${id}`,
  previewUrlIndex: (id: string, index: number) =>
    `${API_BASE_URL}${SUMMARY_BASE}/preview/${id}_${index}`,
};

// Card Progress / Spaced Repetition API
export const cardProgressApi = {
  review: (cardId: number, quality: number) =>
    apiFetch<CardProgressReview>(`/cards/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ quality }),
    }),

  getReviewQueue: (deckId: number) =>
    apiFetch<ReviewQueue>(`/decks/${deckId}/review-queue`),

  getDeckProgress: (deckId: number) =>
    apiFetch<DeckProgress>(`/decks/${deckId}/progress`),

  getDueCount: () =>
    apiFetch<{ count: number }>("/review/due-count"),
};

export interface Tag {
  id: number;
  name: string;
  color: string;
}

export interface ExplanationProgress {
  deckId: number;
  total: number;
  completed: number;
  failed?: number;
  percentage?: number;
  status: "idle" | "running" | "complete" | "completed" | "failed" | "error";
}

// Tags API
export interface TagItem {
  id: number;
  name: string;
  color: string;
  deckCount: number;
  qbankCount: number;
  totalCount: number;
}

export const tagsApi = {
  list: () => apiFetch<TagItem[]>("/tags"),
  create: (data: { name: string; color?: string }) =>
    apiFetch<TagItem>("/tags", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; color?: string }) =>
    apiFetch<Tag>(`/tags/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch<void>(`/tags/${id}`, { method: "DELETE" }),
  addToDeck: (deckId: number, tagIds: number[]) =>
    apiFetch<void>(`/decks/${deckId}/tags`, { method: "POST", body: JSON.stringify({ tagIds }) }),
  removeFromDeck: (deckId: number, tagId: number) =>
    apiFetch<void>(`/decks/${deckId}/tags/${tagId}`, { method: "DELETE" }),
};

// Import/Export API
export interface ParsedImport {
  cards: Array<{ front: string; back: string; cardType: string; tags: string; error?: string }>;
  total: number;
  valid: number;
  invalid: number;
  format: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  total?: number;
  message?: string;
}

export const importExportApi = {
  parse: (text: string, format?: string) =>
    apiFetch<ParsedImport>("/import/parse", {
      method: "POST",
      body: JSON.stringify({ text, format }),
    }),

  importToDeck: (deckId: number, cards: Array<{ front: string; back: string; cardType?: string; tags?: string }>, skipDuplicates?: boolean) =>
    apiFetch<ImportResult>(`/decks/${deckId}/import`, {
      method: "POST",
      body: JSON.stringify({ cards, skipDuplicates }),
    }),
};

// AI Analysis API
export interface CardAnalysis {
  cardId: number;
  score: number;
  issues: string[];
  suggestion: string;
  duplicateOf?: number;
}

export interface DeckInsights {
  knowledgeGaps: Array<{ topic: string; severity: string; explanation: string }>;
  tooEasyCards: number[];
  recommendedNewCards: Array<{ topic: string; suggestedFront: string; suggestedBack: string }>;
  studyOrder: string[];
  curriculumAlignment: { percentage: number; covered: string[]; missing: string[] };
  summary: string;
}

export const aiAnalysisApi = {
  analyzeDeck: (deckId: number) =>
    apiFetch<{ analyses: CardAnalysis[]; cached?: boolean }>(`/decks/${deckId}/analyze`, { method: "POST" }),

  improveCard: (cardId: number) =>
    apiFetch<{ front: string; back: string; explanation: string }>(`/cards/${cardId}/improve`, { method: "POST" }),

  getDeckInsights: (deckId: number) =>
    apiFetch<{ insights: DeckInsights | null; message?: string }>(`/decks/${deckId}/insights`, { method: "POST" }),
};

// Explanations API
export interface ExplanationStats {
  total: number;
  withExplanations: number;
  withoutExplanations: number;
}

export const explanationsApi = {
  generate: (deckId: number) =>
    apiFetch<{ message: string; started: boolean; deckId: number }>(`/explanations/generate/${deckId}`, { method: "POST" }),

  getProgress: (deckId: number) =>
    apiFetch<{ progress: ExplanationProgress; stats: ExplanationStats }>(`/explanations/progress/${deckId}`),

  getStats: (deckId: number) =>
    apiFetch<ExplanationStats>(`/explanations/stats/${deckId}`),
};

export interface DashboardState {
  state: "new" | "caught_up" | "reviews_due" | "streak_at_risk" | "milestone";
  dueCards: number;
  streak: number;
  userName: string;
  milestoneText?: string;
}

export interface MasteryData {
  overall: number;
  byDeck: Array<{
    deckId: number; deckName: string; totalCards: number;
    masteredCards: number; learningCards: number; newCards: number;
    masteryPct: number; color: string;
  }>;
  trend: "improving" | "stable" | "declining";
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;
  studiedToday: boolean;
  todayMinutes: number;
  todayCardsStudied: number;
  dailyGoalMinutes: number;
  dailyGoalCards: number;
  weeklyStudyMinutes: number[];
  streakHistory: { date: string; minutes: number; cards: number }[];
}

export interface HeatmapData {
  days: { date: string; minutes: number; cards: number }[];
  totalMinutes: number;
  totalDays: number;
}

export interface QueueItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  estimatedMin: number;
  actionLabel: string;
  actionUrl: string;
  color: string;
}

export interface QueueData {
  items: QueueItem[];
  allClear: boolean;
}

export interface AchievementItem {
  id: number;
  userId: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
  seen: boolean;
}

export interface AchievementsResponse {
  recent: AchievementItem[];
  total: number;
  unseen: number;
}

export interface DashboardResponse {
  state: DashboardState;
  streak: StreakData;
  mastery: MasteryData;
  dueCards: number;
}

export const dashboardExtendedApi = {
  getState: async (): Promise<DashboardState> => {
    const data = await apiFetch<DashboardResponse>("/dashboard");
    return data.state;
  },
  getMastery: async (): Promise<MasteryData> => {
    const data = await apiFetch<DashboardResponse>("/dashboard");
    return data.mastery;
  },
  getStreak: async (): Promise<StreakData> => {
    const data = await apiFetch<DashboardResponse>("/dashboard");
    return data.streak;
  },
  updateGoals: (data: { dailyGoalMinutes?: number; dailyGoalCards?: number; reminderTime?: string; accentColor?: string; density?: string; soundEnabled?: boolean }) =>
    apiFetch("/dashboard/goals", { method: "PATCH", body: JSON.stringify(data) }),
  getHeatmap: async (): Promise<HeatmapData> => {
    const data = await apiFetch<DashboardResponse>("/dashboard");
    const days = data.streak.streakHistory.map(s => ({ date: s.date, minutes: s.minutes, cards: s.cards }));
    return {
      days,
      totalMinutes: days.reduce((sum, d) => sum + d.minutes, 0),
      totalDays: days.length,
    };
  },
  getQueue: () => apiFetch<QueueData>("/dashboard/queue"),
  getAchievements: () => apiFetch<AchievementsResponse>("/achievements"),
  markAchievementSeen: (id: number) => apiFetch(`/achievements/${id}/seen`, { method: "POST" }),
  checkAchievements: () => apiFetch<{ newlyUnlocked: Array<{ type: string; title: string; description: string; icon: string }> }>("/achievements/check"),
};

// Articles API
export interface ArticleTopic {
  name: string;
  cardCount: number;
}

export interface ArticleJob {
  id: string;
  deckId: number;
  topic: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  content?: string | null;
  outline?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleJobCreated {
  job: ArticleJob;
}

export interface ArticleJobList {
  jobs: ArticleJob[];
}

export const articlesApi = {
  getTopics: (deckId: number) =>
    apiFetch<{ topics: ArticleTopic[] }>(`/decks/${deckId}/topics`),

  createJob: (deckId: number, topic: string) =>
    apiFetch<ArticleJobCreated>(`/decks/${deckId}/article-jobs`, {
      method: "POST",
      body: JSON.stringify({ topic }),
    }),

  listJobs: (deckId: number) =>
    apiFetch<ArticleJobList>(`/decks/${deckId}/article-jobs`),

  getJob: (id: string) =>
    apiFetch<ArticleJob>(`/article-jobs/${id}`),

  streamJob: (
    id: string,
    onEvent: (event: string, data: unknown) => void,
    onError?: (error: Error) => void
  ): (() => void) => {
    const url = `${API_BASE_URL}/article-jobs/${id}/stream`;
    const controller = new AbortController();

    const start = async () => {
      try {
        const headers: Record<string, string> = { Accept: "text/event-stream" };
        const csrfToken = getCsrfToken();
        if (csrfToken) headers["x-csrf-token"] = csrfToken;
        const token = getAuthToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(url, {
          method: "GET",
          headers,
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new ApiError(
            error.error?.message || "Stream error",
            error.error?.code || "STREAM_ERROR",
            response.status
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let pendingEvent = "message";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              pendingEvent = "message";
              continue;
            }
            if (trimmed.startsWith("event: ")) {
              pendingEvent = trimmed.slice(7);
              continue;
            }
            if (trimmed.startsWith("data: ")) {
              try {
                onEvent(pendingEvent, JSON.parse(trimmed.slice(6)));
              } catch {
                onEvent(pendingEvent, trimmed.slice(6));
              }
              pendingEvent = "message";
              continue;
            }
            if (trimmed.startsWith(":")) continue;
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          onError?.(err as Error);
        }
      }
    };

    start();
    return () => controller.abort();
  },

  deleteJob: (id: string) =>
    apiFetch<void>(`/article-jobs/${id}`, { method: "DELETE" }),
};

export interface UserSettings {
  userId: string;
  dailyGoalMinutes: number;
  dailyGoalCards: number;
  reminderTime: string | null;
  accentColor: string;
  dashboardLayout: string | null;
  density: string;
  soundEnabled: boolean;
  streakFreezeUsedAt: string | null;
  theme: string;
  theme_id: string;
  theme_mode: string;
  animationsEnabled: boolean;
  fontSize: string;
  defaultStyle: string;
  defaultMode: string;
  autoTts: boolean;
  chunkSize: number;
  cardOrder: string;
  autoReveal: boolean;
  autoRevealSeconds: number;
  showExplanation: boolean;
  streakFreeze: boolean;
  emailNotifications: boolean;
  emailWeeklySummary: boolean;
  emailStreakAlert: boolean;
  pushNotifications: boolean;
  pushReminderTime: string;
  pushReviewDue: boolean;
  pushSessionComplete: boolean;
  inAppSounds: boolean;
  soundVolume: number;
  ambientEnabled: boolean;
  customCursorEnabled: boolean;
  ripplesEnabled: boolean;
  animationSpeed: number;
  reduceMotion: boolean;
  studyBuddyEnabled: boolean;
  smartReviewEnabled: boolean;
  deckDoctorEnabled: boolean;
  examSimulatorEnabled: boolean;
  contentSummarizerEnabled: boolean;
  mnemonicGeneratorEnabled: boolean;
  progressCoachEnabled: boolean;
  imageAnalyzerEnabled: boolean;
  voiceTutorEnabled: boolean;
  collaborativeStudyEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const settingsApi = {
  get: () => apiFetch<UserSettings>("/settings"),
  update: (data: Partial<UserSettings>) =>
    apiFetch<UserSettings>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  reset: () => apiFetch<UserSettings>("/settings/reset", { method: "POST" }),
  sync: (data: Record<string, unknown>) =>
    apiFetch<{ success: boolean; settings: UserSettings }>("/settings/sync", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export interface ChatMessage {
  id: number;
  userId: string;
  role: string;
  content: string;
  deckContext?: string | null;
  createdAt: string;
}

export interface SmartReviewResult {
  cards: any[];
  reasoning: string;
  focusAreas: string[];
  estimatedTime: number;
  stats: {
    totalCards: number;
    weakCards: number;
    overdueCards: number;
    atRiskCards: number;
    studySessions: number;
  };
}

export interface DeckDoctorResult {
  healthScore: number;
  issues: Array<{
    type: string;
    severity: string;
    cardId: number;
    relatedCardId?: number;
    message: string;
  }>;
  fixes: Array<{
    type: string;
    cardId: number;
    relatedCardId?: number;
    message: string;
  }>;
  totalCards: number;
}

export interface ExamQuestion {
  front: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string;
  topic: string;
}

export interface Exam {
  id: number;
  userId: string;
  title: string;
  deckIds: string;
  questions: string;
  answers?: string | null;
  score?: number | null;
  totalQuestions: number;
  durationMinutes?: number | null;
  createdAt: string;
}

export interface ExamResult {
  score: number;
  correct: number;
  total: number;
  results: Array<{
    questionIndex: number;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
    explanation: string;
  }>;
  topicBreakdown: Array<{
    topic: string;
    correct: number;
    total: number;
    percentage: number;
  }>;
  weakTopics: string[];
}

export interface SummaryResult {
  summary: {
    title: string;
    keyPoints: string[];
    definitions: Array<{ term: string; definition: string }>;
    clinicalPearls: string[];
    suggestedCards: Array<{ front: string; back: string; tags: string[] }>;
    summary: string;
  };
}

export interface MnemonicResult {
  mnemonics: Array<{
    type: string;
    title: string;
    content: string;
    explanation: string;
  }>;
}

export interface CoachResult {
  stats: {
    totalSessions: number;
    totalCardsStudied: number;
    overallAccuracy: number;
    daysSinceLastSession: number;
    totalDecks: number;
    totalCards: number;
  };
  patterns: {
    bestDay: string;
    bestHour: string;
    averageSessionLength: number;
  };
  weakTopics: string[];
  strongTopics: string[];
  recommendations: string[];
  weeklyPlan: Array<{
    day: string;
    focus: string;
    duration: number;
  }>;
}

export interface ImageAnalysisResult {
  findings: string;
  diagnosis: string;
  teachingPoints: string[];
  cards: Array<{ front: string; back: string; tags: string[] }>;
}

export interface VoiceCheckResult {
  correct: boolean;
  feedback: string;
  keyPoints: string[];
  score: number;
}

export interface GroupStudyRoom {
  id: string;
  hostUserId: string;
  deckIds: string;
  status: string;
  currentQuestionIndex: number;
  questions: string;
  participants: string;
  createdAt: string;
  updatedAt: string;
}

export const agentsApi = {
  chat: async (message: string, deckId?: number, onChunk?: (chunk: string) => void, onDone?: () => void, onError?: (err: Error) => void) => {
    const url = `${API_BASE_URL}/agents/chat`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const mode = (() => {
      try { return localStorage.getItem("chat_mode") || "academic"; } catch { return "academic"; }
    })();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ message, deckId, mode }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(error.error?.message || "Chat error", error.error?.code || "CHAT_ERROR", response.status);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";

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
          if (data === "[DONE]") { onDone?.(); return; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) onChunk?.(parsed.chunk);
          } catch { /* skip */ }
        }
      }
      onDone?.();
    } catch (err) {
      onError?.(err as Error);
    }
  },
  getChatHistory: (limit?: number, before?: string) =>
    apiFetch<{ messages: ChatMessage[] }>(`/agents/chat/history${limit ? `?limit=${limit}` : ""}${before ? `&before=${before}` : ""}`),
  clearChatHistory: () =>
    apiFetch("/agents/chat/history", { method: "DELETE" }),
  smartReview: (deckId?: number, count?: number) =>
    apiFetch<SmartReviewResult>("/agents/smart-review", {
      method: "POST",
      body: JSON.stringify({ deckId, count }),
    }),
  deckDoctor: (deckId: number) =>
    apiFetch<DeckDoctorResult>("/agents/deck-doctor", {
      method: "POST",
      body: JSON.stringify({ deckId }),
    }),
  deckDoctorFix: (cardId: number, fixType: string, relatedCardId?: number) =>
    apiFetch<{ success: boolean; result: any }>("/agents/deck-doctor/fix", {
      method: "POST",
      body: JSON.stringify({ cardId, fixType, relatedCardId }),
    }),
  generateExam: (deckIds: number[], questionCount?: number, durationMinutes?: number, title?: string) =>
    apiFetch<{ exam: Exam & { questions: ExamQuestion[] }; message: string }>("/agents/generate-exam", {
      method: "POST",
      body: JSON.stringify({ deckIds, questionCount, durationMinutes, title }),
    }),
  getExams: () =>
    apiFetch<{ exams: Exam[] }>("/agents/exams"),
  getExam: (id: number) =>
    apiFetch<{ exam: Exam & { questions: ExamQuestion[] } }>(`/agents/exams/${id}`),
  submitExam: (id: number, answers: Record<number, number>) =>
    apiFetch<ExamResult>(`/agents/exams/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    }),
  summarize: (content: string, fileName?: string) =>
    apiFetch<SummaryResult>("/agents/summarize", {
      method: "POST",
      body: JSON.stringify({ content, fileName }),
    }),
  generateMnemonics: (concept?: string, cardIds?: number[], deckId?: number) =>
    apiFetch<MnemonicResult>("/agents/mnemonics", {
      method: "POST",
      body: JSON.stringify({ concept, cardIds, deckId }),
    }),
  saveMnemonic: (cardId: number, mnemonic: string) =>
    apiFetch<{ success: boolean }>("/agents/mnemonics/save", {
      method: "POST",
      body: JSON.stringify({ cardId, mnemonic }),
    }),
  getCoach: () =>
    apiFetch<CoachResult>("/agents/coach"),
  analyzeImage: (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const headers: Record<string, string> = {};
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}/agents/image-analyze`, {
      method: "POST",
      body: formData,
      headers,
      credentials: "include",
    }).then(r => handleResponse<ImageAnalysisResult>(r));
  },
  voiceCheck: (cardFront: string, cardBack: string, spokenAnswer: string) =>
    apiFetch<VoiceCheckResult>("/agents/voice-check", {
      method: "POST",
      body: JSON.stringify({ cardFront, cardBack, spokenAnswer }),
    }),
  createGroupRoom: (deckIds: number[]) =>
    apiFetch<{ room: GroupStudyRoom }>("/agents/group-study/create", {
      method: "POST",
      body: JSON.stringify({ deckIds }),
    }),
  joinGroupRoom: (roomId: string) =>
    apiFetch<{ room: GroupStudyRoom }>("/agents/group-study/join", {
      method: "POST",
      body: JSON.stringify({ roomId }),
    }),
  getGroupRoom: (roomId: string) =>
    apiFetch<{ room: GroupStudyRoom }>(`/agents/group-study/${roomId}`),
  generateGroupQuestion: (roomId: string) =>
    apiFetch<{ question: ExamQuestion; questionIndex: number }>("/agents/group-study/question", {
      method: "POST",
      body: JSON.stringify({ roomId }),
    }),
  getAgentUsage: () =>
    apiFetch<{ usage: any[]; byAgent: Record<string, any>; totalCalls: number }>("/agents/usage"),
};

export const submitFeedback = async (data: { type: string; rating: number; message: string }) =>
  apiFetch<{ success: boolean }>("/feedback", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const searchAll = async (query: string) =>
  apiFetch<{ decks: Array<{ id: number; name: string; cardCount: number }>; cards: Array<{ id: number; front: string; deckId: number; deckName: string }> }>(`/search?q=${encodeURIComponent(query)}`);

// Support API
export interface SupportSearchResult {
  id: number;
  question: string;
  answer: string;
  category: string;
  score: number;
}

export interface SupportSearchResponse {
  results: SupportSearchResult[];
  suggestions?: Array<{ id: number; question: string; category: string }>;
  query?: string;
}

export interface SupportAskResponse {
  answer: string;
  source: "knowledge" | "ai";
  knowledgeId: number | null;
  question: string;
  category: string;
  confidence: number;
}

export interface SupportCategoryResponse {
  categories: string[];
  total: number;
}

export interface SupportPopularResponse {
  questions: Array<{ id: number; question: string; category: string }>;
}

export const supportApi = {
  search: (query: string) =>
    apiFetch<SupportSearchResponse>(`/support/search?q=${encodeURIComponent(query)}`),
  ask: (question: string) =>
    apiFetch<SupportAskResponse>("/support/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
  rate: (knowledgeId: number, helpful: boolean) =>
    apiFetch<{ success: boolean }>("/support/rate", {
      method: "POST",
      body: JSON.stringify({ knowledgeId, helpful }),
    }),
  getCategories: () =>
    apiFetch<SupportCategoryResponse>("/support/categories"),
  getPopular: () =>
    apiFetch<SupportPopularResponse>("/support/popular"),
  chat: async (
    message: string,
    sessionId?: string,
    onChunk?: (chunk: string) => void,
    onSession?: (sessionId: string) => void,
    onDone?: () => void,
    onError?: (err: Error) => void
  ) => {
    const url = `${API_BASE_URL}/support/chat`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const csrfToken = getCsrfToken();
    if (csrfToken) headers["x-csrf-token"] = csrfToken;
    const token = getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ message, sessionId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(error.error?.message || "Chat error", error.error?.code || "CHAT_ERROR", response.status);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";

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
          if (data === "[DONE]") { onDone?.(); return; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.sessionId) { onSession?.(parsed.sessionId); continue; }
            if (parsed.chunk) onChunk?.(parsed.chunk);
          } catch { /* skip */ }
        }
      }
      onDone?.();
    } catch (err) {
      onError?.(err as Error);
    }
  },
  rateConversation: (conversationId: number, rating: number, feedback?: string) =>
    apiFetch<{ success: boolean }>(`/support/conversations/${conversationId}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating, feedback }),
    }),
  submitFeedback: (data: { type: string; rating?: number | null; message?: string }) =>
    apiFetch<{ success: boolean }>("/feedback", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getHistory: (sessionId: string) =>
    apiFetch<{ messages: Array<{ id: number; role: string; content: string; source?: string; createdAt: Date }> }>(`/support/history?sessionId=${sessionId}`),
};

// User Data & Privacy API
export interface StorageUsage {
  totalDecks: number;
  totalCards: number;
  totalSummaries: number;
  totalStudySessions: number;
  storageUsedMb: number;
  storageLimitMb: number;
}

export interface ExportJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  format: string;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BackupInfo {
  id: string;
  name: string;
  size: number;
  createdAt: string;
  userId?: string | null;
}

export interface BackupListResponse {
  backups: BackupInfo[];
}

export const userDataApi = {
  getStorageUsage: () => apiFetch<StorageUsage>("/user/storage"),

  exportData: (format: "json" | "csv" | "anki") =>
    apiFetch<ExportJob>("/user/export", {
      method: "POST",
      body: JSON.stringify({ format }),
    }),

  getExportStatus: (jobId: string) =>
    apiFetch<ExportJob>(`/user/export/${jobId}`),

  importData: (file: File, format?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (format) formData.append("format", format);
    return apiFetch<{ imported: number; skipped: number; message: string }>("/user/import", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": undefined as unknown as string },
    });
  },

  clearGenerationHistory: () =>
    apiFetch<{ deleted: number }>("/generations", { method: "DELETE" }),

  deleteAllData: () =>
    apiFetch<{ success: boolean }>("/user/data", { method: "DELETE" }),

  deleteAccount: () =>
    apiFetch<{ success: boolean }>("/user/account", { method: "DELETE" }),

  createBackup: () =>
    apiFetch<BackupInfo>("/backup/create", { method: "POST" }),

  listBackups: () =>
    apiFetch<BackupListResponse>("/backup/list"),

  downloadBackup: (backupId: string) =>
    `${API_BASE_URL}/backup/download/${backupId}`,

  restoreBackup: (backupId: string) =>
    apiFetch<{ success: boolean; message: string }>("/backup/restore", {
      method: "POST",
      body: JSON.stringify({ backupId }),
    }),

  deleteBackup: (backupId: string) =>
    apiFetch<{ success: boolean }>(`/backup/${backupId}`, { method: "DELETE" }),
};

// Export all APIs
export default {
  auth: authApi,
  decks: decksApi,
  cards: cardsApi,
  generate: generateApi,
  extract: extractApi,
  explain: explainApi,
  generations: generationsApi,
  qbanks: qbanksApi,
  offline: offlineApi,
  dashboard: dashboardApi,
  dashboardExtended: dashboardExtendedApi,
  summary: summaryApi,
  planners: plannersApi,
  studySessions: studySessionsApi,
  plannerTemplates: plannerTemplatesApi,
  plannerGenerate: plannerGenerateApi,
  notifications: notificationsApi,
  cardProgress: cardProgressApi,
  explanations: explanationsApi,
  tags: tagsApi,
  importExport: importExportApi,
  aiAnalysis: aiAnalysisApi,
  settings: settingsApi,
  agents: agentsApi,
  support: supportApi,
   userData: userDataApi,
};

function getAdminHeaders(): Record<string, string> {
  try {
    const key = window.localStorage.getItem("admin_key");
    return key ? { "x-admin-key": key } : {};
  } catch {
    return {};
  }
}

async function adminFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}/admin${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAdminHeaders(),
    ...((options.headers as Record<string, string>) || {}),
  };
  const response = await fetch(url, { ...options, headers, credentials: "include" });
  return handleResponse<T>(response);
}

export interface AdminStats {
  totalUsers: number;
  totalErrors: number;
  unresolvedErrors: number;
  totalFeedback: number;
}

export interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  isPro: boolean;
  authProvider: string;
  createdAt: Date;
}

export interface AdminError {
  id: number;
  errorType: string;
  errorCode: string | null;
  model: string;
  operation: string;
  inputHash: string;
  inputPreview: string | null;
  errorMessage: string;
  errorStack: string | null;
  context: string | null;
  resolved: boolean;
  resolutionNotes: string | null;
  fixPattern: string | null;
  occurrenceCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
}

export interface AdminFeedback {
  id: number;
  userId: string | null;
  type: string;
  message: string;
  rating: number | null;
  createdAt: Date;
  userEmail: string | null;
}

export const adminApi = {
  stats: (headers?: Record<string, string>) => adminFetch<AdminStats>("/stats", { headers }),

  listUsers: (limit = 50, offset = 0) =>
    adminFetch<{ users: AdminUser[]; total: number; limit: number; offset: number }>(`/users?limit=${limit}&offset=${offset}`),

  getUser: (id: string) => adminFetch<AdminUser>(`/users/${id}`),

  deleteUser: (id: string) =>
    adminFetch<{ success: boolean }>(`/users/${id}`, { method: "DELETE" }),

  listErrors: (params: { resolved?: string; model?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.resolved) qs.set("resolved", params.resolved);
    if (params.model) qs.set("model", params.model);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    return adminFetch<{ errors: AdminError[]; total: number; limit: number; offset: number }>(`/errors?${qs.toString()}`);
  },

  resolveError: (id: number, resolutionNotes: string, fixPattern: string) =>
    adminFetch<{ success: boolean; errorId: number }>(`/errors/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution_notes: resolutionNotes, fix_pattern: fixPattern }),
    }),

  clearResolvedErrors: () =>
    adminFetch<{ success: boolean; deleted: number }>("/errors/resolved", { method: "DELETE" }),

  listFeedback: (params: { type?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.type) qs.set("type", params.type);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    return adminFetch<{ items: AdminFeedback[]; total: number; limit: number; offset: number }>(`/feedback?${qs.toString()}`);
  },

  deleteFeedback: (id: number) =>
    adminFetch<{ success: boolean }>(`/feedback/${id}`, { method: "DELETE" }),
};

