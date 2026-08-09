import { useEffect, useMemo, useRef, useState } from "react";
import type { LeagueGame, GameTab, LeagueTeam } from "./types";
import "./GameCenter.css";
import {
  formatBallOnForPoss,
  formatClock,
  formatDownDistance,
  formatQuarter,
  parseInteger,
} from "./leagueMappers";
import {
  getFrontendSettings,
  getGameState,
  getPlayerStats,
  getTeams,
  getPlayerTraits,
  getPlayHistory,
  savePlayAndGame,
} from "../../api/client";
import { GameScoreboard } from "./GameScoreboard";
import GameField, { type AnimationPlan } from "./GameField";
import { GameControls } from "./GameControls";
import { buildDefense } from "./formationDefense";
import { GameLog } from "./GameLog";
import { PlayerImage } from "../players/PlayerImage";
import {
  goForTwo,
  handleTimeout,
  kickFG,
  kneel,
  passPlay,
  punt,
  runPlay,
  spikeBall,
} from "./gameplay/gameEngine";
import { applyFatigueFromPlayHistory } from "./gameplay/engine/fatigueEngine";
import type {
  FormationSlot,
  FrontendSettings,
  PlayCallOptions,
} from "./gameplay/gameEngine";

const EXPECTED_PLAYERS_PER_SIDE = 8;
const teamValue = (team: LeagueTeam | undefined, key: string) =>
  String(team?.[key] ?? "").trim();
const normalizedTeamKey = (value: unknown) => String(value ?? "").trim().toLowerCase();
const matchesTeam = (team: LeagueTeam, key: unknown) => {
  const wanted = normalizedTeamKey(key);
  return [team.Abbrev, team.Team, team.Name, `${team.Location ?? team.City ?? ""} ${team.Name ?? team.Nickname ?? ""}`]
    .some((value) => normalizedTeamKey(value) === wanted);
};
const isPregame = (game: LeagueGame) => {
  const quarter = String(game.Qtr ?? "").trim().toUpperCase();
  return !quarter || quarter === "0" || quarter === "UNSTARTED" || quarter === "PREGAME";
};

type Play = Record<string, unknown>;
type LineStatMatchup = {
  offensePlayer?: string;
  defensePlayer?: string;
  winner?: "OL" | "DL" | string;
};
/**
 * Converts line matchup data from the play record into a uniform array.
 * The backend may send this as a parsed array or as a JSON string, so this
 * helper accepts both shapes and safely falls back to an empty list when the
 * value is absent or malformed.
 */
function parseLineMatchups(value: unknown): LineStatMatchup[] {
  if (Array.isArray(value)) return value as LineStatMatchup[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as LineStatMatchup[]) : [];
  } catch {
    return [];
  }
}
type Stat = {
  playername: string;
  team: string;
  attempts?: number;
  completions?: number;
  yards: number;
  tds?: number;
  ints?: number;
  carries?: number;
  receptions?: number;
  targets?: number;
  sacks?: number;
  sackYds?: number;
  tackles?: number;
  tfl?: number;
  ff?: number;
  fr?: number;
  deflections?: number;
  fumbles?: number;
  long?: number;
  trucks?: number;
  jukes?: number;
  dLineWins?: number;
  dLineLosses?: number;
  oLineWins?: number;
  oLineLosses?: number;
  leadBlocks?: number;
};
const str = (v: unknown) => String(v ?? "");
const num = (v: unknown) => Number(v) || 0;
/**
 * Reads the first populated value from a play record using several possible
 * key names. Play history can contain backend-style PascalCase, lower-case, or
 * legacy field names, so the UI uses this small compatibility layer instead of
 * hard-coding one spelling everywhere.
 */
const playField = (p: Play, ...keys: string[]) =>
  keys.map((k) => p[k]).find((v) => v !== undefined && v !== null && v !== "");
const logoSrc = (value: unknown) => {
  const src = str(value).trim();
  return src || undefined;
};
/**
 * Renders a team logo when one is available and a football placeholder when it
 * is not. Keeping that fallback in one component prevents every scoreboard,
 * drive, and stats section from repeating the same missing-logo check.
 */
function TeamLogo({
  src,
  className,
  alt = "",
}: {
  src: unknown;
  className: string;
  alt?: string;
}) {
  const resolved = logoSrc(src);
  return resolved ? (
    <img className={className} src={resolved} alt={alt} />
  ) : (
    <span className={`${className} logo-placeholder`} aria-hidden="true">
      🏈
    </span>
  );
}

/**
 * Normalizes frontend settings from the API into the shape expected by the
 * gameplay engine. Older responses use several legacy key names, and missing
 * tables should behave like empty tables rather than crashing play resolution.
 */
function normalizeFrontendSettings(
  settings: Record<string, unknown>,
): FrontendSettings {
  const normalized = settings as FrontendSettings;
  normalized.drainSettings =
    normalized.drainSettings ?? normalized.staminaDrains;
  normalized.tackleSettings =
    normalized.tackleSettings ?? normalized.tackleTable;
  normalized.timeNeededToOpen =
    normalized.timeNeededToOpen ?? normalized.timeNeededToThrow;
  normalized.thresholds = Array.isArray(normalized.thresholds)
    ? normalized.thresholds
    : [];
  normalized.breakaways = Array.isArray(normalized.breakaways)
    ? normalized.breakaways
    : [];
  normalized.accelToLBYards = Array.isArray(normalized.accelToLBYards)
    ? normalized.accelToLBYards
    : [];
  normalized.secondarySpeedYards = Array.isArray(normalized.secondarySpeedYards)
    ? normalized.secondarySpeedYards
    : [];
  normalized.secondaryBreakawayYards = Array.isArray(
    normalized.secondaryBreakawayYards,
  )
    ? normalized.secondaryBreakawayYards
    : [];
  normalized.negativeYardage = Array.isArray(normalized.negativeYardage)
    ? normalized.negativeYardage
    : [];
  normalized.staminaDrains = normalized.staminaDrains ?? {};
  normalized.tackleTable = Array.isArray(normalized.tackleTable)
    ? normalized.tackleTable
    : [];
  normalized.completionTable = Array.isArray(normalized.completionTable)
    ? normalized.completionTable
    : [];
  normalized.routeTypeAirYards = Array.isArray(normalized.routeTypeAirYards)
    ? normalized.routeTypeAirYards
    : [];
  normalized.timeNeededToThrow = Array.isArray(normalized.timeNeededToThrow)
    ? normalized.timeNeededToThrow
    : [];
  normalized.completionSeparationAdjustment = Array.isArray(
    normalized.completionSeparationAdjustment,
  )
    ? normalized.completionSeparationAdjustment
    : [];
  normalized.yacBySeparation = normalized.yacBySeparation ?? {};
  normalized.sackLossTable = Array.isArray(normalized.sackLossTable)
    ? normalized.sackLossTable
    : [];
  return normalized;
}

/**
 * Merges the schedule row with the latest persisted game state. The schedule
 * gives us stable team metadata, while the live state owns mutable fields like
 * score, clock, down, distance, field position, possession, and timeout data.
 */
function normalizeGame(
  game: LeagueGame,
  state: Record<string, unknown> | null,
): LeagueGame {
  if (!state) return game;
  return {
    ...game,
    GameId: (state.Id ?? game.GameId) as string | number,
    Home: str(state.Home ?? game.Home),
    Away: str(state.Away ?? game.Away),
    HomeScore: (state.HomeScore ?? game.HomeScore) as string | number,
    AwayScore: (state.AwayScore ?? game.AwayScore) as string | number,
    Qtr: (state.Qtr ?? game.Qtr) as string | number,
    Time: (state.Time ?? game.Time) as string | number,
    Down: (state.Down ?? game.Down) as string | number,
    Distance: (state.Distance ?? game.Distance) as string | number,
    BallOn: (state.BallOn ?? game.BallOn) as string | number,
    Possession: str(state.Possession ?? game.Possession),
    HomeLogo: str(state.HomeLogo ?? game.HomeLogo ?? ""),
    AwayLogo: str(state.AwayLogo ?? game.AwayLogo ?? ""),
    ...(state as Record<string, unknown>),
  };
}
/**
 * Builds the human-readable play description shown in the log and play-by-play.
 * The branches mirror football outcomes: special teams/conversions first, then
 * sacks/safeties, then passes, and finally standard run results.
 */
