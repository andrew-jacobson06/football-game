import { getCurrentRouteOpenness, type RouteOpennessSettings, type RouteWithPhaseOpenness } from "./routeOpenness";

type ReadRoute = RouteWithPhaseOpenness & { player: string; TTO: number; curveType: string };
export type QBDecisionRow = { perceivedMax: number; label: string; noticeIfPrimary: number | null; secondReadNotice: number | null; thirdReadNotice: number | null; fourthReadNotice: number | null };

function getNoticeRow(table: readonly QBDecisionRow[], perceivedOpenness: number) {
  if (!Number.isFinite(perceivedOpenness)) throw new Error("Invalid perceived openness.");
  if (!table.length) throw new Error("Missing QB Decision Table in Settings.");
  // Decimal scores enter the first band whose upper bound contains them.
  return table.find((row) => perceivedOpenness <= row.perceivedMax) ?? table[table.length - 1];
}

export function getReadNoticeChance(table: readonly QBDecisionRow[], perceivedOpenness: number, rank: number) {
  const row = getNoticeRow(table, perceivedOpenness);
  const chances = [row.noticeIfPrimary, row.secondReadNotice, row.thirdReadNotice, row.fourthReadNotice];
  return { label: row.label, chance: chances[Math.min(4, Math.max(1, rank)) - 1] ?? 0 };
}

/** Declined reads move behind the remaining reads; after one cycle every rank is 2. */
export function rankQBReads<T>(reads: readonly T[], currentRead: number | null) {
  if (currentRead === null) return reads.map((route) => ({ route, readRank: 2 }));
  const start = currentRead - 1;
  return [...reads.slice(start), ...reads.slice(0, start)]
    .map((route, index) => ({ route, readRank: Math.min(4, index + 1) }));
}
export type PassReadLoopState = {
  currentTime: number;
  currentRead: number | null;
  currentReadPlayer?: string;
  readDefenseModifier: number;
  stopReason: "throw" | "time-to-throw" | "no-routes";
  decision: "pending" | "throw" | "throw-away" | "scramble";
  expirationDecision?: { roll: number; action: "force-throw" | "throw-away" | "scramble" };
  targetPlayer?: string;
  decisions: Array<{ currentTime: number; currentRead: number | null; player: string;
    perceivedOpenness: number; label: string; noticeChance: number; roll: number | null;
    noticeType: "scan" | "current"; readRank: number; throw: boolean; readDelay?: number }>;
  snapshots: Array<{
    currentTime: number;
    currentRead: number | null;
    receivers: Array<{ player: string; baseOpenness: number; skillBasedOpennessMod: number;
      openness: number; readDefenseAdjustment: number; perceivedOpenness: number; readRank: number; noticeChance: number; label: string }>;
  }>;
};

export function calculateReadDefenseModifier(readDefense: number) {
  if (!Number.isFinite(readDefense)) throw new Error("Invalid QB read defense trait.");
  return 0.00000055296676 * readDefense ** 4 - 0.00014271986272 * readDefense ** 3 +
    0.011884760129588 * readDefense ** 2 - 0.536559194662642 * readDefense + 23;
}

export function chooseTimeExpiredAction(random: () => number = Math.random) {
  const roll = random() * 100;
  const action = roll < 50 ? "force-throw" : roll < 75 ? "throw-away" : "scramble";
  return { roll, action } as { roll: number; action: "force-throw" | "throw-away" | "scramble" };
}

function readOrder(value: string | undefined) {
  const labels: Record<string, number> = { Primary: 1, "2nd": 2, "3rd": 3, "4th": 4, Checkdown: 5 };
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : labels[value ?? ""] ?? Infinity;
}

