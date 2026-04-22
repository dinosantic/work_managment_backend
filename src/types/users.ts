import type { Role } from "./roles";

export type CurrentUserRow = {
  id: number;
  email: string;
  display_name: string | null;
  role: Role;
};

export type CurrentUser = {
  id: number;
  email: string;
  role: Role;
  displayName: string;
};

export type EditCurrentUserBody = Pick<CurrentUser, "displayName">;
