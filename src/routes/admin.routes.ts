import { Router } from "express";
import {
  login,
  logout,
  me,
  listReflections,
  getReflectionAdmin,
  exportCsv,
  loginSchema,
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

// Public
router.post("/login", validate(loginSchema), login);

// Protected
router.post("/logout", requireAdmin, logout);
router.get("/me", requireAdmin, me);
router.get("/reflections", requireAdmin, listReflections);
router.get("/reflections/export", requireAdmin, exportCsv);
router.get("/reflection/:id", requireAdmin, getReflectionAdmin);

export default router;
