import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase } from "./connection.js";
import { migrateDatabase } from "./migrations.js";
import { LeagueRepository } from "./leagueRepository.js";
import { closeRuntimeDatabase } from "./runtime.js";
import { createApp } from "../app.js";
const league = "36c6e53f-7be2-5a94-84a8-0df871aae9fd";
function fixture(t: { after: (fn: () => void) => void }, file = false) {
  const directory = mkdtempSync(path.join(tmpdir(), "football-repository-"));
  const filename = path.join(directory, "test.sqlite");
  const db = openDatabase({ filename: file ? filename : ":memory:" });
  t.after(() => {
    closeRuntimeDatabase();
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  migrateDatabase(db);
  db.prepare("INSERT INTO leagues(id,name) VALUES(?,?)").run(league, "AFL");
  for (const f of [
    "01-divisions.sql",
    "02-teams.sql",
    "03-settings-versions.sql",
    "04-configuration-tables.sql",
  ])
    db.exec(
      readFileSync(
        new URL(`../../../../docs/imports/core/${f}`, import.meta.url),
        "utf8",
      ),
    );
  const repo = new LeagueRepository(db),
    version = (db.prepare("SELECT id FROM settings_versions").get() as any).id;
  repo.insert("seasons", {
    id: "s",
    league_id: league,
    season_number: 1,
    display_name: "Season 1",
    status: "regular",
    current_stage: "regular",
    current_week: 1,
    settings_version_id: version,
  });
  db.exec(
    readFileSync(
      new URL(
        "../../../../docs/imports/remaining/19-normalized-route-settings.sql",
        import.meta.url,
      ),
      "utf8",
    ).replaceAll("97808f43-a0d5-5251-bf8d-fae1643c8258", "s"),
  );
  const teams = db
    .prepare("SELECT id FROM teams ORDER BY legacy_team_id")
    .all() as any[];
  const east = (
      db.prepare("SELECT id FROM divisions WHERE name='East'").get() as any
    ).id,
    west = (
      db.prepare("SELECT id FROM divisions WHERE name='West'").get() as any
    ).id;
  for (let i = 0; i < teams.length; i++)
    repo.insert("team_seasons", {
      id: `ts${i}`,
      team_id: teams[i].id,
      season_id: "s",
      division_id: i < 5 ? east : west,
      abbreviation: `T${i}`,
      nickname: `Team ${i}`,
      primary_color: "#f00",
    });
  for (const [i, name] of ["QB", "Receiver", "Defender", "Blocker"].entries()) {
    repo.insert("players", {
      id: `p${i}`,
      league_id: league,
      display_name: name,
    });
    repo.insert("player_season_ratings", {
      id: `rating${i}`,
      season_id: "s",
      player_id: `p${i}`,
      version: 1,
      offense_position: i === 0 ? "QB" : "WR",
      defense_position: "DB",
      accuracy: 80,
      speed: 70,
    });
    repo.insert("player_team_assignments", {
      id: `a${i}`,
      season_id: "s",
      player_id: `p${i}`,
      team_id: teams[i === 2 ? 1 : 0].id,
      effective_from: "2020-01-01",
      status: "active",
    });
  }
  repo.insert("games", {
    id: "g",
    season_id: "s",
    legacy_game_number: 1,
    stage: "regular",
    regular_week: 1,
    home_team_id: teams[0].id,
    away_team_id: teams[1].id,
    status: "scheduled",
  });
  repo.insert("game_state", { game_id: "g", phase: "awaiting_toss" });
  return { repo, db, filename, teams, version };
}
function play(id: string, extra: Record<string, unknown> = {}) {
  return {
    gameid: 1,
    playid: id,
    time: 900,
    qtr: 1,
    possession: "Home",
    down: 1,
    distance: 10,
    ballon: 25,
    playtype: "Pass",
    player: "QB",
    receiver: "Receiver",
    yards: 15,
    result: "Normal",
    description: "15-yard completion",
    tackler: "Defender",
    isComplete: true,
    isSack: false,
    newdown: 1,
    newdist: 10,
    newballon: 40,
    drivestart: 25,
    homescore: 0,
    awayscore: 0,
    airyards: 10,
    yac: 5,
    lineMatchups: [
      {
        slot: "C",
        offensePlayer: "Blocker",
        defensePlayer: "Defender",
        winner: "OL",
      },
    ],
    ...extra,
  };
}
const snapshot = {
  gameId: 1,
  quarter: 1,
  time: 890,
  down: 1,
  distance: 10,
  ballOn: 40,
  homeScore: 0,
  awayScore: 0,
  possession: "Home",
  driveStart: 25,
};
test("native reads use current assignments, latest rating versions, normalized routes and configuration JSON", (t) => {
  const { repo, db, teams } = fixture(t);
  assert.equal(repo.players().length, 4);
  assert.equal(repo.players()[0].Team, "T0");
  db.prepare(
    "UPDATE player_team_assignments SET team_id=? WHERE player_id=?",
  ).run(teams[1].id, "p1");
  assert.equal(repo.players().find((p) => p.Name === "Receiver")!.Team, "T1");
  repo.insert("player_season_ratings", {
    id: "new",
    season_id: "s",
    player_id: "p1",
    version: 2,
    speed: 99,
  });
  assert.equal(repo.players().find((p) => p.Name === "Receiver")!.Speed, 99);
  const settings = repo.frontendSettings();
  assert.equal(settings.routeTypeAirYards[0].minAirYards, -3);
  assert.ok(settings.routesByDepth.Quick.includes("WR Screen"));
  assert.equal(
    settings.routeOpennessSettings.routeTree.Screen.curveType,
    "Quick",
  );
  assert.equal(settings.accuracyModifiers.length, 5);
  assert.equal(settings.yacBasis.length, 7);
  db.prepare(
    "UPDATE route_depths SET min_air_yards=-5 WHERE display_name='Quick'",
  ).run();
  assert.equal(repo.frontendSettings().routeTypeAirYards[0].minAirYards, -5);
  db.exec(
    "UPDATE configuration_tables SET values_json=json_set(values_json,'$.data[0].multiplier',0.25) WHERE table_key='pick_accuracy_multipliers'",
  );
  assert.equal(
    repo.frontendSettings().pickAccuracyMultipliers[0].multiplier,
    0.25,
  );
});
test("a completed pass atomically persists every history field, state and game/player/team statistics; retries do not rewind", (t) => {
  const { repo, db } = fixture(t);
  const p = play("play1", {
    defensepredicted: "Pass",
    predictioncorrect: true,
    olWins: 1,
    olLosses: 0,
    dlWins: 0,
    dlLosses: 1,
    runlog: ["test"],
    fatigueRecovery: { Receiver: 2 },
    stopReason: "Tackle",
  });
  const saved = repo.savePlayAndGame(
    {
      expectedVersion: 0,
      play: p,
      game: { ...snapshot, quarter: "FINAL", homeScore: 7 },
    },
    "1",
  );
  assert.equal(saved.version, 1);
  const history = repo.history("1")[0];
  assert.equal(history.receiver, "Receiver");
  assert.equal(history.isComplete, true);
  assert.equal(history.YAC, 5);
  assert.equal(history.stopReason, "Tackle");
  assert.deepEqual(JSON.parse(history.runlog), ["test"]);
  assert.equal(repo.games()[0].HomeScore, 7);
  assert.equal(
    repo.playerStats().find((p) => p.Player === "Receiver")!["Receiving Yards"],
    "15",
  );
  assert.equal(
    repo.playerStats().find((p) => p.Player === "Blocker")!["OL W"],
    "1",
  );
  assert.equal(repo.playerGames("Receiver", "T0")[0].receiving.yac, 5);
  assert.equal(
    repo.defenseStats().find((t) => t.team === "T1")!.passingYardsAllowed,
    15,
  );
  assert.equal(
    repo.savePlayAndGame(
      { expectedVersion: 0, play: p, game: { ...snapshot, homeScore: 0 } },
      "1",
    ).duplicate,
    true,
  );
  assert.equal(repo.games()[0].HomeScore, 7);
  assert.equal(
    (db.prepare("SELECT count(*) AS n FROM plays").get() as any).n,
    1,
  );
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
test("unknown players, stale versions and invalid game payloads roll back the complete save", (t) => {
  const { repo, db } = fixture(t);
  assert.throws(
    () =>
      repo.savePlayAndGame(
        { play: play("bad", { receiver: "Unknown" }), game: snapshot },
        "1",
      ),
    /Unknown/,
  );
  assert.equal(repo.history("1").length, 0);
  assert.equal(repo.games()[0].StateVersion, 0);
  assert.throws(
    () =>
      repo.savePlayAndGame(
        { expectedVersion: 9, play: play("stale"), game: snapshot },
        "1",
      ),
    /Game changed/,
  );
  assert.throws(
    () =>
      repo.savePlayAndGame(
        { play: play("wrong", { gameid: 2 }), game: snapshot },
        "1",
      ),
    /different game/,
  );
  assert.equal(
    (db.prepare("SELECT version FROM game_state").get() as any).version,
    0,
  );
});
test("sacks, interceptions, deflections and post-catch fumbles retain definitive flags and player credit", (t) => {
  const { repo, db } = fixture(t);
  repo.savePlayAndGame(
    {
      play: play("sack", {
        yards: -5,
        result: "Sack",
        isComplete: false,
        isSack: true,
        receiver: "",
        newballon: 20,
      }),
      game: snapshot,
    },
    "1",
  );
  repo.savePlayAndGame(
    {
      play: play("pick", {
        yards: 0,
        result: "Interception",
        defenseresult: "Interception",
        isComplete: false,
        turnover: true,
        recoveredby: "Defender",
      }),
      game: snapshot,
    },
    "1",
  );
  repo.savePlayAndGame(
    {
      play: play("deflect", {
        yards: 0,
        result: "Incomplete",
        defenseresult: "Deflection",
        isComplete: false,
      }),
      game: snapshot,
    },
    "1",
  );
  repo.savePlayAndGame(
    {
      play: play("fum", {
        result: "Fumble",
        defenseresult: "Fumble",
        turnover: true,
        recoveredby: "Defender",
      }),
      game: { ...snapshot, quarter: "FINAL" },
    },
    "1",
  );
  const defender = repo.playerStats().find((p) => p.Player === "Defender")!;
  assert.equal(defender.Sacks, "1");
  assert.equal(defender.Interceptions, "1");
  assert.equal(defender["Passes Defended"], "1");
  assert.equal(defender["Fumble Recoveries"], "1");
  const qb = repo.playerStats().find((p) => p.Player === "QB")!;
  assert.equal(qb.Sacked, "1");
  assert.equal(qb["Passing Attempts"], "3");
  assert.equal(qb.Completions, "1");
  assert.equal(repo.history("1")[3].isComplete, true);
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
test("team-only timeouts and spikes save without inventing a player; overtime survives reload", (t) => {
  const { repo } = fixture(t);
  repo.savePlayAndGame(
    {
      play: play("timeout", {
        playtype: "Timeout",
        player: "Home",
        receiver: "",
        tackler: "",
        isComplete: false,
        yards: 0,
        lineMatchups: [],
      }),
      game: {
        ...snapshot,
        quarter: 5,
        overtime: {
          period: 1,
          phase: "playing",
          firstPossession: "Away",
          completed: ["Home"],
        },
      },
    },
    "1",
  );
  assert.deepEqual(repo.games()[0].Overtime, {
    period: 1,
    phase: "playing",
    firstPossession: "Away",
    completed: ["Home"],
  });
  assert.equal(repo.history("1")[0].player, "Home");
});
test("preference changes, playoff seeds and advancement are transactional and winners populate scheduled rounds", async (t) => {
  const { repo, db } = fixture(t);
  db.prepare(
    "INSERT INTO app_preferences VALUES('Visual_Mode','\"Dark\"',datetime('now'))",
  ).run();
  await repo.writeUpdates([
    { range: "GamePlaySettings!B2", values: [["Light"]] },
  ]);
  assert.equal(repo.table("GamePlaySettings")[1][1], "Light");
  await repo.writeUpdates([
    {
      range: "'Playoff Bracket'!C2:C7",
      values: [["T0"], ["T1"], ["T2"], ["T5"], ["T6"], ["T7"]],
    },
    { range: "Season!B2", values: [["Divisionals"]] },
  ]);
  assert.equal(repo.season().current_stage, "Divisionals");
  const first = repo.games().find((g) => g.GameId === 66)!;
  assert.equal(first.Home, "T1");
  assert.equal(first.Away, "T2");
  assert.equal(first.Qtr, "PREGAME");
  repo.savePlayAndGame(
    {
      game: {
        gameId: 66,
        quarter: "FINAL",
        homeScore: 14,
        awayScore: 7,
        time: 0,
      },
    },
    "66",
  );
  assert.equal(repo.games().find((g) => g.GameId === 68)!.Away, "T1");
  assert.equal(repo.games().find((g) => g.GameId === 70)!.NeutralSite, true);
});
test("all public reads and preferences work through HTTP with no Google credentials", async (t) => {
  const { filename } = fixture(t, true);
  const before = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = filename;
  t.after(() => {
    if (before === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = before;
  });
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  for (const endpoint of [
    "health",
    "players",
    "player-traits",
    "teams",
    "games",
    "standings",
    "player-stats",
    "team-defense-stats",
    "articles",
    "season",
    "gameplay-settings",
    "frontend-settings",
    "awards",
    "playoff-bracket",
    "teams/T0/players",
    "players/Receiver/games",
    "games/1/state",
    "games/1/play-history",
    "game-state",
  ]) {
    const response = await fetch(`${base}/${endpoint}`);
    assert.equal(
      response.status,
      200,
      `${endpoint}: ${await response.clone().text()}`,
    );
  }
  const old = await fetch(`${base}/plays`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(old.status, 410);
});
test("125 real ranked ballots use stored award weights, persist results and cannot be voted twice", (t) => {
  const { repo, db, version } = fixture(t);
  repo.insert("award_definitions", {
    id: "mvp",
    code: "MVP",
    display_name: "MVP",
    nominee_count: 8,
    eligibility_json: "{}",
    sort_order: 0,
  });
  const names = [
    "QB",
    "Receiver",
    "Defender",
    "Blocker",
    "Five",
    "Six",
    "Seven",
    "Eight",
  ];
  names.forEach((name, i) => {
    if (i >= 4)
      repo.insert("players", {
        id: `p${i}`,
        league_id: league,
        display_name: name,
      });
    repo.insert("award_nominations", {
      id: `n${i}`,
      season_id: "s",
      award_id: "mvp",
      player_id: `p${i}`,
      nomination_order: i + 1,
      selection_source: "test",
    });
    repo.insert("award_weights", {
      award_id: "mvp",
      settings_version_id: version,
      place: i + 1,
      points: 10 - i,
    });
  });
  repo.insert("award_vote_runs", {
    id: "vote",
    season_id: "s",
    award_id: "mvp",
    settings_version_id: version,
    status: "not_started",
  });
  const original = repo.awardsRows();
  repo.saveBallots(
    "MVP",
    Array.from({ length: 125 }, () => names),
    original,
  );
  const winner = repo.one("SELECT * FROM award_results WHERE is_winner=1")!;
  assert.equal(winner.nomination_id, "n0");
  assert.equal(winner.total_points, 1250);
  assert.equal(repo.awardsRows()[2][2], 125);
  assert.equal(repo.awardsRows()[2][10], 1250);
  assert.equal(repo.one("SELECT count(*) AS n FROM ballot_rankings")!.n, 1000);
  assert.throws(
    () =>
      repo.saveBallots(
        "MVP",
        Array.from({ length: 125 }, () => names),
        repo.awardsRows(),
      ),
    /already exist/,
  );
  assert.deepEqual(db.pragma("foreign_key_check"), []);
});
test("season selection cannot leak a different league and newer seasons remain isolated", (t) => {
  const { repo, db } = fixture(t);
  repo.insert("seasons", {
    id: "s2",
    league_id: league,
    season_number: 2,
    display_name: "Season 2",
    current_week: 1,
  });
  assert.equal(repo.season().id, "s2");
  assert.equal(repo.games().length, 0);
  assert.equal(repo.playerStats().length, 0);
  const before = process.env.SEASON_ID;
  process.env.SEASON_ID = "s";
  try {
    assert.equal(repo.games().length, 1);
  } finally {
    if (before === undefined) delete process.env.SEASON_ID;
    else process.env.SEASON_ID = before;
  }
  db.prepare("INSERT INTO leagues(id,name) VALUES('other','Other')").run();
  repo.insert("seasons", {
    id: "os",
    league_id: "other",
    season_number: 1,
    display_name: "Other Season",
  });
  assert.throws(() => repo.season(), /Multiple leagues/);
});

test('pass facts save to dedicated columns and link the covering DB independently of the tackler',t=>{
  const {repo,db}=fixture(t);
  repo.insert('players',{id:'tackler',league_id:league,display_name:'Different Tackler'});
  const p=play('tracked',{tackler:'Different Tackler',blitz:true,blitzBy:'Defender',qbPressures:1,qbHits:1,qbHitBy:'Defender',timeToThrow:2.675,timeUntilThrow:1.375,coveringDefender:'Defender',playLength:10});
  repo.savePlayAndGame({play:p,game:snapshot},'1');
  const row=repo.one("SELECT * FROM plays WHERE id='tracked'")!;
  assert.equal(row.blitz,1);assert.equal(row.blitz_by,'Defender');assert.equal(row.qb_pressures,1);assert.equal(row.qb_hits,1);assert.equal(row.qb_hit_by,'Defender');assert.equal(row.time_to_throw,2.675);assert.equal(row.time_until_throw,1.375);assert.equal(row.covering_defender,'Defender');assert.equal(row.play_length,10);
  const reloaded=repo.history('1')[0];assert.equal(reloaded.coveringDefender,'Defender');assert.equal(reloaded.tackler,'Different Tackler');assert.equal(reloaded.timeUntilThrow,1.375);assert.equal(reloaded.playLength,10);
  assert.equal(repo.one("SELECT player_id FROM play_participants WHERE play_id='tracked' AND role='covering_defender'")!.player_id,'p2');
  assert.equal(repo.one("SELECT possession_seconds FROM team_game_stats WHERE game_id='g' AND team_id=(SELECT home_team_id FROM games WHERE id='g')")!.possession_seconds,10);
  assert.deepEqual(db.pragma('foreign_key_check'),[]);
});
test('clock length crosses quarters and belongs to the pre-play possession, including turnovers',t=>{
  const {repo}=fixture(t);
  repo.savePlayAndGame({play:play('boundary',{qtr:1,time:3,result:'Interception',isComplete:false,turnover:true,recoveredby:'Defender'}),game:{...snapshot,quarter:2,time:900,possession:'Away'}},'1');
  assert.equal(repo.history('1')[0].playLength,3);
  const rows=repo.all('SELECT * FROM team_game_stats');assert.equal(rows.find(r=>r.team_id===repo.game('1').home_team_id)!.possession_seconds,3);assert.equal(rows.find(r=>r.team_id===repo.game('1').away_team_id)!.possession_seconds,0);
});
test('unknown old tracking remains NULL; invalid names, durations and tracking flags roll back',t=>{
  const {repo}=fixture(t);
  repo.savePlayAndGame({play:play('legacy')},'1');
  const old=repo.history('1')[0];assert.equal(old.blitz,null);assert.equal(old.qbHits,null);assert.equal(old.timeToThrow,null);assert.equal(old.playLength,null);
  assert.equal(repo.one('SELECT possession_seconds FROM team_game_stats WHERE team_id=(SELECT home_team_id FROM games WHERE id=\'g\')')!.possession_seconds,null);
  for(const [id,extra] of [['bad-name',{coveringDefender:'Not a real player'}],['bad-flag',{qbHits:3}],['bad-time',{timeUntilThrow:-1}],['bad-length',{playLength:2}]] as const)
    assert.throws(()=>repo.savePlayAndGame({play:play(id,extra),game:snapshot},'1'));
  assert.equal(repo.history('1').length,1);assert.equal(repo.games()[0].StateVersion,1);
});
