import { Hono } from "hono";
import { eq, isNull, and, asc, sql } from "drizzle-orm";
import type { AppEnv } from "../types";
import type { DB } from "../db/index";
import { users, decks, cards } from "../db/index";
import {
  createSession, getSession, deleteSession, deleteAllUserSessions,
  upsertUser, findUserByEmail, generateAnonymousId, verifyGoogleToken,
  hashPassword, verifyPassword, SESSION_COOKIE, readCookie,
} from "../lib/auth";
import { getConfig } from "../lib/config";
import { validate, loginSchema, registerSchema, oauthSchema } from "../middleware/validate";

export const authRoutes = new Hono<AppEnv>();

function getDb(c: any): DB {
  return c.get("db");
}
function getUserId(c: any): string | null {
  return c.get("user")?.id ?? null;
}
function setSessionCookie(c: any, sessionId: string, rememberMe?: boolean) {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  c.header("Set-Cookie",
    `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`,
    { append: true });
}

authRoutes.get("/auth/user", async (c) => {
  const sessionId = readCookie(c, SESSION_COOKIE);
  if (!sessionId) return c.json({ user: null });
  const session = await getSession(getDb(c), sessionId);
  if (!session) return c.json({ user: null });
  const current = await getDb(c).query.users.findFirst({ where: eq(users.id, session.user.id) });
  return c.json({ user: current ? { ...session.user, emailVerified: current.emailVerified } : session.user });
});

authRoutes.post("/auth/guest", async (c) => {
  const guestId = generateAnonymousId();
  const guestUser = await upsertUser(getDb(c), {
    id: guestId,
    firstName: "Guest",
  });
  const sessionId = await createSession(getDb(c), { user: guestUser, createdAt: Date.now() });
  setSessionCookie(c, sessionId);
  return c.json({ user: guestUser });
});

authRoutes.post("/auth/login", validate(loginSchema), async (c) => {
  const { email, password, rememberMe } = c.get("validated") as any;
  const user = await findUserByEmail(getDb(c), email);
  const dbgFound = !!user;
  const dbgHasHash = !!(user && user.passwordHash);
  const dbgHashPrefix = user && user.passwordHash ? user.passwordHash.slice(0, 14) : null;
  const dbgVerify = user && user.passwordHash ? await verifyPassword(password, user.passwordHash) : null;
  if (!user || !user.passwordHash || !dbgVerify) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid credentials", _dbg: { dbgFound, dbgHasHash, dbgHashPrefix, dbgVerify, pwLen: password.length } } }, 401);
  }
  const existing = readCookie(c, SESSION_COOKIE);
  if (existing) await deleteSession(getDb(c), existing);
  const sessionId = await createSession(getDb(c), {
    user: {
      id: user.id, email: user.email, firstName: user.firstName,
      lastName: user.lastName, profileImageUrl: user.profileImageUrl,
      emailVerified: user.emailVerified ?? false, authProvider: user.authProvider || "local",
    },
    createdAt: Date.now(), rememberMe: !!rememberMe,
  });
  setSessionCookie(c, sessionId, !!rememberMe);
  return c.json({
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl },
    isNewUser: false,
  });
});

authRoutes.post("/auth/register", validate(registerSchema), async (c) => {
  const { email, password, firstName, lastName, rememberMe } = c.get("validated") as any;
  if (await findUserByEmail(getDb(c), email)) {
    return c.json({ error: { code: "CONFLICT", message: "An account with this email already exists" } }, 409);
  }
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const user = await upsertUser(getDb(c), {
    id: userId, email, firstName, lastName, emailVerified: false,
    authProvider: "local", passwordHash,
  });
  const sessionId = await createSession(getDb(c), { user, createdAt: Date.now(), rememberMe: !!rememberMe });
  setSessionCookie(c, sessionId, !!rememberMe);
  return c.json({ user, isNewUser: true, verificationSent: false }, 201);
});

authRoutes.post("/auth/oauth/google", validate(oauthSchema), async (c) => {
  const { idToken, rememberMe } = c.get("validated") as any;
  const googleUser = idToken ? await verifyGoogleToken(idToken, getConfig(c.env).GOOGLE_CLIENT_ID) : null;
  if (!googleUser) {
    return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid Google token" } }, 401);
  }
  const existing = await findUserByEmail(getDb(c), googleUser.email);
  let user;
  let isNewUser = false;
  if (existing) {
    user = await upsertUser(getDb(c), {
      id: existing.id, email: googleUser.email,
      firstName: googleUser.name ? googleUser.name.split(" ")[0] : undefined,
      lastName: googleUser.name ? googleUser.name.split(" ").slice(1).join(" ") : undefined,
      profileImageUrl: googleUser.picture,
      emailVerified: googleUser.email_verified || false,
      authProvider: existing.authProvider || "google",
    });
  } else {
    const nameParts = googleUser.name ? googleUser.name.split(" ") : [undefined, undefined];
    const newId = crypto.randomUUID();
    user = await upsertUser(getDb(c), {
      id: newId, email: googleUser.email, firstName: nameParts[0], lastName: nameParts.slice(1).join(" ") || undefined,
      profileImageUrl: googleUser.picture, emailVerified: googleUser.email_verified || false,
      authProvider: "google", oauthProviderId: `google:${googleUser.sub}`,
    });
    isNewUser = true;
  }
  const sessionId = await createSession(getDb(c), { user, createdAt: Date.now(), rememberMe: !!rememberMe });
  setSessionCookie(c, sessionId, !!rememberMe);
  return c.json({ user, isNewUser });
});

authRoutes.post("/auth/logout", async (c) => {
  const sessionId = readCookie(c, SESSION_COOKIE);
  if (sessionId) await deleteSession(getDb(c), sessionId);
  c.header("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`, { append: true });
  return c.json({ success: true });
});

authRoutes.post("/auth/logout-all", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
  await deleteAllUserSessions(getDb(c), userId);
  c.header("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`, { append: true });
  return c.json({ success: true });
});
