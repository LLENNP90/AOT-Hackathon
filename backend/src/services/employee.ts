import bcrypt from "bcrypt";
import { prisma } from "../libs/prisma.js";
import { signToken } from "../libs/jwt.js";
import { ErrorResponses } from "../err/error.js";

interface AddEmployeeInput {
  name: string;
  role: string;
  hourlyWage: number;
}

interface EditEmployeeInput {
  name?: string;
  role?: string;
  hourlyWage?: number;
}

// ------- EMPLOYEE -------

export class EmployeeService {
  static async add(userId: string, input: AddEmployeeInput) {
    const { name, role, hourlyWage } = input;

    if (!name || !role || hourlyWage == null) {
      throw ErrorResponses.MISSING_FIELDS;
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        role,
        hourlyWage,
        userId,
      },
    });

    return employee;
  }

  static async edit(userId: string, employeeId: string, input: EditEmployeeInput) {
    const { name, role, hourlyWage } = input;

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
    });
  }

  static async fetchById(userId: string, employeeId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, userId },
    });

    if (!employee) throw ErrorResponses.EMPLOYEE_NOT_FOUND;

    return employee;
  }
}