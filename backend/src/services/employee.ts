import bcrypt from "bcrypt";
import { prisma } from "../libs/prisma.js";
import { signToken } from "../libs/jwt.js";
import { ErrorResponses } from "../err/error.js";

interface AddEmployeeInput {
  name: string;
  role: string;
  hourlyWage: number;
  maxDailyHours?: number;
  maxWeeklyHours?: number;
  minShiftHours?: number;
  stationSkills?: string[];
}

interface EditEmployeeInput {
  name?: string;
  role?: string;
  hourlyWage?: number;
  maxDailyHours?: number;
  maxWeeklyHours?: number;
  minShiftHours?: number;
  stationSkills?: string[];
}

interface AvailabilityInput {
  dayOfWeek?: number;
  date?: string;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
}

// ------- EMPLOYEE -------

export class EmployeeService {
  static async add(userId: string, input: AddEmployeeInput) {
    const {
      name,
      role,
      hourlyWage,
      maxDailyHours,
      maxWeeklyHours,
      minShiftHours,
      stationSkills,
    } = input;

    if (!name || !role || hourlyWage == null) {
      throw ErrorResponses.MISSING_FIELDS;
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        role,
        hourlyWage,
        ...(maxDailyHours !== undefined && { maxDailyHours }),
        ...(maxWeeklyHours !== undefined && { maxWeeklyHours }),
        ...(minShiftHours !== undefined && { minShiftHours }),
        ...(stationSkills !== undefined && { stationSkills }),
        userId,
      },
    });

    return employee;
  }

  static async edit(userId: string, employeeId: string, input: EditEmployeeInput) {
    const { name, role, hourlyWage, maxDailyHours, maxWeeklyHours, minShiftHours, stationSkills } = input;

    const existingEmployee = await prisma.employee.findFirst({
      where: { id: employeeId, userId },
    });

    if (!existingEmployee) throw ErrorResponses.EMPLOYEE_NOT_FOUND;

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(hourlyWage !== undefined && { hourlyWage }),
        ...(maxDailyHours !== undefined && { maxDailyHours }),
        ...(maxWeeklyHours !== undefined && { maxWeeklyHours }),
        ...(minShiftHours !== undefined && { minShiftHours }),
        ...(stationSkills !== undefined && { stationSkills }),
      },
    });

    return updatedEmployee;
  }

  static async delete(userId: string, employeeId: string) {
    const existingEmployee = await prisma.employee.findFirst({
      where: { id: employeeId, userId },
    });

    if (!existingEmployee) throw ErrorResponses.EMPLOYEE_NOT_FOUND;

    await prisma.employee.delete({
      where: { id: employeeId },
    });

    return { id: employeeId };
  }

  static async fetchAllForUser(userId: string) {
    return prisma.employee.findMany({
      where: { userId },
      include: {
        availability: true,
      },
    });
  }

  static async fetchById(userId: string, employeeId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, userId },
    });

    if (!employee) throw ErrorResponses.EMPLOYEE_NOT_FOUND;

    return employee;
  }

  static async listAvailability(userId: string, employeeId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, userId },
    });

    if (!employee) throw ErrorResponses.EMPLOYEE_NOT_FOUND;

    return prisma.employeeAvailability.findMany({
      where: { employeeId },
      orderBy: [{ dayOfWeek: "asc" }, { date: "asc" }, { startTime: "asc" }],
    });
  }

  static async addAvailability(userId: string, employeeId: string, input: AvailabilityInput) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, userId },
    });

    if (!employee) throw ErrorResponses.EMPLOYEE_NOT_FOUND;

    if (
      input.dayOfWeek === undefined &&
      input.date === undefined
    ) {
      throw ErrorResponses.MISSING_FIELDS;
    }

    return prisma.employeeAvailability.create({
      data: {
        employeeId,
        ...(input.dayOfWeek !== undefined && { dayOfWeek: input.dayOfWeek }),
        ...(input.date !== undefined && { date: new Date(input.date) }),
        startTime: input.startTime,
        endTime: input.endTime,
        ...(input.isAvailable !== undefined && { isAvailable: input.isAvailable }),
      },
    });
  }

  static async deleteAvailability(userId: string, availabilityId: string) {
    const availability = await prisma.employeeAvailability.findFirst({
      where: {
        id: availabilityId,
        employee: { userId },
      },
    });

    if (!availability) throw ErrorResponses.EMPLOYEE_NOT_FOUND;

    await prisma.employeeAvailability.delete({
      where: { id: availabilityId },
    });

    return { id: availabilityId };
  }
}
