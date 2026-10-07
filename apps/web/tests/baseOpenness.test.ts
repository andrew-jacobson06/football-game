import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRouteOpennessSettings } from "../../api/src/services/routeOpennessSettings.ts";
import { calculateBaseOpenness, getRouteBaseOpenness, calculateRouteOpennessInputs } from "../src/components/league/gameplay/engine/routeOpenness.ts";

const settings = parseRouteOpennessSettings([
  ["Curve Type Openness", 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
  ["Quick", 20, 40, 50, 55, 40, 35, 15],
  ["Break", 5, 20, 40, 60, 65, 50, 30],
  ["DeepSustain", 0, 10, 25, 55, 63, 60, 30],
  ["DoubleMove", 0, 5, 33, 70, 68, 50, 25],
  ["RouteTreeDetails", "Type", "Timing Mod", "Release %", "Stem %", "Break %", "Sustain %", "Curve Type"],
  ["Dig", "Complex", 0.2, 10, 45, 35, 10, "Break"],
  ["baseTTO", "routeType", "TTO"], ["baseTTO_Test", "Test", 1.8],
  ["Phase", "Speed", "Accel", "Route/Coverage", "Size"],
  ["Release", 0.7, 1.5, 1, 0.8], ["Stem", 1.5, 0.75, 1.5, 0.25],
  ["Break", 0.85, 1, 1.75, 0.4], ["Sustain", 2, 0.25, 0.95, 0.8],
  ["BaseImpact Calcs", "base", "max", "diffweight"],
  ["Speed", 5, 10, 0.25], ["Accel", 5, 10, 0.25], ["Route/Coverage", 5, 10, 0.25], ["Size", 3, 6, 0.15],
]);

test("the supplied Break curve at 1.4 seconds of a 2-second TTO gives 36", () => {
  assert.ok(Math.abs(calculateBaseOpenness(settings, "Break", 2, 1.4) - 36) < 1e-10);
});

test("returns every exact curve point and interpolates ascending and descending intervals", () => {
  for (const [curve, points] of Object.entries(settings.curves)) {
    for (const point of points) assert.equal(calculateBaseOpenness(settings, curve, 4, point.time * 4), point.openness);
    for (let index = 1; index < points.length; index++) {
      const prev = points[index - 1], next = points[index];
      assert.equal(calculateBaseOpenness(settings, curve, 4, (prev.time + next.time) * 2), (prev.openness + next.openness) / 2);
    }
  }
});

test("before the first point it interpolates from zero; beyond the last it holds the last value", () => {
  assert.equal(calculateBaseOpenness(settings, "Break", 2, 0), 0);
  assert.equal(calculateBaseOpenness(settings, "Break", 2, 0.25), 2.5);
  assert.equal(calculateBaseOpenness(settings, "Break", 2, 20), 30);
});

test("route queries use the sheet-selected curve and derived TTO", () => {
  const receiver = { speed: 60, acceleration: 60, routeRunning: 60, size: 60 };
  const defender = { ...receiver, coverage: 60 };
  const inputs = calculateRouteOpennessInputs(settings, "Dig", "Test", receiver, defender);
  const route = { TTO: inputs.timeToOpen, curveType: inputs.curveType };
  assert.equal(route.TTO, 2);
  assert.equal(route.curveType, "Break");
  assert.ok(Math.abs(getRouteBaseOpenness(settings, route, 1.4) - 36) < 1e-10);
  const updated = { ...settings, curves: { ...settings.curves, Break: [{ time: 0.5, openness: 10 }, { time: 1, openness: 50 }] } };
  assert.equal(getRouteBaseOpenness(updated, route, 1.5), 30);
});

test("invalid inputs and missing curve settings fail explicitly", () => {
  assert.throws(() => calculateBaseOpenness(settings, "Break", 0, 1), /positive TTO/);
  assert.throws(() => calculateBaseOpenness(settings, "Break", 2, -1), /elapsed time/);
  assert.throws(() => calculateBaseOpenness(settings, "Missing", 2, 1), /Missing/);
  assert.throws(() => calculateBaseOpenness(settings, "", 2, 1), /Curve Type/);
  assert.throws(() => calculateBaseOpenness({ curves: { Empty: [] } }, "Empty", 2, 1), /invalid openness curve/);
  assert.throws(() => calculateBaseOpenness({ curves: { Duplicate: [{ time: 1, openness: 10 }, { time: 1, openness: 20 }] } }, "Duplicate", 2, 1), /invalid openness curve/);
});
