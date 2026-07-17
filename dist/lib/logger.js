import pino from "pino";
import { getConfig } from "../config.js";
import fs from "fs";
import path from "path";
const logDir = path.dirname(getConfig().LOG_FILE_PATH);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}
export const logger = pino({
    level: getConfig().LOG_LEVEL,
    transport: getConfig().NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
            },
        }
        : undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.headers[\"x-admin-key\"]",
            "res.headers[\"set-cookie\"]",
            "*.password",
            "*.passwordHash",
            "*.token",
            "*.apiKey",
            "*.api_key",
            "*.secret",
            "*.accessToken",
            "*.idToken",
            "inputData",
            "OPENROUTER_API_KEY",
            "OPENAI_API_KEY",
            "GROQ_API_KEY",
            "MISTRAL_API_KEY",
            "GOOGLE_AI_API_KEY",
            "SMTP_PASS",
            "ADMIN_SECRET_KEY",
        ],
        censor: "[REDACTED]",
    },
});
export const httpLogger = pino({
    level: "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
        },
    },
});
export default logger;
//# sourceMappingURL=logger.js.map