import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "./connection.js";
import { loadMigrations, migrateDatabase } from "./migrations.js";
import { LeagueRepository } from "./leagueRepository.js";
import { SeasonPreparation } from "./seasonPreparation.js";
function fixture(t: { after: (f: () => void) => void }, first = false) {
  const db = openDatabase({ filename: ":memory:" });
  t.after(() => db.close());
  migrateDatabase(db);
  const repo = new LeagueRepository(db, "league");
  repo.insert("leagues", { id: "league", name: "League", keeper_count: 1 });
  repo.insert("settings_versions", {
    id: "settings",
    league_id: "league",
    version: 1,
    label: "Settings",
    status: "active",
  });
  repo.insert("divisions", { id: "east", league_id: "league", name: "East" });
  repo.insert("seasons", {
    id: "old",
    league_id: "league",
    season_number: 1,
    display_name: "Season 1",
    display_year: 2026,
    status: first ? "setup" : "postseason",
    settings_version_id: "settings",
  });
  for (const team of ["a", "b"]) {
    repo.insert("teams", { id: team, league_id: "league" });
    repo.insert("team_seasons", {
      id: `ts${team}`,
      season_id: "old",
      team_id: team,
      division_id: "east",
      abbreviation: team.toUpperCase(),
      nickname: `Team ${team}`,
    });
    for (let n = 1; n <= 2; n++) {
      const id = `${team}${n}`;
      repo.insert("players", { id, league_id: "league", display_name: id });
      repo.insert("player_season_ratings", {
        id: `r${id}`,
        season_id: "old",
        player_id: id,
        version: 1,
        offense_position: "WR",
        speed: 80,
      });
      repo.insert("player_team_assignments", {
        id: `pa${id}`,
        season_id: "old",
        player_id: id,
        team_id: first ? null : team,
        status: "active",
        effective_from: "2025-01-01",
      });
    }
  }
  for (const id of ["c1", "c2", "c3"]) {
    repo.insert("coaches", {
      id,
      league_id: "league",
      display_name: `Coach ${id}`,
    });
    repo.insert("coach_season_ratings", {
      id: `cr${id}`,
      season_id: "old",
      coach_id: id,
      version: 1,
      attributes_json: "{}",
      passing: 70,
    });
  }
  if (!first) {
    for (const [team, id] of [
      ["a", "c1"],
      ["b", "c2"],
    ])
      repo.insert("coach_team_assignments", {
        id: `ca${id}`,
        season_id: "old",
        team_id: team,
        coach_id: id,
        role: "Head Coach",
        effective_from: "2025-01-01",
      });
    repo.insert("games", {
      id: "champ",
      season_id: "old",
      stage: "playoffs",
      playoff_round: "National Championship",
      home_team_id: "a",
      away_team_id: "b",
      status: "final",
    });
    repo.insert("game_state", {
      game_id: "champ",
      phase: "final",
      home_score: 20,
      away_score: 17,
    });
  }
  return { db, repo, prep: new SeasonPreparation(repo) };
}
test("advancing requires a final championship winner and preserves the old season", (t) => {
  const { db, repo, prep } = fixture(t);
  db.prepare("UPDATE game_state SET home_score=17 WHERE game_id='champ'").run();
  assert.throws(() => prep.advance("old", 1), /Championship/);
  db.prepare("UPDATE game_state SET home_score=20 WHERE game_id='champ'").run();
  const next = prep.advance("old", 1);
  assert.equal(next.seasonNumber, 2);
  assert.equal(next.year, 2027);
  assert.equal(next.phase, "keepers");
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM games WHERE season_id=?",
      next.seasonId,
    )!.n,
    0,
  );
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM player_season_ratings WHERE season_id=?",
      next.seasonId,
    )!.n,
    4,
  );
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM coach_season_ratings WHERE season_id=?",
      next.seasonId,
    )!.n,
    3,
  );
  assert.equal(
    repo.one("SELECT status FROM seasons WHERE id='old'")!.status,
    "finalized",
  );
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM player_team_assignments WHERE season_id='old' AND team_id IS NOT NULL",
    )!.n,
    4,
  );
  assert.equal(prep.advance("old", 1).seasonId, next.seasonId);
  assert.equal(repo.one("SELECT count(*) AS n FROM seasons")!.n, 2);
  assert.throws(
    () => prep.lockTeam("old", "a", ["a1"], "keep"),
    /active season changed/,
  );
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
test("exact keeper count, old-roster ownership, coach decisions, locks and finalization are enforced", (t) => {
  const { repo, prep } = fixture(t);
  const s = prep.advance("old", 1).seasonId;
  assert.throws(() => prep.lockTeam(s, "a", [], "keep"), /exactly 1/);
  assert.throws(() => prep.lockTeam(s, "a", ["a1", "a2"], "keep"), /exactly 1/);
  assert.throws(() => prep.lockTeam(s, "a", ["b1"], "keep"), /previous roster/);
  assert.throws(() => prep.lockTeam(s, "a", ["a1"], ""), /keep or fire/);
  assert.throws(() => prep.finalize(s), /Every team/);
  assert.throws(() => prep.hire(s, "a", "c3"), /Finalize/);
  prep.lockTeam(s, "a", ["a1"], "keep");
  assert.throws(() => prep.lockTeam(s, "a", ["a2"], "fire"), /Unlock/);
  prep.unlockTeam(s, "a");
  prep.lockTeam(s, "a", ["a2"], "keep");
  prep.lockTeam(s, "b", ["b1"], "fire");
  assert.equal(prep.state().phase, "finalize_keepers");
  assert.equal(
    prep.state().availableCoaches.some((c) => c.id === "c2"),
    false,
  );
  const ready = prep.finalize(s);
  assert.equal(ready.phase, "coach_hiring");
  assert.deepEqual(ready.coachOrder, ["b"]);
  assert.equal(
    ready.availableCoaches.some((c) => c.id === "c2"),
    true,
  );
  assert.deepEqual(
    repo.all(
      "SELECT player_id,team_id FROM player_team_assignments WHERE season_id=? ORDER BY player_id",
      s,
    ),
    [
      { player_id: "a1", team_id: null },
      { player_id: "a2", team_id: "a" },
      { player_id: "b1", team_id: "b" },
      { player_id: "b2", team_id: null },
    ],
  );
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM player_team_assignments WHERE season_id='old' AND team_id IS NOT NULL",
    )!.n,
    4,
  );
  assert.equal(
    repo.one(
      "SELECT status FROM coach_team_assignments WHERE season_id='old' AND coach_id='c2'",
    )!.status,
    "active",
  );
  assert.throws(() => prep.unlockTeam(s, "b"), /finalized/);
  assert.deepEqual(prep.finalize(s).coachOrder, ["b"]);
  assert.throws(() => prep.hire(s, "b", "c1"), /not available/);
  const final = prep.hire(s, "b", "c2"); // A fired coach may be rehired, including by the same team.
  assert.equal(final.phase, "draft_ready");
  assert.equal(final.draftReady, true);
  assert.equal(prep.hire(s, "b", "c2").draftReady, true);
});
test("first season skips keepers but hires coaches in a stable random order", (t) => {
  const { repo, prep } = fixture(t, true);
  const state = prep.state();
  assert.equal(state.phase, "coach_hiring");
  assert.equal(state.keeperCount, 1);
  assert.deepEqual([...state.coachOrder].sort(), ["a", "b"]);
  assert.deepEqual(prep.state().coachOrder, state.coachOrder);
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM player_team_assignments WHERE team_id IS NOT NULL",
    )!.n,
    0,
  );
  const first = state.nextTeamId!,
    second = state.coachOrder[1];
  assert.throws(() => prep.hire("old", second, "c1"), /not this team/);
  prep.hire("old", first, "c1");
  assert.throws(() => prep.hire("old", second, "c1"), /not available/);
  assert.equal(prep.hire("old", second, "c2").draftReady, true);
  assert.throws(() => prep.advance("old", 1), /Championship/);
});
test("keeper limit is league-owned and cannot exceed a previous roster", (t) => {
  const { repo, prep } = fixture(t);
  assert.throws(() => prep.advance("old", 3), /cannot keep 3/);
  assert.throws(() => prep.advance("old", -1), /number of keepers/);
  assert.throws(() => prep.advance("old", 1.5), /number of keepers/);
  assert.equal(repo.one("SELECT count(*) AS n FROM seasons")!.n, 1);
  repo.db.prepare("UPDATE leagues SET keeper_count=NULL").run();
  assert.throws(() => prep.advance("old", undefined), /number of keepers/);
  const state = prep.advance("old", 0);
  assert.equal(state.keeperCount, 0);
  assert.equal(state.leagueKeeperCount, 0);
  prep.lockTeam(state.seasonId, "a", [], "keep");
  prep.lockTeam(state.seasonId, "b", [], "keep");
  assert.equal(prep.finalize(state.seasonId).draftReady, true);
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM player_team_assignments WHERE season_id=? AND team_id IS NOT NULL",
      state.seasonId,
    )!.n,
    0,
  );
});

