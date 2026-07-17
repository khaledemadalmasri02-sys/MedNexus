const stores = new Map();
function getStore(prefix) {
    let store = stores.get(prefix);
    if (!store) {
        store = new Map();
        stores.set(prefix, store);
    }
    return store;
}
setInterval(() => {
    const now = Date.now();
    for (const [, store] of stores) {
        for (const [key, entry] of store) {
            if (now > entry.resetAt) {
                store.delete(key);
            }
        }
    }
}, 60000);
export function rateLimit(options) {
    const { windowMs, maxRequests, keyGenerator = (req) => req.ip || "unknown", message = "Too many requests, please try again later", } = options;
    const prefix = `${windowMs}-${maxRequests}`;
    const store = getStore(prefix);
    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();
        let entry = store.get(key);
        if (!entry || now > entry.resetAt) {
            entry = { count: 0, resetAt: now + windowMs };
            store.set(key, entry);
        }
        entry.count++;
        res.setHeader("X-RateLimit-Limit", maxRequests.toString());
        res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count).toString());
        res.setHeader("X-RateLimit-Reset", new Date(entry.resetAt).toISOString());
        if (entry.count > maxRequests) {
            res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000).toString());
            res.status(429).json({
                error: {
                    code: "RATE_LIMIT_EXCEEDED",
                    message,
                },
            });
            return;
        }
        next();
    };
}
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) => {
        const email = req.body?.email || "";
        return `auth:${req.ip}:${email}`;
    },
    message: "Too many authentication attempts. Please try again in 15 minutes.",
});
export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: (req) => {
        const email = req.body?.email || "";
        return `login:${email}`;
    },
    message: "Too many login attempts for this account. Please try again in 15 minutes.",
});
export const loginIpRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) => `login-ip:${req.ip}`,
    message: "Too many login attempts from this IP. Please try again in 15 minutes.",
});
export const registerRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyGenerator: (req) => `register:${req.ip}`,
    message: "Too many registration attempts. Please try again later.",
});
export const passwordResetRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    keyGenerator: (req) => {
        const email = req.body?.email || "";
        return `pwreset:${req.ip}:${email}`;
    },
    message: "Too many password reset requests. Please try again later.",
});
export const emailVerificationRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    keyGenerator: (req) => {
        const email = req.body?.email || "";
        return `verify:${req.ip}:${email}`;
    },
    message: "Too many verification email requests. Please try again later.",
});
export const apiRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: "Too many requests. Please slow down.",
});
export const generateRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: "Too many generation requests. Please wait before generating more.",
});
export const uploadRateLimit = rateLimit({
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "Too many upload requests. Please wait before uploading more.",
});
const progressiveLockouts = new Map();
export function getProgressiveLockout(identifier) {
    const entry = progressiveLockouts.get(identifier);
    if (!entry)
        return { locked: false, remainingMs: 0 };
    if (Date.now() >= entry.lockedUntil) {
        progressiveLockouts.delete(identifier);
        return { locked: false, remainingMs: 0 };
    }
    return { locked: true, remainingMs: entry.lockedUntil - Date.now() };
}
export function recordProgressiveFailure(identifier) {
    let entry = progressiveLockouts.get(identifier);
    if (!entry || Date.now() >= entry.lockedUntil) {
        entry = { failures: 0, lockedUntil: 0 };
    }
    entry.failures++;
    const lockoutMinutes = Math.min(Math.pow(2, entry.failures - 3) * 2, 60);
    if (entry.failures >= 3) {
        entry.lockedUntil = Date.now() + lockoutMinutes * 60 * 1000;
    }
    progressiveLockouts.set(identifier, entry);
    return entry.failures;
}
export function clearProgressiveLockout(identifier) {
    progressiveLockouts.delete(identifier);
}
//# sourceMappingURL=rateLimit.js.map