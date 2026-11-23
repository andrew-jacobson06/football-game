import { test } from "node:test";
import { aggregatePlayStats } from "../../api/src/services/playStats.ts";
import assert from "node:assert/strict";
import { calculateRouteOpennessInputs, calculateRoutePhaseImpacts, type RouteOpennessSettings } from "../src/components/league/gameplay/engine/routeOpenness.ts";
import { assignRoutes, runPassPlayPipeline, passPlay, handleSack } from "../src/components/league/gameplay/engine/passEngine.ts";
import type { LeagueGame } from "../src/components/league/types.ts";
import type { EngineContext, PlayCallOptions } from "../src/components/league/gameplay/engine/types.ts";

const settings: RouteOpennessSettings = {
  curves: { Quick: [{ time: 0.25, openness: 20 }] },
  phaseWeights: {
    Release: { speed: 0.7, acceleration: 1.5, routeCoverage: 1, size: 0.8 },
    Stem: { speed: 1.5, acceleration: 0.75, routeCoverage: 1.5, size: 0.25 },
    Break: { speed: 0.85, acceleration: 1, routeCoverage: 1.75, size: 0.4 },
    Sustain: { speed: 2, acceleration: 0.25, routeCoverage: 0.95, size: 0.8 },
  },
  routeTree: {
    Flat: { type: "Simple", curveType: "Quick", timingMod: -0.2, phases: { Release: 35, Stem: 0, Break: 5, Sustain: 60 } },
    Sluggo: { type: "Complex", curveType: "DoubleMove", timingMod: 0.3, phases: { Release: 15, Stem: 15, Break: 45, Sustain: 25 } },
  },
  baseTTO: { Quick: 1, Deep: 3.2 },
  baseImpacts: {
    Speed: { base: 5, max: 10, diffWeight: 0.25 },
    Accel: { base: 5, max: 10, diffWeight: 0.25 },
    "Route/Coverage": { base: 5, max: 10, diffWeight: 0.25 },
    Size: { base: 3, max: 6, diffWeight: 0.15 },
  },
};
const receiver = { name: "Receiver", team: "Home", position: "WR", speed: 80, acceleration: 70, routeRunning: 90, size: 60 };
const defender = { name: "Corner", team: "Away", defPos: "DB", speed: 60, acceleration: 90, coverage: 50, size: 20 };

test("Flat timing produces consecutive phase windows, including a zero-duration stem", () => {
  const result = calculateRouteOpennessInputs(settings, "Flat", "Quick", receiver, defender);
  assert.equal(result.timeToOpen, 0.8);
  assert.deepEqual(result.phases.map((phase) => phase.percentage), [35, 0, 5, 60]);
  assert.ok(Math.abs(result.phases[0].duration - 0.28) < 1e-10);
  assert.equal(result.phases[1].duration, 0);
  assert.equal(result.phases[1].start, result.phases[1].end);
  assert.equal(result.phases[3].end, 0.8);
  for (let index = 1; index < 4; index++) assert.equal(result.phases[index].start, result.phases[index - 1].end);
  assert.equal(result.phases[0].weights.acceleration, 1.5);
});

test("trait impacts use absolute WR/DB differences and cap only the difference contribution", () => {
  const result = calculateRouteOpennessInputs(settings, "Flat", "Quick", receiver, defender);
  assert.deepEqual(result.traitImpacts, { speed: 10, acceleration: 10, routeCoverage: 15, size: 9 });
  const equal = calculateRouteOpennessInputs(settings, "Flat", "Quick", receiver, { ...receiver, coverage: 90 });
  assert.deepEqual(equal.traitImpacts, { speed: 5, acceleration: 5, routeCoverage: 5, size: 3 });
  const zero = calculateRouteOpennessInputs(settings, "Flat", "Quick", { ...receiver, speed: 0 }, { ...defender, speed: 0 });
  assert.equal(zero.traitImpacts.speed, 5);
});

test("updated depth settings and positive timing modifiers affect all windows", () => {
  const result = calculateRouteOpennessInputs({ ...settings, baseTTO: { Deep: 4 } }, "Sluggo", "Deep", receiver, defender);
  assert.equal(result.timeToOpen, 4.3);
  assert.equal(result.phases.at(-1)?.end, 4.3);
  assert.equal(result.phases[2].duration, 4.3 * 0.45);
  assert.throws(() => calculateRouteOpennessInputs(settings, "Unknown", "Deep", receiver, defender), /Missing/);
  assert.throws(() => calculateRouteOpennessInputs(settings, "Flat", "Unknown", receiver, defender), /Missing/);
  assert.throws(() => calculateRouteOpennessInputs(settings, "Flat", "Quick", {}, defender), /trait/);
});

test("WR Screen uses existing Screen timing details when the workbook names differ", () => {
  const screenSettings = { ...settings, routeTree: { Screen: settings.routeTree.Flat } };
  assert.equal(calculateRouteOpennessInputs(screenSettings, "WR Screen", "Quick", receiver, defender).timeToOpen, 0.8);
});

test("phase impacts sum signed base impacts times weights, then apply the route percentage", () => {
  const inputs = calculateRouteOpennessInputs(settings, "Flat", "Quick", receiver, defender);
  const result = calculateRoutePhaseImpacts(inputs, receiver, defender, () => 0);
  assert.ok(Math.abs(result.phaseImpacts.Release - 15.47) < 1e-10);
  assert.equal(result.phaseImpacts.Stem, 0);
  assert.ok(Math.abs(result.phaseImpacts.Break - 2.4175) < 1e-10);
  assert.ok(Math.abs(result.phaseImpacts.Sustain - 26.37) < 1e-10);
  assert.equal(result.phaseOpenness[0].traits.speed.baseImpact, 10);
  assert.equal(result.phaseOpenness[0].traits.speed.phaseModifier, 0.7);
  assert.equal(result.phaseOpenness[0].traits.speed.signedImpact, 7);
});

