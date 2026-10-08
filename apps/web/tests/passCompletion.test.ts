import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCompletionSettings } from "../../api/src/services/completionSettings.ts";
import { parseAccuracySettings } from "../../api/src/services/accuracySettings.ts";
import { calculateThrowCompletion as calculateCompletion, getBaseCompletion, getOpennessCompletionAdjustment } from "../src/components/league/gameplay/engine/passCompletion.ts";

const calculateThrowCompletion = (settings: Parameters<typeof calculateCompletion>[0], target: Parameters<typeof calculateCompletion>[1], throwTime: number) =>
  calculateCompletion(settings, target, throwTime, 50, 50, 50, 75, () => 0.5);

const parsed = parseCompletionSettings([
  ["Completion Pct", "past los", "base completion"],
  ...[[0, 75], [3, 70], [6, 60], [11, 50], [16, 42], [21, 33], [26, 25], [31, 18], [110, 10]]
    .map(([depth, pct]) => [`airYards_Completion_${depth}`, depth, pct]),
  ["Openness Completion Modifier"], ["Open Score", "min open", "max open", "min adjust", "max adjust"],
  ["0-20", 0, 20, -30, -20], ["21-29", 21, 29, -19, -15], ["30-39", 30, 39, -14, -8],
  ["40-49", 40, 49, -7, -4], ["50–59", 50, 59, -3, 1], ["60–69", 60, 69, 1, 3],
  ["70–79", 70, 79, 3, 6], ["80–89", 80, 89, 7, 11], ["90–100", 90, -1, 12, 20],
]);
const settings = { ...parsed, handsImpactByOpenness: [{ label: "Neutral", minOpen: 0, maxOpen: null, handsImpact: 0 }],
  jumpEffects: [{ label: "Neutral", minOpen: 0, maxOpen: null, multipliers: { Perfect: 0, Accurate: 0, Close: 0, Catchable: 0, "Off Target": 0 } }],
  jumpAirYards: [{ airYards: "EndZone" as const, multiplier: 1.35 }, { airYards: 5, multiplier: 0.25 }, { airYards: 10, multiplier: 0.5 }, { airYards: 100, multiplier: 1 }],
  accuracyModifiers: parseAccuracySettings([["Accuracy Mod"], ["Throw Type", "MIN", "MAX"],
  ["Perfect", 10, 20], ["Accurate", 5, 9], ["Close", -4, 4], ["Catchable", -9, -5], ["Off Target", -20, -10]]), curves: { Break: [
  { time: 0.25, openness: 5 }, { time: 0.5, openness: 20 }, { time: 0.75, openness: 40 }, { time: 1, openness: 60 },
] } };
const target = { player: "WR", airYards: 8, TTO: 2, curveType: "Break", perceivedOpenness: 200,
  phaseOpenness: [{ start: 0, end: 2, duration: 2, phaseImpact: 10 }] };

test("depth bands use inclusive upper bounds and current Settings values", () => {
  for (const [depth, expected] of [[0, 75], [1, 70], [3, 70], [4, 60], [6, 60], [8, 50], [11, 50], [12, 42], [32, 10], [110, 10], [120, 10]])
    assert.equal(getBaseCompletion(parsed.completionTable, depth), expected);
  assert.equal(getBaseCompletion([{ pastLos: 11, baseCompletion: 55 }], 8), 55);
});

test("openness adjustments interpolate band endpoints and decimal values", () => {
  for (const band of parsed.opennessCompletionModifiers) {
    const max = band.maxOpen ?? 100;
    assert.equal(getOpennessCompletionAdjustment(parsed.opennessCompletionModifiers, band.minOpen).opennessAdjustment, band.minAdjust);
    assert.equal(getOpennessCompletionAdjustment(parsed.opennessCompletionModifiers, max).opennessAdjustment, band.maxAdjust);
    assert.equal(getOpennessCompletionAdjustment(parsed.opennessCompletionModifiers, (band.minOpen + max) / 2).opennessAdjustment,
      (band.minAdjust + band.maxAdjust) / 2);
  }
  assert.equal(getOpennessCompletionAdjustment(parsed.opennessCompletionModifiers, 20.5).opennessAdjustment, -20);
  assert.equal(getOpennessCompletionAdjustment(parsed.opennessCompletionModifiers, -10).opennessAdjustment, -30);
  assert.equal(getOpennessCompletionAdjustment(parsed.opennessCompletionModifiers, 150).opennessAdjustment, 20);
});

