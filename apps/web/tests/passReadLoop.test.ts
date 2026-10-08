import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateReadDefenseModifier, runUnpressuredReadLoop, getPrimaryNoticeChance } from "../src/components/league/gameplay/engine/passReadLoop.ts";
import { parseQBDecisionSettings } from "../../api/src/services/qbDecisionSettings.ts";

const settings = { curves: { Break: [{ time: 0.5, openness: 20 }, { time: 1, openness: 60 }] },
  qbDecisionTable: [{ perceivedMax: 1000, label: "Test", baseNotice: 0, noticeIfPrimary: 100 }] };
const routes = ["WR1", "WR2"].map((player) => ({ player, TTO: 1, curveType: "Break",
  phaseOpenness: [{ start: 0, end: 1, duration: 1, phaseImpact: 8 }] }));

test("starts at zero/read one, advances by quarters, and stops when the read reaches TTO", () => {
  let rolls = 0;
  const state = runUnpressuredReadLoop(settings, routes, 2, 0, {}, () => { rolls++; return 0; });
  assert.equal(state.currentRead, 1);
  assert.equal(state.currentReadPlayer, "WR1");
  assert.equal(state.currentTime, 1);
  assert.equal(state.stopReason, "throw");
  assert.equal(state.targetPlayer, "WR1");
  assert.deepEqual(state.snapshots.map((snapshot) => snapshot.currentTime), [0.25, 0.5, 0.75, 1]);
  assert.equal(rolls, 9);
  assert.deepEqual(state.snapshots[0].receivers[0], {
    player: "WR1", baseOpenness: 10, skillBasedOpennessMod: 2, openness: 12,
    readDefenseAdjustment: 23, perceivedOpenness: 35,
  });
});

test("72 openness uses 67 primary notice, with a strict decimal roll boundary", () => {
  const table = [
    { perceivedMax: 69, label: "Open", baseNotice: 20, noticeIfPrimary: 50 },
    { perceivedMax: 79, label: "Clearly open", baseNotice: 35, noticeIfPrimary: 67 },
    { perceivedMax: 1000, label: "Wide open", baseNotice: 90, noticeIfPrimary: 99 },
  ];
  const config = { curves: { Break: [{ time: 0, openness: 49 }] }, qbDecisionTable: table };
  const receiver = { player: "WR", TTO: 0.25, curveType: "Break", phaseOpenness: [] };
  for (const [roll, shouldThrow] of [[0.66999, true], [0.67, false]] as const) {
    const rolls = [0, roll, 0];
    const state = runUnpressuredReadLoop(config, [receiver], 2, 0, {}, () => rolls.shift()!);
    assert.equal(state.decisions[0].perceivedOpenness, 72);
    assert.equal(state.decisions[0].noticeChance, 67);
    assert.equal(state.decisions[0].throw, shouldThrow);
  }
  assert.equal(getPrimaryNoticeChance(table, 69.1).chance, 67);
  assert.equal(getPrimaryNoticeChance(table, 2000).chance, 99);
  assert.equal(getPrimaryNoticeChance([{ ...table[0], noticeIfPrimary: null }], -20).chance, 0);
});

test("a declined throw advances read, adds the random delay, then restarts with a quarter step", () => {
  const config = { curves: settings.curves,
    qbDecisionTable: [{ perceivedMax: 1000, label: "Test", baseNotice: 0, noticeIfPrimary: 50 }] };
  const receivers = routes.map((route) => ({ ...route, TTO: 0.25 }));
  for (const delayRoll of [0, 0.999999]) {
    const rolls = [0, 0, 0.9, delayRoll, 0, 0, 0.1];
    const state = runUnpressuredReadLoop(config, receivers, 2, 0, { WR2: "1", WR1: "2" }, () => rolls.shift()!);
    assert.equal(state.decisions[0].player, "WR2");
    assert.equal(state.decisions[0].throw, false);
    assert.equal(state.decisions[0].readDelay, 0.05 + delayRoll * 0.25);
    assert.equal(state.decisions[1].currentTime, 0.5 + state.decisions[0].readDelay!);
    assert.equal(state.currentRead, 2);
    assert.equal(state.targetPlayer, "WR1");
  }
});

test("no decision after budget expiration; unavailable table fails when a decision is needed", () => {
  const ready = [{ ...routes[0], TTO: 0.25 }];
  const state = runUnpressuredReadLoop(settings, ready, 0.25, 0, {}, () => 0);
  assert.equal(state.decisions.length, 0);
  assert.equal(state.stopReason, "time-to-throw");
  assert.throws(() => runUnpressuredReadLoop({ ...settings, qbDecisionTable: [] }, ready, 2, 0, {}, () => 0), /Missing QB Decision Table/);
});

test("each receiver gets an independent sign at each time without changing actual openness", () => {
  const before = structuredClone(routes);
  const rolls = [0.1, 0.9, 0.9, 0.1];
  const state = runUnpressuredReadLoop(settings, routes, 0.5, 0, {}, () => rolls.shift()!);
  assert.deepEqual(state.snapshots.map((snapshot) => snapshot.receivers.map((r) => r.readDefenseAdjustment)), [[23, -23], [-23, 23]]);
  assert.equal(state.snapshots[0].receivers[1].perceivedOpenness, -11);
  assert.deepEqual(routes, before);
  assert.equal(state.stopReason, "time-to-throw");
});

