import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import { authSchema } from "../schemas/auth.schema";

const router = Router();

router.post("/register", validate(authSchema), register);
router.post("/login", validate(authSchema), login);

export default router;
