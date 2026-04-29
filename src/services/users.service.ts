import { dbAll, dbGet, dbRun } from "../db/sqlite";
import { AppError } from "../errors/AppError";
import {
  CurrentUser,
  CurrentUserRow,
  UserDirectoryItem,
  UserDirectoryRow,
} from "../types/users";
import type { Role } from "../types/roles";

export function deriveDisplayName(email: string, displayName: string | null) {
  if (displayName?.trim()) {
    return displayName;
  }

  return email.split("@")[0];
}

export async function getCurrentUserService(userId: number): Promise<CurrentUser> {
  let user: CurrentUserRow | undefined;

  try {
    user = await dbGet<CurrentUserRow>(
      `
        SELECT id, email, display_name, role
        FROM users
        WHERE id = ?
      `,
      [userId],
    );
  } catch {
    throw new AppError("Failed to load current user", 500);
  }

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: deriveDisplayName(user.email, user.display_name),
  };
}

export async function listUsersDirectoryService(): Promise<UserDirectoryItem[]> {
  let users: UserDirectoryRow[];

  try {
    users = await dbAll<UserDirectoryRow>(
      `
        SELECT id, email, display_name, role
        FROM users
        ORDER BY COALESCE(NULLIF(TRIM(display_name), ''), email) ASC
      `,
    );
  } catch {
    throw new AppError("Failed to load users directory", 500);
  }

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: deriveDisplayName(user.email, user.display_name),
    role: user.role,
  }));
}

export async function editCurrentUserService(
  userId: number,
  displayName?: string,
) {
  try {
    await dbRun(
      `
        UPDATE users
        SET display_name = ?
        WHERE id = ?
      `,
      [displayName || null, userId],
    );
  } catch {
    throw new AppError("Failed to update display name", 500);
  }

  return getCurrentUserService(userId);
}

export async function editUserService(
  userId: number,
  adminId: number,
  updates: { role?: Role },
) {
  const admin = await getCurrentUserService(adminId);

  if (admin.role !== "ADMIN") {
    throw new AppError("Unauthorized", 403);
  }

  const setClauses: string[] = [];
  const params: Array<Role | number> = [];

  if (updates.role !== undefined) {
    setClauses.push("role = ?");
    params.push(updates.role);
  }

  if (setClauses.length === 0) {
    throw new AppError("No updates provided", 400);
  }

  params.push(userId);

  try {
    await dbRun(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`,
      params,
    );
  } catch {
    throw new AppError("Failed to update user", 500);
  }

  return getCurrentUserService(userId);
}