/** Use rotating notice ranks while waiting; the ready current read uses rank 1. */
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
    currentTime: 0, currentRead: firstRead ? 1 : null, currentReadPlayer: firstRead?.player,
    readDefenseModifier: calculateReadDefenseModifier(readDefense),
    stopReason: firstRead ? "time-to-throw" : "no-routes", decision: "pending", snapshots: [], decisions: [],
  };
  function look() {
    const currentRoute = orderedReads[(state.currentRead ?? 0) - 1];
    const rankedReads = rankQBReads(orderedReads, state.currentRead);
    const receivers = getCurrentRouteOpenness(settings, rankedReads.map(({ route }) => route), state.currentTime).map((route, index) => {
      const readDefenseAdjustment = state.readDefenseModifier * (random() < 0.5 ? 1 : -1);
      const perceivedOpenness = route.openness + readDefenseAdjustment;
      const readRank = rankedReads[index].readRank;
      const { label, chance } = getReadNoticeChance(settings.qbDecisionTable, perceivedOpenness, readRank);
      return { player: route.player, readRank, label, noticeChance: chance, baseOpenness: route.baseOpenness,
        skillBasedOpennessMod: route.skillBasedOpennessMod, openness: route.openness,
        readDefenseAdjustment, perceivedOpenness };
    });
    state.snapshots.push({ currentTime: state.currentTime, currentRead: state.currentRead, receivers });
    console.log(`[Pass Engine] QB look at ${state.currentTime.toFixed(2)}s`, {
      currentTime: state.currentTime,
      currentRead: state.currentRead,
      currentReadPlayer: currentRoute?.player,
      receivers,
    });
    return receivers;
  }
  while (state.currentTime < timeToThrow) {
    state.currentTime = Math.min(timeToThrow, state.currentTime + 0.25);
    const currentRoute = orderedReads[(state.currentRead ?? 0) - 1];
    const receivers = look();
    if (state.currentTime >= timeToThrow) break;
    if (!currentRoute || state.currentTime < currentRoute.TTO) {
      // Scan the entire rotated ranking. With no current read, all use rank 2.
      const noticeChecks = receivers.map(({ player, perceivedOpenness, label, readRank, noticeChance }) => ({
        player, perceivedOpenness, label, readRank, noticeChance,
        rollMade: false, roll: null as number | null, noticed: false,
        status: noticeChance <= 0 ? "skipped-na-or-zero" : "not-checked",
      }));
      for (const check of noticeChecks) {
        if (check.noticeChance <= 0) continue; // NA/zero bands consume no notice roll.
        const roll = random() * 100;
        check.rollMade = true;
        check.roll = roll;
        check.noticed = roll < check.noticeChance;
        check.status = "checked";
        const decision: PassReadLoopState["decisions"][number] = {
          currentTime: state.currentTime, currentRead: state.currentRead, player: check.player,
          perceivedOpenness: check.perceivedOpenness, label: check.label, noticeChance: check.noticeChance,
          roll, noticeType: "scan", readRank: check.readRank, throw: check.noticed,
        };
        state.decisions.push(decision);
        if (decision.throw) {
          state.targetPlayer = check.player;
          state.stopReason = "throw";
          state.decision = "throw";
          break;
        }
      }
      console.log("[Pass Engine] QB ranked notice scan", {
        currentTime: state.currentTime, currentRead: state.currentRead,
        reason: currentRoute ? "current-read-not-ready" : "no-current-read", receivers: noticeChecks,
      });
      if (state.targetPlayer) break;
      continue;
    }
    const { perceivedOpenness, label, noticeChance: chance, readRank } = receivers.find((receiver) => receiver.player === currentRoute.player)!;
    const roll = chance > 0 ? random() * 100 : null;
    const decision: PassReadLoopState["decisions"][number] = {
      currentTime: state.currentTime, currentRead: state.currentRead, player: currentRoute.player,
      perceivedOpenness, label, noticeChance: chance, roll, noticeType: "current", readRank, throw: roll !== null && roll < chance,
    };
    state.decisions.push(decision);
    if (decision.throw) {
      state.targetPlayer = currentRoute.player;
      state.stopReason = "throw";
      state.decision = "throw";
      break;
    }
    console.log("[Pass Engine] QB declined current read", {
      currentTime: state.currentTime, currentRead: state.currentRead,
      receivers: receivers.map((receiver) => ({ player: receiver.player, perceivedOpenness: receiver.perceivedOpenness, readRank: receiver.readRank,
        noticeChance: receiver.noticeChance,
        rollMade: receiver.player === currentRoute.player && roll !== null, roll: receiver.player === currentRoute.player ? roll : null,
        noticed: false })),
    });
    state.currentRead = state.currentRead! < orderedReads.length ? state.currentRead! + 1 : null;
    decision.readDelay = 0.05 + random() * 0.25;
    state.currentTime = Math.min(timeToThrow, state.currentTime + decision.readDelay);
    state.currentReadPlayer = orderedReads[(state.currentRead ?? 0) - 1]?.player;
    // more to come in this loop
  }
  if (state.decision === "pending") {
    const lastLook = state.snapshots.at(-1);
    const receivers = lastLook?.currentTime === state.currentTime ? lastLook.receivers : look();
    state.expirationDecision = chooseTimeExpiredAction(random);
    if (state.expirationDecision.action === "force-throw") {
      const mostOpen = receivers.reduce<typeof receivers[number] | undefined>((best, receiver) =>
        !best || receiver.perceivedOpenness > best.perceivedOpenness ? receiver : best, undefined);
      state.targetPlayer = mostOpen?.player;
      state.decision = mostOpen ? "throw" : "throw-away";
    } else state.decision = state.expirationDecision.action;
    console.log("[Pass Engine] QB time expired", {
      currentTime: state.currentTime, ...state.expirationDecision,
      decision: state.decision, targetPlayer: state.targetPlayer, receivers,
    });
  }
  return state;
}
