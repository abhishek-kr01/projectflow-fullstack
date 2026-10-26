import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import taskRouter from "./routes/task.routes.js";
import projectNoteRouter from "./routes/projectnote.routes.js";
import messageRouter from "./routes/message.routes.js";
import realtimeRouter from "./routes/realtime.routes.js";
import notificationRouter from "./routes/notification.routes.js";
import { ApiError } from "./utils/api-error.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "16mb" }));
app.use(express.urlencoded({ extended: true, limit: "16mb" }));
app.use(cookieParser());

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.static(path.resolve(process.cwd(), "public")));
app.get("/", (_req, res) => res.status(200).json({ service: "ProjectFlow API", status: "ok", docs: "/api/v1/healthcheck" }));
app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/notes", projectNoteRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/realtime", realtimeRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use((_req, _res, next) => next(new ApiError(404, "Route not found.")));
app.use(errorHandler);

export default app;
