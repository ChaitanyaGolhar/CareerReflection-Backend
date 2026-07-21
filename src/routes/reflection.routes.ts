import { Router } from "express";
import { submitReflection, getReflection, submitReflectionSchema } from "../controllers/reflection.controller.js";
import { validate } from "../middleware/validate.middleware.js";

const router = Router();

router.post("/", validate(submitReflectionSchema), submitReflection);
router.get("/:id", getReflection);

export default router;
