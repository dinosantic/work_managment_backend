import { Router } from "express";
import {
  getCurrentUser,
  editCurrentUser,
} from "../controllers/users.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/me", authMiddleware, getCurrentUser);

router.get("/", authMiddleware, requireRole("ADMIN"), (req, res) => {
  res.json({ message: "Only admins can see this" });
});

router.patch("/me", authMiddleware, editCurrentUser);

export default router;
