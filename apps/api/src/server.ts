import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { gameRoutes } from "./routes/gameRoutes.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"]
  })
);

app.use(express.json());

app.use("/api", gameRoutes);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(port, () => {
  console.log(`Football game API running on http://localhost:${port}`);
});