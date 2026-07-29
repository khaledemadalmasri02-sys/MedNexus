export interface Bindings {
  DB: D1Database;
  STUDYPILOT_DB: D1Database;
  ASSETS: Fetcher;
  LOCAL_DB?: D1Database;
  REDIS_URL?: string;
  KV?: KVNamespace;
  R2?: R2Bucket;
  NODE_ENV?: string;
  APP_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OLLAMA_CLOUD_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  LOCAL_AI_URL?: string;
  AI_TEXT_MODEL?: string;
  AI_VISION_MODEL?: string;
  AI_QBANK_MODEL?: string;
  AI_EXPLAIN_MODEL?: string;
  STUDY_BUDDY_MODEL?: string;
  LOCAL_AI_TIMEOUT_MS?: string;
  FREE_MAX_DECKS?: string;
  FREE_MAX_CARDS_PER_DECK?: string;
  ADMIN_SECRET_KEY?: string;
  ADMIN_ALLOWED_IP?: string;
  LM_STUDIO_URL?: string;
  OPENAI_MODEL?: string;
  OSCE_AI_MODEL?: string;
  OSCE_TEXT_MODEL?: string;
}

export interface SessionVariables {
  user?: import("./lib/auth").SessionUser;
  validated?: unknown;
  db?: import("./db/index").DB;
  flashcardDb?: import("./db/index").FlashcardDB;
  studypilotDb?: import("./db/index").StudyPilotDB;
  osceDb?: import("./db/index").OsceDB;
  requestId?: string;
}

export type AppEnv = { Bindings: Bindings; Variables: SessionVariables };

export type ApiResponse<T = unknown> = {
  data?: T;
  error?: {
    code: string;
    message: string;
    issues?: Array<{ path: string; message: string }>;
  };
};

export type SuccessResponse<T> = { data: T };
export type ErrorResponse = { error: { code: string; message: string; issues?: Array<{ path: string; message: string }> } };