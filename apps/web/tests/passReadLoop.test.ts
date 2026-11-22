import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateReadDefenseModifier, runUnpressuredReadLoop, getReadNoticeChance, rankQBReads, chooseTimeExpiredAction } from "../src/components/league/gameplay/engine/passReadLoop.ts";
import { parseQBDecisionSettings } from "../../api/src/services/qbDecisionSettings.ts";

const row = (primary = 0, second = 0, third = 0, fourth = 0) => ({ perceivedMax: 1000, label: "Test", noticeIfPrimary: primary, secondReadNotice: second, thirdReadNotice: third, fourthReadNotice: fourth });
const config = (primary = 0, second = 0, third = 0, fourth = 0) => ({ curves: { Break: [{ time: 0, openness: 50 }] }, qbDecisionTable: [row(primary, second, third, fourth)] });
const routes = ["WR1", "WR2", "WR3", "WR4"].map((player) => ({ player, TTO: 1, curveType: "Break", phaseOpenness: [] }));
const sequence = (...values: number[]) => () => { assert.ok(values.length, "Unexpected random draw"); return values.shift()!; };

const suppliedTable = parseQBDecisionSettings([
  ["QB Decision Table"], ["Open Score", "perceived max", "Label", "What it means on the field", "Notice if Primary", "2nd read notice", "3rd notice", "4th notice"],
  ["0–10", 10, "Erased", "", "NA", "NA", "NA", "NA"],
  ["11–20", 20, "Blanketed", "", "NA", "NA", "NA", "NA"],
  ["21–35", 35, "Covered", "", 10, "NA", "NA", "NA"],
  ["36–49", 49, "Tight", "", 20, 10, "NA", "NA"],
  ["50–59", 59, "Slightly open", "", 50, 20, 10, "NA"],
  ["60–69", 69, "Open", "", 80, 30, 20, 5],
  ["70–79", 79, "Clearly open", "", 90, 50, 40, 15],
  ["80–89", 89, "Very open", "", 95, 80, 75, 25],
  ["90–100", 1000, "Wide open", "", 99, 95, 87, 50],
]);

test("the sheet supplies distinct chances for all four ranks, including decimals and NA", () => {
  assert.deepEqual([1, 2, 3, 4].map(rank => getReadNoticeChance(suppliedTable, 72, rank).chance), [90, 50, 40, 15]);
  assert.deepEqual([1, 2, 3, 4].map(rank => getReadNoticeChance(suppliedTable, 56, rank).chance), [50, 20, 10, 0]);
  assert.equal(getReadNoticeChance(suppliedTable, 69.1, 2).chance, 50);
  assert.equal(getReadNoticeChance(suppliedTable, -5, 1).chance, 0);
  assert.equal(getReadNoticeChance(suppliedTable, 2000, 4).chance, 50);
});

test("rankings rotate every passed read and all become rank 2 after one cycle", () => {
  const original = structuredClone(routes);
  for (const [current, expected] of [[1, ["WR1", "WR2", "WR3", "WR4"]], [2, ["WR2", "WR3", "WR4", "WR1"]], [3, ["WR3", "WR4", "WR1", "WR2"]], [4, ["WR4", "WR1", "WR2", "WR3"]]] as const) {
    const ranked = rankQBReads(routes, current);
    assert.deepEqual(ranked.map(({ route }) => route.player), expected);
    assert.deepEqual(ranked.map(({ readRank }) => readRank), [1, 2, 3, 4]);
  }
  assert.deepEqual(rankQBReads(routes, null).map(({ readRank }) => readRank), [2, 2, 2, 2]);
  assert.deepEqual(routes, original);
});

test("waiting scans use ranks 1/2/3/4 and stop at the first noticed receiver", (t) => {
  const log = t.mock.method(console, "log", () => {});
  const state = runUnpressuredReadLoop(config(50, 30, 20, 10), routes, 2, 0, {}, sequence(0, 0, 0, 0, .8, .3, .19999));
  assert.equal(state.currentTime, .25);
  assert.equal(state.targetPlayer, "WR3");
  assert.deepEqual(state.decisions.map(d => [d.player, d.readRank, d.noticeChance, d.throw]), [["WR1", 1, 50, false], ["WR2", 2, 30, false], ["WR3", 3, 20, true]]);
  const scan = log.mock.calls.find(call => call.arguments[0] === "[Pass Engine] QB ranked notice scan")!.arguments[1];
  assert.deepEqual(scan.receivers.map((r: any) => r.rollMade), [true, true, true, false]);
  assert.deepEqual(state.snapshots[0].receivers.map(r => [r.readRank, r.noticeChance]), [[1, 50], [2, 30], [3, 20], [4, 10]]);
});

