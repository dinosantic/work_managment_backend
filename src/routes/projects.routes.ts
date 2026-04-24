import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  addProjectMember,
  createProject,
  deleteProject,
  getProject,
  listProjectMembers,
  listProjects,
  removeProjectMember,
  updateProject,
} from "../controllers/projects.controller";
import { validate } from "../middleware/validate.middleware";
import {
  addProjectMemberSchema,
  createProjectSchema,
  projectIdParamSchema,
  removeProjectMemberSchema,
} from "../schemas/project.schema";

const router = Router();

router.post("/", authMiddleware, validate(createProjectSchema), createProject);
router.get("/", authMiddleware, listProjects);
router.get(
  "/:id",
  authMiddleware,
  validate(projectIdParamSchema, "params"),
  getProject,
);
router.patch(
  "/:id",
  authMiddleware,
  validate(projectIdParamSchema, "params"),
  validate(createProjectSchema),
  updateProject,
);
router.delete(
  "/:id",
  authMiddleware,
  validate(projectIdParamSchema, "params"),
  deleteProject,
);

router.get(
  "/:id/members",
  authMiddleware,
  validate(projectIdParamSchema, "params"),
  listProjectMembers,
);

router.post(
  "/:id/members",
  authMiddleware,
  validate(projectIdParamSchema, "params"),
  validate(addProjectMemberSchema),
  addProjectMember,
);

router.delete(
  "/:id/members/:userId",
  authMiddleware,
  validate(projectIdParamSchema, "params"),
  validate(removeProjectMemberSchema),
  removeProjectMember,
);

export default router;
