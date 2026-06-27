import type { LeagueGame } from "../../types";
import type { EngineContext, PlayCallOptions } from "./types";
import { advanceBall, advanceQuarter, byName, byPosition, choose, clockRunoff, defenseTeam, isSafety, isTouchdown, n, nextDownDistance, offenseTeam, playerName, switchPoss, teamPlayers, trait, weightedChoose } from "./utils";
import { buildResult } from "./playLogger";

export function determineTackler(ctx: EngineContext, defense: string, yards: number) {
  const defenders = teamPlayers(ctx, defense);
  const preferred = yards <= 2 ? ["DL", "LB"] : yards <= 8 ? ["LB", "DB", "S"] : ["DB", "S", "LB"];
  const pool = defenders.filter((p) => preferred.includes(String(p.defPos ?? "").toUpperCase())) || defenders;
  return playerName(weightedChoose(pool.length ? pool : defenders, (p) => trait(p, "tackleChance")), "NA");
}
export function checkForFumble(ctx: EngineContext, runnerName: string, tacklerName: string, sack = false) {
  const runner = byName(ctx, runnerName); const defender = byName(ctx, tacklerName);
  const strip = trait(defender, "strip", 20); const ballSecurity = (trait(runner, "ballsecurity", 50) + trait(runner, "hands", 50)) / 2;
  const chance = sack ? (strip / 12) * ((110 - ballSecurity) / 100) + trait(defender, "defStars", 0) / 150 : (strip / 10) * ((100 - ballSecurity) / 100);
  const fumble = Math.random() * 100 < chance;
  if (!fumble) return { fumble: false, recoveredBy: "" };
  const defStars = trait(defender, "defStars", 50), offStars = trait(runner, "offStars", 50);
  return { fumble: true, recoveredBy: Math.random() * (defStars + offStars) < offStars ? runnerName : tacklerName };
}
export function simulateSingleCarry(stats: { name: string; runner?: Record<string, unknown>; offStar?: boolean; defStar?: boolean; autoStuff?: boolean; autoRelease?: boolean }) {
  const modLog: string[] = [];
  if (stats.autoStuff) {
    let yards = Math.floor(Math.random() * 5) - 2;
    if (Math.random() * 100 < trait(stats.runner, "vision")) { yards += 1; modLog.push("Vision softened auto-stuff"); }
    if (Math.random() * 100 < trait(stats.runner, "strength")) { yards += 1; modLog.push("Power fell forward"); }
    return { name: stats.name, roll: 0, yards, modLog };
  }
  let roll = Math.floor(Math.random() * 101);
  if (stats.autoRelease) { roll += 15; modLog.push("Blocking created auto-release"); }
  if (Math.random() * 100 < trait(stats.runner, "vision")) roll += 8;
  if (Math.random() * 100 < trait(stats.runner, "acceleration")) roll += 6;
  let yards = roll >= 98 ? Math.floor(Math.random() * 31) + 20 : roll >= 85 ? Math.floor(Math.random() * 11) + 10 : roll >= 65 ? Math.floor(Math.random() * 6) + 5 : roll >= 40 ? Math.floor(Math.random() * 5) + 1 : roll >= 20 ? 0 : -Math.floor(Math.random() * 4);
  if (stats.offStar) yards += 3;
  if (stats.defStar) yards -= 2;
  if (yards < 0 && Math.random() * 100 < trait(stats.runner, "strength")) yards = 0;
  if (yards >= 10 && Math.random() * 100 < trait(stats.runner, "speed")) yards += Math.floor(Math.random() * 8);
  if (yards <= 3 && Math.random() * 100 < trait(stats.runner, "juke")) yards += 2;
  return { name: stats.name, roll, yards, modLog };
}
export function runPlay(game: LeagueGame, ctx: EngineContext, options: PlayCallOptions = {}) {
  const offense = offenseTeam(game), defense = defenseTeam(game);
  const formation = options.formation ?? {};
  const runner = byName(ctx, options.runner) ?? byName(ctx, formation.RB1) ?? byName(ctx, formation.RB2) ?? byName(ctx, formation.QB) ?? choose([...byPosition(ctx, offense, "RB"), ...byPosition(ctx, offense, "WR"), ...byPosition(ctx, offense, "QB")]);
  const runnerName = playerName(runner, `${offense} Runner`);
  const blockers = Object.values(formation).map((name) => byName(ctx, name)).filter(Boolean).filter((p) => playerName(p) !== runnerName);
  const rushers = teamPlayers(ctx, defense).filter((p) => ["DL", "LB"].includes(String(p.defPos ?? "").toUpperCase()));
  const offTotal = blockers.reduce((s, p) => s + trait(p, "runBlocking"), 0);
  const defTotal = rushers.reduce((s, p) => s + trait(p, "runDef"), 0);
  const carry = simulateSingleCarry({ name: runnerName, runner, offStar: Math.random() * 100 < trait(runner, "offStars"), defStar: rushers.some((p) => Math.random() * 100 < trait(p, "defStars") / 4), autoStuff: defTotal > offTotal && Math.random() < 0.25, autoRelease: offTotal > defTotal && Math.random() < 0.2 });
  const newBall = advanceBall(game, carry.yards);
  const td = isTouchdown(game, newBall), safety = isSafety(game, newBall);
  const yards = td ? Math.abs((game.Possession === "Home" ? 100 : 0) - n(game.BallOn)) : safety ? -Math.abs(n(game.BallOn) - (game.Possession === "Home" ? 0 : 100)) : carry.yards;
  const tackler = td ? "NA" : determineTackler(ctx, defense, yards);
  const fumble = tackler !== "NA" && !td ? checkForFumble(ctx, runnerName, tackler) : { fumble: false, recoveredBy: "" };
  const next = nextDownDistance(game, yards, newBall);
  const result = td ? "Touchdown" : safety ? "Safety" : fumble.fumble ? "Fumble" : next.turnover ? "TO on Downs" : yards >= n(game.Distance) ? "First Down" : "Normal";
  let hs = n(game.HomeScore), as = n(game.AwayScore); if (td) { if (game.Possession === "Home") hs += 6; else as += 6; } if (safety) { if (game.Possession === "Home") as += 2; else hs += 2; }
  const possession = td || safety || next.turnover || (fumble.fumble && fumble.recoveredBy === tackler) ? switchPoss(game) : game.Possession;
  const clock = advanceQuarter(game, clockRunoff(options.clockMode, Math.max(3, 12 - Math.floor(trait(runner, "speed") / 15)), ["Touchdown", "Safety", "TO on Downs", "Fumble"].includes(result)));
  const updated = { ...game, HomeScore: hs, AwayScore: as, Qtr: clock.qtr, Time: clock.time, Down: next.down, Distance: next.distance, BallOn: next.ballOn, Previous: game.BallOn, DriveStart: next.turnover || td || safety ? next.ballOn : (game as unknown as Record<string, unknown>).DriveStart ?? game.BallOn, Possession: possession };
  return buildResult(game, updated, "Run", runnerName, "", yards, tackler, result, ctx.historyLength, { recoveredby: fumble.recoveredBy });
}
