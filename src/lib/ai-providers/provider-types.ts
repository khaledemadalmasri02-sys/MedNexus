export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: AIProvider;
  signal?: AbortSignal;
}

export interface AIChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

export interface AIStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: AIProvider;
  signal?: AbortSignal;
}

export type AIProvider = "lmstudio" | "ollama" | "openrouter" | "openai" | "groq" | "mistral" | "google" | "cloudflare";

export interface ProviderConfig {
  name: AIProvider;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  timeoutMs?: number;
}

export interface StationContext {
  stationId: number;
  patientProfileId: number;
  diagnosis: string;
  patientSymptoms: string[];
  hiddenInfo: {
    diagnosis?: string;
    riskFactors?: string[];
    redFlags?: string[];
    medicalHistory?: any[];
    vitalSigns?: any;
    painDescription?: string;
  };
  conversationHistory?: AIMessage[];
  emotion?: string;
  trustLevel?: number;
}

export interface PatientResponse {
  text: string;
  emotion: string;
  trustLevel: number;
  revealedInfo?: string[];
}