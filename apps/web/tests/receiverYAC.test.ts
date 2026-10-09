import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYACSettings } from "../../api/src/services/yacSettings.ts";
import { rollReceiverYAC, buildYACRanges, calculateYACSpeedBuffs } from "../src/components/league/gameplay/engine/receiverYAC.ts";

const settings = parseYACSettings([
  ["YAC Basis by airyards and openness"], ["", 39, 49, 59, 69, 79, 89],
  [-1, 1.5, 3, 4.3, 5.6, 7.2, 9.5], [4, 1.25, 2.8, 4, 5.2, 6.7, 8.8],
  [9, 1.1, 2.2, 3.2, 4.3, 5.6, 7.5], [14, 0.75, 1.7, 2.5, 3.4, 4.5, 6.1],
  [19, 0.5, 1.3, 2, 2.8, 3.8, 5.2], [29, 0.25, 1, 1.6, 2.3, 3.2, 4.5], [100, 0.1, 0.7, 1.2, 1.8, 2.6, 3.8],
  ["YAC multiplier by throw type"], ["", 4, 9, 14, 19, 29, 100],
  ["Perfect", 1.1, 1.1, 1.25, 1.33, 1.4, 1.5], ["Accurate", 0, 0, 0, 0, 0, 0],
  ["Close", 0.9, 0.9, 0.85, 0.8, 0.75, 0.5], ["Catchable", 0.5, 0.5, 0.45, 0.4, 0.35, 0.25], ["Off Target", 0, 0, 0, 0, 0, 0],
]);
const roll = (depth: number, openness: number, type: "Perfect" | "Close" | "Accurate" | "Off Target" = "Close") =>
  rollReceiverYAC(depth, openness, type, 50, settings.yacBasis, settings.yacThrowMultipliers, () => 0.5);

test("looks up air-yards and actual-openness upper bounds, then multiplies by throw quality", () => {
  const result = roll(8, 55);
  assert.equal(result.basis, 3.2);
  assert.equal(result.throwTypeMultiplier, 0.9);
  assert.equal(result.baseYAC, 3.2 * 0.9);
  assert.equal(roll(-1, 39).basis, 1.5);
  assert.equal(roll(4, 49).basis, 2.8);
  assert.equal(roll(4.1, 49.1).basis, 3.2);
  assert.equal(roll(40, 89.5, "Perfect").baseYAC, 3.8 * 1.5);
});

test("speed formulas and each sequential range use that row's low", () => {
  const buffs = calculateYACSpeedBuffs(50);
  assert.ok(Math.abs(buffs.speedYardMaxBuff - 10) < 1e-8);
  assert.ok(Math.abs(buffs.speedMaxYACPctBuff - 0.0075) < 1e-8);
  const { ranges } = buildYACRanges(10, 50);
  assert.equal(ranges[0].rawChance, 0.31 - buffs.speedMaxYACPctBuff);
  assert.ok(Math.abs(ranges[0].chancePct - (31 - buffs.speedMaxYACPctBuff * 100)) < 1e-8);
  assert.ok(Math.abs(ranges[1].chancePct - 45) < 1e-8);
  assert.equal(ranges[0].low, 6);
  assert.equal(ranges[0].high, 8);
  assert.equal(ranges[1].low, 8.1);
  assert.equal(ranges[1].high, 10);
  assert.equal(ranges[2].low, 10.1);
  assert.equal(ranges[2].high, 10.1 * 1.6);
  assert.equal(ranges[3].high, ranges[3].low * 1.6);
  assert.equal(ranges[4].high, ranges[4].low + buffs.speedYardMaxBuff);
});

test("two decimal rolls select every weighted range and round the sampled YAC", () => {
  const preview = roll(8, 55);
  let previous = 0;
  preview.ranges.forEach((range, index) => {
    const rolls = [(previous + range.threshold) / 2 / 100, 0.37];
    const result = rollReceiverYAC(8, 55, "Close", 50, settings.yacBasis, settings.yacThrowMultipliers, () => rolls.shift()!);
    assert.equal(result.selectedRange, index);
    assert.equal(result.sampledYAC, range.low + 0.37 * (range.high - range.low));
    assert.equal(result.yac, Math.round(result.sampledYAC));
    assert.equal(rolls.length, 0);
    previous = range.threshold;
  });
});

test("zero multipliers stay zero; slow players and tiny bases never produce invalid ranges", () => {
  for (const type of ["Accurate", "Off Target"] as const) assert.equal(roll(8, 55, type).yac, 0);
  for (const speed of [0, 25, 50, 100]) for (const basis of [0, 0.05, 3, 10]) {
    const { ranges } = buildYACRanges(basis, speed);
    assert.ok(ranges.every((row) => row.low >= 0 && row.high >= row.low && row.chancePct >= 0));
    assert.ok(Math.abs(ranges.reduce((sum, row) => sum + row.chancePct, 0) - 100) < 1e-8);
  }
  assert.throws(() => roll(8, 90), /below 90/);
});
