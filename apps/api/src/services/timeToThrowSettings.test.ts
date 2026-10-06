import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTimeToThrowSettings } from "./timeToThrowSettings.js";

test("finds an offset Settings table and ignores placeholder and other tables", () => {
  const rows = [
    ["Other setting", 3],
    ["", "time_to_Throw"],
    ["", "Min", "Max", "Avg", "Pct"],
    ["", "", 0, 0, ""],
    ["", 0, 1.5, 0.75, "5.0%"],
    ["", 1.5, 2, 1.75, "16.0%"],
    [],
    ["", "another_table", 99, 0, "100%"],
  ];
  assert.deepEqual(parseTimeToThrowSettings(rows), [
    { min: 0, max: 1.5, percentage: 5 },
    { min: 1.5, max: 2, percentage: 16 },
  ]);
});

test("absent table stays absent; malformed table is rejected", () => {
  assert.deepEqual(parseTimeToThrowSettings([["TNTT_", 1]]), []);
  assert.throws(() => parseTimeToThrowSettings([["time_to_Throw"]]), /headers/);
  assert.throws(() => parseTimeToThrowSettings([
    ["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], [2, 1, 1.5, "10%"],
  ]), /Invalid range/);
});
