import type { LeagueGame } from "../../types";
import type { EngineContext, PlayCallOptions } from "./types";
import { advanceQuarter, kickoffSpot, n, randomInt, switchPoss } from "./utils";
import { buildResult } from "./playLogger";

export function punt(game: LeagueGame, ctx: EngineContext) {
  const yards = 40;
  const ball = Math.max(1, Math.min(99, game.Possession === "Home" ? n(game.BallOn) + yards : n(game.BallOn) - yards));
  const possession = switchPoss(game);
  const clock = advanceQuarter(game, randomInt(5, 8));
  const updated = { ...game, Qtr: clock.qtr, Time: clock.time, Down: 1, Distance: 10, BallOn: ball, Previous: game.BallOn, DriveStart: ball, Possession: possession };
  return buildResult(game, updated, "Punt", game.Possession, "", yards, "", "Punt", ctx.historyLength);
}
export function kickFG(game: LeagueGame, ctx: EngineContext) {
  const pendingFGTeam = (game as unknown as Record<string, unknown>).pendingFGTeam as string | undefined;
  const isXp = Boolean(pendingFGTeam);
  const scoring = pendingFGTeam || game.Possession;
  const inRange = isXp || (game.Possession === "Home" ? n(game.BallOn) >= 65 : n(game.BallOn) <= 35);
  let hs = n(game.HomeScore), as = n(game.AwayScore);
  if (inRange) { if (scoring === "Home") hs += isXp ? 1 : 3; else as += isXp ? 1 : 3; }
  const possession = switchPoss(game);
  const clock = advanceQuarter(game, randomInt(3, 8));
  const spot = kickoffSpot(possession);
  const updated = { ...game, HomeScore: hs, AwayScore: as, Qtr: clock.qtr, Time: clock.time, Down: 1, Distance: 10, BallOn: spot, Previous: game.BallOn, DriveStart: spot, Possession: possession, pendingFGTeam: undefined };
  return buildResult(game, updated, "Field Goal", scoring, "", 0, "", isXp ? "Kick XP" : inRange ? "Kick FG" : "Missed FG", ctx.historyLength);
}
export function goForTwo(game: LeagueGame, ctx: EngineContext) {
  const scoring = ((game as unknown as Record<string, unknown>).pendingFGTeam as string | undefined) || game.Possession;
  const made = randomInt(1, 100) <= 47; let hs = n(game.HomeScore), as = n(game.AwayScore); if (made) { if (scoring === "Home") hs += 2; else as += 2; }
  const possession = switchPoss(game); const spot = kickoffSpot(possession); const updated = { ...game, HomeScore: hs, AwayScore: as, Down: 1, Distance: 10, BallOn: spot, DriveStart: spot, Possession: possession };
  return buildResult(game, updated, "Two Point", scoring, "", made ? 2 : 0, "", made ? "2PT Successful" : "2PT Failed", ctx.historyLength);
}
export function handleTimeout(game: LeagueGame, ctx: EngineContext) { const key = game.Possession === "Home" ? "HomeTimeouts" : "AwayTimeouts"; const current = Number((game as unknown as Record<string, unknown>)[key] ?? 3); const updated = { ...game, [key]: Math.max(0, current - 1) }; return buildResult(game, updated, "Timeout", game.Possession, "", 0, "", "Timeout", ctx.historyLength); }
export function spikeBall(game: LeagueGame, ctx: EngineContext) { const clock = advanceQuarter(game, 1); const updated = { ...game, Qtr: clock.qtr, Time: clock.time, Down: Math.min(4, n(game.Down) + 1), Distance: game.Distance }; return buildResult(game, updated, "Spike", game.Possession, "", 0, "", "Incomplete", ctx.historyLength); }
export function kneel(game: LeagueGame, ctx: EngineContext, options: PlayCallOptions = {}) { void options; const clock = advanceQuarter(game, 40); const ball = game.Possession === "Home" ? n(game.BallOn) - 1 : n(game.BallOn) + 1; const updated = { ...game, Qtr: clock.qtr, Time: clock.time, Down: Math.min(4, n(game.Down) + 1), BallOn: ball }; return buildResult(game, updated, "Kneel", game.Possession, "", -1, "", "Kneel", ctx.historyLength); }
