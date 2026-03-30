import express from "express";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import tasksRoutes from "./routes/tasks.routes";
import { errorMiddleware } from "./middleware/error.middleware";
import cors from "cors";
import "./db";

const app = express();
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(express.json());
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);

app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/tasks", tasksRoutes);

app.use(errorMiddleware);

export default app;
