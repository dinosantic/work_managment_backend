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
  updateProjectMember,
  updateProject,
} from "../controllers/projects.controller";
import { validate } from "../middleware/validate.middleware";
import {
  addProjectMemberSchema,
  createProjectSchema,
  projectMemberParamsSchema,
  projectIdParamSchema,
  updateProjectMemberSchema,
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

router.patch(
  "/:id/members/:userId",
  authMiddleware,
  validate(projectMemberParamsSchema, "params"),
  validate(updateProjectMemberSchema),
  updateProjectMember,
);

router.delete(
  "/:id/members/:userId",
  authMiddleware,
  validate(projectMemberParamsSchema, "params"),
  removeProjectMember,
);

export default router;
