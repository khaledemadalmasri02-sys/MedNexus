import { z } from "zod";

const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().default("./data/sqlite.db"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "fatal"]).default("info"),
  LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  LOG_TO_FILE: z.coerce.boolean().default(true),
  LOG_FILE_PATH: z.string().default("./logs/server.log"),

  // AI Provider Keys
  OPENROUTER_API_KEY: z.string().optional(),
  OLLAMA_CLOUD_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // AI Model Configuration
  AI_TEXT_MODEL: z.string().default("nvidia/nemotron-3-ultra-550b-a55b:free"),
  AI_VISION_MODEL: z.string().default("nvidia/nemotron-3-ultra-550b-a55b:free"),
  AI_QBANK_MODEL: z.string().default("nvidia/nemotron-3-ultra-550b-a55b:free"),
  AI_EXPLAIN_MODEL: z.string().default("nvidia/nemotron-3-ultra-550b-a55b:free"),
  STUDY_BUDDY_MODEL: z.string().default("poolside/laguna-xs.2:free"),

  // Style-specific AI Models
  ACADEMIC_MODEL: z.string().optional(),
  MODERN_MODEL: z.string().optional(),
  MINIMAL_MODEL: z.string().optional(),
  CLINICAL_MODEL: z.string().optional(),
  CORNELL_MODEL: z.string().optional(),
  SMART_BRIEFING_MODEL: z.string().optional(),

  // Shell Integration
  USE_SHELL_PDF_GENERATION: z.coerce.boolean().default(true),
  WKHTMLTOPDF_PATH: z.string().optional(),
  PANDOC_PATH: z.string().optional(),

  // Admin
  ADMIN_SECRET_KEY: z.string().optional(),
  ADMIN_IP_ALLOWLIST: z.string().optional(),

  // OIDC (optional)
  OIDC_ISSUER_URL: z.string().url().optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),

  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_TENANT_ID: z.string().default("common"),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY_PATH: z.string().optional(),

  // Email (SMTP)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("MedNexus <noreply@mednexus.com>"),
  SMTP_SECURE: z.coerce.boolean().default(false),

  // App URLs
  APP_URL: z.string().optional(),
  ADMIN_URL: z.string().optional(),

  // Agent Workspace
  AGENT_WORKSPACE_PATH: z.string().default("./workspaces"),

  // Free Tier Limits
  FREE_MAX_DECKS: z.coerce.number().int().positive().default(10),
  FREE_MAX_CARDS_PER_DECK: z.coerce.number().int().positive().default(100),

  // Summary
  SUMMARY_UPLOAD_PATH: z.string().default("./data/summary_uploads"),
  SUMMARY_OUTPUT_PATH: z.string().default("./data/summary_outputs"),

  // Backup
  BACKUP_PATH: z.string().default("./data/backups"),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  BACKUP_MAX_COUNT: z.coerce.number().int().positive().default(50),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.message}`);
  }
  cachedConfig = parsed.data;
  return cachedConfig;
}

export function isProduction(): boolean {
  return getConfig().NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return getConfig().NODE_ENV !== "production";
}
