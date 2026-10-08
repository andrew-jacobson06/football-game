import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateJumpRange, rollReceiverJump, getJumpRouteMultiplier } from "../src/components/league/gameplay/engine/receiverJump.ts";
import { THROW_TYPES } from "../src/components/league/gameplay/engine/qbAccuracy.ts";

const routes = [{ route: "ALL ELSE", multiplier: 1 }];
const effects = [
  { label: "0-20", minOpen: 0, maxOpen: 20, multipliers: { Perfect: 0.05, Accurate: 0.05, Close: 0.1, Catchable: 0.15, "Off Target": 0 } },
  { label: "40-49", minOpen: 40, maxOpen: 49, multipliers: { Perfect: 0.25, Accurate: 0.33, Close: 0.7, Catchable: 1, "Off Target": 0.03 } },
  { label: "90+", minOpen: 90, maxOpen: null, multipliers: { Perfect: 0, Accurate: 0, Close: 0, Catchable: 0, "Off Target": 0 } },
];
const air = [{ airYards: "EndZone" as const, multiplier: 1.35 }, { airYards: 5, multiplier: 0.25 },
  { airYards: 10, multiplier: 0.5 }, { airYards: 100, multiplier: 1 }];

test("jump formulas match reference ratings and decimal sampling preserves negative effects", () => {
  assert.deepEqual(calculateJumpRange(0), { jumpMin: -5, jumpMax: -3 });
  const range = calculateJumpRange(50);
  assert.ok(Math.abs(range.jumpMin - 1) < 1e-8);
  assert.ok(Math.abs(range.jumpMax - 2) < 1e-8);
  for (const roll of [0, 0.37, 1]) {
    const result = rollReceiverJump(0, 45, "Catchable", 15, 75, effects, air, "Flat", routes, () => roll);
    assert.equal(result.jumpMod, -5 + roll * 2);
    assert.equal(result.jumpAdjustment, result.jumpMod);
  }
});

test("openness selects the correct throw-type column and zero multipliers produce zero adjustment", () => {
  for (const type of THROW_TYPES) {
    const result = rollReceiverJump(50, 45, type, 15, 75, effects, air, "Flat", routes, () => 0.5);
    assert.equal(result.jumpEffectMultiplier, effects[1].multipliers[type]);
    assert.equal(result.jumpAdjustment, result.jumpMod * effects[1].multipliers[type]);
    assert.equal(rollReceiverJump(50, 100, type, 15, 75, effects, air, "Flat", routes, () => 0.5).jumpAdjustment, 0);
  }
});

test("air-yards bands are inclusive and end-zone throws override the depth multiplier", () => {
  for (const [depth, expected] of [[0, 0.25], [5, 0.25], [6, 0.5], [10, 0.5], [11, 1], [50, 1]]) {
    const result = rollReceiverJump(50, 45, "Close", depth, 75, effects, air, "Flat", routes, () => 0.5);
    assert.equal(result.jumpAirYardsMultiplier, expected);
    assert.equal(result.isEndZoneThrow, false);
  }
  for (const [depth, yardsToGoal] of [[5, 5], [10, 5], [20, 20]]) {
    const result = rollReceiverJump(50, 45, "Close", depth, yardsToGoal, effects, air, "Flat", routes, () => 0.5);
    assert.equal(result.jumpAirYardsMultiplier, 1.35);
    assert.equal(result.isEndZoneThrow, true);
    assert.equal(result.jumpAdjustment, result.jumpMod * 0.7 * 1.35);
  }
  assert.throws(() => rollReceiverJump(50, 45, "Close", 5, 75, [], air, "Flat", routes), /Missing jump/);
});

test("route boosts and ALL ELSE use the supplied Settings values without fixed route rules", () => {
  const table = [{ route: "Fade", multiplier: 1.5 }, { route: "Corner", multiplier: 1.2 },
    { route: "Go", multiplier: 1.1 }, { route: "Post", multiplier: 1.075 }, { route: "ALL ELSE", multiplier: 1 }];
  for (const row of table) {
    const route = row.route === "ALL ELSE" ? "Flat" : row.route;
    const result = rollReceiverJump(50, 45, "Close", 20, 20, effects, air, route, table, () => 0.5);
    assert.equal(result.jumpRouteMultiplier, row.multiplier);
    assert.equal(result.jumpAdjustment, result.jumpMod * 0.7 * 1.35 * row.multiplier);
  }
  const updated = [{ route: "Custom Route", multiplier: 2 }, { route: "ALL ELSE", multiplier: 0.75 }];
  assert.equal(getJumpRouteMultiplier(updated, "custom route"), 2);
  assert.equal(getJumpRouteMultiplier(updated, "Fade"), 0.75);
  assert.equal(getJumpRouteMultiplier(table, "  fAdE  "), 1.5);
  assert.throws(() => getJumpRouteMultiplier([], "Go"), /Missing/);
});
