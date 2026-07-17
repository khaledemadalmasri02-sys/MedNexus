import { users } from "../db/index.js";
export declare const SESSION_COOKIE = "session_id";
export declare const SESSION_TTL: number;
export declare const REMEMBER_ME_TTL: number;
export declare const VERIFICATION_TOKEN_TTL: number;
export declare const PASSWORD_RESET_TOKEN_TTL: number;
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
export declare function createSession(data: SessionData): Promise<string>;
export declare function getSession(sessionId: string): Promise<SessionData | null>;
export declare function deleteSession(sessionId: string): Promise<void>;
export declare function deleteAllUserSessions(userId: string): Promise<number>;
export declare function getUserSessions(userId: string): Promise<Array<{
    id: string;
    createdAt: Date;
    expiresAt: Date;
}>>;
export declare function cleanupExpiredSessions(): Promise<number>;
export declare function upsertUser(userData: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    emailVerified?: boolean;
    authProvider?: string;
    oauthProviderId?: string;
    passwordHash?: string;
}): Promise<SessionUser>;
export declare function findUserByEmail(email: string): Promise<typeof users.$inferSelect | null>;
export declare function findUserByOAuthId(provider: string, providerId: string): Promise<typeof users.$inferSelect | null>;
export declare function setEmailVerified(userId: string): Promise<void>;
export declare function updatePassword(userId: string, passwordHash: string): Promise<void>;
export declare function createEmailVerificationToken(userId: string): Promise<string>;
export declare function verifyEmailToken(token: string): Promise<string | null>;
export declare function createPasswordResetToken(userId: string): Promise<string>;
export declare function verifyPasswordResetToken(token: string): Promise<string | null>;
export declare function generateAnonymousId(): string;
export declare function verifyGoogleToken(idToken: string): Promise<{
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
} | null>;
export declare function verifyMicrosoftToken(accessToken: string): Promise<{
    id: string;
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
} | null>;
export declare function verifyAppleToken(identityToken: string): Promise<{
    sub: string;
    email?: string;
    email_verified?: boolean;
} | null>;
export declare function sendVerificationEmail(email: string, token: string, firstName?: string): Promise<boolean>;
export declare function sendPasswordResetEmail(email: string, token: string, firstName?: string): Promise<boolean>;
//# sourceMappingURL=auth.d.ts.map