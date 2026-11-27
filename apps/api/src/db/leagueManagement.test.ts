import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openDatabase } from "./connection.js";
import { loadMigrations, migrateDatabase } from "./migrations.js";
import { LeagueManagement } from "./leagueManagement.js";
import { LeagueRepository } from "./leagueRepository.js";
import { closeRuntimeDatabase } from "./runtime.js";
import { createApp } from "../app.js";
const original = "36c6e53f-7be2-5a94-84a8-0df871aae9fd";
function fixture(t: { after: (fn: () => void) => void }) {
  const directory = mkdtempSync(path.join(tmpdir(), "football-leagues-")),
    filename = path.join(directory, "league.sqlite"),
    db = openDatabase({ filename });
  t.after(() => {
    closeRuntimeDatabase();
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  migrateDatabase(db, loadMigrations().slice(0, 1));
  db.prepare("INSERT INTO leagues(id,name) VALUES(?,'AFL')").run(original);
  db.exec(
    readFileSync(
      new URL(
        "../../../../docs/imports/import-107-players.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const folder of ["core", "season"])
    for (const file of folder === "core"
      ? [
          "01-divisions.sql",
          "02-teams.sql",
          "03-settings-versions.sql",
          "04-configuration-tables.sql",
        ]
      : [
          "05-seasons.sql",
          "06-team-seasons.sql",
          "07-player-season-ratings.sql",
          "08-player-team-assignments.sql",
          "09-games.sql",
        ])
      db.exec(
        readFileSync(
          new URL(
            `../../../../docs/imports/${folder}/${file}`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
  migrateDatabase(db, loadMigrations().slice(0, 2));
  db.exec(
    readFileSync(
      new URL(
        "../../../../docs/imports/remaining/19-normalized-route-settings.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  db.prepare("UPDATE leagues SET name='Original League' WHERE id=?").run(
    original,
  );
  migrateDatabase(db);
  for (let i = 1; i <= 20; i++) {
    db.prepare(
      "INSERT INTO coaches(id,league_id,display_name) VALUES(?,?,?)",
    ).run(`coach${i}`, original, `Coach ${i}`);
    db.prepare(
      "INSERT INTO coach_season_ratings(id,season_id,coach_id,version,attributes_json,passing) VALUES(?,(SELECT id FROM seasons WHERE league_id=? ORDER BY season_number DESC LIMIT 1),?,1,'{}',75)",
    ).run(`coachRating${i}`, original, `coach${i}`);
  }
  return { db, filename, manager: new LeagueManagement(db) };
}
function details(manager: LeagueManagement, name = "New League") {
  const catalog = manager.catalog();
  return {
    name,
    keeperCount: 2,
    requestId: randomUUID(),
    divisions: catalog.divisions,
    teams: catalog.teams.map((t) => ({
      catalogId: t.id,
      division: t.defaultDivision,
    })),
  };
}
test("migration preserves original league, seeds slots/catalog and original team default divisions", (t) => {
  const { db, manager } = fixture(t);
  const slots = manager.leagues();
  assert.equal(slots.length, 1);
  assert.equal(slots[0].slot, 1);
  assert.equal(slots[0].name, "Original League");
  assert.equal(slots[0].teamCount, 10);
  const catalog = manager.catalog();
  assert.equal(catalog.teams.length, 10);
  assert.deepEqual(new Set(catalog.divisions), new Set(["East", "West"]));
  assert.equal(
    (
      db
        .prepare(
          "SELECT count(*) AS n FROM teams WHERE default_division IS NOT NULL",
        )
        .get() as any
    ).n,
    10,
  );
  assert.equal(
    (db.prepare("SELECT count(*) AS n FROM games").get() as any).n,
    70,
  );
});
test("creation is atomic: chosen divisions, extra team, isolated settings and an unassigned draft pool in Season 1", (t) => {
  const { db, manager } = fixture(t);
  const before = manager.repo.all("SELECT * FROM games ORDER BY id");
  const assignments = manager.repo.all(
    "SELECT * FROM player_team_assignments ORDER BY id",
  );
  const input = details(manager);
  input.teams[0].division = input.divisions.find(
    (d) => d !== input.teams[0].division,
  )!;
  const league = manager.create({
    ...input,
    teams: [
      ...input.teams,
      {
        division: "East",
        custom: {
          nickname: "Beacons",
          abbreviation: "BOS",
          location: "Boston",
          primaryColor: "#123456",
        },
      },
    ],
  });
  assert.equal(league.slot, 2);
  assert.equal(league.seasonNumber, 1);
  assert.equal(league.status, "setup");
  assert.equal(league.teamCount, 11);
  assert.equal(league.keeperCount, 2);
  const repo = new LeagueRepository(db, league.id),
    source = new LeagueRepository(db, original);
  assert.equal(repo.games().length, 0);
  const pool = repo.all("SELECT * FROM coaches WHERE league_id=?", league.id);
  assert.equal(pool.length, 20);
  assert.ok(pool.every((c) => !String(c.id).startsWith("coach")));
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM coach_season_ratings WHERE season_id=?",
      league.seasonId,
    )!.n,
    20,
  );
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM coach_team_assignments WHERE season_id=?",
      league.seasonId,
    )!.n,
    0,
  );
  assert.equal(
    repo.one(
      "SELECT keepers_finalized FROM season_preparation WHERE season_id=?",
      league.seasonId,
    )!.keepers_finalized,
    1,
  );
  assert.equal(repo.playerStats().length, 0);
  assert.equal(repo.players().length, 107);
  assert.ok(repo.players().every((p) => p.Team === ""));
  assert.equal(
    repo.all("SELECT * FROM drafts WHERE season_id=?", repo.season().id).length,
    1,
  );
  assert.notEqual(repo.settingsVersion(), source.settingsVersion());
  assert.deepEqual(repo.frontendSettings(), source.frontendSettings());
  const team = repo
    .teams()
    .find(
      (t) =>
        t.Abbrev ===
        manager.catalog().teams.find((t) => t.id === input.teams[0].catalogId)!
          .abbreviation,
    )!;
  assert.equal(team.Division, input.teams[0].division);
  assert.notEqual(
    repo.one("SELECT default_division FROM teams WHERE id=?", team.id)!
      .default_division,
    team.Division,
  );
  assert.deepEqual(before, manager.repo.all("SELECT * FROM games ORDER BY id"));
  assert.deepEqual(
    assignments,
    manager.repo.all(
      "SELECT * FROM player_team_assignments WHERE season_id=? ORDER BY id",
      source.season().id,
    ),
  );
  repo.db
    .prepare(
      "UPDATE configuration_tables SET values_json=json_set(values_json,'$.data[0].multiplier',.99) WHERE settings_version_id=? AND table_key='pick_accuracy_multipliers'",
    )
    .run(repo.settingsVersion());
  assert.notEqual(
    repo.frontendSettings().pickAccuracyMultipliers[0].multiplier,
    source.frontendSettings().pickAccuracyMultipliers[0].multiplier,
  );
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
test("creation retries are idempotent, three slots are enforced, and failed requests leave no rows", (t) => {
  const { manager, db } = fixture(t);
  const input = details(manager);
  const first = manager.create(input);
  assert.equal(manager.create(input).id, first.id);
  assert.throws(
    () => manager.create({ ...input, name: "Changed" }),
    /already used/,
  );
  const baseline = manager.repo.all("SELECT * FROM leagues ORDER BY id");
  assert.throws(
    () =>
      manager.create({
        ...details(manager, "Bad league"),
        teams: [
          {
            division: "East",
            custom: { nickname: "Transient", abbreviation: "TMP" },
          },
          { division: "East", catalogId: "missing" },
        ],
      }),
    /not found/,
  );
  assert.equal(
    manager.repo.one("SELECT id FROM team_catalog WHERE abbreviation='TMP'"),
    undefined,
  );
  assert.deepEqual(
    manager.repo.all("SELECT * FROM leagues ORDER BY id"),
    baseline,
  );
  manager.create(details(manager, "Third League"));
  assert.equal(manager.leagues().length, 3);
  assert.throws(
    () => manager.create(details(manager, "Fourth League")),
    /three league slots/,
  );
  assert.equal(
    (db.prepare("SELECT count(*) AS n FROM leagues").get() as any).n,
    3,
  );
  assert.equal(new LeagueRepository(db).season().league_id, original);
});
test("rejects invalid names, divisions, duplicate teams and unsafe custom team metadata", (t) => {
  const { manager } = fixture(t);
  const base = details(manager);
  assert.throws(() => manager.create({ ...base, name: " " }), /league name/);
  for (const keeperCount of [-1, 1.5, 101])
    assert.throws(
      () => manager.create({ ...base, keeperCount }),
      /keeper count/,
    );
  assert.throws(
    () => manager.create({ ...base, divisions: ["East", "east"] }),
    /distinct/,
  );
  assert.throws(
    () => manager.create({ ...base, teams: [base.teams[0], base.teams[0]] }),
    /only be included once/,
  );
  assert.throws(
    () =>
      manager.create({
        ...base,
        teams: [
          base.teams[0],
          { division: "Unknown", catalogId: base.teams[1].catalogId },
        ],
      }),
    /selected divisions/,
  );
  assert.throws(
    () =>
      manager.create({
        ...base,
        teams: [
          base.teams[0],
          {
            division: "East",
            custom: {
              nickname: "Unsafe",
              abbreviation: "BAD",
              logoUrl: "javascript:alert(1)",
            },
          },
        ],
      }),
    /HTTP/,
  );
  assert.equal(manager.leagues().length, 1);
});
test("concurrent HTTP requests select independent leagues, including when env pins the original season", async (t) => {
  const { manager, filename } = fixture(t);
  const second = manager.create(details(manager));
  const before = process.env.DATABASE_PATH,
    season = process.env.SEASON_ID;
  process.env.DATABASE_PATH = filename;
  process.env.SEASON_ID = manager.source().season().id;
  t.after(() => {
    if (before === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = before;
    if (season === undefined) delete process.env.SEASON_ID;
    else process.env.SEASON_ID = season;
  });
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  const read = async (leagueId: string, endpoint: string) => {
    const response = await fetch(`${base}/${endpoint}`, {
      headers: { "X-League-Id": leagueId },
    });
    assert.equal(response.status, 200);
    return response.json();
  };
  const [oldGames, newGames, oldPlayers, newPlayers, slots] = await Promise.all(
    [
      read(original, "games"),
      read(second.id, "games"),
      read(original, "players"),
      read(second.id, "players"),
      read(second.id, "leagues"),
    ],
  );
  assert.equal(oldGames.games.length, 70);
  assert.equal(newGames.games.length, 0);
  assert.equal(slots.leagues.length, 2);
  assert.equal(newPlayers.players.length, 107);
  assert.ok(newPlayers.players.every((p: any) => p.Team === ""));
  assert.ok(oldPlayers.players.some((p: any) => p.Team));
  assert.ok(
    !newPlayers.players.some((p: any) =>
      oldPlayers.players.some((old: any) => old.id === p.id),
    ),
  );
  const preparation = await read(second.id, "season/preparation");
  assert.equal(preparation.phase, "coach_hiring");
  assert.equal(preparation.coachOrder.length, 10);
  const hireBody = {
    seasonId: second.seasonId,
    teamId: preparation.nextTeamId,
    coachId: preparation.availableCoaches[0].id,
  };
  const hire = await fetch(`${base}/season/coaches/hire`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-League-Id": second.id },
    body: JSON.stringify(hireBody),
  });
  assert.equal(hire.status, 200);
  const crossLeague = await fetch(`${base}/season/coaches/hire`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-League-Id": original },
    body: JSON.stringify(hireBody),
  });
  assert.equal(crossLeague.status, 409);
  const created = await fetch(`${base}/leagues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details(manager, "HTTP League")),
  });
  assert.equal(created.status, 201);
});