test("each phase rolls all four contests independently and keeps WR/DB outcomes", () => {
  const inputs = calculateRouteOpennessInputs(settings, "Flat", "Quick", receiver, defender);
  const rolls = [0.69, 0.30, 0.89, 0.90, 0, 0, 0, 0, 0.99, 0.99, 0.99, 0.99, 0, 0, 0, 0];
  let count = 0;
  const result = calculateRoutePhaseImpacts(inputs, receiver, defender, () => rolls[count++]);
  assert.equal(count, 16);
  const release = result.phaseOpenness[0];
  assert.deepEqual(Object.values(release.traits).map((trait) => trait.winner), ["WR", "DB", "WR", "DB"]);
  assert.equal(release.traits.speed.receiverWinNumber, 70);
  assert.equal(release.traits.acceleration.receiverWinNumber, 30);
  assert.equal(release.traits.routeCoverage.receiverWinNumber, 90);
  assert.equal(release.traits.size.receiverWinNumber, 90);
  assert.ok(Math.abs(release.phaseImpact - (-0.07)) < 1e-10);
  assert.equal(result.phaseOpenness[2].traits.speed.winner, "DB");
  assert.equal(result.phaseOpenness[3].traits.speed.winner, "WR");
  assert.equal(result.phaseImpacts.Stem, 0);
});

test("the WR win number has a floor of five and equal rolls lose, without an upper cap", () => {
  const weak = { ...receiver, speed: 0 }, strong = { ...defender, speed: 100 };
  const inputs = calculateRouteOpennessInputs(settings, "Flat", "Quick", weak, strong);
  const loss = calculateRoutePhaseImpacts(inputs, weak, strong, () => 0.05);
  assert.equal(loss.phaseOpenness[0].traits.speed.receiverWinNumber, 5);
  assert.equal(loss.phaseOpenness[0].traits.speed.winner, "DB");
  const win = calculateRoutePhaseImpacts(inputs, weak, strong, () => 0.04999);
  assert.equal(win.phaseOpenness[0].traits.speed.winner, "WR");
  const fast = { ...receiver, speed: 200 };
  const fastInputs = calculateRouteOpennessInputs(settings, "Flat", "Quick", fast, defender);
  const fastWin = calculateRoutePhaseImpacts(fastInputs, fast, defender, () => 0.99999);
  assert.equal(fastWin.phaseOpenness[0].traits.speed.receiverWinNumber, 190);
  assert.equal(fastWin.phaseOpenness[0].traits.speed.winner, "WR");
});

const game: LeagueGame = { GameId: 1, Home: "Home", Away: "Away", Possession: "Home", HomeScore: 0, AwayScore: 0, Qtr: 1, Time: 900, Down: 1, Distance: 10, BallOn: 25 };
const ctx: EngineContext = {
  players: [{ name: "Lineman", team: "Away", defPos: "DL" }, receiver, defender],
  settings: { routeOpennessSettings: settings, timeToThrowRanges: [{ min: 2, max: 2, percentage: 100 }],
    routeTypeAirYards: [{ routeType: "Quick", minAirYards: 1, maxAirYards: 2 }], routesByDepth: { Quick: ["Flat"] },
    dbBeatWRAccuracyMultipliers: (["Perfect", "Accurate", "Close", "Catchable", "Off Target"] as const).map(throwType => ({ throwType, multiplier: 0 })),
    pickAccuracyMultipliers: (["Perfect", "Accurate", "Close", "Catchable", "Off Target"] as const).map(throwType => ({ throwType, multiplier: 0 })),
    completionTable: [{ pastLos: 0, baseCompletion: 75 }, { pastLos: 3, baseCompletion: 70 }],
    opennessCompletionModifiers: [{ label: "All", minOpen: 0, maxOpen: null, minAdjust: -30, maxAdjust: 20 }],
    handsImpactByOpenness: [{ label: "All", minOpen: 0, maxOpen: null, handsImpact: 0.5 }],
    jumpEffects: [{ label: "All", minOpen: 0, maxOpen: null, multipliers: { Perfect: 0.05, Accurate: 0.05, Close: 0.1, Catchable: 0.15, "Off Target": 0 } }],
    jumpAirYards: [{ airYards: "EndZone", multiplier: 1.35 }, { airYards: 5, multiplier: 0.25 }, { airYards: 10, multiplier: 0.5 }, { airYards: 100, multiplier: 1 }],
    jumpRoutes: [{ route: "ALL ELSE", multiplier: 1 }],
    yacBasis: [{ maxAirYards: 100, openness: [{ maxOpen: 89, basis: 10 }] }],
    yacThrowMultipliers: (["Perfect", "Accurate", "Close", "Catchable", "Off Target"] as const)
      .map((throwType) => ({ throwType, depths: [{ maxAirYards: 100, multiplier: 1 }] })),
    accuracyModifiers: [{ throwType: "Perfect", min: 10, max: 20 }, { throwType: "Accurate", min: 5, max: 9 },
      { throwType: "Close", min: -4, max: 4 }, { throwType: "Catchable", min: -9, max: -5 }, { throwType: "Off Target", min: -20, max: -10 }],
    qbDecisionTable: [{ perceivedMax: 1000, label: "Test", secondReadNotice: 0, thirdReadNotice: 0, fourthReadNotice: 0, noticeIfPrimary: 100 }] }, historyLength: 0,
};
const options: PlayCallOptions = { blitz: false, formation: { WR1: "Receiver" }, routes: { Receiver: "Flat" }, routeDepths: { Receiver: "Quick" }, defense: [{ player: "Corner", position: "DB1", align: "WR1" }] };

