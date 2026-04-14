export type CurrentUserRow = {
  id: number;
  email: string;
  display_name: string | null;
  role: string;
};

export type CurrentUser = {
  id: number;
  email: string;
  role: string;
  displayName: string;
};

export type EditCurrentUserBody = Pick<CurrentUser, "displayName">;