test("upgrading older new leagues backfills independent coach pools without changing source coaches", (t) => {
  const db = openDatabase({ filename: ":memory:" });
  t.after(() => db.close());
  migrateDatabase(db, loadMigrations().slice(0, 4));
  const repo = new LeagueRepository(db, "source");
  for (const id of ["source", "target"]) {
    repo.insert("leagues", {
      id,
      name: id,
      save_slot: id === "source" ? 1 : 2,
    });
    repo.insert("seasons", {
      id: `season-${id}`,
      league_id: id,
      season_number: 1,
      display_name: "Season 1",
      status: "setup",
    });
  }
  repo.insert("app_preferences", {
    key: "league_template_source_id",
    value_json: JSON.stringify("source"),
  });
  repo.insert("coaches", {
    id: "original-coach",
    league_id: "source",
    display_name: "Coach",
  });
  repo.insert("coach_season_ratings", {
    id: "original-rating",
    season_id: "season-source",
    coach_id: "original-coach",
    version: 1,
    attributes_json: "{}",
    passing: 84,
  });
  migrateDatabase(db);
  const target = repo.one("SELECT * FROM coaches WHERE league_id='target'")!;
  assert.ok(target);
  assert.notEqual(target.id, "original-coach");
  assert.equal(target.display_name, "Coach");
  assert.equal(
    repo.one(
      "SELECT passing FROM coach_season_ratings WHERE season_id='season-target' AND coach_id=?",
      target.id,
    )!.passing,
    84,
  );
  assert.equal(
    repo.one("SELECT count(*) AS n FROM coaches WHERE league_id='source'")!.n,
    1,
  );
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
