import { elapsedPlaySeconds } from "../../../web/src/components/league/gameplay/engine/playClock.js";
import { randomUUID } from "node:crypto";
import type { DatabaseConnection } from "./connection.js";
import { runtimeDatabase } from "./runtime.js";
import { StaleGameStateError } from "./gameTransactions.js";
import { playValueForHeader } from "../services/playHistory.js";
import { aggregatePlayStats, passPlayFacts } from "../services/playStats.js";
// Header compatibility lives at the API boundary; storage is normalized SQL.
export type RecordRow = Record<string, any>;
const parse = (v: unknown, fallback: any = null): any => {
  if (v == null || v === "") return fallback;
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};
const number = (v: unknown) => Number(v) || 0;
const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
const compact = (v: unknown) => norm(v).replace(/[^a-z0-9]/g, "");
const seconds = (v: unknown) =>
  String(v).includes(":")
    ? String(v)
        .split(":")
        .map(Number)
        .reduce((a, b) => a * 60 + b, 0)
    : number(v);
const playerColumns: Record<string, string> = {
  Pos: "offense_position",
  DefPos: "defense_position",
  "Off Stars": "offense_stars",
  "Def Stars": "defense_stars",
  Size: "size",
  Strength: "strength",
  Speed: "speed",
  Stamina: "stamina",
  Poise: "poise",
  Accuracy: "accuracy",
  "Arm-Strength": "arm_strength",
  "Read Defense": "read_defense",
  Juke: "juke",
  Vision: "vision",
  Acceleration: "acceleration",
  "Route Running": "route_running",
  Jump: "jump",
  Hands: "hands",
  "Ball Security": "ball_security",
  "Run Blocking": "run_blocking",
  "Pass Protect": "pass_protection",
  RunStop: "run_stop",
  Tackling: "tackling",
  Strip: "strip",
  PassRush: "pass_rush",
  "Ball Hawk": "ball_hawk",
  "Read QB": "read_qb",
  Coverage: "coverage",
  "QB Favorite": "qb_favorite",
  "Run Def": "run_defense",
  "Tackle Chance": "tackle_chance",
  "Sack Chance": "sack_chance",
  Image: "image_url",
  translateX: "image_translate_x",
  translateY: "image_translate_y",
  scale: "image_scale",
};
export const statColumns: Record<string, string> = {
  Carries: "carries",
  "Rushing Yards": "rushing_yards",
  "Rushing TD": "rushing_touchdowns",
  "Rushing Fumbles": "rushing_fumbles",
  "Rushing Fumbles Lost": "rushing_fumbles_lost",
  "Rushing First Downs": "rushing_first_downs",
  Jukes: "jukes",
  "Broken Tackles": "broken_tackles",
  "Rush Loss": "negative_rushes",
  "Rush 5+": "rushes_5_plus",
  "Rush 10+": "rushes_10_plus",
  "Rush 20+": "rushes_20_plus",
  "Rush 30+": "rushes_30_plus",
  "Rush 50+": "rushes_50_plus",
  "Rushing Long": "longest_rush",
  "OL W": "ol_wins",
  "OL L": "ol_losses",
  "Lead Blocks": "lead_blocks",
  "DL W": "dl_wins",
  "DL L": "dl_losses",
  Tackles: "tackles",
  TFL: "tackles_for_loss",
  Sacks: "defensive_sacks",
  "Forced Fumbles": "forced_fumbles",
  "Fumble Recoveries": "fumble_recoveries",
  Interceptions: "defensive_interceptions",
  "Passes Defended": "deflections",
  "Fum Ret yds": "fumble_return_yards",
  "Fum TD": "fumble_return_touchdowns",
  "Int Ret Yds": "interception_return_yards",
  "Int TD": "interception_return_touchdowns",
  "Safety Forced": "safeties_forced",
  Targets: "targets",
  Receptions: "receptions",
  "Receiving Yards": "receiving_yards",
  "Receiving TD": "receiving_touchdowns",
  "Receiving First Downs": "receiving_first_downs",
  "Receiving Fumbles": "receiving_fumbles",
  "Receiving Fumbles Lost": "receiving_fumbles_lost",
  "Yards After Catch": "yac",
  "Receiving Long": "longest_reception",
  "Big Receptions": "receptions_20_plus",
  "Passing Attempts": "passing_attempts",
  Completions: "passing_completions",
  "Passing Yards": "passing_yards",
  "Passing TD": "passing_touchdowns",
  "Interceptions Thrown": "interceptions_thrown",
  Sacked: "sacks_taken",
  "Sack Yards Lost": "sack_yards_lost",
  "Passing Long": "longest_pass",
};
export class LeagueRepository {
  constructor(readonly db: DatabaseConnection) {}
  all(sql: string, ...args: any[]): RecordRow[] {
    return this.db.prepare(sql).all(...args) as RecordRow[];
  }
  one(sql: string, ...args: any[]): RecordRow | undefined {
    return this.db.prepare(sql).get(...args) as RecordRow | undefined;
  }
  season() {
    const requested = process.env.SEASON_ID?.trim();
    const league = process.env.LEAGUE_ID?.trim();
    const rows = this.all(
      `SELECT * FROM seasons WHERE (? IS NULL OR id=?) AND (? IS NULL OR league_id=?) ORDER BY season_number DESC`,
      requested || null,
      requested || null,
      league || null,
      league || null,
    );
    if (!rows.length)
      throw new Error(
        "No imported season found. Check DATABASE_PATH, LEAGUE_ID and SEASON_ID.",
      );
    if (!requested && new Set(rows.map((r) => r.league_id)).size > 1)
      throw new Error(
        "Multiple leagues found. Set LEAGUE_ID or SEASON_ID explicitly.",
      );
    return rows[0];
  }
  settingsVersion() {
    const season = this.season();
    if (season.settings_version_id) {
      if (
        !this.one(
          "SELECT id FROM settings_versions WHERE id=? AND league_id=?",
          season.settings_version_id,
          season.league_id,
        )
      )
        throw new Error(
          "Season settings version belongs to a different league.",
        );
      return season.settings_version_id as string;
    }
    // Reviewed imports intentionally leave the snapshot draft. It is usable only
    // when unambiguous; never pick arbitrary settings from another league.
    const active = this.all(
      "SELECT id FROM settings_versions WHERE league_id=? AND status='active'",
      season.league_id,
    );
    const rows = active.length
      ? active
      : this.all(
          "SELECT id FROM settings_versions WHERE league_id=? AND status<>'retired'",
          season.league_id,
        );
    if (rows.length !== 1)
      throw new Error(
        "Assign seasons.settings_version_id to the settings version this season should use.",
      );
    return rows[0].id as string;
  }
  teams() {
    return this.all(
      `SELECT ts.*,t.legacy_team_id,d.name AS division FROM team_seasons ts JOIN teams t ON t.id=ts.team_id JOIN divisions d ON d.id=ts.division_id WHERE ts.season_id=? ORDER BY t.legacy_team_id`,
      this.season().id,
    ).map((r) => ({
      id: r.team_id,
      ID: r.legacy_team_id ?? r.team_id,
      Abbrev: r.abbreviation,
      Location: r.location,
      Name: r.nickname,
      Team: r.abbreviation,
      Division: r.division,
      Logo: r.logo_url,
      "Home Jersey Crop": r.home_jersey_url,
      "Away Jersey Crop": r.away_jersey_url,
      "Home Uniform": r.home_uniform_url,
      "Away Uniform": r.away_uniform_url,
      "Primary Color": r.primary_color,
      "secondary color": r.secondary_color,
      "third color": r.third_color,
      "Cap Space": r.cap_space,
    }));
  }
  players(): RecordRow[] {
    const season = this.season();
    return this.all(
      `SELECT r.*,p.id AS identity_id,p.display_name,ts.abbreviation FROM players p
      LEFT JOIN player_season_ratings r ON r.player_id=p.id AND r.season_id=? AND r.version=(SELECT max(x.version) FROM player_season_ratings x WHERE x.season_id=r.season_id AND x.player_id=p.id)
      LEFT JOIN player_team_assignments a ON a.player_id=p.id AND a.season_id=? AND a.status='active' AND julianday(a.effective_from)<=julianday('now') AND (a.effective_until IS NULL OR julianday(a.effective_until)>julianday('now'))
      LEFT JOIN team_seasons ts ON ts.team_id=a.team_id AND ts.season_id=a.season_id WHERE p.league_id=? ORDER BY p.display_name`,
      season.id,
      season.id,
      season.league_id,
    ).map((r) => ({
      id: r.identity_id,
      Name: r.display_name,
      Team: r.abbreviation ?? "",
      ...Object.fromEntries(
        Object.entries(playerColumns).map(([h, k]) => [h, r[k] ?? ""]),
      ),
    }));
  }
  games() {
    return this.all(
      `SELECT g.*,s.*,g.id AS database_id,h.abbreviation AS home,a.abbreviation AS away FROM games g LEFT JOIN game_state s ON s.game_id=g.id LEFT JOIN team_seasons h ON h.team_id=g.home_team_id AND h.season_id=g.season_id LEFT JOIN team_seasons a ON a.team_id=g.away_team_id AND a.season_id=g.season_id WHERE g.season_id=? ORDER BY g.legacy_game_number,g.id`,
      this.season().id,
    ).map((r) => ({
      Id: r.legacy_game_number ?? r.database_id,
      GameId: r.legacy_game_number ?? r.database_id,
      DatabaseId: r.database_id,
      StateVersion: r.version ?? 0,
      Week: r.stage === "regular" ? r.regular_week : r.playoff_round,
      Home: r.home ?? "",
      Away: r.away ?? "",
      Qtr:
        r.status === "final"
          ? "FINAL"
          : r.status === "scheduled"
            ? "PREGAME"
            : r.period,
      Time: r.seconds_remaining ?? 900,
      Down: r.down ?? 1,
      Distance: r.distance ?? 10,
      BallOn: r.ball_on ?? 25,
      DriveStart: r.drive_start ?? 25,
      Previous: r.previous_ball_on ?? 25,
      HomeScore: r.home_score ?? 0,
      AwayScore: r.away_score ?? 0,
      Possession: r.possession_team_id === r.away_team_id ? "Away" : "Home",
      HomeTimeouts: r.home_timeouts ?? 3,
      AwayTimeouts: r.away_timeouts ?? 3,
      Date: r.kickoff_source_local ?? r.kickoff_at_utc ?? "",
      "Kickoff Time": r.kickoff_source_local ?? r.kickoff_at_utc ?? "",
      Kickoff: r.kickoff_source_local ?? r.kickoff_at_utc ?? "",
      Network: r.network,
      Weather: r.weather_text,
      Venue: r.venue_name,
      NeutralSite: Boolean(r.is_neutral_site),
      Overtime: r.overtime_period
        ? {
            period: r.overtime_period,
            phase: r.overtime_phase,
            firstPossession:
              r.overtime_first_receiving_team_id === r.home_team_id
                ? "Home"
                : r.overtime_first_receiving_team_id === r.away_team_id
                  ? "Away"
                  : undefined,
            completed: [
              ...(r.overtime_home_initial_possession_completed ? ["Home"] : []),
              ...(r.overtime_away_initial_possession_completed ? ["Away"] : []),
            ],
          }
        : undefined,
    }));
  }
  game(id: string) {
    const r = this.one(
      "SELECT * FROM games WHERE season_id=? AND (id=? OR CAST(legacy_game_number AS TEXT)=?)",
      this.season().id,
      id,
      id,
    );
    if (!r) throw new Error(`Game not found in selected season: ${id}`);
    return r;
  }
  history(gameId?: string) {
    const game = gameId ? this.game(gameId) : undefined;
    const rows = this.all(
      `SELECT p.*,g.legacy_game_number,g.home_team_id,d.* FROM plays p JOIN games g ON g.id=p.game_id LEFT JOIN play_details d ON d.play_id=p.id WHERE g.season_id=? AND (? IS NULL OR p.game_id=?) ORDER BY g.legacy_game_number,p.sequence`,
      this.season().id,
      game?.id ?? null,
      game?.id ?? null,
    );
    const ids = new Set(rows.map((r) => r.id));
    const people = this.all(
      `SELECT a.play_id,a.role,p.display_name FROM play_participants a JOIN players p ON p.id=a.player_id JOIN plays x ON x.id=a.play_id JOIN games g ON g.id=x.game_id WHERE g.season_id=? AND (? IS NULL OR g.id=?)`,
      this.season().id,
      game?.id ?? null,
      game?.id ?? null,
    );
    const names = new Map<string, Record<string, string>>();
    for (const r of people) {
      if (!ids.has(r.play_id)) continue;
      const n = names.get(r.play_id) ?? {};
      n[r.role] = r.display_name;
      names.set(r.play_id, n);
    }
    const lines = this.all(
      `SELECT m.*,o.display_name AS offense_name,d.display_name AS defense_name FROM play_line_matchups m JOIN plays p ON p.id=m.play_id JOIN games g ON g.id=p.game_id LEFT JOIN players o ON o.id=m.offense_player_id LEFT JOIN players d ON d.id=m.defense_player_id WHERE g.season_id=? AND (? IS NULL OR g.id=?) ORDER BY m.matchup_number`,
      this.season().id,
      game?.id ?? null,
      game?.id ?? null,
    );
    const matchups = new Map<string, unknown[]>();
    for (const l of lines)
      matchups.set(l.play_id, [
        ...(matchups.get(l.play_id) ?? []),
        {
          ...parse(l.detail_json, {}),
          slot: l.offense_slot,
          offensePlayer: l.offense_name,
          defensePlayer: l.defense_name,
          winner: l.winner_side,
        },
      ]);
    return rows.map((r) => {
      const n = names.get(r.id) ?? {};
      return {
        gameid: r.legacy_game_number ?? r.game_id,
        playid: r.id,
        time: r.seconds_before,
        qtr: r.period_before,
        possession: r.offense_team_id === r.home_team_id ? "Home" : "Away",
        down: r.down_before,
        distance: r.distance_before,
        ballon: r.ball_before,
        blitz: r.blitz == null ? null : Boolean(r.blitz),
        blitzBy: r.blitz_by,
        qbPressures: r.qb_pressures,
        qbHits: r.qb_hits,
        qbHitBy: r.qb_hit_by,
        timeToThrow: r.time_to_throw,
        timeUntilThrow: r.time_until_throw,
        coveringDefender: r.covering_defender,
        playLength: r.play_length,
        playtype: r.play_type,
        player:
          n.passer ??
          n.runner ??
          n.kicker ??
          n.punter ??
          n.team_actor ??
          parse(r.original_payload_json, {}).player ??
          parse(r.original_payload_json, {}).record?.player ??
          "",
        receiver: n.target ?? n.receiver ?? "",
        yards: r.yards,
        defensepredicted: r.defense_predicted,
        predictioncorrect:
          r.prediction_correct == null ? "" : Boolean(r.prediction_correct),
        tackler: n.tackler ?? n.sacker ?? n.deflector ?? n.interceptor ?? "",
        result: r.result,
        isSack: r.is_sack == null ? "" : Boolean(r.is_sack),
        defenseresult: r.defense_result,
        turnover: Boolean(r.is_turnover),
        description: r.description_raw,
        recoveredby: n.interceptor ?? n.recoverer ?? "",
        isComplete: r.is_complete == null ? "" : Boolean(r.is_complete),
        airyards: r.air_yards,
        YAC: r.yac,
        newdown: r.down_after,
        newdist: r.distance_after,
        newballon: r.ball_after,
        drivestart: r.drive_start,
        homescore: r.home_score_after,
        awayscore: r.away_score_after,
        lineMatchups: JSON.stringify(matchups.get(r.id) ?? []),
        olWins: r.ol_wins,
        olLosses: r.ol_losses,
        dlWins: r.dl_wins,
        dlLosses: r.dl_losses,
        leadblocker: n.lead_blocker ?? "",
        jukes: r.jukes,
        trucks: r.trucks,
        brokentackles: r.broken_tackles,
        stopReason: r.stop_reason,
        runlog: r.run_log_json ?? "",
        fatigueRecovery: r.fatigue_recovery_json ?? "",
      };
    });
  }
  playerStats() {
    const season = this.season().id;
    // Aggregate the per-game rows, never add season snapshots on top of them.
    const sums = Object.values(statColumns)
      .map(
        (k) =>
          `${k.startsWith("longest_") ? "max" : "sum"}(coalesce(s.${k},0)) AS ${k}`,
      )
      .join(",");
    return this.all(
      `SELECT s.player_id,p.display_name,count(DISTINCT s.game_id) AS gp,${sums} FROM player_game_stats s JOIN games g ON g.id=s.game_id JOIN players p ON p.id=s.player_id WHERE g.season_id=? AND g.status='final' AND g.stage='regular' GROUP BY s.player_id`,
      season,
    ).map((r) => {
      const out: RecordRow = {
        Player: r.display_name,
        GP: r.gp,
        ...Object.fromEntries(
          Object.entries(statColumns).map(([h, k]) => [h, r[k] ?? 0]),
        ),
      };
      for (const [h, num, den, factor] of [
        ["Rushing Average", "rushing_yards", "carries", 1],
        ["Receiving Average", "receiving_yards", "receptions", 1],
        ["Passing Average", "passing_yards", "passing_attempts", 1],
        [
          "Completion Percentage",
          "passing_completions",
          "passing_attempts",
          100,
        ],
        ["OL Win %", "ol_wins", "ol_losses", 100],
        ["DL Win %", "dl_wins", "dl_losses", 100],
      ] as const) {
        const denominator = h.includes("Win")
          ? number(r[num]) + number(r[den])
          : number(r[den]);
        out[h] = denominator ? (number(r[num]) / denominator) * factor : 0;
      }
      return Object.fromEntries(
        Object.entries(out).map(([k, v]) => [k, String(v)]),
      );
    });
  }
  playerGames(name: string, team: string) {
    const player = this.playerId(name);
    if (!player) return [];
    const teamId = team ? this.teamId(team) : this.rosterTeam(player);
    return this.games()
      .filter((g) => g.Qtr === "FINAL")
      .flatMap((g) => {
        const game = this.game(String(g.GameId));
        const rows = this.all(
          "SELECT * FROM player_game_stats WHERE game_id=? AND player_id=?",
          game.id,
          player,
        );
        const stats = rows.find((s) => !teamId || s.team_id === teamId);
        if (
          teamId
            ? ![game.home_team_id, game.away_team_id].includes(teamId)
            : !stats
        )
          return [];
        const home = (teamId ?? stats!.team_id) === game.home_team_id;
        const r = stats ?? {},
          score = home ? g.HomeScore : g.AwayScore,
          opp = home ? g.AwayScore : g.HomeScore;
        const rushing = {
          carries: r.carries ?? 0,
          yards: r.rushing_yards ?? 0,
          touchdowns: r.rushing_touchdowns ?? 0,
          long: r.longest_rush ?? 0,
        };
        return [
          {
            gameId: g.GameId,
            week: g.Week,
            opponent: home ? g.Away : g.Home,
            location: home ? "vs" : "@",
            result: `${score > opp ? "W" : score < opp ? "L" : "T"} ${score}-${opp}`,
            date: g.Date,
            ...rushing,
            rushing,
            receiving: {
              targets: r.targets ?? 0,
              receptions: r.receptions ?? 0,
              yards: r.receiving_yards ?? 0,
              touchdowns: r.receiving_touchdowns ?? 0,
              long: r.longest_reception ?? 0,
              yac: r.yac ?? 0,
              firstDowns: r.receiving_first_downs ?? 0,
            },
            passing: {
              attempts: r.passing_attempts ?? 0,
              completions: r.passing_completions ?? 0,
              yards: r.passing_yards ?? 0,
              touchdowns: r.passing_touchdowns ?? 0,
              interceptions: r.interceptions_thrown ?? 0,
              long: r.longest_pass ?? 0,
              sacks: r.sacks_taken ?? 0,
            },
            defense: {
              dlWins: r.dl_wins ?? 0,
              dlAttempts: number(r.dl_wins) + number(r.dl_losses),
              tackles: r.tackles ?? 0,
              tacklesForLoss: r.tackles_for_loss ?? 0,
              sacks: r.defensive_sacks ?? 0,
              forcedFumbles: r.forced_fumbles ?? 0,
              interceptions: r.defensive_interceptions ?? 0,
            },
            fumbles: {
              total: number(r.rushing_fumbles) + number(r.receiving_fumbles),
              lost:
                number(r.rushing_fumbles_lost) +
                number(r.receiving_fumbles_lost),
            },
          },
        ];
      });
  }
  standings() {
    const standings = this.all(
      "SELECT * FROM season_standings WHERE season_id=? AND scope='regular'",
      this.season().id,
    );
    return this.teams().map((t) => {
      const r = standings.find((s) => s.team_id === t.id) ?? {};
      return {
        Abbrev: t.Abbrev,
        Division: t.Division,
        W: r.wins ?? 0,
        L: r.losses ?? 0,
        T: r.ties ?? 0,
        "Home W": r.home_wins ?? 0,
        "Home L": r.home_losses ?? 0,
        "Home T": r.home_ties ?? 0,
        "Away W": r.away_wins ?? 0,
        "Away L": r.away_losses ?? 0,
        "Away T": r.away_ties ?? 0,
        "Div W": r.division_wins ?? 0,
        "Div L": r.division_losses ?? 0,
        "Div T": r.division_ties ?? 0,
        PF: r.points_for ?? 0,
        PA: r.points_against ?? 0,
        DIFF: r.point_differential ?? 0,
        STRK: r.streak ?? "",
        "Win%": r.win_percentage ?? 0,
        "Div Win%": r.division_win_percentage ?? 0,
      };
    });
  }
  defenseStats() {
    const rows = this.all(
      "SELECT * FROM team_season_stats WHERE season_id=? AND scope='regular'",
      this.season().id,
    );
    return this.teams().map((t) => {
      const r = rows.find((x) => x.team_id === t.id) ?? {};
      return {
        team: t.Abbrev,
        gamesPlayed: r.games_played ?? 0,
        passingYardsAllowed: r.passing_yards_allowed ?? 0,
        rushingYardsAllowed: r.rushing_yards_allowed ?? 0,
        totalYardsAllowed: r.total_gross_yards_allowed ?? 0,
      };
    });
  }
  settingsRows() {
    const rows: any[][] = [];
    for (const c of this.all(
      "SELECT table_key,values_json FROM configuration_tables WHERE settings_version_id=?",
      this.settingsVersion(),
    )) {
      const value = parse(c.values_json, {});
      const source = value.source;
      if (!source || source.sheet !== "Settings") continue;
      const start = /^[A-Z]+(\d+)/.exec(source.range)?.[1];
      if (!start) continue;
      source.cells.forEach((row: any[], i: number) => {
        const at = Number(start) - 1 + i;
        rows[at] = row.map((v, j) => {
          const col = String.fromCharCode(65 + j);
          const fmt = source.number_formats?.[`${col}${at + 1}`];
          return typeof v === "number" && fmt?.includes("%")
            ? `${v * 100}%`
            : v && typeof v === "object"
              ? ""
              : (v ?? "");
        });
      });
    }
    if (!rows.length)
      throw new Error(
        "Missing imported Settings configuration tables for selected season.",
      );
    return Array.from({ length: rows.length }, (_, i) => rows[i] ?? []);
  }
  articles() {
    return this.all(
      `SELECT a.*,g.legacy_game_number,s.season_number FROM articles a JOIN seasons s ON s.id=a.season_id LEFT JOIN games g ON g.id=a.game_id WHERE a.season_id=? ORDER BY a.published_at DESC`,
      this.season().id,
    ).map((r) => ({
      Id: r.id,
      Season: r.season_number,
      Week: r.regular_week ?? r.stage,
      GameId: r.legacy_game_number ?? r.game_id ?? "",
      Type: r.article_type,
      Status: r.status,
      Title: r.title,
      Summary: r.summary,
      Article: r.markdown,
      PublishedAt: r.published_at,
      Featured: Boolean(r.is_featured),
      HeroImageUrl: r.hero_image_url,
    }));
  }
  bracketRows() {
    const season = this.season().id;
    const seeds = this.all(
      "SELECT p.*,d.name,t.abbreviation FROM playoff_seedings p JOIN divisions d ON d.id=p.division_id JOIN team_seasons t ON t.team_id=p.team_id AND t.season_id=p.season_id WHERE p.season_id=?",
      season,
    );
    return [
      ["Division", "Seed", "Team"],
      ...["East", "West"].flatMap((d) =>
        [1, 2, 3].map((seed) => [
          d,
          seed,
          seeds.find((r) => r.name === d && r.seed === seed)?.abbreviation ??
            "",
        ]),
      ),
    ];
  }
  awardsRows() {
    const season = this.season().id;
    const rows: any[][] = [
      ["AWARDS"],
      ["Candidate", "Award", 1, 2, 3, 4, 5, 6, 7, 8, "Total"],
    ];
    for (const def of this.all(
      "SELECT * FROM award_definitions ORDER BY sort_order",
    )) {
      const nominees = this.all(
        `SELECT n.*,p.display_name FROM award_nominations n JOIN players p ON p.id=n.player_id WHERE n.season_id=? AND n.award_id=? ORDER BY n.nomination_order`,
        season,
        def.id,
      );
      const votes = this.all(
        `SELECT * FROM award_rankings WHERE season_id=? AND award_id=?`,
        season,
        def.id,
      );
      for (let i = 0; i < def.nominee_count; i++) {
        const n = nominees[i],
          v = votes.find((v) => v.nomination_id === n?.id);
        rows.push([
          n?.display_name ?? "",
          def.code,
          ...Array.from(
            { length: 8 },
            (_, p) => v?.[`place_${p + 1}_votes`] ?? 0,
          ),
          v?.total_points ?? 0,
        ]);
      }
    }
    rows.push(
      [],
      ["FIRST TEAMS"],
      ["Position", "Side", "Division", "Player Name"],
    );
    rows.push(
      ...this.all(
        `SELECT h.*,d.name AS division,p.display_name FROM honor_slots h JOIN divisions d ON d.id=h.division_id LEFT JOIN honor_selections s ON s.slot_id=h.id LEFT JOIN players p ON p.id=s.player_id WHERE h.season_id=? ORDER BY h.sort_order,h.id`,
        season,
      ).map((r) => [
        r.position_label,
        r.side,
        r.division,
        r.display_name ?? "",
      ]),
    );
    return rows;
  }
  table(name: string): any[][] {
    const values = (rs: RecordRow[], headers?: string[]) => {
      const h = headers ?? Object.keys(rs[0] ?? {});
      return [h, ...rs.map((r) => h.map((k) => r[k] ?? ""))];
    };
    switch (norm(name).replace(/'/g, "")) {
      case "players":
        return values(this.players());
      case "playerteams":
        return values(
          this.players().map((p) => ({ Name: p.Name, Team: p.Team })),
          ["Name", "Team"],
        );
      case "teams":
        return values(this.teams());
      case "games":
        return values(this.games());
      case "standings":
        return values(this.standings());
      case "playerstats":
        return values(this.playerStats());
      case "playhistory":
        return values(this.history());
      case "settings":
        return this.settingsRows();
      case "season":
        return [
          ["Variable", "Value"],
          [
            "Week",
            this.season().current_stage === "regular"
              ? this.season().current_week
              : this.season().current_stage,
          ],
        ];
      case "gameplaysettings":
        return [
          ["Variable", "Value"],
          ...this.all("SELECT * FROM app_preferences ORDER BY key").map((r) => [
            r.key,
            parse(r.value_json),
          ]),
        ];
      case "articles":
        return values(this.articles(), [
          "Id",
          "Season",
          "Week",
          "GameId",
          "Type",
          "Status",
          "Title",
          "Summary",
          "Article",
          "PublishedAt",
          "Featured",
          "HeroImageUrl",
        ]);
      case "playoff bracket":
        return this.bracketRows();
      case "awards":
        return this.awardsRows();
      case "gamestate":
        return values(
          this.games()
            .filter((g) => g.Qtr !== "FINAL" && g.Qtr !== "PREGAME")
            .slice(0, 1),
        );
      default:
        throw new Error(`No SQLite repository mapping for ${name}.`);
    }
  }
  insert(table: string, values: RecordRow) {
    const keys = Object.keys(values);
    this.db
      .prepare(
        `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
      )
      .run(
        ...keys.map((k) =>
          values[k] === undefined
            ? null
            : typeof values[k] === "boolean"
              ? Number(values[k])
              : values[k],
        ),
      );
  }
  playerId(name: unknown) {
    if (!String(name ?? "").trim() || /^(na|n\/a|none)$/i.test(String(name)))
      return null;
    const players = this.all(
      "SELECT id FROM players WHERE league_id=? AND display_name=? COLLATE NOCASE",
      this.season().league_id,
      String(name).trim(),
    );
    if (players.length !== 1)
      throw new Error(`Unknown or ambiguous player: ${name}`);
    return players[0].id;
  }
  teamId(value: unknown) {
    const team = this.teams().find((t) =>
      [t.id, t.ID, t.Abbrev, t.Name].some((v) => norm(v) === norm(value)),
    );
    if (!team) throw new Error(`Unknown team: ${value}`);
    return team.id;
  }
  savePlayAndGame(data: RecordRow, id: string) {
    return this.db
      .transaction(() => {
        const game = this.game(id),
          state = this.one("SELECT * FROM game_state WHERE game_id=?", game.id);
        if (!state) this.insert("game_state", { game_id: game.id });
        const current =
          state ??
          this.one("SELECT * FROM game_state WHERE game_id=?", game.id)!;
        const play = data.play as RecordRow | undefined,
          snapshot = data.game as RecordRow | undefined;
        const playId = play
          ? String(play.playid ?? play.PlayId ?? "")
          : undefined;
        if (play && !playId) throw new Error("A play ID is required.");
        if (
          snapshot?.gameId !== undefined &&
          ![
            String(id),
            String(game.id),
            String(game.legacy_game_number),
          ].includes(String(snapshot.gameId))
        )
          throw new Error("Payload game ID does not match request.");
        if (
          play &&
          playValueForHeader(play, "gameid") !== "" &&
          ![
            String(id),
            String(game.id),
            String(game.legacy_game_number),
          ].includes(String(playValueForHeader(play, "gameid")))
        )
          throw new Error("Play belongs to a different game.");
        if (playId) {
          const prior = this.one(
            "SELECT game_id FROM plays WHERE id=?",
            playId,
          );
          if (prior) {
            if (prior.game_id !== game.id)
              throw new Error("Play ID belongs to another game.");
            return { duplicate: true, version: current.version };
          }
        }
        if (
          data.expectedVersion !== undefined &&
          data.expectedVersion !== current.version
        )
          throw new StaleGameStateError(
            "Game changed. Reload before submitting another play.",
          );
        if (play && game.status === "final")
          throw new Error("A final game cannot accept another play.");
        if (play) {
          const optionalFlag = (header: string) => {
            const value = playValueForHeader(play, header);
            if (value === "" || value == null) return null;
            if (
              value === true ||
              value === 1 ||
              value === "true" ||
              value === "1"
            )
              return 1;
            if (
              value === false ||
              value === 0 ||
              value === "false" ||
              value === "0"
            )
              return 0;
            throw new Error(`Invalid ${header}: expected a boolean or 0/1.`);
          };
          const optionalSeconds = (header: string) => {
            const value = playValueForHeader(play, header);
            if (value === "" || value == null) return null;
            const result = Number(value);
            if (!Number.isFinite(result) || result < 0)
              throw new Error(
                `Invalid ${header}: expected nonnegative seconds.`,
              );
            return result;
          };
          const nameOrNull = (header: string) =>
            String(playValueForHeader(play, header) ?? "").trim() || null;
          const v = (h: string) => playValueForHeader(play, h),
            facts = passPlayFacts(play);
          const offense =
            norm(v("possession")) === "home"
              ? game.home_team_id
              : norm(v("possession")) === "away"
                ? game.away_team_id
                : this.teamId(v("possession"));
          if (![game.home_team_id, game.away_team_id].includes(offense))
            throw new Error("Possession team is not in this game.");
          const defense =
            offense === game.home_team_id
              ? game.away_team_id
              : game.home_team_id;
          const result = String(v("result")),
            description = String(v("description")),
            defResult = String(v("defenseresult"));
          const text = `${result} ${description} ${defResult}`;
          const interception = /interception/i.test(text),
            fumble = /fumble/i.test(text),
            turnover =
              interception ||
              v("turnover") === true ||
              /^(true|1)$/i.test(String(v("turnover")));
          const touchdown = /touchdown|\btd\b/i.test(result),
            safety = /safety/i.test(result);
          const sequence =
            number(
              this.one(
                "SELECT max(sequence) AS n FROM plays WHERE game_id=?",
                game.id,
              )?.n,
            ) + 1;
          const periodAfter = snapshot
            ? /final/i.test(String(snapshot.quarter))
              ? number(v("qtr"))
              : number(snapshot.quarter)
            : null;
          const suppliedLength = optionalSeconds("playLength");
          const clockLength = snapshot
            ? elapsedPlaySeconds(
                { period: v("qtr"), seconds: v("time") },
                { period: snapshot.quarter, seconds: snapshot.time },
              )
            : null;
          if (
            suppliedLength !== null &&
            clockLength !== null &&
            Math.abs(suppliedLength - clockLength) > 0.000001
          )
            throw new Error(
              "playLength does not match the recorded game clocks.",
            );
          this.insert("plays", {
            id: playId,
            game_id: game.id,
            sequence,
            period_before: number(v("qtr")) || current.period,
            seconds_before: seconds(v("time")),
            period_after: periodAfter,
            seconds_after: snapshot ? seconds(snapshot.time) : null,
            offense_team_id: offense,
            defense_team_id: defense,
            down_before: number(v("down")) || null,
            distance_before: number(v("distance")),
            ball_before: number(v("ballon")),
            down_after: number(v("newdown")) || null,
            distance_after: number(v("newdist")),
            ball_after: v("newballon") === "" ? null : number(v("newballon")),
            drive_start: number(v("drivestart")),
            play_type: String(v("playtype")),
            yards: number(v("yards")),
            air_yards: number(v("airyards")),
            yac: number(v("YAC")),
            result,
            defense_result: defResult,
            is_complete: facts.isComplete,
            is_sack: facts.isSack,
            is_first_down:
              !turnover &&
              !touchdown &&
              number(v("newdown")) === 1 &&
              number(v("yards")) >= number(v("distance")),
            is_touchdown: touchdown,
            is_safety: safety,
            is_fumble: fumble,
            fumble_lost: fumble && turnover,
            is_turnover: turnover,
            turnover_type: interception
              ? "interception"
              : fumble && turnover
                ? "fumble"
                : turnover
                  ? "downs"
                  : null,
            home_score_after: number(v("homescore")),
            away_score_after: number(v("awayscore")),
            description_raw: description,
            blitz: optionalFlag("blitz"),
            blitz_by: nameOrNull("blitzBy"),
            qb_pressures: optionalFlag("qbPressures"),
            qb_hits: optionalFlag("qbHits"),
            qb_hit_by: nameOrNull("qbHitBy"),
            time_to_throw: optionalSeconds("timeToThrow"),
            time_until_throw: optionalSeconds("timeUntilThrow"),
            covering_defender: nameOrNull("coveringDefender"),
            play_length: clockLength ?? suppliedLength,
          });
          const role = (name: unknown, role: string, team: string) => {
            const label = String(name ?? "");
            if (
              [
                "home",
                "away",
                ...this.teams().map((t) => norm(t.Abbrev)),
              ].includes(norm(label))
            )
              return;
            const player = this.playerId(name);
            if (
              player &&
              !this.one(
                "SELECT 1 FROM play_participants WHERE play_id=? AND player_id=? AND team_id=? AND role=?",
                playId,
                player,
                team,
                role,
              )
            )
              this.insert("play_participants", {
                id: randomUUID(),
                play_id: playId,
                player_id: player,
                team_id: team,
                role,
                participation_source: "engine",
              });
          };
          role(
            v("player"),
            /run|kneel/i.test(String(v("playtype")))
              ? "runner"
              : /pass|spike/i.test(String(v("playtype")))
                ? "passer"
                : "team_actor",
            offense,
          );
          role(v("receiver"), "target", offense);
          // Covering defender is the target's assigned guard, independently of
          // whichever defender tackled, hit, intercepted or deflected the ball.
          role(v("coveringDefender"), "covering_defender", defense);
          role(v("blitzBy"), "blitz_rusher", defense);
          role(v("qbHitBy"), "qb_hitter", defense);
          role(v("leadblocker"), "lead_blocker", offense);
          role(
            v("tackler"),
            /deflection/i.test(defResult)
              ? "deflector"
              : interception
                ? "interceptor"
                : "tackler",
            defense,
          );
          const recoverer = v("recoveredby");
          if (recoverer && !interception)
            role(
              recoverer,
              "recoverer",
              fumble && turnover ? defense : offense,
            );
          if (
            interception &&
            recoverer &&
            compact(recoverer) !== compact(v("tackler"))
          )
            role(recoverer, "interceptor", defense);
          const matchups = parse(v("lineMatchups"), []);
          if (!Array.isArray(matchups))
            throw new Error("Invalid line matchups.");
          matchups.forEach((m: RecordRow, i: number) => {
            role(m.offensePlayer, "blocker", offense);
            role(m.defensePlayer, "rusher", defense);
            this.insert("play_line_matchups", {
              id: randomUUID(),
              play_id: playId,
              matchup_number: i,
              offense_player_id: this.playerId(m.offensePlayer),
              defense_player_id: this.playerId(m.defensePlayer),
              offense_team_id: offense,
              defense_team_id: defense,
              offense_slot: m.slot ?? null,
              defense_slot: m.defenseSlot ?? null,
              winner_side: ["OL", "DL"].includes(m.winner) ? m.winner : null,
              detail_json: JSON.stringify(m),
            });
          });
          const json = (v: unknown) =>
            v == null || v === ""
              ? null
              : JSON.stringify(typeof v === "string" ? parse(v, v) : v);
          this.insert("play_details", {
            play_id: playId,
            defense_predicted: String(v("defensepredicted")),
            prediction_correct: /^(true|1)$/i.test(
              String(v("predictioncorrect")),
            ),
            ol_wins: number(v("olWins")),
            ol_losses: number(v("olLosses")),
            dl_wins: number(v("dlWins")),
            dl_losses: number(v("dlLosses")),
            jukes: number(v("jukes")),
            trucks: number(v("trucks")),
            broken_tackles: number(v("brokentackles")),
            stop_reason: String(v("stopReason")),
            run_log_json: json(v("runlog")),
            fatigue_recovery_json: json(v("fatigueRecovery")),
            animation_json: json(play.animation),
            original_payload_json: JSON.stringify(play),
          });
        }
        if (snapshot) {
          const mapping: Record<string, string> = {
            time: "seconds_remaining",
            down: "down",
            distance: "distance",
            ballOn: "ball_on",
            homeScore: "home_score",
            awayScore: "away_score",
            driveStart: "drive_start",
            previous: "previous_ball_on",
            homeTimeouts: "home_timeouts",
            awayTimeouts: "away_timeouts",
          };
          const updates: RecordRow = {};
          for (const [k, c] of Object.entries(mapping))
            if (snapshot[k] !== undefined)
              updates[c] =
                k === "time" ? seconds(snapshot[k]) : number(snapshot[k]);
          if (snapshot.possession !== undefined)
            updates.possession_team_id =
              snapshot.possession === "Home"
                ? game.home_team_id
                : snapshot.possession === "Away"
                  ? game.away_team_id
                  : this.teamId(snapshot.possession);
          const final = /^(FINAL|F)$/i.test(String(snapshot.quarter));
          const pregame = /pregame|scheduled|toss/i.test(
            String(snapshot.quarter),
          );
          if (snapshot.quarter !== undefined) {
            updates.phase = final
              ? "final"
              : pregame
                ? "awaiting_toss"
                : "playing";
            if (!final && !pregame) updates.period = number(snapshot.quarter);
          }
          if (snapshot.overtime !== undefined) {
            const ot = parse(snapshot.overtime);
            if (
              !ot ||
              !Number.isInteger(ot.period) ||
              !["toss", "playing", "final"].includes(ot.phase) ||
              !Array.isArray(ot.completed)
            )
              throw new Error("Invalid overtime state.");
            Object.assign(updates, {
              overtime_period: ot.period,
              overtime_phase: ot.phase,
              overtime_first_receiving_team_id:
                ot.firstPossession === "Home"
                  ? game.home_team_id
                  : ot.firstPossession === "Away"
                    ? game.away_team_id
                    : null,
              overtime_home_initial_possession_completed: Number(
                ot.completed.includes("Home"),
              ),
              overtime_away_initial_possession_completed: Number(
                ot.completed.includes("Away"),
              ),
            });
          }
          if (game.status === "scheduled" && updates.possession_team_id)
            updates.opening_receiving_team_id = updates.possession_team_id;
          const keys = Object.keys(updates);
          if (keys.length)
            this.db
              .prepare(
                `UPDATE game_state SET ${keys.map((k) => `${k}=?`).join(",")} WHERE game_id=?`,
              )
              .run(...keys.map((k) => updates[k]), game.id);
          if (snapshot.quarter !== undefined)
            this.db
              .prepare("UPDATE games SET status=? WHERE id=?")
              .run(final ? "final" : pregame ? "scheduled" : "live", game.id);
        }
        this.db
          .prepare(
            "UPDATE game_state SET version=version+1,last_play_id=coalesce(?,last_play_id),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE game_id=?",
          )
          .run(playId ?? null, game.id);
        if (play) this.rebuildGameStats(game.id);
        this.resolveBracket();
        return { duplicate: false, version: current.version + 1 };
      })
      .immediate();
  }
  rebuildGameStats(gameId: string) {
    const game = this.game(gameId),
      plays = this.history(gameId),
      totals = aggregatePlayStats(plays);
    const participants = this.all(
      "SELECT DISTINCT a.player_id,a.team_id,p.display_name FROM play_participants a JOIN plays x ON x.id=a.play_id JOIN players p ON p.id=a.player_id WHERE x.game_id=? UNION SELECT DISTINCT m.offense_player_id,m.offense_team_id,p.display_name FROM play_line_matchups m JOIN plays x ON x.id=m.play_id JOIN players p ON p.id=m.offense_player_id WHERE x.game_id=? UNION SELECT DISTINCT m.defense_player_id,m.defense_team_id,p.display_name FROM play_line_matchups m JOIN plays x ON x.id=m.play_id JOIN players p ON p.id=m.defense_player_id WHERE x.game_id=?",
      gameId,
      gameId,
      gameId,
    );
    this.db
      .prepare("DELETE FROM player_game_stats WHERE game_id=?")
      .run(gameId);
    for (const player of participants) {
      const stats = totals.get(compact(player.display_name)) ?? {};
      const values: RecordRow = {
        game_id: gameId,
        player_id: player.player_id,
        team_id: player.team_id,
        participation_verified: 1,
        metric_availability_json: JSON.stringify({
          version: "engine-v1",
          unknown: ["return yardage"],
        }),
        calculation_version: "engine-v1",
        source_game_version: this.one(
          "SELECT version FROM game_state WHERE game_id=?",
          gameId,
        )!.version,
      };
      for (const [h, k] of Object.entries(statColumns))
        values[k] = stats[h] ?? 0;
      for (const matchup of this.all(
        "SELECT * FROM play_line_matchups WHERE play_id IN (SELECT id FROM plays WHERE game_id=?) AND (offense_player_id=? OR defense_player_id=?)",
        gameId,
        player.player_id,
        player.player_id,
      )) {
        if (matchup.offense_player_id === player.player_id)
          values[matchup.winner_side === "OL" ? "ol_wins" : "ol_losses"]++;
        if (matchup.defense_player_id === player.player_id)
          values[matchup.winner_side === "DL" ? "dl_wins" : "dl_losses"]++;
      }
      values.lead_blocks = this.one(
        "SELECT count(*) AS n FROM play_participants a JOIN plays p ON p.id=a.play_id WHERE p.game_id=? AND a.player_id=? AND a.role='lead_blocker'",
        gameId,
        player.player_id,
      )!.n;
      this.insert("player_game_stats", values);
    }
    this.db.prepare("DELETE FROM team_game_stats WHERE game_id=?").run(gameId);
    for (const team of [game.home_team_id, game.away_team_id]) {
      const opponent =
        team === game.home_team_id ? game.away_team_id : game.home_team_id;
      const offensive = this.all(
          "SELECT * FROM plays WHERE game_id=? AND offense_team_id=?",
          gameId,
          team,
        ),
        defensive = this.all(
          "SELECT * FROM plays WHERE game_id=? AND defense_team_id=?",
          gameId,
          team,
        );
      const count = (rs: RecordRow[], f: (r: RecordRow) => unknown) =>
        rs.filter(f).length;
      const sum = (rs: RecordRow[], key: string) =>
        rs.reduce((s, r) => s + number(r[key]), 0);
      const rush = offensive.filter(
          (p) => /^(Run|Kneel)$/i.test(p.play_type) && !p.is_sack,
        ),
        pass = offensive.filter(
          (p) => /^(Pass|Spike)$/i.test(p.play_type) && !p.is_sack,
        ),
        complete = pass.filter((p) => p.is_complete);
      this.insert("team_game_stats", {
        game_id: gameId,
        team_id: team,
        opponent_team_id: opponent,
        plays: count(offensive, (p) =>
          /^(Run|Pass|Kneel|Spike)$/i.test(p.play_type),
        ),
        first_downs: sum(offensive, "is_first_down"),
        rushing_attempts: rush.length,
        rushing_yards: sum(rush, "yards"),
        rushing_touchdowns: sum(rush, "is_touchdown"),
        passing_attempts: pass.length,
        passing_completions: complete.length,
        passing_yards: sum(complete, "yards"),
        passing_touchdowns: sum(complete, "is_touchdown"),
        sacks_taken: sum(offensive, "is_sack"),
        sack_yards_lost: -sum(
          offensive.filter((p) => p.is_sack && p.yards < 0),
          "yards",
        ),
        interceptions_thrown: count(
          offensive,
          (p) => p.turnover_type === "interception",
        ),
        fumbles: sum(offensive, "is_fumble"),
        fumbles_lost: sum(offensive, "fumble_lost"),
        offensive_yac: sum(complete, "yac"),
        defensive_sacks: sum(defensive, "is_sack"),
        interceptions_made: count(
          defensive,
          (p) => p.turnover_type === "interception",
        ),
        fumbles_recovered: sum(defensive, "fumble_lost"),
        deflections: count(defensive, (p) =>
          /deflection/i.test(p.defense_result),
        ),
        safeties_forced: sum(defensive, "is_safety"),
        punts: count(offensive, (p) => p.play_type === "Punt"),
        field_goal_attempts: count(
          offensive,
          (p) => p.play_type === "Field Goal",
        ),
        field_goals_made: count(
          offensive,
          (p) => p.play_type === "Field Goal" && p.result === "Kick FG",
        ),
        possession_seconds: offensive.every((p) => p.play_length !== null)
          ? sum(offensive, "play_length")
          : null,
        metric_availability_json: JSON.stringify({
          version: "engine-v2",
          unknown: [
            "drives",
            ...(offensive.some((p) => p.play_length === null)
              ? ["possession_seconds"]
              : []),
          ],
        }),
        calculation_version: "engine-v1",
        source_game_version: this.one(
          "SELECT version FROM game_state WHERE game_id=?",
          gameId,
        )!.version,
      });
    }
  }
  /** Replaces workbook formulas: seed slots and completed-game winners resolve the next round. */
  resolveBracket() {
    const season = this.season().id;
    this.db
      .prepare(
        `UPDATE bracket_slots SET resolved_team_id=(SELECT team_id FROM playoff_seedings WHERE id=source_seed_id),resolved_at=datetime('now') WHERE season_id=? AND source_type IN ('seed','bye')`,
      )
      .run(season);
    this.db
      .prepare(
        `UPDATE bracket_slots SET resolved_team_id=(SELECT CASE WHEN s.home_score>s.away_score THEN g.home_team_id ELSE g.away_team_id END FROM games g JOIN game_state s ON s.game_id=g.id WHERE g.id=source_game_id AND g.status='final' AND s.home_score<>s.away_score),resolved_at=datetime('now') WHERE season_id=? AND source_type='winner'`,
      )
      .run(season);
    for (const game of this.all(
      "SELECT * FROM games WHERE season_id=? AND stage='playoffs' AND status='scheduled'",
      season,
    )) {
      const slots = this.all(
        "SELECT side,resolved_team_id FROM bracket_slots WHERE game_id=? AND side IN ('Home','Away')",
        game.id,
      );
      for (const slot of slots)
        if (slot.resolved_team_id)
          this.db
            .prepare(
              `UPDATE games SET ${slot.side === "Home" ? "home_team_id" : "away_team_id"}=? WHERE id=?`,
            )
            .run(slot.resolved_team_id, game.id);
    }
  }
  frontendSettings() {
    const data = new Map(
      this.all(
        "SELECT table_key,values_json FROM configuration_tables WHERE settings_version_id=?",
        this.settingsVersion(),
      ).map((r) => [r.table_key, parse(r.values_json, {}).data]),
    );
    const get = (key: string) => {
      const v = data.get(key);
      if (v == null) throw new Error(`Missing SQLite configuration: ${key}`);
      return v;
    };
    const rows = this.settingsRows(),
      starts = (s: string) =>
        rows.filter((r) => String(r[0] ?? "").startsWith(s));
    const ranges = (s: string) =>
      starts(s).map((r) => ({
        label: r[0],
        percentage: number(r[1]),
        minYards: number(r[2]),
        maxYards: number(r[3]),
      }));
    let cum = 0;
    const thresholds = starts("RunType_").map((r) => {
      const min = cum;
      cum += number(r[1]);
      return {
        label: r[0],
        minYards: number(r[2]),
        maxYards: number(r[3]),
        rollMin: min,
        rollMax: cum,
      };
    });
    const depths = this.all(
      "SELECT * FROM route_depths WHERE settings_version_id=? ORDER BY sort_order",
      this.settingsVersion(),
    );
    const routes = this.all(
      "SELECT * FROM routes WHERE settings_version_id=? ORDER BY rowid",
      this.settingsVersion(),
    );
    const available = this.all(
      "SELECT * FROM route_depth_eligibility WHERE settings_version_id=? AND is_available=1",
      this.settingsVersion(),
    );
    if (!depths.length || !routes.length)
      throw new Error(
        "Missing normalized route settings. Complete the database imports.",
      );
    const curves: RecordRow = {};
    for (const c of this.all(
      "SELECT * FROM openness_curve_points WHERE settings_version_id=? ORDER BY progress_fraction",
      this.settingsVersion(),
    ))
      (curves[c.curve_type] ??= []).push({
        time: c.progress_fraction,
        openness: c.openness_score,
      });
    const yacBySeparation: RecordRow = {};
    const header =
      rows.find((r) => r[0] === "Separation" && r.length > 4) ?? [];
    for (const row of starts("yacCalc_bySep_")) {
      let c = 0;
      const breaks = header.slice(1).map(Number);
      yacBySeparation[String(row[0]).split("_").pop()!] = breaks.flatMap(
        (b: number, i: number) => {
          const pct = number(row[i + 1]);
          if (!pct) return [];
          const lo = c;
          c += pct;
          return [
            {
              rollMin: lo,
              rollMax: c,
              minYards: i === 0 ? breaks[0] : breaks[i - 1] + 1,
              maxYards: b,
            },
          ];
        },
      );
    }
    return {
      thresholds,
      breakaways: ranges("Break_"),
      accelToLBYards: get("accel_to_lb_yards"),
      secondarySpeedYards: get("secondary_speed_yards"),
      secondaryBreakawayYards: get("secondary_breakaway_yards"),
      negativeYardage: get("negative_yardage"),
      staminaDrains: Object.fromEntries(
        starts("Stamina_Drain_")
          .filter((r) => r[2])
          .map((r) => [String(r[2]), number(r[1])]),
      ),
      tackleTable: starts("Tackle_").map((r) => ({
        label: r[0],
        yardageCap: number(r[1]),
        DL: number(r[2]),
        LB: number(r[3]),
        DBS: number(r[4]),
      })),
      completionTable: get("completion_table"),
      opennessCompletionModifiers: get("openness_completion_modifiers"),
      accuracyModifiers: get("accuracy_modifiers"),
      handsImpactByOpenness: get("hands_impact_by_openness"),
      jumpEffects: get("jump_effects"),
      jumpAirYards: get("jump_air_yards"),
      jumpRoutes: get("jump_routes"),
      yacBasis: get("yac_basis"),
      yacThrowMultipliers: get("yac_throw_multipliers"),
      dbBeatWRAccuracyMultipliers: get("db_beat_wr_accuracy_multipliers"),
      pickAccuracyMultipliers: get("pick_accuracy_multipliers"),
      routeTypeAirYards: depths.map((d) => ({
        label: `routeType_AirYardsReqd_${d.display_name}`,
        routeType: d.display_name,
        minAirYards: d.min_air_yards,
        maxAirYards: d.max_air_yards,
      })),
      routesByDepth: Object.fromEntries(
        depths.map((d) => [
          d.display_name,
          routes
            .filter((r) =>
              available.some(
                (a) => a.route_depth_id === d.id && a.route_id === r.id,
              ),
            )
            .map((r) => r.display_name),
        ]),
      ),
      routeInfo: get("route_preview_metadata").map((r: RecordRow) => ({
        label: r.route,
        routeType: r.route,
        shape: r.shape ?? "",
      })),
      timeNeededToThrow: starts("TNTT_").map((r) => ({
        label: r[0],
        qbRead: r[1],
        lt10: number(r[2]),
        tenTo20: number(r[3]),
        twentyOnePlus: number(r[4]),
      })),
      timeToThrowRanges: get("time_to_throw_ranges"),
      routeOpennessSettings: {
        curves,
        phaseWeights: get("route_phase_weights"),
        baseImpacts: get("base_trait_impacts"),
        baseTTO: Object.fromEntries(
          depths.map((d) => [d.display_name, d.base_time_to_open]),
        ),
        routeTree: Object.fromEntries(
          routes.flatMap((r) =>
            [r.display_name, ...parse(r.aliases_json, [])].map((name) => [
              name,
              {
                type: r.complexity,
                curveType: r.curve_type,
                timingMod: r.timing_modifier,
                phases: {
                  Release: r.release_pct,
                  Stem: r.stem_pct,
                  Break: r.break_pct,
                  Sustain: r.sustain_pct,
                },
              },
            ]),
          ),
        ),
      },
      qbDecisionTable: get("qb_decision_table"),
      completionSeparationAdjustment: starts("separation_").map((r) => ({
        label: r[0],
        separation: number(r[1]),
        catchPctChange: number(r[2]),
      })),
      yacBySeparation,
      sackLossTable: starts("SackLoss_").map((r) => ({
        label: r[0],
        pct: number(r[1]),
        max: number(r[2]),
        min: number(r[3]),
      })),
    };
  }
  async writeUpdates(updates: Array<{ range: string; values: unknown[][] }>) {
    this.db
      .transaction(() => {
        const season = this.season(),
          awards = this.awardsRows();
        const candidates = new Map<number, string>();
        const honors = new Map<number, string>();
        for (const update of updates) {
          const match = /^'?([^'!]+)'?!([A-Z]+)(\d+)(?::[A-Z]+\d+)?$/.exec(
            update.range,
          );
          if (!match)
            throw new Error(`Unsupported SQLite update: ${update.range}`);
          const [, table, col, row] = match;
          const start = Number(row);
          update.values.forEach((values, i) => {
            if (norm(table) === "gameplaysettings") {
              const key = String(this.table(table)[start + i - 1]?.[0] ?? "");
              if (
                col !== "B" ||
                key !== "Visual_Mode" ||
                !["Dark", "Light"].includes(String(values[0]))
              )
                throw new Error("Invalid gameplay preference.");
              this.db
                .prepare(
                  "INSERT INTO app_preferences(key,value_json) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=datetime('now')",
                )
                .run(key, JSON.stringify(values[0]));
            } else if (norm(table) === "season") {
              const week = values[0];
              if (typeof week === "number" && week >= 1 && week <= 13)
                this.db
                  .prepare(
                    "UPDATE seasons SET current_stage='regular',current_week=?,status='regular',updated_at=datetime('now') WHERE id=?",
                  )
                  .run(week, season.id);
              else if (
                [
                  "Divisionals",
                  "Divisional Championships",
                  "National Championship",
                ].includes(String(week))
              )
                this.db
                  .prepare(
                    "UPDATE seasons SET current_stage=?,current_week=NULL,status='postseason',updated_at=datetime('now') WHERE id=?",
                  )
                  .run(week, season.id);
              else throw new Error("Invalid season stage.");
            } else if (norm(table) === "playoff bracket") {
              const seedRow = this.bracketRows()[start + i - 1];
              if (col !== "C" || !seedRow)
                throw new Error("Invalid bracket update.");
              const division = this.one(
                "SELECT id FROM divisions WHERE league_id=? AND name=?",
                season.league_id,
                seedRow[0],
              )!;
              const existing = this.one(
                "SELECT * FROM playoff_seedings WHERE season_id=? AND division_id=? AND seed=?",
                season.id,
                division.id,
                seedRow[1],
              );
              const team = this.teamId(values[0]);
              if (existing && existing.team_id !== team)
                throw new Error(
                  "Playoff seeds already exist and cannot be overwritten.",
                );
              if (!existing)
                this.insert("playoff_seedings", {
                  id: randomUUID(),
                  season_id: season.id,
                  division_id: division.id,
                  seed: seedRow[1],
                  team_id: team,
                  seeded_at: new Date().toISOString(),
                });
            } else if (norm(table) === "awards") {
              if (col === "A") candidates.set(start + i, String(values[0]));
              else if (col === "D") honors.set(start + i, String(values[0]));
              else if (col === "C" && values.every((v) => number(v) === 0)) {
              } // New nominations have no ballots to reset.
              else
                throw new Error(
                  "Award ballots must be saved using the ballot repository.",
                );
            } else throw new Error(`No SQLite writer for ${table}.`);
          });
        }
        if (candidates.size) {
          if (
            this.one(
              "SELECT 1 FROM award_vote_runs WHERE season_id=? AND status IN ('running','completed')",
              season.id,
            )
          )
            throw new Error("Cannot replace nominations after voting begins.");
          this.db
            .prepare("DELETE FROM award_nominations WHERE season_id=?")
            .run(season.id);
          const orders = new Map<string, number>();
          for (const [row, name] of candidates) {
            const code = awards[row - 1]?.[1];
            const def = this.one(
              "SELECT * FROM award_definitions WHERE code=?",
              code,
            );
            if (!def) throw new Error("Unknown award nomination row.");
            const order = (orders.get(code) ?? 0) + 1;
            orders.set(code, order);
            const player = this.playerId(name);
            if (!player) throw new Error("A nominee must be a player.");
            this.insert("award_nominations", {
              id: randomUUID(),
              season_id: season.id,
              award_id: def.id,
              player_id: player,
              team_id: this.rosterTeam(player),
              nomination_order: order,
              selection_source: "gemini",
              nominated_at: new Date().toISOString(),
            });
          }
        }
        const slots = this.all(
          "SELECT * FROM honor_slots WHERE season_id=? ORDER BY sort_order,id",
          season.id,
        );
        const header = awards.findIndex((r) => r[0] === "Position");
        for (const [row, name] of honors) {
          const slot = slots[row - header - 2],
            player = this.playerId(name);
          if (!slot || !player)
            throw new Error("Invalid first-team selection.");
          this.db
            .prepare(
              "INSERT INTO honor_selections(slot_id,player_id,team_id,selection_source,selected_at) VALUES(?,?,?,?,datetime('now')) ON CONFLICT(slot_id) DO UPDATE SET player_id=excluded.player_id,team_id=excluded.team_id,selection_source=excluded.selection_source,selected_at=excluded.selected_at",
            )
            .run(slot.id, player, this.rosterTeam(player), "gemini");
        }
        if (updates.some((u) => u.range.includes("Playoff Bracket")))
          this.ensurePlayoffSchedule();
        this.resolveBracket();
      })
      .immediate();
  }
  rosterTeam(playerId: string) {
    return (
      this.one(
        "SELECT team_id FROM player_team_assignments WHERE season_id=? AND player_id=? AND status='active' AND julianday(effective_from)<=julianday('now') AND (effective_until IS NULL OR julianday(effective_until)>julianday('now'))",
        this.season().id,
        playerId,
      )?.team_id ?? null
    );
  }
  ensurePlayoffSchedule() {
    const season = this.season(),
      divisions = this.all(
        "SELECT * FROM divisions WHERE league_id=? ORDER BY name",
        season.league_id,
      );
    if (divisions.length !== 2)
      throw new Error("Playoffs require two divisions.");
    const makeGame = (round: string, num: number) => {
      let g = this.one(
        "SELECT * FROM games WHERE season_id=? AND legacy_game_number=?",
        season.id,
        num,
      );
      if (!g) {
        this.insert("games", {
          id: randomUUID(),
          season_id: season.id,
          legacy_game_number: num,
          stage: "playoffs",
          playoff_round: round,
          is_neutral_site: round === "National Championship" ? 1 : 0,
        });
        g = this.one(
          "SELECT * FROM games WHERE season_id=? AND legacy_game_number=?",
          season.id,
          num,
        )!;
        this.insert("game_state", { game_id: g.id, phase: "awaiting_toss" });
      }
      return g;
    };
    const finals = divisions.map((d, i) => {
      const first = makeGame("Divisionals", 66 + i),
        second = makeGame("Divisional Championships", 68 + i);
      const seed = (n: number) =>
        this.one(
          "SELECT * FROM playoff_seedings WHERE season_id=? AND division_id=? AND seed=?",
          season.id,
          d.id,
          n,
        )!;
      const slot = (
        game: string,
        side: string,
        type: string,
        source: string,
      ) => {
        if (
          this.one(
            "SELECT 1 FROM bracket_slots WHERE game_id=? AND side=?",
            game,
            side,
          )
        )
          return;
        this.insert("bracket_slots", {
          id: randomUUID(),
          season_id: season.id,
          division_id: d.id,
          round: game === first.id ? "Divisionals" : "Divisional Championships",
          game_id: game,
          side,
          source_type: type,
          source_seed_id: type === "seed" ? source : null,
          source_game_id: type === "winner" ? source : null,
        });
      };
      slot(first.id, "Home", "seed", seed(2).id);
      slot(first.id, "Away", "seed", seed(3).id);
      slot(second.id, "Home", "seed", seed(1).id);
      slot(second.id, "Away", "winner", first.id);
      return second;
    });
    const championship = makeGame("National Championship", 70);
    finals.forEach((g, i) => {
      const side = i === 0 ? "Home" : "Away";
      if (
        !this.one(
          "SELECT 1 FROM bracket_slots WHERE game_id=? AND side=?",
          championship.id,
          side,
        )
      )
        this.insert("bracket_slots", {
          id: randomUUID(),
          season_id: season.id,
          round: "National Championship",
          game_id: championship.id,
          side,
          source_type: "winner",
          source_game_id: g.id,
        });
    });
  }
  saveBallots(award: string, ballots: unknown, original: unknown[][]) {
    return this.db
      .transaction(() => {
        if (JSON.stringify(this.awardsRows()) !== JSON.stringify(original))
          throw new Error("Awards changed during voting. Reload and retry.");
        if (!Array.isArray(ballots) || ballots.length !== 125)
          throw new Error("Voting requires 125 ballots.");
        const season = this.season(),
          def = this.one(
            "SELECT * FROM award_definitions WHERE code=?",
            award,
          )!;
        const nominations = this.all(
          "SELECT n.*,p.display_name FROM award_nominations n JOIN players p ON p.id=n.player_id WHERE n.season_id=? AND n.award_id=?",
          season.id,
          def.id,
        );
        const existingRun = this.one(
          "SELECT * FROM award_vote_runs WHERE season_id=? AND award_id=?",
          season.id,
          def.id,
        );
        if (existingRun && existingRun.status !== "not_started")
          throw new Error("Votes already exist for this award.");
        const version = this.settingsVersion(),
          weights = this.all(
            "SELECT * FROM award_weights WHERE award_id=? AND settings_version_id=?",
            def.id,
            version,
          );
        if (weights.length !== def.nominee_count)
          throw new Error("Missing award point weights in SQLite.");
        const run = existingRun?.id ?? randomUUID();
        if (existingRun)
          this.db
            .prepare(
              "UPDATE award_vote_runs SET status='running',settings_version_id=?,started_at=datetime('now') WHERE id=?",
            )
            .run(version, run);
        else
          this.insert("award_vote_runs", {
            id: run,
            season_id: season.id,
            award_id: def.id,
            settings_version_id: version,
            status: "running",
            started_at: new Date().toISOString(),
          });
        ballots.forEach((ballot: any, i: number) => {
          if (
            !Array.isArray(ballot) ||
            ballot.length !== def.nominee_count ||
            new Set(ballot).size !== def.nominee_count
          )
            throw new Error("Invalid ranked ballot.");
          const id = randomUUID();
          this.insert("award_ballots", {
            id,
            vote_run_id: run,
            ballot_number: i + 1,
          });
          ballot.forEach((name: any, place: number) => {
            const nomination = nominations.find(
              (n) => norm(n.display_name) === norm(name),
            );
            if (!nomination)
              throw new Error("Ballot candidate is not nominated.");
            this.insert("ballot_rankings", {
              ballot_id: id,
              nomination_id: nomination.id,
              place: place + 1,
            });
          });
        });
        this.db
          .prepare(
            "UPDATE award_vote_runs SET status='completed',completed_ballots=125,completed_at=datetime('now') WHERE id=?",
          )
          .run(run);
        const ranks = this.all(
            "SELECT * FROM award_rankings WHERE vote_run_id=?",
            run,
          ),
          tied = ranks.filter((r) => r.rank === 1).length > 1;
        for (const r of ranks)
          this.insert("award_results", {
            id: randomUUID(),
            vote_run_id: run,
            nomination_id: r.nomination_id,
            total_points: r.total_points,
            final_rank: r.rank,
            is_winner: r.rank === 1 && !tied,
            is_tied: r.rank === 1 && tied,
            finalized_at: new Date().toISOString(),
          });
      })
      .immediate();
  }
}
export const repository = () => new LeagueRepository(runtimeDatabase());
/** Transitional row contract for existing pure parsers and award planning only. */
export async function readTableValues(range: string) {
  return repository().table(range.split("!")[0].replace(/^'|'$/g, ""));
}
export async function readTableObjects(range: string) {
  const [headers = [], ...rows] = await readTableValues(range);
  return rows.map((row) =>
    Object.fromEntries(
      headers.map((h: any, i: number) => [String(h), String(row[i] ?? "")]),
    ),
  );
}
export async function writeTableValues(
  updates: Array<{ range: string; values: unknown[][] }>,
) {
  await repository().writeUpdates(updates);
}
