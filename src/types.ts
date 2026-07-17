export interface Bindings {
  DB: D1Database;
  ASSETS: Fetcher;
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
  FREE_MAX_DECKS?: string;
  FREE_MAX_CARDS_PER_DECK?: string;
  ADMIN_SECRET_KEY?: string;
}

export interface SessionVariables {
  user?: import("./lib/auth").SessionUser;
  validated?: unknown;
  db?: import("./db/index").DB;
}

export type AppEnv = { Bindings: Bindings; Variables: SessionVariables };
