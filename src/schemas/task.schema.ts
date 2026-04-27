import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "../types/tasks";

export const createTaskSchema = z.object({
  projectId: z.number().int().positive("Project id must be a positive integer"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD format")
    .nullable()
    .optional(),
  assigneeUserId: z.number().int().positive().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD format")
    .nullable(),
  assigneeUserId: z.number().int().positive().nullable(),
});

export const taskIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Task id must be a positive integer"),
});

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
export type TaskIdParams = z.infer<typeof taskIdParamSchema>;
