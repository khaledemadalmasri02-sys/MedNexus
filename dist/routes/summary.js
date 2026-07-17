import { Router } from "express";
import { spawn } from "child_process";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { UPLOAD_DIR, OUTPUT_DIR } from "../middleware/upload.js";
import { logger } from "../lib/logger.js";
import { getConfig, isDevelopment } from "../config.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ALLOWED_ORIGINS = isDevelopment()
    ? ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"]
    : [process.env.APP_URL, "https://ankeng.com", "https://www.ankeng.com"].filter(Boolean);
function isAllowedOrigin(origin) {
    return ALLOWED_ORIGINS.includes(origin);
}
const router = Router();
const jobs = new Map();
function cleanupJobs() {
    const oneHourAgo = Date.now() - 3600000;
    for (const [id, job] of jobs) {
        if (job.createdAt < oneHourAgo) {
            if (job.outputPath && fs.existsSync(job.outputPath)) {
                try {
                    fs.unlinkSync(job.outputPath);
                }
                catch { /* ignore */ }
            }
            if (job.mode === "separate" && job.fileProgress) {
                for (const fp of job.fileProgress) {
                    if (fp.outputPath && fs.existsSync(fp.outputPath)) {
                        try {
                            fs.unlinkSync(fp.outputPath);
                        }
                        catch { /* ignore */ }
                    }
                }
            }
            jobs.delete(id);
        }
    }
}
setInterval(cleanupJobs, 600000);
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
function createUploadMiddleware(dest) {
    return multer({
        storage: multer.diskStorage({
            destination: (_req, _file, cb) => {
                cb(null, dest);
            },
            filename: (_req, file, cb) => {
                const ext = path.extname(file.originalname);
                cb(null, `${uuidv4()}${ext}`);
            },
        }),
        limits: {
            fileSize: 100 * 1024 * 1024,
            files: 20,
        },
        // Accept all file types - validation is done by the client
        fileFilter: (_req, _file, cb) => {
            cb(null, true);
        },
    });
}
router.post("/upload", (req, res) => {
    const userId = getUserId(req);
    const userDir = userId || `anon_${uuidv4().slice(0, 8)}`;
    const uploadPath = path.join(UPLOAD_DIR, userDir);
    if (!fs.existsSync(uploadPath))
        fs.mkdirSync(uploadPath, { recursive: true });
    const instance = createUploadMiddleware(uploadPath).array("files", 20);
    instance(req, res, async (err) => {
        if (err) {
            logger.error({ err }, "Upload failed");
            res.status(400).json({ error: { code: "UPLOAD_ERROR", message: err.message } });
            return;
        }
        const files = req.files;
        if (!files || files.length === 0) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No files uploaded" } });
            return;
        }
        const fileMeta = files.map((f) => ({
            id: f.filename,
            name: f.originalname,
            size: f.size,
            path: f.filename,
            type: path.extname(f.originalname).toLowerCase(),
        }));
        res.json({ files: fileMeta, count: fileMeta.length });
    });
});
function sanitizeFileId(fileId) {
    const basename = path.basename(fileId);
    if (!basename || basename !== fileId || basename === "." || basename === "..") {
        return null;
    }
    return basename;
}
function resolveFilePaths(fileIds, userUploadDir, resolvedUploadDir) {
    const filePaths = [];
    const missingIds = [];
    for (const rawId of fileIds) {
        const fileId = sanitizeFileId(rawId);
        if (!fileId) {
            logger.warn({ rawId }, "Rejected unsafe fileId");
            continue;
        }
        const searchDirs = [];
        if (fs.existsSync(userUploadDir)) {
            searchDirs.push(userUploadDir);
        }
        if (userUploadDir !== resolvedUploadDir) {
            searchDirs.push(resolvedUploadDir);
        }
        let found = false;
        for (const dir of searchDirs) {
            const filePath = path.join(dir, fileId);
            try {
                const realPath = fs.realpathSync(filePath);
                const resolvedDir = path.resolve(dir);
                if (!realPath.startsWith(resolvedDir + path.sep) && realPath !== resolvedDir) {
                    continue;
                }
                if (fs.existsSync(realPath)) {
                    filePaths.push(realPath);
                    found = true;
                    break;
                }
            }
            catch {
                continue;
            }
        }
        if (!found && fs.existsSync(resolvedUploadDir)) {
            const subdirs = fs.readdirSync(resolvedUploadDir, { withFileTypes: true })
                .filter((d) => d.isDirectory())
                .map((d) => path.join(resolvedUploadDir, d.name));
            for (const dir of subdirs) {
                const filePath = path.join(dir, fileId);
                try {
                    const realPath = fs.realpathSync(filePath);
                    const resolvedDir = path.resolve(dir);
                    if (!realPath.startsWith(resolvedDir + path.sep) && realPath !== resolvedDir) {
                        continue;
                    }
                    if (fs.existsSync(realPath)) {
                        filePaths.push(realPath);
                        found = true;
                        break;
                    }
                }
                catch {
                    continue;
                }
            }
        }
        if (!found) {
            missingIds.push(fileId);
        }
    }
    return { filePaths, missingIds };
}
function spawnPipeline(scriptPath, filePath, outputPath, style, isClinical, config, generateAudio) {
    const pythonPath = process.env.PYTHON_PATH || "python3";
    const args = [
        scriptPath,
        "--files", filePath,
        "--style", style,
        "--output", outputPath,
        "--chunk-size", "3",
        "--api-base", "https://openrouter.ai/api/v1",
        "--mode", isClinical ? "pipeline" : "generate",
    ];
    if (generateAudio) {
        args.push("--generate-audio");
    }
    return spawn(pythonPath, args, {
        cwd: process.cwd(),
        env: {
            PYTHONUNBUFFERED: "1",
            PATH: process.env.PATH || "",
            HOME: process.env.HOME || "",
            LANG: process.env.LANG || "C.UTF-8",
            OPENROUTER_API_KEY: config.OPENROUTER_API_KEY || "",
        },
    });
}
function handleProcOutput(proc, job, fileProgressIndex, jobId) {
    let stdoutBuf = "";
    proc.stdout.on("data", (data) => {
        stdoutBuf += data.toString();
        const lines = stdoutBuf.split("\n");
        stdoutBuf = lines.pop() || "";
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            try {
                const event = JSON.parse(trimmed);
                job.events.push({ type: event.type, data: event, ts: Date.now() });
                if (event.type === "progress") {
                    const pct = event.percent || 0;
                    job.progress = pct;
                    job.message = event.message || "";
                    if (fileProgressIndex !== null && job.fileProgress[fileProgressIndex]) {
                        job.fileProgress[fileProgressIndex].progress = pct;
                    }
                }
                else if (event.type === "stage") {
                    job.stage = event.stage || "";
                    job.message = event.message || "";
                    if (fileProgressIndex !== null && job.fileProgress[fileProgressIndex]) {
                        job.fileProgress[fileProgressIndex].stage = job.stage;
                    }
                }
                else if (event.type === "file_progress") {
                    const fileName = event.file || "";
                    const fpStatus = event.status || "";
                    const fileIdx = event.index !== undefined ? event.index : -1;
                    const idx = fileIdx >= 0 ? fileIdx : job.fileProgress.findIndex((fp) => fp.fileName === fileName);
                    if (idx !== -1 && job.fileProgress[idx]) {
                        job.fileProgress[idx].stage = fpStatus;
                        if (fpStatus === "done" || fpStatus === "complete") {
                            job.fileProgress[idx].progress = 100;
                            job.fileProgress[idx].status = "complete";
                            job.completedFiles++;
                        }
                        else if (fpStatus === "error") {
                            job.fileProgress[idx].status = "error";
                        }
                        else if (fpStatus === "extracting" || fpStatus === "correcting" || fpStatus === "ai_explaining" || fpStatus === "ai_enhancing" || fpStatus === "ai_processing") {
                            job.fileProgress[idx].status = "processing";
                        }
                    }
                }
                else if (event.type === "complete") {
                    job.progress = 100;
                    job.message = "PDF generation complete";
                    for (const fp of job.fileProgress) {
                        if (fp.status !== "error") {
                            fp.status = "complete";
                            fp.progress = 100;
                            fp.stage = "complete";
                        }
                    }
                    job.completedFiles = job.fileProgress.filter((fp) => fp.status === "complete").length;
                    if (fileProgressIndex !== null && job.fileProgress[fileProgressIndex]) {
                        job.fileProgress[fileProgressIndex].outputPath = event.output || null;
                    }
                }
                else if (event.type === "error") {
                    job.error = event.message || "Unknown error";
                    if (fileProgressIndex !== null && job.fileProgress[fileProgressIndex]) {
                        job.fileProgress[fileProgressIndex].status = "error";
                        job.fileProgress[fileProgressIndex].error = job.error;
                    }
                }
                if (job.res) {
                    job.res.write(`data: ${JSON.stringify(event)}\n\n`);
                }
            }
            catch {
                // skip malformed
            }
        }
    });
    proc.stderr.on("data", (data) => {
        logger.warn({ jobId, stderr: data.toString() }, "Python stderr");
    });
    return new Promise((resolve) => {
        proc.on("close", (code) => {
            if (code !== 0 && job.status !== "error") {
                job.error = `Python process exited with code ${code}`;
                if (fileProgressIndex !== null && job.fileProgress[fileProgressIndex]) {
                    job.fileProgress[fileProgressIndex].status = "error";
                    job.fileProgress[fileProgressIndex].error = job.error;
                }
                if (job.res) {
                    job.res.write(`data: ${JSON.stringify({ type: "error", message: job.error })}\n\n`);
                }
            }
            resolve(code ?? 0);
        });
    });
}
router.post("/generate", async (req, res) => {
    try {
        const { fileIds, style, generateAudio, mode } = req.body;
        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No file IDs provided" } });
            return;
        }
        if (fileIds.length > 20) {
            res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Maximum 20 files allowed" } });
            return;
        }
        const generationMode = mode === "separate" ? "separate" : "combined";
        const sourceDeckIds = Array.isArray(req.body.sourceDeckIds) ? req.body.sourceDeckIds : [];
        const userDir = getUserId(req) || req.ip || "anon";
        const userUploadDir = path.resolve(UPLOAD_DIR, userDir);
        const resolvedUploadDir = path.resolve(UPLOAD_DIR);
        const jobId = `sum_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const { filePaths, missingIds } = resolveFilePaths(fileIds, userUploadDir, resolvedUploadDir);
        if (missingIds.length > 0) {
            logger.warn({ missingIds, userUploadDir, fileCount: filePaths.length }, "Some files not found during generation");
        }
        if (filePaths.length === 0) {
            res.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: `No matching files found. Upload directory: ${fs.existsSync(userUploadDir) ? "exists" : "missing"}, Files requested: ${fileIds.length}`,
                    hint: "Re-upload the files and try again. Files may have expired or the session changed.",
                },
            });
            return;
        }
        const config = getConfig();
        const isClinical = (style || "academic") === "clinical";
        const scriptPath = isClinical
            ? path.join(process.cwd(), "src", "scripts", "clinical_pdf_generator.py")
            : path.join(process.cwd(), "src", "scripts", "summary_builder_enhanced.py");
        const fileProgress = filePaths.map((fp) => ({
            fileName: path.basename(fp),
            progress: 0,
            stage: "waiting",
            status: "waiting",
            outputPath: null,
            error: null,
        }));
        const job = {
            id: jobId,
            mode: generationMode,
            status: "pending",
            progress: 0,
            stage: "initializing",
            message: "Starting…",
            outputPath: null,
            error: null,
            events: [],
            createdAt: Date.now(),
            res: null,
            fileProgress,
            totalFiles: filePaths.length,
            completedFiles: 0,
            sourceDeckIds,
        };
        jobs.set(jobId, job);
        if (generationMode === "combined") {
            const outputPath = path.join(OUTPUT_DIR, `${jobId}.pdf`);
            job.status = "running";
            job.outputPath = outputPath;
            for (const fp of job.fileProgress) {
                fp.status = "processing";
                fp.stage = "queued";
            }
            const proc = spawnPipeline(scriptPath, filePaths.join(","), outputPath, style, isClinical, config, generateAudio || false);
            handleProcOutput(proc, job, null, jobId).then((code) => {
                if (code === 0) {
                    job.status = "completed";
                    job.progress = 100;
                    job.message = "PDF generation complete";
                    for (const fp of job.fileProgress) {
                        if (fp.status !== "error") {
                            fp.status = "complete";
                            fp.progress = 100;
                        }
                    }
                    job.completedFiles = job.fileProgress.filter((fp) => fp.status === "complete").length;
                }
                else if (job.status !== "error") {
                    job.status = "error";
                    job.error = `Python process exited with code ${code}`;
                }
                if (job.res) {
                    job.res.write(`data: ${JSON.stringify({ type: "done", status: job.status })}\n\n`);
                    job.res.end();
                }
                job.res = null;
            });
            res.json({ jobId, status: "running", mode: "combined" });
        }
        else {
            job.status = "running";
            job.outputPath = null;
            res.json({ jobId, status: "running", mode: "separate", totalFiles: filePaths.length });
            let hasError = false;
            for (let i = 0; i < filePaths.length; i++) {
                if (hasError)
                    break;
                const fp = filePaths[i];
                const fileName = path.basename(fp);
                const outputPath = path.join(OUTPUT_DIR, `${jobId}_${i}.pdf`);
                job.fileProgress[i].status = "processing";
                job.fileProgress[i].stage = "starting";
                job.message = `Processing file ${i + 1} of ${filePaths.length}: ${fileName}`;
                if (job.res) {
                    job.res.write(`data: ${JSON.stringify({ type: "file_start", index: i, fileName, total: filePaths.length })}\n\n`);
                }
                const proc = spawnPipeline(scriptPath, fp, outputPath, style, isClinical, config, false);
                const code = await handleProcOutput(proc, job, i, jobId);
                if (code === 0 && job.fileProgress[i].status !== "error") {
                    job.fileProgress[i].status = "complete";
                    job.fileProgress[i].progress = 100;
                    job.fileProgress[i].outputPath = outputPath;
                    job.fileProgress[i].stage = "complete";
                    job.completedFiles++;
                    if (job.res) {
                        job.res.write(`data: ${JSON.stringify({ type: "file_complete", index: i, fileName, output: outputPath })}\n\n`);
                    }
                }
                else {
                    job.fileProgress[i].status = "error";
                    job.fileProgress[i].error = job.error || `Process exited with code ${code}`;
                    hasError = true;
                    if (job.res) {
                        job.res.write(`data: ${JSON.stringify({ type: "file_error", index: i, fileName, message: job.fileProgress[i].error })}\n\n`);
                    }
                }
            }
            if (!hasError) {
                job.status = "completed";
                job.progress = 100;
                job.stage = "complete";
                job.message = `All ${filePaths.length} summaries generated`;
                if (job.res) {
                    job.res.write(`data: ${JSON.stringify({ type: "all_complete", totalFiles: filePaths.length })}\n\n`);
                }
            }
            else {
                job.status = "error";
                job.message = "One or more files failed";
                if (job.res) {
                    job.res.write(`data: ${JSON.stringify({ type: "error", message: job.error || "Processing failed" })}\n\n`);
                }
            }
            if (job.res) {
                job.res.write(`data: ${JSON.stringify({ type: "done", status: job.status })}\n\n`);
                job.res.end();
            }
            job.res = null;
        }
    }
    catch (err) {
        logger.error({ err }, "Failed to start generation");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to start generation" } });
    }
});
router.get("/status/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
        return;
    }
    const acceptJson = req.headers.accept?.includes("application/json");
    if (acceptJson) {
        res.json({
            type: "status",
            status: job.status,
            progress: job.progress,
            stage: job.stage,
            message: job.message,
            outputPath: job.outputPath,
            error: job.error,
            events: job.events,
            mode: job.mode,
            fileProgress: job.fileProgress,
            totalFiles: job.totalFiles,
            completedFiles: job.completedFiles,
            sourceDeckIds: job.sourceDeckIds,
        });
        return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    const allowedOrigins = req.headers.origin && isAllowedOrigin(req.headers.origin)
        ? req.headers.origin
        : "";
    if (allowedOrigins) {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigins);
    }
    res.flushHeaders();
    for (const event of job.events) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    if (job.status === "completed" || job.status === "error") {
        res.write(`data: ${JSON.stringify({ type: "done", status: job.status })}\n\n`);
        res.end();
        return;
    }
    job.res = res;
    const keepAlive = setInterval(() => {
        res.write(": keepalive\n\n");
    }, 15000);
    req.on("close", () => {
        clearInterval(keepAlive);
        if (job.res === res) {
            job.res = null;
        }
    });
});
function sanitizeJobId(id) {
    if (!id || id.length > 100)
        return null;
    if (id.includes("..") || id.includes("/") || id.includes("\\"))
        return null;
    if (!/^sum_\d+_[a-z0-9]+(?:_\d+)?$/.test(id))
        return null;
    return id;
}
router.get("/download/:id", (req, res) => {
    const jobId = sanitizeJobId(req.params.id);
    if (!jobId) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid job ID" } });
        return;
    }
    const filePath = path.join(OUTPUT_DIR, `${jobId}.pdf`);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "PDF not found" } });
        return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="summary-${jobId}.pdf"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
});
router.get("/download/:id/:index", (req, res) => {
    const jobId = sanitizeJobId(req.params.id);
    const idx = parseInt(req.params.index, 10);
    if (!jobId || isNaN(idx) || idx < 0) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid job ID or index" } });
        return;
    }
    const filePath = path.join(OUTPUT_DIR, `${jobId}_${idx}.pdf`);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "PDF not found" } });
        return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="summary-${jobId}_${idx}.pdf"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
});
router.get("/files/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
        return;
    }
    const files = job.fileProgress.map((fp, idx) => ({
        index: idx,
        fileName: fp.fileName,
        status: fp.status,
        progress: fp.progress,
        stage: fp.stage,
        error: fp.error,
        downloadUrl: fp.outputPath ? `/api/summary/download/${req.params.id}/${idx}` : null,
        previewUrl: fp.outputPath ? `/api/summary/preview/${req.params.id}_${idx}` : null,
    }));
    res.json({ files, mode: job.mode, status: job.status, totalFiles: job.totalFiles, completedFiles: job.completedFiles });
});
router.delete("/:id", (req, res) => {
    const job = jobs.get(req.params.id);
    if (job) {
        if (job.outputPath && fs.existsSync(job.outputPath)) {
            try {
                fs.unlinkSync(job.outputPath);
            }
            catch { /* ignore */ }
        }
        if (job.mode === "separate") {
            for (const fp of job.fileProgress) {
                if (fp.outputPath && fs.existsSync(fp.outputPath)) {
                    try {
                        fs.unlinkSync(fp.outputPath);
                    }
                    catch { /* ignore */ }
                }
            }
        }
    }
    jobs.delete(req.params.id);
    res.status(204).send();
});
router.post("/shell", async (req, res) => {
    if (!req.isAuthenticated()) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
        return;
    }
    const adminKey = req.headers["x-admin-key"];
    const secret = getConfig().ADMIN_SECRET_KEY;
    if (!secret || adminKey !== secret) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Admin access required for shell execution" } });
        return;
    }
    const { jobId, command, workingDir } = req.body;
    if (!command || typeof command !== "string") {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Command required" } });
        return;
    }
    if (command.length > 200) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Command too long" } });
        return;
    }
    const SHELL_ALLOWLIST = /^(ls|cat|echo|pwd|head|tail|wc|sort|uniq|grep|find|date|whoami)\s/;
    if (!SHELL_ALLOWLIST.test(command.trim())) {
        res.status(403).json({ error: { code: "FORBIDDEN", message: "Command not allowed in shell mode" } });
        return;
    }
    const dangerousPatterns = [
        /[;&|`$]/, /\$\(/, /\\\n/, /\n/,
    ];
    for (const pattern of dangerousPatterns) {
        if (pattern.test(command)) {
            res.status(403).json({ error: { code: "FORBIDDEN", message: "Dangerous pattern detected in command" } });
            return;
        }
    }
    try {
        const scriptPath = path.join(process.cwd(), "src", "scripts", "summary_builder_enhanced.py");
        const args = [
            scriptPath,
            "--files", "/dev/null",
            "--style", "academic",
            "--output", "/dev/null",
            "--mode", "shell",
            "--shell-command", command,
        ];
        if (workingDir && !workingDir.includes("..") && !workingDir.includes("/")) {
            args.push("--shell-dir", workingDir);
        }
        const proc = spawn(process.env.PYTHON_PATH || "python3", args, {
            cwd: process.cwd(),
            env: {
                PYTHONUNBUFFERED: "1",
                PATH: process.env.PATH || "",
                HOME: process.env.HOME || "",
                OPENROUTER_API_KEY: getConfig().OPENROUTER_API_KEY || "",
            },
        });
        let result = "";
        proc.stdout.on("data", (data) => { result += data.toString(); });
        proc.stderr.on("data", (data) => {
            logger.warn({ jobId, stderr: data.toString() }, "Python stderr (shell)");
        });
        proc.on("close", (code) => {
            try {
                const parsed = JSON.parse(result.trim());
                res.json(parsed);
            }
            catch {
                res.json({ stdout: result.trim(), stderr: "", exit_code: code, success: code === 0 });
            }
        });
    }
    catch (err) {
        logger.error({ err }, "Shell request failed");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Shell execution failed" } });
    }
});
router.get("/audio/:id", (req, res) => {
    const filePath = path.join(OUTPUT_DIR, `${req.params.id}.mp3`);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Audio not found" } });
        return;
    }
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "inline");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
});
router.post("/ask", async (req, res) => {
    const { jobId, question } = req.body;
    if (!jobId || !question) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "jobId and question required" } });
        return;
    }
    if (question.length > 2000) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Question too long (max 2000 chars)" } });
        return;
    }
    const job = jobs.get(jobId);
    if (!job) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Job not found" } });
        return;
    }
    try {
        const { spawn } = await import("child_process");
        const config = getConfig();
        const scriptPath = path.join(process.cwd(), "src", "scripts", "summary_builder_enhanced.py");
        const args = [
            scriptPath,
            "--files", "/dev/null",
            "--style", "academic",
            "--output", "/dev/null",
            "--mode", "qa",
            "--job-data", JSON.stringify(job.events),
            "--question", question,
            "--api-base", "https://openrouter.ai/api/v1",
        ];
        const proc = spawn(process.env.PYTHON_PATH || "python3", args, {
            cwd: process.cwd(),
            env: {
                PYTHONUNBUFFERED: "1",
                PATH: process.env.PATH || "",
                HOME: process.env.HOME || "",
                LANG: process.env.LANG || "C.UTF-8",
                OPENROUTER_API_KEY: config.OPENROUTER_API_KEY || "",
            },
        });
        let result = "";
        proc.stdout.on("data", (data) => { result += data.toString(); });
        proc.stderr.on("data", (data) => {
            logger.warn({ jobId, stderr: data.toString() }, "Python stderr (qa)");
        });
        proc.on("close", (code) => {
            if (code !== 0) {
                res.status(500).json({ error: { code: "QA_ERROR", message: "Q&A processing failed" } });
                return;
            }
            try {
                const answer = JSON.parse(result.trim());
                res.json(answer);
            }
            catch {
                res.json({ answer: result.trim() || "No answer available." });
            }
        });
    }
    catch (err) {
        logger.error({ err }, "Q&A request failed");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Q&A failed" } });
    }
});
router.get("/list", (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            res.json({ summaries: [] });
            return;
        }
        if (!fs.existsSync(OUTPUT_DIR)) {
            res.json({ summaries: [] });
            return;
        }
        const files = fs.readdirSync(OUTPUT_DIR)
            .filter((f) => f.endsWith(".pdf"))
            .map((f) => {
            const filePath = path.join(OUTPUT_DIR, f);
            const stat = fs.statSync(filePath);
            const id = f.replace(".pdf", "");
            const job = jobs.get(id);
            return {
                id,
                fileName: f,
                size: stat.size,
                createdAt: stat.birthtime.toISOString(),
                downloadUrl: `/api/summary/download/${id}`,
                previewUrl: `/api/summary/preview/${id}`,
                sourceDeckIds: job?.sourceDeckIds || [],
            };
        })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ summaries: files });
    }
    catch (err) {
        logger.error({ err }, "Failed to list summaries");
        res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to list summaries" } });
    }
});
router.get("/preview/:id", (req, res) => {
    const jobId = sanitizeJobId(req.params.id);
    if (!jobId) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid job ID" } });
        return;
    }
    const filePath = path.join(OUTPUT_DIR, `${jobId}.pdf`);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "PDF not found" } });
        return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${jobId}.pdf"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Accept-Ranges", "bytes");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
});
router.get("/preview/:id/:index", (req, res) => {
    const jobId = sanitizeJobId(req.params.id);
    const idx = parseInt(req.params.index, 10);
    if (!jobId || isNaN(idx) || idx < 0) {
        res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid job ID or index" } });
        return;
    }
    const filePath = path.join(OUTPUT_DIR, `${jobId}_${idx}.pdf`);
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "PDF not found" } });
        return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${jobId}_${idx}.pdf"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Accept-Ranges", "bytes");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
});
export default router;
//# sourceMappingURL=summary.js.map