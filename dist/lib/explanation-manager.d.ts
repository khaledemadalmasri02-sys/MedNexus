interface GenerationProgress {
    deckId: number;
    total: number;
    completed: number;
    failed: number;
    status: "idle" | "running" | "completed" | "failed";
    currentCard?: number;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}
/**
 * Get progress for a deck's explanation generation
 */
export declare function getProgress(deckId: number): GenerationProgress | null;
/**
 * Get all active generations
 */
export declare function getAllProgress(): GenerationProgress[];
/**
 * Generate explanations for all cards in a deck using parallel chunk processing
 * This runs in the background and updates progress
 */
export declare function generateExplanationsForDeck(deckId: number): Promise<void>;
/**
 * Check if a deck has cards without explanations
 */
export declare function hasCardsWithoutExplanations(deckId: number): Promise<boolean>;
/**
 * Get count of cards with and without explanations
 */
export declare function getExplanationStats(deckId: number): Promise<{
    total: number;
    withExplanations: number;
    withoutExplanations: number;
}>;
export {};
//# sourceMappingURL=explanation-manager.d.ts.map