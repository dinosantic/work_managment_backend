import type { Role } from "./roles";

export type AuthTokenPayload = {
  id: number;
  role: Role;
};
