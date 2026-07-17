export declare function tokenize(text: string): string[];
export interface DeckTopic {
    name: string;
    cardCount: number;
}
export declare function extractTopicsFromText(text: string): Map<string, number>;
export declare function getDeckTopics(deckCards: Array<{
    front?: string | null;
    back?: string | null;
    tags?: string | null;
}>, limit?: number): DeckTopic[];
//# sourceMappingURL=topics.d.ts.map