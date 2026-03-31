import "dotenv/config";
import express from "express";
import cors from "cors";
import apiRoutes from "./http/routes/index.js";
import { errorHandler } from "./http/middleware/errorHandler.js";
import { DEFAULT_PORT } from "./shared/constants/index.js";

const app = express();
const port = Number(process.env["PORT"] ?? DEFAULT_PORT);

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server] What Should I Eat backend running on http://localhost:${port}`);
  console.log(`[server] Routes:`);
  console.log(`[server]   GET  /api/health`);
  console.log(`[server]   POST /api/restaurants`);
  console.log(`[server]   POST /api/recipes`);
  console.log(`[server]   POST /api/chat`);
});
