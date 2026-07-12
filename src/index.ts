import "dotenv/config";
import app from "./app.js";
import { initializeDatabase, closeDatabase } from "./db/index.js";
import { logger } from "./lib/logger.js";
import { getConfig } from "./config.js";
import fs from "fs";
import path from "path";
import { cleanExpiredCache } from "./lib/agent-cache.js";

const config = getConfig();
const PORT = config.PORT;

// Ensure required directories exist
const dirs = ["./data", "./logs", "./workspaces", "./data/summary_uploads", "./data/summary_outputs"];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function main(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info("Database initialized");

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${config.NODE_ENV}`);
      logger.info(`API available at http://localhost:${PORT}/api`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.error(
          `Port ${PORT} is already in use. Stop the other process or change PORT in your config/env.`
        );
        process.exit(1);
      }
      throw err;
    });

    // Cache cleanup job — runs hourly
    const cacheCleanupInterval = setInterval(async () => {
      try {
        const cleaned = await cleanExpiredCache();
        if (cleaned > 0) logger.info({ cleaned }, "Expired cache entries cleaned");
      } catch (err) {
        logger.error({ err }, "Cache cleanup failed");
      }
    }, 3600000);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      clearInterval(cacheCleanupInterval);

      server.close(async () => {
        logger.info("HTTP server closed");
        closeDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

main();
