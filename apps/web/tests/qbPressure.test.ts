import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveQBPressureHit } from "../src/components/league/gameplay/engine/qbPressure.js";
import { runPassPlayPipeline, passPlay, handleSack, choosePressureTarget } from "../src/components/league/gameplay/engine/passEngine.js";
import { runPlay } from "../src/components/league/gameplay/engine/runEngine.js";
import { aggregatePlayStats } from "../../api/src/services/playStats.js";
import type { EngineContext, PassLineConfrontationResult, PassBlitzResult } from "../src/components/league/gameplay/engine/types.js";
import type { LeagueGame } from "../src/components/league/types.js";

const matchup = (name: string, wins: number) => ({ defensiveLineman: name, defensiveWins: wins }) as PassLineConfrontationResult;
const blitz = (lineBlocked = false, backBlocked = false) => ({ rusher: "LB", lineBlocked, backBlocked }) as PassBlitzResult;
const randomSequence = (...values: number[]) => () => { assert.ok(values.length, "unexpected random draw"); return values.shift()!; };

test("hit selection uses all DL contest wins and exact weighted boundaries", () => {
  const matches = [matchup("none", 0), matchup("one", 1), matchup("two", 2), matchup("three", 3)];
  for (const [roll, expected] of [[0, "one"], [3 / 39, "two"], [12 / 39, "three"], [.999, "three"]] as const) {
    const hit = resolveQBPressureHit(matches, undefined, randomSequence(0, roll, .5));
    assert.deepEqual(hit.candidates, [{ player: "one", weight: 3 }, { player: "two", weight: 9 }, { player: "three", weight: 27 }]);
    assert.equal(hit.totalWeight, 39);
    assert.equal(hit.hitter, expected);
  }
});

test("blitzer contributes 40/30/20 and a zero-win line preserves the fallback", () => {
  for (const [call, expected] of [[blitz(), 40], [blitz(false, true), 30], [blitz(true), 20]] as const) {
    const hit = resolveQBPressureHit([matchup("DL", 0)], call, randomSequence(0, .5, .5));
    assert.deepEqual(hit.candidates, [{ player: "LB", weight: expected }]);
    assert.equal(hit.hitter, "LB");
  }
  const empty = resolveQBPressureHit([matchup("DL", 0)], undefined, randomSequence(.5, .5));
  assert.equal(empty.hit, false);
  assert.equal(empty.action, "throw-away");
  assert.equal(empty.hitter, undefined);
});

test("hit response boundaries are 10% throw away, 10% force throw, 80% sack", () => {
  for (const [roll, expected] of [[0, "throw-away"], [.09999, "throw-away"], [.1, "throw"], [.19999, "throw"], [.2, "sack"], [.99999, "sack"]] as const)
    assert.equal(resolveQBPressureHit([matchup("DL", 1)], undefined, randomSequence(0, 0, roll)).action, expected);
});

const game = { GameId: "test", Home: "A", Away: "B", Possession: "Home", BallOn: 50, Down: 1, Distance: 10, Qtr: 1, Time: "15:00", HomeScore: 0, AwayScore: 0 } as unknown as LeagueGame;
const makeContext = (): EngineContext => ({ players: [
  { name: "QB", team: "A", position: "QB", juke: 90, readDefense: 90, poise: 90 },
  { name: "OL", team: "A", passProtect: 1, offStars: 1 },
  { name: "DL", team: "B", defPos: "DL", passRush: 100, sackChance: 99 },
  { name: "LB", team: "B", defPos: "LB", passRush: 100, tackling: 90, defStars: 5, sackChance: 1 },
], settings: { timeToThrowRanges: [{ min: 0, max: 0, percentage: 100 }] }, historyLength: 0 });
const call = { formation: { QB: "QB", C: "OL" }, defense: [{ player: "DL", align: "C" }, { player: "LB", align: "LB1" }] } as const;

