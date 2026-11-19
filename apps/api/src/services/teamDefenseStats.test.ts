import test from "node:test";
import assert from "node:assert/strict";
import { aggregateTeamDefenseStats } from "./teamDefenseStats.js";

const teams = [
  { ID: 1, Abbrev: "A", Location: "ALPHA", Name: "ANTS" },
  { ID: 2, Abbrev: "B", Location: "BETA", Name: "BEARS" },
  { ID: 3, Abbrev: "C", Location: "GAMMA", Name: "CATS" },
];
const games = [
  { Id: 1, Home: "A", Away: "B", Qtr: "FINAL" },
  { Id: 2, Home: "B", Away: "C", Qtr: "FINAL" },
  { Id: 3, Home: "B", Away: "A", Qtr: "F" },
  { Id: 4, Home: "A", Away: "C", Qtr: 3 },
  { Id: 5, Home: "C", Away: "A", Qtr: 0 },
];
const play = (
  gameid: number,
  possession: string,
  playtype: string,
  yards: number,
  extra = {},
) => ({ gameid, possession, playtype, yards, result: "Normal", ...extra });

test("yardage allowed includes only that matchup's plays, handles rematches, and excludes unfinished games", () => {
  const rows = aggregateTeamDefenseStats(teams, games, [
    play(1, "Home", "Run", 10),
    play(1, "Away", "Run", 40),
    play(1, "Home", "Pass", 100),
    play(1, "Away", "Pass", 120),
    play(2, "Home", "Pass", 999),
    play(2, "Away", "Pass", 500),
    play(2, "Home", "Run", 888),
    play(2, "Away", "Run", 444),
    play(3, "Home", "Pass", 80),
    play(3, "Home", "Run", 20),
    play(3, "Away", "Pass", 50),
    play(3, "Away", "Run", 5),
    play(4, "Away", "Pass", 9999),
    play(5, "Home", "Run", 8888),
    play(99, "Away", "Pass", 7777),
  ]);
  assert.deepEqual(
    rows.find((row) => row.team === "A"),
    {
      team: "A",
      gamesPlayed: 2,
      passingYardsAllowed: 200,
      rushingYardsAllowed: 60,
      totalYardsAllowed: 260,
    },
  );
  assert.deepEqual(
    rows.find((row) => row.team === "B"),
    {
      team: "B",
      gamesPlayed: 3,
      passingYardsAllowed: 650,
      rushingYardsAllowed: 459,
      totalYardsAllowed: 1109,
    },
  );
  assert.deepEqual(
    rows.find((row) => row.team === "C"),
    {
      team: "C",
      gamesPlayed: 1,
      passingYardsAllowed: 999,
      rushingYardsAllowed: 888,
      totalYardsAllowed: 1887,
    },
  );
});

test("completion flags, offensive losses and YAC follow passing/rushing stat rules", () => {
  const rows = aggregateTeamDefenseStats(teams, games.slice(0, 1), [
    play(1, "Away", "Pass", 15, { result: "Fumble", isComplete: "TRUE" }), // Whole gain, including YAC.
    play(1, "Away", "Pass", -2, { isComplete: true }),
    play(1, "Away", "Run", -4),
    play(1, "Away", "Kneel", -1),
    play(1, "Away", "Pass", 60, { isComplete: false }),
    play(1, "Away", "Pass", 50, { result: "Interception" }),
    play(1, "Away", "Pass", -8, { result: "Sack" }),
    play(1, "Away", "Pass", -5, {
      result: "Fumble",
      isSack: true,
      isComplete: false,
    }),
    ...["Punt", "Kickoff", "Field Goal", "Two Point Pass", "Timeout"].map(
      (type) => play(1, "Away", type, 100),
    ),
  ]);
  const a = rows.find((row) => row.team === "A")!;
  assert.equal(a.passingYardsAllowed, 13);
  assert.equal(a.rushingYardsAllowed, -5);
  assert.equal(a.totalYardsAllowed, 8);
});

test("duplicate game/play records do not multiply totals; IDs are scoped to their game", () => {
  const rows = aggregateTeamDefenseStats(
    teams,
    [games[0], games[0], games[2]],
    [
      play(1, "Away", "Run", 10, { playid: "same-id" }),
      play(1, "Away", "Run", 10, { playid: "same-id" }),
      play(3, "Home", "Run", 20, { playid: "same-id" }),
    ],
  );
  const a = rows.find((row) => row.team === "A")!;
  assert.equal(a.gamesPlayed, 2);
  assert.equal(a.rushingYardsAllowed, 30);
});

test("legacy header spellings and team aliases join to the right game and defense", () => {
  const rows = aggregateTeamDefenseStats(
    teams,
    [{ "Game ID": "9", Home: "Alpha Ants", Away: 2, Quarter: "final" }],
    [
      { "Game Id": 9, Possession: "b", "Play Type": "Run", "Yards Gained": 4 },
      {
        gameid: "9",
        possession: "ALPHA",
        playtype: "Pass",
        yards: 12,
        isComplete: true,
      },
      { gameid: "9", possession: "C", playtype: "Run", yards: 999 },
    ],
  );
  assert.equal(rows.find((row) => row.team === "A")!.rushingYardsAllowed, 4);
  assert.equal(rows.find((row) => row.team === "B")!.passingYardsAllowed, 12);
});

test("attribution uses historical possession, not current player membership", () => {
  const rows = aggregateTeamDefenseStats(teams, games, [
    play(1, "Home", "Run", 7, { player: "Transferred Runner", team: "C" }),
    play(2, "Home", "Run", 9, { player: "Transferred Runner", team: "A" }),
  ]);
  assert.equal(rows.find((row) => row.team === "B")!.rushingYardsAllowed, 7);
  assert.equal(rows.find((row) => row.team === "C")!.rushingYardsAllowed, 9);
  assert.equal(rows.find((row) => row.team === "A")!.rushingYardsAllowed, 0);
});

test("no completed games produces zero totals and zero games played", () => {
  const rows = aggregateTeamDefenseStats(teams, [], []);
  assert.ok(
    rows.every((row) => row.gamesPlayed === 0 && row.totalYardsAllowed === 0),
  );
});
