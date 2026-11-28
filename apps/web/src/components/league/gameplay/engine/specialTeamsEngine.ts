import { finishConversion } from "./conversions";
import { logPlayToDB } from "./playLogger";
import type { LeagueGame } from "../../types";
import type { EngineContext, PlayCallOptions } from "./types";
import {
  advanceQuarter,
  applyHalftimeRules,
  kickoffSpot,
  n,
  nextDownDistance,
  randomInt,
  switchPoss,
} from "./utils";
import { buildResult } from "./playLogger";

/** These simplified plays do not currently run either turnover check. */
function logSkippedTurnoverChecks(game: LeagueGame, reason: string) {
  for (const check of ["Interception", "Fumble"])
    console.log(`[${check}] Checks skipped`, {
      gameId: game.GameId,
      checked: false,
      roll: null,
      reason,
    });
}

export function punt(game: LeagueGame, ctx: EngineContext) {
  logSkippedTurnoverChecks(game, "punt");
  const yards = 40;
  const ball = Math.max(
    1,
    Math.min(
      99,
      game.Possession === "Home"
        ? n(game.BallOn) + yards
        : n(game.BallOn) - yards,
    ),
  );
  const possession = switchPoss(game);
  const clock = advanceQuarter(game, randomInt(5, 8));
  const updated = applyHalftimeRules(game, {
    ...game,
    Qtr: clock.qtr,
    Time: clock.time,
    Down: 1,
    Distance: 10,
    BallOn: ball,
    Previous: game.BallOn,
    DriveStart: ball,
    Possession: possession,
  });
  return buildResult(
    game,
    updated,
    "Punt",
    game.Possession,
    "",
    yards,
    "",
    "Punt",
    ctx.historyLength,
  );
}
export function kickFG(game: LeagueGame, ctx: EngineContext) {
  if (game.PendingConversion) return kickExtraPoint(game, ctx);
  logSkippedTurnoverChecks(game, "field-goal-or-extra-point");
  const pendingFGTeam = (game as unknown as Record<string, unknown>)
    .pendingFGTeam as string | undefined;
  const isXp = Boolean(pendingFGTeam);
  const scoring = pendingFGTeam || game.Possession;
  const inRange =
    isXp ||
    (game.Possession === "Home" ? n(game.BallOn) >= 65 : n(game.BallOn) <= 35);
  let hs = n(game.HomeScore),
    as = n(game.AwayScore);
  if (inRange) {
    if (scoring === "Home") hs += isXp ? 1 : 3;
    else as += isXp ? 1 : 3;
  }
  const possession = switchPoss(game);
  const clock = advanceQuarter(game, randomInt(3, 8));
  const spot = kickoffSpot(possession);
  const updated = applyHalftimeRules(game, {
    ...game,
    HomeScore: hs,
    AwayScore: as,
    Qtr: clock.qtr,
    Time: clock.time,
    Down: 1,
    Distance: 10,
    BallOn: spot,
    Previous: game.BallOn,
    DriveStart: spot,
    Possession: possession,
    pendingFGTeam: undefined,
  });
  return buildResult(
    game,
    updated,
    "Field Goal",
    scoring,
    "",
    0,
    "",
    isXp ? "Kick XP" : inRange ? "Kick FG" : "Missed FG",
    ctx.historyLength,
  );
}
/** A guaranteed PAT is an untimed conversion event, not a field goal. */
export function kickExtraPoint(game: LeagueGame, ctx: EngineContext) {
  if (!game.PendingConversion)
    throw new Error("No touchdown is awaiting a try.");
  const scoring = game.PendingConversion.team;
  const kicker = ctx.players.find(
    (p) =>
      String(p.team ?? p.Team) ===
        (scoring === "Home" ? game.Home : game.Away) &&
      String(p.position ?? p.Pos).toUpperCase() === "K",
  );
  const name = String(kicker?.name ?? kicker?.Name ?? "");
  const updated = finishConversion(
    {
      ...game,
      PendingConversion: { ...game.PendingConversion, choice: "choose" },
    },
    true,
  );
  const play = logPlayToDB(
    game,
    updated,
    "Extra Point",
    name,
    "",
    0,
    "",
    "Kick XP",
    ctx.historyLength,
    {
      isConversion: true,
      conversionType: "xp",
      touchdownPlayId: game.PendingConversion.touchdownPlayId,
      time: "xp",
      qtr: game.PendingConversion.quarter ?? game.Qtr,
      playLength: 0,
      down: null,
      distance: null,
      isComplete: false,
    },
  );
  return { game: updated, play, text: `${name || "Team"} PAT is GOOD` };
}
/** Selecting a two-point try enables the normal single-snap run/pass controls. */
export function goForTwo(game: LeagueGame, _ctx: EngineContext) {
  void _ctx;
  if (!game.PendingConversion)
    throw new Error("No touchdown is awaiting a try.");
  return {
    ...game,
    BallOn: game.PendingConversion.team === "Home" ? 98 : 2,
    Down: 1,
    Distance: 2,
    PendingConversion: { ...game.PendingConversion, choice: "two" as const },
  };
}
export function handleTimeout(game: LeagueGame, ctx: EngineContext) {
  logSkippedTurnoverChecks(game, "timeout");
  const key = game.Possession === "Home" ? "HomeTimeouts" : "AwayTimeouts";
  const current = Number(
    (game as unknown as Record<string, unknown>)[key] ?? 3,
  );
  const updated = { ...game, [key]: Math.max(0, current - 1) };
  return buildResult(
    game,
    updated,
    "Timeout",
    game.Possession,
    "",
    0,
    "",
    "Timeout",
    ctx.historyLength,
  );
}
export function spikeBall(game: LeagueGame, ctx: EngineContext) {
  logSkippedTurnoverChecks(game, "spike");
  const clock = advanceQuarter(game, 1);
  const next = nextDownDistance(game, 0);
  const updated = applyHalftimeRules(game, {
    ...game,
    Qtr: clock.qtr,
    Time: clock.time,
    Down: next.down,
    Distance: next.distance,
    Possession: next.turnover ? switchPoss(game) : game.Possession,
  });
  return buildResult(
    game,
    updated,
    "Spike",
    game.Possession,
    "",
    0,
    "",
    next.turnover ? "TO on Downs" : "Incomplete",
    ctx.historyLength,
  );
}
export function kneel(
  game: LeagueGame,
  ctx: EngineContext,
  options: PlayCallOptions = {},
) {
  logSkippedTurnoverChecks(game, "kneel");
  void options;
  const clock = advanceQuarter(game, 40);
  const ball =
    game.Possession === "Home" ? n(game.BallOn) - 1 : n(game.BallOn) + 1;
  const next = nextDownDistance(game, -1, ball);
  const updated = applyHalftimeRules(game, {
    ...game,
    HomeScore:
      n(game.HomeScore) + (next.safety && game.Possession === "Away" ? 2 : 0),
    AwayScore:
      n(game.AwayScore) + (next.safety && game.Possession === "Home" ? 2 : 0),
    Qtr: clock.qtr,
    Time: clock.time,
    Down: next.down,
    Distance: next.distance,
    BallOn: next.ballOn,
    Possession: next.turnover ? switchPoss(game) : game.Possession,
  });
  return buildResult(
    game,
    updated,
    "Kneel",
    game.Possession,
    "",
    -1,
    "",
    next.safety ? "Safety" : next.turnover ? "TO on Downs" : "Kneel",
    ctx.historyLength,
  );
}