test("throw completion queries actual openness at throw time and ignores perceived openness", () => {
  const before = structuredClone(target);
  const result = calculateThrowCompletion(settings, target, 1.4);
  assert.ok(Math.abs(result.actualOpenness - 43) < 1e-10);
  assert.equal(result.baseCompletion, 50);
  assert.ok(Math.abs(result.opennessAdjustment - (-6)) < 1e-10);
  assert.ok(Math.abs(result.pct - 44) < 1e-10);
  assert.equal(calculateThrowCompletion(settings, target, 0.5).actualOpenness, 7.5);
  assert.deepEqual(target, before);
});

test("completion chances are bounded and missing Settings fail explicitly", () => {
  const high = { ...settings, curves: { Break: [{ time: 0, openness: 100 }] },
    completionTable: [{ pastLos: 110, baseCompletion: 95 }] };
  assert.equal(calculateThrowCompletion(high, { ...target, phaseOpenness: [] }, 1).pct, 100);
  const low = { ...high, curves: { Break: [{ time: 0, openness: 0 }] }, completionTable: [{ pastLos: 110, baseCompletion: 10 }] };
  assert.equal(calculateThrowCompletion(low, { ...target, phaseOpenness: [] }, 1).pct, 0);
  assert.throws(() => getBaseCompletion([], 8), /Missing Completion Pct/);
  assert.throws(() => getOpennessCompletionAdjustment([], 60), /Missing Openness Completion Modifier/);
});

test("stores the accuracy throw type and adds its adjustment before bounding the total", () => {
  const rolls = [0, 0.5, 0.5, 0.5];
  const result = calculateCompletion(settings, target, 1.4, 50, 50, 50, 75, () => rolls.shift()!);
  assert.equal(result.throwType, "Perfect");
  assert.equal(result.accuracyAdjustment, 15);
  assert.equal(result.accuracyRoll, 0);
  assert.ok(Math.abs(result.pct - 59) < 1e-10);
  assert.equal(result.throwTypeChances.length, 5);
  assert.equal(rolls.length, 0);
});

test("weights the sampled hands effect by actual openness and adds it to the raw completion total", () => {
  const config = { ...settings, handsImpactByOpenness: [
    { label: "40-49", minOpen: 40, maxOpen: 49, handsImpact: 1 },
    { label: "90+", minOpen: 90, maxOpen: null, handsImpact: 0.25 },
  ] };
  const rolls = [0, 0.5, 0.37, 0.5];
  const result = calculateCompletion(config, target, 1.4, 50, 50, 50, 75, () => rolls.shift()!);
  assert.ok(Math.abs(result.actualOpenness - 43) < 1e-10);
  assert.equal(result.handsImpactMultiplier, 1); // perceived score is 200 and must not select 25%.
  assert.equal(result.handsEffectMod, result.handsMin + 0.37 * (result.handsMax - result.handsMin));
  assert.equal(result.handsAdjustment, result.handsEffectMod);
  assert.equal(result.pct, result.baseCompletion + result.opennessAdjustment + result.accuracyAdjustment + result.handsAdjustment);
  assert.equal(rolls.length, 0);
});

test("jump is weighted by actual openness, the stored throw type and end-zone status", () => {
  const config = { ...settings, jumpEffects: [
    { label: "40-49", minOpen: 40, maxOpen: 49, multipliers: { Perfect: 0.25, Accurate: 0.33, Close: 0.7, Catchable: 1, "Off Target": 0.03 } },
    { label: "90+", minOpen: 90, maxOpen: null, multipliers: { Perfect: 0, Accurate: 0, Close: 0, Catchable: 0, "Off Target": 0 } },
  ] };
  const rolls = [0, 0.5, 0.5, 0.37];
  const result = calculateCompletion(config, target, 1.4, 50, 50, 50, 8, () => rolls.shift()!);
  assert.equal(result.throwType, "Perfect");
  assert.equal(result.jumpEffectMultiplier, 0.25);
  assert.equal(result.jumpAirYardsMultiplier, 1.35);
  assert.equal(result.isEndZoneThrow, true);
  assert.equal(result.jumpMod, result.jumpMin + 0.37 * (result.jumpMax - result.jumpMin));
  assert.equal(result.jumpAdjustment, result.jumpMod * 0.25 * 1.35);
  assert.equal(result.pct, result.baseCompletion + result.opennessAdjustment + result.accuracyAdjustment + result.handsAdjustment + result.jumpAdjustment);
  assert.equal(rolls.length, 0);
});
