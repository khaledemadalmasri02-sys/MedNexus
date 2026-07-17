export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface GenerateOptions {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
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
export declare class AIService {
    private config;
    private sanitizePromptInput;
    complete(messages: Message[], options?: GenerateOptions): Promise<string>;
    streamComplete(messages: Message[], options?: GenerateOptions): AsyncGenerator<string>;
    generateCards(text: string, cardCount?: number, options?: GenerateOptions): Promise<GeneratedCard[]>;
    generateQuestions(text: string, questionCount?: number, options?: GenerateOptions): Promise<GeneratedQuestion[]>;
    explainCard(front: string, back: string, mode?: "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap", options?: GenerateOptions): Promise<string>;
    streamExplainCard(front: string, back: string, mode?: "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap", options?: GenerateOptions): AsyncGenerator<string>;
    streamGenerateCards(text: string, cardCount?: number, options?: GenerateOptions): AsyncGenerator<{
        type: "progress" | "card" | "done";
        data: unknown;
    }>;
}
export declare const aiService: AIService;
//# sourceMappingURL=ai.d.ts.map