export type HandsImpactRow = { label: string; minOpen: number; maxOpen: number | null; handsImpact: number };

export function calculateHandsEffectRange(hands: number) {
  if (!Number.isFinite(hands) || hands < 0 || hands > 100) throw new Error("Receiver hands must be between 0 and 100.");
  const polynomial = 0.000000001554624707334 * hands**5 + 0.0000002018182609315 * hands**4 -
    0.00006549536536 * hands**3 + 0.004064832344635 * hands**2 + 0.015553109130697 * hands;
  return { handsMin: polynomial - 3, handsMax: polynomial - 1 };
}

export function rollReceiverHands(hands: number, actualOpenness: number, table: readonly HandsImpactRow[], random: () => number = Math.random) {
  const { handsMin, handsMax } = calculateHandsEffectRange(hands);
  if (!Number.isFinite(actualOpenness)) throw new Error("Invalid actual openness for hands impact.");
  if (!table.length) throw new Error("Missing Hands impact based on openness table in Settings.");
  // Match decimal scores using the same lower-bound bands as completion adjustments.
  const sorted = [...table].sort((a, b) => a.minOpen - b.minOpen);
  const band = [...sorted].reverse().find((row) => actualOpenness >= row.minOpen) ?? sorted[0];
  if (!Number.isFinite(band.handsImpact) || band.handsImpact < 0 || band.handsImpact > 1)
    throw new Error("Invalid hands impact multiplier in Settings.");
  const handsEffectMod = handsMin + random() * (handsMax - handsMin);
  return { receiverHands: hands, handsMin, handsMax, handsEffectMod,
    handsImpactMultiplier: band.handsImpact, handsOpennessBand: band.label,
    handsAdjustment: handsEffectMod * band.handsImpact };
}