test("waiting NA/zero ranks skip notice rolls", () => {
  const settings = { curves: { Break: [{ time: 0, openness: 33 }] }, qbDecisionTable: suppliedTable };
  // Perceived openness is 56, giving chances 50/20/10/NA.
  const state = runUnpressuredReadLoop(settings, routes, .5, 0, {}, sequence(0, 0, 0, 0, .9, .9, .9, 0, 0, 0, 0, .5));
  assert.deepEqual(state.decisions.map(d => d.readRank), [1, 2, 3]);
  assert.equal(state.snapshots[0].receivers[3].noticeChance, 0);
  assert.equal(state.currentTime, .5);
});

test("ready current reads use rank 1 and strict less-than boundaries", () => {
  const ready = [{ ...routes[0], TTO: .25 }];
  for (const [roll, throws] of [[.49999, true], [.5, false]] as const) {
    const values = [0, roll, 0];
    const state = runUnpressuredReadLoop(config(50), ready, .6, 0, {}, () => values.shift() ?? .5);
    assert.equal(state.decisions[0].noticeChance, 50);
    assert.equal(state.decisions[0].readRank, 1);
    assert.equal(state.decisions[0].throw, throws);
    assert.equal(state.decisions[0].noticeType, "current");
  }
});

test("declining a read preserves delay and quarter-step timing while rotating the next receiver to rank 1", () => {
  const ready = routes.slice(0, 2).map(r => ({ ...r, TTO: .25 }));
  for (const delay of [0, .99999]) {
    const state = runUnpressuredReadLoop(config(50), ready, 2, 0, { WR2: "1", WR1: "2" }, sequence(0, 0, .9, delay, 0, 0, .1));
    assert.equal(state.decisions[0].player, "WR2");
    assert.equal(state.decisions[0].readDelay, .05 + delay * .25);
    assert.equal(state.decisions[1].currentTime, .5 + state.decisions[0].readDelay!);
    assert.equal(state.targetPlayer, "WR1");
    assert.deepEqual(state.snapshots[1].receivers.map(r => [r.player, r.readRank]), [["WR1", 1], ["WR2", 2]]);
  }
});

test("unready second read rotates previous primary to last, with every chance logged", (t) => {
  const log = t.mock.method(console, "log", () => {});
  const waiting = routes.map((r, i) => ({ ...r, TTO: i === 0 ? .25 : 10 }));
  const state = runUnpressuredReadLoop(config(10, 20, 30, 40), waiting, 1, 0, {}, () => .99);
  const snapshot = state.snapshots.find(s => s.currentRead === 2)!;
  assert.deepEqual(snapshot.receivers.map(r => [r.player, r.readRank, r.noticeChance]), [["WR2", 1, 10], ["WR3", 2, 20], ["WR4", 3, 30], ["WR1", 4, 40]]);
  const scan = log.mock.calls.find(call => call.arguments[0] === "[Pass Engine] QB ranked notice scan")!.arguments[1];
  assert.deepEqual(scan.receivers.map((r: any) => r.player), ["WR2", "WR3", "WR4", "WR1"]);
});

test("after all reads pass, every receiver uses second-read notice with no current read", () => {
  const ready = routes.map(r => ({ ...r, TTO: .25 }));
  const state = runUnpressuredReadLoop(config(0, 30, 60, 90), ready, 3, 0, {}, () => .5);
  assert.equal(state.currentRead, null);
  assert.equal(state.currentReadPlayer, undefined);
  assert.deepEqual(state.snapshots.slice(0, 4).map(s => s.receivers.map(r => r.player)), [
    ["WR1", "WR2", "WR3", "WR4"], ["WR2", "WR3", "WR4", "WR1"],
    ["WR3", "WR4", "WR1", "WR2"], ["WR4", "WR1", "WR2", "WR3"],
  ]);
  const scans = state.snapshots.filter(s => s.currentRead === null);
  assert.ok(scans.length > 0);
  assert.ok(scans.every(s => s.receivers.every(r => r.readRank === 2 && r.noticeChance === 30)));
  assert.ok(state.decisions.filter(d => d.noticeType === "scan").every(d => d.readRank === 2 && d.noticeChance === 30));
  assert.equal(state.currentTime, 3);
  assert.equal(state.decision, "throw-away");
});

