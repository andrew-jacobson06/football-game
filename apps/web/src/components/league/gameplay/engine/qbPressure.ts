import type { PassBlitzResult, PassLineConfrontationResult } from "./types";

/** Summed defender scores give the hit percentage; only a hit draws its defender. */
export function resolveQBPressureHit(
  matchups: readonly PassLineConfrontationResult[],
  blitz?: PassBlitzResult,
  random: () => number = Math.random,
) {
  const weights = new Map<string, number>();
  for (const matchup of matchups) {
    if (matchup.defensiveWins > 0)
      weights.set(matchup.defensiveLineman, (weights.get(matchup.defensiveLineman) ?? 0) + 3 ** matchup.defensiveWins);
  }
  // The blitzing LB has one blitz weight, even if he also has a line assignment.
  if (blitz) weights.set(blitz.rusher, blitz.lineBlocked ? 20 : blitz.backBlocked ? 30 : 40);
  const candidates = [...weights].map(([player, weight]) => ({ player, weight }));
  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  // Scores are percentage points, not an average. For example 30+27+3+3 = 63%.
  const hitChance = Math.min(100, totalWeight);
  const hitRoll = random() * 100;
  const hit = hitRoll < hitChance;
  if (!hit) {
    const responseRoll = random() * 100;
    const action: "throw" | "throw-away" | "scramble" = responseRoll < 50 ? "throw" : responseRoll < 75 ? "throw-away" : "scramble";
    return { candidates, totalWeight, hitChance, hitRoll, hit, roll: null, hitter: undefined, responseRoll, action };
  }
  const roll = random() * totalWeight;
  let cumulative = 0;
  const hitter = candidates.find(({ weight }) => { cumulative += weight; return roll < cumulative; })!.player;
  const responseRoll = random() * 100;
  const action: "throw-away" | "throw" | "sack" = responseRoll < 10 ? "throw-away" : responseRoll < 20 ? "throw" : "sack";
  return { candidates, totalWeight, hitChance, hitRoll, hit, roll, hitter, responseRoll, action };
}