test("route assignment uses the aligned DB and excludes No Route players", () => {
  const routes = assignRoutes(game, ctx, options);
  assert.equal(routes[0].defender, "Corner");
  assert.equal(routes[0].TTO, 0.8);
  assert.equal(routes[0].curveType, "Quick");
  assert.equal(routes[0].opennessInputs.traitImpacts.speed, 10);
  assert.deepEqual(assignRoutes(game, ctx, { ...options, routes: { Receiver: "No Route" } }), []);
});

test("pass pipeline retains calculation inputs for later openness graphs", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const state = runPassPlayPipeline(game, ctx, "QB", options);
  assert.equal(state.routes.length, 1);
  assert.equal(state.routes[0].TTO, 0.8);
  const route = state.routes[0] as ReturnType<typeof assignRoutes>[number];
  assert.equal(route.opennessInputs.phases.at(-1)?.end, 0.8);
  assert.deepEqual(Object.keys(route.phaseImpacts), ["Release", "Stem", "Break", "Sustain"]);
  assert.equal(route.phaseOpenness.length, 4);
  assert.equal(route.phaseOpenness[0].traits.acceleration.winner, "DB");
  assert.equal(route.phaseImpacts.Release, route.phaseOpenness[0].phaseImpact);
  assert.equal(state.opennessTrajectory[0].phaseImpacts, route.phaseImpacts);
  assert.equal(state.opennessTrajectory[0].opennessInputs, route.opennessInputs);
  assert.equal(state.readLoop?.currentRead, 1);
  assert.equal(state.readLoop?.currentTime, 0.25);
  assert.equal(state.readLoop?.stopReason, "throw");
  assert.equal(state.target?.player, "Receiver");
  assert.deepEqual(state.readLoop?.snapshots.map((snapshot) => snapshot.currentTime), [0.25]);
  const perceived = state.readLoop!.snapshots[0].receivers[0];
  assert.equal(perceived.player, "Receiver");
  assert.equal(perceived.openness, perceived.baseOpenness + perceived.skillBasedOpennessMod);
  assert.equal(perceived.perceivedOpenness, perceived.openness + perceived.readDefenseAdjustment);
});

test("an unblocked blitz skips the unpressured read loop", (t) => {
  t.mock.method(console, "debug", () => {});
  const rolls = [.99, .99, .99, .99, 0, .5, .99];
  t.mock.method(Math, "random", () => rolls.shift() ?? .99);
  const blitzContext = { ...ctx, players: [...ctx.players,
    { name: "Blitzer", team: "Away", defPos: "LB", passRush: 60, tackling: 60, defStars: 1 }] };
  const state = runPassPlayPipeline(game, blitzContext, "QB", { ...options, blitz: true,
    defense: [...options.defense!, { player: "Blitzer", position: "LB1" }] });
  assert.deepEqual(state.pressure, ["Blitzer"]);
  assert.equal(state.readLoop, undefined);
  assert.equal(state.decision, "sack");
  assert.equal(state.sacker, "Blitzer");
  assert.equal(state.pressureHit?.hitter, "Blitzer");
});

test("declining all reads continues to the deadline and rolls the throw-away option", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const context = { ...ctx, settings: { ...ctx.settings,
    qbDecisionTable: [{ perceivedMax: 1000, label: "Unavailable", secondReadNotice: null, thirdReadNotice: null, fourthReadNotice: null, noticeIfPrimary: null }] } };
  const state = runPassPlayPipeline(game, context, "QB", options);
  assert.equal(state.readLoop?.stopReason, "time-to-throw");
  assert.equal(state.readLoop?.currentTime, 2);
  assert.equal(state.readLoop?.currentRead, null);
  assert.ok(state.readLoop!.snapshots.length > 1);
  assert.equal(state.readLoop?.decisions[0].noticeChance, 0);
  assert.equal(state.target, undefined);
  assert.equal(state.decision, "throw-away");
  const result = passPlay(game, context, options);
  assert.equal(result.text, "Pass: Incomplete");
  assert.equal(result.game.BallOn, game.BallOn);
  assert.equal(result.game.Down, 2);
});

test("a base-notice throw is handed to the pass pipeline before the read is ready", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const context = { ...ctx, settings: { ...ctx.settings,
    qbDecisionTable: [{ perceivedMax: 1000, label: "Test", secondReadNotice: 100, thirdReadNotice: 100, fourthReadNotice: 100, noticeIfPrimary: 100 }] } };
  const state = runPassPlayPipeline(game, context, "QB", options);
  assert.equal(state.decision, "throw");
  assert.equal(state.target?.player, "Receiver");
  assert.equal(state.readLoop?.currentTime, 0.25);
  assert.ok(state.readLoop!.currentTime < Number(state.target?.TTO));
  assert.equal(state.readLoop?.decisions[0].noticeType, "scan");
  assert.equal(state.throwCompletion?.throwTime, 0.25);
  assert.equal(state.throwCompletion?.baseCompletion, 70);
  assert.equal(state.throwCompletion?.actualOpenness, state.readLoop?.snapshots[0].receivers[0].openness);
  assert.notEqual(state.throwCompletion?.actualOpenness, state.readLoop?.snapshots[0].receivers[0].perceivedOpenness);
  assert.equal(state.throwCompletion?.throwType, "Close");
  assert.equal(state.throwCompletion?.accuracyAdjustment, 0);
  assert.equal(state.throwCompletion?.receiverHands, 50);
  assert.equal(state.throwCompletion?.handsAdjustment, state.throwCompletion!.handsEffectMod * 0.5);
  assert.equal(state.throwCompletion?.jumpAirYardsMultiplier, 0.25);
  assert.equal(state.throwCompletion?.isEndZoneThrow, false);
});

