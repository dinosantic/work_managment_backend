import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { AppError } from "../errors/AppError";

type RequestTarget = "body" | "params" | "query";

export function validate(schema: ZodType, target: RequestTarget = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || target,
        message: issue.message,
      }));

      throw new AppError("Invalid request data", 400, details);
    }

    req[target] = result.data;
    next();
  };
}
