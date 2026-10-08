import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateHandsEffectRange, rollReceiverHands } from "../src/components/league/gameplay/engine/receiverHands.ts";

const table = [
  { label: "0-20", minOpen: 0, maxOpen: 20, handsImpact: 0.5 },
  { label: "21-29", minOpen: 21, maxOpen: 29, handsImpact: 0.9 },
  { label: "30-39", minOpen: 30, maxOpen: 39, handsImpact: 1 },
  { label: "40-49", minOpen: 40, maxOpen: 49, handsImpact: 1 },
  { label: "50-59", minOpen: 50, maxOpen: 59, handsImpact: 0.8 },
  { label: "60-69", minOpen: 60, maxOpen: 69, handsImpact: 0.75 },
  { label: "70-79", minOpen: 70, maxOpen: 79, handsImpact: 0.55 },
  { label: "80-89", minOpen: 80, maxOpen: 89, handsImpact: 0.35 },
  { label: "90+", minOpen: 90, maxOpen: null, handsImpact: 0.25 },
];

test("uses the supplied polynomial and preserves negative hands effects", () => {
  assert.deepEqual(calculateHandsEffectRange(0), { handsMin: -3, handsMax: -1 });
  const range = calculateHandsEffectRange(50);
  assert.ok(Math.abs(range.handsMin - 1.5) < 1e-8);
  for (const roll of [0, 0.37, 1]) {
    const result = rollReceiverHands(0, 15, table, () => roll);
    assert.equal(result.handsEffectMod, -3 + roll * 2);
    assert.equal(result.handsAdjustment, result.handsEffectMod * 0.5);
  }
});

test("uses each actual-openness band's multiplier without changing the sampled effect", () => {
  for (const band of table) {
    for (const openness of [band.minOpen, band.maxOpen ?? 150]) {
      const result = rollReceiverHands(50, openness, table, () => 0.37);
      assert.equal(result.handsImpactMultiplier, band.handsImpact);
      assert.equal(result.handsAdjustment, result.handsEffectMod * band.handsImpact);
    }
  }
  assert.equal(rollReceiverHands(50, 20.5, table, () => 0).handsImpactMultiplier, 0.5);
  assert.equal(rollReceiverHands(50, -10, table, () => 0).handsImpactMultiplier, 0.5);
  assert.throws(() => rollReceiverHands(50, 50, [], () => 0), /Missing Hands/);
});
