import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { AuthBody } from "../schemas/auth.schema";

export async function register(
  req: Request<unknown, unknown, AuthBody>,
  res: Response,
) {
  const { email, password } = req.body;

  await registerUser(email, password);
  res.status(201).json({ message: "User created" });
}

export async function login(
  req: Request<unknown, unknown, AuthBody>,
  res: Response,
) {
  const { email, password } = req.body;

  const token = await loginUser(email, password);
  res.json({ token });
}
