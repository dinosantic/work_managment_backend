import { AppError } from "../errors/AppError";
import { dbAll, dbGet, dbRun } from "../db/sqlite";
import type { Role } from "../types/roles";
import type { ProjectMemberRole } from "../types/projects";
import type {
  Task,
  TaskListScope,
  TaskPriority,
  TaskRow,
  TaskStatus,
} from "../types/tasks";

type TaskAccessRow = Pick<
  TaskRow,
  "id" | "created_by" | "assignee_user_id" | "project_id"
>;

type UserLookupRow = {
  id: number;
};

type ProjectLookupRow = {
  id: number;
};

type ProjectMembershipLookupRow = {
  role: ProjectMemberRole;
};

type TaskPermissionContext = {
  task: TaskAccessRow;
  membershipRole: ProjectMemberRole | null;
};

type ListTasksFilters = {
  projectId?: number;
  scope?: TaskListScope;
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
    projectId: task.project_id,
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

async function ensureProjectExists(projectId: number) {
  try {
    const project = await dbGet<ProjectLookupRow>(
      "SELECT id FROM projects WHERE id = ?",
      [projectId],
    );

    if (!project) {
      throw new AppError("Project not found", 404);
    }
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Failed to validate project", 500);
  }
}

async function getProjectMembershipRole(projectId: number, userId: number) {
  try {
    const membership = await dbGet<ProjectMembershipLookupRow>(
      "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, userId],
    );

    return membership?.role ?? null;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Failed to validate project membership", 500);
  }
}

async function ensureProjectMember(projectId: number, userId: number) {
  const membershipRole = await getProjectMembershipRole(projectId, userId);

  if (!membershipRole) {
    throw new AppError("User must belong to the project", 403);
  }

  return membershipRole;
}

async function ensureProjectAccess(
  projectId: number,
  userId: number,
  role: Role,
) {
  await ensureProjectExists(projectId);

  if (role === "ADMIN") {
    return null;
  }

  const membershipRole = await getProjectMembershipRole(projectId, userId);

  if (!membershipRole) {
    throw new AppError("Not allowed", 403);
  }

  return membershipRole;
}

async function getTaskAccess(taskId: number) {
  try {
    const task = await dbGet<TaskAccessRow>(
      "SELECT id, created_by, assignee_user_id, project_id FROM tasks WHERE id = ?",
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

async function getTaskPermissionContext(
  taskId: number,
  userId: number,
  role: Role,
): Promise<TaskPermissionContext> {
  const task = await getTaskAccess(taskId);

  if (role === "ADMIN") {
    return {
      task,
      membershipRole: null,
    };
  }

  const membershipRole = await getProjectMembershipRole(
    task.project_id,
    userId,
  );

  if (!membershipRole) {
    throw new AppError("Not allowed", 403);
  }

  return {
    task,
    membershipRole,
  };
}

function canUpdateTask(
  context: TaskPermissionContext,
  userId: number,
  role: Role,
) {
  if (role === "ADMIN") {
    return true;
  }

  if (context.membershipRole === "MANAGER") {
    return true;
  }

  return (
    context.task.created_by === userId ||
    context.task.assignee_user_id === userId
  );
}

function canDeleteTask(
  context: TaskPermissionContext,
  userId: number,
  role: Role,
) {
  if (role === "ADMIN") {
    return true;
  }

  if (context.membershipRole === "MANAGER") {
    return true;
  }

  return context.task.created_by === userId;
}

function canAssignTaskToOtherMember(
  membershipRole: ProjectMemberRole | null,
  userId: number,
  assigneeUserId: number,
  role: Role,
) {
  if (role === "ADMIN") {
    return true;
  }

  if (membershipRole === "MANAGER") {
    return true;
  }

  return assigneeUserId === userId;
}

function buildTaskListOrderClause() {
  return " ORDER BY CASE t.status WHEN 'IN_PROGRESS' THEN 1 WHEN 'OPEN' THEN 2 ELSE 3 END, t.due_date IS NULL, t.due_date ASC, t.id DESC";
}

export async function createTaskService(
  projectId: number,
  title: string,
  description: string,
  priority: TaskPriority,
  dueDate: string | null | undefined,
  assigneeUserId: number | null | undefined,
  userId: number,
  role: Role,
) {
  const resolvedAssigneeUserId = assigneeUserId ?? userId;

  await ensureProjectExists(projectId);
  const membershipRole = await ensureProjectMember(projectId, userId);
  await ensureAssigneeExists(resolvedAssigneeUserId);
  await ensureProjectMember(projectId, resolvedAssigneeUserId);

  if (
    !canAssignTaskToOtherMember(
      membershipRole,
      userId,
      resolvedAssigneeUserId,
      role,
    )
  ) {
    throw new AppError("Not allowed to assign task", 403);
  }

  try {
    const result = await dbRun(
      `
        INSERT INTO tasks (project_id, title, description, priority, due_date, created_by, assignee_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        projectId,
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
      projectId,
    };
  } catch {
    throw new AppError("Failed to create task", 500);
  }
}

export async function listTasksService(
  userId: number,
  role: Role,
  filters: ListTasksFilters = {},
) {
  const { projectId, scope } = filters;

  if (scope === "project" && projectId === undefined) {
    throw new AppError("Project filter is required for project scope", 400);
  }

  if (projectId !== undefined) {
    await ensureProjectAccess(projectId, userId, role);
  }

  try {
    const params: Array<number | string> = [];
    const whereClauses: string[] = [];
    let query =
      "SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_by, t.assignee_user_id, t.project_id FROM tasks t";

    if (role !== "ADMIN") {
      query += " JOIN project_members pm ON pm.project_id = t.project_id";
      whereClauses.push("pm.user_id = ?");
      params.push(userId);
    }

    if (projectId !== undefined) {
      whereClauses.push("t.project_id = ?");
      params.push(projectId);
    }

    if (scope === "assigned") {
      whereClauses.push("t.assignee_user_id = ?");
      params.push(userId);
    } else if (scope === "created") {
      whereClauses.push("t.created_by = ?");
      params.push(userId);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += buildTaskListOrderClause();

    const tasks = await dbAll<TaskRow>(query, params);

    return tasks.map(mapTaskRow);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Failed to load tasks", 500);
  }
}

export async function getTaskService(
  taskId: number,
  userId: number,
  role: Role,
) {
  try {
    const context = await getTaskPermissionContext(taskId, userId, role);
    const task = await dbGet<TaskRow>(
      "SELECT id, title, description, status, priority, due_date, created_by, assignee_user_id, project_id FROM tasks WHERE id = ?",
      [context.task.id],
    );

    if (!task) {
      throw new AppError("Task not found", 404);
    }

    return mapTaskRow(task);
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
  const context = await getTaskPermissionContext(taskId, userId, role);

  if (!canUpdateTask(context, userId, role)) {
    throw new AppError("Not allowed", 403);
  }

  const resolvedAssigneeUserId = assigneeUserId ?? userId;

  if (
    !canAssignTaskToOtherMember(
      context.membershipRole,
      userId,
      resolvedAssigneeUserId,
      role,
    )
  ) {
    throw new AppError("Not allowed to reassign task", 403);
  }

  await ensureAssigneeExists(resolvedAssigneeUserId);
  await ensureProjectMember(context.task.project_id, resolvedAssigneeUserId);

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
  const context = await getTaskPermissionContext(taskId, userId, role);

  if (!canDeleteTask(context, userId, role)) {
    throw new AppError("Not allowed", 403);
  }

  try {
    await dbRun("DELETE FROM tasks WHERE id = ?", [taskId]);
  } catch {
    throw new AppError("Failed to delete task", 500);
  }
}
