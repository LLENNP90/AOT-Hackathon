import { prisma } from "../libs/prisma.js";
import { ActivityLogHandler } from "./activityLog.js";
import { ActionType } from "../../generated/prisma/enums.js";

interface DemandRequirement {
  station?: string;
  role?: string;
  hourlyNeeds: Record<string, number>;
}

interface DailyDemand {
  date: string;
  hourlyNeeds?: Record<string, number>;
  requirements?: DemandRequirement[];
}

interface OptimisationOptions {
  breakAfterHours?: number;
  breakDurationMinutes?: number;
  fairnessWeight?: number;
}

interface AvailabilityWindow {
  dayOfWeek: number | null;
  date: Date | null;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface SchedulingEmployee {
  id: string;
  name: string;
  role: string;
  hourlyWage: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  minShiftHours: number;
  stationSkills: string[];
  availability: AvailabilityWindow[];
}

interface ExistingShift {
  id: string;
  employeeId: string;
  startTime: Date;
  endTime: Date;
  station: string | null;
  employee: {
    role: string;
  };
}

interface ProposedShift {
  employeeId: string;
  employeeName: string;
  role: string;
  station: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isOptimised: true;
}

const DEFAULT_STATION = "Register";
const DEFAULT_BREAK_AFTER_HOURS = 6;
const DEFAULT_BREAK_DURATION_MINUTES = 30;
const DEFAULT_FAIRNESS_WEIGHT = 0.75;
const MALAYSIA_OFFSET = "+08:00";

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

const dateAtHour = (date: string, hour: number) => {
  const base = new Date(`${date}T00:00:00${MALAYSIA_OFFSET}`);
  base.setHours(hour, 0, 0, 0);
  return base;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getWeekStart = (date: string) => {
  const start = dateAtHour(date, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getWeekEnd = (date: string) => {
  const end = getWeekStart(date);
  end.setDate(end.getDate() + 7);
  return end;
};

const overlapHours = (startA: Date, endA: Date, startB: Date, endB: Date) => {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());
  return Math.max(0, (end - start) / (1000 * 60 * 60));
};

const parseMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

const assignmentKey = (employeeId: string, date: string, station: string) =>
  `${employeeId}:${date}:${station}`;

const normalizeDemand = (day: DailyDemand): DemandRequirement[] => {
  if (day.requirements?.length) {
    return day.requirements.map((requirement) => ({
      ...requirement,
      station: requirement.station ?? DEFAULT_STATION,
    }));
  }

  return [
    {
      station: DEFAULT_STATION,
      hourlyNeeds: day.hourlyNeeds ?? {},
    },
  ];
};

const isSameDemandDate = (availabilityDate: Date | null, date: string) => {
  if (!availabilityDate) return false;
  return formatDateKey(availabilityDate) === date;
};

const isWithinWindow = (startTime: string, endTime: string, hour: number) => {
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;
  return parseMinutes(startTime) <= hourStart && parseMinutes(endTime) >= hourEnd;
};

const isAvailableForHour = (employee: SchedulingEmployee, date: string, hour: number) => {
  const dateSpecific = employee.availability.filter((availability) =>
    isSameDemandDate(availability.date, date)
  );
  const dayOfWeek = dateAtHour(date, 0).getDay();
  const repeating = employee.availability.filter(
    (availability) => availability.date === null && availability.dayOfWeek === dayOfWeek
  );

  const windows = dateSpecific.length > 0 ? dateSpecific : repeating;
  if (windows.length === 0) return true;

  const blocks = windows.filter(
    (availability) => !availability.isAvailable && isWithinWindow(availability.startTime, availability.endTime, hour)
  );
  if (blocks.length > 0) return false;

  const availableWindows = windows.filter((availability) => availability.isAvailable);
  if (availableWindows.length === 0) return true;

  return availableWindows.some((availability) =>
    isWithinWindow(availability.startTime, availability.endTime, hour)
  );
};

const shiftCoversHour = (shift: ExistingShift, date: string, hour: number) => {
  const start = dateAtHour(date, hour);
  const end = dateAtHour(date, hour + 1);
  return overlapHours(shift.startTime, shift.endTime, start, end) > 0;
};

const countHoursForRange = (
  shifts: ExistingShift[],
  employeeId: string,
  rangeStart: Date,
  rangeEnd: Date
) =>
  shifts
    .filter((shift) => shift.employeeId === employeeId)
    .reduce((total, shift) => total + overlapHours(shift.startTime, shift.endTime, rangeStart, rangeEnd), 0);

const setSizeForPrefix = (assignments: Map<string, Set<number>>, prefix: string) => {
  let total = 0;
  assignments.forEach((hours, key) => {
    if (key.startsWith(prefix)) total += hours.size;
  });
  return total;
};

const hasProposedHour = (
  assignments: Map<string, Set<number>>,
  employeeId: string,
  date: string,
  hour: number
) => {
  let hasHour = false;
  assignments.forEach((hours, key) => {
    if (key.startsWith(`${employeeId}:${date}:`) && hours.has(hour)) {
      hasHour = true;
    }
  });
  return hasHour;
};

const hasStationSkill = (employee: SchedulingEmployee, station?: string) => {
  if (!station || employee.stationSkills.length === 0) return true;
  return employee.stationSkills.map(normalize).includes(normalize(station));
};

export class OptimizationService {
  static async previewSchedule(
    userId: string,
    weekDemand: DailyDemand[],
    options: OptimisationOptions = {}
  ) {
    if (!weekDemand?.length) throw new Error("No demand provided");

    const staff = await prisma.employee.findMany({
      where: { userId },
      include: { availability: true },
    });

    if (staff.length === 0) throw new Error("No staff available to schedule");

    const employees = staff as SchedulingEmployee[];
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

    const rangeStart = new Date(Math.min(...weekDemand.map((day) => dateAtHour(day.date, 0).getTime())));
    const rangeEnd = new Date(Math.max(...weekDemand.map((day) => dateAtHour(day.date, 24).getTime())));

    const existingShifts = (await prisma.shift.findMany({
      where: {
        employee: { userId },
        startTime: { lt: rangeEnd },
        endTime: { gt: rangeStart },
      },
      include: {
        employee: {
          select: {
            role: true,
          },
        },
      },
    })) as ExistingShift[];

    const assignments = new Map<string, Set<number>>();
    const warnings: string[] = [];
    let requestedStaffHours = 0;
    let existingCoveredStaffHours = 0;
    const unfilledSlots: {
      date: string;
      hour: number;
      station: string;
      role?: string;
      missing: number;
    }[] = [];

    const fairnessWeight = options.fairnessWeight ?? DEFAULT_FAIRNESS_WEIGHT;

    const canAssign = (
      employee: SchedulingEmployee,
      day: DailyDemand,
      hour: number,
      station: string,
      role?: string
    ) => {
      if (role && normalize(employee.role) !== normalize(role)) return false;
      if (!hasStationSkill(employee, station)) return false;
      if (!isAvailableForHour(employee, day.date, hour)) return false;
      if (existingShifts.some((shift) => shift.employeeId === employee.id && shiftCoversHour(shift, day.date, hour))) {
        return false;
      }
      if (hasProposedHour(assignments, employee.id, day.date, hour)) return false;

      const dayStart = dateAtHour(day.date, 0);
      const dayEnd = dateAtHour(day.date, 24);
      const weekStart = getWeekStart(day.date);
      const weekEnd = getWeekEnd(day.date);
      const proposedDayHours = setSizeForPrefix(assignments, `${employee.id}:${day.date}:`);
      const proposedWeekHours = weekDemand
        .filter((candidateDay) => {
          const candidateDate = dateAtHour(candidateDay.date, 0);
          return candidateDate >= weekStart && candidateDate < weekEnd;
        })
        .reduce((total, candidateDay) => total + setSizeForPrefix(assignments, `${employee.id}:${candidateDay.date}:`), 0);

      const existingDayHours = countHoursForRange(existingShifts, employee.id, dayStart, dayEnd);
      const existingWeekHours = countHoursForRange(existingShifts, employee.id, weekStart, weekEnd);

      return (
        existingDayHours + proposedDayHours + 1 <= employee.maxDailyHours &&
        existingWeekHours + proposedWeekHours + 1 <= employee.maxWeeklyHours
      );
    };

    for (const day of weekDemand) {
      for (const requirement of normalizeDemand(day)) {
        const station = requirement.station ?? DEFAULT_STATION;

        for (let hour = 0; hour < 24; hour++) {
          const requested = requirement.hourlyNeeds[hour.toString()] ?? 0;
          if (requested <= 0) continue;
          requestedStaffHours += requested;

          const existingCoverage = existingShifts.filter((shift) => {
            const roleMatches = !requirement.role || normalize(shift.employee.role) === normalize(requirement.role);
            const stationMatches = !station || normalize(shift.station ?? DEFAULT_STATION) === normalize(station);
            return roleMatches && stationMatches && shiftCoversHour(shift, day.date, hour);
          }).length;
          existingCoveredStaffHours += Math.min(requested, existingCoverage);

          const remainingNeed = Math.max(0, requested - existingCoverage);
          const assignedThisSlot = new Set<string>();

          for (let index = 0; index < remainingNeed; index++) {
            const candidates = employees
              .filter((employee) => !assignedThisSlot.has(employee.id))
              .filter((employee) => canAssign(employee, day, hour, station, requirement.role))
              .sort((a, b) => {
                const weekStart = getWeekStart(day.date);
                const weekEnd = getWeekEnd(day.date);
                const aExistingHours = countHoursForRange(existingShifts, a.id, weekStart, weekEnd);
                const bExistingHours = countHoursForRange(existingShifts, b.id, weekStart, weekEnd);
                const aProposedHours = setSizeForPrefix(assignments, `${a.id}:`);
                const bProposedHours = setSizeForPrefix(assignments, `${b.id}:`);
                const aScore = a.hourlyWage + (aExistingHours + aProposedHours) * fairnessWeight;
                const bScore = b.hourlyWage + (bExistingHours + bProposedHours) * fairnessWeight;
                return aScore - bScore;
              });

            const chosen = candidates[0];
            if (!chosen) {
              unfilledSlots.push({
                date: day.date,
                hour,
                station,
                ...(requirement.role !== undefined && { role: requirement.role }),
                missing: remainingNeed - index,
              });
              break;
            }

            const key = assignmentKey(chosen.id, day.date, station);
            const hours = assignments.get(key) ?? new Set<number>();
            hours.add(hour);
            assignments.set(key, hours);
            assignedThisSlot.add(chosen.id);
          }
        }
      }
    }

    assignments.forEach((hours, key) => {
      const [employeeId, date, station] = key.split(":");
      const employee = employeeById.get(employeeId ?? "");
      if (!employee || !date || !station) return;

      const sortedHours = [...hours].sort((a, b) => a - b);
      let runStart = sortedHours[0];
      let previous = sortedHours[0];

      for (let index = 1; index <= sortedHours.length; index++) {
        const current = sortedHours[index];
        const reachedEnd = index === sortedHours.length;

        if (reachedEnd || current !== previous! + 1) {
          while (previous! + 1 - runStart! < employee.minShiftHours) {
            const before = runStart! - 1;
            const after = previous! + 1;
            const day = weekDemand.find((candidate) => candidate.date === date);
            if (!day) break;

            if (before >= 0 && canAssign(employee, day, before, station)) {
              hours.add(before);
              runStart = before;
            } else if (after < 24 && canAssign(employee, day, after, station)) {
              hours.add(after);
              previous = after;
            } else {
              warnings.push(
                `${employee.name} has a shift shorter than ${employee.minShiftHours} hours on ${date}.`
              );
              break;
            }
          }

          runStart = current;
        }

        previous = current;
      }
    });

    const proposedShifts: ProposedShift[] = [];
    let totalCost = 0;
    let totalHoursOptimized = 0;
    const breakAfterHours = options.breakAfterHours ?? DEFAULT_BREAK_AFTER_HOURS;
    const breakDurationMinutes = options.breakDurationMinutes ?? DEFAULT_BREAK_DURATION_MINUTES;

    assignments.forEach((hours, key) => {
      const [employeeId, date, station] = key.split(":");
      const employee = employeeById.get(employeeId ?? "");
      if (!employee || !date || !station || hours.size === 0) return;

      const sortedHours = [...hours].sort((a, b) => a - b);
      let shiftStartHour = sortedHours[0];
      let previousHour = sortedHours[0];

      for (let index = 1; index <= sortedHours.length; index++) {
        const currentHour = sortedHours[index];

        if (index === sortedHours.length || currentHour !== previousHour! + 1) {
          const startTime = dateAtHour(date, shiftStartHour!);
          const endTime = dateAtHour(date, previousHour! + 1);
          const durationHours = previousHour! + 1 - shiftStartHour!;
          const breakMinutes = durationHours >= breakAfterHours ? breakDurationMinutes : 0;
          const paidHours = Math.max(0, durationHours - breakMinutes / 60);

          proposedShifts.push({
            employeeId: employee.id,
            employeeName: employee.name,
            role: employee.role,
            station,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            breakMinutes,
            isOptimised: true,
          });

          totalCost += paidHours * employee.hourlyWage;
          totalHoursOptimized += durationHours;
          shiftStartHour = currentHour;
        }

        previousHour = currentHour;
      }
    });

    const estimatedOldCost = totalCost * 1.2;

    return {
      proposedShifts,
      shiftsGenerated: proposedShifts.length,
      estimatedOldCost,
      totalCost,
      moneySaved: estimatedOldCost - totalCost,
      totalHoursOptimized,
      coverage: {
        requestedStaffHours,
        existingCoveredStaffHours,
        newlyGeneratedStaffHours: totalHoursOptimized,
        unfilledStaffHours: unfilledSlots.reduce((total, slot) => total + slot.missing, 0),
      },
      unfilledSlots,
      warnings,
    };
  }

  static async approveSchedule(
    userId: string,
    proposedShifts: ProposedShift[],
    metrics?: {
      estimatedOldCost?: number;
      totalCost?: number;
      moneySaved?: number;
      totalHoursOptimized?: number;
    }
  ) {
    if (!proposedShifts?.length) throw new Error("No proposed shifts to approve");

    const employees = await prisma.employee.findMany({
      where: { userId },
      select: { id: true },
    });
    const employeeIds = new Set(employees.map((employee) => employee.id));

    const data = proposedShifts
      .filter((shift) => employeeIds.has(shift.employeeId))
      .map((shift) => ({
        employeeId: shift.employeeId,
        startTime: new Date(shift.startTime),
        endTime: new Date(shift.endTime),
        station: shift.station,
        breakMinutes: shift.breakMinutes ?? 0,
        isOptimised: true,
      }));

    const created = await prisma.shift.createMany({
      data,
      skipDuplicates: true,
    });

    await ActivityLogHandler.createLog({
      userId,
      actionType: ActionType.RAM_OPTIMISATION,
      metadata: {
        moneySaved: metrics?.moneySaved ?? 0,
        newCost: metrics?.totalCost ?? 0,
        oldCost: metrics?.estimatedOldCost ?? 0,
        hoursOptimized: metrics?.totalHoursOptimized ?? data.length,
      },
    });

    return {
      shiftsGenerated: created.count,
      estimatedOldCost: metrics?.estimatedOldCost ?? 0,
      totalCost: metrics?.totalCost ?? 0,
      moneySaved: metrics?.moneySaved ?? 0,
    };
  }

  static async generateWeeklySchedule(
    userId: string,
    weekDemand: DailyDemand[],
    options: OptimisationOptions = {}
  ) {
    const preview = await this.previewSchedule(userId, weekDemand, options);
    return this.approveSchedule(userId, preview.proposedShifts, preview);
  }
}
