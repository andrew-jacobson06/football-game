import test from "node:test";
import assert from "node:assert/strict";
import { routeJumpBaseChance, pickBaseChance, rollPassInterception, rollIncompletePassInterception } from "../src/components/league/gameplay/engine/passInterception.ts";
import { determinePassOutcome } from "../src/components/league/gameplay/engine/passEngine.ts";
import { THROW_TYPES } from "../src/components/league/gameplay/engine/qbAccuracy.ts";

const beat = THROW_TYPES.map((throwType, i) => ({ throwType, multiplier: [.1, .5, .75, 1, 1.5][i] }));
const pick = THROW_TYPES.map((throwType, i) => ({ throwType, multiplier: [.1, .25, .6, 1, 1.5][i] }));
const seq = (...values: number[]) => () => { assert.ok(values.length, "Unexpected extra roll"); return values.shift()!; };
const close = (a: number, b: number) => assert.ok(Math.abs(a-b) < 1e-9, `${a} != ${b}`);

test("uses the supplied polynomials and actual openness bands including all boundaries", () => {
  for (const [openness, expected] of [[0, 16.864570132566499200000], [39.999, 16.864570132566499200000], [40, 14.812583739311728000000], [49.999, 14.812583739311728000000], [50, 11.91270655278830400000], [59.999, 11.91270655278830400000], [60, 10.460600496806662400000], [69.999, 10.460600496806662400000], [70, 8.37726751434369600000], [79.999, 8.37726751434369600000], [80, 3.483157746395398400000], [89.999, 3.483157746395398400000], [90, 0], [120, 0]] as const)
    close(routeJumpBaseChance(80, openness), expected);
  close(pickBaseChance(80), 19.455955489012032000000);
  assert.equal(routeJumpBaseChance(0, 40), 0);
  assert.equal(pickBaseChance(0), 0);
});

test("matches the Read QB 85/Ball Hawk 81 overall interception matrix", () => {
  const result = rollPassInterception(85, 81, 20, "Catchable", beat, pick, seq(0, 0));
  close(result.beatWRtoBall, 18.202170201249215259375);
  close(result.pickPctChance!, 19.894165759666692429615);
  close(result.beatWRtoBall*result.pickPctChance!/100, 3.62116991169317526314415021570009851156390625);
});

test("both accuracy multipliers come from Settings for every throw type", () => {
  for (const type of THROW_TYPES) {
    const result = rollPassInterception(80, 80, 20, type, beat, pick, seq(0, 0));
    close(result.beatWRtoBall, routeJumpBaseChance(80, 20)*beat.find(r=>r.throwType===type)!.multiplier);
    close(result.pickPctChance!, pickBaseChance(80)*pick.find(r=>r.throwType===type)!.multiplier);
  }
  const changed = rollPassInterception(80, 80, 20, "Close", [{ throwType: "Close", multiplier: 2 }], [{ throwType: "Close", multiplier: 3 }], seq(0, 0));
  close(changed.beatWRtoBall, routeJumpBaseChance(80, 20)*2);
  close(changed.pickPctChance!, pickBaseChance(80)*3);
});

test("strict boundaries: failed jump skips pick roll; failed pick becomes deflection", () => {
  const base = routeJumpBaseChance(80, 20);
  const notJumped = rollPassInterception(80, 80, 20, "Catchable", beat, pick, seq(base/100));
  assert.equal(notJumped.beatsWRtoBall, false);
  assert.equal(notJumped.pickRoll, null);
  assert.equal(notJumped.intercepted, false);
  assert.equal(notJumped.deflected, false);
  const deflected = rollPassInterception(80, 80, 20, "Catchable", beat, pick, seq(0, pickBaseChance(80)/100));
  assert.equal(deflected.intercepted, false);
  assert.equal(deflected.deflected, true);
  assert.equal(rollPassInterception(80, 80, 20, "Catchable", beat, pick, seq(0, 0)).intercepted, true);
});

test("90+ cannot be jumped, consumes no rolls, and invalid or missing inputs fail clearly", () => {
  const result = rollPassInterception(100, 100, 90, "Off Target", beat, pick, () => { throw new Error("must not roll"); });
  assert.equal(result.beatRoll, null);
  assert.equal(result.intercepted, false);
  assert.throws(()=>rollPassInterception(80, 80, 20, "Close", [], pick), /Settings/);
  assert.throws(()=>rollPassInterception(80, 80, 20, "Close", beat, [], seq(0)), /Settings/);
  assert.throws(()=>routeJumpBaseChance(NaN, 20), /inputs/);
});

