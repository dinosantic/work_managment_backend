import { AppError } from "../errors/AppError";
import { dbAll, dbGet, dbRun } from "../db/sqlite";
import type { Role } from "../types/roles";
import type {
  Project,
  ProjectMember,
  ProjectMemberRole,
  ProjectMemberRow,
  ProjectRow,
} from "../types/projects";

type EntityIdRow = {
  id: number;
};

type ProjectNameConflictRow = {
  id: number;
};

function mapProjectRow(project: ProjectRow): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdById: project.created_by,
    createdAt: project.created_at,
  };
}

function mapProjectMemberRow(member: ProjectMemberRow): ProjectMember {
  return {
    id: member.id,
    projectId: member.project_id,
    userId: member.user_id,
    role: member.role,
    createdAt: member.created_at,
  };
}

async function ensureProjectExists(projectId: number) {
  const project = await dbGet<EntityIdRow>(
    "SELECT id FROM projects WHERE id = ?",
    [projectId],
  );

  if (!project) {
    throw new AppError("Project not found", 404);
  }
}

async function ensureUserExists(userId: number) {
  const user = await dbGet<EntityIdRow>("SELECT id FROM users WHERE id = ?", [
    userId,
  ]);

  if (!user) {
    throw new AppError("User not found", 404);
  }
}

async function ensureProjectNameIsAvailable(
  name: string,
  excludeProjectId?: number,
) {
  const normalizedName = name.trim();
  const params: Array<string | number> = [normalizedName];
  let query = "SELECT id FROM projects WHERE LOWER(name) = LOWER(?)";

  if (excludeProjectId !== undefined) {
    query += " AND id != ?";
    params.push(excludeProjectId);
  }

  const existingProject = await dbGet<ProjectNameConflictRow>(query, params);

  if (existingProject) {
    throw new AppError("Project name already exists", 409);
  }
}

async function getProjectMemberRole(projectId: number, userId: number) {
  const membership = await dbGet<Pick<ProjectMemberRow, "role">>(
    "SELECT role FROM project_members WHERE project_id = ? AND user_id = ?",
    [projectId, userId],
  );

  return membership?.role;
}

async function requireProjectAccess(
  projectId: number,
  userId: number,
  role: Role,
): Promise<void> {
  await ensureProjectExists(projectId);

  if (role === "ADMIN") {
    return;
  }

  const membershipRole = await getProjectMemberRole(projectId, userId);

  if (!membershipRole) {
    throw new AppError("Not allowed", 403);
  }
}

async function requireProjectManager(
  projectId: number,
  userId: number,
  role: Role,
): Promise<void> {
  await ensureProjectExists(projectId);

  if (role === "ADMIN") {
    return;
  }

  const membershipRole = await getProjectMemberRole(projectId, userId);

  if (membershipRole !== "MANAGER") {
    throw new AppError("Not allowed", 403);
  }
}

export async function createProjectService(
  name: string,
  description: string,
  userId: number,
): Promise<Project> {
  try {
    await ensureProjectNameIsAvailable(name);

    const result = await dbRun(
      "INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)",
      [name, description, userId],
    );

    const projectId = result.lastID;

    await dbRun(
      "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'MANAGER')",
      [projectId, userId],
    );

    const project = await dbGet<ProjectRow>(
      "SELECT id, name, description, created_by, created_at FROM projects WHERE id = ?",
      [projectId],
    );

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    return mapProjectRow(project);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    throw new AppError("Failed to create project", 500);
  }
}

export async function listProjectsService(
  userId: number,
  role: Role,
): Promise<Project[]> {
  try {
    let projects: ProjectRow[];

    if (role === "ADMIN") {
      projects = await dbAll<ProjectRow>(
        "SELECT id, name, description, created_by, created_at FROM projects ORDER BY created_at DESC",
      );
    } else {
      projects = await dbAll<ProjectRow>(
        `
        SELECT p.id, p.name, p.description, p.created_by, p.created_at
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = ?
        ORDER BY p.created_at DESC
      `,
        [userId],
      );
    }

    return projects.map(mapProjectRow);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Failed to list projects", 500);
  }
}

export async function updateProjectService(
  projectId: number,
  name: string,
  description: string,
  userId: number,
  role: Role,
): Promise<Project> {
  try {
    await requireProjectManager(projectId, userId, role);
    await ensureProjectNameIsAvailable(name, projectId);

    await dbRun("UPDATE projects SET name = ?, description = ? WHERE id = ?", [
      name,
      description,
      projectId,
    ]);

    const project = await dbGet<ProjectRow>(
      "SELECT id, name, description, created_by, created_at FROM projects WHERE id = ?",
      [projectId],
    );

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    return mapProjectRow(project);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Failed to update project", 500);
  }
}

export async function getProjectService(
  projectId: number,
  userId: number,
  role: Role,
): Promise<{ project: Project; members: ProjectMember[] }> {
  try {
    await requireProjectAccess(projectId, userId, role);

    const project = await dbGet<ProjectRow>(
      "SELECT id, name, description, created_by, created_at FROM projects WHERE id = ?",
      [projectId],
    );

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const members = await dbAll<ProjectMemberRow>(
      "SELECT id, project_id, user_id, role, created_at FROM project_members WHERE project_id = ? ORDER BY created_at ASC",
      [projectId],
    );

    return {
      project: mapProjectRow(project),
      members: members.map(mapProjectMemberRow),
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Failed to get project", 500);
  }
}

export async function deleteProjectService(
  projectId: number,
  userId: number,
  role: Role,
): Promise<void> {
  try {
    await requireProjectManager(projectId, userId, role);

    await dbRun("DELETE FROM projects WHERE id = ?", [projectId]);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Failed to delete project", 500);
  }
}

export async function listProjectMembersService(
  projectId: number,
  userId: number,
  role: Role,
): Promise<ProjectMember[]> {
  try {
    await requireProjectAccess(projectId, userId, role);

    const members = await dbAll<ProjectMemberRow>(
      "SELECT id, project_id, user_id, role, created_at FROM project_members WHERE project_id = ? ORDER BY created_at ASC",
      [projectId],
    );

    return members.map(mapProjectMemberRow);
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Failed to list project members", 500);
  }
}

export async function addProjectMemberService(
  projectId: number,
  userIdToAdd: number,
  roleToAdd: ProjectMemberRole,
  userId: number,
  role: Role,
): Promise<void> {
  try {
    await requireProjectManager(projectId, userId, role);
    await ensureUserExists(userIdToAdd);

    await dbRun(
      "INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)",
      [projectId, userIdToAdd, roleToAdd],
    );
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      err.code === "SQLITE_CONSTRAINT"
    ) {
      throw new AppError("User is already a member of this project", 409);
    }

    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Failed to add project member", 500);
  }
}

export async function removeProjectMemberService(
  projectId: number,
  userIdToRemove: number,
  userId: number,
  role: Role,
): Promise<void> {
  try {
    await requireProjectManager(projectId, userId, role);

    const memberToRemove = await dbGet<EntityIdRow>(
      "SELECT id FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, userIdToRemove],
    );

    if (!memberToRemove) {
      throw new AppError("Project member not found", 404);
    }

    const result = await dbRun(
      "DELETE FROM project_members WHERE project_id = ? AND user_id = ?",
      [projectId, userIdToRemove],
    );

    if (result.changes === 0) {
      throw new AppError("Project member not found", 404);
    }
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError("Failed to remove project member", 500);
  }
}
