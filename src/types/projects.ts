import type { UserDirectoryItem } from "./users";

export const PROJECT_MEMBER_ROLES = ["MANAGER", "MEMBER"] as const;

export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export type ProjectRow = {
  id: number;
  name: string;
  description: string | null;
  created_by: number;
  created_at: string;
};

export type Project = {
  id: number;
  name: string;
  description: string | null;
  createdById: number;
  createdAt: string;
};

export type ProjectMemberRow = {
  id: number;
  project_id: number;
  user_id: number;
  role: ProjectMemberRole;
  created_at: string;
  email: string;
  display_name: string | null;
  user_role: UserDirectoryItem["role"];
};

export type ProjectMember = {
  id: number;
  projectId: number;
  userId: number;
  role: ProjectMemberRole;
  createdAt: string;
  user: UserDirectoryItem;
};