const target = { player: "WR", defender: "Guard", airYards: 8, separation: 0 } as any;
const ctx = { players: [{ name: "WR" }, { name: "Guard", readQB: 85, ballHawk: 81 }, { name: "Other DB", readQB: 100, ballHawk: 100 }],
  settings: { dbBeatWRAccuracyMultipliers: beat, pickAccuracyMultipliers: pick }, historyLength: 0 };
const completion = { actualOpenness: 40, throwType: "Catchable" } as any;

test("jump/pick rolls occur before completion and always use the target's guarding DB", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", seq(0, 0));
  const result = determinePassOutcome(ctx, "QB", target, 100, completion);
  assert.equal(result.intercepted, true);
  assert.equal(result.completed, false);
  assert.equal(result.caughtBy, "Guard");
  assert.equal(result.completionRoll, null);
  assert.equal(result.interceptionCheck.readQB, 85);
});

test("a beaten WR causes a deflection when the pick roll fails, even at 100% completion", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", seq(0, .99));
  const result = determinePassOutcome(ctx, "QB", target, 100, completion);
  assert.equal(result.deflected, true);
  assert.equal(result.intercepted, false);
  assert.equal(result.completed, false);
  assert.equal(result.completionRoll, null);
});

test("a failed completion stays incomplete when the new ball-hawk gate fails", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", seq(.99, .99, .99));
  const result = determinePassOutcome(ctx, "QB", target, 0, completion);
  assert.equal(result.completed, false);
  assert.equal(result.intercepted, false);
  assert.equal(result.deflected, false);
  assert.equal(result.completionRoll, 99);
});

test("without a route jump the existing completion and YAC path still runs", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  t.mock.method(Math, "random", () => .5);
  const result = determinePassOutcome(ctx, "QB", target, 100, { ...completion, actualOpenness: 95 });
  assert.equal(result.completed, true);
  assert.equal(result.intercepted, false);
  assert.equal(result.caughtBy, "WR");
  assert.ok(result.yards >= target.airYards);
});

test("Perfect and Accurate incompletions skip both secondary interception rolls", () => {
  for (const type of ["Perfect", "Accurate"] as const) {
    const result = rollIncompletePassInterception(99, type, [], () => { throw new Error("Accurate throws must not roll"); });
    assert.equal(result.intercepted, false);
    assert.equal(result.reason, "accurate-or-better");
    assert.equal(result.ballHawkRoll, null);
    assert.equal(result.pickRoll, null);
  }
});

test("Close, Catchable and Off Target use the exact ball-hawk gate and existing Settings multipliers", () => {
  for (const type of ["Close", "Catchable", "Off Target"] as const) {
    const result = rollIncompletePassInterception(99, type, pick, seq(0, 0));
    close(result.ballHawkChance!, (99/12)**2);
    close(result.pickPctChance!, pickBaseChance(99)*pick.find(row=>row.throwType===type)!.multiplier);
    assert.equal(result.intercepted, true);
  }
  const changed = rollIncompletePassInterception(81, "Close", [{ throwType: "Close", multiplier: 2 }], seq(0, 0));
  close(changed.pickPctChance!, pickBaseChance(81)*2);
});

test("secondary rolls use strict boundaries and a failed ball-hawk check consumes no pick roll", () => {
  const chance = (81/12)**2;
  const failedGate = rollIncompletePassInterception(81, "Catchable", [], seq(chance/100));
  assert.equal(failedGate.passedBallHawkCheck, false);
  assert.equal(failedGate.intercepted, false);
  assert.equal(failedGate.pickRoll, null);
  const failedPick = rollIncompletePassInterception(81, "Catchable", pick, seq(0, pickBaseChance(81)/100));
  assert.equal(failedPick.passedBallHawkCheck, true);
  assert.equal(failedPick.intercepted, false);
  assert.equal(failedPick.reason, "pick-roll-failed");
  assert.equal(rollIncompletePassInterception(0, "Catchable", pick, seq(0)).intercepted, false);
});

