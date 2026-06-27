import { Router } from "express";
import { appendSheetRow, readSheetObjects } from "../services/sheets.js";

export const gameRoutes = Router();

gameRoutes.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: "football-game-api",
    message: "API is running"
  });
});

gameRoutes.get("/players", async (_req, res, next) => {
  try {
    const players = await readSheetObjects("Players!A1:Z");
    res.json({ players });
  } catch (error) {
    next(error);
  }
});

gameRoutes.get("/teams", async (_req, res, next) => {
  try {
    const teams = await readSheetObjects("Teams!A1:Z");
    res.json({ teams });
  } catch (error) {
    next(error);
  }
});

gameRoutes.get("/game-state", async (_req, res, next) => {
  try {
    const rows = await readSheetObjects("GameState!A1:Z");
    res.json({ gameState: rows[0] ?? null });
  } catch (error) {
    next(error);
  }
});

gameRoutes.post("/plays", async (req, res, next) => {
  try {
    const {
      game_id,
      play_number,
      offense_team_id,
      defense_team_id,
      down,
      distance,
      yard_line,
      play_call,
      result,
      yards_gained
    } = req.body;

    const playId = crypto.randomUUID();

    const row = [
      playId,
      game_id,
      play_number,
      offense_team_id,
      defense_team_id,
      down,
      distance,
      yard_line,
      play_call,
      result,
      yards_gained,
      new Date().toISOString()
    ];

    await appendSheetRow("Plays!A:L", row);

    res.json({
      ok: true,
      play: {
        play_id: playId,
        game_id,
        play_number,
        play_call,
        result,
        yards_gained
      }
    });
  } catch (error) {
    next(error);
  }
});