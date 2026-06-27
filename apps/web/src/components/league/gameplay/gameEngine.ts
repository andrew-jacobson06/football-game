import type { LeagueGame } from "../types";
import { formatClock, parseTimeToSeconds } from "../leagueMappers";

export type PlayKind = "Run" | "Pass" | "Punt" | "Field Goal" | "Two Point" | "Timeout" | "Spike" | "Kneel";
export type FormationSlot = "WR1" | "TEOL1" | "TEOL2" | "TEOL3" | "TEOL4" | "TEOL5" | "WR2" | "WR3" | "QB" | "RB1" | "RB2";
export type PlayCallOptions = { formation?: Partial<Record<FormationSlot, string>>; routes?: Record<string, string>; reads?: Record<string, string>; runner?: string; clockMode?: "Normal" | "Hurry Up" | "Chew Clock" };
export type EngineContext = { players: Record<string, unknown>[]; settings: Record<string, unknown>; historyLength: number };
const n = (v: unknown) => Number(v) || 0;
export function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function average(a: number, b: number) { return (a + b) / 2; }
function choose<T>(items: T[]) { return items[Math.max(0, randomInt(0, items.length - 1))]; }
function teamPlayers(ctx: EngineContext, team: string) { return ctx.players.filter((p) => String(p.team ?? p.Team ?? "") === team); }
function byPos(ctx: EngineContext, team: string, pos: string) { return teamPlayers(ctx, team).filter((p) => String(p.position ?? p.Pos ?? "").toUpperCase().includes(pos)); }
function playerName(p: Record<string, unknown> | undefined, fallback: string) { return String(p?.name ?? p?.Name ?? fallback); }
function trait(p: Record<string, unknown> | undefined, key: string, fallback = 50) { return Number(p?.[key]) || fallback; }
function advanceQuarter(game: LeagueGame, secondsUsed: number) {
  const left = Math.max(0, parseTimeToSeconds(game.Time) - secondsUsed);
  let qtr: string | number = game.Qtr;
  let time: string | number = formatClock(left);
  if (left === 0 && Number(game.Qtr) < 4) { qtr = Number(game.Qtr) + 1; time = "15:00"; }
  else if (left === 0 && Number(game.Qtr) >= 4) qtr = "FINAL";
  return { qtr, time };
}
function nextDownDistance(game: LeagueGame, yards: number) {
  const down = n(game.Down); const distance = n(game.Distance); const ballOn = n(game.BallOn);
  const newBallOn = Math.max(0, Math.min(100, ballOn + yards));
  if (newBallOn >= 100) return { down: 1, distance: 10, ballOn: 25, touchdown: true, turnover: false };
  if (yards >= distance) return { down: 1, distance: Math.min(10, 100 - newBallOn), ballOn: newBallOn, touchdown: false, turnover: false };
  if (down >= 4) return { down: 1, distance: 10, ballOn: 100 - newBallOn, touchdown: false, turnover: true };
  return { down: down + 1, distance: distance - yards, ballOn: newBallOn, touchdown: false, turnover: false };
}
function switchPoss(game: LeagueGame) { return game.Possession === "Home" ? "Away" : "Home"; }
export function runPlay(game: LeagueGame, ctx: EngineContext, options: PlayCallOptions = {}) { return resolveScrimmage(game, ctx, "Run", options); }
export function passPlay(game: LeagueGame, ctx: EngineContext, options: PlayCallOptions = {}) { return resolveScrimmage(game, ctx, "Pass", options); }
function byName(ctx: EngineContext, name?: string) { return ctx.players.find((p) => playerName(p, "") === name); }
function clockUse(kind: "Run" | "Pass", options: PlayCallOptions) { const base = kind === "Run" ? randomInt(28, 44) : randomInt(8, 35); if (options.clockMode === "Hurry Up") return Math.max(3, Math.round(base * 0.45)); if (options.clockMode === "Chew Clock") return Math.min(45, Math.round(base * 1.35)); return base; }
function resolveScrimmage(game: LeagueGame, ctx: EngineContext, kind: "Run" | "Pass", options: PlayCallOptions) {
  const offense = game.Possession === "Home" ? game.Home : game.Away;
  const defense = game.Possession === "Home" ? game.Away : game.Home;
  const formation = options.formation ?? {};
  const routeNames = Object.entries(options.routes ?? {}).filter(([, route]) => route && route !== "No Route").map(([name]) => name);
  const qb = byName(ctx, formation.QB) ?? choose(byPos(ctx, offense, "QB"));
  const carrier = kind === "Run" ? (byName(ctx, options.runner) ?? choose([byName(ctx, formation.RB1), byName(ctx, formation.RB2), byName(ctx, formation.QB), ...byPos(ctx, offense, "RB"), ...byPos(ctx, offense, "HB"), ...byPos(ctx, offense, "WR")].filter(Boolean) as Record<string, unknown>[])) : (byName(ctx, routeNames[0]) ?? choose([...routeNames.map((name) => byName(ctx, name)).filter(Boolean) as Record<string, unknown>[], ...byPos(ctx, offense, "WR"), ...byPos(ctx, offense, "TE"), ...byPos(ctx, offense, "RB")]));
  const tackler = choose([...byPos(ctx, defense, "LB"), ...byPos(ctx, defense, "CB"), ...byPos(ctx, defense, "S"), ...teamPlayers(ctx, defense)]);
  const off = kind === "Run" ? average(trait(carrier, "vision"), trait(carrier, "speed")) : average(average(trait(qb, "accuracy"), trait(qb, "readDefense")), average(trait(carrier, "routeRunning"), trait(carrier, "hands")));
  const def = average(trait(tackler, "tackling"), kind === "Run" ? trait(tackler, "runDef") : trait(tackler, "coverage"));
  const roll = randomInt(1, 100) + Math.round((off - def) / 8);
  const complete = kind === "Run" || roll > 36;
  const sack = kind === "Pass" && roll <= 12;
  const yards = sack ? -randomInt(1, 9) : complete ? Math.max(-3, Math.round((roll - 45) / 7) + randomInt(0, kind === "Run" ? 5 : 9)) : 0;
  const next = nextDownDistance(game, yards); const clock = advanceQuarter(game, clockUse(kind, options));
  const scoringSide = game.Possession; let homeScore = n(game.HomeScore), awayScore = n(game.AwayScore);
  if (next.touchdown) {
    if (scoringSide === "Home") homeScore += 6;
    else awayScore += 6;
  }
  const possession = next.touchdown || next.turnover ? switchPoss(game) : game.Possession;
  const updated: LeagueGame = { ...game, HomeScore: homeScore, AwayScore: awayScore, Qtr: clock.qtr, Time: clock.time, Down: next.down, Distance: next.distance, BallOn: next.ballOn, Possession: possession };
  const player = playerName(kind === "Run" ? carrier : qb, `${offense} Player`); const receiver = kind === "Pass" ? playerName(carrier, "Receiver") : "";
  const result = next.touchdown ? "Touchdown" : next.turnover ? "Turnover on downs" : sack ? "Sack" : kind === "Pass" && !complete ? "Incomplete" : `${yards} yard ${kind.toLowerCase()}`;
  return buildResult(game, updated, kind, player, receiver, yards, playerName(tackler, "Tackler"), `${result}${kind === "Pass" && options.routes?.[receiver] ? ` (${options.routes[receiver]} route)` : ""}`, ctx.historyLength);
}
export function punt(game: LeagueGame, ctx: EngineContext) {
  const yards = randomInt(35, 55); const ball = Math.max(1, 100 - Math.min(99, n(game.BallOn) + yards)); const clock = advanceQuarter(game, randomInt(8, 14));
  const updated = { ...game, Qtr: clock.qtr, Time: clock.time, Down: 1, Distance: 10, BallOn: ball, Possession: switchPoss(game) };
  return buildResult(game, updated, "Punt", game.Possession, "", yards, "", `Punt ${yards} yards`, ctx.historyLength);
}
export function kickFG(game: LeagueGame, ctx: EngineContext) {
  const dist = 17 + (100 - n(game.BallOn)); const made = randomInt(1,100) <= Math.max(20, 98 - Math.max(0, dist - 25) * 2); let hs=n(game.HomeScore), as=n(game.AwayScore); if (made) { if (game.Possession === "Home") hs += 3; else as += 3; }
  const clock = advanceQuarter(game, randomInt(5, 8)); const updated = { ...game, HomeScore: hs, AwayScore: as, Qtr: clock.qtr, Time: clock.time, Down: 1, Distance: 10, BallOn: 25, Possession: switchPoss(game) };
  return buildResult(game, updated, "Field Goal", game.Possession, "", made ? 0 : 0, "", `${dist}-yard field goal ${made ? "good" : "missed"}`, ctx.historyLength);
}
export function goForTwo(game: LeagueGame, ctx: EngineContext) { const made = randomInt(1,100) <= 47; let hs=n(game.HomeScore), as=n(game.AwayScore); if (made) { if (game.Possession === "Home") hs += 2; else as += 2; } const updated={...game, HomeScore:hs, AwayScore:as, Down:1, Distance:10, BallOn:25, Possession:switchPoss(game)}; return buildResult(game, updated, "Two Point", game.Possession, "", made ? 2 : 0, "", `Two-point conversion ${made ? "good" : "failed"}`, ctx.historyLength); }
export function handleTimeout(game: LeagueGame, ctx: EngineContext) { const key = game.Possession === "Home" ? "HomeTimeouts" : "AwayTimeouts"; const current = Number((game as unknown as Record<string, unknown>)[key] ?? 3); const updated = { ...game, [key]: Math.max(0, current - 1) }; return buildResult(game, updated, "Timeout", game.Possession, "", 0, "", `${game.Possession} timeout`, ctx.historyLength); }
export function spikeBall(game: LeagueGame, ctx: EngineContext) { const clock = advanceQuarter(game, 1); const updated = { ...game, Qtr: clock.qtr, Time: clock.time, Down: Math.min(4, n(game.Down) + 1), Distance: game.Distance }; return buildResult(game, updated, "Spike", game.Possession, "", 0, "", "Spike ball", ctx.historyLength); }
export function kneel(game: LeagueGame, ctx: EngineContext, options: PlayCallOptions = {}) { const clock = advanceQuarter(game, options.clockMode === "Hurry Up" ? 5 : 40); const next = nextDownDistance(game, -1); const updated = { ...game, Qtr: clock.qtr, Time: clock.time, Down: next.down, Distance: next.distance, BallOn: next.ballOn, Possession: next.turnover ? switchPoss(game) : game.Possession }; return buildResult(game, updated, "Kneel", game.Possession, "", -1, "", "QB kneel", ctx.historyLength); }
function buildResult(prev: LeagueGame, game: LeagueGame, playtype: PlayKind, player: string, receiver: string, yards: number, tackler: string, result: string, historyLength: number) {
  const play = { gameid: prev.GameId, playid: `${prev.GameId}-${Date.now()}-${historyLength + 1}`, time: parseTimeToSeconds(prev.Time), qtr: prev.Qtr, possession: prev.Possession, down: prev.Down, distance: prev.Distance, ballon: prev.BallOn, playtype, player, receiver, yards, defensepredicted: "Run", predictioncorrect: playtype === "Run", tackler, result, defenseresult: "", turnover: result.includes("Turnover") ? "Yes" : "", description: result, recoveredby: "", airyards: playtype === "Pass" ? yards : 0, newdown: game.Down, newdist: game.Distance, newballon: game.BallOn, drivestart: (prev as unknown as Record<string, unknown>).DriveStart ?? 25, homescore: game.HomeScore, awayscore: game.AwayScore };
  return { game, play, text: `${playtype}: ${result}` };
}
