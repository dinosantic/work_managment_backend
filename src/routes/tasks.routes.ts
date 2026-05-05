import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from "../controllers/tasks.controller";
import { validate } from "../middleware/validate.middleware";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from "../schemas/task.schema";

const router = Router();

router.post("/", authMiddleware, validate(createTaskSchema), createTask);
router.get("/", authMiddleware, validate(listTasksQuerySchema, "query"), listTasks);
router.get("/:id", authMiddleware, validate(taskIdParamSchema, "params"), getTask);
router.patch(
  "/:id",
  authMiddleware,
  validate(taskIdParamSchema, "params"),
  validate(updateTaskSchema),
  updateTask,
);
router.delete(
  "/:id",
  authMiddleware,
  validate(taskIdParamSchema, "params"),
  deleteTask,
);

export default router;