test("end-zone jump detection respects both possession directions", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const home = runPassPlayPipeline({ ...game, BallOn: 98 }, ctx, "QB", options);
  const awayContext = { ...ctx, players: ctx.players.map((player) => ({ ...player,
    team: player.team === "Home" ? "Away" : "Home" })) };
  const away = runPassPlayPipeline({ ...game, Possession: "Away", BallOn: 2 }, awayContext, "QB", options);
  for (const state of [home, away]) {
    assert.equal(state.throwCompletion?.isEndZoneThrow, true);
    assert.equal(state.throwCompletion?.jumpAirYardsMultiplier, 1.35);
  }
});

test("forced deadline throws reach completion with the expiration timestamp", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.25);
  const context = { ...ctx, settings: { ...ctx.settings,
    qbDecisionTable: [{ perceivedMax: 1000, label: "No notice", secondReadNotice: null, thirdReadNotice: null, fourthReadNotice: null, noticeIfPrimary: null }] } };
  const state = runPassPlayPipeline(game, context, "QB", options);
  assert.equal(state.readLoop?.expirationDecision?.action, "force-throw");
  assert.equal(state.decision, "throw");
  assert.equal(state.target?.player, "Receiver");
  assert.equal(state.throwCompletion?.throwTime, 2);
});

test("the scramble option resolves a QB run rather than a sack or pass", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.9);
  const context = { ...ctx, players: [...ctx.players, { name: "QB", team: "Home", position: "QB", speed: 60, acceleration: 60, vision: 100 },
      { name: "Blocker", team: "Home", runBlocking: 100, passProtect: 50 },
      { name: "Rusher", team: "Away", defPos: "DL", runStop: 10, passRush: 50 }],
    settings: { ...ctx.settings, qbDecisionTable: [{ perceivedMax: 1000, label: "No notice", secondReadNotice: null, thirdReadNotice: null, fourthReadNotice: null, noticeIfPrimary: null }] } };
  const call = { ...options, formation: { ...options.formation, QB: "QB", LT: "Blocker" },
    defense: [...options.defense!, { player: "Rusher", position: "DL1", align: "LT" }] };
  const state = runPassPlayPipeline(game, context, "QB", call);
  assert.equal(state.decision, "scramble");
  assert.equal(state.throwCompletion, undefined);
  const result = passPlay(game, context, call);
  assert.equal(result.play.playtype, "Run");
  assert.equal(result.play.player, "QB");
});

function completionContext(airYards: number): EngineContext {
  return { ...ctx, settings: { ...ctx.settings,
    routeTypeAirYards: [{ routeType: "Quick", minAirYards: airYards, maxAirYards: airYards }],
    completionTable: [{ pastLos: 110, baseCompletion: 100 }],
    opennessCompletionModifiers: [{ label: "All", minOpen: 0, maxOpen: null, minAdjust: 0, maxAdjust: 0 }],
    accuracyModifiers: ctx.settings.accuracyModifiers!.map((row) => ({ ...row, min: 0, max: 0 })),
    handsImpactByOpenness: [{ label: "All", minOpen: 0, maxOpen: null, handsImpact: 0 }],
    jumpEffects: [{ label: "All", minOpen: 0, maxOpen: null, multipliers: { Perfect: 0, Accurate: 0, Close: 0, Catchable: 0, "Off Target": 0 } }],
  } };
}

test("completed catches use stored throw quality and actual openness; 90+ retains legacy YAC", (t) => {
  const debug = t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const context = completionContext(8);
  passPlay(game, context, options);
  const completion = debug.mock.calls.find((call) => call.arguments[0] === "[Pass Engine] Completion check")!.arguments[1].throwCompletion;
  const yac = debug.mock.calls.find((call) => call.arguments[0] === "[Pass Engine] YAC calculation")!.arguments[1];
  assert.equal(yac.method, "settings");
  assert.equal(yac.actualOpenness, completion.actualOpenness);
  assert.equal(yac.throwType, completion.throwType);
  assert.equal(yac.baseYAC, 10);
  context.settings.routeOpennessSettings = { ...context.settings.routeOpennessSettings!,
    curves: { ...context.settings.routeOpennessSettings!.curves,
      Quick: context.settings.routeOpennessSettings!.curves.Quick.map((point) => ({ ...point, openness: 200 })) } };
  context.settings.yacBasis = [];
  context.settings.yacThrowMultipliers = [];
  passPlay(game, context, options);
  const legacy = debug.mock.calls.filter((call) => call.arguments[0] === "[Pass Engine] YAC calculation").at(-1)!.arguments[1];
  assert.ok(legacy.actualOpenness >= 90);
  assert.equal(legacy.method, "legacy");
});

test("27-yard end-zone passes from the 15 credit and log only 15 yards for either possession", (t) => {
  const debug = t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const context = completionContext(27);
  for (const possession of ["Home", "Away"] as const) {
    const offenseContext = possession === "Home" ? context : { ...context, players: context.players.map((player) => ({ ...player,
      team: player.team === "Home" ? "Away" : "Home" })) };
    const result = passPlay({ ...game, Possession: possession, BallOn: possession === "Home" ? 85 : 15 }, offenseContext, options);
    assert.equal(result.play.result, "Touchdown");
    assert.equal(result.play.yards, 15);
    assert.equal(result.play.airyards, 15);
    assert.equal(result.play.newballon, possession === "Home" ? 100 : 0);
    assert.equal(result.play.isSack, false);
    assert.equal(result.play.isComplete, true);
    assert.equal(result.play.yac, 0);
    const completion = debug.mock.calls.filter((call) => call.arguments[0] === "[Pass Engine] Completion check").at(-1)!.arguments[1];
    assert.equal(completion.throwCompletion.airYards, 27); // Physical depth remains an input to completion.
    const outcome = debug.mock.calls.filter((call) => call.arguments[0] === "[Pass Engine] Pass outcome").at(-1)!.arguments[1];
    assert.equal(outcome.yards, 15);
    assert.equal(outcome.airYards, 15);
  }
});

