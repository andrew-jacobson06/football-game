import type { ThrowType } from "./qbAccuracy";
export type JumpEffectRow = { label: string; minOpen: number; maxOpen: number | null; multipliers: Record<ThrowType, number> };
export type JumpAirYardsRow = { airYards: number | "EndZone"; multiplier: number };
export type JumpRouteRow = { route: string; multiplier: number };

export function getJumpRouteMultiplier(table: readonly JumpRouteRow[], route: string) {
  const key = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
  const row = table.find((row) => key(row.route) === key(route))
    ?? table.find((row) => key(row.route) === "all else");
  if (!row || !Number.isFinite(row.multiplier) || row.multiplier < 0)
    throw new Error(`Missing or invalid JUMP Based on Route setting for ${route}.`);
  return row.multiplier;
}

export function calculateJumpRange(jump: number) {
  if (!Number.isFinite(jump) || jump < 0 || jump > 100) throw new Error("Receiver jump must be between 0 and 100.");
  const jumpMin = -0.000000001346011198228*jump**5 + 0.0000004628327781037*jump**4 -
    0.00005390914652*jump**3 + 0.00233376395938*jump**2 + 0.088643141056935*jump - 5;
  const jumpMax = 0.00000000236812880491*jump**5 - 0.0000006163393289829*jump**4 +
    0.000072749909589*jump**3 - 0.004114788843524*jump**2 + 0.186106279295931*jump - 3;
  if (jumpMax < jumpMin) throw new Error("Invalid receiver jump effect range.");
  return { jumpMin, jumpMax };
}

export function rollReceiverJump(
  jump: number, actualOpenness: number, throwType: ThrowType, airYards: number, yardsToGoal: number,
  effects: readonly JumpEffectRow[], airTable: readonly JumpAirYardsRow[], route: string,
  routeTable: readonly JumpRouteRow[], random: () => number = Math.random,
) {
  const { jumpMin, jumpMax } = calculateJumpRange(jump);
  if (!Number.isFinite(actualOpenness) || !Number.isFinite(airYards) || airYards < 0 || !Number.isFinite(yardsToGoal) || yardsToGoal < 0)
    throw new Error("Invalid receiver jump throw inputs.");
  if (!effects.length || !airTable.length) throw new Error("Missing jump Settings tables.");
  const sorted = [...effects].sort((a, b) => a.minOpen - b.minOpen);
  const band = [...sorted].reverse().find((row) => actualOpenness >= row.minOpen) ?? sorted[0];
  const jumpEffectMultiplier = band.multipliers[throwType];
  const isEndZoneThrow = airYards >= yardsToGoal;
  const depths = airTable.filter((row): row is JumpAirYardsRow & { airYards: number } => typeof row.airYards === "number")
    .sort((a, b) => a.airYards - b.airYards);
  const airBand = isEndZoneThrow ? airTable.find((row) => row.airYards === "EndZone")
    : depths.find((row) => airYards <= row.airYards) ?? depths.at(-1);
  if (!Number.isFinite(jumpEffectMultiplier) || !airBand || !Number.isFinite(airBand.multiplier))
    throw new Error("Missing or invalid jump multiplier in Settings.");
  const jumpRouteMultiplier = getJumpRouteMultiplier(routeTable, route);
  const jumpMod = jumpMin + random() * (jumpMax - jumpMin);
  return { receiverJump: jump, jumpMin, jumpMax, jumpMod, jumpOpennessBand: band.label,
    jumpEffectMultiplier, jumpAirYardsMultiplier: airBand.multiplier, jumpRouteMultiplier, isEndZoneThrow,
    jumpAdjustment: jumpMod * jumpEffectMultiplier * airBand.multiplier * jumpRouteMultiplier };
}