function playText(play: Play, game?: LeagueGame): string {
  const description = str(playField(play, "Description", "description")).trim();
  const result = str(playField(play, "Result", "result"));
  const type = str(playField(play, "PlayType", "playtype"));
  const player = str(playField(play, "Player", "Passer", "player"));
  const receiver = str(playField(play, "Receiver", "Target", "receiver"));
  const yards = playField(play, "Yards", "yards") ?? 0;
  const tackler = str(playField(play, "Tackler", "tackler"));
  const possession = str(playField(play, "Possession", "possession"));
  const newBallOn =
    (playField(play, "NewBallOn", "newBallOn", "newballon") as
      | string
      | number) ?? 50;
  const recoveredBy = str(playField(play, "RecoveredBy", "recoveredby"));
  if (result === "Timeout") return `${player} Timeout`;
  if (type === "Kick FG") return "Field Goal is Good!";
  if (type === "Kick XP") return "Extra Point is Good!";
  if (type === "2PT") {
    const success = result.toLowerCase().includes("successful");
    if (receiver)
      return success
        ? `${player} ${yards} yard pass to ${receiver}. 2-point conversion is SUCCESSFUL!`
        : `${player} pass incomplete intended for ${receiver}. 2-point conversion FAILS!`;
    return success
      ? `${player} runs for ${yards} yards. 2-point conversion is SUCCESSFUL!`
      : `${player} run fails. 2-point conversion FAILS!`;
  }
  if (description === "Sack") {
    const spot = formatBallOnForPoss(newBallOn, possession);
    let text = `${player} sacked at the ${spot} for a loss of ${Math.abs(num(yards))}`;
    if (tackler && tackler !== "NA") text += ` (${tackler})`;
    text += ".";
    if (recoveredBy) {
      const recoveryPoss =
        recoveredBy === player
          ? possession
          : possession === "Home"
            ? "Away"
            : "Home";
      text += ` FUMBLE! Recovered by ${recoveredBy} at the ${formatBallOnForPoss(newBallOn, recoveryPoss)}.`;
    }
    return text;
  }
  if (result === "Safety" && type === "Pass" && !receiver) {
    let text = `${player} sacked in the end zone for a safety`;
    if (tackler && tackler !== "NA") text += ` (${tackler})`;
    return `${text}.`;
  }
  if (type === "Pass") {
    const isTouchdown = result.toLowerCase().includes("touchdown");
    let text: string;
    if (result === "Interception") {
      const poss = possession === "Home" ? "Away" : "Home";
      const interceptor = recoveredBy || tackler;
      text = `${player} pass intended for ${receiver}. Intercepted at the ${formatBallOnForPoss(newBallOn, poss)} by ${interceptor}.`;
    } else if (result === "Incomplete") {
      text = `${player} pass intended for ${receiver}. Incomplete.`;
    } else {
      text = `${player} pass to ${receiver}`;
      if (!isTouchdown)
        text += ` to ${formatBallOnForPoss(newBallOn, possession)}`;
      text += ` for ${yards} yards`;
      if (!isTouchdown && tackler && tackler !== "NA") text += ` (${tackler})`;
      text += ".";
    }
    if (
      result &&
      !["Normal", "Fumble", "Interception", "Incomplete"].includes(result)
    ) {
      if (isTouchdown)
        text += ` <span style="color:green; font-weight:bold;">Touchdown!</span>`;
      else if (result === "TO on Downs")
        text += ` <span style="color:red; font-weight:bold;">${result}!</span>`;
      else text += ` <strong>${result}!</strong>`;
    }
    if (result === "Fumble" && recoveredBy) {
      const recoveryPoss =
        recoveredBy === receiver
          ? possession
          : possession === "Home"
            ? "Away"
            : "Home";
      text += ` FUMBLE! Recovered by ${recoveredBy} at the ${formatBallOnForPoss(newBallOn, recoveryPoss)}.`;
    }
    return text;
  }
  let text = `<strong>${player}</strong> runs for ${yards} Yards.`;
  if (result && result !== "Normal" && result !== "Fumble") {
    if (result === "Touchdown")
      text += ` <span style="color:green; font-weight:bold;">${result}!</span>`;
    else if (result === "TO on Downs")
      text += ` <span style="color:red; font-weight:bold;">${result}!</span>`;
    else text += ` <strong>${result}!</strong>`;
  }
  if (result !== "Touchdown" && tackler && tackler !== "NA")
    text += ` Tackle made at the ${formatBallOnForPoss(newBallOn, possession)} by ${tackler}.`;
  if (result === "Fumble" && recoveredBy) {
    const recoveryPoss =
      recoveredBy === player
        ? possession
        : possession === "Home"
          ? "Away"
          : "Home";
    text += ` FUMBLE! Recovered by ${recoveredBy} at the ${formatBallOnForPoss(newBallOn, recoveryPoss)}.`;
  }
  void game;
  return text;
}

type Drive = {
  key: string;
  possession: string;
  driveStart: number;
  plays: Play[];
  result: string;
  homeScore: unknown;
  awayScore: unknown;
  yards: number;
  playsCount: number;
};
/**
 * Groups raw play history into drive sections. A drive is identified by the
 * team in possession plus its starting yard line, then summarized from the last
 * football play in that group so the play-by-play view can show result, score,
 * total yards, and play count.
 */
function groupPlaysByDrive(plays: Play[], game: LeagueGame): Drive[] {
  const drives: Drive[] = [];
  let current: Drive | null = null;
  plays.forEach((play) => {
    const player = playField(play, "Player", "Passer", "player");
    const type = str(playField(play, "PlayType", "playtype"));
    if (!player || (type && !["Run", "Pass"].includes(type))) return;
    const possession = str(playField(play, "Possession", "possession"));
    const driveStart = num(playField(play, "DriveStart", "drivestart"));
    const key = `${possession}-${driveStart}`;
    if (!current || current.key !== key) {
      current = {
        key,
        possession,
        driveStart,
        plays: [],
        result: "",
        homeScore: game.HomeScore,
        awayScore: game.AwayScore,
        yards: 0,
        playsCount: 0,
      };
      drives.push(current);
    }
    current.plays.push(play);
  });
  drives.forEach((drive) => {
    const last = drive.plays[drive.plays.length - 1];
    const lastDescription = str(
      playField(last, "Description", "description"),
    ).trim();
    const lastResult = str(playField(last, "Result", "result"));
    drive.result =
      lastDescription === "Sack" &&
      playField(last, "RecoveredBy", "recoveredby")
        ? "Fumble"
        : lastResult;
    drive.homeScore =
      playField(last, "HomeScore", "homescore") ?? game.HomeScore;
    drive.awayScore =
      playField(last, "AwayScore", "awayscore") ?? game.AwayScore;
    const end = num(playField(last, "NewBallOn", "newBallOn", "newballon"));
    drive.yards =
      drive.possession === "Home"
        ? end - drive.driveStart
        : drive.driveStart - end;
    drive.playsCount = drive.plays.length;
  });
  return drives;
}
/**
 * Displays play history as collapsible drive cards. Each row recomputes its
 * situation from the play snapshot so historical down, distance, ball spot,
 * clock, and quarter remain accurate even after the live game state changes.
 */
