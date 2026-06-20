import { Router } from "express";
import { OptimizationService } from "../services/optimisation.js";
import { authMiddleware } from "../middleware/auth.js";
import { Success, ErrorResponses } from "../err/error.js";

const router = Router();

router.post("/optimise", authMiddleware, async (req, res, next) => {
    try {
        const userId = (req as any).user.id;
        const { weekDemand } = req.body;

        const result = await OptimizationService.generateWeeklySchedule(userId, weekDemand);
        
        return Success(res, result);
    } catch (err) {
        next(err);
    }
});

export default router