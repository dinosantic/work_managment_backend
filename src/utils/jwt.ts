import jwt from "jsonwebtoken";
import { AuthTokenPayload } from "../types/auth";

function getJwtSecret() {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  return jwtSecret;
}

const JWT_SECRET = getJwtSecret();

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyToken(token: string): jwt.JwtPayload | string {
  return jwt.verify(token, JWT_SECRET);
}

export function isAuthTokenPayload(
  payload: jwt.JwtPayload | string,
): payload is jwt.JwtPayload & AuthTokenPayload {
  return (
    typeof payload !== "string" &&
    typeof payload.id === "number" &&
    typeof payload.role === "string"
  );
}
