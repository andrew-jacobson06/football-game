import { getCurrentRouteOpenness, type RouteOpennessSettings, type RouteWithPhaseOpenness } from "./routeOpenness";

type ReadRoute = RouteWithPhaseOpenness & { player: string; TTO: number; curveType: string };
export type PassReadLoopState = {
  currentTime: number;
  currentRead: number;
  currentReadPlayer?: string;
  readDefenseModifier: number;
  stopReason: "read-ready" | "time-to-throw" | "no-routes";
  snapshots: Array<{
    currentTime: number;
    currentRead: number;
    receivers: Array<{ player: string; baseOpenness: number; skillBasedOpennessMod: number;
      openness: number; readDefenseAdjustment: number; perceivedOpenness: number }>;
  }>;
};

export function calculateReadDefenseModifier(readDefense: number) {
  if (!Number.isFinite(readDefense)) throw new Error("Invalid QB read defense trait.");
  return 0.00000055296676 * readDefense ** 4 - 0.00014271986272 * readDefense ** 3 +
    0.011884760129588 * readDefense ** 2 - 0.536559194662642 * readDefense + 23;
}

function readOrder(value: string | undefined) {
  const labels: Record<string, number> = { Primary: 1, "2nd": 2, "3rd": 3, "4th": 4, Checkdown: 5 };
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : labels[value ?? ""] ?? Infinity;
}

/** Initial unpressured loop; read advancement and throw decisions are still pending. */
export function runUnpressuredReadLoop(
  settings: Pick<RouteOpennessSettings, "curves">,
  routes: readonly ReadRoute[],
  timeToThrow: number,
  readDefense: number,
  reads: Record<string, string> = {},
  random: () => number = Math.random,
): PassReadLoopState {
  if (!Number.isFinite(timeToThrow) || timeToThrow < 0) throw new Error("Invalid time to throw for read loop.");
  const firstRead = [...routes].sort((a, b) => readOrder(reads[a.player]) - readOrder(reads[b.player]))[0];
  const state: PassReadLoopState = {
    currentTime: 0, currentRead: 1, currentReadPlayer: firstRead?.player,
    readDefenseModifier: calculateReadDefenseModifier(readDefense),
    stopReason: firstRead ? "time-to-throw" : "no-routes", snapshots: [],
  };
  if (!firstRead) return state;
  while (state.currentTime < timeToThrow) {
    state.currentTime += 0.25;
    if (state.currentTime >= firstRead.TTO) {
      state.stopReason = "read-ready";
      break;
    }
    const receivers = getCurrentRouteOpenness(settings, routes, state.currentTime).map((route) => {
      const readDefenseAdjustment = state.readDefenseModifier * (random() < 0.5 ? 1 : -1);
      return { player: route.player, baseOpenness: route.baseOpenness,
        skillBasedOpennessMod: route.skillBasedOpennessMod, openness: route.openness,
        readDefenseAdjustment, perceivedOpenness: route.openness + readDefenseAdjustment };
    });
    state.snapshots.push({ currentTime: state.currentTime, currentRead: state.currentRead, receivers });
    // more to come in this loop
  }
  return state;
}
