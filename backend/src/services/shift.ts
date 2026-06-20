import { prisma } from "../libs/prisma.js";
import { ErrorResponses } from "../err/error.js";

interface newShiftInput {
    employeeId: string
    startTime: Date
    endTime: Date
}

export class ShiftHandler {
    static async newShift(input: newShiftInput) {
        try {
            return await prisma.shift.create({data: {
                    employeeId: input.employeeId,
                    startTime: input.startTime,
                    endTime: input.endTime,
                    isOptimised: false
                }
            })
        } catch(err) {
            throw err
        }
        
    } 
    static async getAllShift(){
        return await prisma.shift.findMany({
            select: {
                id: true,
                employeeId: true,
                startTime: true,
                endTime: true
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

    static async updateShift(input: {
        id: string,
        employeeId: string
        newStartTime: Date
        newEndTime: Date
    }){
        const shift = await prisma.shift.findFirst({
            where: {
                id: input.id,
                employeeId: input.employeeId,
            }
        })
        if (!shift) throw ErrorResponses.MISSING_FIELDS //CHANGE LATER

        return await prisma.shift.update({
            where: {id: shift.id},
            data: {startTime: input.newStartTime, endTime: input.newEndTime}
        })
    }

    static async deleteShift(shiftId: string) {
        try{
            const shift = await prisma.shift.findUnique({
                where: {id: shiftId}
            })

            if (!shift) {
                return ErrorResponses.EMPLOYEE_NOT_FOUND
            }

            return await prisma.shift.delete({
                where: {id: shiftId}
            });
        } catch (err) {
            throw err
        }
    }
}