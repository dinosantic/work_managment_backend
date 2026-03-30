import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    user: (req as any).user,
  });
});

router.get("/", authMiddleware, requireRole("ADMIN"), (req, res) => {
  res.json({ message: "Only admins can see this" });
});

export default router;