test("an incomplete eligible throw can be intercepted after the route-jump check fails", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", seq(.99, .99, 0, 0));
  const result = determinePassOutcome(ctx, "QB", target, 0, completion);
  assert.equal(result.interceptionCheck.beatsWRtoBall, false);
  assert.equal(result.completionRoll, 99);
  assert.equal(result.intercepted, true);
  assert.equal(result.caughtBy, "Guard");
  assert.equal(result.completed, false);
  assert.equal(result.deflected, false);
});

test("a failed second pick roll stays incomplete rather than becoming a deflection", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", seq(.99, .99, 0, .99));
  const result = determinePassOutcome(ctx, "QB", target, 0, completion);
  assert.equal(result.intercepted, false);
  assert.equal(result.deflected, false);
  assert.equal(result.caughtBy, undefined);
});

test("even at 90+ openness an incomplete poor throw can use the second interception path", t => {
  t.mock.method(console, "log", () => {});
  // Wide-open skips the route-jump draw, followed by completion, gate and pick.
  t.mock.method(Math, "random", seq(.99, 0, 0));
  const result = determinePassOutcome(ctx, "QB", target, 0, { ...completion, actualOpenness: 95 });
  assert.equal(result.interceptionCheck.beatRoll, null);
  assert.equal(result.intercepted, true);
  assert.equal(result.caughtBy, "Guard");
});

test("Accurate and Perfect failed completions consume only jump and completion rolls", t => {
  t.mock.method(console, "log", () => {});
  for (const type of ["Perfect", "Accurate"] as const) {
    t.mock.method(Math, "random", seq(.99, .99));
    const result = determinePassOutcome(ctx, "QB", target, 0, { ...completion, throwType: type });
    assert.equal(result.intercepted, false);
    assert.equal(result.completed, false);
  }
});

test("a completed poor throw never runs the second interception path", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  t.mock.method(Math, "random", () => .5);
  const result = determinePassOutcome(ctx, "QB", target, 100, { ...completion, actualOpenness: 95 });
  assert.equal(result.completed, true);
  assert.equal("incompleteInterceptionCheck" in result, false);
});


test("rebalanced route-jump polynomials match independent decimal reference ratings", () => {
  // Reference values evaluated with 60-digit decimal arithmetic from the supplied coefficients.
  const openness = [20, 45, 55, 65, 75, 85] as const;
  const references = [
    [0, 0E-21, 0E-21, 0E-20, 0E-21, 0E-20, 0E-21],
    [50, 11.999999999326387500000, 9.999999999221837500000, 7.49999999761582500000, 6.499999998334850000000, 4.00000000076692500000, 1.250000002029012500000],
    [68, 14.696331033897798964992, 12.715128429443901786880, 9.71444621996328633984, 8.766187912685718823424, 6.71362729251969369216, 2.347114068775734685184],
    [80, 16.864570132566499200000, 14.812583739311728000000, 11.91270655278830400000, 10.460600496806662400000, 8.37726751434369600000, 3.483157746395398400000],
    [85, 18.202170201249215259375, 16.166410504987522171875, 13.28494755667691784375, 11.539482154579821487500, 9.11233407995617121875, 4.160651601450545753125],
    [99, 24.999999989239892709081, 22.999999987623476320965, 18.99999996324069099537, 16.999999974073533133332, 12.50000001181159161813, 7.000000031083735062387],
    [100, 25.740566844615900000000, 23.723225555664300000000, 19.51381748779290000000, 17.580856640632200000000, 12.89335375029010000000, 7.265425423017400000000],
  ] as const;
  for (const [rating, ...expected] of references) {
    openness.forEach((score, index) => close(routeJumpBaseChance(rating, score), expected[index]));
  }
  // Only the Read QB curves changed; keep Ball Hawk's independent reference values.
  close(pickBaseChance(50), 10.999999997292187500000);
  close(pickBaseChance(68), 15.450020086224119608320);
  close(pickBaseChance(85), 21.880825656649859546875);
  close(pickBaseChance(99), 32.999999958401085483885);
});


test("both interception paths use the updated shared Ball Hawk polynomial before the Settings multiplier", () => {
  const jumped = rollPassInterception(99, 85, 20, "Catchable", beat, pick, seq(0, 0));
  const incomplete = rollIncompletePassInterception(85, "Catchable", pick, seq(0, 0));
  close(jumped.basePickPctChance!, 21.880825656649859546875);
  close(incomplete.basePickPctChance!, jumped.basePickPctChance!);
  close(incomplete.pickPctChance!, jumped.pickPctChance!);
});
