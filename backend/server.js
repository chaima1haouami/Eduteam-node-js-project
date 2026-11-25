import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import { initSocket } from "./socket.js";



const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use(morgan("dev"));
  app.use("/api/projects/:projectId/tasks", taskRoutes);
  app.use("/api/users", userRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Eduteam API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/files", fileRoutes);
app.use("/api/projects/:projectId/messages", messageRoutes);
app.use("/api/projects/:projectId/comments", commentRoutes);
app.use("/api/projects/:projectId/assistant", assistantRoutes);


const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  const server = http.createServer(app);
  app.set("io", initSocket(server));
  server.listen(PORT, () => console.log(`Serveur sur http://localhost:${PORT}`));
});