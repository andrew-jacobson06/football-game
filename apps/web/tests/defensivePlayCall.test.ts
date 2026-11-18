import test from "node:test";
import assert from "node:assert/strict";
import { resolveDefensivePlayCall } from "../src/components/league/gameplay/engine/defensivePlayCall.ts";
import { runPassPlayPipeline, passPlay } from "../src/components/league/gameplay/engine/passEngine.ts";
import { runPlay } from "../src/components/league/gameplay/engine/runEngine.ts";
import type { EngineContext, PlayCallOptions } from "../src/components/league/gameplay/engine/types.ts";
import type { LeagueGame } from "../src/components/league/types.ts";

const game: LeagueGame = { GameId: 1, Home: "Home", Away: "Away", HomeScore: 0, AwayScore: 0, Qtr: 1, Time: 900, Down: 1, Distance: 10, BallOn: 25, Possession: "Home" };

test("the decimal boundary is strictly below 30 without rounding", () => {
  for (const [random, expected] of [[0, true], [0.29999999, true], [0.3, false], [0.30000001, false], [0.99999999, false], [1, false]] as const) {
    let rolls = 0;
    const call = resolveDefensivePlayCall({}, () => { rolls++; return random; });
    assert.equal(call.blitz, expected);
    assert.equal(call.blitzRoll, random * 100);
    assert.equal(rolls, 1);
  }
});

test("each new snap gets a fresh call; a supplied call is reused without consuming a roll", () => {
  const rolls = [0.2, 0.8];
  assert.equal(resolveDefensivePlayCall({}, () => rolls.shift()!).blitz, true);
  assert.equal(resolveDefensivePlayCall({}, () => rolls.shift()!).blitz, false);
  for (const blitz of [true, false]) {
    assert.deepEqual(resolveDefensivePlayCall({ blitz, blitzRoll: 29.99 }, () => {
      throw new Error("Existing call must not be rerolled");
    }), { blitz, blitzRoll: 29.99 });
  }
});

test("an automatic pass blitz reaches the existing blitz response; 30 calls no blitz", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  const context: EngineContext = { players: [
    { name: "QB", team: "Home", position: "QB", readDefense: 50, juke: 50, poise: 50 },
    { name: "LB", team: "Away", defPos: "LB", passRush: 100, tackling: 100, defStars: 100 },
  ], settings: { timeToThrowRanges: [{ min: 0, max: 0, percentage: 100 }] }, historyLength: 0 };
  const options: PlayCallOptions = { formation: { QB: "QB" }, defense: [{ player: "LB", position: "LB1", align: "QB" }] };
  t.mock.method(Math, "random", () => 0.299999);
  const blitz = runPassPlayPipeline(game, context, "QB", options);
  assert.equal(blitz.blitz, true);
  assert.equal(blitz.blitzRoll, 0.299999 * 100);
  assert.equal(blitz.blitzResult?.rusher, "LB");
  assert.equal(blitz.decision, "sack");
  t.mock.method(Math, "random", () => 0.3);
  const noBlitz = runPassPlayPipeline(game, context, "QB", options);
  assert.equal(noBlitz.blitz, false);
  assert.equal(noBlitz.blitzRoll, 30);
  assert.equal(noBlitz.blitzResult, undefined);
});

const runContext: EngineContext = { players: [
  { name: "QB", team: "Home", position: "QB", speed: 60, acceleration: 60, vision: 100 },
  { name: "Blocker", team: "Home", runBlocking: 100, passProtect: 50 },
  { name: "Rusher", team: "Away", defPos: "DL", runStop: 10, passRush: 50 },
], settings: { timeToThrowRanges: [{ min: 2, max: 2, percentage: 100 }] }, historyLength: 0 };
const runOptions: PlayCallOptions = { runner: "QB", formation: { QB: "QB", LT: "Blocker" }, defense: [{ player: "Rusher", position: "DL1", align: "LT" }] };

test("a run rolls and records its defensive call", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  let first = true;
  t.mock.method(Math, "random", () => { if (first) { first = false; return 0.299999; } return 0.9; });
  const result = runPlay(game, runContext, runOptions);
  assert.equal(result.play.blitz, true);
  assert.equal(result.play.blitzRoll, 0.299999 * 100);
  assert.ok(result.play.runLog.some((entry) => entry.includes("Defensive call: blitz")));
});

test("a pass that becomes a scramble retains its original call instead of rerolling", (t) => {
  t.mock.method(console, "debug", () => {});
  t.mock.method(console, "log", () => {});
  let first = true;
  t.mock.method(Math, "random", () => { if (first) { first = false; return 0.31; } return 0.9; });
  const result = passPlay(game, runContext, runOptions);
  assert.equal(result.play.playtype, "Run");
  assert.equal(result.play.player, "QB");
  assert.equal(result.play.blitz, false);
  assert.equal(result.play.blitzRoll, 31);
});
