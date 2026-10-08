import { getCurrentRouteOpenness, type RouteOpennessSettings, type RouteWithPhaseOpenness } from "./routeOpenness";

type ReadRoute = RouteWithPhaseOpenness & { player: string; TTO: number; curveType: string };
export type QBDecisionRow = { perceivedMax: number; label: string; baseNotice: number | null; noticeIfPrimary: number | null };

function getNoticeRow(table: readonly QBDecisionRow[], perceivedOpenness: number) {
  if (!Number.isFinite(perceivedOpenness)) throw new Error("Invalid perceived openness.");
  if (!table.length) throw new Error("Missing QB Decision Table in Settings.");
  // Decimal scores enter the first band whose upper bound contains them.
  return table.find((row) => perceivedOpenness <= row.perceivedMax) ?? table[table.length - 1];
}

export function getPrimaryNoticeChance(table: readonly QBDecisionRow[], perceivedOpenness: number) {
  const row = getNoticeRow(table, perceivedOpenness);
  return { label: row.label, chance: row.noticeIfPrimary ?? 0 };
}

export function getBaseNoticeChance(table: readonly QBDecisionRow[], perceivedOpenness: number) {
  const row = getNoticeRow(table, perceivedOpenness);
  return { label: row.label, chance: row.baseNotice ?? 0 };
}
export type PassReadLoopState = {
  currentTime: number;
  currentRead: number;
  currentReadPlayer?: string;
  readDefenseModifier: number;
  stopReason: "throw" | "reads-exhausted" | "time-to-throw" | "no-routes";
  targetPlayer?: string;
  decisions: Array<{ currentTime: number; currentRead: number; player: string;
    perceivedOpenness: number; label: string; noticeChance: number; roll: number;
    noticeType: "base" | "primary"; throw: boolean; readDelay?: number }>;
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

/** Check base notice while waiting, then primary notice when the current read is ready. */
export function runUnpressuredReadLoop(
  settings: Pick<RouteOpennessSettings, "curves"> & { qbDecisionTable: readonly QBDecisionRow[] },
  routes: readonly ReadRoute[],
  timeToThrow: number,
  readDefense: number,
  reads: Record<string, string> = {},
  random: () => number = Math.random,
): PassReadLoopState {
  if (!Number.isFinite(timeToThrow) || timeToThrow < 0) throw new Error("Invalid time to throw for read loop.");
  const orderedReads = [...routes].sort((a, b) => readOrder(reads[a.player]) - readOrder(reads[b.player]));
  const firstRead = orderedReads[0];
  const state: PassReadLoopState = {
    currentTime: 0, currentRead: 1, currentReadPlayer: firstRead?.player,
    readDefenseModifier: calculateReadDefenseModifier(readDefense),
    stopReason: firstRead ? "time-to-throw" : "no-routes", snapshots: [], decisions: [],
  };
  if (!firstRead) return state;
  while (state.currentTime < timeToThrow) {
    state.currentTime += 0.25;
    const currentRoute = orderedReads[state.currentRead - 1];
    const receivers = getCurrentRouteOpenness(settings, routes, state.currentTime).map((route) => {
      const readDefenseAdjustment = state.readDefenseModifier * (random() < 0.5 ? 1 : -1);
      return { player: route.player, baseOpenness: route.baseOpenness,
        skillBasedOpennessMod: route.skillBasedOpennessMod, openness: route.openness,
        readDefenseAdjustment, perceivedOpenness: route.openness + readDefenseAdjustment };
    });
    state.snapshots.push({ currentTime: state.currentTime, currentRead: state.currentRead, receivers });
    console.log(`[Pass Engine] QB look at ${state.currentTime.toFixed(2)}s`, {
      currentTime: state.currentTime,
      currentRead: state.currentRead,
      currentReadPlayer: currentRoute.player,
      receivers,
    });
    if (state.currentTime >= timeToThrow) break;
    if (state.currentTime < currentRoute.TTO) {
      // While waiting for this read, an open receiver can attract the QB's notice.
      for (const route of orderedReads) {
        const perceivedOpenness = receivers.find((receiver) => receiver.player === route.player)!.perceivedOpenness;
        const { label, chance } = getBaseNoticeChance(settings.qbDecisionTable, perceivedOpenness);
        if (chance <= 0) continue; // NA/zero bands consume no notice roll.
        const roll = random() * 100;
        const decision: PassReadLoopState["decisions"][number] = {
          currentTime: state.currentTime, currentRead: state.currentRead, player: route.player,
          perceivedOpenness, label, noticeChance: chance, roll, noticeType: "base", throw: roll < chance,
        };
        state.decisions.push(decision);
        if (decision.throw) {
          state.targetPlayer = route.player;
          state.stopReason = "throw";
          break;
        }
      }
      if (state.targetPlayer) break;
      continue;
    }
    const perceivedOpenness = receivers.find((receiver) => receiver.player === currentRoute.player)!.perceivedOpenness;
    const { label, chance } = getPrimaryNoticeChance(settings.qbDecisionTable, perceivedOpenness);
    const roll = random() * 100;
    const decision: PassReadLoopState["decisions"][number] = {
      currentTime: state.currentTime, currentRead: state.currentRead, player: currentRoute.player,
      perceivedOpenness, label, noticeChance: chance, roll, noticeType: "primary", throw: roll < chance,
    };
    state.decisions.push(decision);
    if (decision.throw) {
      state.targetPlayer = currentRoute.player;
      state.stopReason = "throw";
      break;
    }
    state.currentRead += 1;
    decision.readDelay = 0.05 + random() * 0.25;
    state.currentTime += decision.readDelay;
    state.currentReadPlayer = orderedReads[state.currentRead - 1]?.player;
    if (!state.currentReadPlayer) {
      state.stopReason = "reads-exhausted";
      break;
    }
    // more to come in this loop
  }
  return state;
}
