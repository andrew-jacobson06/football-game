import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCompletionSettings } from "./completionSettings.js";
import { parseTimeToThrowSettings } from "./timeToThrowSettings.js";
import { parseRouteOpennessSettings } from "./routeOpennessSettings.js";
import { parseRouteCatalogSettings } from "./routeCatalogSettings.js";

const completion = [
  ["Completion Pct", "past los", "base completion"],
  ...[[0, 75], [3, 70], [6, 60], [11, 50], [16, 42], [21, 33], [26, 25], [31, 18], [110, 10]]
    .map(([depth, pct]) => [`airYards_Completion_${depth}`, depth, pct]),
];
const modifiers = [
  ["Openness Completion Modifier"], ["Open Score", "min open", "max open", "min adjust", "max adjust"],
  ["0-20", 0, 20, -30, -20], ["21-29", 21, 29, -19, -15], ["30-39", 30, 39, -14, -8],
  ["40-49", 40, 49, -7, -4], ["50–59", 50, 59, -3, 1], ["60–69", 60, 69, 1, 3],
  ["70–79", 70, 79, 3, 6], ["80–89", 80, 89, 7, 11], ["90–100", 90, -1, 12, 20],
];

test("loads both supplied tables with offset columns and the modifier table at EOF", () => {
  const parsed = parseCompletionSettings([...completion, ...modifiers].map((row) => ["", "", ...row]));
  assert.equal(parsed.completionTable.length, 9);
  assert.deepEqual(parsed.completionTable[3], { label: "airYards_Completion_11", pastLos: 11, baseCompletion: 50 });
  assert.equal(parsed.opennessCompletionModifiers.length, 9);
  assert.deepEqual(parsed.opennessCompletionModifiers.at(-1), { label: "90–100", minOpen: 90, maxOpen: null, minAdjust: 12, maxAdjust: 20 });
  assert.equal(parsed.opennessCompletionModifiers[0].minAdjust, -30);
});

test("absent tables stay absent; malformed real values report the workbook row", () => {
  assert.deepEqual(parseCompletionSettings([]), { completionTable: [], opennessCompletionModifiers: [] });
  const changed = modifiers.map((row) => [...row]);
  changed[2][3] = "bad";
  assert.throws(() => parseCompletionSettings(changed), /min adjust at Settings row 3/);
  assert.throws(() => parseCompletionSettings([modifiers[0]]), /missing/);
  assert.throws(() => parseCompletionSettings([...completion, completion[1]]), /Duplicate past los/);
});

test("identifies the modifier table by its unique headers despite title formatting or placement", () => {
  for (const title of ["Openness\nCompletion Modifier", "Openness  Completion Modifier", "OpennessCompletionModifier", "New completion table name"]) {
    const parsed = parseCompletionSettings([
      [title], [], ...modifiers.slice(1).map((row) => ["", "", ...row]),
    ]);
    assert.equal(parsed.opennessCompletionModifiers.length, 9);
    assert.equal(parsed.opennessCompletionModifiers.at(-1)?.maxOpen, null);
  }
  const withoutTitle = modifiers.slice(1).map((row) => [...row]);
  withoutTitle[0] = ["Open Score", "min\nopen", "MAX OPEN", "min_adjust", "maxAdjust"];
  assert.equal(parseCompletionSettings(withoutTitle).opennessCompletionModifiers.length, 9);
});

test("does not confuse the QB Decision Table headers with modifier headers", () => {
  const qbTable = [["QB Decision Table"], ["Open Score", "perceived max", "Label", "Base Notice", "Notice if Primary"],
    ["0–10", 10, "Erased", "NA", "NA"]];
  assert.deepEqual(parseCompletionSettings(qbTable).opennessCompletionModifiers, []);
  assert.equal(parseCompletionSettings([...qbTable, ...modifiers.slice(1)]).opennessCompletionModifiers.length, 9);
});

test("adjacent parsers stop before the final openness modifier table without a blank separator", () => {
  assert.equal(parseTimeToThrowSettings([
    ["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], [0, 1, 0.5, "100%"], ...modifiers,
  ]).length, 1);
  assert.deepEqual(Object.keys(parseRouteOpennessSettings([
    ["Curve Type Openness", 0.25], ["Quick", 20], ...modifiers,
  ]).curves), ["Quick"]);
  const catalog = parseRouteCatalogSettings([
    ["AirYards", "routeType", "airyards min", "airyards max"], ["Depth", "Quick", 1, 2],
    ["Route", "Quick"], ["Flat", 1], ...modifiers,
  ]);
  assert.deepEqual(catalog.routesByDepth, { Quick: ["Flat"] });
});
