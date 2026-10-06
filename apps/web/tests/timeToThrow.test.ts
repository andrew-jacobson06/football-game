import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateTimeToThrow, rollBaseTimeToThrow } from "../src/components/league/gameplay/engine/timeToThrow.ts";
import { runPassPlayPipeline } from "../src/components/league/gameplay/engine/passEngine.ts";
import type { EngineContext, PlayCallOptions } from "../src/components/league/gameplay/engine/types.ts";
import type { LeagueGame } from "../src/components/league/types.ts";

const ranges = [
  { min: 0, max: 1.5, percentage: 5 },
  { min: 1.5, max: 2, percentage: 16 },
  { min: 2, max: 2.5, percentage: 20 },
  { min: 2.5, max: 2.8, percentage: 11 },
  { min: 2.8, max: 3.1, percentage: 10 },
  { min: 3.1, max: 3.4, percentage: 10 },
  { min: 3.4, max: 3.7, percentage: 9 },
  { min: 3.7, max: 4.5, percentage: 18 },
];
const random = (...values: number[]) => () => values.shift()!;

test("selects each weighted bucket and samples decimals within its bounds", () => {
  const total = ranges.reduce((sum, range) => sum + range.percentage, 0);
  let cumulative = 0;
  for (const range of ranges) {
    const result = rollBaseTimeToThrow(ranges, random((cumulative + range.percentage / 2) / total, 0.37));
    assert.equal(result.range, range);
    assert.equal(result.baseTimeToThrow, range.min + 0.37 * (range.max - range.min));
    cumulative += range.percentage;
  }
});

test("boundaries enter the next bucket; the 99% total covers the entire roll", () => {
  assert.equal(rollBaseTimeToThrow(ranges, random(0, 0)).baseTimeToThrow, 0);
  assert.equal(rollBaseTimeToThrow(ranges, random(5 / 99, 0)).range, ranges[1]);
  const last = rollBaseTimeToThrow(ranges, random(0.99999, 0.5));
  assert.equal(last.range, ranges.at(-1));
  assert.equal(last.baseTimeToThrow, 4.1);
});

test("uses updated settings and excludes zero-weight rows", () => {
  const updated = [{ min: 0, max: 0, percentage: 0 }, { min: 10, max: 12, percentage: 100 }];
  assert.equal(rollBaseTimeToThrow(updated, random(0, 0.25)).baseTimeToThrow, 10.5);
  assert.throws(() => rollBaseTimeToThrow([]), /Missing or invalid/);
  assert.throws(() => rollBaseTimeToThrow([{ min: 2, max: 1, percentage: 100 }]), /invalid/);
  assert.throws(() => rollBaseTimeToThrow([{ min: 0, max: 1, percentage: 0 }]), /positive total/);
});

test("adds the confrontation modifier after sampling the base time", () => {
  assert.equal(calculateTimeToThrow(ranges, 0.4, random(0, 0.5)).timeToThrow, 1.15);
  assert.equal(calculateTimeToThrow(ranges, -1, random(0, 0.5)).timeToThrow, -0.25);
  assert.throws(() => calculateTimeToThrow(ranges, NaN), /modifier/);
});

const game: LeagueGame = {
  GameId: 1, Home: "Home", Away: "Away", Possession: "Home",
  HomeScore: 0, AwayScore: 0, Qtr: 1, Time: 900, Down: 1, Distance: 10, BallOn: 25,
};
const ctx: EngineContext = {
  players: [
    { name: "OL", team: "Home", passProtect: 60 },
    { name: "DL", team: "Away", passRush: 60 },
  ],
  settings: { timeToThrowRanges: ranges }, historyLength: 0,
};
const options: PlayCallOptions = {
  formation: { LT: "OL" }, defense: [{ player: "DL", position: "DL1", align: "LT" }],
};

test("pipeline finishes all line rolls before selecting the base time and applies their sum", (t) => {
  t.mock.method(console, "debug", () => {});
  const rolls = [0.9, 0.5, 0.9, 0.5, 0.9, 0.5, 0.1, 0.5];
  t.mock.method(Math, "random", () => rolls.shift() ?? 0.5);
  const state = runPassPlayPipeline(game, ctx, "QB", options);
  assert.equal(state.lineConfrontation[0].offensiveWins, 3);
  assert.equal(state.timeToThrowLineModifier, 0.75);
  assert.equal(state.baseTimeToThrow, 1.75);
  assert.equal(state.finalTimeToThrow, 2.5);
  assert.ok(state.phases.indexOf("line-clash") < state.phases.indexOf("base-time-to-throw"));
  assert.ok(state.log.some((message) => message.includes("1.75 + 0.75 = 2.50")));
  assert.equal(rolls.length, 0);
});

test("negative adjusted time follows the existing sack response before choosing routes", (t) => {
  t.mock.method(console, "debug", () => {});
  const rolls = [0, 0.5, 0, 0.5, 0, 0.5, 0, 0];
  t.mock.method(Math, "random", () => rolls.shift() ?? 0.5);
  const state = runPassPlayPipeline(game, ctx, "QB", options);
  assert.equal(state.timeToThrowLineModifier, -0.75);
  assert.equal(state.baseTimeToThrow, 0);
  assert.equal(state.finalTimeToThrow, -0.75);
  assert.equal(state.decision, "sack");
  assert.ok(!state.phases.includes("routes-available"));
});
