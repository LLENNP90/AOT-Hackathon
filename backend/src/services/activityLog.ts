import { prisma } from "../libs/prisma.js";
import { ActionType } from "../../generated/prisma/enums.js";

export class ActivityLogHandler {
    
    static async createLog(input: {
        userId: string;
        actionType: ActionType;
        metadata: any;
    }) {
        
        return await prisma.activityLog.create({
            data: {
                userId: input.userId,
                actionType: input.actionType,
                metadata: input.metadata
            }
        });
    }

    static async getRecentLogs(userId: string, limit: number = 20) {
        return await prisma.activityLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    // Aggregate the JSON data for the Dashboard Charts
    static async getDashboardMetrics(userId: string) {
        // Fetch all optimization logs for this specific user
        const optimizationLogs = await prisma.activityLog.findMany({
            where: { 
                userId: userId,
                actionType: ActionType.RAM_OPTIMISATION // Make sure your enum matches your Prisma schema
            }
        });

        let totalMoneySaved = 0;
        let totalHoursOptimized = 0;
        let totalRuns = optimizationLogs.length;

        // Parse the flexible JSON metadata bucket
        for (const log of optimizationLogs) {
            // Because metadata is JSON, we cast it to access the keys safely
            const data = log.metadata as any; 
            
            if (data?.moneySaved) {
                totalMoneySaved += Number(data.moneySaved);
            }
            if (data?.hoursOptimized) {
                totalHoursOptimized += Number(data.hoursOptimized);
            }
        }

        return {
            totalMoneySaved,
            totalHoursOptimized,
            totalRuns
        };
    }
}