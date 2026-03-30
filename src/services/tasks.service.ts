import { AppError } from "../errors/AppError";
import { dbAll, dbGet, dbRun } from "../db/sqlite";

type TaskOwnershipRow = {
  id: number;
  user_id: number;
};

type TaskRow = {
  id: number;
  title: string;
  status: string;
  user_id: number;
};

export async function createTaskService(title: string, userId: number) {
  try {
    const result = await dbRun(
      `
        INSERT INTO tasks (title, user_id)
        VALUES (?, ?)
      `,
      [title, userId],
    );

    return {
      id: result.lastID,
      title,
      status: "OPEN",
    };
  } catch {
    throw new AppError("Failed to create task", 500);
  }
}

export async function listTasksService(userId: number, role: string) {
  try {
    let query = "SELECT id, title, status, user_id FROM tasks";
    const params: number[] = [];

    if (role !== "ADMIN") {
      query += " WHERE user_id = ?";
      params.push(userId);
    }

    return await dbAll<TaskRow>(query, params);
  } catch {
    throw new AppError("Failed to load tasks", 500);
  }
}

async function getTaskOwnership(taskId: number) {
  try {
    const task = await dbGet<TaskOwnershipRow>(
      "SELECT id, user_id FROM tasks WHERE id = ?",
      [taskId],
    );

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    return task;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Failed to load task", 500);
  }
}

export async function updateTaskService(
  taskId: number,
  status: string,
  userId: number,
  role: string,
) {
  const task = await getTaskOwnership(taskId);

  if (role !== "ADMIN" && task.user_id !== userId) {
    throw new AppError("Not allowed", 403);
  }

  try {
    await dbRun(
      `
        UPDATE tasks
        SET status = ?
        WHERE id = ?
      `,
      [status, taskId],
    );
  } catch {
    throw new AppError("Failed to update task", 500);
  }
}

export async function deleteTaskService(
  taskId: number,
  userId: number,
  role: string,
) {
  const task = await getTaskOwnership(taskId);

  if (role !== "ADMIN" && task.user_id !== userId) {
    throw new AppError("Not allowed", 403);
  }

  try {
    await dbRun("DELETE FROM tasks WHERE id = ?", [taskId]);
  } catch {
    throw new AppError("Failed to delete task", 500);
  }
}
