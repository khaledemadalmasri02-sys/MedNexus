import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, users } from "../db/index.js";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { createSession, getSession, deleteSession, deleteAllUserSessions, SESSION_COOKIE, SESSION_TTL, REMEMBER_ME_TTL, upsertUser, generateAnonymousId, findUserByEmail, createEmailVerificationToken, verifyEmailToken, createPasswordResetToken, verifyPasswordResetToken, updatePassword, verifyGoogleToken, verifyMicrosoftToken, verifyAppleToken, sendVerificationEmail, sendPasswordResetEmail, } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import { validate, loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, sendVerificationSchema, oauthSchema, } from "./validators.js";
import { loginRateLimit, loginIpRateLimit, registerRateLimit, passwordResetRateLimit, emailVerificationRateLimit, getProgressiveLockout, recordProgressiveFailure, clearProgressiveLockout, } from "../middleware/rateLimit.js";
const router = Router();
async function hashPassword(password) {
    return argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
    });
}
async function verifyPassword(password, stored) {
    try {
        return await argon2.verify(stored, password);
    }
    catch {
        return false;
    }
}
function getSessionTtl(rememberMe) {
    return rememberMe ? REMEMBER_ME_TTL : SESSION_TTL;
}
function setSessionCookie(res, sessionId, rememberMe) {
    res.cookie(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: getSessionTtl(rememberMe),
    });
}
function getClientIp(req) {
    return req.ip || "unknown";
}
function checkLoginLockout(req, res) {
    const ip = getClientIp(req);
    const email = req.body?.email || "";
    const ipLockout = getProgressiveLockout(`ip:${ip}`);
    if (ipLockout.locked) {
        const minutes = Math.ceil(ipLockout.remainingMs / 60000);
        res.status(429).json({
            error: {
                code: "ACCOUNT_LOCKED",
                message: `Too many failed attempts. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
            },
        });
        return true;
    }
    if (email) {
        const emailLockout = getProgressiveLockout(`email:${email}`);
        if (emailLockout.locked) {
            const minutes = Math.ceil(emailLockout.remainingMs / 60000);
            res.status(429).json({
                error: {
                    code: "ACCOUNT_LOCKED",
                    message: `Too many failed attempts. Try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`,
                },
            });
            return true;
        }
    }
    return false;
}
router.get("/auth/user", async (req, res) => {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (!sessionId) {
        res.json({ user: null });
        return;
    }
    const session = await getSession(sessionId);
    if (!session) {
        res.json({ user: null });
        return;
    }
    const currentUser = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });
    res.json({ user: currentUser ? { ...session.user, emailVerified: currentUser.emailVerified } : session.user });
});
router.post("/auth/guest", async (req, res) => {
    const guestId = generateAnonymousId();
    const guestUser = await upsertUser({
        id: guestId,
        email: undefined,
        firstName: "Guest",
        lastName: undefined,
        profileImageUrl: undefined,
    });
    const sessionId = await createSession({
        user: guestUser,
        createdAt: Date.now(),
    });
    setSessionCookie(res, sessionId);
    res.json({ user: guestUser });
});
router.post("/auth/login", loginIpRateLimit, loginRateLimit, validate(loginSchema), async (req, res) => {
    const { email, password, rememberMe } = req.body;
    if (checkLoginLockout(req, res))
        return;
    const user = await findUserByEmail(email);
    if (!user || !user.passwordHash) {
        recordProgressiveFailure(`ip:${getClientIp(req)}`);
        if (email)
            recordProgressiveFailure(`email:${email}`);
        res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
        });
        return;
    }
    if (!(await verifyPassword(password, user.passwordHash))) {
        recordProgressiveFailure(`ip:${getClientIp(req)}`);
        if (email)
            recordProgressiveFailure(`email:${email}`);
        res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
        });
        return;
    }
    clearProgressiveLockout(`ip:${getClientIp(req)}`);
    if (email)
        clearProgressiveLockout(`email:${email}`);
    const existingSessionId = req.cookies?.[SESSION_COOKIE];
    if (existingSessionId) {
        await deleteSession(existingSessionId);
    }
    const sessionId = await createSession({
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            emailVerified: user.emailVerified ?? false,
            authProvider: user.authProvider || "local",
        },
        createdAt: Date.now(),
        rememberMe: !!rememberMe,
    });
    setSessionCookie(res, sessionId, !!rememberMe);
    res.json({
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
        },
        isNewUser: false,
    });
});
router.post("/auth/register", registerRateLimit, validate(registerSchema), async (req, res) => {
    const { email, password, firstName, lastName, rememberMe } = req.body;
    const existing = await findUserByEmail(email);
    if (existing) {
        res.status(409).json({
            error: { code: "CONFLICT", message: "An account with this email already exists" },
        });
        return;
    }
    const userId = uuidv4();
    const passwordHash = await hashPassword(password);
    const user = await upsertUser({
        id: userId,
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        profileImageUrl: undefined,
        emailVerified: false,
        authProvider: "local",
        passwordHash,
    });
    let verificationSent = false;
    try {
        const token = await createEmailVerificationToken(userId);
        verificationSent = await sendVerificationEmail(email, token, firstName);
    }
    catch (err) {
        logger.error({ err }, "Failed to send verification email after registration");
    }
    const sessionId = await createSession({
        user,
        createdAt: Date.now(),
        rememberMe: !!rememberMe,
    });
    setSessionCookie(res, sessionId, !!rememberMe);
    res.status(201).json({ user, isNewUser: true, verificationSent });
});
router.post("/auth/oauth/google", loginIpRateLimit, validate(oauthSchema), async (req, res) => {
    const { idToken, accessToken, rememberMe } = req.body;
    const googleUser = idToken ? await verifyGoogleToken(idToken) : null;
    if (!googleUser) {
        res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Invalid Google token" },
        });
        return;
    }
    const existing = await findUserByEmail(googleUser.email);
    let user;
    let isNewUser = false;
    if (existing) {
        user = await upsertUser({
            id: existing.id,
            email: googleUser.email,
            firstName: googleUser.name ? googleUser.name.split(" ")[0] : undefined,
            lastName: googleUser.name ? googleUser.name.split(" ").slice(1).join(" ") : undefined,
            profileImageUrl: googleUser.picture,
            emailVerified: googleUser.email_verified || false,
            authProvider: existing.authProvider || "google",
        });
    }
    else {
        const nameParts = googleUser.name ? googleUser.name.split(" ") : [undefined, undefined];
        const newId = uuidv4();
        user = await upsertUser({
            id: newId,
            email: googleUser.email,
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" ") || undefined,
            profileImageUrl: googleUser.picture,
            emailVerified: googleUser.email_verified || false,
            authProvider: "google",
            oauthProviderId: `google:${googleUser.sub}`,
        });
        isNewUser = true;
    }
    const sessionId = await createSession({
        user,
        createdAt: Date.now(),
        rememberMe: !!rememberMe,
    });
    setSessionCookie(res, sessionId, !!rememberMe);
    res.json({ user, isNewUser });
});
router.post("/auth/oauth/microsoft", loginIpRateLimit, validate(oauthSchema), async (req, res) => {
    const { accessToken, idToken, rememberMe } = req.body;
    let msUser = null;
    if (accessToken) {
        msUser = await verifyMicrosoftToken(accessToken);
    }
    if (!msUser) {
        res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Invalid Microsoft token" },
        });
        return;
    }
    const email = msUser.mail || msUser.userPrincipalName;
    if (!email) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Email not provided by Microsoft" },
        });
        return;
    }
    const existing = await findUserByEmail(email);
    let user;
    let isNewUser = false;
    if (existing) {
        user = await upsertUser({
            id: existing.id,
            email,
            firstName: msUser.displayName ? msUser.displayName.split(" ")[0] : undefined,
            lastName: msUser.displayName ? msUser.displayName.split(" ").slice(1).join(" ") : undefined,
            emailVerified: true,
            authProvider: existing.authProvider || "microsoft",
        });
    }
    else {
        const nameParts = msUser.displayName ? msUser.displayName.split(" ") : [undefined, undefined];
        const newId = uuidv4();
        user = await upsertUser({
            id: newId,
            email,
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" ") || undefined,
            emailVerified: true,
            authProvider: "microsoft",
            oauthProviderId: `microsoft:${msUser.id}`,
        });
        isNewUser = true;
    }
    const sessionId = await createSession({
        user,
        createdAt: Date.now(),
        rememberMe: !!rememberMe,
    });
    setSessionCookie(res, sessionId, !!rememberMe);
    res.json({ user, isNewUser });
});
router.post("/auth/oauth/apple", loginIpRateLimit, validate(oauthSchema), async (req, res) => {
    const { identityToken, fullName, email: appleEmail, rememberMe } = req.body;
    const appleUser = await verifyAppleToken(identityToken);
    if (!appleUser) {
        res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Invalid Apple token" },
        });
        return;
    }
    const email = appleUser.email || appleEmail;
    if (!email) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Email not provided by Apple" },
        });
        return;
    }
    const existing = await findUserByEmail(email);
    let user;
    let isNewUser = false;
    if (existing) {
        user = await upsertUser({
            id: existing.id,
            email,
            firstName: fullName?.givenName || undefined,
            lastName: fullName?.familyName || undefined,
            emailVerified: appleUser.email_verified || false,
            authProvider: existing.authProvider || "apple",
        });
    }
    else {
        const newId = uuidv4();
        user = await upsertUser({
            id: newId,
            email,
            firstName: fullName?.givenName || undefined,
            lastName: fullName?.familyName || undefined,
            emailVerified: appleUser.email_verified || false,
            authProvider: "apple",
            oauthProviderId: `apple:${appleUser.sub}`,
        });
        isNewUser = true;
    }
    const sessionId = await createSession({
        user,
        createdAt: Date.now(),
        rememberMe: !!rememberMe,
    });
    setSessionCookie(res, sessionId, !!rememberMe);
    res.json({ user, isNewUser });
});
router.post("/auth/send-verification", emailVerificationRateLimit, validate(sendVerificationSchema), async (req, res) => {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
        res.json({ success: true, message: "If an account exists, a verification email has been sent" });
        return;
    }
    if (user.emailVerified) {
        res.json({ success: true, message: "Email already verified" });
        return;
    }
    try {
        const token = await createEmailVerificationToken(user.id);
        await sendVerificationEmail(email, token, user.firstName || undefined);
        res.json({ success: true, message: "Verification email sent" });
    }
    catch (err) {
        logger.error({ err }, "Failed to send verification email");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to send verification email" },
        });
    }
});
router.post("/auth/resend-verification", emailVerificationRateLimit, validate(sendVerificationSchema), async (req, res) => {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
        res.json({ success: true, message: "If an account exists, a verification email has been sent" });
        return;
    }
    if (user.emailVerified) {
        res.json({ success: true, message: "Email already verified" });
        return;
    }
    try {
        const token = await createEmailVerificationToken(user.id);
        await sendVerificationEmail(email, token, user.firstName || undefined);
        res.json({ success: true, message: "Verification email sent" });
    }
    catch (err) {
        logger.error({ err }, "Failed to resend verification email");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to send verification email" },
        });
    }
});
router.get("/auth/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Verification token required" },
        });
        return;
    }
    const userId = await verifyEmailToken(token);
    if (!userId) {
        res.status(400).json({
            error: { code: "INVALID_TOKEN", message: "Invalid or expired verification token" },
        });
        return;
    }
    res.json({ success: true, message: "Email verified successfully" });
});
router.post("/auth/forgot-password", passwordResetRateLimit, validate(forgotPasswordSchema), async (req, res) => {
    const { email } = req.body;
    const user = await findUserByEmail(email);
    if (!user) {
        res.json({ success: true, message: "If an account exists, a password reset email has been sent" });
        return;
    }
    if (user.authProvider !== "local") {
        res.json({ success: true, message: "If an account exists, a password reset email has been sent" });
        return;
    }
    try {
        const token = await createPasswordResetToken(user.id);
        await sendPasswordResetEmail(email, token, user.firstName || undefined);
        res.json({ success: true, message: "Password reset email sent" });
    }
    catch (err) {
        logger.error({ err }, "Failed to send password reset email");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to send password reset email" },
        });
    }
});
router.post("/auth/reset-password", passwordResetRateLimit, validate(resetPasswordSchema), async (req, res) => {
    const { token, newPassword } = req.body;
    const userId = await verifyPasswordResetToken(token);
    if (!userId) {
        res.status(400).json({
            error: { code: "INVALID_TOKEN", message: "Invalid or expired reset token" },
        });
        return;
    }
    const passwordHash = await hashPassword(newPassword);
    await updatePassword(userId, passwordHash);
    res.json({ success: true, message: "Password reset successfully" });
});
router.post("/auth/logout", async (req, res) => {
    const sessionId = req.cookies?.[SESSION_COOKIE];
    if (sessionId) {
        await deleteSession(sessionId);
    }
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ success: true });
});
router.post("/auth/logout-all", async (req, res) => {
    if (!req.isAuthenticated()) {
        res.status(401).json({
            error: { code: "UNAUTHORIZED", message: "Authentication required" },
        });
        return;
    }
    await deleteAllUserSessions(req.user.id);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ success: true });
});
export default router;
//# sourceMappingURL=auth.js.map