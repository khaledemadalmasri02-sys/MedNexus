import { Request, Response, NextFunction } from "express";
export interface RateLimitOptions {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string;
    message?: string;
}
export declare function rateLimit(options: RateLimitOptions): (req: Request, res: Response, next: NextFunction) => void;
export declare const authRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const loginRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const loginIpRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const registerRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const passwordResetRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const emailVerificationRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const generateRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadRateLimit: (req: Request, res: Response, next: NextFunction) => void;
export declare function getProgressiveLockout(identifier: string): {
    locked: boolean;
    remainingMs: number;
};
export declare function recordProgressiveFailure(identifier: string): number;
export declare function clearProgressiveLockout(identifier: string): void;
//# sourceMappingURL=rateLimit.d.ts.map