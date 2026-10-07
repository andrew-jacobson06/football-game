import type { LeagueGame } from "../../types";
import type {
  EngineContext,
  FormationSlot,
  PassBlitzGap,
  PassBlitzResult,
  PassLineConfrontationResult,
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
import { calculateTimeToThrow } from "./timeToThrow";
import { calculateRouteOpennessInputs, calculateRoutePhaseImpacts } from "./routeOpenness";
import { routeDepthBounds } from "./routeCatalog";

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
    lineConfrontation: [],
    timeToThrowLineModifier: 0,
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

const PASS_LINE_SLOTS = new Set<FormationSlot>(["LT", "LG", "C", "RG", "RT"]);

/**
 * Resolves three contests for each aligned pass-rush matchup. Each contest also
 * produces the small adjustment applied to the Settings-based time to throw.
 */
export function resolvePassLineConfrontation(
  ctx: EngineContext,
  options: PlayCallOptions,
  random: () => number = Math.random,
): PassLineConfrontationResult[] {
  return (options.defense ?? []).flatMap((assignment) => {
    const slot = assignment.align;
    if (!slot || !PASS_LINE_SLOTS.has(slot)) return [];

    const defensiveLineman = byName(ctx, assignment.player);
    const offensiveLineman = byName(ctx, options.formation?.[slot]);
    if (!defensiveLineman || !offensiveLineman) return [];

    const passRush = trait(defensiveLineman, "passRush");
    const passProtect = trait(offensiveLineman, "passProtect");
    const defensiveWinChance =
      50 + (passRush / 12) ** 2 - (passProtect / 12) ** 2;
    const contests = Array.from({ length: 3 }, () => {
      const roll = random() * 100;
      const winner = roll < defensiveWinChance ? "DL" : "OL";
      const adjustment = 0.1 + random() * 0.3;
      return {
        roll,
        winner,
        timeToThrowModifier: winner === "DL" ? -adjustment : adjustment,
      } as const;
    });
    const defensiveWins = contests.filter(({ winner }) => winner === "DL").length;
    const offensiveWins = contests.length - defensiveWins;

    return [{
      slot,
      offensiveLineman: playerName(offensiveLineman),
      defensiveLineman: playerName(defensiveLineman),
      passRush,
      passProtect,
      defensiveWinChance,
      contests,
      defensiveWins,
      offensiveWins,
      timeToThrowModifier: contests.reduce(
        (total, contest) => total + contest.timeToThrowModifier,
        0,
      ),
      winner: defensiveWins > offensiveWins ? "DL" : "OL",
    }];
  });
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
  const instantSack = quarterback !== undefined && Math.random() * 100 <
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
  console.debug(`[Pass Engine] Phase ${state.phases.length}: ${phase}`, {
    message,
    quarterback: state.qb,
    blitz: state.blitz,
    blitzResult: state.blitzResult ? { ...state.blitzResult } : undefined,
    lineConfrontation: state.lineConfrontation.map((matchup) => ({
      ...matchup,
      contests: matchup.contests.map((contest) => ({ ...contest })),
    })),
    timeToThrowLineModifier: state.timeToThrowLineModifier,
    pressure: [...state.pressure],
    instantPressure: state.instantPressure,
    pocketFormed: state.pocketFormed,
    baseTimeToThrow: state.baseTimeToThrow,
    finalTimeToThrow: state.finalTimeToThrow,
    routes: state.routes.map((route) => ({ ...route })),
    opennessTrajectory: state.opennessTrajectory.map((route) => ({ ...route })),
    target: state.target ? { ...state.target } : undefined,
    decision: state.decision,
  });
}

/** Runs the ordered shell for a pass snap through handing a throw off to the future completion engine. */
export function runPassPlayPipeline(
  game: LeagueGame,
  ctx: EngineContext,
  qbName: string,
  options: PlayCallOptions = {},
) {
  const state = createPassPlayState(qbName);

  // 1. A coaching call is false today, but the snap is ready for the coaching engine.
  state.blitz = options.blitz === true;
  state.blitzResult = resolvePassBlitz(ctx, options);
  if (state.blitzResult) {
    if (state.blitzResult.quarterbackPressured)
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

  // 2. Only a pressure-free play reaches the normal line confrontation.
  if (state.pressure.length === 0) {
    state.lineConfrontation = resolvePassLineConfrontation(ctx, options);
    state.timeToThrowLineModifier = state.lineConfrontation.reduce(
      (total, matchup) => total + matchup.timeToThrowModifier,
      0,
    );
    recordPassPhase(
      state,
      "line-clash",
      `The line completed ${state.lineConfrontation.length * 3} contests; ` +
        `the stored time-to-throw modifier is ${state.timeToThrowLineModifier.toFixed(2)}.`,
    );
  } else {
    recordPassPhase(state, "line-clash", "Existing pressure bypassed the line confrontation.");
  }

  // 3-4. With the instant checks complete, a pocket forms.
  state.pocketFormed = true;
  recordPassPhase(state, "pocket-formed", "Pocket formation stub completed.");

  // 5-7. Sample the Settings table only after the line contests are complete.
  const timing = calculateTimeToThrow(
    ctx.settings.timeToThrowRanges ?? [],
    state.timeToThrowLineModifier,
  );
  state.baseTimeToThrow = timing.baseTimeToThrow;
  recordPassPhase(state, "base-time-to-throw",
    `Roll ${timing.percentageRoll.toFixed(2)} selected ${timing.range.min}–${timing.range.max} seconds; ` +
    `base time to throw is ${timing.baseTimeToThrow.toFixed(2)} seconds.`);
  recordPassPhase(state, "pass-rush-vs-pass-block", "Pass rush versus pass block stub completed.");
  state.finalTimeToThrow = timing.timeToThrow;
  recordPassPhase(state, "final-time-to-throw",
    `${timing.baseTimeToThrow.toFixed(2)} + ${state.timeToThrowLineModifier.toFixed(2)} = ` +
    `${state.finalTimeToThrow.toFixed(2)} seconds to throw.`);
  if (state.finalTimeToThrow < 0) {
    state.instantPressure = true;
    state.decision = "sack";
    recordPassPhase(state, "qb-chase", "Line pressure exhausted the QB's time to throw.");
    recordPassPhase(state, "pressure-response", "Pressure response stub selected a sack.");
    return state;
  }

  // 8-9. Existing route/separation helpers temporarily populate the route shells.
  const routes = assignRoutes(game, ctx, options);
  state.routes = routes;
  recordPassPhase(state, "routes-available", "Receiver route timing, phase windows, trait contests, and phase impacts calculated.");
  const openness = determineSeparation(ctx, routes, state.finalTimeToThrow);
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
  _game: LeagueGame,
  ctx: EngineContext,
  _options: PlayCallOptions = {},
  lineModifier = 0,
) {
  return calculateTimeToThrow(ctx.settings.timeToThrowRanges ?? [], lineModifier).timeToThrow;
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
  const names = Object.keys(routes).length
    ? Object.keys(routes)
    : [
        ...byPosition(ctx, offense, "WR"),
        ...byPosition(ctx, offense, "RB"),
        ...byPosition(ctx, offense, "TE"),
      ].map((p) => playerName(p));
  return names
    .filter((name) => Boolean(routes[name]) && routes[name] !== "No Route")
    .map((name, i) => {
      const routeType = routes[name];
      const depth = options.routeDepths?.[name];
      const range = ctx.settings.routeTypeAirYards?.find((range) => range.routeType === depth);
      if (!depth || !range) throw new Error(`Missing or invalid route depth for ${name}.`);
      if (!ctx.settings.routesByDepth?.[depth]?.includes(routeType))
        throw new Error(`Route ${routeType} is not available at depth ${depth}.`);
      const bounds = routeDepthBounds(range, game.Possession === "Home" ? 100 - n(game.BallOn) : n(game.BallOn));
      const airYards = Math.floor(bounds.min + Math.random() * (bounds.max - bounds.min + 1));
      const slot = Object.entries(options.formation ?? {}).find(([, player]) => player === name)?.[0];
      const assignment = options.defense?.find((defender) => defender.align === slot && slot !== undefined);
      const coveragePlayers = teamPlayers(ctx, defenseTeam(game)).filter((player) =>
        ["DB", "S"].includes(String(player.defPos ?? player.DefPos ?? "").toUpperCase()));
      const defenderName = assignment?.player ?? playerName(coveragePlayers[i]);
      const receiver = byName(ctx, name), defender = byName(ctx, defenderName);
      if (!ctx.settings.routeOpennessSettings) throw new Error("Missing route openness Settings tables.");
      if (!receiver || !defender) throw new Error(`Missing receiver/defender matchup for ${name}.`);
      const opennessInputs = calculateRouteOpennessInputs(ctx.settings.routeOpennessSettings, routeType, depth, receiver, defender);
      const phaseResults = calculateRoutePhaseImpacts(opennessInputs, receiver, defender);
      return {
        player: name,
        routeType,
        depth,
        airYards,
        TTO: opennessInputs.timeToOpen,
        opennessInputs,
        ...phaseResults,
        defender: defenderName,
        position: i,
      };
    });
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
  const passState = runPassPlayPipeline(game, ctx, qbName, options);
  if (passState.decision === "sack")
    return handleSack(game, ctx, qbName, options);
  const target = passState.target as NonNullable<
    ReturnType<typeof choosePassTarget>
  > | undefined;
  if (!target) return handleSack(game, ctx, qbName, options);
  const pct = determineCompletionPct(ctx, qbName, target).pct;
  console.debug("[Pass Engine] Completion check", {
    quarterback: qbName,
    target: { ...target },
    completionChance: pct,
  });
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
  console.debug("[Pass Engine] Pass outcome", {
    quarterback: qbName,
    target: target.player,
    completionChance: pct,
    ...outcome,
    result,
  });
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
