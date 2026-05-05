import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createTaskService,
  deleteTaskService,
  getTaskService,
  listTasksService,
  updateTaskService,
} from "../services/tasks.service";
import {
  CreateTaskBody,
  ListTasksQuery,
  TaskIdParams,
  UpdateTaskBody,
} from "../schemas/task.schema";

export async function createTask(
  req: AuthRequest<Record<string, string>, CreateTaskBody>,
  res: Response,
) {
  const { projectId, title, description, priority, dueDate, assigneeUserId } =
    req.body;

  const { id: userId, role } = req.user!;

  const task = await createTaskService(
    projectId,
    title,
    description,
    priority,
    dueDate,
    assigneeUserId,
    userId,
    role,
  );
  res.status(201).json(task);
}

//get list of tasks
export async function listTasks(
  req: AuthRequest<Record<string, string>, unknown, ListTasksQuery>,
  res: Response,
) {
  const { id, role } = req.user!;
  const { projectId, scope } = req.query;

  const tasks = await listTasksService(id, role, { projectId, scope });
  res.status(200).json(tasks);
}

export async function getTask(req: AuthRequest<TaskIdParams>, res: Response) {
  const taskId = Number(req.params.id);
  const { id: userId, role } = req.user!;

  const task = await getTaskService(taskId, userId, role);
  res.status(200).json(task);
}
//update task status
export async function updateTask(
  req: AuthRequest<TaskIdParams, UpdateTaskBody>,
  res: Response,
) {
  const taskId = Number(req.params.id);
  const { title, description, status, priority, dueDate, assigneeUserId } =
    req.body;

  const { id: userId, role } = req.user!;

  const task = await updateTaskService(
    taskId,
    title,
    description,
    status,
    priority,
    dueDate,
    assigneeUserId,
    userId,
    role,
  );
  res.json(task);
}
//delete task
export async function deleteTask(
  req: AuthRequest<TaskIdParams>,
  res: Response,
) {
  const taskId = Number(req.params.id);
  const { id: userId, role } = req.user!;

  await deleteTaskService(taskId, userId, role);
  res.json({ message: "Task deleted" });
}
