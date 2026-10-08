import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAccuracySettings } from "../../api/src/services/accuracySettings.ts";
import { getThrowTypeChances, rollQBAccuracy } from "../src/components/league/gameplay/engine/qbAccuracy.ts";

export const accuracyModifiers = parseAccuracySettings([["Accuracy Mod"], ["Throw Type", "MIN", "MAX"],
  ["Perfect", 10, 20], ["Accurate", 5, 9], ["Close", -4, 4], ["Catchable", -9, -5], ["Off Target", -20, -10]]);

test("formula results match reference ratings and yield a complete nonnegative distribution", () => {
  const references = [[0, [0, 0.2, 0.45, 0.25, 0.1]], [25, [0.11, 0.21, 0.5, 0.19, 0.09]], [50, [0.14, 0.3, 0.41, 0.1, 0.05]]] as const;
  for (const [rating, expected] of references) {
    const chances = getThrowTypeChances(rating);
    chances.forEach((chance, index) => assert.ok(Math.abs(chance.rawChance - expected[index]) < 1e-8));
  }
  for (let rating = 0; rating <= 100; rating++) {
    const chances = getThrowTypeChances(rating);
    assert.ok(chances.every((chance) => chance.chancePct >= 0));
    assert.ok(Math.abs(chances.reduce((sum, chance) => sum + chance.chancePct, 0) - 100) < 1e-10);
    assert.equal(chances.at(-1)?.threshold, 100);
  }
  assert.equal(getThrowTypeChances(100).at(-1)?.chancePct, 0);
});

test("rolls each throw type and a decimal adjustment from its Settings range", () => {
  const chances = getThrowTypeChances(50);
  let previous = 0;
  for (const chance of chances) {
    const values = [(previous + chance.threshold) / 2 / 100, 0.37];
    const result = rollQBAccuracy(50, accuracyModifiers, () => values.shift()!);
    const range = accuracyModifiers.find((row) => row.throwType === chance.throwType)!;
    assert.equal(result.throwType, chance.throwType);
    assert.equal(result.accuracyAdjustment, range.min + 0.37 * (range.max - range.min));
    assert.equal(values.length, 0);
    previous = chance.threshold;
  }
});

test("threshold equality enters the next type and zero-chance categories cannot be selected", () => {
  const perfectThreshold = getThrowTypeChances(50)[0].threshold;
  const values = [perfectThreshold / 100, 0];
  assert.equal(rollQBAccuracy(50, accuracyModifiers, () => values.shift()!).throwType, "Accurate");
  assert.equal(rollQBAccuracy(0, accuracyModifiers, () => 0).throwType, "Accurate");
  assert.notEqual(rollQBAccuracy(100, accuracyModifiers, () => 0.9999999).throwType, "Off Target");
});

test("updated Settings ranges are used and missing ranges fail explicitly", () => {
  const updated = accuracyModifiers.map((row) => row.throwType === "Accurate" ? { ...row, min: 6, max: 12 } : row);
  const values = [0.25, 0.5];
  assert.equal(rollQBAccuracy(50, updated, () => values.shift()!).accuracyAdjustment, 9);
  assert.throws(() => rollQBAccuracy(50, []), /Accuracy Mod/);
  assert.throws(() => getThrowTypeChances(NaN), /accuracy/);
});
