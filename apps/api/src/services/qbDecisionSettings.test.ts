import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQBDecisionSettings } from "./qbDecisionSettings.js";
import { parseTimeToThrowSettings } from "./timeToThrowSettings.js";
import { parseRouteOpennessSettings } from "./routeOpennessSettings.js";

const rows = [
  ["QB Decision Table"],
  ["Open Score", "perceived max", "Label", "What it means on the field", "Notice if Primary", "2nd read notice", "3rd notice", "4th notice"],
  ["0–10", 10, "Erased", "", "NA", "NA", "NA", "NA"],
  ["11–20", 20, "Blanketed", "", "NA", "NA", "NA", "NA"],
  ["21–35", 35, "Covered", "", 10, "NA", "NA", "NA"],
  ["36–49", 49, "Tight window", "", 20, 10, "NA", "NA"],
  ["50–59", 59, "Slightly open", "", 50, 20, 10, "NA"],
  ["60–69", 69, "Open", "", 80, 30, 20, 5],
  ["70–79", 79, "Clearly open", "", 90, 50, 40, 15],
  ["80–89", 89, "Very open", "", 95, 80, 75, 25],
  ["90–100", 1000, "Wide open / busted", "", 99, 95, 87, 50],
];

test("loads the supplied four-rank table at offset columns and stops at neighboring tables", () => {
  const table = parseQBDecisionSettings([...rows, ["RouteTreeDetails", "Type", "Timing Mod"]].map((row) => ["", "", ...row]));
  assert.equal(table.length, 9);
  assert.deepEqual(table[6], { perceivedMax: 79, label: "Clearly open", noticeIfPrimary: 90, secondReadNotice: 50, thirdReadNotice: 40, fourthReadNotice: 15 });
  assert.equal(table[0].noticeIfPrimary, null);
  assert.equal(table[2].secondReadNotice, null);
  assert.equal(table[8].perceivedMax, 1000);
});

test("accepts percent text and zero; validates each rank and requires all four headers", () => {
  assert.deepEqual(parseQBDecisionSettings([]), []);
  const changed = structuredClone(rows);
  changed[8][4] = "67%";
  changed[4][4] = 0;
  assert.equal(parseQBDecisionSettings(changed)[6].noticeIfPrimary, 67);
  assert.equal(parseQBDecisionSettings(changed)[2].noticeIfPrimary, 0);
  for (const column of [4, 5, 6, 7]) {
    const invalid = structuredClone(rows);
    invalid[4][column] = 101;
    assert.throws(() => parseQBDecisionSettings(invalid), /notice percentage/);
    invalid[1][column] = "missing";
    assert.throws(() => parseQBDecisionSettings(invalid), /missing/);
  }
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
