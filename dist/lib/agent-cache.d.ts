interface CacheEntry {
    answer: string;
    source: "knowledge" | "ai";
    confidence: number;
}
export declare function getCachedResponse(agentId: string, question: string): Promise<CacheEntry | null>;
export declare function storeCachedResponse(agentId: string, question: string, answer: string, source?: "ai" | "knowledge", confidence?: number): Promise<void>;
export declare function getCacheStats(agentId: string): Promise<{
    daily: {
        date: string;
        id: number;
        agentId: string;
        totalQuestions: number;
        memoryHits: number;
        knowledgeHits: number;
        dbCacheHits: number;
        apiCalls: number;
        avgResponseMs: number;
    }[];
    totalCached: number;
    memoryCacheSize: number;
}>;
export declare function cleanExpiredCache(): Promise<number>;
export declare function searchKnowledge(agentId: string, query: string, limit?: number): Promise<{
    id: number;
    question: string;
    answer: string;
    category: string;
    score: number;
}[]>;
export {};
//# sourceMappingURL=agent-cache.d.ts.map