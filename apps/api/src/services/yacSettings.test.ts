import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYACSettings } from "./yacSettings.js";
import { parseRouteOpennessSettings } from "./routeOpennessSettings.js";
import { parseTimeToThrowSettings } from "./timeToThrowSettings.js";

const rows = [["YAC Basis by airyards and openness"], ["", 39, 49, 59, 69, 79, 89],
  [-1, 1.5, 3, 4.3, 5.6, 7.2, 9.5], [4, 1.25, 2.8, 4, 5.2, 6.7, 8.8],
  [9, 1.1, 2.2, 3.2, 4.3, 5.6, 7.5], [14, 0.75, 1.7, 2.5, 3.4, 4.5, 6.1],
  [19, 0.5, 1.3, 2, 2.8, 3.8, 5.2], [29, 0.25, 1, 1.6, 2.3, 3.2, 4.5], [100, 0.1, 0.7, 1.2, 1.8, 2.6, 3.8],
  ["YAC multiplier by throw type"], ["", 4, 9, 14, 19, 29, 100],
  ["Perfect", 1.1, 1.1, 1.25, 1.33, 1.4, 1.5], ["Accurate", 0, 0, 0, 0, 0, 0],
  ["Close", 0.9, 0.9, 0.85, 0.8, 0.75, 0.5], ["Catchable", 0.5, 0.5, 0.45, 0.4, 0.35, 0.25],
  ["Off Target", 0, 0, 0, 0, 0, 0]];

test("loads both YAC matrices with adjacent sections, offset columns and no trailing row", () => {
  const parsed = parseYACSettings(rows.map((row) => ["", "", ...row]));
  assert.equal(parsed.yacBasis.length, 7);
  assert.equal(parsed.yacBasis[0].maxAirYards, -1);
  assert.deepEqual(parsed.yacBasis[2].openness[2], { maxOpen: 59, basis: 3.2 });
  assert.equal(parsed.yacThrowMultipliers.length, 5);
  assert.equal(parsed.yacThrowMultipliers[0].depths[5].multiplier, 1.5);
  assert.equal(parsed.yacThrowMultipliers[1].depths[0].multiplier, 0);
});

test("missing matrices stay absent and malformed cells/headers report errors", () => {
  assert.deepEqual(parseYACSettings([]), { yacBasis: [], yacThrowMultipliers: [] });
  const invalid = rows.map((row) => [...row]);
  invalid[2][1] = "bad";
  assert.throws(() => parseYACSettings(invalid), /Settings row 3/);
  assert.throws(() => parseYACSettings([rows[0]]), /headers/);
  assert.throws(() => parseYACSettings(rows.slice(0, -1)), /all five/);
});

test("existing parsers stop before adjacent YAC matrices", () => {
  assert.equal(parseTimeToThrowSettings([["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], [0, 1, 0.5, "100%"], ...rows]).length, 1);
  assert.deepEqual(Object.keys(parseRouteOpennessSettings([["Curve Type Openness", 0.25], ["Quick", 20], ...rows]).curves), ["Quick"]);
});
