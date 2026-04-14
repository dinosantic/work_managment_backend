import { Request, Response, NextFunction } from "express";
import { isAuthTokenPayload, verifyToken } from "../utils/jwt";
import { AuthTokenPayload } from "../types/auth";

export interface AuthRequest<
  TParams = Record<string, string>,
  TBody = unknown,
> extends Request<TParams, unknown, TBody> {
  user?: AuthTokenPayload;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    if (!isAuthTokenPayload(decoded)) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
