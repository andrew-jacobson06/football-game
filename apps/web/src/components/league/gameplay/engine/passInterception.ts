import type { ThrowType } from "./qbAccuracy";

export type InterceptionAccuracyMultiplier = { throwType: ThrowType; multiplier: number };

/** Openness uses actual separation at throw time, never QB-perceived openness. */
export function routeJumpBaseChance(readQB: number, openness: number) {
  if (!Number.isFinite(readQB) || !Number.isFinite(openness)) throw new Error("Invalid route-jump inputs.");
  const x = readQB;
  if (openness >= 90) return 0;
  // Erased also covers Blanketed/Covered (0–39), per the initial model.
  if (openness < 40) return -1.679051075484e-8*x**5+.000005831971258*x**4-.000684674204089*x**3+.032430962752923*x**2-.333918342506243*x;
  if (openness < 50) return 2.276746055154e-8*x**5-.000004786280479*x**4+.000337561274663*x**3-.008911543560402*x**2+.207662422847020*x;
  if (openness < 60) return 6.937683040108e-9*x**5-.000001202080967*x**4+.000073471826182*x**3-.001874599144803*x**2+.116949993617911*x;
  if (openness < 70) return 6.747761337728e-9*x**5-.000001113510340*x**4+.000048825312129*x**3+.000714784612349*x**2+.009212773212960*x;
  if (openness < 80) return 2.913572903875e-8*x**5-.000007610961213*x**4+.000717358716611*x**3-.027853239018590*x**2+.388537004495594*x;
  return 1.379283559622e-8*x**5-.000003230915464*x**4+.000265084794235*x**3-.008626949048667*x**2+.096294677336658*x;
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