test("unblocked blitz resolves DL contests before the hit; chosen LB receives sack credit", (t) => {
  t.mock.method(Math, "random", () => .5);
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  const options = { ...call, defense: [...call.defense], blitz: true } as any;
  const state = runPassPlayPipeline(game, makeContext(), "QB", options);
  assert.equal(state.blitzResult?.instantSack, false);
  assert.equal(state.lineConfrontation.length, 1);
  assert.equal(state.lineConfrontation[0].defensiveWins, 3);
  assert.deepEqual(state.pressureHit?.candidates, [{ player: "DL", weight: 27 }, { player: "LB", weight: 40 }]);
  assert.equal(state.timeToThrowLineModifier, 0);
  assert.equal(state.sacker, "LB");
  const result = passPlay(game, makeContext(), options);
  assert.equal(result.play.isSack, true);
  assert.equal(result.play.tackler, "LB");
});

test("instant blitz sack credits its LB and skips line contests and pressure draw", (t) => {
  t.mock.method(Math, "random", () => 0);
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  const options = { ...call, defense: [...call.defense], blitz: true } as any;
  const state = runPassPlayPipeline(game, makeContext(), "QB", options);
  assert.equal(state.blitzResult?.instantSack, true);
  assert.equal(state.sacker, "LB");
  assert.equal(state.lineConfrontation.length, 0);
  assert.equal(state.pressureHit, undefined);
  assert.equal(passPlay(game, makeContext(), options).play.tackler, "LB");
});

test("non-blitz negative-time pressure hits with the winning DL and credits his sack", (t) => {
  const draws = [...Array(8).fill(.5), .1, .5, .5];
  t.mock.method(Math, "random", () => draws.shift() ?? .5);
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  const options = { ...call, defense: [...call.defense], blitz: false } as any;
  const state = runPassPlayPipeline(game, makeContext(), "QB", options);
  assert.ok(state.finalTimeToThrow! < 0);
  assert.equal(state.pressureHit?.hitter, "DL");
  assert.equal(state.decision, "sack");
  draws.push(...Array(8).fill(.5), .1, .5, .5);
  assert.equal(passPlay(game, makeContext(), options).play.tackler, "DL");
});

test("explicit sack attribution survives fumble/safety result categories", (t) => {
  t.mock.method(Math, "random", () => .5);
  const result = handleSack({ ...game, BallOn: 1 } as LeagueGame, makeContext(), "QB", {}, "LB");
  assert.equal(result.play.result, "Safety");
  assert.equal(result.play.isSack, true);
  assert.equal(result.play.tackler, "LB");
  const stats = aggregatePlayStats([result.play]);
  assert.equal(stats.get("lb")?.Sacks, 1);
  assert.equal(stats.get("dl")?.Sacks, undefined);
});

test("non-blitz pressure chooses current perceived openness over depth/read weights", (t) => {
  t.mock.method(console, "log", () => {});
  const ctx = makeContext();
  ctx.settings.routeOpennessSettings = { curves: { Quick: [{ time: 0, openness: 50 }, { time: 1, openness: 50 }] } } as any;
  const routes = [
    { player: "primary", TTO: 2, curveType: "Quick", airYards: 1, separation: 99, phaseOpenness: [] },
    { player: "other", TTO: 2, curveType: "Quick", airYards: 40, separation: -99, phaseOpenness: [] },
  ] as any;
  const selected = choosePressureTarget(ctx, "QB", routes, 1, randomSequence(.9, .1));
  assert.equal(selected?.player, "other");
});

