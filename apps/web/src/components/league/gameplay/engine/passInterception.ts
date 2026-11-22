import type { ThrowType } from "./qbAccuracy";

export type InterceptionAccuracyMultiplier = { throwType: ThrowType; multiplier: number };

/** Openness uses actual separation at throw time, never QB-perceived openness. */
export function routeJumpBaseChance(readQB: number, openness: number) {
  if (!Number.isFinite(readQB) || !Number.isFinite(openness)) throw new Error("Invalid route-jump inputs.");
  const x = readQB;
  if (openness >= 90) return 0;
  // Erased also covers Blanketed/Covered (0–39), per the initial model.
  if (openness < 40) return 4.359048973647e-8*x**5-.000011056955632*x**4+.000999154564762*x**3-.035943229125835*x**2+.508953937533406*x;
  if (openness < 50) return 1.759703590336e-8*x**5-.000003264293908*x**4+.000153173542784*x**3+.002288096293192*x**2-.099283407538656*x;
  if (openness < 60) return -1.671117818401e-8*x**5+.000005379730383*x**4-.000610321699162*x**3+.030010497521287*x**2-.482742062410360*x;
  if (openness < 70) return 2.679007045871e-8*x**5-.000007487817968*x**4+.000764177038751*x**3-.031730754220224*x**2+.444634419803093*x;
  if (openness < 80) return 2.230769793417e-8*x**5-.000005552260203*x**4+.000507157625063*x**3-.019434228850325*x**2+.258426793096962*x;
  return 7.415474161268e-10*x**5-4.360268759316e-9*x**4-.000010765789894*x**3+.000680927611291*x**2-.011221543584269*x;
}

export function pickBaseChance(ballHawk: number) {
  if (!Number.isFinite(ballHawk)) throw new Error("Invalid DB ballHawk trait.");
  const x = ballHawk;
  return 1.939194515525e-8*x**5-.000003397453081*x**4+.000181220101944*x**3+.000208636190734*x**2-.060000086536811*x;
}

function multiplier(rows: readonly InterceptionAccuracyMultiplier[], throwType: ThrowType, title: string) {
  const row = rows.find(row => row.throwType === throwType);
  if (!row || !Number.isFinite(row.multiplier) || row.multiplier < 0) throw new Error(`Missing or invalid ${title} Settings for ${throwType}.`);
  return row.multiplier;
}

/** Route jump precedes completion. Only a beaten receiver triggers a pick/deflect roll. */
export function rollPassInterception(readQB: number, ballHawk: number, actualOpenness: number, throwType: ThrowType,
  beatMultipliers: readonly InterceptionAccuracyMultiplier[], pickMultipliers: readonly InterceptionAccuracyMultiplier[],
  random: () => number = Math.random,
) {
  const baseBeatWRtoBall = routeJumpBaseChance(readQB, actualOpenness);
  const accuracyMultiplier = multiplier(beatMultipliers, throwType, "DB beats WR to ball based on accuracy");
  const beatWRtoBall = Math.max(0, Math.min(100, baseBeatWRtoBall * accuracyMultiplier));
  // Wide-open throws cannot be jumped and consume no interception rolls.
  const beatRoll = actualOpenness >= 90 ? null : random() * 100;
  const beatsWRtoBall = beatRoll !== null && beatRoll < beatWRtoBall;
  const basePickPctChance = beatsWRtoBall ? pickBaseChance(ballHawk) : null;
  const pickAccuracyMultiplier = beatsWRtoBall ? multiplier(pickMultipliers, throwType, "Pick Multiplier based on accuracy") : null;
  const pickPctChance = basePickPctChance === null ? null : Math.max(0, Math.min(100, basePickPctChance * pickAccuracyMultiplier!));
  const pickRoll = beatsWRtoBall ? random() * 100 : null;
  const intercepted = pickRoll !== null && pickRoll < pickPctChance!;
  return { actualOpenness, throwType, readQB, ballHawk, baseBeatWRtoBall, accuracyMultiplier, beatWRtoBall, beatRoll,
    beatsWRtoBall, basePickPctChance, pickAccuracyMultiplier, pickPctChance, pickRoll, intercepted, deflected: beatsWRtoBall && !intercepted };
}
