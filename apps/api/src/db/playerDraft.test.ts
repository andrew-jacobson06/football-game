import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "./connection.js";
import { migrateDatabase } from "./migrations.js";
import { LeagueRepository } from "./leagueRepository.js";
import { PlayerDraft } from "./playerDraft.js";
import { initializeDraft, snakeSlots } from "./draftOrder.js";
function fixture(t: { after: (f: () => void) => void }) {
  const db = openDatabase({ filename: ":memory:" });
  t.after(() => db.close());
  migrateDatabase(db);
  const repo = new LeagueRepository(db, "l");
  repo.insert("leagues", { id: "l", name: "Draft league", keeper_count: 0 });
  repo.insert("divisions", { id: "d", league_id: "l", name: "East" });
  repo.insert("seasons", {
    id: "s",
    league_id: "l",
    season_number: 1,
    display_name: "Season 1",
    status: "setup",
  });
  for (const team of ["a", "b", "c"]) {
    repo.insert("teams", { id: team, league_id: "l" });
    repo.insert("team_seasons", {
      id: `ts${team}`,
      season_id: "s",
      team_id: team,
      division_id: "d",
      abbreviation: team.toUpperCase(),
      nickname: `Team ${team}`,
      away_jersey_url: `https://example.com/${team}-away.png`,
    });
    repo.insert("coaches", {
      id: `c${team}`,
      league_id: "l",
      display_name: `Coach ${team}`,
    });
    repo.insert("coach_team_assignments", {
      id: `ca${team}`,
      season_id: "s",
      team_id: team,
      coach_id: `c${team}`,
      role: "Head Coach",
      effective_from: "2025-01-01",
    });
  }
  for (let i = 0; i < 12; i++) {
    const id = `p${i}`;
    repo.insert("players", { id, league_id: "l", display_name: `Player ${i}` });
    repo.insert("player_season_ratings", {
      id: `r${i}`,
      season_id: "s",
      player_id: id,
      version: 1,
      offense_position: i % 2 ? "WR" : "RB",
      defense_position: "DB",
      speed: 60 + i,
    });
    repo.insert("player_team_assignments", {
      id: `a${i}`,
      season_id: "s",
      player_id: id,
      team_id: null,
      effective_from: "2025-01-01",
      status: "active",
    });
  }
  initializeDraft(repo, "s");
  return { db, repo, draft: new PlayerDraft(repo) };
}
test("snake order is locked once, reverses every round, and ends at the roster target", (t) => {
  const { repo, draft } = fixture(t),
    initial = draft.state();
  const order = initial.teams.map((t) => t.id);
  assert.ok(
    initial.teams.every(
      (team) =>
        team.awayJerseyUrl === `https://example.com/${team.id}-away.png`,
    ),
  );
  assert.deepEqual(
    draft.state().teams.map((t) => t.id),
    order,
  );
  assert.deepEqual(
    JSON.parse(initializeDraft(repo, "s").order_rules_json).teamOrder,
    order,
  );
  const started = draft.start("s", 3);
  assert.equal(started.rounds, 3);
  assert.equal(started.picks.length, 9);
  assert.deepEqual(
    started.picks.map((p) => p.teamId),
    [...order, ...[...order].reverse(), ...order],
  );
  assert.equal(draft.start("s", 3).picks.length, 9);
  assert.throws(() => draft.start("s", 2), /different roster target/);
  let state = started;
  for (let i = 0; i < 9; i++) {
    const pick = state.currentPick!;
    const player = state.players.find((p) => !p.teamId)!;
    state = draft.pick("s", pick.id, player.id);
    assert.equal(
      state.players.find((p) => p.id === player.id)!.teamId,
      pick.teamId,
    );
    assert.equal(
      draft.pick("s", pick.id, player.id).picks.filter((p) => p.playerId)
        .length,
      i + 1,
    );
  }
  assert.equal(state.status, "completed");
  assert.equal(state.currentPick, null);
  for (const team of order)
    assert.equal(state.players.filter((p) => p.teamId === team).length, 3);
  assert.equal(state.players.filter((p) => !p.teamId).length, 3);
  assert.deepEqual(repo.db.pragma("foreign_key_check"), []);
});
test("draft prerequisites, pool size, current pick and player ownership are enforced", (t) => {
  const { db, repo, draft } = fixture(t);
  db.prepare(
    "UPDATE coach_team_assignments SET status='released' WHERE team_id='a'",
  ).run();
  assert.throws(() => draft.start("s", 3), /Complete keepers and coach/);
  db.prepare(
    "UPDATE coach_team_assignments SET status='active' WHERE team_id='a'",
  ).run();
  for (const n of [0, 1.5, 101])
    assert.throws(() => draft.start("s", n), /whole-number/);
  assert.throws(() => draft.start("s", 5), /not enough/);
  const state = draft.start("s", 2),
    pick = state.currentPick!;
  assert.throws(
    () => draft.pick("s", state.picks[1].id, "p0"),
    /not this pick/,
  );
  assert.throws(
    () => draft.pick("other", pick.id, "p0"),
    /active season changed/,
  );
  assert.throws(() => draft.pick("s", pick.id, "unknown"), /not available/);
  const next = draft.pick("s", pick.id, "p0");
  assert.throws(() => draft.pick("s", pick.id, "p1"), /already been made/);
  assert.throws(
    () => draft.pick("s", next.currentPick!.id, "p0"),
    /already assigned/,
  );
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM draft_picks WHERE player_id IS NOT NULL",
    )!.n,
    1,
  );
});
test("a failed pick save rolls back player ownership and draft advancement together", (t) => {
  const { db, repo, draft } = fixture(t),
    state = draft.start("s", 2),
    pick = state.currentPick!;
  db.exec(
    "CREATE TRIGGER reject_pick_audit BEFORE INSERT ON audit_log WHEN NEW.action='player_drafted' BEGIN SELECT RAISE(ABORT,'test rollback'); END;",
  );
  assert.throws(() => draft.pick("s", pick.id, "p0"), /test rollback/);
  assert.equal(
    repo.one(
      "SELECT team_id FROM player_team_assignments WHERE player_id='p0'",
    )!.team_id,
    null,
  );
  assert.equal(draft.state().currentPick!.id, pick.id);
  assert.equal(
    repo.one("SELECT player_id FROM draft_picks WHERE id=?", pick.id)!
      .player_id,
    null,
  );
});
test("later seasons reverse playoff finish, using regular-season rank for equal finishes", (t) => {
  const db = openDatabase({ filename: ":memory:" });
  t.after(() => db.close());
  migrateDatabase(db);
  const repo = new LeagueRepository(db, "l");
  repo.insert("leagues", { id: "l", name: "League" });
  repo.insert("divisions", { id: "d", league_id: "l", name: "East" });
  repo.insert("seasons", {
    id: "old",
    league_id: "l",
    season_number: 1,
    display_name: "Season 1",
    status: "finalized",
  });
  repo.insert("seasons", {
    id: "new",
    league_id: "l",
    season_number: 2,
    display_name: "Season 2",
    status: "setup",
    previous_season_id: "old",
  });
  for (let i = 0; i < 10; i++) {
    repo.insert("teams", { id: `t${i}`, league_id: "l" });
    for (const season of ["old", "new"])
      repo.insert("team_seasons", {
        id: `${season}t${i}`,
        season_id: season,
        team_id: `t${i}`,
        division_id: "d",
        abbreviation: `T${i}`,
        nickname: `Team ${i}`,
      });
  }
  let index = 0;
  function game(
    home: number,
    away: number,
    hs: number,
    as: number,
    round?: string,
  ) {
    const id = `g${index++}`;
    repo.insert("games", {
      id,
      season_id: "old",
      legacy_game_number: index,
      stage: round ? "playoffs" : "regular",
      regular_week: round ? null : 1,
      playoff_round: round ?? null,
      home_team_id: `t${home}`,
      away_team_id: `t${away}`,
      status: "final",
    });
    repo.insert("game_state", {
      game_id: id,
      phase: "final",
      home_score: hs,
      away_score: as,
    });
  }
  for (let i = 0; i < 10; i++)
    for (let j = i + 1; j < 10; j++) game(i, j, 10 + i, 10 + j);
  game(4, 5, 10, 20, "Divisionals");
  game(6, 7, 10, 20, "Divisionals");
  game(5, 8, 10, 20, "Divisional Championships");
  game(7, 9, 10, 20, "Divisional Championships");
  game(8, 9, 21, 14, "National Championship");
  // 0-3 miss playoffs; 4/6 lose divisionals; 5/7 lose championships; 9 runner-up; 8 champion.
  const order = JSON.parse(
    initializeDraft(repo, "new").order_rules_json,
  ).teamOrder;
  assert.deepEqual(order, [
    "t0",
    "t1",
    "t2",
    "t3",
    "t4",
    "t6",
    "t5",
    "t7",
    "t9",
    "t8",
  ]);
  assert.deepEqual(
    snakeSlots(order, 2)
      .slice(10)
      .map((p) => p.teamId),
    [...order].reverse(),
  );
});

