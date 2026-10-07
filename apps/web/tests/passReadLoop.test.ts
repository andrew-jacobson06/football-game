import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateReadDefenseModifier, runUnpressuredReadLoop } from "../src/components/league/gameplay/engine/passReadLoop.ts";

const settings = { curves: { Break: [{ time: 0.5, openness: 20 }, { time: 1, openness: 60 }] } };
const routes = ["WR1", "WR2"].map((player) => ({ player, TTO: 1, curveType: "Break",
  phaseOpenness: [{ start: 0, end: 1, duration: 1, phaseImpact: 8 }] }));

test("starts at zero/read one, advances by quarters, and stops when the read reaches TTO", () => {
  let rolls = 0;
  const state = runUnpressuredReadLoop(settings, routes, 2, 0, {}, () => { rolls++; return 0; });
  assert.equal(state.currentRead, 1);
  assert.equal(state.currentReadPlayer, "WR1");
  assert.equal(state.currentTime, 1);
  assert.equal(state.stopReason, "read-ready");
  assert.deepEqual(state.snapshots.map((snapshot) => snapshot.currentTime), [0.25, 0.5, 0.75]);
  assert.equal(rolls, 6);
  assert.deepEqual(state.snapshots[0].receivers[0], {
    player: "WR1", baseOpenness: 10, skillBasedOpennessMod: 2, openness: 12,
    readDefenseAdjustment: 23, perceivedOpenness: 35,
  });
});

test("each receiver gets an independent sign at each time without changing actual openness", () => {
  const before = structuredClone(routes);
  const rolls = [0.1, 0.9, 0.9, 0.1];
  const state = runUnpressuredReadLoop(settings, routes, 0.5, 0, {}, () => rolls.shift()!);
  assert.deepEqual(state.snapshots.map((snapshot) => snapshot.receivers.map((r) => r.readDefenseAdjustment)), [[23, -23], [-23, 23]]);
  assert.equal(state.snapshots[0].receivers[1].perceivedOpenness, -11);
  assert.deepEqual(routes, before);
  assert.equal(state.stopReason, "time-to-throw");
});

test("uses the exact polynomial and respects configured read order", () => {
  const rating = 80;
  const expected = 0.00000055296676 * rating ** 4 - 0.00014271986272 * rating ** 3 +
    0.011884760129588 * rating ** 2 - 0.536559194662642 * rating + 23;
  assert.equal(calculateReadDefenseModifier(rating), expected);
  const deeper = [routes[0], { ...routes[1], TTO: 2 }];
  const state = runUnpressuredReadLoop(settings, deeper, 1.5, rating, { WR1: "2", WR2: "1" }, () => 0);
  assert.equal(state.currentReadPlayer, "WR2");
  assert.equal(state.snapshots.length, 6);
  assert.equal(state.snapshots[0].receivers[0].readDefenseAdjustment, expected);
  assert.equal(runUnpressuredReadLoop(settings, deeper, 0, rating, { WR2: "Primary" }).currentReadPlayer, "WR2");
});

test("checks time budget before each full quarter step, including non-quarter budgets", () => {
  const state = runUnpressuredReadLoop(settings, routes, 0.3, 50, {}, () => 0.5);
  assert.equal(state.currentTime, 0.5);
  assert.equal(state.snapshots.length, 2);
  assert.equal(runUnpressuredReadLoop(settings, routes, 0, 50).snapshots.length, 0);
  assert.equal(runUnpressuredReadLoop(settings, [], 2, 50).stopReason, "no-routes");
  assert.throws(() => runUnpressuredReadLoop(settings, routes, Infinity, 50), /time to throw/);
  assert.throws(() => calculateReadDefenseModifier(NaN), /read defense/);
});
