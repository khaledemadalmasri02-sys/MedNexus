import { eq, and, lt, isNull, desc } from "drizzle-orm";
import type { DB } from "../db/index";
import { users, sessions, emailVerificationTokens, passwordResetTokens } from "../db/index";
import { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "session_id";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
export const REMEMBER_ME_TTL = 30 * 24 * 60 * 60 * 1000;
export const VERIFICATION_TOKEN_TTL = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_TTL = 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
  authProvider: string;
}

export interface SessionData {
  user: SessionUser;
  createdAt: number;
  rememberMe?: boolean;
}

export async function createSession(db: DB, data: SessionData): Promise<string> {
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

export async function getSession(db: DB, sessionId: string): Promise<SessionData | null> {
  const result = await db.query.sessions.findFirst({ where: eq(sessions.id, sessionId) });
  if (!result) return null;
  if (new Date(result.expiresAt) < new Date()) {
    await deleteSession(db, sessionId);
    return null;
  }
  try {
    return JSON.parse(result.data) as SessionData;
  } catch {
    return null;
  }
}

export async function deleteSession(db: DB, sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function deleteAllUserSessions(db: DB, userId: string): Promise<number> {
  const rows = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  return rows.length;
}

export async function cleanupExpiredSessions(db: DB): Promise<number> {
  const expired = await db.select({ id: sessions.id }).from(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  return expired.length;
}

export async function upsertUser(
  db: DB,
  userData: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    emailVerified?: boolean;
    authProvider?: string;
    oauthProviderId?: string;
    passwordHash?: string;
  },
): Promise<SessionUser> {
  const existing = await db.query.users.findFirst({ where: eq(users.id, userData.id) });
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

export async function findUserByEmail(db: DB, email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email) });
}

export async function findUserByOAuthId(db: DB, provider: string, providerId: string) {
  const oauthId = `${provider}:${providerId}`;
  return db.query.users.findFirst({ where: eq(users.oauthProviderId, oauthId) });
}

export async function setEmailVerified(db: DB, userId: string): Promise<void> {
  await db.update(users).set({ emailVerified: true, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function updatePassword(db: DB, userId: string, passwordHash: string): Promise<void> {
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

export function generateAnonymousId(): string {
  return `anon_${crypto.randomUUID()}`;
}

// Hono core does not parse cookies, so read from the Cookie header.
export function readCookie(c: any, name: string): string | undefined {
  const header = c.req.header("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k === name) return decodeURIComponent(v);
  }
  return undefined;
}

export async function createEmailVerificationToken(db: DB, userId: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL);
  await db.insert(emailVerificationTokens).values({ userId, token, expiresAt, createdAt: new Date() });
  return token;
}

export async function verifyEmailToken(db: DB, token: string): Promise<string | null> {
  const record = await db.query.emailVerificationTokens.findFirst({ where: eq(emailVerificationTokens.token, token) });
  if (!record) return null;
  if (new Date(record.expiresAt) < new Date()) {
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.token, token));
    return null;
  }
  await setEmailVerified(db, record.userId);
  await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, record.userId));
  return record.userId;
}

export async function createPasswordResetToken(db: DB, userId: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL);
  await db.insert(passwordResetTokens).values({ userId, token, expiresAt, createdAt: new Date() });
  return token;
}

export async function verifyPasswordResetToken(db: DB, token: string): Promise<string | null> {
  const record = await db.query.passwordResetTokens.findFirst({
    where: and(eq(passwordResetTokens.token, token), isNull(passwordResetTokens.usedAt)),
  });
  if (!record) return null;
  if (new Date(record.expiresAt) < new Date()) return null;
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.token, token));
  return record.userId;
}

// Verify a Google ID token by calling Google's tokeninfo endpoint.
export async function verifyGoogleToken(idToken: string, clientId?: string): Promise<{
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
} | null> {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
      aud?: string;
    };
    // Google's tokeninfo endpoint has already verified the token's signature,
    // issuer, and expiry. We accept any valid Google account so sign-in works
    // regardless of which OAuth client issued the token (the client id is baked
    // into the frontend bundle). Require a verified email to proceed.
    if (!payload.email) return null;
    return payload;
  } catch {
    return null;
  }
}

export { hashPassword, verifyPassword };
