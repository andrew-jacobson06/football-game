import test from "node:test";
import assert from "node:assert/strict";
import { sortStandings, standingWinPercentage, standingDivisionPercentage, standingRecord, standingNumber } from "../src/components/league/standings.ts";
import { mergeStandingsWithTeams } from "../src/components/league/leagueMappers.ts";
import type { LeagueGame, LeagueTeam } from "../src/components/league/types.ts";
const team = (Abbrev: string, DIFF = 0, division = 0): LeagueTeam => ({ Abbrev, W: 5, L: 5, T: 0, DIFF, "Div Win%": division });
const game = (Home: string, Away: string, HomeScore: number, AwayScore: number, id = `${Home}-${Away}`): LeagueGame => ({ GameId: id, Home, Away, HomeScore, AwayScore, Qtr: "FINAL", Time: 0, Down: 1, Distance: 10, BallOn: 25, Possession: "Home" });
const order = (teams: LeagueTeam[], games: LeagueGame[] = []) => sortStandings(teams, games).map(t=>t.Abbrev);

test("overall win percentage includes ties and honors new sheet percentages", () => {
  assert.equal(standingWinPercentage({ W: 8, L: 3, T: 2 }), 9/13);
  for (const value of ["69.23%", .6923, 69.23]) assert.equal(standingWinPercentage({ "Win%": value }), .6923);
  assert.equal(standingWinPercentage({ "Win%": "0%", W: 5 }), 0);
  assert.equal(standingWinPercentage({ W: 0, L: 0, T: 0 }), 0);
  assert.deepEqual(order([{ Abbrev: "lower", W: 8, L: 5 }, { Abbrev: "higher", W: 8, L: 3, T: 2 }]), ["higher", "lower"]);
});

test("updated standings headers take priority over old team metadata", () => {
  const [merged] = mergeStandingsWithTeams([{ "": "POR", W: 8, L: 3, T: 2, "Home W": 5, "Home L": 1, "Div W": 4, "Div L": 3, "Div T": 1, "Div Win%": "56.25%" }], [{ Abbrev: "POR", Wins: 99, Division: "West" }]);
  assert.equal(standingNumber(merged, "W", "Wins"), 8);
  assert.equal(standingRecord(merged, "Home"), "5-1");
  assert.equal(standingRecord(merged, "Div"), "4-3-1");
  assert.equal(standingDivisionPercentage(merged), .5625);
  assert.equal(standingDivisionPercentage({ "Div W": 4, "Div L": 3, "Div T": 1 }), .5625);
});

test("head-to-head win percentage precedes head-to-head and overall differential", () => {
  const a = team("A", -100), b = team("B", 100);
  const games = [game("A", "B", 10, 0, "1"), game("B", "A", 50, 0, "2"), game("A", "B", 10, 0, "3")];
  assert.deepEqual(order([b, a], games), ["A", "B"]);
});

test("head-to-head differential breaks equal head-to-head percentages before overall differential", () => {
  const a = team("A", -100), b = team("B", 100);
  assert.deepEqual(order([b, a], [game("A", "B", 30, 10), game("B", "A", 20, 10)]), ["A", "B"]);
});

test("overall differential precedes division win percentage; division percentage breaks the final tie", () => {
  const games = [game("A", "B", 10, 10)];
  assert.deepEqual(order([team("A", 10, 1), team("B", 20, 0)], games), ["B", "A"]);
  assert.deepEqual(order([team("A", 10, .5), team("B", 10, .75)], games), ["B", "A"]);
});

test("multi-team ties use all games within the tied group, avoiding pairwise circular comparisons", () => {
  const teams = [team("B", 100), team("C", 0), team("A", -100)];
  const games = [game("A", "B", 30, 10), game("B", "C", 20, 10), game("C", "A", 20, 10)];
  assert.deepEqual(order(teams, games), ["A", "C", "B"]);
  assert.deepEqual(order([...teams].reverse(), games), ["A", "C", "B"]);
  const wins = [game("A", "B", 10, 0), game("A", "C", 10, 0), game("B", "C", 10, 0)];
  assert.deepEqual(order(teams, wins), ["A", "B", "C"]);
});

test("unfinished, unrelated, duplicate, and blank-score games do not distort head-to-head records", () => {
  const teams = [team("A", 0), team("B", 10)];
  const won = game("A", "B", 20, 10);
  assert.deepEqual(order(teams, [won, won, { ...game("B", "A", 99, 0), Qtr: 4 }, game("B", "OUTSIDE", 100, 0), { ...game("B", "A", 10, 0, "blank"), HomeScore: "" }]), ["A", "B"]);
  assert.deepEqual(order(teams), ["B", "A"]);
});

test("head-to-head counts a tie as half a win, recognizes final aliases and team aliases", () => {
  const a = { ...team("A"), Name: "Alphas", ID: 1 }, b = { ...team("B"), Location: "Beta City", ID: 2 };
  assert.deepEqual(order([b, a], [{ ...game("alphas", "2", 20, 10), Qtr: " F " }, game("Beta City", "A", 10, 10)]), ["A", "B"]);
});

test("division ordering uses the division's tied teams and leaves source data untouched", () => {
  const teams = [{ ...team("A"), Division: "East" }, { ...team("B"), Division: "East" }, { ...team("C"), Division: "West" }];
  const games = [game("A", "B", 10, 0), game("B", "C", 100, 0), game("C", "A", 10, 0)];
  const before = structuredClone({ teams, games });
  assert.deepEqual(order(teams.filter(t=>t.Division === "East"), games), ["A", "B"]);
  assert.deepEqual({ teams, games }, before);
});
