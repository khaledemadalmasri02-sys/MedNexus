import { Request, Response, NextFunction } from "express";
import { SessionUser } from "../lib/auth.js";
declare global {
    namespace Express {
        interface Request {
            user?: SessionUser;
            isAuthenticated(): boolean;
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export declare function requireVerifiedEmail(req: Request, res: Response, next: NextFunction): void;
export declare function requireAuthOrGuest(req: Request, res: Response, next: NextFunction): void;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map