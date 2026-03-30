import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createTaskService,
  deleteTaskService,
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
  const { title } = req.body;

  const userId = req.user!.id;

  const task = await createTaskService(title, userId);
  res.status(201).json(task);
}

//get list of tasks
export async function listTasks(req: AuthRequest, res: Response) {
  const { id, role } = req.user!;

  const tasks = await listTasksService(id, role);
  res.status(200).json(tasks);
}
//update task status
export async function updateTask(
  req: AuthRequest<TaskIdParams, UpdateTaskBody>,
  res: Response,
) {
  const taskId = Number(req.params.id);
  const { status } = req.body;

  const { id: userId, role } = req.user!;

  await updateTaskService(taskId, status, userId, role);
  res.json({ message: "Task updated" });
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
