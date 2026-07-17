import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getConfig } from "../config.js";
import { logger } from "../lib/logger.js";
const execAsync = promisify(exec);
const router = Router();
const ALLOWED_COMMANDS = new Set([
    "ls", "cat", "echo", "mkdir", "pwd", "cd", "touch", "cp", "mv",
    "head", "tail", "wc", "sort", "uniq", "grep", "find",
    "which", "date", "whoami", "hostname",
]);
const FORBIDDEN_ARGS_PATTERNS = [
    /-[eE]\s/, /\bnode\b/, /\bpython/, /\bpip\b/, /\bnpm\b/, /\bnpx\b/,
    /\bgit\b/, /\benv\b/, /\bbash\b/, /\bsh\b/, /\beval\b/,
    /\bsudo\b/, /\bchmod\b/, /\bchown\b/, /\btee\b/, /\bawk\b/,
    /\bsed\b/, /\bxargs\b/, /\bcurl\b/, /\bwget\b/, /\bnc\b/,
];
const MAX_OUTPUT_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const sessions = new Map();
function ensureWorkspace(workspaceId) {
    const workspacePath = path.join(getConfig().AGENT_WORKSPACE_PATH, workspaceId);
    if (!fs.existsSync(workspacePath)) {
        fs.mkdirSync(workspacePath, { recursive: true });
    }
    return workspacePath;
}
function isCommandAllowed(command) {
    const trimmed = command.trim();
    const parts = trimmed.split(/\s+/);
    const binary = parts[0];
    if (!ALLOWED_COMMANDS.has(binary)) {
        return { allowed: false, binary: null, reason: `Command '${binary}' is not in the allowlist` };
    }
    const dangerousPatterns = [
        /;\s*rm\b/, /&&\s*rm\b/, /\|\s*rm\b/, /`\s*rm\b/, /\$\(.*rm/,
        /;\s*sudo\b/, /&&\s*sudo\b/, /\|\s*sudo\b/,
        /;\s*curl\b/, /;\s*wget\b/, /;\s*nc\b/, /;\s*ncat\b/,
        />\s*\/dev\//, />\s*\/etc\//, />\s*\/usr\//, />\s*\/bin\//,
        /<\s*\/etc\//, /<\s*\/proc\//, /<\s*\/sys\//,
        /mkfs/, /dd\s+if=/, /:\(\)\{:\|:&\};:/,
        /\$\(/, /`/, /\n/, /\r/, /\t.*--/,
    ];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmed)) {
            return { allowed: false, binary: null, reason: "Dangerous pattern detected in command" };
        }
    }
    const argsStr = parts.slice(1).join(" ");
    for (const pattern of FORBIDDEN_ARGS_PATTERNS) {
        if (pattern.test(argsStr)) {
            return { allowed: false, binary: null, reason: "Forbidden argument pattern detected" };
        }
    }
    return { allowed: true, binary };
}
function isPathWithinWorkspace(targetPath, workspacePath) {
    const normalizedWorkspace = path.resolve(workspacePath);
    const normalizedTarget = path.resolve(targetPath);
    return normalizedTarget.startsWith(normalizedWorkspace + path.sep) || normalizedTarget === normalizedWorkspace;
}
router.post("/terminal/sessions", (req, res) => {
    const sessionId = uuidv4();
    const workspaceId = req.body.workspaceId || "default";
    ensureWorkspace(workspaceId);
    const session = {
        id: sessionId,
        workspaceId,
        createdAt: new Date(),
        lastActivity: new Date(),
    };
    sessions.set(sessionId, session);
    res.status(201).json({
        sessionId,
        workspaceId,
        createdAt: session.createdAt,
    });
});
router.get("/terminal/sessions/:id", (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
        return;
    }
    res.json(session);
});
router.post("/terminal/exec", async (req, res) => {
    const { command, sessionId, timeout = 30000 } = req.body;
    if (!command || typeof command !== "string") {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Command is required" },
        });
        return;
    }
    if (command.length > 500) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Command too long (max 500 chars)" },
        });
        return;
    }
    const { allowed } = isCommandAllowed(command);
    if (!allowed) {
        res.status(403).json({
            error: { code: "FORBIDDEN", message: "Command or pattern not allowed" },
        });
        return;
    }
    const session = sessionId ? sessions.get(sessionId) : null;
    const workspaceId = session?.workspaceId || "default";
    const workspacePath = ensureWorkspace(workspaceId);
    try {
        const effectiveTimeout = Math.min(timeout, 60000);
        const { stdout, stderr } = await execAsync(command, {
            cwd: workspacePath,
            timeout: effectiveTimeout,
            maxBuffer: MAX_OUTPUT_SIZE,
            env: {
                PATH: "/usr/local/bin:/usr/bin:/bin",
                HOME: workspacePath,
                LANG: "C.UTF-8",
            },
            shell: "/bin/bash",
        });
        if (session) {
            session.lastActivity = new Date();
        }
        res.json({
            stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
            stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
            exitCode: 0,
            workspace: workspacePath,
        });
    }
    catch (err) {
        logger.warn({ err: err.message, command: command.slice(0, 100) }, "Command execution failed");
        res.json({
            stdout: (err.stdout || "").slice(0, MAX_OUTPUT_SIZE),
            stderr: (err.stderr || err.message || "").slice(0, MAX_OUTPUT_SIZE),
            exitCode: err.code || 1,
            workspace: workspacePath,
        });
    }
});
router.get("/terminal/files", (req, res) => {
    const { sessionId, path: filePath = "." } = req.query;
    const session = sessionId ? sessions.get(sessionId) : null;
    const workspaceId = session?.workspaceId || "default";
    const workspacePath = ensureWorkspace(workspaceId);
    const targetPath = path.resolve(workspacePath, filePath);
    if (!isPathWithinWorkspace(targetPath, workspacePath)) {
        res.status(403).json({
            error: { code: "FORBIDDEN", message: "Access denied" },
        });
        return;
    }
    try {
        const entries = fs.readdirSync(targetPath, { withFileTypes: true });
        const files = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
        }));
        res.json({ path: filePath, files });
    }
    catch (err) {
        res.status(400).json({
            error: { code: "ERROR", message: err.message },
        });
    }
});
router.get("/terminal/files/content", (req, res) => {
    const { sessionId, path: filePath } = req.query;
    if (!filePath) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Path is required" },
        });
        return;
    }
    const session = sessionId ? sessions.get(sessionId) : null;
    const workspaceId = session?.workspaceId || "default";
    const workspacePath = ensureWorkspace(workspaceId);
    const targetPath = path.resolve(workspacePath, filePath);
    if (!isPathWithinWorkspace(targetPath, workspacePath)) {
        res.status(403).json({
            error: { code: "FORBIDDEN", message: "Access denied" },
        });
        return;
    }
    try {
        const stats = fs.statSync(targetPath);
        if (stats.size > MAX_FILE_SIZE) {
            res.status(400).json({
                error: { code: "ERROR", message: "File too large (max 5MB)" },
            });
            return;
        }
        const content = fs.readFileSync(targetPath, "utf-8");
        res.json({ content, path: filePath });
    }
    catch (err) {
        res.status(400).json({
            error: { code: "ERROR", message: err.message },
        });
    }
});
router.post("/terminal/files/content", (req, res) => {
    const { sessionId, path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Path and content are required" },
        });
        return;
    }
    const session = sessionId ? sessions.get(sessionId) : null;
    const workspaceId = session?.workspaceId || "default";
    const workspacePath = ensureWorkspace(workspaceId);
    const targetPath = path.resolve(workspacePath, filePath);
    if (!isPathWithinWorkspace(targetPath, workspacePath)) {
        res.status(403).json({
            error: { code: "FORBIDDEN", message: "Access denied" },
        });
        return;
    }
    try {
        const dir = path.dirname(targetPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(targetPath, content, "utf-8");
        res.json({ success: true, path: filePath });
    }
    catch (err) {
        res.status(400).json({
            error: { code: "ERROR", message: err.message },
        });
    }
});
router.delete("/terminal/sessions/:id", (req, res) => {
    const deleted = sessions.delete(req.params.id);
    if (!deleted) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Session not found" } });
        return;
    }
    res.status(204).send();
});
router.get("/terminal/sessions", (req, res) => {
    const adminKey = req.headers["x-admin-key"];
    const secret = process.env.ADMIN_SECRET_KEY;
    if (!secret || !adminKey || typeof adminKey !== "string" || typeof secret !== "string") {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required" } });
        return;
    }
    const keyBuf = Buffer.from(adminKey, "utf-8");
    const secretBuf = Buffer.from(secret, "utf-8");
    if (keyBuf.length !== secretBuf.length || !crypto.timingSafeEqual(keyBuf, secretBuf)) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required" } });
        return;
    }
    res.json({
        sessions: Array.from(sessions.values()),
        count: sessions.size,
    });
});
export default router;
//# sourceMappingURL=terminal.js.map