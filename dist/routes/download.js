import { Router } from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();
const APK_DIR = path.resolve(__dirname, "../../apk/dl");
router.get("/download", (_req, res) => {
    const apkPath = path.join(APK_DIR, "anigen-pro.apk");
    if (!fs.existsSync(apkPath)) {
        res.status(404).json({
            error: {
                code: "APK_NOT_FOUND",
                message: "APK file is not available yet. Please try again later.",
            },
        });
        return;
    }
    const stat = fs.statSync(apkPath);
    const version = process.env.APP_VERSION ?? "1.0.0";
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", `attachment; filename="anigen-pro-${version}.apk"`);
    res.setHeader("Cache-Control", "public, max-age=3600");
    const stream = fs.createReadStream(apkPath);
    stream.pipe(res);
});
router.get("/info", (_req, res) => {
    const apkPath = path.join(APK_DIR, "anigen-pro.apk");
    const exists = fs.existsSync(apkPath);
    const version = process.env.APP_VERSION ?? "1.0.0";
    const size = exists ? fs.statSync(apkPath).size : 0;
    res.json({
        available: exists,
        version,
        sizeBytes: size,
        sizeMB: exists ? Math.round((size / 1024 / 1024) * 10) / 10 : 0,
        minAndroidVersion: "8.0",
        targetAndroidVersion: "14",
        packageName: "com.anigen.app",
        lastUpdated: exists ? fs.statSync(apkPath).mtime.toISOString() : null,
    });
});
export default router;
//# sourceMappingURL=download.js.map