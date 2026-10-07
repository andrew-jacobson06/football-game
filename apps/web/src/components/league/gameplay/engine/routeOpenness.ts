import type { PlayerTrait } from "./types";

export const ROUTE_PHASES = ["Release", "Stem", "Break", "Sustain"] as const;
type RoutePhase = typeof ROUTE_PHASES[number];
type TraitImpacts = { speed: number; acceleration: number; routeCoverage: number; size: number };
const MATCHUP_TRAITS = [
  ["speed", "Speed", ["speed"], ["speed"]],
  ["acceleration", "Accel", ["acceleration", "accel"], ["acceleration", "accel"]],
  ["routeCoverage", "Route/Coverage", ["routeRunning"], ["coverage"]],
  ["size", "Size", ["size"], ["size"]],
] as const;
export type PhaseTraitContest = {
  receiverTrait: number;
  defenderTrait: number;
  receiverWinNumber: number;
  roll: number;
  winner: "WR" | "DB";
  baseImpact: number;
  phaseModifier: number;
  signedImpact: number;
};
export type RouteOpennessSettings = {
  curves: Record<string, Array<{ time: number; openness: number }>>;
  phaseWeights: Record<string, TraitImpacts>;
  routeTree: Record<string, { type: string; curveType: string; timingMod: number; phases: Record<RoutePhase, number> }>;
  baseTTO: Record<string, number>;
  baseImpacts: Record<string, { base: number; max: number; diffWeight: number }>;
};

function lookup<T>(values: Record<string, T>, name: string): T {
  const entry = Object.entries(values).find(([key]) => key.trim().toLowerCase() === name.trim().toLowerCase());
  if (!entry) throw new Error(`Missing route openness setting: ${name}.`);
  return entry[1];
}
function playerTrait(player: PlayerTrait, names: string[]) {
  for (const name of names) {
    const entry = Object.entries(player).find(([key]) => key.replace(/\s/g, "").toLowerCase() === name.toLowerCase());
    if (entry && entry[1] != null && entry[1] !== "" && Number.isFinite(Number(entry[1]))) return Number(entry[1]);
  }
  throw new Error(`Missing matchup trait: ${names[0]}.`);
}

/** Prepare timing and matchup inputs; curve selection and graph generation come later. */
export function calculateRouteOpennessInputs(
  settings: RouteOpennessSettings,
  route: string,
  depth: string,
  receiver: PlayerTrait,
  defender: PlayerTrait,
) {
  // The route matrix calls this WR Screen; older RouteTreeDetails calls it Screen.
  const routeTreeName = route.trim().toLowerCase() === "wr screen" &&
    !Object.keys(settings.routeTree).some((key) => key.trim().toLowerCase() === "wr screen")
    ? "Screen" : route;
  const details = lookup(settings.routeTree, routeTreeName);
  const baseTTO = lookup(settings.baseTTO, depth);
  const timeToOpen = baseTTO + details.timingMod;
  if (!Number.isFinite(timeToOpen) || timeToOpen < 0) throw new Error("Invalid route time to open.");
  const percentages = ROUTE_PHASES.map((phase) => details.phases[phase]);
  if (percentages.some((pct) => !Number.isFinite(pct) || pct < 0) ||
      Math.abs(percentages.reduce((sum, pct) => sum + pct, 0) - 100) > 0.000001)
    throw new Error(`Route phase percentages for ${route} must total 100.`);
  let start = 0;
  const phases = ROUTE_PHASES.map((phase, index) => {
    const percentage = percentages[index];
    const duration = timeToOpen * percentage / 100;
    const end = index === ROUTE_PHASES.length - 1 ? timeToOpen : start + duration;
    const result = { phase, percentage, start, end, duration, weights: lookup(settings.phaseWeights, phase) };
    start = end;
    return result;
  });
  const traitImpacts = Object.fromEntries(MATCHUP_TRAITS.map(([trait, setting, receiverKeys, defenderKeys]) => {
    const { base, max, diffWeight } = lookup(settings.baseImpacts, setting);
    if (![base, max, diffWeight].every(Number.isFinite) || max < 0 || diffWeight < 0)
      throw new Error(`Invalid base impact setting: ${setting}.`);
    const difference = Math.abs(playerTrait(receiver, [...receiverKeys]) - playerTrait(defender, [...defenderKeys]));
    return [trait, base + Math.min(max, difference * diffWeight)];
  })) as TraitImpacts;
  return { route, depth, routeType: details.type, curveType: details.curveType, baseTTO, timingMod: details.timingMod, timeToOpen, phases, traitImpacts };
}

