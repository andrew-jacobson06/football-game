import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQBDecisionSettings } from "./qbDecisionSettings.js";
import { parseTimeToThrowSettings } from "./timeToThrowSettings.js";
import { parseRouteOpennessSettings } from "./routeOpennessSettings.js";

const rows = [
  ["QB Decision Table"],
  ["Open Score", "perceived max", "Label", "What it means on the field", "Base Notice", "Notice if Primary"],
  ["0–10", 10, "Erased", "", "NA", "NA"],
  ["11–20", 20, "Blanketed", "", "NA", "NA"],
  ["21–35", 35, "Covered", "", "NA", 5],
  ["36–49", 49, "Tight window", "", "NA", 15],
  ["50–59", 59, "Slightly open", "", 5, 30],
  ["60–69", 69, "Open", "", 20, 50],
  ["70–79", 79, "Clearly open", "", 35, 67],
  ["80–89", 89, "Very open", "", 75, 89],
  ["90–100", 1000, "Wide open / busted", "", 90, 99],
];

test("loads all decision bands at offset columns and stops at neighboring tables", () => {
  const table = parseQBDecisionSettings([...rows, ["RouteTreeDetails", "Type", "Timing Mod"]].map((row) => ["", "", ...row]));
  assert.equal(table.length, 9);
  assert.deepEqual(table[6], { perceivedMax: 79, label: "Clearly open", baseNotice: 35, noticeIfPrimary: 67 });
  assert.equal(table[0].noticeIfPrimary, null);
  assert.equal(table[8].perceivedMax, 1000);
});

test("accepts percent text and zero; missing or malformed tables fail clearly", () => {
  assert.deepEqual(parseQBDecisionSettings([]), []);
  const changed = structuredClone(rows);
  changed[8][5] = "67%";
  changed[4][5] = 0;
  assert.equal(parseQBDecisionSettings(changed)[6].noticeIfPrimary, 67);
  assert.equal(parseQBDecisionSettings(changed)[2].noticeIfPrimary, 0);
  changed[4][5] = 101;
  assert.throws(() => parseQBDecisionSettings(changed), /notice percentage/);
  assert.throws(() => parseQBDecisionSettings([rows[0]]), /headers/);
  const unordered = structuredClone(rows);
  unordered[3][1] = 10;
  assert.throws(() => parseQBDecisionSettings(unordered), /perceived max/);
});

test("neighboring Settings parsers stop at the decision table without a blank row", () => {
  assert.deepEqual(parseTimeToThrowSettings([
    ["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], [0, 1, 0.5, "100%"], ...rows,
  ]), [{ min: 0, max: 1, percentage: 100 }]);
  const openness = parseRouteOpennessSettings([
    ["BaseImpact Calcs", "base", "max", "diffweight"], ["Speed", 5, 10, 0.25], ...rows,
  ]);
  assert.deepEqual(Object.keys(openness.baseImpacts), ["Speed"]);
});