test("a losing QB scramble is a sack, preserves its actual tackler and does not become a rush attempt", (t) => {
  t.mock.method(Math, "random", () => .5);
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  const context = makeContext();
  context.players[0] = { ...context.players[0], vision: 1, strength: 1, size: 1 };
  context.players[2] = { ...context.players[2], RunStop: 100, tackling: 100 };
  context.settings.negativeYardage = [{ label: "loss", percentage: 100, minYards: -3, maxYards: -3 }];
  for (const [qbScramble, down, ball, expected] of [[true, 1, 50, "Sack"], [false, 1, 50, "Normal"], [true, 4, 50, "TO on Downs"], [true, 1, 1, "Safety"]] as const) {
    const result = runPlay({ ...game, Down: down, BallOn: ball } as LeagueGame, context, {
      formation: { QB: "QB", C: "OL" }, defense: [{ player: "DL", position: "DL1", align: "C" }], runner: "QB", qbScramble,
    });
    assert.ok(Number(result.play.yards) < 0);
    assert.equal(result.play.result, expected);
    assert.equal(result.play.playtype, qbScramble ? "Pass" : "Run");
    assert.equal(result.play.isSack, qbScramble);
    assert.equal(result.play.tackler, "DL");
    const stats = aggregatePlayStats([result.play]);
    assert.equal(stats.get("qb")?.["Passing Attempts"] ?? 0, 0);
    assert.equal(stats.get("qb")?.Carries ?? 0, qbScramble ? 0 : 1);
    assert.equal(stats.get("dl")?.Sacks ?? 0, qbScramble ? 1 : 0);
  }
});

test("a scramble stopped at the line stays a rush rather than a sack", (t) => {
  t.mock.method(Math, "random", () => .5);
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  const context = makeContext();
  context.players[0] = { ...context.players[0], vision: 1, strength: 1, size: 1 };
  context.players[2] = { ...context.players[2], RunStop: 100, tackling: 100 };
  context.settings.negativeYardage = [{ label: "line", percentage: 100, minYards: 0, maxYards: 0 }];
  const result = runPlay(game, context, { formation: { QB: "QB", C: "OL" },
    defense: [{ player: "DL", position: "DL1", align: "C" }], runner: "QB", qbScramble: true });
  assert.equal(result.play.yards, 0);
  assert.equal(result.play.playtype, "Run");
  assert.equal(result.play.isSack, false);
});

test("the supplied 63-point example hits below 63 and avoids the hit at 63", () => {
  const matches = [matchup("three", 3), matchup("one", 1), matchup("other", 1)];
  const hit = resolveQBPressureHit(matches, blitz(false, true), randomSequence(.62999, .99, .9));
  assert.equal(hit.totalWeight, 63);
  assert.equal(hit.hitChance, 63);
  assert.equal(hit.hit, true);
  assert.equal(hit.hitter, "LB");
  const missed = resolveQBPressureHit(matches, blitz(false, true), randomSequence(.63, .5));
  assert.equal(missed.hit, false);
  assert.equal(missed.hitter, undefined);
  assert.equal(missed.roll, null);
  assert.equal(missed.action, "throw-away");
});

test("avoiding a hit uses 50% force throw, 25% throw away, 25% scramble", () => {
  for (const [roll, action] of [[0, "throw"], [.49999, "throw"], [.5, "throw-away"], [.74999, "throw-away"], [.75, "scramble"], [.999, "scramble"]] as const) {
    const result = resolveQBPressureHit([matchup("DL", 3)], undefined, randomSequence(.99, roll));
    assert.equal(result.hit, false);
    assert.equal(result.hitter, undefined);
    assert.equal(result.action, action);
  }
});

test("summed scores of 100 or more always hit without changing attribution weights", () => {
  const result = resolveQBPressureHit([matchup("A", 3), matchup("B", 3), matchup("C", 3)], blitz(), randomSequence(.9999, .9999, .9));
  assert.equal(result.totalWeight, 121);
  assert.equal(result.hitChance, 100);
  assert.equal(result.hit, true);
  assert.equal(result.hitter, "LB");
});

test("non-hit negative-time pressure can throw away or scramble without a sack", (t) => {
  t.mock.method(console, "log", () => {});
  t.mock.method(console, "debug", () => {});
  for (const [response, action] of [[.5, "throw-away"], [.75, "scramble"]] as const) {
    const draws = [...Array(8).fill(.5), .99, response];
    t.mock.method(Math, "random", () => draws.shift() ?? .5);
    const state = runPassPlayPipeline(game, makeContext(), "QB", { ...call, defense: [...call.defense], blitz: false } as any);
    assert.ok(state.finalTimeToThrow! < 0);
    assert.equal(state.pressureHit?.hit, false);
    assert.equal(state.decision, action);
    assert.equal(state.sacker, undefined);
  }
});
