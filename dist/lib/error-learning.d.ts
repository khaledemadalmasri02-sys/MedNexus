export interface ErrorLogInput {
    errorType: string;
    errorCode?: string;
    model: string;
    operation: string;
    inputData: string;
    error: Error;
    context?: Record<string, unknown>;
}
export interface ErrorPattern {
    id: number;
    errorType: string;
    errorCode: string | null;
    model: string;
    operation: string;
    inputHash: string;
    errorMessage: string;
    errorStack: string | null;
    context: string | null;
    resolved: boolean;
    resolutionNotes: string | null;
    fixPattern: string | null;
    occurrenceCount: number;
    firstSeenAt: Date;
    lastSeenAt: Date;
    createdAt: Date;
}
export interface ErrorContext {
    hasErrors: boolean;
    recentErrors: ErrorPattern[];
    commonPatterns: Array<{
        pattern: string;
        count: number;
        fix: string | null;
    }>;
    instructions: string;
}
export declare class ErrorLearningService {
    logError(input: ErrorLogInput): Promise<ErrorPattern | null>;
    findSimilarErrors(operation: string, model: string, limit?: number): Promise<ErrorPattern[]>;
    getErrorPatterns(model?: string, limit?: number): Promise<ErrorPattern[]>;
    resolveError(errorId: number, resolutionNotes: string, fixPattern: string): Promise<boolean>;
    bulkResolveByType(errorType: string, model: string, resolutionNotes: string, fixPattern: string): Promise<number>;
    getCommonPatterns(model?: string, minOccurrences?: number): Promise<Array<{
        pattern: string;
        count: number;
        fix: string | null;
    }>>;
    buildErrorContext(operation: string, model: string): ErrorContext;
    buildErrorContextAsync(operation: string, model: string): Promise<ErrorContext>;
    private getCommonPatternsWithFix;
    private generateInstructions;
    getStats(): Promise<{
        totalErrors: number;
        unresolvedErrors: number;
        resolvedErrors: number;
        mostCommonError: string | null;
        mostProblematicModel: string | null;
    }>;
    clearResolvedErrors(before?: Date): Promise<number>;
}
export declare const errorLearningService: ErrorLearningService;
//# sourceMappingURL=error-learning.d.ts.map