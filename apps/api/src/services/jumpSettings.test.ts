import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJumpSettings } from "./jumpSettings.js";
import { parseRouteOpennessSettings } from "./routeOpennessSettings.js";
import { parseTimeToThrowSettings } from "./timeToThrowSettings.js";

const rows = [
  ["JUMP EFFECT (accuracy+coverage)"], ["", "min open", "max open", "Perfect", "Accurate", "Close", "Catchable", "Off Target"],
  ["Erased", 0, 20, "5%", "5%", "10%", "15%", "0%"],
  ["Blanketed", 21, 29, "10%", "15%", "25%", "33%", "0%"],
  ["Covered", 30, 39, "20%", "33%", "50%", "67%", "1%"],
  ["Tight window", 40, 49, "25%", "33%", "70%", "100%", "3%"],
  ["Slightly open", 50, 59, "20%", "15%", "50%", "67%", "1%"],
  ["Open", 60, 69, "5%", "5%", "25%", "33%", "0%"],
  ["Clearly open", 70, 79, "0%", "0%", "10%", "15%", "0%"],
  ["Very open", 80, 89, "0%", "0%", "0%", "0%", "0%"],
  ["Wide open / busted", 90, -1, "0%", "0%", "0%", "0%", "0%"],
  ["JUMP Based on Air yards"], ["Air Yards", "Jump Chance Multiplier"],
  ["EndZone", 1.35], [5, 0.25], [10, 0.5], [100, 1],
  ["JUMP Based on Route"], ["Route", "Jump Chance Multiplier"],
  ["Fade", "x1.5"], ["Corner", "x1.2"], ["Go", "x1.1"], ["Post", "x1.075"], ["ALL ELSE", "x1"],
];

test("loads both supplied jump tables without separators and with the last table at EOF", () => {
  const parsed = parseJumpSettings(rows.map((row) => ["", "", ...row]));
  assert.equal(parsed.jumpEffects.length, 9);
  assert.equal(parsed.jumpEffects[3].multipliers.Catchable, 1);
  assert.equal(parsed.jumpEffects[3].multipliers["Off Target"], 0.03);
  assert.equal(parsed.jumpEffects[8].maxOpen, null);
  assert.deepEqual(parsed.jumpAirYards, [{ airYards: "EndZone", multiplier: 1.35 }, { airYards: 5, multiplier: 0.25 },
    { airYards: 10, multiplier: 0.5 }, { airYards: 100, multiplier: 1 }]);
  assert.deepEqual(parsed.jumpRoutes, [{ route: "Fade", multiplier: 1.5 }, { route: "Corner", multiplier: 1.2 },
    { route: "Go", multiplier: 1.1 }, { route: "Post", multiplier: 1.075 }, { route: "ALL ELSE", multiplier: 1 }]);
});

test("missing tables stay absent and malformed values fail with their Settings row", () => {
  assert.deepEqual(parseJumpSettings([]), { jumpEffects: [], jumpAirYards: [], jumpRoutes: [] });
  const changed = rows.map((row) => [...row]);
  changed[2][3] = "bad";
  assert.throws(() => parseJumpSettings(changed), /Perfect jump multiplier at Settings row 3/);
  assert.throws(() => parseJumpSettings([rows[11], rows[12], [5, 0.25]]), /EndZone/);
});

test("route multipliers are read dynamically, with numeric and x-prefixed values", () => {
  const table = [["JUMP Based on Route"], ["Route", "Jump Chance Multiplier"],
    ["Custom Route", 2.25], ["Fade", "X1.8"], ["ALL ELSE", "×1.05"]];
  const parsed = parseJumpSettings(table);
  assert.deepEqual(parsed.jumpRoutes, [{ route: "Custom Route", multiplier: 2.25 },
    { route: "Fade", multiplier: 1.8 }, { route: "ALL ELSE", multiplier: 1.05 }]);
  assert.throws(() => parseJumpSettings(table.slice(0, -1)), /ALL ELSE/);
  assert.throws(() => parseJumpSettings([table[0], table[1], ["Fade", "bad"], table[4]]), /row 3/);
});

test("neighboring parsers stop at jump tables", () => {
  assert.equal(parseTimeToThrowSettings([["time_to_Throw"], ["Min", "Max", "Avg", "Pct"], [0, 1, 0.5, "100%"], ...rows]).length, 1);
  assert.deepEqual(Object.keys(parseRouteOpennessSettings([["Curve Type Openness", 0.25], ["Quick", 20], ...rows]).curves), ["Quick"]);
});

test("jump route multipliers stop at either adjacent YAC matrix, including Settings row 284", () => {
  for (const title of ["YAC Basis by airyards and openness", "YAC multiplier by throw type"]) {
    // Reproduce a new table immediately after ALL ELSE, without a blank separator.
    const sheet = [...Array.from({ length: 283 - rows.length }, () => []), ...rows,
      [title], ["", 39, 49, 59], [-1, 1.5, 3, 4.3]];
    for (const offset of [0, 2]) {
      const parsed = parseJumpSettings(sheet.map((row) => [...Array(offset).fill(""), ...row]));
      assert.equal(parsed.jumpRoutes.length, 5);
      assert.deepEqual(parsed.jumpRoutes.at(-1), { route: "ALL ELSE", multiplier: 1 });
    }
  }
});
