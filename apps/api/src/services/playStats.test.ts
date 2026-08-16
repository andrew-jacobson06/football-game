import assert from "node:assert/strict";
import test from "node:test";
import { aggregatePlayStats } from "./playStats.js";

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
