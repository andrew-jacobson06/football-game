import type { LeagueGame } from "../../types";
import type {
  EngineContext,
  FormationSlot,
  PassBlitzGap,
  PassBlitzResult,
  PassPlayState,
  PlayCallOptions,
  PlayerTrait,
} from "./types";
import {
  advanceBall,
  applyHalftimeRules,
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

/**
 * Creates the shared state carried through the pass-play pipeline. The fields
 * are deliberately small placeholders so each phase can be implemented without
 * changing the snap entry point or the phases that follow it.
 */
export function createPassPlayState(qb: string): PassPlayState {
  return {
    qb,
    phases: [],
    log: [],
    blitz: false,
    pressure: [],
    instantPressure: false,
    pocketFormed: false,
    baseTimeToThrow: null,
    finalTimeToThrow: null,
    routes: [],
    opennessTrajectory: [],
    decision: "pending",
  };
}

const PASS_BLITZ_GAPS: Array<{
  gap: PassBlitzGap;
  blockers: FormationSlot[];
}> = [
  { gap: "outside-left", blockers: ["LT"] },
  { gap: "LT-LG", blockers: ["LT", "LG"] },
  { gap: "LG-C", blockers: ["LG", "C"] },
  { gap: "C-RG", blockers: ["C", "RG"] },
  { gap: "RG-RT", blockers: ["RG", "RT"] },
  { gap: "outside-right", blockers: ["RT"] },
];

export function passBlitzSelectionWeight(linebacker: PlayerTrait) {
  return (trait(linebacker, "passRush") / 2) ** 2;
}

export function passBlitzInstantSackChance(
  linebacker: PlayerTrait,
  quarterback: PlayerTrait,
) {
  const linebackerValue =
    (trait(linebacker, "passRush") + trait(linebacker, "tackling")) / 2 +
    trait(linebacker, "defStars") ** 2 / 2;
  const quarterbackValue =
    (trait(quarterback, "readDefense") +
      trait(quarterback, "juke") * 2 +
      trait(quarterback, "poise")) /
    4 /
    2;
  return quarterbackValue > 0 ? linebackerValue / quarterbackValue : 0;
}

function linemanPickupScore(player: PlayerTrait | undefined) {
  return trait(player, "passProtect") + trait(player, "offStars") ** 2;
}

/** Selects and resolves one of the linebackers on the field independently from the normal line clash. */
export function resolvePassBlitz(
  ctx: EngineContext,
  options: PlayCallOptions,
): PassBlitzResult | undefined {
  if (!options.blitz) return undefined;
  const linebackers = (options.defense ?? [])
    .map((defender) => byName(ctx, defender.player))
    .filter(
      (player): player is PlayerTrait =>
        Boolean(player) &&
        String(player?.defPos ?? player?.DefPos).toUpperCase() === "LB",
    );
  const rusher = weightedChoose(linebackers, passBlitzSelectionWeight);
  if (!rusher) return undefined;

  const selectedGap = choose(PASS_BLITZ_GAPS);
  const adjacent = selectedGap.blockers
    .map((slot) => byName(ctx, options.formation?.[slot]))
    .filter((player): player is PlayerTrait => Boolean(player));
  const lineman = adjacent.length === 1
    ? adjacent[0]
    : weightedChoose(adjacent, linemanPickupScore);
  const lineThreshold = lineman
    ? trait(lineman, "passProtect") / 1.2 + trait(lineman, "offStars") ** 2 -
      (trait(rusher, "passRush") / 10 + trait(rusher, "defStars") ** 2 / 2)
    : Number.NEGATIVE_INFINITY;
  const lineBlocked = Boolean(lineman) && Math.random() * 100 <= lineThreshold;
  const base = {
    gap: selectedGap.gap,
    rusher: playerName(rusher),
    pickedUpBy: lineBlocked ? playerName(lineman) : undefined,
    lineBlocked,
    backBlocked: false,
    quarterbackPressured: false,
    instantSack: false,
  };
  if (lineBlocked) return base;

  const backs = (["RB1", "RB2"] as FormationSlot[])
    .map((slot) => byName(ctx, options.formation?.[slot]))
    .filter((player): player is PlayerTrait => Boolean(player))
    .sort((a, b) => trait(b, "passProtect") - trait(a, "passProtect"));
  const back = backs[0];
  if (back) {
    const backBlocked = Math.random() * 100 <= trait(back, "passProtect");
    if (backBlocked)
      return {
        ...base,
        pickedUpBy: playerName(back),
        backBlocked: true,
      };
  }

  const quarterback = byName(ctx, options.formation?.QB);
  const instantSack = Boolean(quarterback) && Math.random() * 100 <
    passBlitzInstantSackChance(rusher, quarterback);
  return { ...base, quarterbackPressured: !instantSack, instantSack };
}

function recordPassPhase(
  state: PassPlayState,
  phase: PassPlayState["phases"][number],
  message: string,
) {
  state.phases.push(phase);
  state.log.push(message);
}

/** Runs the ordered shell for a pass snap through handing a throw off to the future completion engine. */
export function runPassPlayPipeline(
  game: LeagueGame,
  ctx: EngineContext,
  qbName: string,
  options: PlayCallOptions = {},
  timeToThrow = determineTimeToThrow(game, ctx, options),
) {
  const state = createPassPlayState(qbName);

  // 1. A coaching call is false today, but the snap is ready for the coaching engine.
  state.blitz = options.blitz === true;
  state.blitzResult = resolvePassBlitz(ctx, options);
  if (state.blitzResult) {
    state.pressure.push(state.blitzResult.rusher);
    state.instantPressure = state.blitzResult.quarterbackPressured;
    recordPassPhase(
      state,
      "blitz-check",
      `${state.blitzResult.rusher} blitzed through ${state.blitzResult.gap}.`,
    );
    if (state.blitzResult.instantSack) {
      state.decision = "sack";
      recordPassPhase(state, "qb-chase", "The unblocked blitzer reached the empty backfield for an immediate sack.");
      return state;
    }
  } else {
    recordPassPhase(state, "blitz-check", state.blitz ? "No linebacker was available to blitz." : "No blitz was called.");
  }

  // 2. DL/OL clash. Detailed matchup results will be attached here.
  recordPassPhase(state, "line-clash", "DL/OL clash stub completed.");

  // 3-4. An immediate loss sends the QB to the chase branch; otherwise a pocket forms.
  if (timeToThrow < 0) {
    state.instantPressure = true;
    recordPassPhase(state, "qb-chase", "Instant pressure sends the QB into the chase stub.");
    state.decision = "sack";
    recordPassPhase(state, "pressure-response", "Pressure response stub selected a sack.");
    return state;
  }
  state.pocketFormed = true;
  recordPassPhase(state, "pocket-formed", "Pocket formation stub completed.");

  // 5-7. Keep the existing time-to-throw result while the three calculations are built out.
  state.baseTimeToThrow = timeToThrow;
  recordPassPhase(state, "base-time-to-throw", "Base time-to-throw stub completed.");
  recordPassPhase(state, "pass-rush-vs-pass-block", "Pass rush versus pass block stub completed.");
  state.finalTimeToThrow = timeToThrow;
  recordPassPhase(state, "final-time-to-throw", "Final time-to-throw stub completed.");

  // 8-9. Existing route/separation helpers temporarily populate the route shells.
  const routes = assignRoutes(game, ctx, options);
  state.routes = routes;
  recordPassPhase(state, "routes-available", "Receiver route availability stub completed.");
  const openness = determineSeparation(ctx, routes, timeToThrow);
  state.opennessTrajectory = openness;
  recordPassPhase(state, "openness-trajectory", "Receiver openness trajectory stub completed.");

  // 10-12. The current target chooser stands in for reads; pressure choices remain future work.
  state.target = choosePassTarget(ctx, qbName, openness, options);
  recordPassPhase(state, "qb-read-cycle", "QB read cycle stub completed.");
  state.decision = state.target ? "throw" : "throw-away";
  recordPassPhase(state, "qb-decision", `QB decision stub selected ${state.decision}.`);

  // 13. Stop at the boundary where completion/incompletion logic will eventually begin.
  if (state.decision === "throw")
    recordPassPhase(state, "throw-to-receiver", "ThrowToReceiver handoff stub reached.");
  return state;
}

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
    formation.LT,
    formation.LG,
    formation.C,
    formation.RG,
    formation.RT,
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
  const updated = applyHalftimeRules(game, {
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
  });
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
  const depthRanges: Record<string, [number, number]> = {
    Quick: [1, 2], Short: [3, 5], "Short-Mid": [6, 10], Mid: [11, 15],
    "Mid-Long": [16, 20], Long: [21, 25], Deep: [26, 30], Shot: [31, 39],
    Bomb: [40, Math.max(40, game.Possession === "Home" ? 100 - n(game.BallOn) : n(game.BallOn))],
  };
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
      airYards: options.routeDepths?.[name] && depthRanges[options.routeDepths[name]]
        ? choose(depthRanges[options.routeDepths[name]])
        : routes[name] === "Screen"
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
    const numericRead = Number.parseInt(read, 10);
    const readVal = Number.isFinite(numericRead)
      ? Math.max(1, 6 - numericRead)
      :
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
  const passState = runPassPlayPipeline(game, ctx, qbName, options, ttt);
  if (passState.decision === "sack")
    return handleSack(game, ctx, qbName, options);
  const target = passState.target as NonNullable<
    ReturnType<typeof choosePassTarget>
  > | undefined;
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
  const updated = applyHalftimeRules(game, {
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
  });
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
