import { Router } from "express";
import { runtimeDatabase } from "../db/runtime.js";
import { LeagueManagement, LeagueSetupError } from "../db/leagueManagement.js";
export const leagueRoutes = Router();
leagueRoutes.get("/leagues", (_req, res, next) => {
  try {
    res.json({
      leagues: new LeagueManagement(runtimeDatabase()).leagues(),
      maxSlots: 3,
    });
  } catch (error) {
    next(error);
  }
});
leagueRoutes.get("/league-catalog", (_req, res, next) => {
  try {
    res.json(new LeagueManagement(runtimeDatabase()).catalog());
  } catch (error) {
    next(error);
  }
});
leagueRoutes.post("/leagues", (req, res, next) => {
  try {
    res
      .status(201)
      .json({
        league: new LeagueManagement(runtimeDatabase()).create(req.body),
      });
  } catch (error) {
    if (error instanceof LeagueSetupError)
      res.status(error.status).json({ error: error.message });
    else next(error);
  }
});
