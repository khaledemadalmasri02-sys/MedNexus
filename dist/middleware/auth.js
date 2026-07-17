import crypto from "crypto";
import { getSession, SESSION_COOKIE } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
export async function authMiddleware(req, res, next) {
    req.isAuthenticated = () => !!req.user;
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (!sessionId) {
        next();
        return;
    }
    try {
        const session = await getSession(sessionId);
        if (session) {
            req.user = session.user;
        }
    }
    catch (err) {
        logger.warn({ err }, "Session validation failed");
    }
    next();
}
export function requireAuth(req, res, next) {
    if (!req.isAuthenticated()) {
        res.status(401).json({
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
            },
        });
        return;
    }
    next();
}
export function requireVerifiedEmail(req, res, next) {
    if (!req.isAuthenticated()) {
        res.status(401).json({
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
            },
        });
        return;
    }
    if (!req.user.emailVerified) {
        res.status(403).json({
            error: {
                code: "EMAIL_NOT_VERIFIED",
                message: "Please verify your email address to access this feature",
            },
        });
        return;
    }
    next();
}
export function requireAuthOrGuest(req, res, next) {
    if (!req.isAuthenticated()) {
        res.status(401).json({
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
            },
        });
        return;
    }
    next();
}
export function requireAdmin(req, res, next) {
    const adminKey = req.headers["x-admin-key"];
    const secret = process.env.ADMIN_SECRET_KEY;
    if (!secret || !adminKey || typeof adminKey !== "string" || typeof secret !== "string") {
        res.status(403).json({
            error: {
                code: "FORBIDDEN",
                message: "Admin access required",
            },
        });
        return;
    }
    const keyBuf = Buffer.from(adminKey, "utf-8");
    const secretBuf = Buffer.from(secret, "utf-8");
    if (keyBuf.length !== secretBuf.length || !crypto.timingSafeEqual(keyBuf, secretBuf)) {
        res.status(403).json({
            error: {
                code: "FORBIDDEN",
                message: "Admin access required",
            },
        });
        return;
    }
    next();
}
//# sourceMappingURL=auth.js.map