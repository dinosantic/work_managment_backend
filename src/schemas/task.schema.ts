import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
});

export const updateTaskSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE"]),
});

export const taskIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Task id must be a positive integer"),
});

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
export type TaskIdParams = z.infer<typeof taskIdParamSchema>;
