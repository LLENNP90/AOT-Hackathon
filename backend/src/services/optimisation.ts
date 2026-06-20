import { prisma } from "../libs/prisma.js";
import { ActivityLogHandler } from "./activityLog.js"; // Assume you created this earlier
import { ActionType } from "../../generated/prisma/enums.js";

interface DailyDemand {
    date: string; // Format: "YYYY-MM-DD" e.g., "2026-06-25"
    hourlyNeeds: Record<string, number>; // e.g., { "8": 2, "9": 3, "10": 4 }
}

export class OptimizationService {
    static async generateWeeklySchedule(userId: string, weekDemand: DailyDemand[]) {
        // sorted by cheapest wage
        const staff = await prisma.employee.findMany({
            where: { userId: userId },
            orderBy: { hourlyWage: 'asc' } 
        });

        if (staff.length === 0) throw new Error("No staff available to schedule");

        let allOptimizedShifts: {
            employeeId: string;
            startTime: Date;
            endTime: Date;
            isOptimised: boolean;
        }[] = [];
        let totalCost = 0;
        let totalHoursOptimized = 0;

        // loop through each day
        for (const day of weekDemand) {
            
            let dailySchedules: Record<string, number[]> = {};
            staff.forEach(s => dailySchedules[s.id] = []);

            // loop thru every possible hour
            for (let hour = 0; hour < 24; hour++) {
                const neededCount = day.hourlyNeeds[hour.toString()] || 0;
                
                if (neededCount > 0) {
                    // slice the exact number of cheapest staff needed
                    const assignedStaff = staff.slice(0, neededCount);

                    for (const emp of assignedStaff) {
                        dailySchedules[emp.id]!.push(hour);
                        totalCost += emp.hourlyWage;
                        totalHoursOptimized += 1;
                    }
                }
            }

            // merge contiguous hours into Prisma Shift objects
            for (const emp of staff) {
                const hoursWorked = dailySchedules[emp.id];
                if (hoursWorked!.length === 0) continue; // skip if they didn't work today

                hoursWorked!.sort((a, b) => a - b); // ensure chronological order

                let shiftStartHour = hoursWorked![0];
                let previousHour = hoursWorked![0];

                for (let i = 1; i <= hoursWorked!.length; i++) {
                    const currentHour = hoursWorked![i];
                    
                    // If there is a gap (e.g., worked 9, then 12) OR we reached the end of the array
                    if (currentHour !== previousHour! + 1 || i === hoursWorked!.length) {
                        
                        // Create valid JS Dates for Prisma
                        const shiftStart = new Date(`${day.date}T00:00:00+08:00`);
                        shiftStart.setHours(shiftStartHour!);
                        
                        const shiftEnd = new Date(`${day.date}T00:00:00+08:00`);
                        shiftEnd.setHours(previousHour! + 1); 

                        allOptimizedShifts.push({
                            employeeId: emp.id,
                            startTime: shiftStart,
                            endTime: shiftEnd,
                            isOptimised: true
                        });

                        shiftStartHour = currentHour; // reset for a potential second shift later that day
                    }
                    previousHour = currentHour;
                }
            }
        }

        // save everything to the database in one massive transaction
        await prisma.shift.createMany({
            data: allOptimizedShifts
        });

        // log the ROI for the frontend dashboard
        // assuming unoptimized scheduling usually costs 20% more for demo purposes
        const estimatedOldCost = totalCost * 1.20; 
        
        await ActivityLogHandler.createLog({
            userId: userId,
            actionType: ActionType.RAM_OPTIMISATION,
            metadata: {
                moneySaved: estimatedOldCost - totalCost,
                newCost: totalCost,
                oldCost: estimatedOldCost,
                hoursOptimized: totalHoursOptimized
            }
        });

        return {
            shiftsGenerated: allOptimizedShifts.length,
            estimatedOldCost,
            totalCost,
            moneySaved: estimatedOldCost - totalCost
        };
    }
}