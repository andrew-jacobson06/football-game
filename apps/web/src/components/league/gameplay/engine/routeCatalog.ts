export type RouteDepthRange = { label?: string; routeType: string; minAirYards: number; maxAirYards: number | null };
export function routeDepthBounds(range: RouteDepthRange, yardsToGoal: number) {
  return { min: range.minAirYards, max: range.maxAirYards ?? Math.max(range.minAirYards, yardsToGoal) };
}
export function routePreviewDepth(range: RouteDepthRange, yardsToGoal: number) {
  const { min, max } = routeDepthBounds(range, yardsToGoal);
  return (min + max) / 2;
}
