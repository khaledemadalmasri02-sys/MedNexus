export type ExplanationMode = "full" | "revision" | "osce" | "brief" | "mnemonic" | "clinical" | "testtrap";
/**
 * Generate all study mode explanations for a card
 * Returns an object with all explanations
 */
export declare function generateAllExplanations(front: string, back: string): Promise<{
    full: string;
    revision: string;
    osce: string;
    brief: string;
    mnemonic: string;
    clinical: string;
    testtrap: string;
}>;
/**
 * Generate explanations for multiple cards
 * Returns a map of card index to explanations
 */
export declare function generateExplanationsForCards(cards: Array<{
    front: string;
    back: string;
}>): Promise<Array<{
    full: string;
    revision: string;
    osce: string;
    brief: string;
    mnemonic: string;
    clinical: string;
}>>;
//# sourceMappingURL=explanation-generator.d.ts.map