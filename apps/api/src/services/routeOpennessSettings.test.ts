import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRouteOpennessSettings } from "./routeOpennessSettings.js";

const tables = [
  ["Curve Type", 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2],
  ["Quick", 20, 40, 50, 55, 40, 35, 15],
  ["Break", 5, 20, 40, 60, 65, 50, 30],
  ["DeepSustain", 0, 10, 25, 55, 63, 60, 30],
  ["DoubleMove", 0, 5, 33, 70, 68, 50, 25],
  ["Phase", "Speed", "Accel", "Route/Coverage", "Size"],
  ["Release", 0.7, 1.5, 1, 0.8],
  ["Stem", 1.5, 0.75, 1.5, 0.25],
  ["Break", 0.85, 1, 1.75, 0.4],
  ["Sustain", 2, 0.25, 0.95, 0.8],
  ["RouteTreeDetails", "Type", "Timing Mod", "Release %", "Stem %", "Break %", "Sustain %"],
  ["Flat", "Simple", -0.2, 35, 0, 5, 60],
  ["Sluggo", "Complex", 0.3, 15, 15, 45, 25],
  ["baseTTO", "routeType", "TTO"],
  ["baseTTO_Quick", "Quick", 1],
  ["baseTTO_Deep", "Deep", 3.2],
  ["BaseImpact Calcs", "base", "max", "diffweight"],
  ["Speed", 5, 10, 0.25],
  ["Accel", 5, 10, 0.25],
  ["Route/Coverage", 5, 10, 0.25],
  ["Size", 3, 6, 0.15],
  [],
  ["Unrelated setting", "not a number"],
];

test("loads all openness tables in offset columns with section boundaries", () => {
  const settings = parseRouteOpennessSettings(tables.map((row) => ["", "", ...row]));
  assert.equal(settings.curves.Quick.length, 7);
  assert.deepEqual(settings.curves.DeepSustain[0], { time: 0.25, openness: 0 });
  assert.deepEqual(settings.curves.DoubleMove.at(-1), { time: 2, openness: 25 });
  assert.equal(settings.phaseWeights.Break.routeCoverage, 1.75);
  assert.equal(settings.routeTree.Flat.phases.Stem, 0);
  assert.equal(settings.routeTree.Flat.timingMod, -0.2);
  assert.equal(settings.routeTree.Sluggo.type, "Complex");
  assert.equal(settings.baseTTO.Deep, 3.2);
  assert.deepEqual(settings.baseImpacts.Size, { base: 3, max: 6, diffWeight: 0.15 });
  assert.equal(Object.keys(settings.baseImpacts).length, 4);
});

test("uses current workbook values and rejects malformed numeric data", () => {
  const updated = tables.map((row) => [...row]);
  updated[14][2] = 1.8;
  assert.equal(parseRouteOpennessSettings(updated).baseTTO.Quick, 1.8);
  updated[14][2] = "invalid";
  assert.throws(() => parseRouteOpennessSettings(updated), /base TTO/);
});
