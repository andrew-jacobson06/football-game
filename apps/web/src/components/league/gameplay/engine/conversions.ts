import type { LeagueGame } from "../../types";
import { overtimeState, resolveOvertime } from "../../overtime";

export function queueTouchdownTry(
  previous: LeagueGame,
  updated: LeagueGame,
): LeagueGame {
  const tied = Number(updated.HomeScore) === Number(updated.AwayScore);
  const resolved = overtimeState(previous)
    ? resolveOvertime(previous, updated, "Touchdown")
    : updated;
  if (/^(FINAL|F)$/i.test(String(resolved.Qtr)) && !tied) return resolved;
  const side =
    Number(updated.HomeScore) > Number(previous.HomeScore) ? "Home" : "Away";
  const { PendingConversion: _pending, ...resume } = resolved;
  void _pending;
  return {
    ...resolved,
    Qtr: /^(FINAL|F)$/i.test(String(resolved.Qtr))
      ? previous.Qtr
      : resolved.Qtr,
    Possession: side,
    BallOn: side === "Home" ? 100 : 0,
    Down: 1,
    Distance: 2,
    PendingConversion: {
      team: side,
      quarter: previous.Qtr,
      choice: "choose",
      resume,
    },
  };
}
export function finishConversion(
  previous: LeagueGame,
  good: boolean,
): LeagueGame {
  const pending = previous.PendingConversion;
  if (!pending) throw new Error("There is no pending conversion.");
  const updated: LeagueGame = {
    ...pending.resume,
    HomeScore:
      Number(previous.HomeScore) +
      (good && pending.team === "Home"
        ? pending.choice === "two"
          ? 2
          : 1
        : 0),
    AwayScore:
      Number(previous.AwayScore) +
      (good && pending.team === "Away"
        ? pending.choice === "two"
          ? 2
          : 1
        : 0),
    PendingConversion: null,
  };
  return resolveOvertime(previous, updated, "Conversion");
}
