import { BaseAIProvider } from "./base-provider";
import type { AIMessage, AIChatOptions, AIChatResponse, AIStreamOptions } from "./provider-types";

export class LMStudioProvider extends BaseAIProvider {
  constructor(config: { model: string; baseUrl?: string; timeoutMs?: number }) {
    super({
      name: "lmstudio",
      baseUrl: config.baseUrl || "http://localhost:1234/v1",
      model: config.model,
      timeoutMs: config.timeoutMs,
    });
  }

  private getBaseUrl(): string {
    return (this.config.baseUrl || "http://localhost:1234/v1").replace(/\/+$/, "");
  }

  async chat(messages: AIMessage[], options: AIChatOptions): Promise<AIChatResponse> {
    const baseUrl = this.getBaseUrl();
    const response = await this.fetchWithTimeout(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        stream: false,
      }),
    }, options.signal ? undefined : this.config.timeoutMs);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;
    const content = data?.choices?.[0]?.message?.content || "";

    return {
      content,
      usage: {
        promptTokens: data?.usage?.prompt_tokens || 0,
        completionTokens: data?.usage?.completion_tokens || 0,
        totalTokens: data?.usage?.total_tokens || 0,
      },
      finishReason: data?.choices?.[0]?.finish_reason,
    };
  }

  async *streamChat(messages: AIMessage[], options: AIStreamOptions): AsyncGenerator<string> {
    const baseUrl = this.getBaseUrl();
    const response = await this.fetchWithTimeout(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        stream: true,
      }),
    }, options.signal ? undefined : this.config.timeoutMs);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
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
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
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