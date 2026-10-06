import type { TimeToThrowRange } from "./types";

export function calculateTimeToThrow(
  ranges: TimeToThrowRange[],
  lineModifier: number,
  random: () => number = Math.random
) {
  if (!Number.isFinite(lineModifier)) throw new Error("Invalid OL/DL time-to-throw modifier.");
  const base = rollBaseTimeToThrow(ranges, random);
  return { ...base, lineModifier, timeToThrow: base.baseTimeToThrow + lineModifier };
}

export function rollBaseTimeToThrow(
  ranges: TimeToThrowRange[],
  random: () => number = Math.random
) {
  if (!ranges.length || ranges.some(({ min, max, percentage }) =>
    !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min ||
    !Number.isFinite(percentage) || percentage < 0
  )) throw new Error("Missing or invalid time_to_Throw Settings table.");
  const total = ranges.reduce((sum, range) => sum + range.percentage, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error("time_to_Throw percentages must have a positive total.");

  const percentageRoll = random() * 100;
  let cumulative = 0;
  const range = ranges.find(({ percentage }) => {
    cumulative += percentage / total * 100;
    return percentage > 0 && percentageRoll < cumulative;
  }) ?? ranges.filter(({ percentage }) => percentage > 0).at(-1)!;
  const baseTimeToThrow = range.min + random() * (range.max - range.min);
  return { percentageRoll, range, baseTimeToThrow };
}
