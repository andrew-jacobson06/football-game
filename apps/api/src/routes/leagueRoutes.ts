import { SeasonLaunch } from "../db/seasonLaunch.js";
import { PlayerDraft } from "../db/playerDraft.js";
import type { Response, NextFunction } from "express";
import { repository } from "../db/leagueRepository.js";
import {
  SeasonPreparation,
  SeasonSetupError,
} from "../db/seasonPreparation.js";
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
    res.status(201).json({
      league: new LeagueManagement(runtimeDatabase()).create(req.body),
    });
  } catch (error) {
    if (error instanceof LeagueSetupError)
      res.status(error.status).json({ error: error.message });
    else next(error);
  }
});

function preparation() {
  return new SeasonPreparation(repository());
}
function setupResponse(
  res: Response,
  next: NextFunction,
  action: () => unknown,
) {
  try {
    res.json(action());
  } catch (error) {
    if (error instanceof SeasonSetupError)
      res.status(error.status).json({ error: error.message });
    else next(error);
  }
}
leagueRoutes.get("/season/preparation", (_req, res, next) =>
  setupResponse(res, next, () => preparation().state()),
);
leagueRoutes.post("/season/advance-year", (req, res, next) =>
  setupResponse(res, next, () =>
    preparation().advance(
      String(req.body?.fromSeasonId),
      req.body?.keeperCount,
    ),
  ),
);
leagueRoutes.put("/season/keepers/:teamId", (req, res, next) =>
  setupResponse(res, next, () =>
    preparation().lockTeam(
      String(req.body?.seasonId),
      String(req.params.teamId),
      req.body?.playerIds,
      req.body?.coachAction,
    ),
  ),
);
leagueRoutes.post("/season/keepers/:teamId/unlock", (req, res, next) =>
  setupResponse(res, next, () =>
    preparation().unlockTeam(
      String(req.body?.seasonId),
      String(req.params.teamId),
    ),
  ),
);
leagueRoutes.post("/season/keepers/finalize", (req, res, next) =>
  setupResponse(res, next, () =>
    preparation().finalize(String(req.body?.seasonId)),
  ),
);
leagueRoutes.post("/season/coaches/hire", (req, res, next) =>
  setupResponse(res, next, () =>
    preparation().hire(
      String(req.body?.seasonId),
      String(req.body?.teamId),
      String(req.body?.coachId),
    ),
  ),
);

leagueRoutes.get("/draft", (_req, res, next) =>
  setupResponse(res, next, () => new PlayerDraft(repository()).state()),
);
leagueRoutes.post("/draft/start", (req, res, next) =>
  setupResponse(res, next, () =>
    new PlayerDraft(repository()).start(
      String(req.body?.seasonId),
      req.body?.rosterTarget,
    ),
  ),
);
leagueRoutes.post("/draft/pick", (req, res, next) =>
  setupResponse(res, next, () =>
    new PlayerDraft(repository()).pick(
      String(req.body?.seasonId),
      String(req.body?.pickId),
      String(req.body?.playerId),
    ),
  ),
);

leagueRoutes.post("/draft/finalize", (req, res, next) =>
  setupResponse(res, next, () => {
    const repo = repository();
    new SeasonLaunch(repo).run(String(req.body?.seasonId), req.body?.stage);
    return new PlayerDraft(repo).state();
  }),
);
