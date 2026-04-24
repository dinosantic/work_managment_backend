import { AppError } from "../errors/AppError";
import { dbAll, dbGet, dbRun } from "../db/sqlite";
import type { Role } from "../types/roles";
import type { Task, TaskPriority, TaskRow, TaskStatus } from "../types/tasks";

type TaskAccessRow = Pick<TaskRow, "id" | "created_by" | "assignee_user_id">;

type UserLookupRow = {
  id: number;
};

function mapTaskRow(task: TaskRow): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.due_date,
    createdById: task.created_by,
    assigneeUserId: task.assignee_user_id,
    projectId: task.projectId,
  };
}

async function ensureAssigneeExists(assigneeUserId: number) {
  try {
    const user = await dbGet<UserLookupRow>(
      "SELECT id FROM users WHERE id = ?",
      [assigneeUserId],
    );

    if (!user) {
      throw new AppError("Assignee not found", 404);
    }
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Failed to validate assignee", 500);
  }
}

function canAccessTask(task: TaskAccessRow, userId: number, role: Role) {
  return (
    role === "ADMIN" ||
    task.created_by === userId ||
    task.assignee_user_id === userId
  );
}

export async function createTaskService(
  title: string,
  description: string,
  priority: TaskPriority,
  dueDate: string | null | undefined,
  assigneeUserId: number | null | undefined,
  userId: number,
  role: Role,
) {
  const resolvedAssigneeUserId = assigneeUserId ?? userId;

  if (role !== "ADMIN" && resolvedAssigneeUserId !== userId) {
    throw new AppError("Not allowed to assign task", 403);
  }

  await ensureAssigneeExists(resolvedAssigneeUserId);

  try {
    const result = await dbRun(
      `
        INSERT INTO tasks (title, description, priority, due_date, created_by, assignee_user_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description,
        priority,
        dueDate ?? null,
        userId,
        resolvedAssigneeUserId,
      ],
    );

    return {
      id: result.lastID,
      title,
      description,
      status: "OPEN",
      priority,
      dueDate: dueDate ?? null,
      createdById: userId,
      assigneeUserId: resolvedAssigneeUserId,
    };
  } catch {
    throw new AppError("Failed to create task", 500);
  }
}

export async function listTasksService(userId: number, role: Role) {
  try {
    let query =
      "SELECT id, title, description, status, priority, due_date, created_by, assignee_user_id FROM tasks";
    const params: number[] = [];

    if (role !== "ADMIN") {
      query += " WHERE created_by = ? OR assignee_user_id = ?";
      params.push(userId, userId);
    }

    query +=
      " ORDER BY CASE status WHEN 'IN_PROGRESS' THEN 1 WHEN 'OPEN' THEN 2 ELSE 3 END, due_date IS NULL, due_date ASC, id DESC";

    const tasks = await dbAll<TaskRow>(query, params);

    return tasks.map(mapTaskRow);
  } catch {
    throw new AppError("Failed to load tasks", 500);
  }
}

export async function getTaskService(
  taskId: number,
  userId: number,
  role: Role,
) {
  try {
    const task = await dbGet<TaskRow>(
      "SELECT id, title, description, status, priority, due_date, created_by, assignee_user_id FROM tasks WHERE id = ?",
      [taskId],
    );

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    if (!canAccessTask(task, userId, role)) {
      throw new AppError("Not allowed", 403);
    }

    return mapTaskRow(task);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Failed to load task", 500);
  }
}

async function getTaskAccess(taskId: number) {
  try {
    const task = await dbGet<TaskAccessRow>(
      "SELECT id, created_by, assignee_user_id FROM tasks WHERE id = ?",
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
  title: string,
  description: string,
  status: TaskStatus,
  priority: TaskPriority,
  dueDate: string | null,
  assigneeUserId: number | null,
  userId: number,
  role: Role,
) {
  const task = await getTaskAccess(taskId);

  if (!canAccessTask(task, userId, role)) {
    throw new AppError("Not allowed", 403);
  }

  const resolvedAssigneeUserId = assigneeUserId ?? userId;

  if (role !== "ADMIN" && resolvedAssigneeUserId !== userId) {
    throw new AppError("Not allowed to reassign task", 403);
  }

  await ensureAssigneeExists(resolvedAssigneeUserId);

  try {
    await dbRun(
      `
        UPDATE tasks
        SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, assignee_user_id = ?
        WHERE id = ?
      `,
      [
        title,
        description,
        status,
        priority,
        dueDate,
        resolvedAssigneeUserId,
        taskId,
      ],
    );

    return await getTaskService(taskId, userId, role);
  } catch {
    throw new AppError("Failed to update task", 500);
  }
}

export async function deleteTaskService(
  taskId: number,
  userId: number,
  role: Role,
) {
  const task = await getTaskAccess(taskId);

  if (role !== "ADMIN" && task.created_by !== userId) {
    throw new AppError("Not allowed", 403);
  }

  try {
    await dbRun("DELETE FROM tasks WHERE id = ?", [taskId]);
  } catch {
    throw new AppError("Failed to delete task", 500);
  }
}
