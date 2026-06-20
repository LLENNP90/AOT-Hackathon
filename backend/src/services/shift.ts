import { prisma } from "../libs/prisma.js";
import { ErrorResponses } from "../err/error.js";

interface newShiftInput {
    employeeId: string
    startTime: Date
    endTime: Date
    station?: string
    breakMinutes?: number
}

export class ShiftHandler {
    static async newShift( input: newShiftInput) {


        return await prisma.shift.create({
            data: {
                employeeId: input.employeeId,
                startTime: input.startTime,
                endTime: input.endTime,
                ...(input.station !== undefined && { station: input.station }),
                breakMinutes: input.breakMinutes ?? 0,
                isOptimised: false
            }
        })

    } 
    static async getAllShift(userId: string){
        return await prisma.shift.findMany({
            where: {
                employee: {
                    userId
                }
            },
            select: {
                id: true,
                employeeId: true,
                startTime: true,
                endTime: true,
                station: true,
                breakMinutes: true,
                isOptimised: true
            }
        })
    }
    static async getShiftById(input: {
        employeeId: string,
        shiftId: string,
    }) {
        const shift = await prisma.shift.findFirst({
            where: {
                id: input.shiftId,
                employeeId: input.employeeId
            }
        })
        return shift
    }

    static async getShiftByIdForUser(input: {
        userId: string,
        shiftId: string,
    }) {
        const shift = await prisma.shift.findFirst({
            where: {
                id: input.shiftId,
                employee: { userId: input.userId }
            }
        })
        if (!shift) throw ErrorResponses.EMPLOYEE_NOT_FOUND
        return shift
    }

    static async updateShift(input: {
        id: string,
        employeeId: string
        newStartTime: Date
        newEndTime: Date
        station?: string
        breakMinutes?: number
    }){
        // Look up by shiftId only — employeeId may be changing (user is reassigning the shift)
        const shift = await prisma.shift.findUnique({
            where: { id: input.id }
        })
        if (!shift) throw ErrorResponses.EMPLOYEE_NOT_FOUND

        return await prisma.shift.update({
            where: {id: shift.id},
            data: {
                employeeId: input.employeeId,
                startTime: input.newStartTime,
                endTime: input.newEndTime,
                ...(input.station !== undefined && { station: input.station }),
                ...(input.breakMinutes !== undefined && { breakMinutes: input.breakMinutes }),
            }
        })
    }

    static async deleteShift(shiftId: string) {
        try{
            const shift = await prisma.shift.findUnique({
                where: {id: shiftId}
            })

            if (!shift) {
                throw ErrorResponses.EMPLOYEE_NOT_FOUND
            }

            return await prisma.shift.delete({
                where: {id: shiftId}
            });
        } catch (err) {
            throw err
        }
    }
}