function PlayByPlayTab({
  game,
  history,
}: {
  game: LeagueGame;
  history: Play[];
}) {
  return (
    <div className="drive-log" id="playTimeline">
      {groupPlaysByDrive(history, game).map((drive) => (
        <details className="drive-section" key={drive.key} open>
          <summary className="drive-header">
            <span className="drive-toggle" aria-hidden="true">
              ^
            </span>
            <TeamLogo
              className="drive-logo"
              src={drive.possession === "Home" ? game.HomeLogo : game.AwayLogo}
            />
            <span className="drive-overview">
              <span className="drive-result">{drive.result}</span>
              <span className="drive-summary">
                {drive.playsCount} Plays, {drive.yards} Yards
              </span>
            </span>
            <span className="drive-score">
              <span>
                <span className="team-name">{game.Home}</span>{" "}
                <span className="score-value">
                  {String(drive.homeScore ?? "")}
                </span>
              </span>
              <span>
                <span className="team-name">{game.Away}</span>{" "}
                <span className="score-value">
                  {String(drive.awayScore ?? "")}
                </span>
              </span>
            </span>
          </summary>
          <div className="drive-plays">
            {drive.plays.map((play, i) => {
              const downDist = formatDownDistance(
                (playField(play, "Down", "down") as string | number) ?? 1,
                (playField(play, "Distance", "distance") as string | number) ??
                  10,
              );
              const spot = formatBallOnForPoss(
                (playField(play, "BallOn", "ballon") as string | number) ?? 50,
                str(playField(play, "Possession", "possession")),
              );
              return (
                <div
                  className="play-row"
                  key={String(
                    play.PlayId ?? play.playid ?? `${drive.key}-${i}`,
                  )}
                >
                  <div className="play-situation">
                    {downDist} at {spot}
                  </div>
                  <div
                    className="play-desc"
                    dangerouslySetInnerHTML={{
                      __html: `(${formatClock((playField(play, "Time", "time") as string | number) ?? "0:00")} - ${formatQuarter((playField(play, "QTR", "Qtr", "quarter") as string | number) ?? game.Qtr)}) ${playText(play, game)}`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
/**
 * Reconstructs quarter-by-quarter scoring by comparing each play's stored
 * score to the previous play's score. If no history exists, the current score
 * is placed in the first quarter so the chart still has meaningful values.
 */
function scoreByQuarter(history: Play[], game: LeagueGame) {
  const home = [0, 0, 0, 0];
  const away = [0, 0, 0, 0];
  let ph = 0;
  let pa = 0;
  history.forEach((p) => {
    const q = parseInteger(playField(p, "QTR", "Qtr", "quarter"), 0);
    const h = num(playField(p, "HomeScore", "homescore"));
    const a = num(playField(p, "AwayScore", "awayscore"));
    if (q >= 1 && q <= 4) {
      home[q - 1] += h - ph;
      away[q - 1] += a - pa;
    }
    ph = h;
    pa = a;
  });
  if (!history.length) {
    home[0] = num(game.HomeScore);
    away[0] = num(game.AwayScore);
  }
  return { home, away };
}
/**
 * Aggregates player box-score stats from the normalized play history. This is
 * intentionally derived in the UI so passing, rushing, receiving, defensive,
 * and line-play tables all update immediately after an optimistic play result.
 */
function calcStats(history: Play[]) {
  const pass: Stat[] = [],
    rush: Stat[] = [],
    recs: Stat[] = [],
    def: Stat[] = [],
    offball: Stat[] = [];
  const get = (arr: Stat[], name: string, team: string) => {
    let s = arr.find((x) => x.playername === name && x.team === team);
    if (!s) {
      s = { playername: name, team, yards: 0 };
      arr.push(s);
    }
    return s;
  };
  history.forEach((p) => {
    const team = str(playField(p, "Possession", "possession"));
    if (!team) return;
    const defTeam = team === "Home" ? "Away" : "Home";
    const type = str(playField(p, "PlayType", "playtype"));
    const result = str(playField(p, "Result", "ResultCategory", "result"));
    const desc = str(playField(p, "Description", "description"));
    const isSack = desc === "Sack" || result === "Sack";
    const y = num(playField(p, "Yards", "yards"));
    const player = str(playField(p, "Player", "player"));
    const qb = str(playField(p, "Passer", "Player", "player"));
    const receiver = str(playField(p, "Receiver", "Target", "receiver"));
    const tackler = str(playField(p, "Tackler", "tackler"));
    const recoveredBy = str(playField(p, "RecoveredBy", "recoveredby"));
    if (type === "Run" && player) {
      const s = get(rush, player, team);
      s.carries = (s.carries || 0) + 1;
      s.yards += y;
      s.long = Math.max(s.long || 0, y);
      s.trucks =
        (s.trucks || 0) +
        num(playField(p, "Trucks", "trucks", "BrokenTackles", "brokenTackles"));
      s.jukes = (s.jukes || 0) + num(playField(p, "Jukes", "jukes"));
      if (result === "Touchdown") s.tds = (s.tds || 0) + 1;
      if (result === "Fumble") s.fumbles = (s.fumbles || 0) + 1;
    }
    const matchups = parseLineMatchups(
      playField(p, "lineMatchups", "LineMatchups"),
    );
    matchups.forEach((m) => {
      if (m.offensePlayer) {
        const s = get(offball, m.offensePlayer, team);
        if (m.winner === "OL") s.oLineWins = (s.oLineWins || 0) + 1;
        else if (m.winner === "DL") s.oLineLosses = (s.oLineLosses || 0) + 1;
      }
      if (m.defensePlayer) {
        const s = get(def, m.defensePlayer, defTeam);
        if (m.winner === "DL") s.dLineWins = (s.dLineWins || 0) + 1;
        else if (m.winner === "OL") s.dLineLosses = (s.dLineLosses || 0) + 1;
      }
    });
    const leadBlocker = str(
      playField(p, "leadblocker", "LeadBlocker", "leadBlocker"),
    ).trim();
    if (leadBlocker) {
      const s = get(offball, leadBlocker, team);
      s.leadBlocks = (s.leadBlocks || 0) + 1;
    }
    if (type === "Pass" || isSack) {
      if (qb) {
        const s = get(pass, qb, team);
        if (isSack) {
          s.sacks = (s.sacks || 0) + 1;
          s.sackYds = (s.sackYds || 0) + y;
        } else {
          s.attempts = (s.attempts || 0) + 1;
          if (
            !["Incomplete", "Incompletion", "Interception"].includes(result)
          ) {
            s.completions = (s.completions || 0) + 1;
            s.yards += y;
            if (result === "Touchdown") s.tds = (s.tds || 0) + 1;
          }
          if (result === "Interception") s.ints = (s.ints || 0) + 1;
        }
      }
      if (receiver && !isSack) {
        const s = get(recs, receiver, team);
        s.targets = (s.targets || 0) + 1;
        if (!["Incomplete", "Incompletion", "Interception"].includes(result)) {
          s.receptions = (s.receptions || 0) + 1;
          s.yards += y;
          s.long = Math.max(s.long || 0, y);
          if (result === "Touchdown") s.tds = (s.tds || 0) + 1;
        }
        if (result === "Fumble") s.fumbles = (s.fumbles || 0) + 1;
      }
    }
    if (tackler && tackler !== "NA") {
      const s = get(def, tackler, defTeam);
      s.tackles = (s.tackles || 0) + 1;
      if (y < 0 || isSack) s.tfl = (s.tfl || 0) + 1;
      if (isSack) s.sacks = (s.sacks || 0) + 1;
      if (result === "Fumble") {
        s.ff = (s.ff || 0) + 1;
        if (recoveredBy === tackler) s.fr = (s.fr || 0) + 1;
      }
    }
    if (result === "Interception" && (recoveredBy || tackler)) {
      const s = get(def, recoveredBy || tackler, defTeam);
      s.ints = (s.ints || 0) + 1;
    }
  });
  return { pass, rush, recs, def, offball };
}

const avg = (yards = 0, plays = 0) =>
  plays ? (yards / plays).toFixed(1) : "0.0";
const sacksText = (s: Stat) => `${s.sacks || 0}-${Math.abs(s.sackYds || 0)}`;
/**
 * Converts a clock value into seconds. Team-stat possession time math is easier
 * when both MM:SS strings and numeric values are reduced to a single unit.
 */
function parseTimeSeconds(v: unknown) {
  const parts = str(v).split(":").map(Number);
  return parts.length === 2 ? (parts[0] || 0) * 60 + (parts[1] || 0) : num(v);
}
/**
 * Shared table renderer for all player stat groups. It keeps placeholder, team
 * total, header, and cell markup consistent across passing, rushing, receiving,
 * defensive, and off-ball sections.
 */
function TeamTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="stats-group">
      <div className="stats-title">{title}</div>
      <table className="stats-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr
                key={`${r[0]}-${i}`}
                className={
                  String(r[0]).toUpperCase() === "TEAM" ? "team-row" : ""
                }
              >
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="stats-placeholder">
                No stats yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
/**
 * Renders player-level statistics with home, overview, and away subtabs. The
 * row builder functions below filter and total the already-aggregated stat
 * buckets so each table can present either full or condensed columns.
 */
function BoxScoreTab({ game, history }: { game: LeagueGame; history: Play[] }) {
  const [subtab, setSubtab] = useState<"Home" | "Overview" | "Away">("Home");
  const stats = useMemo(() => calcStats(history), [history]);
  const passRows = (team: string, condensed = false) =>
    stats.pass
      .filter((p) => p.team === team)
      .sort((a, b) => b.yards - a.yards)
      .map((p) =>
        condensed
          ? [
              p.playername,
              `${p.completions || 0}/${p.attempts || 0}`,
              p.yards,
              p.tds || 0,
              p.ints || 0,
              sacksText(p),
            ]
          : [
              p.playername,
              `${p.completions || 0}/${p.attempts || 0}`,
              p.yards,
              avg(p.yards, p.completions || 0),
              p.tds || 0,
              p.ints || 0,
              sacksText(p),
              "0.0",
            ],
      );
  const rushRows = (team: string, condensed = false) => {
    const rows = stats.rush
      .filter((p) => p.team === team)
      .sort((a, b) => b.yards - a.yards);
    const total = rows.reduce(
      (t, p) => ({
        carries: t.carries + (p.carries || 0),
        yards: t.yards + p.yards,
        tds: t.tds + (p.tds || 0),
        fumbles: t.fumbles + (p.fumbles || 0),
        trucks: t.trucks + (p.trucks || 0),
        jukes: t.jukes + (p.jukes || 0),
        long: Math.max(t.long, p.long || 0),
      }),
      {
        carries: 0,
        yards: 0,
        tds: 0,
        fumbles: 0,
        trucks: 0,
        jukes: 0,
        long: 0,
      },
    );
    const out = rows.map((p) =>
      condensed
        ? [p.playername, p.carries || 0, p.yards, p.tds || 0, p.long || 0]
        : [
            p.playername,
            p.carries || 0,
            p.yards,
            avg(p.yards, p.carries || 0),
            p.tds || 0,
            p.fumbles || 0,
            p.trucks || 0,
            p.jukes || 0,
            p.long || 0,
          ],
    );
    if (rows.length)
      out.push(
        condensed
          ? ["TEAM", total.carries, total.yards, total.tds, total.long]
          : [
              "TEAM",
              total.carries,
              total.yards,
              avg(total.yards, total.carries),
              total.tds,
              total.fumbles,
              total.trucks,
              total.jukes,
              total.long,
            ],
      );
    return out;
  };
  const recRows = (team: string, condensed = false) => {
    const rows = stats.recs
      .filter((p) => p.team === team)
      .sort((a, b) => b.yards - a.yards);
    const total = rows.reduce(
      (t, p) => ({
        receptions: t.receptions + (p.receptions || 0),
        yards: t.yards + p.yards,
        tds: t.tds + (p.tds || 0),
        long: Math.max(t.long, p.long || 0),
        targets: t.targets + (p.targets || 0),
      }),
      { receptions: 0, yards: 0, tds: 0, long: 0, targets: 0 },
    );
    const out = rows.map((p) =>
      condensed
        ? [p.playername, p.receptions || 0, p.yards, p.tds || 0, p.long || 0]
        : [
            p.playername,
            p.receptions || 0,
            p.yards,
            avg(p.yards, p.receptions || 0),
            p.tds || 0,
            p.long || 0,
            p.targets || 0,
          ],
    );
    if (rows.length)
      out.push(
        condensed
          ? ["TEAM", total.receptions, total.yards, total.tds, total.long]
          : [
              "TEAM",
              total.receptions,
              total.yards,
              avg(total.yards, total.receptions),
              total.tds,
              total.long,
              total.targets,
            ],
      );
    return out;
  };
  const defRows = (team: string) =>
    stats.def
      .filter((p) => p.team === team)
      .sort(
        (a, b) =>
          (b.tackles || 0) - (a.tackles || 0) ||
          (b.dLineWins || 0) - (a.dLineWins || 0),
      )
      .map((p) => [
        p.playername,
        p.tackles || 0,
        p.tfl || 0,
        p.ff || 0,
        p.dLineWins || 0,
        p.dLineLosses || 0,
        p.sacks || 0,
        p.fr || 0,
        p.ints || 0,
        p.deflections || 0,
      ]);
  const offballRows = (team: string) => {
    const rows = stats.offball
      .filter((p) => p.team === team)
      .sort((a, b) => (b.oLineWins || 0) - (a.oLineWins || 0));
    const totals = rows.reduce(
      (total, player) => ({
        wins: total.wins + (player.oLineWins || 0),
        losses: total.losses + (player.oLineLosses || 0),
        leadBlocks: total.leadBlocks + (player.leadBlocks || 0),
      }),
      { wins: 0, losses: 0, leadBlocks: 0 },
    );
    const winPct = (wins: number, losses: number) =>
      `${(wins + losses ? (wins / (wins + losses)) * 100 : 0).toFixed(1)}%`;
    const output: (string | number)[][] = rows.map((p) => [
      p.playername,
      p.oLineWins || 0,
      p.oLineLosses || 0,
      p.leadBlocks || 0,
      winPct(p.oLineWins || 0, p.oLineLosses || 0),
    ]);
    output.push([
      "TEAM",
      totals.wins,
      totals.losses,
      totals.leadBlocks,
      winPct(totals.wins, totals.losses),
    ]);
    return output;
  };
  const teamName = (t: string) => (t === "Home" ? game.Home : game.Away);
  const renderTeam = (team: string) => (
    <>
      <TeamTable
        title={`${teamName(team)} Passing`}
        columns={["Player", "C/ATT", "YDS", "AVG", "TD", "INT", "SACKS", "RTG"]}
        rows={passRows(team)}
      />
      <TeamTable
        title={`${teamName(team)} Rushing`}
        columns={[
          "Player",
          "CAR",
          "YDS",
          "AVG",
          "TD",
          "FUM",
          "TRUCK",
          "JUKE",
          "LONG",
        ]}
        rows={rushRows(team)}
      />
      <TeamTable
        title={`${teamName(team)} Receiving`}
        columns={["Player", "REC", "YDS", "AVG", "TD", "LONG", "TGTS"]}
        rows={recRows(team)}
      />
      <TeamTable
        title={`${teamName(team)} Defensive`}
        columns={[
          "Player",
          "TKL",
          "TFL",
          "FF",
          "DL W",
          "DL L",
          "Sack",
          "FR",
          "INT",
          "Defl",
        ]}
        rows={defRows(team)}
      />
      <TeamTable
        title={`${teamName(team)} Offensive Line`}
        columns={["Player", "OL W", "OL L", "LEAD", "WIN %"]}
        rows={offballRows(team)}
      />
    </>
  );
  return (
    <div className="boxscore-card">
      <div className="boxscore-pill-container">
        {(["Home", "Overview", "Away"] as const).map((t) => (
          <button
            key={t}
            className={`boxscore-pill ${subtab === t ? "active" : ""}`}
            type="button"
            onClick={() => setSubtab(t)}
          >
            {t === "Home" ? game.Home : t === "Away" ? game.Away : t}
          </button>
        ))}
      </div>
      {subtab !== "Overview" ? (
        renderTeam(subtab)
      ) : (
        <div className="overview-section">
          {["Passing", "Rushing", "Receiving"].map((kind) => (
            <div className="stats-row" key={kind}>
              {(["Home", "Away"] as const).map((team) => (
                <div className="team-table" key={team}>
                  {kind === "Passing" && (
                    <TeamTable
                      title={`${teamName(team)} Passing`}
                      columns={["Player", "C/ATT", "YDS", "TD", "INT", "SACKS"]}
                      rows={passRows(team, true)}
                    />
                  )}
                  {kind === "Rushing" && (
                    <TeamTable
                      title={`${teamName(team)} Rushing`}
                      columns={["Player", "CAR", "YDS", "TD", "LONG"]}
                      rows={rushRows(team, true)}
                    />
                  )}
                  {kind === "Receiving" && (
                    <TeamTable
                      title={`${teamName(team)} Receiving`}
                      columns={["Player", "REC", "YDS", "TD", "LONG"]}
                      rows={recRows(team, true)}
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/**
 * Derives team-level totals from play history: yardage, first downs, conversion
 * rates, turnovers, sacks, and possession time. Possession time is calculated
 * from the difference between consecutive clock snapshots.
 */
function computeTeamStats(history: Play[], game: LeagueGame) {
  const init = () => ({
    firstDowns: 0,
    thirdAtt: 0,
    thirdConv: 0,
    fourthAtt: 0,
    fourthConv: 0,
    passYds: 0,
    rushYds: 0,
    passAtt: 0,
    passComp: 0,
    ints: 0,
    sacks: 0,
    sackYds: 0,
    rushAtt: 0,
    fumLost: 0,
    possTime: 0,
    totalYds: 0,
    turnovers: 0,
  });
  const teams = { Home: init(), Away: init() };
  const quarterLen = 15 * 60;
  let prev = {
    Possession: str((game as unknown as Play).StartingPossession || "Home"),
    Time: quarterLen,
    Qtr: 1,
  };
  history.forEach((play) => {
    const team = str(playField(play, "Possession", "possession")) as
      | "Home"
      | "Away";
    if (!teams[team]) return;
    const yards = num(playField(play, "Yards", "yards"));
    const down = num(playField(play, "Down", "down"));
    const distance = num(playField(play, "Distance", "distance"));
    const result = str(playField(play, "Result", "result"));
    const type = str(playField(play, "PlayType", "playtype"));
    const currTime = parseTimeSeconds(playField(play, "Time", "time"));
    const currQtr = num(playField(play, "Qtr", "QTR", "quarter")) || prev.Qtr;
    const diff =
      currQtr === prev.Qtr
        ? prev.Time - currTime
        : prev.Time +
          quarterLen * (currQtr - prev.Qtr - 1) +
          (quarterLen - currTime);
    if (teams[prev.Possession as "Home" | "Away"])
      teams[prev.Possession as "Home" | "Away"].possTime += Math.max(0, diff);
    prev = { Possession: team, Time: currTime, Qtr: currQtr };
    if (type === "Pass") {
      if (
        result === "Sack" ||
        str(playField(play, "Description", "description")) === "Sack"
      ) {
        teams[team].sacks++;
        teams[team].sackYds += yards;
        teams[team].passYds += yards;
      } else {
        teams[team].passAtt++;
        if (!["Incomplete", "Incompletion", "Interception"].includes(result)) {
          teams[team].passComp++;
          teams[team].passYds += yards;
        }
        if (result === "Interception") teams[team].ints++;
        if (
          result === "Fumble" &&
          playField(play, "RecoveredBy", "recoveredby") &&
          playField(play, "RecoveredBy", "recoveredby") !==
            (playField(play, "Receiver", "Target", "receiver") ||
              playField(play, "Player", "player"))
        )
          teams[team].fumLost++;
      }
    } else if (type === "Run") {
      teams[team].rushAtt++;
      teams[team].rushYds += yards;
      if (
        result === "Fumble" &&
        playField(play, "RecoveredBy", "recoveredby") &&
        playField(play, "RecoveredBy", "recoveredby") !==
          playField(play, "Player", "player")
      )
        teams[team].fumLost++;
    }
    if (type === "Run" || type === "Pass") {
      const converted = yards >= distance || result === "Touchdown";
      if (down === 3) {
        teams[team].thirdAtt++;
        if (converted) teams[team].thirdConv++;
      } else if (down === 4) {
        teams[team].fourthAtt++;
        if (converted) teams[team].fourthConv++;
      }
      if (converted) teams[team].firstDowns++;
    }
  });
  (["Home", "Away"] as const).forEach((t) => {
    teams[t].totalYds = teams[t].passYds + teams[t].rushYds;
    teams[t].turnovers = teams[t].fumLost + teams[t].ints;
  });
  return teams;
}
/**
 * Presents team comparison stats side by side. The row descriptors below keep
 * formatting rules close to the labels while allowing simple stat keys and
 * custom formatters to share one table rendering path.
 */
function TeamStatsTab({
  game,
  history,
}: {
  game: LeagueGame;
  history: Play[];
}) {
  const stats = useMemo(() => computeTeamStats(history, game), [history, game]);
  const row = (
    label: string,
    h: string | number,
    a: string | number,
    cls: string,
    indent = "",
  ) => (
    <tr className={`${cls} ${indent}`} key={label}>
      <td>{label}</td>
      <td>{h}</td>
      <td>{a}</td>
    </tr>
  );
  const rows = [
    { label: "1st Downs", key: "firstDowns", cls: "header-row" },
    {
      label: "3rd down efficiency",
      fmt: (t: typeof stats.Home) => `${t.thirdConv}-${t.thirdAtt}`,
      cls: "stat-row",
      indent: "indent-1",
    },
    {
      label: "4th down efficiency",
      fmt: (t: typeof stats.Home) => `${t.fourthConv}-${t.fourthAtt}`,
      cls: "stat-row",
      indent: "indent-1",
    },
    { label: "Total Yards", key: "totalYds", cls: "header-row" },
    {
      label: "Passing",
      key: "passYds",
      cls: "header2-row",
      indent: "indent-1",
    },
    {
      label: "Comp/Att",
      fmt: (t: typeof stats.Home) => `${t.passComp}/${t.passAtt}`,
      cls: "stat-row",
      indent: "indent-2",
    },
    {
      label: "Yards per pass",
      fmt: (t: typeof stats.Home) => avg(t.passYds, t.passAtt),
      cls: "stat-row",
      indent: "indent-2",
    },
    {
      label: "Interceptions thrown",
      key: "ints",
      cls: "stat-row",
      indent: "indent-2",
    },
    {
      label: "Rushing",
      key: "rushYds",
      cls: "header2-row",
      indent: "indent-1",
    },
    {
      label: "Rushing Attempts",
      key: "rushAtt",
      cls: "stat-row",
      indent: "indent-2",
    },
    {
      label: "Yards per rush",
      fmt: (t: typeof stats.Home) => avg(t.rushYds, t.rushAtt),
      cls: "stat-row",
      indent: "indent-2",
    },
    {
      label: "Sacks",
      fmt: (t: typeof stats.Home) => `${t.sacks}-${Math.abs(t.sackYds)}`,
      cls: "header2-row",
      indent: "indent-1",
    },
    { label: "Turnovers", key: "turnovers", cls: "header-row" },
    {
      label: "Fumbles lost",
      key: "fumLost",
      cls: "stat-row",
      indent: "indent-1",
    },
    {
      label: "Interceptions thrown",
      key: "ints",
      cls: "stat-row",
      indent: "indent-1",
    },
    {
      label: "Possession",
      fmt: (t: typeof stats.Home) => formatClock(t.possTime),
      cls: "header-row",
    },
  ];
  return (
    <div className="play-log-card team-stats-card">
      <div className="team-stats-title">TEAM STATS</div>
      <table className="stats-table team-stats-table">
        <thead>
          <tr>
            <th />
            <th>
              <TeamLogo
                className="team-stats-logo"
                src={game.HomeLogo}
                alt={game.Home}
              />
            </th>
            <th>
              <TeamLogo
                className="team-stats-logo"
                src={game.AwayLogo}
                alt={game.Away}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) =>
            row(
              r.label,
              r.key
                ? stats.Home[r.key as keyof typeof stats.Home]
                : r.fmt!(stats.Home),
              r.key
                ? stats.Away[r.key as keyof typeof stats.Away]
                : r.fmt!(stats.Away),
              r.cls,
              r.indent,
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
/**
 * Extracts the current game leaders from the box-score aggregates and renders
 * a compact Gamecast summary. Clicking the card footer jumps to the full box
 * score for deeper player stats.
 */
function LeaderCard({
  game,
  history,
  players,
  setTab,
}: {
  game: LeagueGame;
  history: Play[];
  players: Play[];
  setTab: (t: GameTab) => void;
}) {
  const stats = useMemo(() => calcStats(history), [history]);
  const trait = (name: string) =>
    players.find((p) => str(p.name ?? p.Name) === name);
  const leader = (arr: Stat[], team: string, field: keyof Stat) =>
    arr
      .filter((s) => s.team === team)
      .sort((a, b) => num(b[field]) - num(a[field]))[0];
  const img = (s?: Stat) => {
    const player = s ? trait(s.playername) : undefined;
    return (
      <div className="player-placeholder">
        <PlayerImage player={player} fallback={<span>👤</span>} />
      </div>
    );
  };
  const section = (
    label: string,
    arr: Stat[],
    field: keyof Stat,
    line?: (s: Stat) => string,
  ) => {
    const h = leader(arr, "Home", field),
      a = leader(arr, "Away", field);
    return (
      <>
        <div className="leader-row values">
          <div className="leader-left">
            {img(h)}
            <span className="leader-value">{h ? num(h[field]) : "--"}</span>
          </div>
          <div />
          <div className="leader-right">
            <span className="leader-value">{a ? num(a[field]) : "--"}</span>
            {img(a)}
          </div>
        </div>
        <div className="leader-row names">
          <div className="leader-left">
            {h?.playername}{" "}
            <span className="leader-pos">
              {str(trait(h?.playername || "")?.position)}
            </span>
          </div>
          <div className="leader-center leader-label">{label}</div>
          <div className="leader-right">
            {a?.playername}{" "}
            <span className="leader-pos">
              {str(trait(a?.playername || "")?.position)}
            </span>
          </div>
        </div>
        {line && (
          <div className="leader-row statlines">
            <div className="leader-left">{h && line(h)}</div>
            <div />
            <div className="leader-right">{a && line(a)}</div>
          </div>
        )}
        <div className="leader-divider" />
      </>
    );
  };
  return (
    <div className="leaders-card">
      <div className="leaders-header">GAME LEADERS</div>
      <div className="leaders-team-row">
        <div className="team">
          <TeamLogo src={game.HomeLogo} className="team-logo-small" />
          <span>{game.Home}</span>
        </div>
        <div className="team away">
          <span>{game.Away}</span>
          <TeamLogo src={game.AwayLogo} className="team-logo-small" />
        </div>
      </div>
      <div className="leader-divider" />
      {section(
        "Passing Yards",
        stats.pass,
        "yards",
        (p) =>
          `${p.completions || 0}/${p.attempts || 0}, ${p.yards} YDS, ${p.tds || 0} TD, ${p.ints || 0} INT`,
      )}
      {section(
        "Rushing Yards",
        stats.rush,
        "yards",
        (p) => `${p.carries || 0} CAR, ${p.yards} YDS, ${p.tds || 0} TD`,
      )}
      {section(
        "Receiving Yards",
        stats.recs,
        "yards",
        (p) => `${p.receptions || 0} REC, ${p.yards} YDS, ${p.tds || 0} TD`,
      )}
      {section("Sacks", stats.def, "sacks")}
      {section("Tackles", stats.def, "tackles")}
      <button className="boxscore-link" onClick={() => setTab("boxscore")}>
        Full Box Score
      </button>
    </div>
  );
}
/**
 * Shows the scoring summary by quarter plus current totals. The chart depends
 * on reconstructed scoring from history, while the total column uses the live
 * game state as the authoritative current score.
 */
function ScoreChart({ game, history }: { game: LeagueGame; history: Play[] }) {
  const { home, away } = scoreByQuarter(history, game);
  return (
    <div className="score-chart">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>T</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="team-cell">
              <TeamLogo src={game.HomeLogo} className="team-logo-small" />
              <span>{game.Home}</span>
            </td>
            {home.map((s, i) => (
              <td key={i}>{s}</td>
            ))}
            <td className="total-cell">{game.HomeScore}</td>
          </tr>
          <tr>
            <td className="team-cell">
              <TeamLogo src={game.AwayLogo} className="team-logo-small" />
              <span>{game.Away}</span>
            </td>
            {away.map((s, i) => (
              <td key={i}>{s}</td>
            ))}
            <td className="total-cell">{game.AwayScore}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
const seasonStat = (row: Record<string, string>, ...keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== "") return Number(value) || 0;
  }
  return 0;
};

function PregameMatchup({
  game,
  home,
  away,
  players,
  stats,
}: {
  game: LeagueGame;
  home?: LeagueTeam;
  away?: LeagueTeam;
  players: Play[];
  stats: Record<string, string>[];
}) {
  const playerTeam = new Map(players.map((player) => [normalizedTeamKey(player.name ?? player.Name), player.team ?? player.Team]));
  const categories = [
    { label: "Passing", fields: ["Passing Yards", "Pass Yards", "PassYards"] },
    { label: "Rushing", fields: ["Rushing Yards", "Rush Yards", "Yards"] },
    { label: "Receiving", fields: ["Receiving Yards", "Rec Yards", "RecYards"] },
    { label: "Tackles", fields: ["Tackles", "TKL"] },
    { label: "Sacks", fields: ["Sacks", "SACK"] },
  ];
  const leader = (team: LeagueTeam | undefined, fields: string[]) => stats
    .filter((row) => matchesTeam(team ?? {}, playerTeam.get(normalizedTeamKey(row.Player ?? row.Name))))
    .map((row) => ({ name: String(row.Player ?? row.Name ?? "—"), value: seasonStat(row, ...fields) }))
    .sort((a, b) => b.value - a.value)[0];
  const teamCard = (team: LeagueTeam | undefined, side: "home" | "away") => {
    const abbrev = String(team?.Abbrev ?? (side === "home" ? game.Home : game.Away));
    const uniform = teamValue(team, side === "home" ? "Home Uniform" : "Away Uniform");
    return <article className="pregame-team-card">
      <header><TeamLogo src={team?.Logo} className="pregame-team-logo" alt="" /><div><span>{side} team</span><h2>{teamValue(team, "Location") || teamValue(team, "City")} {teamValue(team, "Name") || abbrev}</h2></div></header>
      <div className="pregame-uniform">{uniform ? <img src={uniform} alt={`${abbrev} ${side} uniform`} /> : <span>Uniform unavailable</span>}</div>
      <section><h3>Season Leaders</h3>{categories.map((category) => { const result = leader(team, category.fields); return <div className="pregame-leader" key={category.label}><span>{category.label}</span><strong>{result?.name ?? "—"}</strong><b>{result?.value.toLocaleString() ?? "—"}</b></div>; })}</section>
    </article>;
  };
  return <section className="pregame-matchup" aria-label="Pregame matchup details"><div className="pregame-heading"><span>Pregame matchup</span><h1>Today's uniforms &amp; season leaders</h1></div><div className="pregame-team-grid">{teamCard(home, "home")}{teamCard(away, "away")}</div></section>;
}

/**
 * Main live-game container. It loads API data, owns the current tab and live
 * game state, coordinates the field/controls components, dispatches play calls
 * to the engine, and persists successful play results back to the backend.
 */
export function GameCenter({
  game,
  onBack,
  onGameUpdate,
}: {
  game: LeagueGame;
  onBack: () => void;
  onGameUpdate?: (game: LeagueGame) => void;
}) {
  const [tab, setTab] = useState<GameTab>("gamecast");
  const [currentGame, setCurrentGame] = useState(game);
  const [history, setHistory] = useState<Play[]>([]);
  const [players, setPlayers] = useState<Play[]>([]);
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [seasonStats, setSeasonStats] = useState<Record<string, string>[]>([]);
  const [settings, setSettings] = useState<FrontendSettings>(
    normalizeFrontendSettings({}),
  );
  const [playOptions, setPlayOptions] = useState<PlayCallOptions>({
    clockMode: "Normal",
    formation: {},
    routes: {},
    reads: {},
    routeDepths: {},
  });
  const [log, setLog] = useState([
    "Loading game state, play history, players, and frontend settings...",
  ]);
  const [isSavingPlay, setIsSavingPlay] = useState(false);
  const [isResettingPlay, setIsResettingPlay] = useState(false);
  const [isGameFieldCollapsed, setIsGameFieldCollapsed] = useState(() => isPregame(game));
  const [settingFormation, setSettingFormation] = useState(false);
  const [autoCloseFormationOnSave, setAutoCloseFormationOnSave] =
    useState(false);
  const [selectedFormationPlayer, setSelectedFormationPlayer] = useState("");
  const [passSetup, setPassSetup] = useState(false);
  const [runSetup, setRunSetup] = useState(false);
  const [selectedPlayType, setSelectedPlayType] = useState<"run" | "pass" | null>(null);
  const [selectedRoutePlayer, setSelectedRoutePlayer] = useState("");
  const [animationRequest, setAnimationRequest] = useState<{
    id: number;
    plan: AnimationPlan;
  } | null>(null);
  const animationSequenceRef = useRef(0);
  const animationResolverRef = useRef<{
    id: number;
    resolve: () => void;
  } | null>(null);
  const previousPossessionRef = useRef(currentGame.Possession);
  const playInFlightRef = useRef(false);
  const ctx = useMemo(
    () => ({ players, settings, historyLength: history.length }),
    [players, settings, history.length],
  );
  const homeTeamDetails = useMemo(() => {
    const homeAbbrev = String(currentGame.Home || "")
      .trim()
      .toLowerCase();
    return teams.find((team) => matchesTeam(team, homeAbbrev));
  }, [currentGame.Home, teams]);
  const awayTeamDetails = useMemo(
    () => teams.find((team) => matchesTeam(team, currentGame.Away)),
    [currentGame.Away, teams],
  );
  useEffect(() => {
    let active = true;
    Promise.all([
      getGameState(game.GameId),
      getPlayHistory(game.GameId),
      getPlayerTraits(),
      getFrontendSettings(),
      getTeams(),
      getPlayerStats(),
    ])
      .then(([stateRes, historyRes, playerRes, settingsRes, teamsRes, statsRes]) => {
        if (!active) return;
        const loadedSettings = normalizeFrontendSettings(settingsRes);
        const loadedTeams = teamsRes.teams as LeagueTeam[];
        const loadedPlayers = playerRes.players.map((player) => {
          const team = loadedTeams.find((candidate) => matchesTeam(candidate, player.team));
          const homePlayer = matchesTeam(team ?? {}, game.Home);
          return {
            ...player,
            jersey: teamValue(team, homePlayer ? "Home Jersey Crop" : "Away Jersey Crop"),
          };
        });
        applyFatigueFromPlayHistory(
          {
            players: loadedPlayers,
            settings: loadedSettings,
            historyLength: historyRes.plays.length,
          },
          historyRes.plays,
        );
        const normalizedGame = normalizeGame(game, stateRes.gameState);
        setCurrentGame(normalizedGame);
        setIsGameFieldCollapsed(isPregame(normalizedGame));
        setHistory(historyRes.plays);
        setPlayers(loadedPlayers);
        setTeams(loadedTeams);
        setSeasonStats(statsRes.playerStats);
        setSettings(loadedSettings);
        setLog(
          historyRes.plays.length
            ? historyRes.plays
                .slice(-20)
                .reverse()
                .map((play) => playText(play))
            : ["Game loaded. No prior play history found."],
        );
      })
      .catch((error: unknown) =>
        setLog((l) => [
          `Failed to load live game data: ${error instanceof Error ? error.message : String(error)}`,
          ...l,
        ]),
      );
    return () => {
      active = false;
    };
  }, [game]);

  useEffect(() => {
    if (previousPossessionRef.current === currentGame.Possession) return;
    previousPossessionRef.current = currentGame.Possession;
    // A new possession means the old offense has left the field, so discard the saved offensive setup, routes, reads, runner, and generated defensive mirror before the next team starts choosing personnel.
    setPlayOptions((options) => ({
      ...options,
      formation: {},
      routes: {},
      reads: {},
      routeDepths: {},
      runner: undefined,
      defense: [],
    }));
    setSettingFormation(false);
    setSelectedFormationPlayer("");
    setPassSetup(false);
    setRunSetup(false);
    setSelectedPlayType(null);
    setSelectedRoutePlayer("");
  }, [currentGame.Possession]);
  const persist = async (result: ReturnType<typeof runPlay>) => {
    if (playInFlightRef.current) return;
    playInFlightRef.current = true;
    const previousGame = currentGame;
    setIsSavingPlay(true);
    const gamePayload = {
      gameId: result.game.GameId,
      quarter: result.game.Qtr,
      time: result.game.Time,
      down: result.game.Down,
      distance: result.game.Distance,
      ballOn: result.game.BallOn,
      homeScore: result.game.HomeScore,
      awayScore: result.game.AwayScore,
      driveStart: (result.game as unknown as Record<string, unknown>)
        .DriveStart,
      previous: currentGame.BallOn,
      possession: result.game.Possession,
      homeTimeouts: (result.game as unknown as Record<string, unknown>)
        .HomeTimeouts,
      awayTimeouts: (result.game as unknown as Record<string, unknown>)
        .AwayTimeouts,
    };
    try {
      await savePlayAndGame(result.game.GameId, {
        play: result.play,
        game: gamePayload,
      });
      const animation = (result.play as Record<string, unknown>).animation;
      if (animation && typeof animation === "object") {
        const id = ++animationSequenceRef.current;
        await new Promise<void>((resolve) => {
          animationResolverRef.current = { id, resolve };
          setAnimationRequest({ id, plan: animation as AnimationPlan });
        });
      }
      // Preserve the pre-snap situation while the play runs. This state change
      // advances the markers and resets the formation only after animation.
      setCurrentGame(result.game);
      onGameUpdate?.(result.game);
      setHistory((h) => [...h, result.play]);
      setLog((l) => [result.text, ...l]);
      setSelectedPlayType(null);
      setPassSetup(false);
      setRunSetup(false);
      setPlayOptions((options) => ({
        ...options,
        runner: undefined,
        routes: {},
        reads: {},
        routeDepths: {},
      }));
    } catch (error) {
      setCurrentGame(previousGame);
      setLog((l) => [
        `Save failed: ${error instanceof Error ? error.message : String(error)}`,
        ...l,
      ]);
    } finally {
      setIsSavingPlay(false);
      playInFlightRef.current = false;
    }
  };
  const action = (label: string, options: PlayCallOptions = playOptions) => {
    if (isSavingPlay || isResettingPlay || playInFlightRef.current) {
      setLog((l) => [
        "Play save in progress; wait for it to finish before snapping again.",
        ...l,
      ]);
      return;
    }
    if (label === "Run Play") void persist(runPlay(currentGame, ctx, options));
    else if (label === "Pass Play")
      void persist(passPlay(currentGame, ctx, options));
    else if (label === "Field Goal") void persist(kickFG(currentGame, ctx));
    else if (label === "Punt") void persist(punt(currentGame, ctx));
    else if (label === "Two Point") void persist(goForTwo(currentGame, ctx));
    else if (label === "Timeout") void persist(handleTimeout(currentGame, ctx));
    else if (label === "Spike") void persist(spikeBall(currentGame, ctx));
    else if (label === "Kneel") void persist(kneel(currentGame, ctx, options));
  };
  const drivePlays = history.filter(
    (p) =>
      str(playField(p, "Possession", "possession")) === currentGame.Possession,
  ).length;
  const driveYards =
    currentGame.Possession === "Home"
      ? num(currentGame.BallOn) -
        num((currentGame as unknown as Play).DriveStart)
      : num((currentGame as unknown as Play).DriveStart) -
        num(currentGame.BallOn);
  const lastPlay = history.length ? playText(history[history.length - 1]) : "";
  return (
    <div id="gameUI">
      <button
        className="back-button league-back-button"
        type="button"
        onClick={onBack}
      >
        ← Back
      </button>
      <GameScoreboard game={currentGame} />
      {/* <div className="spectate-control">
        <label className="spectate-switch">
          <input
            type="checkbox"
            onChange={(e) =>
              setLog((l) => [
                `Spectate ${e.target.checked ? "ON" : "OFF"}`,
                ...l,
              ])
            }
          />
          <span className="spectate-slider" />
        </label>
        <div className="spectate-meta">
          <div className="spectate-label">Spectate</div>
          <div className="spectate-status">OFF</div>
        </div>
      </div> */}
      <div className="tabs">
        {(["gamecast", "playbyplay", "boxscore", "teamstats"] as GameTab[]).map(
          (t) => (
            <button
              key={t}
              className={`tab-button ${tab === t ? "active" : ""}`}
              type="button"
              onClick={() => setTab(t)}
            >
              {t === "gamecast"
                ? "Gamecast"
                : t === "playbyplay"
                  ? "Play-by-Play"
                  : t === "boxscore"
                    ? "Box Score"
                    : "Team Stats"}
            </button>
          ),
        )}
      </div>
      {tab === "gamecast" && (
        <div className="tab-content active">
          <div className="game-info">
            <div className="info-block">
              <div className="info-label">DOWN:</div>
              <div className="info-value">
                {formatDownDistance(currentGame.Down, currentGame.Distance)}
              </div>
            </div>
            <div className="info-block">
              <div className="info-label">BALL ON:</div>
              <div className="info-value">
                {formatBallOnForPoss(
                  currentGame.BallOn,
                  currentGame.Possession,
                )}
              </div>
            </div>
            <div className="info-block">
              <div className="info-label">DRIVE:</div>
              <div className="info-value">
                {drivePlays} plays, {driveYards} yards
              </div>
            </div>
          </div>
          {isPregame(currentGame) && (
            <PregameMatchup
              game={currentGame}
              home={homeTeamDetails}
              away={awayTeamDetails}
              players={players}
              stats={seasonStats}
            />
          )}
          <div
            className={`field-console-stage ${isGameFieldCollapsed ? "field-collapsed" : ""}`}
          >
            <button
              className="game-field-toggle"
              type="button"
              aria-expanded={!isGameFieldCollapsed}
              aria-controls="game-field-panel"
              onClick={() => setIsGameFieldCollapsed((collapsed) => !collapsed)}
            >
              <span>
                {isGameFieldCollapsed ? "Show Gamefield" : "Hide Gamefield"}
              </span>
              <span className="game-field-toggle-icon" aria-hidden="true">
                {isGameFieldCollapsed ? "▾" : "▴"}
              </span>
            </button>
            <div
              id="game-field-panel"
              className="game-field-panel"
              hidden={isGameFieldCollapsed}
            >
              <GameField
                formationMode={settingFormation}
                formation={playOptions.formation}
                defense={playOptions.defense}
                players={players}
                ballOn={currentGame.BallOn}
                distance={currentGame.Distance}
                possession={currentGame.Possession}
                selectedFormationPlayer={selectedFormationPlayer}
                passSetup={passSetup}
                runSetup={runSetup}
                runner={playOptions.runner}
                routes={playOptions.routes}
                routeDepths={playOptions.routeDepths}
                reads={playOptions.reads}
                selectedRoutePlayer={selectedRoutePlayer}
                onRoutePlayerSelect={setSelectedRoutePlayer}
                onPassOptionsChange={(patch) =>
                  setPlayOptions((current) => ({ ...current, ...patch }))
                }
                onPassSetupClose={() => {
                  setPassSetup(false);
                  setSelectedRoutePlayer("");
                }}
                onPassPlay={() => {
                  setPassSetup(false);
                  setSelectedRoutePlayer("");
                }}
                onRunnerSelect={(runner) =>
                  setPlayOptions((current) => ({ ...current, runner }))
                }
                onRunSetupClose={() => setRunSetup(false)}
                homeLogo={
                  teamValue(homeTeamDetails, "Logo") || currentGame.HomeLogo
                }
                homeTeam={currentGame.Home}
                homeTeamName={
                  teamValue(homeTeamDetails, "Name") || currentGame.Home
                }
                homeTeamLocation={
                  teamValue(homeTeamDetails, "Location") || currentGame.Home
                }
                homeTeamPrimaryColor={teamValue(
                  homeTeamDetails,
                  "Primary Color",
                )}
                awayTeam={currentGame.Away}
                animationRequest={animationRequest}
                onAnimationComplete={(id) => {
                  const pending = animationResolverRef.current;
                  if (!pending || pending.id !== id) return;
                  animationResolverRef.current = null;
                  setAnimationRequest(null);
                  pending.resolve();
                }}
                onFormationSlotClick={(slot) => {
                  const currentFormation = playOptions.formation ?? {};
                  const selectedPlayer = selectedFormationPlayer;
                  const slotPlayer = currentFormation[slot];

                  if (!selectedPlayer) {
                    if (slotPlayer) setSelectedFormationPlayer(slotPlayer);
                    return;
                  }

                  const selectedPlayerEntry = Object.entries(
                    currentFormation,
                  ).find(([, player]) => player === selectedPlayer);
                  const selectedPlayerSlot = selectedPlayerEntry?.[0] as
                    | FormationSlot
                    | undefined;
                  const nextFormation = Object.fromEntries(
                    Object.entries(currentFormation).filter(
                      ([formationSlot, player]) =>
                        formationSlot !== slot && player !== selectedPlayer,
                    ),
                  ) as Partial<Record<FormationSlot, string>>;
                  const wouldAddPlayer = !slotPlayer && !selectedPlayerSlot;
                  const currentPlayerCount =
                    Object.values(currentFormation).filter(Boolean).length;

                  if (
                    wouldAddPlayer &&
                    currentPlayerCount >= EXPECTED_PLAYERS_PER_SIDE
                  )
                    return;

                  if (selectedPlayerSlot && slotPlayer) {
                    nextFormation[selectedPlayerSlot] = slotPlayer;
                  }

                  const savedFormation = {
                    ...nextFormation,
                    [slot]: selectedPlayer,
                  };
                  setPlayOptions({
                    ...playOptions,
                    formation: savedFormation,
                    routes: {},
                    reads: {},
                    defense: buildDefense(currentGame, players, savedFormation),
                  });
                  setSelectedFormationPlayer("");
                  if (autoCloseFormationOnSave) {
                    setSettingFormation(false);
                    setAutoCloseFormationOnSave(false);
                  }
                }}
                onPlayerSubstitute={(playerName) => {
                  setSelectedFormationPlayer(playerName);
                  setAutoCloseFormationOnSave(true);
                  setSettingFormation(true);
                }}
                onPlayerChangePosition={(playerName) => {
                  setSelectedFormationPlayer(playerName);
                  setAutoCloseFormationOnSave(true);
                  setSettingFormation(true);
                }}
                onSetupTransitionChange={setIsResettingPlay}
              >
                <GameControls
                  game={currentGame}
                  players={players}
                  options={playOptions}
                  onOptionsChange={setPlayOptions}
                  onAction={action}
                  onFormationModeChange={(active) => {
                    setAutoCloseFormationOnSave(false);
                    setSettingFormation(active);
                  }}
                  onSelectedFormationPlayerChange={setSelectedFormationPlayer}
                  selectedFormationPlayer={selectedFormationPlayer}
                  requestedFormationMode={settingFormation}
                  disabled={isSavingPlay || isResettingPlay}
                  onPassSetupChange={(active) => {
                    setPassSetup(active);
                    setSelectedRoutePlayer("");
                  }}
                  selectedPlayType={selectedPlayType}
                  onPlayTypeChange={(playType) => {
                    setSelectedPlayType(playType);
                    setPlayOptions((current) => ({
                      ...current,
                      ...(playType === "run"
                        ? { routes: {}, reads: {}, routeDepths: {} }
                        : { runner: undefined }),
                    }));
                  }}
                  onRunSetupChange={setRunSetup}
                  canSnap={
                    selectedPlayType === "run"
                      ? Boolean(playOptions.runner)
                      : selectedPlayType === "pass"
                        ? Object.values(playOptions.routes ?? {}).some(Boolean)
                        : false
                  }
                  onSnap={() => {
                    if (selectedPlayType === "run") action("Run Play", playOptions);
                    if (selectedPlayType === "pass") action("Pass Play", playOptions);
                  }}
                />
              </GameField>
            </div>
          </div>
          {lastPlay && (
            <div className="last-play-desc">
              <strong>Last Play:</strong> {lastPlay}
            </div>
          )}
          <ScoreChart game={currentGame} history={history} />
          <LeaderCard
            game={currentGame}
            history={history}
            players={players}
            setTab={setTab}
          />
          <GameLog messages={log} />
        </div>
      )}
      {tab === "playbyplay" && (
        <div className="tab-content active">
          <PlayByPlayTab game={currentGame} history={history} />
        </div>
      )}
      {tab === "boxscore" && (
        <div className="tab-content active">
          <BoxScoreTab game={currentGame} history={history} />
        </div>
      )}
      {tab === "teamstats" && (
        <div className="tab-content active">
          <TeamStatsTab game={currentGame} history={history} />
        </div>
      )}
    </div>
  );
}
