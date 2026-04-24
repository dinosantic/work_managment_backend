export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "DONE"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskRow = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_by: number;
  assignee_user_id: number | null;
  projectId: number;
};

export type Task = {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdById: number;
  assigneeUserId: number | null;
  projectId: number;
};
