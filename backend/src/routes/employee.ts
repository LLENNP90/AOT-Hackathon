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

      const { name, role, hourlyWage } = req.body;

      if (!name || !role || hourlyWage == null) {
        throw ErrorResponses.MISSING_FIELDS;
      }

      const employee = await EmployeeService.add(req.user.id, {
        name,
        role,
        hourlyWage,
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
      const { name, role, hourlyWage } = req.body;

      if (!name && !role && hourlyWage == null) {
        throw ErrorResponses.MISSING_FIELDS;
      }

      const updatedEmployee = await EmployeeService.edit(req.user.id, id, {
        name,
        role,
        hourlyWage,
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

export default router;