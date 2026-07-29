import type { AIProvider, ProviderConfig, AIMessage, AIChatOptions, AIChatResponse, AIStreamOptions } from "./provider-types";

export abstract class BaseAIProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  abstract chat(messages: AIMessage[], options: AIChatOptions): Promise<AIChatResponse>;
  abstract streamChat(messages: AIMessage[], options: AIStreamOptions): AsyncGenerator<string>;

  getProvider(): AIProvider {
    return this.config.name;
  }

  getModel(): string {
    return this.config.model;
  }

  protected buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  protected async fetchWithTimeout(url: string, init: RequestInit, timeoutMs?: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = timeoutMs || this.config.timeoutMs || 30000;

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}