import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient, ActionType } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const atHour = (date: Date, hour: number) => {
  const value = new Date(date);
  value.setHours(hour, 0, 0, 0);
  return value;
};

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  console.log("Starting database seed...");

  await prisma.activityLog.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.employeeAvailability.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  const cafe = await prisma.user.create({
    data: {
      username: "admin_demo",
      passwordHash,
      BusinessName: "The Daily Grind Cafe",
    },
  });

  console.log("Created cafe profile");

  const [alice, bob, charlie, diana] = await Promise.all([
    prisma.employee.create({
      data: {
        userId: cafe.id,
        name: "Alice Tan",
        role: "Head Barista",
        hourlyWage: 25,
        maxDailyHours: 8,
        maxWeeklyHours: 38,
        minShiftHours: 4,
        stationSkills: ["Espresso Bar", "Brew Bar", "Register"],
      },
    }),
    prisma.employee.create({
      data: {
        userId: cafe.id,
        name: "Bob Lim",
        role: "Barista",
        hourlyWage: 16,
        maxDailyHours: 7,
        maxWeeklyHours: 35,
        minShiftHours: 3,
        stationSkills: ["Espresso Bar", "Brew Bar"],
      },
    }),
    prisma.employee.create({
      data: {
        userId: cafe.id,
        name: "Charlie Wong",
        role: "Cashier",
        hourlyWage: 13,
        maxDailyHours: 8,
        maxWeeklyHours: 40,
        minShiftHours: 3,
        stationSkills: ["Register"],
      },
    }),
    prisma.employee.create({
      data: {
        userId: cafe.id,
        name: "Diana Lee",
        role: "Shift Lead",
        hourlyWage: 22,
        maxDailyHours: 8,
        maxWeeklyHours: 36,
        minShiftHours: 4,
        stationSkills: ["Register", "Espresso Bar", "Breakroom"],
      },
    }),
  ]);

  console.log("Created employees with optimisation constraints");

  const employees = [alice, bob, charlie, diana];
  const weekdays = [1, 2, 3, 4, 5];
  const weekend = [0, 6];

  await prisma.employeeAvailability.createMany({
    data: [
      ...employees.flatMap((employee) =>
        weekdays.map((dayOfWeek) => ({
          employeeId: employee.id,
          dayOfWeek,
          startTime: "08:00",
          endTime: "18:00",
          isAvailable: true,
        }))
      ),
      ...[alice, charlie, diana].flatMap((employee) =>
        weekend.map((dayOfWeek) => ({
          employeeId: employee.id,
          dayOfWeek,
          startTime: "09:00",
          endTime: "15:00",
          isAvailable: true,
        }))
      ),
      {
        employeeId: bob.id,
        dayOfWeek: 3,
        startTime: "12:00",
        endTime: "18:00",
        isAvailable: false,
      },
    ],
  });

  console.log("Created availability windows");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  await prisma.shift.createMany({
    data: [
      {
        employeeId: bob.id,
        startTime: atHour(today, 8),
        endTime: atHour(today, 13),
        station: "Espresso Bar",
        breakMinutes: 0,
        isOptimised: false,
      },
      {
        employeeId: charlie.id,
        startTime: atHour(today, 9),
        endTime: atHour(today, 15),
        station: "Register",
        breakMinutes: 30,
        isOptimised: true,
      },
      {
        employeeId: alice.id,
        startTime: atHour(today, 12),
        endTime: atHour(today, 18),
        station: "Brew Bar",
        breakMinutes: 30,
        isOptimised: true,
      },
      {
        employeeId: diana.id,
        startTime: atHour(tomorrow, 9),
        endTime: atHour(tomorrow, 17),
        station: "Register",
        breakMinutes: 30,
        isOptimised: false,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Created station-aware shifts");

  await prisma.activityLog.createMany({
    data: [
      {
        userId: cafe.id,
        actionType: ActionType.HIRED_EMPLOYEE,
        metadata: { employeeName: "Diana Lee", role: "Shift Lead" },
        createdAt: new Date(today),
      },
      {
        userId: cafe.id,
        actionType: ActionType.RAM_OPTIMISATION,
        metadata: {
          moneySaved: 128,
          oldCost: 640,
          newCost: 512,
          hoursOptimized: 17,
          message: "Optimised today's cafe floor with station and availability constraints.",
        },
        createdAt: new Date(today),
      },
    ],
  });

  console.log("Created activity logs");
  console.log("Seed login: username=admin_demo password=password123");
  console.log("Seeding finished successfully");
}

main()
  .catch((error) => {
    console.error("Error during seeding:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
