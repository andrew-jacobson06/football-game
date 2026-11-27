import type { ThrowType } from "./qbAccuracy";

export type InterceptionAccuracyMultiplier = { throwType: ThrowType; multiplier: number };

/** Openness uses actual separation at throw time, never QB-perceived openness. */
export function routeJumpBaseChance(readQB: number, openness: number) {
  if (!Number.isFinite(readQB) || !Number.isFinite(openness)) throw new Error("Invalid route-jump inputs.");
  const x = readQB;
  if (openness >= 90) return 0;
  // Erased also covers Blanketed/Covered (0–39), per the initial model.
  if (openness < 40) return 7.978943600419e-9*x**5-.000001233729533*x**4+.000063374174677*x**3-.002528265255643*x**2+.312325620198559*x;
  if (openness < 50) return -4.223248553465e-9*x**5+.000002600881240*x**4-.000384617967820*x**3+.020840509622191*x**2-.179195413115957*x;
  if (openness < 60) return -1.653507118037e-8*x**5+.000005456512321*x**4-.000614431990125*x**3+.028581854862956*x**2-.321732613130671*x;
  if (openness < 70) return -3.330465599332e-9*x**5+.000002161745606*x**4-.000333091718330*x**3+.019294003972040*x**2-.251373693564478*x;
  if (openness < 80) return 1.948696681687e-8*x**5-.000005000946110*x**4+.000458375960872*x**3-.016799229237680*x**2+.277346280863901*x;
  return -3.391451305887e-9*x**5+.000001301712864*x**4-.000160885722298*x**3+.008664939507030*x**2-.147550206904126*x;
}

export function pickBaseChance(ballHawk: number) {
  if (!Number.isFinite(ballHawk)) throw new Error("Invalid DB ballHawk trait.");
  const x = ballHawk;
  return -2.943382176385e-9*x**5+.000002485512251*x**4-.000383451133151*x**3+.021964347238701*x**2-.211882421884300*x;
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

/** Second opportunity: only a non-jumped, incomplete Close-or-worse throw reaches this check. */
export function rollIncompletePassInterception(ballHawk: number, throwType: ThrowType,
  pickMultipliers: readonly InterceptionAccuracyMultiplier[], random: () => number = Math.random,
) {
  if (!Number.isFinite(ballHawk)) throw new Error("Invalid DB ballHawk trait.");
  const result = { ballHawk, throwType, intercepted: false,
    ballHawkChance: null as number | null, ballHawkRoll: null as number | null, passedBallHawkCheck: false,
    basePickPctChance: null as number | null, pickAccuracyMultiplier: null as number | null,
    pickPctChance: null as number | null, pickRoll: null as number | null };
  // Accurate/Perfect incompletions consume no ball-hawk or pick rolls.
  if (throwType === "Perfect" || throwType === "Accurate") return { ...result, reason: "accurate-or-better" };
  result.ballHawkChance = Math.max(0, Math.min(100, (ballHawk / 12) ** 2));
  result.ballHawkRoll = random() * 100;
  result.passedBallHawkCheck = result.ballHawkRoll < result.ballHawkChance;
  if (!result.passedBallHawkCheck) return { ...result, reason: "ball-hawk-check-failed" };
  result.basePickPctChance = pickBaseChance(ballHawk);
  result.pickAccuracyMultiplier = multiplier(pickMultipliers, throwType, "Pick Multiplier based on accuracy");
  result.pickPctChance = Math.max(0, Math.min(100, result.basePickPctChance * result.pickAccuracyMultiplier));
  result.pickRoll = random() * 100;
  result.intercepted = result.pickRoll < result.pickPctChance;
  return { ...result, reason: result.intercepted ? "intercepted" : "pick-roll-failed" };
}
