import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";

export function requireRole(role: "ADMIN" | "USER") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthenticated" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
}
