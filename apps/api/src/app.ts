import express from "express";
import cors from "cors";
import { gameRoutes } from "./routes/gameRoutes.js";
import { StaleGameStateError } from "./db/gameTransactions.js";
export function createApp() {
  const app = express();
  app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"] }));
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", gameRoutes);
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(err);
      res.status(err instanceof StaleGameStateError ? 409 : 500).json({
        error: err instanceof Error ? err.message : "Internal server error",
      });
    },
  );
  return app;
}
