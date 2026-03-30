import bcrypt from "bcrypt";
import { dbGet, dbRun } from "../db/sqlite";
import { AppError } from "../errors/AppError";
import { signToken } from "../utils/jwt";

type UserRow = {
  id: number;
  email: string;
  password: string;
  role: string;
};

export async function registerUser(email: string, password: string) {
  const hashed = await bcrypt.hash(password, 10);

  try {
    await dbRun(
      `
        INSERT INTO users (email, password)
        VALUES (?, ?)
      `,
      [email, hashed],
    );
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      err.code === "SQLITE_CONSTRAINT"
    ) {
      throw new AppError("Email already in use", 409);
    }

    throw new AppError("Failed to register user", 500);
  }
}

export async function loginUser(email: string, password: string) {
  let user: UserRow | undefined;

  try {
    user = await dbGet<UserRow>(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );
  } catch {
    throw new AppError("Failed to login user", 500);
  }

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  let match = false;

  try {
    match = await bcrypt.compare(password, user.password);
  } catch {
    throw new AppError("Failed to verify credentials", 500);
  }

  if (!match) {
    throw new AppError("Invalid credentials", 401);
  }

  return signToken({
    id: user.id,
    role: user.role,
  });
}
