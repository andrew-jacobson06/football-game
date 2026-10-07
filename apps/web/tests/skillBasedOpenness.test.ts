import { test } from "node:test";
import assert from "node:assert/strict";
import { getSkillBasedOpennessMod, getRouteOpenness, getCurrentRouteOpenness } from "../src/components/league/gameplay/engine/routeOpenness.ts";

const route = {
  player: "Receiver",
  TTO: 2,
  curveType: "Break",
  phaseOpenness: [
    { start: 0, end: 0.5, duration: 0.5, phaseImpact: 10 },
    { start: 0.5, end: 0.5, duration: 0, phaseImpact: 0 },
    { start: 0.5, end: 1.5, duration: 1, phaseImpact: -20 },
    { start: 1.5, end: 2, duration: 0.5, phaseImpact: 30 },
  ],
};
const settings = { curves: { Break: [{ time: 0.5, openness: 20 }, { time: 0.75, openness: 40 }] } };

test("accumulates completed phases and proportional positive or negative active impacts", () => {
  for (const [time, expected] of [[0, 0], [0.25, 5], [0.5, 10], [1, 0], [1.5, -10], [1.75, 5], [2, 20], [10, 20]]) {
    assert.equal(getSkillBasedOpennessMod(route, time), expected);
  }
});

test("future phases and gaps add nothing; empty and zero-duration phases are safe", () => {
  const delayed = { phaseOpenness: [
    { start: 1, end: 2, duration: 1, phaseImpact: 12 },
    { start: 3, end: 4, duration: 1, phaseImpact: 8 },
  ] };
  assert.equal(getSkillBasedOpennessMod(delayed, 0.5), 0);
  assert.equal(getSkillBasedOpennessMod(delayed, 1), 0);
  assert.equal(getSkillBasedOpennessMod(delayed, 2.5), 12);
  assert.equal(getSkillBasedOpennessMod({ phaseOpenness: [] }, 5), 0);
  // Completion is tested before division, including an instantaneous phase.
  assert.equal(getSkillBasedOpennessMod({ phaseOpenness: [{ start: 1, end: 1, duration: 0, phaseImpact: 7 }] }, 1), 7);
});

test("full openness adds the cumulative skill modifier to interpolated base openness", () => {
  const result = getRouteOpenness(settings, route, 1.4);
  assert.ok(Math.abs(result.baseOpenness - 36) < 1e-10);
  assert.ok(Math.abs(result.skillBasedOpennessMod - (-8)) < 1e-10);
  assert.ok(Math.abs(result.openness - 28) < 1e-10);
});

test("each receiver uses its own windows at the same time without rerolls or mutations", (t) => {
  t.mock.method(Math, "random", () => { throw new Error("Queries must not reroll"); });
  const other = { ...route, player: "Other", TTO: 4,
    phaseOpenness: route.phaseOpenness.map((phase) => ({ ...phase,
      start: phase.start * 2, end: phase.end * 2, duration: phase.duration * 2 })) };
  const routes = [route, other];
  const before = structuredClone(routes);
  const results = getCurrentRouteOpenness(settings, routes, 1);
  assert.deepEqual(results.map(({ player, skillBasedOpennessMod }) => ({ player, skillBasedOpennessMod })), [
    { player: "Receiver", skillBasedOpennessMod: 0 }, { player: "Other", skillBasedOpennessMod: 10 },
  ]);
  assert.deepEqual(getCurrentRouteOpenness(settings, routes, 1), results);
  assert.deepEqual(routes, before);
});

test("invalid elapsed times and phase data fail explicitly", () => {
  for (const time of [-1, NaN, Infinity])
    assert.throws(() => getSkillBasedOpennessMod(route, time), /elapsed time/);
  for (const phase of [
    { start: 0, end: 1, duration: 0, phaseImpact: 3 },
    { start: 2, end: 1, duration: 1, phaseImpact: 3 },
    { start: 0, end: 1, duration: 1, phaseImpact: NaN },
  ]) assert.throws(() => getSkillBasedOpennessMod({ phaseOpenness: [phase] }, 1), /Invalid phase/);
});
