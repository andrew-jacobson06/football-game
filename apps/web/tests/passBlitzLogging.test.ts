import test from "node:test";
import assert from "node:assert/strict";
import { resolvePassBlitz } from "../src/components/league/gameplay/engine/passEngine.ts";
import type { EngineContext, PlayCallOptions } from "../src/components/league/gameplay/engine/types.ts";

function context(): EngineContext {
  return { players: [
    { name: "QB", readDefense: 100, juke: 100, poise: 100 },
    { name: "LB", defPos: "LB", passRush: 20, tackling: 20, defStars: 1 },
    { name: "LT", passProtect: 10, offStars: 1 },
    { name: "LG", passProtect: 20, offStars: 1 },
    { name: "RB1", passProtect: 30 }, { name: "RB2", passProtect: 60 },
  ], settings: {}, historyLength: 0 };
}
const options: PlayCallOptions = { blitz: true, formation: { QB: "QB", LT: "LT", LG: "LG", RB1: "RB1", RB2: "RB2" },
  defense: [{ player: "LB", position: "LB1", align: "QB" }] };

test("logs every blitz stage with the real draws and inputs, without adding random draws", (t) => {
  const log = t.mock.method(console, "log", () => {});
  const rolls = [0.2, 0.2, 0.25, 0.9, 0.9, 0.5];
  t.mock.method(Math, "random", () => { assert.ok(rolls.length, "Logging must not consume extra draws"); return rolls.shift()!; });
  const result = resolvePassBlitz(context(), options);
  const stages = new Map(log.mock.calls.map((call) => [call.arguments[0], call.arguments[1]]));
  assert.deepEqual([...stages.keys()], ["[Pass Blitz] Linebacker selection", "[Pass Blitz] Gap selection", "[Pass Blitz] Lineman selection",
    "[Pass Blitz] Line pickup", "[Pass Blitz] Back pickup", "[Pass Blitz] Instant sack check", "[Pass Blitz] Result"]);
  assert.equal(stages.get("[Pass Blitz] Linebacker selection").roll, 20);
  assert.equal(stages.get("[Pass Blitz] Linebacker selection").selected, "LB");
  assert.equal(stages.get("[Pass Blitz] Gap selection").gap, "LT-LG");
  assert.equal(stages.get("[Pass Blitz] Lineman selection").selected, "LT");
  assert.equal(stages.get("[Pass Blitz] Lineman selection").weightedRoll, 8);
  const line = stages.get("[Pass Blitz] Line pickup");
  assert.equal(line.roll, 90);
  assert.equal(line.threshold, 10 / 1.2 + 1 - (2 + 0.5));
  assert.equal(line.blocked, false);
  assert.equal(stages.get("[Pass Blitz] Back pickup").blocker, "RB2");
  assert.equal(stages.get("[Pass Blitz] Back pickup").threshold, 60);
  assert.equal(stages.get("[Pass Blitz] Instant sack check").roll, 50);
  assert.equal(stages.get("[Pass Blitz] Instant sack check").threshold, 20.5 / 50);
  assert.equal(stages.get("[Pass Blitz] Result").outcome, "quarterback-pressured");
  assert.equal(result?.quarterbackPressured, true);
  assert.equal(rolls.length, 0);
});

test("line and back pickups explicitly skip later checks without rolling them", (t) => {
  const log = t.mock.method(console, "log", () => {});
  let rolls = [0.2, 0.2, 0.25, 0.5];
  t.mock.method(Math, "random", () => { assert.ok(rolls.length, "Skipped checks must not roll"); return rolls.shift()!; });
  const strongLine = context();
  strongLine.players[2] = { name: "LT", passProtect: 120, offStars: 10 };
  assert.equal(resolvePassBlitz(strongLine, options)?.lineBlocked, true);
  const backSkipped = log.mock.calls.find((call) => call.arguments[0] === "[Pass Blitz] Back pickup")!.arguments[1];
  assert.deepEqual(backSkipped, { checked: false, roll: null, reason: "blocked-by-line" });
  assert.equal(rolls.length, 0);

  rolls = [0.2, 0.2, 0.25, 0.9, 0.5];
  assert.equal(resolvePassBlitz(context(), options)?.backBlocked, true);
  const sackSkipped = log.mock.calls.filter((call) => call.arguments[0] === "[Pass Blitz] Instant sack check").at(-1)!.arguments[1];
  assert.deepEqual(sackSkipped, { checked: false, roll: null, reason: "blocked-by-back" });
  assert.equal(rolls.length, 0);
});

test("an instant sack reports its successful roll and final outcome", (t) => {
  const log = t.mock.method(console, "log", () => {});
  const rolls = [0.2, 0.2, 0.25, 0.9, 0.9, 0.001];
  t.mock.method(Math, "random", () => { assert.ok(rolls.length); return rolls.shift()!; });
  assert.equal(resolvePassBlitz(context(), options)?.instantSack, true);
  const check = log.mock.calls.find((call) => call.arguments[0] === "[Pass Blitz] Instant sack check")!.arguments[1];
  assert.equal(check.roll, 0.1);
  assert.equal(check.instantSack, true);
  assert.equal(log.mock.calls.at(-1)!.arguments[1].outcome, "instant-sack");
  assert.equal(rolls.length, 0);
});

test("missing personnel are reported as skipped and consume no nonexistent checks", (t) => {
  const log = t.mock.method(console, "log", () => {});
  let rolls = [0.2, 0.2];
  t.mock.method(Math, "random", () => { assert.ok(rolls.length); return rolls.shift()!; });
  resolvePassBlitz(context(), { ...options, formation: {} });
  for (const stage of ["Line pickup", "Back pickup", "Instant sack check"]) {
    const check = log.mock.calls.find((call) => call.arguments[0] === `[Pass Blitz] ${stage}`)!.arguments[1];
    assert.equal(check.checked, false);
    assert.equal(check.roll, null);
  }
  assert.equal(rolls.length, 0);
  rolls = [];
  assert.equal(resolvePassBlitz(context(), { ...options, defense: [] }), undefined);
  assert.equal(log.mock.calls.at(-1)!.arguments[1].outcome, "no-eligible-linebacker");
});
