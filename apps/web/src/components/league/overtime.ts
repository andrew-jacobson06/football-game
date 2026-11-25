import type { LeagueGame } from "./types.js";
import { PLAYOFF_ROUNDS, parseSeasonWeek } from "./seasonWeeks.js";
export type OvertimeState = {
  period: number;
  phase: "toss" | "playing" | "final";
  completed: Array<"Home" | "Away">;
  firstPossession?: "Home" | "Away";
};
export function overtimeState(game: Pick<LeagueGame, "Overtime">): OvertimeState | undefined {
  let value: unknown = game.Overtime;
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { return undefined; } }
  if (!value || typeof value !== "object") return undefined;
  const state = value as OvertimeState;
  if (!Number.isInteger(state.period) || state.period < 1 || !["toss", "playing", "final"].includes(state.phase) || !Array.isArray(state.completed) || state.completed.some(side=>side!=="Home"&&side!=="Away") || new Set(state.completed).size !== state.completed.length || (state.firstPossession !== undefined && state.firstPossession !== "Home" && state.firstPossession !== "Away")) return undefined;
  return state;
}
const tied = (game: LeagueGame) => Number(game.HomeScore) === Number(game.AwayScore);
const final = (game: LeagueGame) => /^(FINAL|F)$/i.test(String(game.Qtr).trim());
export function needsOvertimeToss(game: LeagueGame) {
  const state = overtimeState(game);
  return state?.phase === "toss" || (!state && final(game) && tied(game));
}
export function prepareOvertime(game: LeagueGame, period = (overtimeState(game)?.period ?? 0) + 1): LeagueGame {
  return { ...game, Qtr: 4 + period, Time: 900, Overtime: { period, phase: "toss", completed: [] } };
}
/** One gate for every run, pass and special-teams result, after scores and possession resolve. */
export function resolveOvertime(previous: LeagueGame, updated: LeagueGame, result: string): LeagueGame {
  const state = overtimeState(previous);
  if (!state) return final(updated) && tied(updated) ? prepareOvertime(updated) : updated;
  if (state.phase !== "playing") return updated;
  const completed = [...state.completed];
  if (updated.Possession !== previous.Possession && (previous.Possession === "Home" || previous.Possession === "Away") && !completed.includes(previous.Possession)) completed.push(previous.Possession);
  const next = { ...state, completed };
  const homeChange = Number(updated.HomeScore) - Number(previous.HomeScore);
  const awayChange = Number(updated.AwayScore) - Number(previous.AwayScore);
  const touchdown = result === "Touchdown" || homeChange >= 6 || awayChange >= 6;
  const safety = result === "Safety" && !tied(updated);
  // Once both initial possessions have ended, any lead settles the game.
  if (touchdown || safety || (completed.length === 2 && !tied(updated))) {
    return { ...updated, Qtr: "FINAL", Overtime: { ...next, phase: "final" } };
  }
  if (final(updated)) {
    // Clock expiration ends the period, including an opening-drive FG at 0:00.
    if (tied(updated) && PLAYOFF_ROUNDS.includes(parseSeasonWeek(updated.Week) as typeof PLAYOFF_ROUNDS[number])) return prepareOvertime({ ...updated, Overtime: next }, state.period + 1);
    return { ...updated, Qtr: "FINAL", Overtime: { ...next, phase: "final" } };
  }
  return { ...updated, Overtime: next };
}