test("yards after catch stop at the goal line, while ordinary pass gains remain intact", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const context = completionContext(12);
  const midfield = passPlay(game, context, options);
  assert.ok(Number(midfield.play.yards) > 15);
  assert.equal(midfield.play.airyards, 12);
  const redZone = passPlay({ ...game, BallOn: 85 }, context, options);
  assert.equal(redZone.play.result, "Touchdown");
  assert.equal(redZone.play.yards, 15);
  assert.equal(redZone.play.airyards, 12);
  assert.equal(redZone.play.yac, 3);
  assert.equal(midfield.play.yac, Number(midfield.play.yards) - 12);
});

test("sacks retain their definitive flag for normal losses, turnovers, safeties and fumbles", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const context = { ...ctx, players: [...ctx.players.filter((player) => player.defPos !== "DL"),
    { name: "QB", team: "Home", position: "QB" }, { name: "Sacker", team: "Away", defPos: "DL", sackChance: 100 }] };
  for (const [call, expected] of [[game, "Sack"], [{ ...game, Down: 4 }, "TO on Downs"],
    [{ ...game, BallOn: 1 }, "Safety"]] as const) {
    const result = handleSack(call, context, "QB", options);
    assert.equal(result.play.result, expected);
    assert.equal(result.play.isSack, true);
    assert.equal(result.play.isComplete, false);
    assert.equal(result.play.defenseresult, "Sack");
    assert.equal(result.play.yac, 0);
  }
  t.mock.method(Math, "random", () => 0);
  const fumbleContext = { ...context, players: context.players.map((player) => player.name === "Sacker" ? { ...player, strip: 100 } : player) };
  const fumble = handleSack(game, fumbleContext, "QB", options);
  assert.equal(fumble.play.result, "Fumble");
  assert.equal(fumble.play.isSack, true);
  assert.equal(fumble.play.isComplete, false);
});

test("pass plays retain resolved line matchups and win/loss counts in history", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const context = completionContext(8);
  context.players = [...context.players, { name: "OL", team: "Home", passProtect: 60 },
    { name: "DL", team: "Away", passRush: 60 }];
  const call = { ...options, formation: { ...options.formation, LT: "OL" },
    defense: [...options.defense!, { player: "DL", position: "DL1", align: "LT" as const }] };
  const result = passPlay(game, context, call);
  assert.deepEqual(result.play.lineMatchups, [{ slot: "LT", offensePlayer: "OL", defensePlayer: "DL", winner: "OL" }]);
  assert.equal(result.play.olWins, 1);
  assert.equal(result.play.olLosses, 0);
  assert.equal(result.play.dlWins, 0);
  assert.equal(result.play.dlLosses, 1);
  assert.equal(result.play.isComplete, true);
});

test("fourth-down incompletions log turnovers and reset the receiving team's series", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const context = completionContext(1);
  context.settings.completionTable = [{ pastLos: 110, baseCompletion: 0 }];
  const result = passPlay({ ...game, Down: 4, Distance: 7 }, context, options);
  assert.equal(result.play.result, "TO on Downs");
  assert.equal(result.play.isComplete, false);
  assert.equal(result.play.turnover, "Yes");
  assert.equal(result.game.Possession, "Away");
  assert.equal(result.game.Down, 1);
  assert.equal(result.game.Distance, 10);
  assert.equal(result.game.BallOn, game.BallOn);
  assert.equal(result.play.newdown, 1);
  assert.equal(result.play.newdist, 10);
});

test("interceptions before fourth down reset down/distance and preserve the interception result", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.1);
  const context = completionContext(1);
  context.settings.completionTable = [{ pastLos: 110, baseCompletion: 100 }];
  context.settings.dbBeatWRAccuracyMultipliers = context.settings.dbBeatWRAccuracyMultipliers!.map(row => ({ ...row, multiplier: 1000 }));
  context.settings.pickAccuracyMultipliers = context.settings.pickAccuracyMultipliers!.map(row => ({ ...row, multiplier: 1000 }));
  context.players = context.players.map((player) => player.name === defender.name ? { ...player, ballHawk: 100, readQB: 100 } : player);
  const result = passPlay({ ...game, Down: 2, Distance: 7 }, context, options);
  assert.equal(result.play.result, "Interception");
  assert.equal(result.game.Possession, "Away");
  assert.equal(result.game.Down, 1);
  assert.equal(result.game.Distance, 10);
  assert.equal(result.play.newdown, 1);
  assert.equal(result.play.newdist, 10);
});

test("a lost sack fumble resets the new offense, while an offensive recovery keeps its series", (t) => {
  const rolls = [0, 0, 0, 0, 0, 0];
  t.mock.method(Math, "random", () => rolls.shift() ?? 0.5);
  const context = { ...ctx, players: [...ctx.players.filter((player) => player.defPos !== "DL"),
    { name: "QB", team: "Home", position: "QB" }, { name: "Sacker", team: "Away", defPos: "DL", sackChance: 100, strip: 100 }] };
  const previous = { ...game, Down: 2, Distance: 7 };
  const lost = handleSack(previous, context, "QB", options);
  assert.equal(lost.play.result, "Fumble");
  assert.equal(lost.play.recoveredby, "Sacker");
  assert.equal(lost.game.Possession, "Away");
  assert.equal(lost.game.Down, 1);
  assert.equal(lost.game.Distance, 10);
  rolls.push(0, 0, 0, 0, 0, 0.9);
  const recovered = handleSack(previous, context, "QB", options);
  assert.equal(recovered.play.result, "Fumble");
  assert.equal(recovered.play.recoveredby, "QB");
  assert.equal(recovered.game.Possession, "Home");
  assert.equal(recovered.game.Down, 3);
  assert.equal(recovered.game.Distance, 8);
});

