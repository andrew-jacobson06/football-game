import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase } from "./connection.js";
import { migrateDatabase } from "./migrations.js";
import { LeagueRepository } from "./leagueRepository.js";
import { leagueSelection } from "./leagueSelection.js";
import { closeRuntimeDatabase } from "./runtime.js";
import { createApp } from "../app.js";

test("historical stats isolate seasons and leagues and follow recorded game teams", async t => {
  const dir = mkdtempSync(path.join(tmpdir(), "football-seasons-"));
  const filename = path.join(dir, "stats.sqlite");
  const db = openDatabase({ filename });
  migrateDatabase(db);
  const repo = new LeagueRepository(db, "l");
  for (const id of ["l", "other"]) repo.insert("leagues", { id, name: id });
  repo.insert("divisions", { id: "d", league_id: "l", name: "East" });
  for (const id of ["a", "b"]) repo.insert("teams", { id, league_id: "l" });
  repo.insert("players", { id: "p", league_id: "l", display_name: "Traveler" });
  for (const [id, number, league] of [["s1", 1, "l"], ["s2", 2, "l"], ["secret", 1, "other"]] as const) {
    repo.insert("seasons", { id, league_id: league, season_number: number, display_name: `Season ${number}`, display_year: 2024 + number });
    if (league !== "l") continue;
    for (const team of ["a", "b"]) repo.insert("team_seasons", { id: `${id}-${team}`, season_id: id, team_id: team, division_id: "d", abbreviation: team.toUpperCase(), nickname: team });
    repo.insert("player_season_ratings", { id: `${id}-rating`, season_id: id, player_id: "p", version: 1, offense_position: "WR" });
    repo.insert("player_team_assignments", { id: `${id}-roster`, season_id: id, player_id: "p", team_id: "b", effective_from: "2020-01-01" });
    for (const week of [1, 2, 3]) {
      const game = `${id}-g${week}`, yards = number * 100 + week, team = week === 1 ? "a" : "b";
      repo.insert("games", { id: game, season_id: id, legacy_game_number: week, stage: "regular", regular_week: week, home_team_id: "a", away_team_id: "b", status: "final" });
      repo.insert("game_state", { game_id: game, phase: "final", period: 4, seconds_remaining: 0, home_score: 21, away_score: 10 });
      if (week === 3) continue;
      repo.insert("player_game_stats", { game_id: game, team_id: team, player_id: "p", receptions: week, receiving_yards: yards, longest_reception: yards, ol_wins: 2, ol_losses: 1, lead_blocks: 1, metric_availability_json: "{}", calculation_version: "test" });
      repo.insert("team_game_stats", { game_id: game, team_id: team, opponent_team_id: team === "a" ? "b" : "a", passing_yards: yards, rushing_yards: 15, metric_availability_json: "{}", calculation_version: "test" });
    }
  }
  assert.equal(repo.season().id, "s2");
  assert.deepEqual(repo.seasons().map(s => s.id), ["s2", "s1"]);
  leagueSelection.run({ leagueId: "l", seasonId: "s1" }, () => {
    assert.equal(repo.playerStats()[0]["Receiving Yards"], "203");
    assert.equal(repo.playerStats("a")[0]["Receiving Yards"], "101");
    const games = repo.playerGames("Traveler", "");
    assert.equal(games.length, 2, "do not invent participation for a third team game");
    assert.equal(games[0].team, "A");
    assert.equal(games[0].location, "vs");
    assert.equal(games[0].result, "W 21-10");
    assert.equal(games[1].team, "B");
    assert.equal(games[1].location, "@");
    assert.equal(games[1].result, "L 10-21");
    assert.equal(games[0].blocking.wins, 2);
    assert.equal(repo.teamSeasonStats().find(s => s.teamId === "a")!.passing, 101);
  });
  assert.equal(repo.season().id, "s2");
  assert.equal(repo.playerStats()[0]["Receiving Yards"], "403");
  assert.throws(() => leagueSelection.run({ leagueId: "l", seasonId: "secret" }, () => repo.season()), /No imported season/);
  const before = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = filename;
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>(r => server.once("listening", r));
  t.after(() => { server.close(); closeRuntimeDatabase(); db.close(); if (before === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = before; rmSync(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
  const get = (route: string) => fetch(base + route, { headers: { "X-League-Id": "l" } });
  assert.equal((await (await get("/seasons")).json()).seasons.length, 2);
  const [old, latest] = await Promise.all([get("/player-stats?seasonId=s1"), get("/player-stats")]);
  assert.equal((await old.json()).playerStats[0]["Receiving Yards"], "203");
  assert.equal((await latest.json()).playerStats[0]["Receiving Yards"], "403");
  assert.notEqual((await get("/players/Traveler/games?seasonId=secret")).status, 200);
  assert.equal((await get("/season?seasonId=s1")).status, 400);
  assert.equal((await fetch(base + "/season/advance?seasonId=s1", { method: "POST", headers: { "X-League-Id": "l" } })).status, 400);
  const teamRead = await get("/teams/A/players?seasonId=s1");
  assert.equal(teamRead.status, 200);
  const teamPlayers = (await teamRead.json()).players;
  assert.equal(teamPlayers[0].Name, "Traveler");
  assert.equal(teamPlayers[0].Stats["Receiving Yards"], "101");
  assert.equal((await get("/players/Traveler/games?seasonId=s1")).status, 200);
});