/** Interpolate the curve at elapsedSeconds / TTO. This excludes matchup phase impacts. */
export function calculateBaseOpenness(
  settings: Pick<RouteOpennessSettings, "curves">,
  curveType: string,
  timeToOpen: number,
  elapsedSeconds: number,
) {
  if (!Number.isFinite(timeToOpen) || timeToOpen <= 0)
    throw new Error("Base openness requires a positive TTO.");
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0)
    throw new Error("Base openness requires a nonnegative elapsed time.");
  if (!curveType?.trim()) throw new Error("Missing Curve Type in RouteTreeDetails.");
  const points = [...lookup(settings.curves, curveType)].sort((a, b) => a.time - b.time);
  if (!points.length || points.some((point, index) =>
    !Number.isFinite(point.time) || point.time < 0 || !Number.isFinite(point.openness) ||
    (index > 0 && point.time === points[index - 1].time)))
    throw new Error(`Missing or invalid openness curve: ${curveType}.`);
  const progress = elapsedSeconds / timeToOpen;
  let previous = { time: 0, openness: 0 };
  for (const point of points) {
    if (progress === point.time) return point.openness;
    if (progress < point.time) {
      const fraction = (progress - previous.time) / (point.time - previous.time);
      return previous.openness + fraction * (point.openness - previous.openness);
    }
    previous = point;
  }
  return previous.openness;
}

export function getRouteBaseOpenness(
  settings: Pick<RouteOpennessSettings, "curves">,
  route: { TTO: number; curveType: string },
  elapsedSeconds: number,
) {
  return calculateBaseOpenness(settings, route.curveType, route.TTO, elapsedSeconds);
}

export type RouteWithPhaseOpenness = {
  phaseOpenness: ReadonlyArray<{ start: number; end: number; duration: number; phaseImpact: number }>;
};

/** Accumulate the stored phase impacts without rolling any new trait contests. */
export function getSkillBasedOpennessMod(route: RouteWithPhaseOpenness, elapsedSeconds: number) {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0)
    throw new Error("Skill openness requires a nonnegative elapsed time.");
  return route.phaseOpenness.reduce((total, phase) => {
    const { start, end, duration, phaseImpact } = phase;
    if (![start, end, duration, phaseImpact].every(Number.isFinite) ||
        start < 0 || end < start || duration < 0 || (end > start && duration === 0))
      throw new Error("Invalid phase openness timing or impact.");
    if (elapsedSeconds >= end) return total + phaseImpact;
    if (elapsedSeconds <= start) return total;
    return total + (elapsedSeconds - start) / duration * phaseImpact;
  }, 0);
}

/** Combine the Settings curve with the skill impact accrued by this time. */
export function getRouteOpenness(
  settings: Pick<RouteOpennessSettings, "curves">,
  route: RouteWithPhaseOpenness & { TTO: number; curveType: string },
  elapsedSeconds: number,
) {
  const baseOpenness = getRouteBaseOpenness(settings, route, elapsedSeconds);
  const skillBasedOpennessMod = getSkillBasedOpennessMod(route, elapsedSeconds);
  return { baseOpenness, skillBasedOpennessMod, openness: baseOpenness + skillBasedOpennessMod };
}

/** Query every current receiver route using the same elapsed time since the snap. */
export function getCurrentRouteOpenness<T extends RouteWithPhaseOpenness & { TTO: number; curveType: string }>(
  settings: Pick<RouteOpennessSettings, "curves">,
  routes: readonly T[],
  elapsedSeconds: number,
) {
  return routes.map((route) => ({ ...route, ...getRouteOpenness(settings, route, elapsedSeconds) }));
}

/** Roll independent WR/DB contests for every trait in every phase of this snap. */
export function calculateRoutePhaseImpacts(
  inputs: ReturnType<typeof calculateRouteOpennessInputs>,
  receiver: PlayerTrait,
  defender: PlayerTrait,
  random: () => number = Math.random,
) {
  const phaseOpenness = inputs.phases.map((phase) => {
    const traits = Object.fromEntries(MATCHUP_TRAITS.map(([trait, , receiverKeys, defenderKeys]) => {
      const receiverTrait = playerTrait(receiver, [...receiverKeys]);
      const defenderTrait = playerTrait(defender, [...defenderKeys]);
      const receiverWinNumber = Math.max(5, 50 + receiverTrait - defenderTrait);
      const roll = random() * 100;
      const winner = roll < receiverWinNumber ? "WR" : "DB";
      const baseImpact = inputs.traitImpacts[trait];
      const phaseModifier = phase.weights[trait];
      if (!Number.isFinite(baseImpact) || !Number.isFinite(phaseModifier))
        throw new Error(`Invalid ${phase.phase} ${trait} impact or phase modifier.`);
      const signedImpact = baseImpact * phaseModifier * (winner === "WR" ? 1 : -1);
      return [trait, { receiverTrait, defenderTrait, receiverWinNumber, roll, winner,
        baseImpact, phaseModifier, signedImpact }];
    })) as Record<keyof TraitImpacts, PhaseTraitContest>;
    const traitImpactSum = Object.values(traits).reduce((sum, contest) => sum + contest.signedImpact, 0);
    // Sheet percentages are 35, 0, 5, 60: convert to fractions before weighting.
    const phaseImpact = phase.percentage === 0 ? 0 : traitImpactSum * phase.percentage / 100;
    return { ...phase, traits, traitImpactSum, phaseImpact };
  });
  const phaseImpacts = Object.fromEntries(phaseOpenness.map(({ phase, phaseImpact }) =>
    [phase, phaseImpact])) as Record<RoutePhase, number>;
  return { phaseOpenness, phaseImpacts };
}
