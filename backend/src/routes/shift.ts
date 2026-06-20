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
            const employeeId = (req as any).employee.id;
            const shiftId = req.params.id as string
            
            const shift = await ShiftHandler.getShiftById({
                employeeId: employeeId,
                shiftId: shiftId
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
            const {newStartTime, newEndTime, employeeId} = req.body
            // const employeeId = (req as any).employeeId
            if (!newStartTime || !newEndTime || !employeeId){
                return ErrorResponses.MISSING_FIELDS
            }
            const updatedShift = await ShiftHandler.updateShift({
                id: shiftId, 
                employeeId,
                newStartTime: new Date(newStartTime),
                newEndTime: new Date(newEndTime)
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
        if (!req.user) throw ErrorResponses.UNAUTHORISED

        const {employeeId, startTime, endTime} = req.body

        const shift = await ShiftHandler.newShift({
            employeeId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
        });
        Success(res, { shift })
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