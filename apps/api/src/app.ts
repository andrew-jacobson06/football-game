import express from "express";
import cors from "cors";
import { leagueSelection } from "./db/leagueSelection.js";
import { leagueRoutes } from "./routes/leagueRoutes.js";
import { gameRoutes } from "./routes/gameRoutes.js";
import { StaleGameStateError } from "./db/gameTransactions.js";
export function createApp() {
  const app = express();
  app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"] }));
  app.use(express.json({ limit: "2mb" }));
  app.use((req,res,next)=>{
    const leagueId=req.get("X-League-Id")?.trim();
    const requestedSeason = req.query.seasonId;
    const seasonalRead = req.method === "GET" && (
      /^\/api\/(players|teams|games|standings|player-stats|team-defense-stats|team-season-stats)$/.test(req.path) ||
      /^\/api\/players\/[^/]+\/games$/.test(req.path) || /^\/api\/teams\/[^/]+\/players$/.test(req.path)
    );
    if (requestedSeason !== undefined && (!seasonalRead || typeof requestedSeason !== "string" || !requestedSeason.trim())) {
      res.status(400).json({ error: "seasonId is supported only for seasonal statistics reads." });
      return;
    }
    leagueSelection.run({leagueId:leagueId||undefined, seasonId: seasonalRead ? requestedSeason as string | undefined : undefined},()=>next());
  });
  app.use("/api", leagueRoutes);
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
