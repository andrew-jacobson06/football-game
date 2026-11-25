import type { LeagueGame } from "./types";
import { needsOvertimeToss, overtimeState, prepareOvertime } from "./overtime";

/** Game lifecycle is independent of numbered weeks and named playoff rounds. */
export function isPregame(game: Pick<LeagueGame, "Qtr">) {
  const quarter = String(game.Qtr ?? "").trim().toUpperCase().replace(/[\s_-]/g, "");
  return ["", "0", "UNSTARTED", "PREGAME", "NOTSTARTED"].includes(quarter);
}
export type TossSide = "Heads" | "Tails";
export type TossChoice = "receive" | "kick";

/** Build the same opening situation for every game, preserving its ID, teams and round. */
export function gameAfterToss(game: LeagueGame, call: TossSide, result: TossSide, choice: TossChoice) {
  const winner = call === result ? "Home" : "Away";
  const receivingTeam: "Home" | "Away" = choice === "receive" ? winner : winner === "Home" ? "Away" : "Home";
  const ballOn = receivingTeam === "Home" ? 25 : 75;
  const overtime = needsOvertimeToss(game);
  const prepared = overtime && overtimeState(game)?.phase !== "toss" ? prepareOvertime(game) : game;
  const state = overtimeState(prepared);
  return {
    ...prepared,
    HomeScore: overtime ? Number(game.HomeScore) : 0,
    AwayScore: overtime ? Number(game.AwayScore) : 0,
    Qtr: overtime ? 4 + state!.period : 1,
    Overtime: overtime ? { ...state!, phase: "playing" as const, firstPossession: receivingTeam, completed: [] } : undefined,
    Time: 900,
    Down: 1,
    Distance: 10,
    BallOn: ballOn,
    Possession: receivingTeam,
    OpeningPossession: overtime ? game.OpeningPossession : receivingTeam,
    DriveStart: ballOn,
    Previous: ballOn,
    HomeTimeouts: 3,
    AwayTimeouts: 3,
  };
}
