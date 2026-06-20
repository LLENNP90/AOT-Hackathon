import { Router } from "express";
import { EmployeeService } from "../services/employee.js";
import { Success, ErrorResponses } from "../err/error.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

type EmployeeIdParams = {
  id: string;
};

// add employee
router.post(
  "/",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) throw ErrorResponses.UNAUTHORISED;

      const {
        name,
        role,
        hourlyWage,
        maxDailyHours,
        maxWeeklyHours,
        minShiftHours,
        stationSkills,
      } = req.body;

      if (!name || !role || hourlyWage == null) {
        throw ErrorResponses.MISSING_FIELDS;
      }

      const employee = await EmployeeService.add(req.user.id, {
        name,
        role,
        hourlyWage,
        maxDailyHours,
        maxWeeklyHours,
        minShiftHours,
        stationSkills,
      });

      Success(res, { employee });
    } catch (err) {
      next(err);
    }
  }
);

// list all employees for the logged-in manager
router.get(
  "/",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) throw ErrorResponses.UNAUTHORISED;

      const employees = await EmployeeService.fetchAllForUser(req.user.id);

      Success(res, { employees });
    } catch (err) {
      next(err);
    }
  }
);

// get a single employee by id
router.get<EmployeeIdParams>(
  "/:id",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) throw ErrorResponses.UNAUTHORISED;

      const { id } = req.params;

      const employee = await EmployeeService.fetchById(req.user.id, id);

      Success(res, { employee });
    } catch (err) {
      next(err);
    }
  }
);

// edit employee
router.patch<EmployeeIdParams>(
  "/:id",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) throw ErrorResponses.UNAUTHORISED;

      const { id } = req.params;
      const {
        name,
        role,
        hourlyWage,
        maxDailyHours,
        maxWeeklyHours,
        minShiftHours,
        stationSkills,
      } = req.body;

      if (
        !name &&
        !role &&
        hourlyWage == null &&
        maxDailyHours == null &&
        maxWeeklyHours == null &&
        minShiftHours == null &&
        stationSkills == null
      ) {
        throw ErrorResponses.MISSING_FIELDS;
      }

      const updatedEmployee = await EmployeeService.edit(req.user.id, id, {
        name,
        role,
        hourlyWage,
        maxDailyHours,
        maxWeeklyHours,
        minShiftHours,
        stationSkills,
      });

      Success(res, { employee: updatedEmployee });
    } catch (err) {
      next(err);
    }
  }
);

// delete employee
router.delete<EmployeeIdParams>(
  "/:id",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) throw ErrorResponses.UNAUTHORISED;

      const { id } = req.params;

      const result = await EmployeeService.delete(req.user.id, id);

      Success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

router.get<EmployeeIdParams>(
  "/:id/availability",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) throw ErrorResponses.UNAUTHORISED;

      const availability = await EmployeeService.listAvailability(req.user.id, req.params.id);

      Success(res, { availability });
    } catch (err) {
      next(err);
    }
  }
);

router.post<EmployeeIdParams>(
  "/:id/availability",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) throw ErrorResponses.UNAUTHORISED;

      const { dayOfWeek, date, startTime, endTime, isAvailable } = req.body;

      if (!startTime || !endTime) throw ErrorResponses.MISSING_FIELDS;

      const availability = await EmployeeService.addAvailability(req.user.id, req.params.id, {
        dayOfWeek,
        date,
        startTime,
        endTime,
        isAvailable,
      });

      Success(res, { availability });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/availability/:availabilityId",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) throw ErrorResponses.UNAUTHORISED;

      const { availabilityId } = req.params;
      if (!availabilityId || Array.isArray(availabilityId)) throw ErrorResponses.MISSING_FIELDS;

      const result = await EmployeeService.deleteAvailability(
        req.user.id,
        availabilityId
      );

      Success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
