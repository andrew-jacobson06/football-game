import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHandsImpactSettings } from "./handsSettings.js";
import { parseTimeToThrowSettings } from "./timeToThrowSettings.js";
import { parseRouteOpennessSettings } from "./routeOpennessSettings.js";

const rows = [["Hands impact based on openness"], ["Open Score", "min open", "max open", "Hands Impact"],
  ["0-20", 0, 20, "50.00%"], ["21-29", 21, 29, "90.00%"], ["30-39", 30, 39, "100.00%"],
  ["40-49", 40, 49, "100.00%"], ["50–59", 50, 59, "80.00%"], ["60–69", 60, 69, "75.00%"],
  ["70–79", 70, 79, "55.00%"], ["80–89", 80, 89, "35.00%"], ["90–100", 90, -1, "25.00%"]];

test("loads the supplied hands table at EOF, offsets and formatted titles", () => {
  const parsed = parseHandsImpactSettings(rows.map((row) => ["", "", ...row]));
  assert.equal(parsed.length, 9);
  assert.deepEqual(parsed.map((row) => row.handsImpact), [0.5, 0.9, 1, 1, 0.8, 0.75, 0.55, 0.35, 0.25]);
  assert.equal(parsed[8].maxOpen, null);
  assert.deepEqual(parseHandsImpactSettings([["Hands impact\nbased on openness"], ...rows.slice(1)]), parsed);
});

test("accepts numeric percentages/fractions and rejects invalid true values", () => {
  for (const impact of ["50%", 50, 0.5]) {
    assert.equal(parseHandsImpactSettings([rows[0], rows[1], ["0-20", 0, 20, impact]])[0].handsImpact, 0.5);
  }
  assert.throws(() => parseHandsImpactSettings([rows[0], rows[1], ["0-20", 0, 20, "bad"]]), /row 3/);
  assert.throws(() => parseHandsImpactSettings([rows[0]]), /headers/);
  assert.deepEqual(parseHandsImpactSettings([]), []);
});

test("neighboring parsers stop at the hands table without a separator", () => {
  assert.equal(parseTimeToThrowSettings([["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], [0, 1, 0.5, "100%"], ...rows]).length, 1);
  assert.deepEqual(Object.keys(parseRouteOpennessSettings([["Curve Type Openness", 0.25], ["Quick", 20], ...rows]).curves), ["Quick"]);
});
