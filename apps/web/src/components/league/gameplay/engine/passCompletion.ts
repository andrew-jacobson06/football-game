import { getRouteOpenness, type RouteOpennessSettings, type RouteWithPhaseOpenness } from "./routeOpenness";
import { rollQBAccuracy, type AccuracyModRow } from "./qbAccuracy";
import { rollReceiverHands, type HandsImpactRow } from "./receiverHands";

export type CompletionDepthRow = { label?: string; pastLos: number; baseCompletion: number };
export type OpennessCompletionRow = { label: string; minOpen: number; maxOpen: number | null; minAdjust: number; maxAdjust: number };
export type PassCompletionSettings = Pick<RouteOpennessSettings, "curves"> & {
  completionTable: readonly CompletionDepthRow[];
  opennessCompletionModifiers: readonly OpennessCompletionRow[];
  accuracyModifiers: readonly AccuracyModRow[];
  handsImpactByOpenness: readonly HandsImpactRow[];
};

export function getBaseCompletion(table: readonly CompletionDepthRow[], airYards: number) {
  if (!Number.isFinite(airYards) || airYards < 0) throw new Error("Invalid throw air yards.");
  const sorted = [...table].sort((a, b) => a.pastLos - b.pastLos);
  if (!sorted.length) throw new Error("Missing Completion Pct table in Settings.");
  // past los is the upper bound: 8 air yards uses the 11-yard row.
  return (sorted.find((row) => airYards <= row.pastLos) ?? sorted[sorted.length - 1]).baseCompletion;
}

export function getOpennessCompletionAdjustment(table: readonly OpennessCompletionRow[], actualOpenness: number) {
  if (!Number.isFinite(actualOpenness)) throw new Error("Invalid actual receiver openness.");
  const sorted = [...table].sort((a, b) => a.minOpen - b.minOpen);
  if (!sorted.length) throw new Error("Missing Openness Completion Modifier table in Settings.");
  // Scores remain decimals; gaps between integer-labelled bands hold the lower band's endpoint.
  const band = [...sorted].reverse().find((row) => actualOpenness >= row.minOpen) ?? sorted[0];
  const maxOpen = band.maxOpen ?? 100;
  const fraction = maxOpen === band.minOpen ? 0 :
    Math.max(0, Math.min(1, (actualOpenness - band.minOpen) / (maxOpen - band.minOpen)));
  return { opennessAdjustment: band.minAdjust + fraction * (band.maxAdjust - band.minAdjust),
    opennessBand: band.label };
}

export function calculateThrowCompletion(
  settings: PassCompletionSettings,
  target: RouteWithPhaseOpenness & { TTO: number; curveType: string; airYards: number },
  throwTime: number,
  qbAccuracy: number,
  receiverHands: number,
  random: () => number = Math.random,
) {
  const baseCompletion = getBaseCompletion(settings.completionTable, target.airYards);
  const { openness: actualOpenness } = getRouteOpenness(settings, target, throwTime);
  const { opennessAdjustment, opennessBand } = getOpennessCompletionAdjustment(settings.opennessCompletionModifiers, actualOpenness);
  const accuracy = rollQBAccuracy(qbAccuracy, settings.accuracyModifiers, random);
  const hands = rollReceiverHands(receiverHands, actualOpenness, settings.handsImpactByOpenness, random);
  return { throwTime, airYards: target.airYards, baseCompletion, actualOpenness,
    opennessAdjustment, opennessBand, ...accuracy, ...hands,
    pct: Math.max(0, Math.min(100, baseCompletion + opennessAdjustment + accuracy.accuracyAdjustment + hands.handsAdjustment)) };
}
