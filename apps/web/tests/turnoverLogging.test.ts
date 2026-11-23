import test from "node:test";
import assert from "node:assert/strict";
import { fumbleCheck } from "../src/components/league/gameplay/engine/runEngine.ts";
import { determinePassOutcome } from "../src/components/league/gameplay/engine/passEngine.ts";
import { punt } from "../src/components/league/gameplay/engine/specialTeamsEngine.ts";
import type { EngineContext } from "../src/components/league/gameplay/engine/types.ts";

const ctx: EngineContext = { players: [{ name: "WR", ballsecurity: 80 }, { name: "DB", strip: 80, readQB: 80, ballHawk: 80 }], settings: {}, historyLength: 0 };

test("fumble logging reports real rolls/thresholds and 55% recovery without adding draws", t => {
  const logs = t.mock.method(console, "log", () => {});
  const rolls = [.1, .1, .55];
  t.mock.method(Math, "random", () => { assert.ok(rolls.length, "logging cannot roll again"); return rolls.shift()!; });
  assert.deepEqual(fumbleCheck(ctx, "WR", "DB"), { fumble: true, recoveredBy: "WR" });
  const stages = new Map(logs.mock.calls.map(call => [call.arguments[0], call.arguments[1]]));
  assert.deepEqual([...stages.keys()], ["[Fumble] Strip check", "[Fumble] Ball security check", "[Fumble] Recovery", "[Fumble] Result"]);
  assert.equal(stages.get("[Fumble] Strip check").threshold, 16);
  assert.equal(stages.get("[Fumble] Strip check").roll, 10);
  assert.equal(stages.get("[Fumble] Ball security check").threshold, 11);
  assert.equal(stages.get("[Fumble] Ball security check").roll, 10);
  assert.equal(stages.get("[Fumble] Recovery").threshold, 55);
  assert.ok(Math.abs(stages.get("[Fumble] Recovery").roll - 55) < 1e-10);
  assert.equal(stages.get("[Fumble] Result").lost, false);
  assert.equal(rolls.length, 0);
});

test("failed fumble stages log skipped later checks without extra draws", t => {
  const logs = t.mock.method(console, "log", () => {});
  for (const [draws, failedStage] of [[[.16], "strip-check-failed"], [[.1, .11], "no-fumble"]] as const) {
    const rolls = [...draws];
    t.mock.method(Math, "random", () => { assert.ok(rolls.length); return rolls.shift()!; });
    assert.equal(fumbleCheck(ctx, "WR", "DB").fumble, false);
    assert.equal(rolls.length, 0);
    assert.ok(logs.mock.calls.some(call=>call.arguments[1].reason === failedStage && call.arguments[1].roll === null));
  }
  t.mock.method(Math, "random", () => { throw new Error("missing players must not roll"); });
  assert.equal(fumbleCheck(ctx, "missing", "DB").fumble, false);
  assert.ok(logs.mock.calls.some(call=>call.arguments[1].reason === "missing-runner-or-tackler"));
});

const target = { player: "WR", defender: "DB", airYards: 8, separation: 0 } as any;
const passCtx = { ...ctx, settings: { dbBeatWRAccuracyMultipliers: [{ throwType: "Accurate", multiplier: .5 }, { throwType: "Catchable", multiplier: 1 }],
  pickAccuracyMultipliers: [{ throwType: "Accurate", multiplier: .25 }, { throwType: "Catchable", multiplier: 1 }] } } as EngineContext;

test("interception logs include skipped wide-open jump and Accurate secondary checks plus completion roll", t => {
  const logs = t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => .99);
  const result = determinePassOutcome(passCtx, "QB", target, 0, { actualOpenness: 95, throwType: "Accurate" } as any);
  assert.equal(result.intercepted, false);
  const stages = new Map(logs.mock.calls.map(call=>[call.arguments[0], call.arguments[1]]));
  assert.equal(stages.get("[Pass Engine] DB route jump").routeJumpSkipReason, "openness-90-plus");
  assert.equal(stages.get("[Pass Engine] Completion roll").roll, 99);
  assert.equal(stages.get("[Pass Engine] Completion roll").threshold, 0);
  assert.equal(stages.get("[Pass Engine] Incomplete pass interception check").reason, "accurate-or-better");
  assert.equal(stages.get("[Pass Engine] Incomplete pass interception check").pickChecked, false);
});

test("interception logs contain both secondary rolls and the credited guarding DB", t => {
  const logs = t.mock.method(console, "log", () => {});
  const rolls = [.99, .99, 0, 0];
  t.mock.method(Math, "random", () => { assert.ok(rolls.length); return rolls.shift()!; });
  const result = determinePassOutcome(passCtx, "QB", target, 0, { actualOpenness: 40, throwType: "Catchable" } as any);
  assert.equal(result.intercepted, true);
  const check = logs.mock.calls.find(call=>call.arguments[0] === "[Pass Engine] Incomplete pass interception check")!.arguments[1];
  assert.equal(check.defender, "DB");
  assert.equal(check.ballHawkRoll, 0);
  assert.equal(check.ballHawkChance, (80/12)**2);
  assert.equal(check.pickRoll, 0);
  assert.equal(check.reason, "intercepted");
  assert.equal(rolls.length, 0);
});

test("special-teams plays explicitly log both skipped checks", t => {
  const logs = t.mock.method(console, "log", () => {});
  t.mock.method(Math, "random", () => .5);
  punt({ GameId: 1, Home: "A", Away: "B", Possession: "Home", Qtr: 1, Time: 900, Down: 4, Distance: 10, BallOn: 25 } as any, ctx);
  for (const name of ["[Interception] Checks skipped", "[Fumble] Checks skipped"]) {
    const log = logs.mock.calls.find(call=>call.arguments[0] === name)!.arguments[1];
    assert.equal(log.reason, "punt");
    assert.equal(log.checked, false);
    assert.equal(log.roll, null);
  }
});
