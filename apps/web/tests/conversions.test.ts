import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../../api/src/db/connection.js";
import { migrateDatabase } from "../../api/src/db/migrations.js";
import { LeagueRepository } from "../../api/src/db/leagueRepository.js";
import {
  buildResult,
  buildGameData,
} from "../src/components/league/gameplay/engine/playLogger.js";
import {
  kickExtraPoint,
  goForTwo,
} from "../src/components/league/gameplay/engine/specialTeamsEngine.js";
import {
  playsWithConversions,
  playText,
} from "../src/components/league/playDescription.js";
import { groupPlaysByDrive } from "../src/components/league/driveSummary.js";
import type { LeagueGame } from "../src/components/league/types.js";
import type { EngineContext } from "../src/components/league/gameplay/engine/types.js";
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
    status: "regular",
  });
  repo.insert("divisions", { id: "d", league_id: "l", name: "East" });
  for (const id of ["h", "a"]) {
    repo.insert("teams", { id, league_id: "l" });
    repo.insert("team_seasons", {
      id: `ts${id}`,
      season_id: "s",
      team_id: id,
      division_id: "d",
      abbreviation: id === "h" ? "HOME" : "AWAY",
      nickname: id,
    });
  }
  for (const name of ["Rusher", "Kicker", "QB", "Receiver", "Tackler"])
    repo.insert("players", { id: name, league_id: "l", display_name: name });
  repo.insert("games", {
    id: "g",
    season_id: "s",
    legacy_game_number: 1,
    stage: "regular",
    regular_week: 1,
    home_team_id: "h",
    away_team_id: "a",
    status: "live",
  });
  repo.insert("game_state", {
    game_id: "g",
    phase: "playing",
    period: 1,
    seconds_remaining: 900,
    home_score: 0,
    away_score: 0,
    possession_team_id: "h",
    down: 1,
    distance: 6,
    ball_on: 94,
  });
  const game: LeagueGame = {
    GameId: 1,
    Home: "HOME",
    Away: "AWAY",
    HomeScore: 0,
    AwayScore: 0,
    Qtr: 1,
    Time: 900,
    Possession: "Home",
    Down: 1,
    Distance: 6,
    BallOn: 94,
  };
  const ctx = {
    players: [{ name: "Kicker", team: "HOME", position: "K" }],
    settings: {},
    historyLength: 1,
  } as EngineContext;
  const td = buildResult(
    game,
    {
      ...game,
      HomeScore: 6,
      Time: 895,
      Possession: "Away",
      Down: 1,
      Distance: 10,
      BallOn: 75,
    },
    "Run",
    "Rusher",
    "",
    6,
    "",
    "Touchdown",
    0,
  );
  const saved = repo.savePlayAndGame(
    { expectedVersion: 0, play: td.play, game: buildGameData(td.game, 94) },
    "g",
  );
  return { db, repo, td, ctx, version: saved.version };
}
test("touchdown holds possession across reload; PAT is untimed, grouped with the TD, and excluded from every statistical play", (t) => {
  const { repo, td, ctx, version } = fixture(t);
  assert.equal(td.game.Possession, "Home");
  assert.ok(repo.games()[0].PendingConversion);
  assert.equal(
    repo.one("SELECT phase FROM game_state WHERE game_id='g'")!.phase,
    "pending_conversion",
  );
  const xp = kickExtraPoint(repo.games()[0] as LeagueGame, ctx);
  assert.equal(xp.play.time, "xp");
  assert.equal(xp.play.playLength, 0);
  assert.equal(xp.game.HomeScore, 7);
  assert.equal(xp.game.Time, 895);
  assert.equal(xp.game.Possession, "Away");
  assert.equal(xp.game.BallOn, 75);
  assert.equal(xp.game.PendingConversion, null);
  repo.savePlayAndGame(
    {
      expectedVersion: version,
      play: xp.play,
      game: buildGameData(xp.game, 100),
    },
    "g",
  );
  const history = repo.history("g");
  assert.equal(history.length, 2);
  assert.equal(history[1].time, "xp");
  assert.equal(history[1].isConversion, true);
  assert.equal(history[1].touchdownPlayId, td.play.playid);
  const row = repo.one(
    "SELECT * FROM player_game_stats WHERE player_id='Rusher'",
  )!;
  assert.equal(row.carries, 1);
  assert.equal(row.rushing_yards, 6);
  assert.equal(row.rushing_touchdowns, 1);
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM player_game_stats WHERE player_id='Kicker'",
    )!.n,
    0,
  );
  assert.equal(
    repo.one("SELECT plays FROM team_game_stats WHERE team_id='h'")!.plays,
    1,
  );
  const shown = playsWithConversions(history);
  assert.equal(shown.length, 1);
  assert.match(playText(shown[0]), /Touchdown![\s\S]*Kicker PAT is GOOD/);
  const drives = groupPlaysByDrive(history, xp.game);
  assert.equal(drives[0].playsCount, 1);
  assert.equal(drives[0].yards, 6);
  assert.deepEqual(repo.db.pragma("foreign_key_check"), []);
});
test("a real run/pass outcome can score only two points, uses no clock, and adds no yards, targets, tackles or line wins", (t) => {
  const { repo, td, ctx, version } = fixture(t);
  const two = goForTwo(td.game, ctx);
  assert.equal(two.BallOn, 98);
  const chosen = repo.savePlayAndGame(
    { expectedVersion: version, game: buildGameData(two, 100) },
    "g",
  );
  assert.equal(repo.games()[0].PendingConversion?.choice, "two");
  assert.equal(repo.games()[0].BallOn, 98);
  const result = buildResult(
    two,
    { ...two, HomeScore: 12, Time: 850, Possession: "Away", BallOn: 75 },
    "Pass",
    "QB",
    "Receiver",
    2,
    "Tackler",
    "Touchdown",
    1,
    {
      isComplete: true,
      lineMatchups: [
        { offensePlayer: "QB", defensePlayer: "Tackler", winner: "OL" },
      ],
    },
  );
  assert.equal(result.game.HomeScore, 8);
  assert.equal(result.game.Time, 895);
  assert.equal(result.game.PendingConversion, null);
  assert.equal(result.play.time, "2pt");
  assert.equal(result.play.playtype, "Two Point");
  assert.equal(result.play.yards, 2);
  assert.equal(result.play.isComplete, false);
  repo.savePlayAndGame(
    {
      expectedVersion: chosen.version,
      play: result.play,
      game: buildGameData(result.game, 98),
    },
    "g",
  );
  assert.equal(
    repo.one(
      "SELECT count(*) AS n FROM player_game_stats WHERE player_id IN ('QB','Receiver','Tackler')",
    )!.n,
    0,
  );
  assert.equal(
    repo.one("SELECT passing_attempts FROM team_game_stats WHERE team_id='h'")!
      .passing_attempts,
    0,
  );
  assert.equal(
    repo.one("SELECT is_touchdown FROM plays WHERE is_conversion=1")!
      .is_touchdown,
    0,
  );
  assert.match(
    playText(playsWithConversions(repo.history("g"))[0]),
    /2 yard pass to Receiver. 2-PT try is GOOD!/,
  );
});
test("failed conversion grants zero, and duplicate tries or normal snaps while a try is pending are rejected", (t) => {
  const { repo, td, ctx, version } = fixture(t);
  const two = goForTwo(td.game, ctx);
  const fail = buildResult(
    two,
    { ...two, Time: 800 },
    "Pass",
    "QB",
    "Receiver",
    0,
    "",
    "Incomplete",
    1,
    { isComplete: false },
  );
  assert.equal(fail.game.HomeScore, 6);
  assert.equal(fail.game.Time, 895);
  assert.equal(fail.game.Possession, "Away");
  assert.throws(
    () =>
      repo.savePlayAndGame(
        {
          expectedVersion: version,
          play: { ...td.play, playid: "illegal-regular" },
          game: buildGameData(td.game, 100),
        },
        "g",
      ),
    /pending conversion/,
  );
  const saved = repo.savePlayAndGame(
    {
      expectedVersion: version,
      play: fail.play,
      game: buildGameData(fail.game, 98),
    },
    "g",
  );
  assert.match(
    playText(playsWithConversions(repo.history("g"))[0]),
    /INCOMPLETE[\s\S]*2-PT try is NO GOOD/,
  );
  const another = kickExtraPoint(td.game, ctx);
  assert.throws(
    () =>
      repo.savePlayAndGame(
        {
          expectedVersion: saved.version,
          play: another.play,
          game: buildGameData(another.game, 100),
        },
        "g",
      ),
    /No conversion is pending/,
  );
});
test("end-of-regulation ties wait for the try, an untied final/OT-winning touchdown skips it, and halftime resumes correctly", () => {
  const base: LeagueGame = {
    GameId: 1,
    Home: "HOME",
    Away: "AWAY",
    HomeScore: 0,
    AwayScore: 6,
    Qtr: 4,
    Time: 5,
    Possession: "Home",
    Down: 1,
    Distance: 6,
    BallOn: 94,
  };
  const ctx = { players: [], settings: {}, historyLength: 1 } as EngineContext;
  const tied = buildResult(
    base,
    {
      ...base,
      Qtr: "FINAL",
      Time: 0,
      HomeScore: 6,
      Possession: "Away",
      BallOn: 75,
    },
    "Run",
    "Rusher",
    "",
    6,
    "",
    "Touchdown",
    0,
  );
  assert.equal(tied.game.Qtr, 4);
  assert.ok(tied.game.PendingConversion);
  const xp = kickExtraPoint(tied.game, ctx);
  assert.equal(xp.game.Qtr, "FINAL");
  assert.equal(xp.game.HomeScore, 7);
  const two = goForTwo(tied.game, ctx);
  const fail = buildResult(
    two,
    { ...two },
    "Run",
    "Rusher",
    "",
    0,
    "",
    "Normal",
    1,
  );
  assert.equal(fail.game.Qtr, 5);
  assert.equal(fail.game.Overtime?.phase, "toss");
  const winning = buildResult(
    { ...base, AwayScore: 0 },
    { ...base, AwayScore: 0, HomeScore: 6, Qtr: "FINAL", Time: 0 },
    "Run",
    "Rusher",
    "",
    6,
    "",
    "Touchdown",
    0,
  );
  assert.equal(winning.game.PendingConversion, undefined);
  const halftime = buildResult(
    { ...base, Qtr: 2 },
    {
      ...base,
      Qtr: 3,
      Time: 900,
      HomeScore: 6,
      Possession: "Away",
      BallOn: 75,
    },
    "Run",
    "Rusher",
    "",
    6,
    "",
    "Touchdown",
    0,
  );
  const halftimeXP = kickExtraPoint(halftime.game, ctx);
  assert.equal(halftimeXP.play.qtr, 2);
  assert.equal(halftimeXP.game.Qtr, 3);
  assert.equal(halftimeXP.game.Time, 900);
  assert.equal(halftimeXP.game.Possession, "Away");
  const ot = {
    ...base,
    Qtr: 5,
    Time: 300,
    AwayScore: 0,
    Overtime: {
      period: 1,
      phase: "playing" as const,
      completed: [],
      firstPossession: "Home" as const,
    },
  };
  const otTD = buildResult(
    ot,
    { ...ot, HomeScore: 6, Possession: "Away", BallOn: 75 },
    "Run",
    "Rusher",
    "",
    6,
    "",
    "Touchdown",
    0,
  );
  assert.equal(otTD.game.Qtr, "FINAL");
  assert.equal(otTD.game.PendingConversion, undefined);
});