test("keepers reduce draft rounds and picks never alter the previous season roster", (t) => {
  const { repo } = fixture(t);
  for (const [i, team] of ["a", "b", "c"].entries())
    repo.db
      .prepare(
        "UPDATE player_team_assignments SET team_id=? WHERE season_id=? AND player_id=?",
      )
      .run(team, "s", `p${i}`);
  const before = repo.all(
    "SELECT * FROM player_team_assignments WHERE season_id='s' ORDER BY id",
  );
  repo.db.prepare("UPDATE seasons SET status='finalized' WHERE id='s'").run();
  repo.insert("seasons", {
    id: "s2",
    league_id: "l",
    season_number: 2,
    display_name: "Season 2",
    status: "setup",
    previous_season_id: "s",
  });
  for (const row of repo.all("SELECT * FROM team_seasons WHERE season_id='s'"))
    repo.insert("team_seasons", {
      ...row,
      id: `new-${row.id}`,
      season_id: "s2",
    });
  for (const row of before)
    repo.insert("player_team_assignments", {
      ...row,
      id: `new-${row.id}`,
      season_id: "s2",
    });
  for (const row of repo.all(
    "SELECT * FROM player_season_ratings WHERE season_id='s'",
  ))
    repo.insert("player_season_ratings", {
      ...row,
      id: `new-${row.id}`,
      season_id: "s2",
    });
  for (const row of repo.all(
    "SELECT * FROM coach_team_assignments WHERE season_id='s'",
  ))
    repo.insert("coach_team_assignments", {
      ...row,
      id: `new-${row.id}`,
      season_id: "s2",
    });
  repo.insert("season_preparation", {
    season_id: "s2",
    keeper_count: 1,
    keepers_finalized: 1,
    coach_order_json: "[]",
  });
  const draft = new PlayerDraft(repo),
    state = draft.start("s2", 2);
  assert.equal(state.rounds, 1);
  assert.equal(state.picks.length, 3);
  assert.throws(
    () => draft.pick("s2", state.currentPick!.id, "p0"),
    /already assigned/,
  );
  draft.pick("s2", state.currentPick!.id, "p3");
  assert.deepEqual(
    repo.all(
      "SELECT * FROM player_team_assignments WHERE season_id='s' ORDER BY id",
    ),
    before,
  );
  assert.equal(
    repo.one(
      "SELECT team_id FROM player_team_assignments WHERE season_id='s2' AND player_id='p3'",
    )!.team_id,
    state.currentPick!.teamId,
  );
});
