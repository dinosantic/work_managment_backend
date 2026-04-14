import { dbGet } from "../db/sqlite";
import { AppError } from "../errors/AppError";
import { CurrentUser, CurrentUserRow } from "../types/users";

function deriveDisplayName(email: string, displayName: string | null) {
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

export async function editCurrentUserService(
  userId: number,
  displayName?: string,
) {
  try {
    await dbGet(
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
  updates: { role?: string },
) {
  // Verify admin has permission to edit users
  const admin = await getCurrentUserService(adminId);
  if (admin.role !== "admin") {
    throw new AppError("Unauthorized", 403);
  }

  const setClauses = [];
  const params = [];

  if (updates.role !== undefined) {
    setClauses.push("role = ?");
    params.push(updates.role);
  }

  if (setClauses.length === 0) {
    throw new AppError("No updates provided", 400);
  }

  params.push(userId);

  try {
    await dbGet(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`,
      params,
    );
  } catch {
    throw new AppError("Failed to update user", 500);
  }

  return getCurrentUserService(userId);
}
