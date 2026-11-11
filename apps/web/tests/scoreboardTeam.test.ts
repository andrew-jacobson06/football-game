import test from "node:test";
import assert from "node:assert/strict";
import { scoreboardTeam } from "../src/components/league/scoreboardTeam.ts";
import type { LeagueGame } from "../src/components/league/types.ts";
const game: LeagueGame = {
  GameId: 1,
  Home: "POR",
  Away: "CLT",
  HomeScore: 34,
  AwayScore: 17,
  Qtr: "FINAL",
  Time: 0,
  Down: 1,
  Distance: 10,
  BallOn: 25,
  Possession: "Home",
};

test("scoreboard names, abbreviations, logos and primary color come from Teams sheet data", () => {
  const team = scoreboardTeam(game, "Home", {
    Abbrev: "POR",
    Location: "PORTLAND",
    Name: "WILDFIRE",
    Logo: "https://example.com/wildfire.png",
    "Primary Color": "rgb(251, 119, 1)",
    Wins: 6,
    Losses: 2,
  });
  assert.equal(team.fullName, "Portland Wildfire");
  assert.equal(team.abbreviation, "POR");
  assert.equal(team.primaryColor, "rgb(251, 119, 1)");
  assert.equal(team.record, "6-2");
  assert.equal(team.score, 34);
  const changed = scoreboardTeam(game, "Home", {
    "primary color": "rgb(7, 193, 194)",
    Abbrev: "NEW",
    Location: "NEW CITY",
    Name: "NEW NAME",
  });
  assert.equal(changed.primaryColor, "rgb(7, 193, 194)");
  assert.equal(changed.abbreviation, "NEW");
});

test("game records and timeouts are retained and missing metadata has a neutral fallback", () => {
  const team = scoreboardTeam(
    { ...game, "Home Record": "12-4-1", HomeTimeouts: 0 } as LeagueGame,
    "Home",
  );
  assert.equal(team.record, "12-4-1");
  assert.equal(team.timeouts, 0);
  assert.equal(team.fullName, "POR");
  assert.equal(team.primaryColor, "transparent");
  assert.equal(scoreboardTeam(game, "Away").timeouts, 3);
});