test("an exhausted cycle can notice any receiver using the second-read column", () => {
  const ready = routes.slice(0, 2).map(r => ({ ...r, TTO: .25 }));
  const state = runUnpressuredReadLoop(config(0, 100), ready, 2, 0, {}, () => .5);
  assert.equal(state.currentRead, null);
  assert.equal(state.targetPlayer, "WR1");
  assert.equal(state.decisions.at(-1)?.readRank, 2);
  assert.equal(state.decisions.at(-1)?.noticeChance, 100);
  assert.equal(state.expirationDecision, undefined);
});

test("read ranks follow configured order, not route-array order", () => {
  const state = runUnpressuredReadLoop(config(), routes, .5, 80, { WR4: "Primary", WR2: "2nd", WR1: "3rd", WR3: "4th" }, () => .5);
  assert.deepEqual(state.snapshots[0].receivers.map(r => r.player), ["WR4", "WR2", "WR1", "WR3"]);
  assert.equal(state.currentReadPlayer, "WR4");
});

test("fifth and later receivers use the fourth-rank column until the full cycle ends", () => {
  assert.deepEqual(rankQBReads([...routes, { ...routes[0], player: "RB" }], 1).map(r => r.readRank), [1, 2, 3, 4, 4]);
});

test("perceived openness independently changes sign without altering actual openness", () => {
  const receivers = routes.slice(0, 2);
  const before = structuredClone(receivers);
  const state = runUnpressuredReadLoop(config(), receivers, .5, 0, {}, sequence(.1, .9, .9, .1, .5));
  assert.deepEqual(state.snapshots.map(s => s.receivers.map(r => r.readDefenseAdjustment)), [[23, -23], [-23, 23]]);
  assert.equal(state.snapshots[0].receivers[0].openness, 50);
  assert.deepEqual(receivers, before);
  const x = 80;
  assert.equal(calculateReadDefenseModifier(x), .00000055296676*x**4-.00014271986272*x**3+.011884760129588*x**2-.536559194662642*x+23);
});

test("expiration uses 50/25/25 and chooses the most perceived-open receiver at the deadline", () => {
  for (const [roll, action] of [[0, "force-throw"], [.49999, "force-throw"], [.5, "throw-away"], [.74999, "throw-away"], [.75, "scramble"], [.99999, "scramble"]] as const)
    assert.equal(chooseTimeExpiredAction(() => roll).action, action);
  const state = runUnpressuredReadLoop(config(), routes.slice(0, 2), .3, 0, {}, sequence(0, .9, .9, 0, .49));
  assert.equal(state.currentTime, .3);
  assert.equal(state.decisions.length, 0);
  assert.equal(state.targetPlayer, "WR2");
});

test("read delay crossing the deadline refreshes openness and adds no notice roll", () => {
  const state = runUnpressuredReadLoop(config(), [{ ...routes[0], TTO: .25 }], .4, 0, {}, sequence(0, .99, 0, .8));
  assert.equal(state.currentTime, .4);
  assert.equal(state.snapshots.at(-1)?.currentTime, .4);
  assert.equal(state.decision, "scramble");
});

test("invalid settings and timing fail clearly; no-route plays still expire safely", () => {
  assert.throws(() => runUnpressuredReadLoop({ ...config(), qbDecisionTable: [] }, routes, 1, 0), /Missing QB Decision Table/);
  assert.throws(() => runUnpressuredReadLoop(config(), routes, Infinity, 0), /time to throw/);
  assert.throws(() => calculateReadDefenseModifier(NaN), /read defense/);
  assert.equal(runUnpressuredReadLoop(config(), [], .3, 0, {}, () => .5).stopReason, "no-routes");
  const state = runUnpressuredReadLoop(config(100), routes, 0, 0, {}, () => .5);
  assert.equal(state.snapshots[0].currentTime, 0);
  assert.equal(state.decisions.length, 0);
});
