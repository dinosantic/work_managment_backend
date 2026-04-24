import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  addProjectMemberService,
  createProjectService,
  deleteProjectService,
  getProjectService,
  listProjectMembersService,
  listProjectsService,
  removeProjectMemberService,
  updateProjectService,
} from "../services/projects.service";
import {
  AddProjectMemberBody,
  CreateProjectBody,
  ProjectIdParams,
  RemoveProjectMemberBody,
} from "../schemas/project.schema";

export async function createProject(
  req: AuthRequest<Record<string, string>, CreateProjectBody>,
  res: Response,
) {
  const { name, description } = req.body;

  const { id: userId } = req.user!;

  const project = await createProjectService(name, description, userId);
  res.status(201).json(project);
}

export async function listProjects(req: AuthRequest, res: Response) {
  const { id, role } = req.user!;

  const projects = await listProjectsService(id, role);
  res.status(200).json(projects);
}

export async function getProject(
  req: AuthRequest<ProjectIdParams>,
  res: Response,
) {
  const projectId = Number(req.params.id);
  const { id: userId, role } = req.user!;

  const project = await getProjectService(projectId, userId, role);
  res.status(200).json(project);
}

export async function listProjectMembers(
  req: AuthRequest<ProjectIdParams>,
  res: Response,
) {
  const projectId = Number(req.params.id);
  const { id: userId, role } = req.user!;

  const members = await listProjectMembersService(projectId, userId, role);
  res.status(200).json(members);
}

export async function updateProject(
  req: AuthRequest<ProjectIdParams, CreateProjectBody>,
  res: Response,
) {
  const projectId = Number(req.params.id);
  const { name, description } = req.body;

  const { id: userId, role } = req.user!;

  const project = await updateProjectService(
    projectId,
    name,
    description,
    userId,
    role,
  );
  res.status(200).json(project);
}

export async function deleteProject(
  req: AuthRequest<ProjectIdParams>,
  res: Response,
) {
  const projectId = Number(req.params.id);
  const { id: userId, role } = req.user!;

  await deleteProjectService(projectId, userId, role);
  res.status(204).send();
}

export async function addProjectMember(
  req: AuthRequest<ProjectIdParams, AddProjectMemberBody>,
  res: Response,
) {
  const projectId = Number(req.params.id);
  const { userId, role } = req.body;

  const { id: requesterUserId, role: requesterRole } = req.user!;

  await addProjectMemberService(
    projectId,
    userId,
    role,
    requesterUserId,
    requesterRole,
  );
  res.status(204).send();
}

export async function removeProjectMember(
  req: AuthRequest<ProjectIdParams, RemoveProjectMemberBody>,
  res: Response,
) {
  const projectId = Number(req.params.id);
  const { userId } = req.body;

  const { id: requesterUserId, role: requesterRole } = req.user!;

  await removeProjectMemberService(
    projectId,
    userId,
    requesterUserId,
    requesterRole,
  );
  res.status(204).send();
}
