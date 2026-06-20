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
            if (!req.user) throw ErrorResponses.UNAUTHORISED
            const allShifts = await ShiftHandler.getAllShift(req.user.id) 
            return Success(res, {shifts: allShifts})
        } catch (err) {
            next(err)
        }
    }
)

router.get(
    "/:id",
    authMiddleware,
    async (req, res, next) => {
        try {
            if (!req.user) return next(ErrorResponses.UNAUTHORISED)
            const userId = req.user.id;
            const shiftId = req.params.id as string
            
            const shift = await ShiftHandler.getShiftByIdForUser({
                userId,
                shiftId,
            })
            return Success(res, shift)
        } catch (err) {
            next(err)
        }
    }
)

router.put(
    "/:id",
    authMiddleware,
    async (req, res, next) => {
        try{
            const shiftId = req.params.id as string
            const {newStartTime, newEndTime, employeeId, station, breakMinutes} = req.body
            if (!newStartTime || !newEndTime || !employeeId){
                return next(ErrorResponses.MISSING_FIELDS)
            }
            const updatedShift = await ShiftHandler.updateShift({
                id: shiftId,
                employeeId,
                newStartTime: new Date(newStartTime),
                newEndTime: new Date(newEndTime),
                station,
                breakMinutes,
            })
            return Success(res, updatedShift)
        } catch (err) {
            next(err)
        }
    }
)

router.post(
    "/create",
    authMiddleware,
    async (req, res, next) => {
        try {
            if (!req.user) return next(ErrorResponses.UNAUTHORISED)

            const {employeeId, startTime, endTime, station, breakMinutes} = req.body

            if (!employeeId || !startTime || !endTime) {
                return next(ErrorResponses.MISSING_FIELDS)
            }

            const shift = await ShiftHandler.newShift({
                employeeId,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                station,
                breakMinutes,
            });
            return Success(res, { shift })
        } catch (err) {
            next(err)
        }
    }
)


router.delete(
    "/:id",
    authMiddleware,
    async (req, res, next) => {
        try{
            const shiftId = req.params.id as string
            await ShiftHandler.deleteShift(shiftId)
            return Success(res, {message: "Shift deleted successfully"})

        } catch (err) {
            next(err)
        }
    }
)

export default router
