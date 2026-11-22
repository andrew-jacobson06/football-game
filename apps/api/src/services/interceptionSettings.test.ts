import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInterceptionSettings } from "./interceptionSettings.js";
import { parseJumpSettings } from "./jumpSettings.js";
import { parseRouteOpennessSettings } from "./routeOpennessSettings.js";
import { parseTimeToThrowSettings } from "./timeToThrowSettings.js";

const rows = [
  ["DB beats WR to ball based on accuracy", "multiplier"],
  ["Perfect", .1], ["Accurate", .5], ["Close", .75], ["Catchable", 1], ["Off Target", 1.5],
  ["Pick Multiplier based on accuracy", "multiplier"],
  ["Perfect", .1], ["Accurate", .25], ["Close", .6], ["Catchable", 1], ["Off Target", 1.5],
];

test("reads both dynamic multiplier tables at offset columns, adjacent and at EOF", () => {
  const result = parseInterceptionSettings(rows.map(row => ["", "", ...row]));
  assert.equal(result.dbBeatWRAccuracyMultipliers.length, 5);
  assert.deepEqual(result.dbBeatWRAccuracyMultipliers[2], { throwType: "Close", multiplier: .75 });
  assert.deepEqual(result.pickAccuracyMultipliers[2], { throwType: "Close", multiplier: .6 });
  const changed = structuredClone(rows);
  changed[3][1] = "2.75";
  assert.equal(parseInterceptionSettings(changed).dbBeatWRAccuracyMultipliers[2].multiplier, 2.75);
});

test("missing tables stay absent; incomplete, invalid and duplicate rows fail clearly", () => {
  assert.deepEqual(parseInterceptionSettings([]), { dbBeatWRAccuracyMultipliers: [], pickAccuracyMultipliers: [] });
  for (const value of ["", -1, "oops", Infinity]) {
    const invalid = structuredClone(rows); invalid[2][1] = value;
    assert.throws(() => parseInterceptionSettings(invalid), /Settings row 3/);
  }
  assert.throws(() => parseInterceptionSettings(rows.slice(0, 5)), /all five/);
  const duplicate = structuredClone(rows); duplicate[2][0] = "Perfect";
  assert.throws(() => parseInterceptionSettings(duplicate), /Invalid/);
  assert.throws(() => parseInterceptionSettings([[rows[0][0], "wrong"]]), /header/);
});

test("neighboring parsers stop at either new table without separator rows", () => {
  for (const tail of [rows, rows.slice(6)]) {
    assert.deepEqual(parseTimeToThrowSettings([["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], [0, 1, .5, 100], ...tail]), [{ min: 0, max: 1, percentage: 100 }]);
    assert.equal(parseRouteOpennessSettings([["BaseImpact Calcs", "base", "max", "diffweight"], ["Speed", 5, 10, .25], ...tail]).baseImpacts.Speed.base, 5);
    assert.deepEqual(parseJumpSettings([["JUMP Based on Route"], ["Route", "Jump Chance Multiplier"], ["ALL ELSE", "x1"], ...tail]).jumpRoutes, [{ route: "ALL ELSE", multiplier: 1 }]);
  }
});
