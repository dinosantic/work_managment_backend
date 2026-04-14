import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { EditCurrentUserBody } from "../types/users";
import {
  getCurrentUserService,
  editCurrentUserService,
} from "../services/users.service";

export async function getCurrentUser(req: AuthRequest, res: Response) {
  const user = await getCurrentUserService(req.user!.id);

  res.json({ user });
}

export async function editCurrentUser(
  req: AuthRequest<Record<string, string>, EditCurrentUserBody>,
  res: Response,
) {
  const { displayName } = req.body;

  const user = await editCurrentUserService(req.user!.id, displayName);

  res.json({ user });
}