test("uses the exact polynomial and respects configured read order", () => {
  const rating = 80;
  const expected = 0.00000055296676 * rating ** 4 - 0.00014271986272 * rating ** 3 +
    0.011884760129588 * rating ** 2 - 0.536559194662642 * rating + 23;
  assert.equal(calculateReadDefenseModifier(rating), expected);
  const deeper = [routes[0], { ...routes[1], TTO: 2 }];
  const state = runUnpressuredReadLoop(settings, deeper, 1.5, rating, { WR1: "2", WR2: "1" }, () => 0);
  assert.equal(state.currentReadPlayer, "WR2");
  assert.equal(state.snapshots.length, 6);
  assert.equal(state.snapshots[0].receivers[0].readDefenseAdjustment, expected);
  assert.equal(runUnpressuredReadLoop(settings, deeper, 0, rating, { WR2: "Primary" }).currentReadPlayer, "WR2");
});

test("checks time budget before each full quarter step, including non-quarter budgets", () => {
  const state = runUnpressuredReadLoop(settings, routes, 0.3, 50, {}, () => 0.5);
  assert.equal(state.currentTime, 0.5);
  assert.equal(state.snapshots.length, 2);
  assert.equal(runUnpressuredReadLoop(settings, routes, 0, 50).snapshots.length, 0);
  assert.equal(runUnpressuredReadLoop(settings, [], 2, 50).stopReason, "no-routes");
  assert.throws(() => runUnpressuredReadLoop(settings, routes, Infinity, 50), /time to throw/);
  assert.throws(() => calculateReadDefenseModifier(NaN), /read defense/);
});

const earlySettings = {
  curves: { First: [{ time: 0, openness: 33 }], Second: [{ time: 0, openness: 21 }], Third: [{ time: 0, openness: 38 }] },
  qbDecisionTable: parseQBDecisionSettings([
    ["QB Decision Table"], ["Open Score", "perceived max", "Label", "What it means on the field", "Base Notice", "Notice if Primary"],
    ["0–10", 10, "Erased", "", "NA", "NA"], ["11–20", 20, "Blanketed", "", "NA", "NA"],
    ["21–35", 35, "Covered", "", "NA", 5], ["36–49", 49, "Tight window", "", "NA", 15],
    ["50–59", 59, "Slightly open", "", 5, 45], ["60–69", 69, "Open", "", 30, 67],
    ["70–79", 79, "Clearly open", "", 45, 75], ["80–89", 89, "Very open", "", 80, 89],
    ["90–100", 1000, "Wide open", "", 90, 99],
  ]),
};
// Deliberately shuffled so early checks must respect the configured reads.
const earlyRoutes = [
  { player: "WR3", curveType: "Third", TTO: 2, phaseOpenness: [] },
  { player: "WR1", curveType: "First", TTO: 2, phaseOpenness: [] },
  { player: "WR2", curveType: "Second", TTO: 2, phaseOpenness: [] },
];
const earlyReads = { WR1: "1", WR2: "2", WR3: "3" };

test("the supplied 56/44/61 example checks base notice in read order and skips NA without a roll", () => {
  const rolls = [0, 0, 0, 0.05, 0.29999];
  const state = runUnpressuredReadLoop(earlySettings, earlyRoutes, 3, 0, earlyReads, () => {
    assert.ok(rolls.length, "Unexpected roll (possibly an NA band)");
    return rolls.shift()!;
  });
  assert.equal(rolls.length, 0);
  assert.equal(state.currentTime, 0.25);
  assert.equal(state.currentRead, 1);
  assert.equal(state.targetPlayer, "WR3");
  assert.deepEqual(state.decisions.map(({ player, perceivedOpenness, noticeChance, noticeType, throw: madeThrow }) =>
    ({ player, perceivedOpenness, noticeChance, noticeType, madeThrow })), [
    { player: "WR1", perceivedOpenness: 56, noticeChance: 5, noticeType: "base", madeThrow: false },
    { player: "WR3", perceivedOpenness: 61, noticeChance: 30, noticeType: "base", madeThrow: true },
  ]);
});

test("the first successful base check stops later checks", () => {
  const rolls = [0, 0, 0, 0.04999];
  const state = runUnpressuredReadLoop(earlySettings, earlyRoutes, 3, 0, earlyReads, () => {
    assert.ok(rolls.length, "Later receivers should not be rolled after a throw");
    return rolls.shift()!;
  });
  assert.equal(state.targetPlayer, "WR1");
  assert.equal(state.decisions.length, 1);
});

test("failed base checks keep the current read and advance by only the next quarter step", () => {
  const rolls = [0, 0, 0, 0.05, 0.3, 0, 0, 0, 0.9, 0.1];
  const state = runUnpressuredReadLoop(earlySettings, earlyRoutes, 3, 0, earlyReads, () => rolls.shift()!);
  assert.deepEqual(state.snapshots.map(({ currentTime, currentRead }) => ({ currentTime, currentRead })), [
    { currentTime: 0.25, currentRead: 1 }, { currentTime: 0.5, currentRead: 1 },
  ]);
  assert.equal(state.targetPlayer, "WR3");
  assert.ok(state.decisions.every((decision) => decision.noticeType === "base" && decision.readDelay === undefined));
  assert.equal(rolls.length, 0);
});

test("ready reads still use primary notice and no base checks occur after time expires", () => {
  const ready = earlyRoutes.map((route) => ({ ...route, TTO: 0.25 }));
  const rolls = [0, 0, 0, 0.4]; // 40 beats primary 45, but would fail base 5.
  const state = runUnpressuredReadLoop(earlySettings, ready, 3, 0, earlyReads, () => rolls.shift()!);
  assert.equal(state.targetPlayer, "WR1");
  assert.equal(state.decisions[0].noticeType, "primary");
  assert.equal(state.decisions[0].noticeChance, 45);
  const expired = runUnpressuredReadLoop(earlySettings, earlyRoutes, 0.25, 0, earlyReads, () => 0);
  assert.equal(expired.decisions.length, 0);
  assert.equal(expired.targetPlayer, undefined);
});
