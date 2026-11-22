import test from "node:test";
import assert from "node:assert/strict";
import { routeJumpBaseChance, pickBaseChance, rollPassInterception } from "../src/components/league/gameplay/engine/passInterception.ts";
import { determinePassOutcome } from "../src/components/league/gameplay/engine/passEngine.ts";
import { THROW_TYPES } from "../src/components/league/gameplay/engine/qbAccuracy.ts";

const beat = THROW_TYPES.map((throwType, i) => ({ throwType, multiplier: [.1, .5, .75, 1, 1.5][i] }));
const pick = THROW_TYPES.map((throwType, i) => ({ throwType, multiplier: [.1, .25, .6, 1, 1.5][i] }));
const seq = (...values: number[]) => () => { assert.ok(values.length, "Unexpected extra roll"); return values.shift()!; };
const close = (a: number, b: number) => assert.ok(Math.abs(a-b) < 1e-9, `${a} != ${b}`);

test("uses the supplied polynomials and actual openness bands including all boundaries", () => {
  for (const [openness, expected] of [[0, 12.19119983721729], [39.999, 12.19119983721729], [40, 9.082486355194366], [49.999, 9.082486355194366], [50, 6.557676986779988], [60, 4.837249325146857], [70, 1.6370695137412206], [80, .19943476457559495], [89.999, .19943476457559495], [90, 0], [120, 0]] as const)
    close(routeJumpBaseChance(80, openness), expected);
  close(pickBaseChance(80), 13.703804580043933);
  assert.equal(routeJumpBaseChance(0, 40), 0);
  assert.equal(pickBaseChance(0), 0);
});

test("matches the Read QB 85/Ball Hawk 81 overall interception matrix", () => {
  const result = rollPassInterception(85, 81, 20, "Catchable", beat, pick, seq(0, 0));
  close(result.beatWRtoBall, 13.410375458459491);
  close(result.pickPctChance!, 14.182964219121207);
  close(result.beatWRtoBall*result.pickPctChance!/100, 1.901988752923117);
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

test("a failed completion without a route jump cannot fall back to the old interception roll", t => {
  t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", seq(.99, .99));
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
