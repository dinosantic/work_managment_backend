import { z } from "zod";
import { PROJECT_MEMBER_ROLES } from "../types/projects";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required"),
  description: z.string().trim().min(1, "Project description is required"),
});

export const projectIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "Project id must be a positive integer"),
});

export const projectMemberParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, "Project id must be a positive integer"),
  userId: z.string().regex(/^\d+$/, "User id must be a positive integer"),
});

export const addProjectMemberSchema = z.object({
  userId: z.number().int().positive("User id must be a positive integer"),
  role: z.enum(PROJECT_MEMBER_ROLES),
});

export const removeProjectMemberSchema = z.object({
  userId: z.number().int().positive("User id must be a positive integer"),
});

export const updateProjectMemberSchema = z.object({
  role: z.enum(PROJECT_MEMBER_ROLES),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;
export type ProjectIdParams = z.infer<typeof projectIdParamSchema>;
export type ProjectMemberParams = z.infer<typeof projectMemberParamsSchema>;
export type AddProjectMemberBody = z.infer<typeof addProjectMemberSchema>;
export type RemoveProjectMemberBody = z.infer<typeof removeProjectMemberSchema>;
export type UpdateProjectMemberBody = z.infer<typeof updateProjectMemberSchema>;
