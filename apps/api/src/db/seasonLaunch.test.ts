import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "./connection.js";
import { migrateDatabase } from "./migrations.js";
import { LeagueRepository } from "./leagueRepository.js";
import { SeasonLaunch } from "./seasonLaunch.js";
import { seasonSchedule } from "./seasonSchedule.js";
function fixture(t: { after: (fn: () => void) => void }) {
  const db = openDatabase({ filename: ":memory:" });
  t.after(() => db.close());
  migrateDatabase(db);
  const repo = new LeagueRepository(db, "l");
  repo.insert("leagues", { id: "l", name: "League" });
  repo.insert("seasons", {
    id: "s",
    league_id: "l",
    season_number: 1,
    display_name: "Season 1",
    status: "setup",
  });
  for (const id of ["east", "west"])
    repo.insert("divisions", { id, league_id: "l", name: id });
  repo.insert("drafts", {
    id: "draft",
    season_id: "s",
    status: "completed",
    roster_target: 2,
  });
  for (let i = 0; i < 10; i++) {
    const team = `t${i}`,
      division = i < 5 ? "east" : "west";
    repo.insert("teams", { id: team, league_id: "l" });
    repo.insert("team_seasons", {
      id: `ts${i}`,
      season_id: "s",
      team_id: team,
      division_id: division,
      abbreviation: `T${i}`,
      nickname: `Team ${i}`,
    });
    repo.insert("coaches", {
      id: `c${i}`,
      league_id: "l",
      display_name: `Coach ${i}`,
    });
    repo.insert("coach_team_assignments", {
      id: `ca${i}`,
      season_id: "s",
      team_id: team,
      coach_id: `c${i}`,
      role: "Head Coach",
      effective_from: "2025-01-01",
    });
    repo.insert("season_team_decisions", {
      season_id: "s",
      team_id: team,
      coach_action: "hire",
    });
    for (let n = 0; n < 2; n++) {
      const id = `p${i}-${n}`;
      repo.insert("players", { id, league_id: "l", display_name: id });
      repo.insert("player_team_assignments", {
        id: `a${id}`,
        season_id: "s",
        player_id: id,
        team_id: null,
        status: "active",
        effective_from: "2025-01-01",
      });
      if (n === 0) {
        repo.insert("season_roster_candidates", {
          season_id: "s",
          player_id: id,
          previous_team_id: team,
        });
        repo.insert("season_keeper_selections", {
          season_id: "s",
          team_id: team,
          player_id: id,
        });
      } else
        repo.insert("draft_picks", {
          id: `pick${i}`,
          draft_id: "draft",
          round: 1,
          pick_in_round: i + 1,
          overall_pick: i + 1,
          original_team_id: team,
          selecting_team_id: team,
          player_id: id,
        });
    }
  }
  repo.insert("players", {
    id: "free",
    league_id: "l",
    display_name: "Free agent",
  });
  repo.insert("player_team_assignments", {
    id: "afree",
    season_id: "s",
    player_id: "free",
    team_id: "t0",
    status: "active",
    effective_from: "2025-01-01",
  });
  return { db, repo, launch: new SeasonLaunch(repo) };
}
test("launch finalizes draft/keepers and coaches, installs exact randomized schedule, and stubs seven unpublished articles", (t) => {
  const { repo, launch, db } = fixture(t);
  launch.run("s", "rosters");
  for (let i = 0; i < 10; i++)
    for (let n = 0; n < 2; n++)
      assert.equal(
        repo.one(
          "SELECT team_id FROM player_team_assignments WHERE player_id=?",
          `p${i}-${n}`,
        )!.team_id,
        `t${i}`,
      );
  assert.equal(
    repo.one(
      "SELECT team_id FROM player_team_assignments WHERE player_id='free'",
    )!.team_id,
    null,
  );
  launch.run("s", "schedule");
  const aliases = repo.all(
    "SELECT * FROM season_schedule_teams WHERE season_id=? ORDER BY schedule_alias",
    "s",
  );
  assert.equal(aliases.length, 10);
  assert.equal(new Set(aliases.map((t) => t.schedule_alias)).size, 10);
  for (const div of ["east", "west"]) {
    const group = aliases.filter(
      (t) =>
        Number(t.team_id.slice(1)) < (div === "east" ? 5 : 10) &&
        Number(t.team_id.slice(1)) >= (div === "east" ? 0 : 5),
    );
    assert.equal(new Set(group.map((t) => t.division_slot)).size, 1);
    assert.deepEqual(group.map((t) => t.team_index).sort(), [1, 2, 3, 4, 5]);
  }
  const games = repo.all(
    "SELECT g.*,h.schedule_alias AS home_alias,a.schedule_alias AS away_alias FROM games g JOIN season_schedule_teams h ON h.season_id=g.season_id AND h.team_id=g.home_team_id JOIN season_schedule_teams a ON a.season_id=g.season_id AND a.team_id=g.away_team_id ORDER BY legacy_game_number",
  );
  assert.equal(games.length, 65);
  assert.deepEqual(
    games.map((g) => [g.regular_week, g.home_alias, g.away_alias]),
    seasonSchedule,
  );
  for (let week = 1; week <= 13; week++) {
    const rows = games.filter((g) => g.regular_week === week);
    assert.equal(rows.length, 5);
    assert.equal(
      new Set(rows.flatMap((g) => [g.home_team_id, g.away_team_id])).size,
      10,
    );
  }
  for (const team of aliases) {
    const rows = games.filter((g) =>
      [g.home_team_id, g.away_team_id].includes(team.team_id),
    );
    assert.equal(rows.length, 13);
    const opponents = rows.map((game) =>
      game.home_team_id === team.team_id
        ? game.away_team_id
        : game.home_team_id,
    );
    assert.equal(new Set(opponents).size, 9);
    for (const opponent of new Set(opponents)) {
      const other = aliases.find((a) => a.team_id === opponent)!;
      assert.equal(
        opponents.filter((id) => id === opponent).length,
        other.division_slot === team.division_slot ? 2 : 1,
      );
    }
  }
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM game_state WHERE phase='awaiting_toss' AND seconds_remaining=900 AND home_score=0 AND away_score=0",
    )!.n,
    65,
  );
  const before = JSON.stringify(games),
    mapping = JSON.stringify(aliases);
  launch.run("s", "schedule");
  assert.equal(repo.one("SELECT count(*) AS n FROM games")!.n, 65);
  assert.equal(
    JSON.stringify(
      repo.all(
        "SELECT * FROM season_schedule_teams WHERE season_id=? ORDER BY schedule_alias",
        "s",
      ),
    ),
    mapping,
  );
  launch.run("s", "headlines");
  assert.equal(repo.season().status, "regular");
  assert.equal(repo.season().current_week, 1);
  const articles = repo.all("SELECT * FROM articles");
  assert.equal(articles.length, 7);
  assert.ok(
    articles.every(
      (a) =>
        a.status === "draft" && a.published_at === null && a.markdown === "",
    ),
  );
  assert.ok(
    articles.some(
      (a) =>
        a.title ===
        "A way too early prediction for all 10 teams in the AFL this season",
    ),
  );
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM coach_team_assignments WHERE status='active'",
    )!.n,
    10,
  );
  const audits = repo.one("SELECT count(*) AS n FROM audit_log")!.n;
  for (const stage of ["rosters", "schedule", "headlines"])
    launch.run("s", stage);
  assert.equal(repo.one("SELECT count(*) AS n FROM articles")!.n, 7);
  assert.equal(repo.one("SELECT count(*) AS n FROM games")!.n, 65);
  assert.equal(repo.one("SELECT count(*) AS n FROM audit_log")!.n, audits);
  assert.ok(before.length);
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
test("out-of-order stages, missing coaches, stale seasons and unfinished drafts are rejected without partial writes", (t) => {
  const { repo, launch, db } = fixture(t);
  assert.throws(() => launch.run("other", "rosters"), /active season changed/);
  assert.throws(() => launch.run("s", "wrong"), /Unknown/);
  assert.throws(() => launch.run("s", "schedule"), /Finalize rosters/);
  assert.throws(() => launch.run("s", "headlines"), /Set the schedule/);
  db.prepare("UPDATE drafts SET status='running'").run();
  assert.throws(() => launch.run("s", "rosters"), /Complete the player draft/);
  db.prepare("UPDATE drafts SET status='completed'").run();
  db.prepare(
    "UPDATE coach_team_assignments SET status='released' WHERE team_id='t0'",
  ).run();
  assert.throws(() => launch.run("s", "rosters"), /exactly one assigned coach/);
  assert.equal(repo.one("SELECT count(*) AS n FROM season_launch")!.n, 0);
  assert.equal(
    repo.one(
      "SELECT team_id FROM player_team_assignments WHERE player_id='p0-0'",
    )!.team_id,
    null,
  );
});
test("a failed schedule rolls back aliases and games; retries never replace existing games", (t) => {
  const { db, repo, launch } = fixture(t);
  launch.run("s", "rosters");
  db.exec(
    "CREATE TRIGGER reject_game BEFORE INSERT ON games WHEN NEW.legacy_game_number=3 BEGIN SELECT RAISE(ABORT,'test failure'); END;",
  );
  assert.throws(() => launch.run("s", "schedule"), /test failure/);
  assert.equal(repo.one("SELECT count(*) AS n FROM games")!.n, 0);
  assert.equal(
    repo.one("SELECT count(*) AS n FROM season_schedule_teams")!.n,
    0,
  );
  assert.equal(
    repo.one("SELECT schedule_set_at FROM season_launch")!.schedule_set_at,
    null,
  );
  db.exec("DROP TRIGGER reject_game");
  repo.insert("games", {
    id: "existing",
    season_id: "s",
    stage: "regular",
    regular_week: 1,
    home_team_id: "t0",
    away_team_id: "t5",
    status: "scheduled",
  });
  assert.throws(() => launch.run("s", "schedule"), /already has games/);
  assert.equal(repo.one("SELECT count(*) AS n FROM games")!.n, 1);
});
test("schedule template requires exactly two five-team divisions", (t) => {
  const { db, repo, launch } = fixture(t);
  launch.run("s", "rosters");
  db.prepare(
    "UPDATE team_seasons SET division_id='west' WHERE team_id='t0'",
  ).run();
  assert.throws(
    () => launch.run("s", "schedule"),
    /two divisions with five teams/,
  );
  assert.equal(
    repo.one("SELECT count(*) AS n FROM season_schedule_teams")!.n,
    0,
  );
  assert.equal(repo.one("SELECT count(*) AS n FROM games")!.n, 0);
});

test("headline failures preserve the schedule and resume without partial or published articles", (t) => {
  const { db, repo, launch } = fixture(t);
  launch.run("s", "rosters");
  launch.run("s", "schedule");
  const games = repo.all("SELECT * FROM games ORDER BY id");
  db.exec(
    "CREATE TRIGGER reject_headline BEFORE INSERT ON articles WHEN NEW.article_type='coaching-carousel' BEGIN SELECT RAISE(ABORT,'headline stub failure'); END;",
  );
  assert.throws(() => launch.run("s", "headlines"), /headline stub failure/);
  assert.equal(repo.one("SELECT count(*) AS n FROM articles")!.n, 0);
  assert.equal(
    repo.one("SELECT count(*) AS n FROM season_headline_stubs")!.n,
    0,
  );
  assert.equal(repo.season().status, "setup");
  assert.equal(
    repo.one("SELECT completed_at FROM season_launch")!.completed_at,
    null,
  );
  db.exec("DROP TRIGGER reject_headline");
  launch.run("s", "headlines");
  assert.deepEqual(repo.all("SELECT * FROM games ORDER BY id"), games);
  assert.equal(repo.one("SELECT count(*) AS n FROM articles")!.n, 7);
  assert.equal(repo.season().status, "regular");
});
