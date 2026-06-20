import { Router } from "express";
import { UserService } from "../services/user.js";
import { Success, ErrorResponses } from "../err/error.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get(
  "/me",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw ErrorResponses.UNAUTHORISED;
      }

      const user = await UserService.getMyProfile(req.user.id);

      Success(res, { user });
    } catch (err) {
      next(err);
    }
  }
);

// login
router.post(
  "/login",
  async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        throw ErrorResponses.MISSING_FIELDS;
      }

      const result = await UserService.login(username, password);

      return Success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

// signup
router.post(
  "/signup",
  async (req, res, next) => {
    try {
      const { username, password, businessName } = req.body;

      if (!username || !password || !businessName) throw ErrorResponses.MISSING_FIELDS;

      const result = await UserService.signup({
        username,
        password,
        businessName,
      });

      Success(res, result);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  "/me",
  authMiddleware,
  async (req, res, next) => {
    try {
      if (!req.user) throw ErrorResponses.UNAUTHORISED;

      const { username, password, businessName } = req.body;

      if (!username && !password && !businessName) throw ErrorResponses.MISSING_FIELDS;

      const updatedUser = await UserService.editProfile(req.user.id, {
        username,
        password,
        businessName,
      });

      Success(res, { user: updatedUser });
    } catch (err) {
      next(err);
    }
  }
);

export default router;