import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAccuracySettings } from "./accuracySettings.js";
import { parseCompletionSettings } from "./completionSettings.js";
import { parseRouteOpennessSettings } from "./routeOpennessSettings.js";
import { parseTimeToThrowSettings } from "./timeToThrowSettings.js";

const rows = [["Accuracy Mod"], ["Throw Type", "MIN", "MAX"],
  ["Perfect", 10, 20], ["Accurate", 5, 9], ["Close", -4, 4], ["Catchable", -9, -5], ["Off Target", -20, -10]];

test("loads accuracy ranges in offset columns at EOF and with formatted titles", () => {
  const parsed = parseAccuracySettings(rows.map((row) => ["", "", ...row]));
  assert.equal(parsed.length, 5);
  assert.deepEqual(parsed[4], { throwType: "Off Target", min: -20, max: -10 });
  assert.deepEqual(parseAccuracySettings([["Accuracy\nMod"], ...rows.slice(1)]), parsed);
  assert.deepEqual(parseAccuracySettings([...rows, ["Another Table", "bad", "bad"]]), parsed);
});

test("rejects malformed or incomplete accuracy tables and keeps absent settings absent", () => {
  assert.deepEqual(parseAccuracySettings([]), []);
  assert.throws(() => parseAccuracySettings(rows.slice(0, -1)), /all five/);
  const invalid = rows.map((row) => [...row]);
  invalid[2][1] = "bad";
  assert.throws(() => parseAccuracySettings(invalid), /row 3 for Perfect/);
});

test("adjacent Settings tables stop before Accuracy Mod", () => {
  assert.equal(parseTimeToThrowSettings([["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], [0, 1, 0.5, "100%"], ...rows]).length, 1);
  assert.deepEqual(Object.keys(parseRouteOpennessSettings([["Curve Type Openness", 0.25], ["Quick", 20], ...rows]).curves), ["Quick"]);
  assert.equal(parseCompletionSettings([["Openness Completion Modifier"], ["Open Score", "min open", "max open", "min adjust", "max adjust"],
    ["90–100", 90, -1, 12, 20], ...rows]).opennessCompletionModifiers.length, 1);
});