function blitzRouteContext(pickupSlot: "RB1" | "RB2" = "RB1") {
  const otherSlot = pickupSlot === "RB1" ? "RB2" : "RB1";
  const context: EngineContext = { ...ctx, players: [...ctx.players,
    { name: "QB", team: "Home", position: "QB", readDefense: 100, juke: 100, poise: 100 },
    { ...receiver, name: "Blocking Back", position: "RB", passProtect: 100 },
    { ...receiver, name: "Other Back", position: "RB", passProtect: 10 },
    { ...defender, name: "Blocking Back Corner" }, { ...defender, name: "Other Back Corner" },
    { name: "Blitzer", team: "Away", defPos: "LB", passRush: 1, tackling: 1, defStars: 1 },
  ] };
  const call: PlayCallOptions = { ...options, blitz: true,
    formation: { QB: "QB", WR1: "Receiver", [pickupSlot]: "Blocking Back", [otherSlot]: "Other Back" },
    routes: { Receiver: "Flat", "Blocking Back": "Flat", "Other Back": "Flat" },
    routeDepths: { Receiver: "Quick", "Blocking Back": "Quick", "Other Back": "Quick" },
    reads: { "Blocking Back": "1", Receiver: "2", "Other Back": "3" },
    defense: [...options.defense!,
      { player: "Blocking Back Corner", position: "DB2", align: pickupSlot },
      { player: "Other Back Corner", position: "DB3", align: otherSlot },
      { player: "Blitzer", position: "LB1", align: "QB" }],
  };
  return { context, call };
}

test("a successful RB1 or RB2 blitz pickup cancels only that back's route and QB eligibility for this snap", (t) => {
  t.mock.method(console, "debug", () => {});
  const log = t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  for (const slot of ["RB1", "RB2"] as const) {
    const { context, call } = blitzRouteContext(slot);
    const saved = structuredClone(call);
    const state = runPassPlayPipeline(game, context, "QB", call);
    assert.equal(state.blitzResult?.backBlocked, true);
    assert.equal(state.blitzResult?.pickedUpBy, "Blocking Back");
    assert.deepEqual(state.routes.map((route) => route.player), ["Receiver", "Other Back"]);
    assert.deepEqual(state.opennessTrajectory.map((route) => route.player), ["Receiver", "Other Back"]);
    assert.ok(state.readLoop!.snapshots.every((snapshot) => snapshot.receivers.every((route) => route.player !== "Blocking Back")));
    assert.ok(state.readLoop!.decisions.every((decision) => decision.player !== "Blocking Back"));
    assert.equal(state.readLoop!.currentReadPlayer, "Receiver");
    assert.equal(state.target?.player, "Receiver");
    assert.deepEqual(call, saved);
  }
  assert.ok(log.mock.calls.some((call) => call.arguments[0] === "[Pass Blitz] Route removed" && call.arguments[1].player === "Blocking Back"));
});

test("backs retain their routes on no blitz, failed back pickup, or a pickup by the line", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const { context, call } = blitzRouteContext();
  const noBlitz = runPassPlayPipeline(game, context, "QB", { ...call, blitz: false });
  assert.deepEqual(noBlitz.routes.map((route) => route.player), ["Receiver", "Blocking Back", "Other Back"]);

  const weakBacks = { ...context, players: context.players.map((player) => player.name === "Blocking Back" ? { ...player, passProtect: 10 }
    : player.name === "Other Back" ? { ...player, passProtect: 5 } : player) };
  // Keep this route-retention case on the new 10% forced-throw branch.
  const failedRolls = [.5, .5, .5, .5, .5, .5, .5, .15];
  t.mock.method(Math, "random", () => failedRolls.shift() ?? .5);
  const failed = runPassPlayPipeline(game, weakBacks, "QB", call);
  assert.equal(failed.blitzResult?.backBlocked, false);
  assert.deepEqual(failed.routes.map((route) => route.player), ["Receiver", "Blocking Back", "Other Back"]);

  t.mock.method(Math, "random", () => 0.05);
  const protectedLine = { ...context, players: [...context.players, { name: "Blocker", team: "Home", passProtect: 100, offStars: 100 }] };
  const linePickup = runPassPlayPipeline(game, protectedLine, "QB", { ...call, formation: { ...call.formation, LT: "Blocker" } });
  assert.equal(linePickup.blitzResult?.lineBlocked, true);
  assert.equal(linePickup.blitzResult?.backBlocked, false);
  assert.deepEqual(linePickup.routes.map((route) => route.player), ["Receiver", "Blocking Back", "Other Back"]);
});

test("cancelling the only scheduled route leaves no eligible targets and does not mutate the saved plan", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => 0.5);
  const { context, call } = blitzRouteContext();
  call.routes = { "Blocking Back": "Flat" };
  const state = runPassPlayPipeline(game, context, "QB", call);
  assert.deepEqual(state.routes, []);
  assert.deepEqual(state.opennessTrajectory, []);
  assert.equal(state.readLoop?.currentRead, null);
  assert.equal(state.target, undefined);
  assert.deepEqual(call.routes, { "Blocking Back": "Flat" });
});

