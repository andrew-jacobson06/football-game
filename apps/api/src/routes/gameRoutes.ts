import { Router } from "express";

export const gameRoutes = Router();

gameRoutes.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: "football-game-api",
    message: "API is running"
  });
});