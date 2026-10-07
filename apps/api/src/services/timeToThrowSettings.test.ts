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

test("ignores the zero placeholder when its percentage is formatted as 0%", () => {
  const rows = [
    ["time_to_Throw"], ["Min", "Max", "Avg", "Pct"],
    ["", "0", "0", "0.0%"], ["0", "1.5", "0.75", "5.0%"],
  ];
  assert.deepEqual(parseTimeToThrowSettings(rows), [{ min: 0, max: 1.5, percentage: 5 }]);
});

test("stops at adjacent openness tables without blank separator rows", () => {
  for (const title of ["Curve Type Openness", "Curve Type", "Phase", "RouteTreeDetails", "baseTTO", "BaseImpact Calcs"]) {
    const rows = [
      ["", "time_to_Throw"], ["", "Min", "Max", "Avg", "Pct"],
      ["", 0, 1.5, 0.75, "5.0%"],
      ["", title, 0.25, 0.5, 0.75],
      ["", "Quick", 20, 40, 50],
    ];
    assert.deepEqual(parseTimeToThrowSettings(rows), [{ min: 0, max: 1.5, percentage: 5 }]);
  }
});

test("the renamed curve header at Settings row 175 ends the eight time-to-throw ranges", () => {
  const rows: unknown[][] = [
    ...Array.from({ length: 163 }, () => []),
    ["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], ["", 0, 0, ""],
    ["0", "1.5", "0.75", "5.0%"], ["1.5", "2", "1.75", "16.0%"],
    ["2", "2.5", "2.25", "20.0%"], ["2.5", "2.8", "2.65", "11.0%"],
    ["2.8", "3.1", "2.95", "10.0%"], ["3.1", "3.4", "3.25", "10.0%"],
    ["3.4", "3.7", "3.55", "9.0%"], ["3.7", "4.5", "4.1", "18.0%"],
    ["Curve Type Openness", "0.25", "0.5", "0.75", "1", "1.25", "1.5", "2"],
    ["Quick", 20, 40, 50, 55, 40, 35, 15],
  ];
  assert.equal(rows[174][0], "Curve Type Openness");
  const ranges = parseTimeToThrowSettings(rows);
  assert.equal(ranges.length, 8);
  assert.deepEqual(ranges.at(-1), { min: 3.7, max: 4.5, percentage: 18 });
});

test("real invalid ranges still report the workbook row and values", () => {
  assert.throws(() => parseTimeToThrowSettings([
    ["Other setting"], ["time_to_Throw"], ["Min", "Max", "Avg", "Pct"],
    [0, 1.5, 0.75, "5%"], [2, 1, 1.5, "10%"],
  ]), /Settings row 5 \(Min=2, Max=1, Pct="10%"\)/);
  assert.throws(() => parseTimeToThrowSettings([
    ["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], ["", 0, 0, "5%"],
  ]), /Invalid range/);
});
