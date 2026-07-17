import { db, users, sessions, emailVerificationTokens, passwordResetTokens } from "../db/index.js";
import { logger } from "./logger.js";
import { eq, and, lt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { getConfig } from "../config.js";
export const SESSION_COOKIE = "session_id";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
export const REMEMBER_ME_TTL = 30 * 24 * 60 * 60 * 1000;
export const VERIFICATION_TOKEN_TTL = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL = 60 * 60 * 1000;
export async function createSession(data) {
    const id = crypto.randomUUID();
    const ttl = data.rememberMe ? REMEMBER_ME_TTL : SESSION_TTL;
    const expiresAt = new Date(Date.now() + ttl);
    await db.insert(sessions).values({
        id,
        userId: data.user.id,
        data: JSON.stringify(data),
        expiresAt,
        createdAt: new Date(),
    });
    return id;
}
export async function getSession(sessionId) {
    const result = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
    });
    if (!result)
        return null;
    if (new Date(result.expiresAt) < new Date()) {
        await deleteSession(sessionId);
        return null;
    }
    try {
        return JSON.parse(result.data);
    }
    catch {
        return null;
    }
}
export async function deleteSession(sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
}
export async function deleteAllUserSessions(userId) {
    const userSessions = await db.select().from(sessions).where(eq(sessions.userId, userId));
    await db.delete(sessions).where(eq(sessions.userId, userId));
    return userSessions.length;
}
export async function getUserSessions(userId) {
    const allSessions = await db.select().from(sessions).where(eq(sessions.userId, userId));
    return allSessions.map(s => ({
        id: s.id,
        createdAt: new Date(s.createdAt),
        expiresAt: new Date(s.expiresAt),
    }));
}
export async function cleanupExpiredSessions() {
    const now = new Date();
    const expired = await db.select().from(sessions).where(lt(sessions.expiresAt, now));
    await db.delete(sessions).where(lt(sessions.expiresAt, now));
    return expired.length;
}
export async function upsertUser(userData) {
    const existing = await db.query.users.findFirst({
        where: eq(users.id, userData.id),
    });
    if (existing) {
        await db.update(users).set({
            email: userData.email || existing.email,
            firstName: userData.firstName || existing.firstName,
            lastName: userData.lastName || existing.lastName,
            profileImageUrl: userData.profileImageUrl || existing.profileImageUrl,
            authProvider: userData.authProvider || existing.authProvider,
            updatedAt: new Date(),
        }).where(eq(users.id, userData.id));
        return {
            id: existing.id,
            email: userData.email || existing.email,
            firstName: userData.firstName || existing.firstName,
            lastName: userData.lastName || existing.lastName,
            profileImageUrl: userData.profileImageUrl || existing.profileImageUrl,
            emailVerified: existing.emailVerified ?? false,
            authProvider: userData.authProvider || existing.authProvider || "local",
        };
    }
    await db.insert(users).values({
        id: userData.id,
        email: userData.email || null,
        emailVerified: userData.emailVerified || false,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        authProvider: userData.authProvider || "local",
        oauthProviderId: userData.oauthProviderId || null,
        passwordHash: userData.passwordHash || null,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    return {
        id: userData.id,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        emailVerified: userData.emailVerified || false,
        authProvider: userData.authProvider || "local",
    };
}
export async function findUserByEmail(email) {
    const result = await db.query.users.findFirst({
        where: eq(users.email, email),
    });
    return result || null;
}
export async function findUserByOAuthId(provider, providerId) {
    const oauthId = `${provider}:${providerId}`;
    const result = await db.query.users.findFirst({
        where: eq(users.oauthProviderId, oauthId),
    });
    return result || null;
}
export async function setEmailVerified(userId) {
    await db.update(users).set({ emailVerified: true, updatedAt: new Date() }).where(eq(users.id, userId));
}
export async function updatePassword(userId, passwordHash) {
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}
export async function createEmailVerificationToken(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL);
    await db.insert(emailVerificationTokens).values({
        userId,
        token,
        expiresAt,
        createdAt: new Date(),
    });
    return token;
}
export async function verifyEmailToken(token) {
    const record = await db.query.emailVerificationTokens.findFirst({
        where: eq(emailVerificationTokens.token, token),
    });
    if (!record)
        return null;
    if (new Date(record.expiresAt) < new Date()) {
        await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
        return null;
    }
    await setEmailVerified(record.userId);
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, record.userId));
    return record.userId;
}
export async function createPasswordResetToken(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL);
    await db.insert(passwordResetTokens).values({
        userId,
        token,
        expiresAt,
        createdAt: new Date(),
    });
    return token;
}
export async function verifyPasswordResetToken(token) {
    const record = await db.query.passwordResetTokens.findFirst({
        where: and(eq(passwordResetTokens.token, token), isNull(passwordResetTokens.usedAt)),
    });
    if (!record)
        return null;
    if (new Date(record.expiresAt) < new Date()) {
        return null;
    }
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.token, token));
    return record.userId;
}
export function generateAnonymousId() {
    return `anon_${crypto.randomUUID()}`;
}
export async function verifyGoogleToken(idToken) {
    try {
        const config = getConfig();
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        if (!response.ok) {
            logger.warn({ status: response.status }, "Google token verification failed");
            return null;
        }
        const payload = await response.json();
        if (config.GOOGLE_CLIENT_ID && payload.aud !== config.GOOGLE_CLIENT_ID) {
            logger.warn("Google token audience mismatch");
            return null;
        }
        if (!payload.email) {
            return null;
        }
        return {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            email_verified: payload.email_verified,
        };
    }
    catch (err) {
        logger.error({ err }, "Google token verification error");
        return null;
    }
}
export async function verifyMicrosoftToken(accessToken) {
    try {
        const response = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
            logger.warn({ status: response.status }, "Microsoft token verification failed");
            return null;
        }
        const payload = await response.json();
        return payload;
    }
    catch (err) {
        logger.error({ err }, "Microsoft token verification error");
        return null;
    }
}
export async function verifyAppleToken(identityToken) {
    try {
        const parts = identityToken.split(".");
        if (parts.length !== 3)
            return null;
        const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
        const config = getConfig();
        if (config.APPLE_CLIENT_ID && payload.aud !== config.APPLE_CLIENT_ID) {
            logger.warn("Apple token audience mismatch");
            return null;
        }
        if (!payload.sub)
            return null;
        if (payload.iss !== "https://appleid.apple.com") {
            logger.warn({ iss: payload.iss }, "Apple token issuer mismatch");
            return null;
        }
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            logger.warn("Apple token expired");
            return null;
        }
        if (header.alg !== "RS256" || !header.kid) {
            logger.warn({ alg: header.alg }, "Apple token unsupported algorithm");
            return null;
        }
        const appleKeysUrl = "https://appleid.apple.com/auth/keys";
        const keysResponse = await fetch(appleKeysUrl);
        if (!keysResponse.ok) {
            logger.warn("Failed to fetch Apple public keys");
            return null;
        }
        const keysData = await keysResponse.json();
        const matchingKey = keysData.keys.find((k) => k.kid === header.kid);
        if (!matchingKey) {
            logger.warn({ kid: header.kid }, "No matching Apple key found");
            return null;
        }
        const { createVerify } = await import("crypto");
        const verifier = createVerify("RSA-SHA256");
        verifier.update(parts[0] + "." + parts[1]);
        const jwkToPem = (jwk) => {
            const { createPublicKey } = crypto;
            return createPublicKey({ key: { kty: "RSA", n: jwk.n, e: jwk.e }, format: "jwk" }).export({ type: "spki", format: "pem" }).toString();
        };
        const pem = jwkToPem(matchingKey);
        const signature = Buffer.from(parts[2], "base64url");
        if (!verifier.verify(pem, signature)) {
            logger.warn("Apple token signature verification failed");
            return null;
        }
        return {
            sub: payload.sub,
            email: payload.email,
            email_verified: payload.email_verified === "true" || payload.email_verified === true,
        };
    }
    catch (err) {
        logger.error({ err }, "Apple token verification error");
        return null;
    }
}
export async function sendVerificationEmail(email, token, firstName) {
    const config = getConfig();
    const appUrl = config.APP_URL || "http://localhost:5173";
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;
    try {
        const nodemailer = await import("nodemailer");
        const isConfigured = config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS;
        if (!isConfigured) {
            logger.info({ email, verifyUrl }, "SMTP not configured, logging verification link");
            return true;
        }
        const transporter = nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_SECURE,
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASS,
            },
        });
        await transporter.sendMail({
            from: config.SMTP_FROM,
            to: email,
            subject: "Verify your MedNexus email",
            html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #22c55e; font-size: 28px; margin: 0;">MedNexus</h1>
          </div>
          <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">Welcome to MedNexus!</h2>
          <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Hi ${firstName || "there"}, please verify your email address to start creating AI-powered flashcards.
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #3b82f6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">Verify Email Address</a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
            Or copy this link: ${verifyUrl}
          </p>
        </div>
      `,
            text: `Hi ${firstName || "there"},\n\nPlease verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
        });
        return true;
    }
    catch (err) {
        logger.error({ err }, "Failed to send verification email");
        return false;
    }
}
export async function sendPasswordResetEmail(email, token, firstName) {
    const config = getConfig();
    const appUrl = config.APP_URL || "http://localhost:5173";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    try {
        const nodemailer = await import("nodemailer");
        const isConfigured = config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS;
        if (!isConfigured) {
            logger.info({ email, resetUrl }, "SMTP not configured, logging password reset link");
            return true;
        }
        const transporter = nodemailer.createTransport({
            host: config.SMTP_HOST,
            port: config.SMTP_PORT,
            secure: config.SMTP_SECURE,
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASS,
            },
        });
        await transporter.sendMail({
            from: config.SMTP_FROM,
            to: email,
            subject: "Reset your MedNexus password",
            html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #22c55e; font-size: 28px; margin: 0;">MedNexus</h1>
          </div>
          <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">Password Reset</h2>
          <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Hi ${firstName || "there"}, we received a request to reset your password. Click the button below to set a new password.
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #3b82f6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px;">Reset Password</a>
          </div>
          <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
            This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
            text: `Hi ${firstName || "there"},\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
        });
        return true;
    }
    catch (err) {
        logger.error({ err }, "Failed to send password reset email");
        return false;
    }
}
//# sourceMappingURL=auth.js.map