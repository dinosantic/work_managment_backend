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
  TaskIdParams,
  UpdateTaskBody,
} from "../schemas/task.schema";

export async function createTask(
  req: AuthRequest<Record<string, string>, CreateTaskBody>,
  res: Response,
) {
  const { title, description } = req.body;

  const userId = req.user!.id;

  const task = await createTaskService(title, description, userId);
  res.status(201).json(task);
}

//get list of tasks
export async function listTasks(req: AuthRequest, res: Response) {
  const { id, role } = req.user!;

  const tasks = await listTasksService(id, role);
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
  const { title, description, status } = req.body;

  const { id: userId, role } = req.user!;

  const task = await updateTaskService(
    taskId,
    title,
    description,
    status,
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
