import { Router } from "express";
import { ShiftHandler } from "../services/shift.js";
import { authMiddleware } from "../middleware/auth.js";
import { Success, ErrorResponses } from "../err/error.js";

const router = Router()

router.get(
    "/allShifts",
    authMiddleware,
    async (req, res, next) => {
        try {
            const allShifts = await ShiftHandler.getAllShift() 
            return Success(res, allShifts)
        } catch (err) {
            next(err)
        }
    }
)

export default router