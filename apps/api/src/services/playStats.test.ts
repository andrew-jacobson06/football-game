import assert from "node:assert/strict";
import test from "node:test";
import { aggregatePlayStats, passPlayFacts } from "./playStats.js";

test("aggregates every team-page stat family from play history", () => {
  const stats = aggregatePlayStats([
    { gameid: "1", playtype: "Pass", player: "Quarterback", receiver: "Receiver", yards: 24, airyards: 15, result: "Touchdown", newdown: 1, tackler: "Corner" },
    { gameid: "1", playtype: "Pass", player: "Quarterback", receiver: "Receiver", yards: 0, result: "Incomplete" },
    { gameid: "2", playtype: "Pass", player: "Quarterback", receiver: "Receiver", yards: 0, result: "Interception", recoveredby: "Corner" },
    { gameid: "2", playtype: "Pass", player: "Quarterback", yards: -7, result: "Sack", tackler: "Edge" },
    { gameid: "2", playtype: "Run", player: "Runner", yards: 12, result: "Fumble", newdown: 1, tackler: "Edge", recoveredby: "Corner", brokenTackles: 1, jukes: 2 },
  ]);

  assert.deepEqual(
    Object.fromEntries(["Completions", "Passing Attempts", "Passing Yards", "Passing TD", "Interceptions Thrown", "Sacked", "Sack Yards Lost", "GP"].map((field) => [field, stats.get("quarterback")?.[field]])),
    { Completions: 1, "Passing Attempts": 3, "Passing Yards": 24, "Passing TD": 1, "Interceptions Thrown": 1, Sacked: 1, "Sack Yards Lost": 7, GP: 2 },
  );
  assert.equal(stats.get("receiver")?.Targets, 3);
  assert.equal(stats.get("receiver")?.["Yards After Catch"], 9);
  assert.equal(stats.get("runner")?.Carries, 1);
  assert.equal(stats.get("runner")?.["Rushing Fumbles Lost"], 1);
  assert.equal(stats.get("edge")?.Tackles, 2);
  assert.equal(stats.get("edge")?.Sacks, 1);
  assert.equal(stats.get("corner")?.Interceptions, 1);
  assert.equal(stats.get("corner")?.["Fumble Recoveries"], 1);
});

test("explicit sack/completion flags take precedence and stored YAC counts toward receiving totals", () => {
  const stats = aggregatePlayStats([
    ...["Safety", "Fumble", "TO on Downs"].map((result) => ({ gameid: 1, playtype: "Pass", player: "QB", receiver: "", result, yards: -5, tackler: "Edge", isSack: "TRUE", isComplete: "FALSE" })),
    { gameid: 1, playtype: "Pass", player: "QB", receiver: "WR", result: "Fumble", yards: 15, airyards: 10, YAC: 3, isSack: false, isComplete: true },
    { gameid: 1, playtype: "Pass", player: "QB", receiver: "WR", result: "Normal", yards: 0, isComplete: false },
    { gameid: 1, playtype: "Pass", player: "QB", receiver: "WR", result: "Interception", yards: 0, isComplete: false },
    { gameid: 1, playtype: "Pass", player: "QB", receiver: "", result: "Incomplete", yards: 0, isComplete: false },
    { gameid: 1, playtype: "Run", player: "QB", yards: 8, isComplete: false },
  ]);
  assert.equal(stats.get("qb")?.["Passing Attempts"], 4);
  assert.equal(stats.get("qb")?.Completions, 1);
  assert.equal(stats.get("qb")?.Sacked, 3);
  assert.equal(stats.get("qb")?.["Sack Yards Lost"], 15);
  assert.equal(stats.get("wr")?.Receptions, 1);
  assert.equal(stats.get("wr")?.Targets, 3);
  assert.equal(stats.get("wr")?.["Yards After Catch"], 3);
  assert.equal(stats.get("edge")?.Sacks, 3);
  assert.deepEqual(passPlayFacts({ playtype: "Pass", result: "First Down", isComplete: "" }), { isSack: false, isComplete: true });
  assert.deepEqual(passPlayFacts({ playtype: "Pass", result: "Sack", isSack: "FALSE", isComplete: 0 }), { isSack: false, isComplete: false });
});
