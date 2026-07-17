import { Hono } from "hono";
import type { AppEnv } from "../types";

export const downloadRoutes = new Hono<AppEnv>();

// GET /api/app/download — APK binary download. The original streamed a file
// from the local filesystem; that cannot run on Workers. STUB 501.
downloadRoutes.get("/app/download", (c) => {
  return c.json(
    {
      error: {
        code: "NOT_SUPPORTED",
        message: "APK download is not available on this deployment (requires a local binary file).",
      },
    },
    501,
  );
});

// GET /api/app/info — report availability. We have no local filesystem, so
// report unavailable with the same shape the frontend expects.
downloadRoutes.get("/app/info", (c) => {
  const version = (c.env as any).APP_VERSION ?? "1.0.0";
  return c.json({
    available: false,
    version,
    sizeBytes: 0,
    sizeMB: 0,
    minAndroidVersion: "8.0",
    targetAndroidVersion: "14",
    packageName: "com.anigen.app",
    lastUpdated: null,
    note: "APK distribution is not available on this deployment.",
  });
});
