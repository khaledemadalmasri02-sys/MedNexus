interface ArticleJobEvent {
    status: string;
    progress: number;
    outline?: unknown;
    contentMarkdown?: string;
    final?: boolean;
    error?: string;
}
declare class ArticleEventBus {
    private emitter;
    constructor();
    emit(jobId: string, event: ArticleJobEvent): void;
    subscribe(jobId: string, handler: (event: ArticleJobEvent) => void): () => void;
    removeAll(jobId: string): void;
}
export declare const articleEvents: ArticleEventBus;
export {};
//# sourceMappingURL=article-events.d.ts.map