import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateRouteOpennessInputs, calculateRoutePhaseImpacts, type RouteOpennessSettings } from "../src/components/league/gameplay/engine/routeOpenness.ts";
import { assignRoutes, runPassPlayPipeline } from "../src/components/league/gameplay/engine/passEngine.ts";
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
    routeTypeAirYards: [{ routeType: "Quick", minAirYards: 1, maxAirYards: 2 }], routesByDepth: { Quick: ["Flat"] } }, historyLength: 0,
};
const options: PlayCallOptions = { formation: { WR1: "Receiver" }, routes: { Receiver: "Flat" }, routeDepths: { Receiver: "Quick" }, defense: [{ player: "Corner", position: "DB1", align: "WR1" }] };

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
  assert.equal(state.readLoop?.currentTime, 1);
  assert.equal(state.readLoop?.stopReason, "read-ready");
  assert.deepEqual(state.readLoop?.snapshots.map((snapshot) => snapshot.currentTime), [0.25, 0.5, 0.75]);
  const perceived = state.readLoop!.snapshots[0].receivers[0];
  assert.equal(perceived.player, "Receiver");
  assert.equal(perceived.openness, perceived.baseOpenness + perceived.skillBasedOpennessMod);
  assert.equal(perceived.perceivedOpenness, perceived.openness + perceived.readDefenseAdjustment);
});

test("an unblocked blitz skips the unpressured read loop", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(Math, "random", () => 0.99);
  const blitzContext = { ...ctx, players: [...ctx.players,
    { name: "Blitzer", team: "Away", defPos: "LB", passRush: 60, tackling: 60, defStars: 1 }] };
  const state = runPassPlayPipeline(game, blitzContext, "QB", { ...options, blitz: true,
    defense: [...options.defense!, { player: "Blitzer", position: "LB1" }] });
  assert.deepEqual(state.pressure, ["Blitzer"]);
  assert.equal(state.readLoop, undefined);
  assert.ok(state.log.some((message) => message.includes("Unpressured read loop skipped")));
});