test("route-jump deflections persist the guarding DB and remain incompletions on fourth down", t => {
  t.mock.method(Math, "random", () => .5);
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  const context = completionContext(1);
  context.settings.dbBeatWRAccuracyMultipliers = context.settings.dbBeatWRAccuracyMultipliers!.map(row => ({ ...row, multiplier: 1000 }));
  context.settings.pickAccuracyMultipliers = context.settings.pickAccuracyMultipliers!.map(row => ({ ...row, multiplier: 0 }));
  for (const down of [1, 4]) {
    const result = passPlay({ ...game, Down: down, Distance: 7 }, context, options);
    assert.equal(result.play.isComplete, false);
    assert.equal(result.play.defenseresult, "Deflection");
    assert.equal(result.play.tackler, "Corner");
    assert.equal(result.play.recoveredby, "");
    assert.equal(result.play.result, down === 4 ? "TO on Downs" : "Incomplete");
    assert.equal(result.game.Possession, down === 4 ? "Away" : "Home");
    if (down === 4) { assert.equal(result.game.Down, 1); assert.equal(result.game.Distance, 10); }
  }
});

test("non-blitz pressure can throw away or force a throw without a negative-time openness error", (t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  const context = completionContext(1);
  context.players = [...context.players, { name: "OL", team: "Home", passProtect: 1 },
    { name: "DL", team: "Away", passRush: 100 }];
  context.settings.timeToThrowRanges = [{ min: 0, max: 0, percentage: 100 }];
  const call: PlayCallOptions = { ...options, formation: { ...options.formation, C: "OL" },
    defense: [...options.defense!, { player: "DL", position: "DL1", align: "C" }] };
  for (const [hitRoll, responseRoll, expected] of [[.1, .05, "throw-away"], [.1, .15, "throw"], [.99, .1, "throw"]] as const) {
    // Six line rolls, two timing rolls, hit check, attribution, then response.
    const rolls = [...Array(8).fill(.5), hitRoll, ...(hitRoll < .27 ? [.5] : []), responseRoll];
    t.mock.method(Math, "random", () => rolls.shift() ?? .5);
    const state = runPassPlayPipeline(game, context, "QB", call);
    assert.equal(state.decision, expected);
    assert.equal(state.pressureHit?.hitter, hitRoll < .27 ? "DL" : undefined);
    assert.equal(state.readLoop, undefined);
    if (expected === "throw") {
      assert.equal(state.target?.player, "Receiver");
      assert.ok(state.throwCompletion);
    } else assert.equal(state.target, undefined);
  }
});

test("a secondary interception credits the guarding DB and resets possession/down/distance", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  t.mock.method(Math, "random", () => .5);
  const context = completionContext(1);
  context.settings.completionTable = [{ pastLos: 110, baseCompletion: 0 }];
  // Prevent the initial route jump and guarantee a pick after the ball-hawk gate.
  context.settings.dbBeatWRAccuracyMultipliers = context.settings.dbBeatWRAccuracyMultipliers!.map(row=>({ ...row, multiplier: 0 }));
  context.settings.pickAccuracyMultipliers = context.settings.pickAccuracyMultipliers!.map(row=>({ ...row, multiplier: 1000 }));
  context.players = context.players.map(player=>player.name === "Corner" ? { ...player, ballHawk: 99 } : player);
  const result = passPlay({ ...game, Down: 2, Distance: 7 }, context, options);
  assert.equal(result.play.result, "Interception");
  assert.equal(result.play.tackler, "Corner");
  assert.equal(result.play.recoveredby, "Corner");
  assert.equal(result.play.isComplete, false);
  assert.equal(result.play.defenseresult, "Interception");
  assert.equal(result.game.Possession, "Away");
  assert.equal(result.game.Down, 1);
  assert.equal(result.game.Distance, 10);
});


function postCatchFumbleContext() {
  const context = completionContext(8);
  context.players = context.players.filter(player => player.name !== "Lineman")
    .map(player => player.name === "Receiver" ? { ...player, ballsecurity: 1 }
      : player.name === "Corner" ? { ...player, strip: 100 } : player);
  return context;
}

test("post-YAC defensive recovery retains completion/yardage and credits receiver fumble and defender recovery", t => {
  t.mock.method(console, "debug", () => {});
  const logs = t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => .01);
  const previous = { ...game, Down: 2, Distance: 20 };
  const result = passPlay(previous, postCatchFumbleContext(), options);
  assert.equal(result.play.result, "Fumble");
  assert.equal(result.play.isComplete, true);
  assert.equal(result.play.isSack, false);
  assert.equal(result.play.recoveredby, "Corner");
  assert.equal(result.play.tackler, "Corner");
  assert.equal(result.play.turnover, "Yes");
  assert.equal(result.play.defenseresult, "Fumble");
  assert.equal(Number(result.play.yards), Number(result.play.airyards) + Number(result.play.yac));
  assert.equal(result.game.BallOn, Number(previous.BallOn) + Number(result.play.yards));
  assert.equal(result.game.Possession, "Away");
  assert.equal(result.game.Down, 1);
  assert.equal(result.game.Distance, 10);
  const check = logs.mock.calls.filter(call=>call.arguments[0] === "[Pass Engine] Post-catch fumble check");
  assert.equal(check.length, 1);
  assert.equal(check[0].arguments[1].yac, result.play.yac);
  const stats = aggregatePlayStats([result.play]);
  assert.equal(stats.get(String(result.play.player).toLowerCase().replace(/[^a-z0-9]/g, ""))?.Completions, 1);
  assert.equal(stats.get("receiver")?.Receptions, 1);
  assert.equal(stats.get("receiver")?.["Receiving Fumbles"], 1);
  assert.equal(stats.get("receiver")?.["Receiving Fumbles Lost"], 1);
  assert.equal(stats.get("corner")?.["Forced Fumbles"], 1);
  assert.equal(stats.get("corner")?.["Fumble Recoveries"], 1);
});

