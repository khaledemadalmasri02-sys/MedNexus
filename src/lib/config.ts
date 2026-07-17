import type { Bindings } from "../types";

export type AppConfig = {
  NODE_ENV: string;
  APP_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  OPENROUTER_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OLLAMA_CLOUD_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  LOCAL_AI_URL?: string;
  AI_TEXT_MODEL: string;
  AI_VISION_MODEL: string;
  AI_QBANK_MODEL: string;
  AI_EXPLAIN_MODEL: string;
  STUDY_BUDDY_MODEL?: string;
  FREE_MAX_DECKS: number;
  FREE_MAX_CARDS_PER_DECK: number;
};

export function getConfig(env: Bindings): AppConfig {
  return {
    NODE_ENV: (env.NODE_ENV as string) || "production",
    APP_URL: env.APP_URL,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    GROQ_API_KEY: env.GROQ_API_KEY,
    OLLAMA_CLOUD_API_KEY: env.OLLAMA_CLOUD_API_KEY,
    MISTRAL_API_KEY: env.MISTRAL_API_KEY,
    GOOGLE_AI_API_KEY: env.GOOGLE_AI_API_KEY,
    LOCAL_AI_URL: env.LOCAL_AI_URL || "http://192.168.100.99:1234/v1",
    AI_TEXT_MODEL: env.AI_TEXT_MODEL || "not configured",
    AI_VISION_MODEL: env.AI_VISION_MODEL || "not configured",
    AI_QBANK_MODEL: env.AI_QBANK_MODEL || "not configured",
    AI_EXPLAIN_MODEL: env.AI_EXPLAIN_MODEL || "not configured",
    STUDY_BUDDY_MODEL: env.STUDY_BUDDY_MODEL,
    FREE_MAX_DECKS: Number(env.FREE_MAX_DECKS || 10),
    FREE_MAX_CARDS_PER_DECK: Number(env.FREE_MAX_CARDS_PER_DECK || 100),
  };
}
