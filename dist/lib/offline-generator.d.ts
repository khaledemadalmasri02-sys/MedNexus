/**
 * Offline Card Generator
 * Generates flashcards and MCQs locally without AI API
 * Used as fallback when API key is invalid or service is unavailable
 */
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
/**
 * Main offline generator class
 */
export declare class OfflineGenerator {
    /**
     * Generate flashcards from text
     */
    generateCards(text: string, count?: number): GeneratedCard[];
    /**
     * Generate MCQ questions from text
     */
    generateQuestions(text: string, count?: number): GeneratedQuestion[];
    /**
     * Stream generate cards (simulates streaming for UI consistency)
     */
    streamGenerateCards(text: string, count?: number): AsyncGenerator<{
        type: string;
        data: unknown;
    }>;
    /**
     * Stream generate questions (simulates streaming for UI consistency)
     */
    streamGenerateQuestions(text: string, count?: number): AsyncGenerator<{
        type: string;
        data: unknown;
    }>;
}
export declare const offlineGenerator: OfflineGenerator;
//# sourceMappingURL=offline-generator.d.ts.map