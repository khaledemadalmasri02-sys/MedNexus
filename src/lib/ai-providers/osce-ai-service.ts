import type { AIProvider, ProviderConfig, AIMessage, AIChatOptions, AIChatResponse, AIStreamOptions } from "./provider-types";
import { BaseAIProvider } from "./base-provider";
import { LMStudioProvider } from "./lmstudio-provider";
import { OllamaProvider } from "./ollama-provider";
import { OpenAIProvider } from "./openai-provider";
import { OpenRouterProvider } from "./openrouter-provider";

export class AIProviderFactory {
  static createProvider(providerType: AIProvider, config: ProviderConfig) {
    switch (providerType) {
      case "lmstudio":
        return new LMStudioProvider({
          model: config.model,
          baseUrl: config.baseUrl,
          timeoutMs: config.timeoutMs,
        });

      case "ollama":
        return new OllamaProvider({
          model: config.model,
          baseUrl: config.baseUrl,
          timeoutMs: config.timeoutMs,
        });

      case "openai":
        return new OpenAIProvider({
          model: config.model,
          apiKey: config.apiKey!,
          baseUrl: config.baseUrl,
        });

      case "openrouter":
      case "groq":
      case "mistral":
      case "google":
        return new OpenRouterProvider({
          model: config.model,
          apiKey: config.apiKey!,
        });

      default:
        throw new Error(`Unknown AI provider: ${providerType}`);
    }
  }
}

export interface OSCEBindings {
  LM_STUDIO_URL?: string;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  GROQ_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  OSCE_AI_MODEL?: string;
  OSCE_TEXT_MODEL?: string;
  LOCAL_AI_URL?: string;
  LOCAL_AI_TIMEOUT_MS?: string;
  APP_URL?: string;
}

export class OSCEAIService {
  private providers: Map<AIProvider, BaseAIProvider> = new Map();
  private defaultProvider: AIProvider;
  private defaultModel: string;
  private bindings: OSCEBindings;

  constructor(bindings: OSCEBindings) {
    this.bindings = bindings;
    this.defaultProvider = this.determineDefaultProvider();
    this.defaultModel = bindings.OSCE_AI_MODEL || bindings.OSCE_TEXT_MODEL || "lmstudio/qwen3.5-4b";

    this.initializeProviders();
  }

  private determineDefaultProvider(): AIProvider {
    if (this.bindings.LM_STUDIO_URL) return "lmstudio";
    if (this.bindings.LOCAL_AI_URL) return "lmstudio";
    if (this.bindings.OPENAI_API_KEY) return "openai";
    if (this.bindings.OPENROUTER_API_KEY) return "openrouter";
    if (this.bindings.GROQ_API_KEY) return "groq";
    if (this.bindings.MISTRAL_API_KEY) return "mistral";
    if (this.bindings.GOOGLE_AI_API_KEY) return "google";
    return "lmstudio";
  }

  private initializeProviders(): void {
    const availableProviders: AIProvider[] = ["lmstudio", "ollama", "openai", "openrouter", "groq", "mistral", "google"];

    for (const provider of availableProviders) {
      if (this.isProviderAvailable(provider)) {
        const config = this.getProviderConfig(provider);
        try {
          const instance = AIProviderFactory.createProvider(provider, config);
          this.providers.set(provider, instance);
        } catch (error) {
          console.warn(`Failed to initialize provider ${provider}:`, error);
        }
      }
    }
  }

  private isProviderAvailable(provider: AIProvider): boolean {
    switch (provider) {
      case "lmstudio":
        return !!this.bindings.LM_STUDIO_URL || !!this.bindings.LOCAL_AI_URL;
      case "ollama":
        return !!this.bindings.LOCAL_AI_URL;
      case "openai":
        return !!this.bindings.OPENAI_API_KEY;
      case "openrouter":
        return !!this.bindings.OPENROUTER_API_KEY;
      case "groq":
        return !!this.bindings.GROQ_API_KEY;
      case "mistral":
        return !!this.bindings.MISTRAL_API_KEY;
      case "google":
        return !!this.bindings.GOOGLE_AI_API_KEY;
      default:
        return false;
    }
  }

  private getProviderConfig(provider: AIProvider): ProviderConfig {
    const baseUrl = this.getBaseUrl(provider);
    const timeoutMs = parseInt(this.bindings.LOCAL_AI_TIMEOUT_MS || "30000", 10);

    return {
      name: provider,
      baseUrl,
      apiKey: this.getApiKey(provider),
      model: this.defaultModel,
      timeoutMs,
    };
  }

  private getBaseUrl(provider: AIProvider): string | undefined {
    switch (provider) {
      case "lmstudio":
        return this.bindings.LM_STUDIO_URL || this.bindings.LOCAL_AI_URL?.replace(/\/v1$/, "");
      case "ollama":
        return this.bindings.LOCAL_AI_URL?.replace(/\/v1$/, "").replace("/v1", "");
      default:
        return undefined;
    }
  }

  private getApiKey(provider: AIProvider): string | undefined {
    switch (provider) {
      case "openai":
        return this.bindings.OPENAI_API_KEY;
      case "openrouter":
      case "groq":
      case "mistral":
      case "google":
        return this.bindings.OPENROUTER_API_KEY || this.bindings.OPENAI_API_KEY;
      default:
        return undefined;
    }
  }

  getProvider(provider?: AIProvider): BaseAIProvider {
    const targetProvider = provider || this.defaultProvider;
    const instance = this.providers.get(targetProvider);

    if (!instance) {
      const config = this.getProviderConfig(targetProvider);
      return AIProviderFactory.createProvider(targetProvider, config);
    }

    return instance;
  }

  getDefaultProvider(): AIProvider {
    return this.defaultProvider;
  }

  async chat(
    messages: AIMessage[],
    options: AIChatOptions = {}
  ): Promise<AIChatResponse> {
    const provider = this.getProvider(options.provider);
    return provider.chat(messages, options);
  }

  async *streamChat(
    messages: AIMessage[],
    options: AIStreamOptions = {}
  ): AsyncGenerator<string> {
    const provider = this.getProvider(options.provider);
    yield* provider.streamChat(messages, options);
  }

  hasProvider(provider: AIProvider): boolean {
    return this.providers.has(provider);
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }
}

export function createOSCEAIService(bindings: OSCEBindings): OSCEAIService {
  return new OSCEAIService(bindings);
}