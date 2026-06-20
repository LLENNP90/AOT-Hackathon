import { Router } from "express";
import { ActivityLogHandler } from "../services/activityLog.js";
import { authMiddleware } from "../middleware/auth.js";
import { Success, ErrorResponses } from "../err/error.js";

const router = Router();

router.get(
    "/metrics",
    authMiddleware,
    async (req, res, next) => {
        try {
            const userId = (req as any).user.id; 
            
            const metrics = await ActivityLogHandler.getDashboardMetrics(userId);
            return Success(res, metrics);
        } catch (err) {
            next(err);
        }
    }
);

router.get(
    "/recent",
    authMiddleware,
    async (req, res, next) => {
        try {
            const userId = (req as any).user.id;
            
            const logs = await ActivityLogHandler.getRecentLogs(userId, 20); // Get last 20 actions
            return Success(res, logs);
        } catch (err) {
            next(err);
        }
    }
);

export default router;