import type { ThrowType } from "./qbAccuracy";
export type YACBasisRow = { maxAirYards: number; openness: Array<{ maxOpen: number; basis: number }> };
export type YACThrowRow = { throwType: ThrowType; depths: Array<{ maxAirYards: number; multiplier: number }> };

/** Speed formulas are evaluated once after a successful catch. */
export function calculateYACSpeedBuffs(speed: number) {
  if (!Number.isFinite(speed) || speed < 0 || speed > 100) throw new Error("Receiver speed must be between 0 and 100 for YAC.");
  const speedYardMaxBuff = 0.000000052267780309*speed**5 - 0.000011486066216*speed**4 +
    0.000822748020387*speed**3 - 0.017088286750599*speed**2 + 0.206628936613963*speed - 5;
  const speedMaxYACPctBuff = -2.478608064208e-11*speed**5 + 0.0000000179691619996*speed**4 -
    0.000002510097229481*speed**3 + 0.000127000698495*speed**2 - 0.002016024096988*speed;
  return { speedYardMaxBuff, speedMaxYACPctBuff };
}

/** Build the five sequential ranges; low always means this row's low. */
export function buildYACRanges(baseYAC: number, speed: number) {
  if (!Number.isFinite(baseYAC) || baseYAC < 0) throw new Error("Invalid Base YAC.");
  const buffs = calculateYACSpeedBuffs(speed);
  const weights = [0.31 - buffs.speedMaxYACPctBuff, 0.45, 0.19, 0.05, buffs.speedMaxYACPctBuff];
  let previousHigh = 0;
  const ranges = weights.map((rawChance, index) => {
    const low = baseYAC === 0 ? 0 : index === 0 ? baseYAC - Math.min(baseYAC, 4) : previousHigh + 0.1;
    const formulaHigh = baseYAC === 0 ? 0 : index === 0 ? low + (baseYAC - low) / 2 :
      index === 1 ? baseYAC : index === 4 ? low + buffs.speedYardMaxBuff : low * 1.6;
    // A zero basis stays zero. Small bases/negative speed buffs cannot create reversed ranges.
    const high = Math.max(low, formulaHigh);
    previousHigh = high;
    return { low, high, rawChance, weight: Math.max(0, rawChance) };
  });
  // The supplied chances total 1. Normalize only to keep the distribution valid
  // after negative chances are clamped, and to absorb floating-point rounding.
  const total = ranges.reduce((sum, row) => sum + row.weight, 0);
  let threshold = 0;
  return { ...buffs, ranges: ranges.map((row, index) => {
    const chancePct = row.weight / total * 100;
    threshold += chancePct;
    return { ...row, chancePct, threshold: index === ranges.length - 1 ? 100 : threshold };
  }) };
}

export function rollReceiverYAC(
  airYards: number, actualOpenness: number, throwType: ThrowType, speed: number,
  basisTable: readonly YACBasisRow[], multiplierTable: readonly YACThrowRow[], random: () => number = Math.random,
) {
  if (!Number.isFinite(airYards) || !Number.isFinite(actualOpenness) || actualOpenness >= 90)
    throw new Error("Settings YAC requires finite inputs and actual openness below 90.");
  if (!basisTable.length) throw new Error("Missing YAC Basis by airyards and openness Settings table.");
  // Matrix axes are inclusive upper bounds, with the last band covering larger decimals.
  const depths = [...basisTable].sort((a, b) => a.maxAirYards - b.maxAirYards);
  const depth = depths.find((row) => airYards <= row.maxAirYards) ?? depths[depths.length - 1];
  const openness = [...depth.openness].sort((a, b) => a.maxOpen - b.maxOpen);
  const basis = (openness.find((row) => actualOpenness <= row.maxOpen) ?? openness[openness.length - 1])?.basis;
  const throwRow = multiplierTable.find((row) => row.throwType === throwType);
  if (!throwRow?.depths.length || basis == null) throw new Error("Missing YAC throw-type multiplier or openness band in Settings.");
  const throwDepths = [...throwRow.depths].sort((a, b) => a.maxAirYards - b.maxAirYards);
  const throwTypeMultiplier = (throwDepths.find((row) => airYards <= row.maxAirYards) ?? throwDepths[throwDepths.length - 1]).multiplier;
  const baseYAC = basis * throwTypeMultiplier;
  const { ranges, ...buffs } = buildYACRanges(baseYAC, speed);
  // First roll picks a weighted row; the second samples that row's yardage.
  const rangeRoll = random() * 100;
  const rangeIndex = ranges.findIndex((row) => row.chancePct > 0 && rangeRoll < row.threshold);
  const selectedRange = rangeIndex >= 0 ? rangeIndex : ranges.length - 1 - [...ranges].reverse().findIndex((row) => row.chancePct > 0);
  const range = ranges[selectedRange];
  const sampledYAC = range.low + random() * (range.high - range.low);
  return { basis, throwTypeMultiplier, baseYAC, ...buffs, ranges, rangeRoll, selectedRange,
    sampledYAC, yac: Math.round(sampledYAC), method: "settings" as const };
}
