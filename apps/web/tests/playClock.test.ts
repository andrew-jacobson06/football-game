import { test } from "node:test";
import assert from "node:assert/strict";
import { elapsedPlaySeconds } from "../src/components/league/gameplay/engine/playClock.ts";
import { logPlayToDB } from "../src/components/league/gameplay/engine/playLogger.ts";
import type { LeagueGame } from "../src/components/league/types.ts";
test("play length uses game-clock seconds across normal plays, quarters, halftime and overtime", () => {
  const cases: [unknown, unknown, unknown, unknown, number | null][] = [
    [1, 900, 1, 892.5, 7.5],
    [1, "15:00", 1, "14:55", 5],
    [1, 3, 2, 900, 3],
    [2, 1.5, 3, 900, 1.5],
    [4, 2, 5, 900, 2],
    [5, 4, 6, 900, 4],
    [4, 5, "FINAL", 0, 5],
    [5, 855, "FINAL", 850, 5],
    ["OT", 20, "2OT", 900, 20],
    [2, 900, 2, 900, 0],
    [1, 900, 1, null, null],
    [1, 900, 1, 901, null],
    [1, 10, 1, 20, null],
    [1, 10, 3, 900, null],
    ["PREGAME", 900, 1, 900, null],
  ];
  for (const [period, seconds, nextPeriod, nextSeconds, expected] of cases)
    assert.equal(
      elapsedPlaySeconds(
        { period, seconds },
        { period: nextPeriod, seconds: nextSeconds },
      ),
      expected,
    );
});
test("every logged play has its actual clock length and explicit non-pass defaults", () => {
  const before = {
    GameId: 1,
    Home: "H",
    Away: "A",
    Qtr: 2,
    Time: 2,
    Possession: "Home",
    Down: 1,
    Distance: 10,
    BallOn: 25,
    HomeScore: 0,
    AwayScore: 0,
  } as LeagueGame;
  const play = logPlayToDB(
    before,
    { ...before, Qtr: 3, Time: 900 },
    "Run",
    "Runner",
    "",
    4,
    "Tackler",
    "Normal",
    0,
  );
  assert.equal(play.playLength, 2);
  assert.equal(play.blitz, false);
  assert.equal(play.qbHits, 0);
  assert.equal(play.qbPressures, 0);
  assert.equal(play.coveringDefender, null);
  assert.equal(play.timeUntilThrow, null);
});
