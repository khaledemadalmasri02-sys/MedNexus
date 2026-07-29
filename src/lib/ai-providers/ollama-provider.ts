import { BaseAIProvider } from "./base-provider";
import type { AIMessage, AIChatOptions, AIChatResponse, AIStreamOptions } from "./provider-types";

export class OllamaProvider extends BaseAIProvider {
  constructor(config: { model: string; baseUrl?: string; timeoutMs?: number }) {
    super({
      name: "ollama",
      baseUrl: config.baseUrl || "http://localhost:11434",
      model: config.model,
      timeoutMs: config.timeoutMs,
    });
  }

  private getBaseUrl(): string {
    return (this.config.baseUrl || "http://localhost:11434").replace(/\/+$/, "");
  }

  async chat(messages: AIMessage[], options: AIChatOptions): Promise<AIChatResponse> {
    const baseUrl = this.getBaseUrl();

    const ollamaMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await this.fetchWithTimeout(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.config.model,
        messages: ollamaMessages,
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 4000,
        stream: false,
      }),
    }, options.signal ? undefined : this.config.timeoutMs);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;
    const content = data?.message?.content || "";

    return {
      content,
      usage: {
        promptTokens: data?.prompt_eval_count || 0,
        completionTokens: data?.eval_count || 0,
        totalTokens: data?.prompt_eval_count + data?.eval_count || 0,
      },
      finishReason: data?.done_reason,
    };
  }

  async *streamChat(messages: AIMessage[], options: AIStreamOptions): AsyncGenerator<string> {
    const baseUrl = this.getBaseUrl();

    const ollamaMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const response = await this.fetchWithTimeout(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.config.model,
        messages: ollamaMessages,
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 4000,
        stream: true,
      }),
    }, options.signal ? undefined : this.config.timeoutMs);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
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
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);
            if (parsed?.done) return;
            const content = parsed?.message?.content;
            if (content) yield content;
          } catch {
            continue;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}