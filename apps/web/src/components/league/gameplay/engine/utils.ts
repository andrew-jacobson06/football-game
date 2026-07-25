import type { LeagueGame } from "../../types";
import { parseTimeToSeconds } from "../../leagueMappers";
import type { ClockMode, EngineContext, PlayerTrait } from "./types";
import { applyFatigueToTrait } from "./fatigueEngine";

export const n = (v: unknown) => Number(v) || 0;
export const str = (v: unknown) => String(v ?? "");
export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
export function choose<T>(items: T[]) {
  return items[Math.max(0, randomInt(0, items.length - 1))];
}
export function weightedChoose<T>(items: T[], weight: (item: T) => number) {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (!items.length) return undefined;
  if (total <= 0) return choose(items);
  let roll = Math.random() * total;
  return (
    items.find((item) => {
      roll -= Math.max(0, weight(item));
      return roll <= 0;
    }) ?? items[items.length - 1]
  );
}
export function playerName(p: PlayerTrait | undefined, fallback = "") {
  return str(p?.name ?? p?.Name ?? fallback);
}
export function trait(p: PlayerTrait | undefined, key: string, fallback = 50) {
  const value =
    Number(p?.[key] ?? p?.[key[0].toUpperCase() + key.slice(1)]) || fallback;
  return applyFatigueToTrait(p, key, value);
}
export function teamPlayers(ctx: EngineContext, team: string) {
  return ctx.players.filter((p) => str(p.team ?? p.Team) === team);
}
export function byName(ctx: EngineContext, name?: string) {
  return ctx.players.find((p) => playerName(p) === name);
}
export function byPosition(ctx: EngineContext, team: string, pos: string) {
  return teamPlayers(ctx, team).filter((p) =>
    str(p.position ?? p.Pos)
      .toUpperCase()
      .includes(pos),
  );
}
export function offenseTeam(game: LeagueGame) {
  return game.Possession === "Home" ? game.Home : game.Away;
}
export function defenseTeam(game: LeagueGame) {
  return game.Possession === "Home" ? game.Away : game.Home;
}
export function switchPoss(game: LeagueGame) {
  return game.Possession === "Home" ? "Away" : "Home";
}
export function direction(game: LeagueGame) {
  return game.Possession === "Home" ? 1 : -1;
}
export function advanceBall(game: LeagueGame, yards: number) {
  return clamp(n(game.BallOn) + direction(game) * yards, 0, 100);
}
export function isTouchdown(game: LeagueGame, ballOn: number) {
  return game.Possession === "Home" ? ballOn >= 100 : ballOn <= 0;
}
export function isSafety(game: LeagueGame, ballOn: number) {
  return game.Possession === "Home" ? ballOn <= 0 : ballOn >= 100;
}
export function kickoffSpot(possession: string) {
  return possession === "Home" ? 25 : 75;
}
export function advanceQuarter(game: LeagueGame, secondsUsed: number) {
  const left = Math.max(0, parseTimeToSeconds(game.Time) - secondsUsed);
  let qtr: string | number = game.Qtr;
  let time: string | number = left;
  if (left === 0 && Number(game.Qtr) < 4) {
    qtr = Number(game.Qtr) + 1;
    time = 15 * 60;
  } else if (left === 0 && Number(game.Qtr) >= 4) qtr = "FINAL";
  return { qtr, time };
}
export function clockRunoff(
  mode: ClockMode = "Normal",
  base = randomInt(4, 12),
  clockStops = false,
) {
  if (clockStops) return base;
  if (mode === "Hurry Up") return base + randomInt(4, 8);
  if (mode === "Chew Clock") return base + randomInt(36, 40);
  return base + randomInt(24, 38);
}
export function nextDownDistance(
  game: LeagueGame,
  yards: number,
  newBallOn = advanceBall(game, yards),
) {
  const down = n(game.Down);
  const distance = n(game.Distance);
  if (isTouchdown(game, newBallOn))
    return {
      down: 1,
      distance: 10,
      ballOn: kickoffSpot(switchPoss(game)),
      touchdown: true,
      turnover: false,
    };
  if (isSafety(game, newBallOn))
    return {
      down: 1,
      distance: 10,
      ballOn: kickoffSpot(switchPoss(game)),
      touchdown: false,
      turnover: true,
      safety: true,
    };
  if (yards >= distance)
    return {
      down: 1,
      distance: Math.min(
        10,
        game.Possession === "Home" ? 100 - newBallOn : newBallOn,
      ),
      ballOn: newBallOn,
      touchdown: false,
      turnover: false,
    };
  if (down >= 4)
    return {
      down: 1,
      distance: 10,
      ballOn: newBallOn,
      touchdown: false,
      turnover: true,
    };
  return {
    down: down + 1,
    distance: distance - yards,
    ballOn: newBallOn,
    touchdown: false,
    turnover: false,
  };
}