test("receiver recovery keeps the completed gain and normal series without marking a turnover", t => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  // A defensive-recovery run locates the final recovery draw without coupling
  // this test to the number of preceding route/accuracy/YAC random draws.
  const random = t.mock.method(Math, "random", () => .01);
  const previous = { ...game, Down: 2, Distance: 20 };
  passPlay(previous, postCatchFumbleContext(), options);
  const rolls = [...Array(random.mock.calls.length - 1).fill(.01), .99];
  t.mock.method(Math, "random", () => { assert.ok(rolls.length); return rolls.shift()!; });
  const result = passPlay(previous, postCatchFumbleContext(), options);
  assert.equal(result.play.result, "Fumble");
  assert.equal(result.play.isComplete, true);
  assert.equal(result.play.recoveredby, "Receiver");
  assert.equal(result.play.turnover, "");
  assert.equal(result.game.Possession, "Home");
  assert.equal(result.game.Down, 3);
  assert.equal(result.game.Distance, 20 - Number(result.play.yards));
  const stats = aggregatePlayStats([result.play]);
  assert.equal(stats.get("receiver")?.["Receiving Fumbles"], 1);
  assert.equal(stats.get("receiver")?.["Receiving Fumbles Lost"] ?? 0, 0);
  assert.equal(rolls.length, 0);
});

test("fourth-down receiver recovery short of the sticks still turns the ball over on downs", t => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  const random = t.mock.method(Math, "random", () => .01);
  const previous = { ...game, Down: 4, Distance: 20 };
  passPlay(previous, postCatchFumbleContext(), options);
  const rolls = [...Array(random.mock.calls.length - 1).fill(.01), .99];
  t.mock.method(Math, "random", () => rolls.shift()!);
  const result = passPlay(previous, postCatchFumbleContext(), options);
  assert.equal(result.play.recoveredby, "Receiver");
  assert.equal(result.play.turnover, "Yes");
  assert.equal(result.game.Possession, "Away");
  assert.equal(result.game.Down, 1);
  assert.equal(result.game.Distance, 10);
});

test("touchdowns, safeties, incompletions and interceptions skip the post-catch fumble check", t => {
  t.mock.method(console, "debug", () => {});
  const logs = t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => .5);
  const context = postCatchFumbleContext();
  const td = passPlay({ ...game, BallOn: 99 }, context, options);
  assert.equal(td.play.result, "Touchdown");
  assert.equal(td.play.recoveredby, "");
  const incompleteContext = postCatchFumbleContext();
  incompleteContext.settings.completionTable = [{ pastLos: 110, baseCompletion: 0 }];
  assert.equal(passPlay(game, incompleteContext, options).play.isComplete, false);
  const interceptedContext = postCatchFumbleContext();
  interceptedContext.settings.dbBeatWRAccuracyMultipliers = interceptedContext.settings.dbBeatWRAccuracyMultipliers!.map(row=>({ ...row, multiplier: 1000 }));
  interceptedContext.settings.pickAccuracyMultipliers = interceptedContext.settings.pickAccuracyMultipliers!.map(row=>({ ...row, multiplier: 1000 }));
  assert.equal(passPlay(game, interceptedContext, options).play.result, "Interception");
  const safetyContext = postCatchFumbleContext();
  safetyContext.settings.routeTypeAirYards = [{ routeType: "Quick", minAirYards: 0, maxAirYards: 0 }];
  safetyContext.settings.yacBasis = [{ maxAirYards: 100, openness: [{ maxOpen: 89, basis: 0 }] }];
  // A zero-yard catch at the offense's goal line exercises the safety exclusion.
  const safety = passPlay({ ...game, BallOn: 0 }, safetyContext, options);
  assert.equal(safety.play.result, "Safety");
  assert.ok(!logs.mock.calls.some(call=>call.arguments[0] === "[Pass Engine] Post-catch fumble check"));
});

test("Quick screens sample -3 through 0 and resolve completed catches behind the line", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  const context = completionContext(0);
  context.settings.routeTypeAirYards = [{ routeType: "Quick", minAirYards: -3, maxAirYards: 0 }];
  for (const [roll, expected] of [[0, -3], [.25, -2], [.5, -1], [.999, 0]] as const) {
    t.mock.method(Math, "random", () => roll);
    assert.equal(assignRoutes(game, context, options)[0].airYards, expected);
  }
  // A zero YAC basis isolates the credited negative catch gain.
  context.settings.routeTypeAirYards = [{ routeType: "Quick", minAirYards: -3, maxAirYards: -3 }];
  context.settings.yacBasis = [{ maxAirYards: 100, openness: [{ maxOpen: 89, basis: 0 }] }];
  t.mock.method(Math, "random", () => .5);
  for (const possession of ["Home", "Away"] as const) {
    const directionalContext = { ...context, players: context.players.map(player=> possession === "Away"
      ? { ...player, team: player.team === "Home" ? "Away" : "Home" } : player) };
    const result = passPlay({ ...game, BallOn: 50, Possession: possession }, directionalContext, options);
    assert.equal(result.play.isComplete, true);
    assert.equal(result.play.airyards, -3);
    assert.equal(result.play.yac, 0);
    assert.equal(result.play.yards, -3);
    assert.equal(result.game.BallOn, possession === "Home" ? 47 : 53);
    assert.equal(result.game.Distance, Number(game.Distance) + 3);
  }
});
