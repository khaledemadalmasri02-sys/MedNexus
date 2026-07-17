import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../lib/logger.js";
const router = Router();
const offlineQueue = new Map();
// Get user ID from request
function getUserId(req) {
    return req.isAuthenticated() ? req.user.id : null;
}
// Queue generation for offline sync
router.post("/queue", async (req, res) => {
    const { type, payload } = req.body;
    if (!type || !payload) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Type and payload are required" },
        });
        return;
    }
    const validTypes = ["generate", "explain", "extract"];
    if (!validTypes.includes(type)) {
        res.status(400).json({
            error: { code: "VALIDATION_ERROR", message: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        });
        return;
    }
    try {
        const userId = getUserId(req);
        const id = uuidv4();
        const item = {
            id,
            userId,
            type,
            payload,
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        offlineQueue.set(id, item);
        logger.info({ id, type }, "Item queued for offline processing");
        res.status(201).json({
            id,
            status: "pending",
            message: "Item queued for processing",
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to queue item");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to queue item" },
        });
    }
});
// Get queued items
router.get("/queue", async (req, res) => {
    try {
        const userId = getUserId(req);
        const status = req.query.status;
        let items = Array.from(offlineQueue.values()).filter(item => item.userId === userId);
        if (status) {
            items = items.filter(item => item.status === status);
        }
        // Sort by creation date, newest first
        items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        res.json({
            items,
            total: items.length,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to get queue");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to get queue" },
        });
    }
});
// Get single queue item
router.get("/queue/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const userId = getUserId(req);
        const item = offlineQueue.get(id);
        if (!item) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Item not found" } });
            return;
        }
        if (item.userId !== userId) {
            res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
            return;
        }
        res.json(item);
    }
    catch (err) {
        logger.error({ err }, "Failed to get queue item");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to get queue item" },
        });
    }
});
// Remove queued item
router.delete("/queue/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const userId = getUserId(req);
        const item = offlineQueue.get(id);
        if (!item) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Item not found" } });
            return;
        }
        if (item.userId !== userId) {
            res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
            return;
        }
        offlineQueue.delete(id);
        res.status(204).send();
    }
    catch (err) {
        logger.error({ err }, "Failed to delete queue item");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to delete queue item" },
        });
    }
});
// Update queue item (for syncing results back)
router.patch("/queue/:id", async (req, res) => {
    const { id } = req.params;
    const { status, result, error } = req.body;
    try {
        const userId = getUserId(req);
        const item = offlineQueue.get(id);
        if (!item) {
            res.status(404).json({ error: { code: "NOT_FOUND", message: "Item not found" } });
            return;
        }
        if (item.userId !== userId) {
            res.status(403).json({ error: { code: "FORBIDDEN", message: "Access denied" } });
            return;
        }
        if (status) {
            item.status = status;
        }
        if (result) {
            item.result = result;
        }
        if (error) {
            item.error = error;
        }
        item.updatedAt = new Date();
        offlineQueue.set(id, item);
        res.json(item);
    }
    catch (err) {
        logger.error({ err }, "Failed to update queue item");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to update queue item" },
        });
    }
});
// Clear all completed/failed items
router.delete("/queue", async (req, res) => {
    try {
        const userId = getUserId(req);
        for (const [id, item] of offlineQueue.entries()) {
            if (item.userId === userId && (item.status === "completed" || item.status === "failed")) {
                offlineQueue.delete(id);
            }
        }
        res.status(204).send();
    }
    catch (err) {
        logger.error({ err }, "Failed to clear queue");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to clear queue" },
        });
    }
});
// Process queue (admin/background endpoint)
router.post("/process", async (req, res) => {
    try {
        const pendingItems = Array.from(offlineQueue.values()).filter(item => item.status === "pending");
        // In a real implementation, this would trigger background processing
        // For now, just mark items as processing
        for (const item of pendingItems.slice(0, 5)) { // Process max 5 at a time
            item.status = "processing";
            item.updatedAt = new Date();
            offlineQueue.set(item.id, item);
        }
        res.json({
            processed: Math.min(pendingItems.length, 5),
            total: pendingItems.length,
        });
    }
    catch (err) {
        logger.error({ err }, "Failed to process queue");
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message: "Failed to process queue" },
        });
    }
});
export default router;
//# sourceMappingURL=offline.js.map