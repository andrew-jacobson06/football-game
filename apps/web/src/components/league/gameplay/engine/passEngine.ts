import type { LeagueGame } from "../../types";
import type { EngineContext, PlayCallOptions } from "./types";
import {
  advanceBall,
  advanceQuarter,
  byName,
  byPosition,
  choose,
  clockRunoff,
  defenseTeam,
  isSafety,
  isTouchdown,
  n,
  nextDownDistance,
  offenseTeam,
  playerName,
  switchPoss,
  teamPlayers,
  trait,
  weightedChoose,
} from "./utils";
import { buildResult } from "./playLogger";
import { checkForFumble, determineTackler } from "./runEngine";

export function determineTimeToThrow(
  game: LeagueGame,
  ctx: EngineContext,
  options: PlayCallOptions = {},
) {
  const defense = defenseTeam(game);
  const formation = options.formation ?? {};
  const rush = teamPlayers(ctx, defense)
    .filter((p) => ["DL", "LB"].includes(String(p.defPos ?? "").toUpperCase()))
    .reduce((s, p) => s + trait(p, "passRush") + trait(p, "defStars") / 2, 0);
  const protectors = [
    formation.RB1,
    formation.RB2,
    formation.TEOL1,
    formation.TEOL2,
    formation.TEOL3,
    formation.TEOL4,
    formation.TEOL5,
  ]
    .map((name) => byName(ctx, name))
    .filter(Boolean);
  const protection = protectors.reduce(
    (s, p) => s + trait(p, "passProtect") + trait(p, "offStars") / 2,
    0,
  );
  const diff = protection - rush + (Math.random() * 80 - 40);
  if (diff < -80) return -1;
  if (diff < -45) return 0;
  if (diff < -20) return 1;
  if (diff < 10) return 2;
  if (diff < 35) return 3;
  if (diff < 60) return 4;
  return 5;
}
export function handleSack(
  game: LeagueGame,
  ctx: EngineContext,
  qbName: string,
  options: PlayCallOptions = {},
) {
  const rushers = teamPlayers(ctx, defenseTeam(game)).filter((p) =>
    ["DL", "LB"].includes(String(p.defPos ?? "").toUpperCase()),
  );
  const sacker = weightedChoose(rushers, (p) => trait(p, "sackChance"));
  const loss = Math.max(
    1,
    Math.floor(Math.random() * 9) +
      1 -
      (Math.random() * 100 < trait(byName(ctx, qbName), "juke") ? 2 : 0),
  );
  const yards = -loss;
  const newBall = advanceBall(game, yards);
  const safety = isSafety(game, newBall);
  const fumble = checkForFumble(ctx, qbName, playerName(sacker, "NA"));
  const next = nextDownDistance(game, yards, newBall);
  let hs = n(game.HomeScore),
    as = n(game.AwayScore);
  if (safety) {
    if (game.Possession === "Home") as += 2;
    else hs += 2;
  }
  const result = safety
    ? "Safety"
    : fumble.fumble
      ? "Fumble"
      : next.turnover
        ? "TO on Downs"
        : "Sack";
  const clock = advanceQuarter(
    game,
    clockRunoff(
      options.clockMode,
      6,
      ["Safety", "Fumble", "TO on Downs"].includes(result),
    ),
  );
  const updated = {
    ...game,
    HomeScore: hs,
    AwayScore: as,
    Qtr: clock.qtr,
    Time: clock.time,
    Down: next.down,
    Distance: next.distance,
    BallOn: next.ballOn,
    Previous: game.BallOn,
    Possession:
      safety ||
      next.turnover ||
      (fumble.fumble && fumble.recoveredBy !== qbName)
        ? switchPoss(game)
        : game.Possession,
  };
  return buildResult(
    game,
    updated,
    "Pass",
    qbName,
    "",
    yards,
    playerName(sacker, "NA"),
    result,
    ctx.historyLength,
    { airyards: 0, recoveredby: fumble.recoveredBy },
  );
}
export function assignRoutes(
  game: LeagueGame,
  ctx: EngineContext,
  options: PlayCallOptions = {},
) {
  const offense = offenseTeam(game),
    routes = options.routes ?? {};
  const names = Object.keys(routes).length
    ? Object.keys(routes)
    : [
        ...byPosition(ctx, offense, "WR"),
        ...byPosition(ctx, offense, "RB"),
        ...byPosition(ctx, offense, "TE"),
      ].map((p) => playerName(p));
  return names
    .filter((name) => routes[name] !== "No Route")
    .map((name, i) => ({
      player: name,
      routeType: routes[name] || "Go",
      airYards:
        routes[name] === "Screen"
          ? 0
          : routes[name] === "Slant"
            ? 5
            : routes[name] === "Post"
              ? 14
              : 8,
      TTO: routes[name] === "Go" ? 4 : 2,
      defender: teamPlayers(ctx, defenseTeam(game))[i]?.name as
        string | undefined,
      position: i,
    }));
}
export function determineSeparation(
  ctx: EngineContext,
  routes: ReturnType<typeof assignRoutes>,
  timeToThrow: number,
) {
  return routes.map((route) => {
    const rec = byName(ctx, route.player),
      def = byName(ctx, route.defender);
    let separation = 0;
    if (route.airYards > 10)
      separation +=
        trait(rec, "speed") + trait(rec, "acceleration") >
        trait(def, "speed") + trait(def, "acceleration")
          ? 1
          : -1;
    for (let i = 0; i < 3; i++)
      if (Math.random() * 100 < trait(rec, "routeRunning")) separation++;
    for (let i = 0; i < 2; i++)
      if (Math.random() * 100 < trait(def, "coverage")) separation--;
    separation += Math.max(-2, Math.min(0, timeToThrow - route.TTO));
    return { ...route, separation };
  });
}
export function choosePassTarget(
  ctx: EngineContext,
  qbName: string,
  routes: ReturnType<typeof determineSeparation>,
  options: PlayCallOptions = {},
) {
  const qb = byName(ctx, qbName);
  const readOk = Math.random() * 100 < trait(qb, "readDefense");
  return weightedChoose(routes, (r) => {
    const read = options.reads?.[r.player] ?? "";
    const readVal =
      read === "Primary"
        ? 5
        : read === "2nd"
          ? 4
          : read === "3rd"
            ? 3
            : read === "4th"
              ? 2
              : read === "Checkdown"
                ? 1
                : 0;
    return Math.max(
      1,
      10 - r.airYards / 3 + readVal + (readOk ? r.separation * 3 : 0),
    );
  });
}
export function determineCompletionPct(
  ctx: EngineContext,
  qbName: string,
  target: NonNullable<ReturnType<typeof choosePassTarget>>,
) {
  const qb = byName(ctx, qbName),
    rec = byName(ctx, target.player),
    def = byName(ctx, target.defender);
  let pct =
    72 -
    target.airYards * 1.7 +
    (trait(qb, "accuracy") - 50) / 2 +
    target.separation * 8 +
    (trait(rec, "hands") - 50) / 3 -
    trait(def, "defStars", 0) / 8;
  if (target.airYards > 20 && Math.random() * 100 < trait(qb, "armStrength"))
    pct += 8;
  if (Math.random() * 100 < trait(rec, "offStars")) pct += 5;
  return { pct: Math.max(5, Math.min(95, pct)), log: [] as string[] };
}
export function calcYAC(
  ctx: EngineContext,
  playerNameArg: string,
  separation: number,
) {
  const p = byName(ctx, playerNameArg);
  let yac = Math.max(
    -2,
    Math.floor(Math.random() * (separation >= 2 ? 12 : 5)) -
      (separation < 0 ? 2 : 0),
  );
  if (Math.random() * 100 < trait(p, "acceleration")) yac += 2;
  if (yac < 0 && Math.random() * 100 < trait(p, "strength")) yac = 0;
  if (yac >= 8 && Math.random() * 100 < trait(p, "speed")) yac += 6;
  if (Math.random() * 100 < trait(p, "juke")) yac += 1;
  return yac;
}
export function determinePassOutcome(
  ctx: EngineContext,
  qbName: string,
  target: NonNullable<ReturnType<typeof choosePassTarget>>,
  completionPct: number,
) {
  const completionRoll = Math.random() * 100;
  if (completionRoll <= completionPct)
    return {
      completed: true,
      intercepted: false,
      yards: target.airYards + calcYAC(ctx, target.player, target.separation),
      airYards: target.airYards,
      caughtBy: target.player,
      completionRoll,
    };
  const qb = byName(ctx, qbName),
    def = byName(ctx, target.defender);
  const intChance = Math.max(
    1,
    (trait(def, "ballHawk") +
      trait(def, "readQB") -
      trait(qb, "accuracy") -
      trait(qb, "readDefense")) /
      8,
  );
  if (Math.random() * 100 < intChance)
    return {
      completed: false,
      intercepted: true,
      yards: calcYAC(ctx, target.defender || "", target.separation),
      airYards: target.airYards,
      caughtBy: target.defender || "Defense",
      completionRoll,
    };
  return {
    completed: false,
    intercepted: false,
    yards: 0,
    airYards: target.airYards,
    completionRoll,
  };
}
export function passPlay(
  game: LeagueGame,
  ctx: EngineContext,
  options: PlayCallOptions = {},
) {
  const qb =
    byName(ctx, options.formation?.QB) ??
    choose(byPosition(ctx, offenseTeam(game), "QB"));
  const qbName = playerName(qb, `${offenseTeam(game)} QB`);
  const ttt = determineTimeToThrow(game, ctx, options);
  if (ttt < 0) return handleSack(game, ctx, qbName, options);
  const target = choosePassTarget(
    ctx,
    qbName,
    determineSeparation(ctx, assignRoutes(game, ctx, options), ttt),
    options,
  );
  if (!target) return handleSack(game, ctx, qbName, options);
  const pct = determineCompletionPct(ctx, qbName, target).pct;
  const outcome = determinePassOutcome(ctx, qbName, target, pct);
  const rawYards = outcome.intercepted ? 0 : outcome.yards;
  const newBall = advanceBall(game, rawYards);
  const td = outcome.completed && isTouchdown(game, newBall);
  const safety = outcome.completed && isSafety(game, newBall);
  const tackler =
    outcome.completed && !td
      ? determineTackler(ctx, defenseTeam(game), rawYards)
      : outcome.intercepted
        ? String(outcome.caughtBy ?? "Defense")
        : "NA";
  const next = nextDownDistance(game, rawYards, newBall);
  const result = outcome.intercepted
    ? "Interception"
    : !outcome.completed
      ? "Incomplete"
      : td
        ? "Touchdown"
        : safety
          ? "Safety"
          : next.turnover
            ? "TO on Downs"
            : rawYards >= n(game.Distance)
              ? "First Down"
              : "Normal";
  let hs = n(game.HomeScore),
    as = n(game.AwayScore);
  if (td) {
    if (game.Possession === "Home") hs += 6;
    else as += 6;
  }
  if (safety) {
    if (game.Possession === "Home") as += 2;
    else hs += 2;
  }
  const possession =
    td || safety || next.turnover || outcome.intercepted
      ? switchPoss(game)
      : game.Possession;
  const clock = advanceQuarter(
    game,
    clockRunoff(
      options.clockMode,
      5,
      [
        "Touchdown",
        "Safety",
        "TO on Downs",
        "Interception",
        "Incomplete",
      ].includes(result),
    ),
  );
  const updated = {
    ...game,
    HomeScore: hs,
    AwayScore: as,
    Qtr: clock.qtr,
    Time: clock.time,
    Down: result === "Incomplete" ? Math.min(4, n(game.Down) + 1) : next.down,
    Distance: result === "Incomplete" ? game.Distance : next.distance,
    BallOn: result === "Incomplete" ? game.BallOn : next.ballOn,
    Previous: game.BallOn,
    Possession: possession,
  };
  return buildResult(
    game,
    updated,
    "Pass",
    qbName,
    target.player,
    rawYards,
    tackler,
    result,
    ctx.historyLength,
    {
      airyards: outcome.airYards,
      recoveredby: outcome.intercepted
        ? String(outcome.caughtBy ?? "Defense")
        : "",
    },
  );
}
