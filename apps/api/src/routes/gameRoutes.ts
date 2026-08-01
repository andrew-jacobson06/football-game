import { Router } from "express";
import {
  appendSheetRow,
  batchUpdateSheetValues,
  readSheetObjects,
  readSheetValues,
} from "../services/sheets.js";

export const gameRoutes = Router();

type Row = (string | number | boolean | null | undefined)[];
const cell = (row: Row, idx: number) => (idx >= 0 ? row[idx] ?? "" : "");
const asNumber = (v: unknown) => Number(v) || 0;
const normHeader = (h: unknown) => String(h || "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function sheetRows(name: string) {
  const rows = (await readSheetValues(`${name}!A1:ZZ`)) as Row[];
  if (!rows.length) throw new Error(`Sheet '${name}' not found or empty.`);
  return { headers: rows[0].map(String), rows: rows.slice(1) };
}
function objectFrom(headers: string[], row: Row) {
  const obj: Record<string, unknown> = {};
  headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
  return obj;
}

async function getGamesList() {
  const { headers, rows } = await sheetRows("Games");
  const idx = (h: string) => headers.indexOf(h);
  return rows
    .filter((row) => cell(row, idx("Id")) !== "")
    .map((row) => ({
      ...objectFrom(headers, row),
      // The UI historically called this value GameId. Keep the alias while also
      // returning every Games sheet column under its workbook header.
      GameId: cell(row, idx("Id")),
    }));
}
async function getGameState(gameId: string) {
  const { headers, rows } = await sheetRows("Games");
  const row = rows.find((r) => String(r[0]) === String(gameId));
  return row ? objectFrom(headers, row) : null;
}
async function getTeamsFromSheet() {
  const { headers, rows } = await sheetRows("Teams");
  return rows.filter((r) => r?.[0] !== "" && r?.[0] != null).slice(0, 10).map((r) => objectFrom(headers, r));
}
async function getStandingsFromSheet() {
  const standings = await readSheetObjects("standings!A1:Z");
  const standingsAbbrev = (row: Record<string, string>) =>
    String(row.Abbrev ?? row.Team ?? row[""] ?? "").trim().toUpperCase();

  // The first standings column is intentionally unlabeled in the workbook.
  // Expose it as Abbrev while otherwise returning the sheet columns verbatim.
  return standings
    .filter((row) => standingsAbbrev(row) !== "")
    .map((row) => ({ ...row, Abbrev: standingsAbbrev(row) }));
}
async function getTeamJerseys() {
  const teams = await getTeamsFromSheet();
  const jerseys = new Map<string, unknown>();
  const add = (key: unknown, jersey: unknown) => {
    const normalized = String(key ?? "").trim().toLowerCase();
    if (normalized && jersey) jerseys.set(normalized, jersey);
  };
  teams.forEach((team) => {
    const jersey = team.Jersey;
    add(team.Team, jersey);
    add(team.Name, jersey);
    add(team.Abbrev, jersey);
  });
  return jerseys;
}
async function getPlayersWithTeamJerseys() {
  const [players, jerseys] = await Promise.all([
    readSheetObjects("Players!A1:AM"),
    getTeamJerseys(),
  ]);
  return players.map((player) => ({
    ...player,
    Jersey: jerseys.get(String(player.Team ?? "").trim().toLowerCase()) ?? "",
  }));
}
async function getTeamPlayers(teamAbbrev: string) {
  const [assignments, players, playerStats, jerseys] = await Promise.all([
    readSheetObjects("PlayerTeams!A1:B"),
    readSheetObjects("Players!A1:AM"),
    readSheetObjects("PlayerStats!A1:AI"),
    getTeamJerseys(),
  ]);
  const teamKey = teamAbbrev.trim().toLowerCase();
  const rosterNames = new Set(
    assignments
      .filter((row) => String(row.Team ?? "").trim().toLowerCase() === teamKey)
      .map((row) => String(row.Name ?? "").trim().toLowerCase())
      .filter(Boolean),
  );
  const playersByName = new Map(
    players.map((player) => [String(player.Name ?? "").trim().toLowerCase(), player]),
  );
  const statsByName = new Map<string, Record<string, string>>();
  playerStats.forEach((stats) => {
    const name = String(stats.Player ?? stats.Name ?? "").trim().toLowerCase();
    if (name && rosterNames.has(name)) statsByName.set(name, stats);
  });

  return [...rosterNames].map((name) => ({
    ...(playersByName.get(name) ?? { Name: assignments.find((row) => String(row.Name).trim().toLowerCase() === name)?.Name ?? name }),
    Team: teamAbbrev,
    Jersey: jerseys.get(teamKey) ?? "",
    Stats: statsByName.get(name) ?? null,
  }));
}
function normalizeSettingLabel(label: unknown) {
  return String(label || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function settingRows(rows: Row[], prefix: string) {
  const normalizedPrefix = normalizeSettingLabel(prefix);
  return rows.filter((r) => normalizeSettingLabel(r[0]).startsWith(normalizedPrefix));
}
async function getFrontendSettingsFromSheet() {
  const { rows } = await sheetRows("Settings");
  let cumulative = 0;

  const thresholds = rows.flatMap((r) => {
    const [label, pctRaw, minYardsRaw, maxYardsRaw] = r;

    const pct = Number(pctRaw);
    const minYards = Number(minYardsRaw);
    const maxYards = Number(maxYardsRaw);

    if (
      typeof label !== "string" ||
      !label.startsWith("RunType_") ||
      !Number.isFinite(pct) ||
      pct <= 0
    ) {
      return [];
    }

    const out = {
      label,
      minYards,
      maxYards,
      rollMin: cumulative,
      rollMax: cumulative + pct,
    };

    cumulative += pct;
    return [out];
  });
  const yacBySeparation: Record<string, unknown[]> = {};
  const yardBreaks = (rows[74] || []).slice(1).map(Number);
  rows.forEach((row) => {
    const label = row[0];
    if (typeof label === "string" && label.startsWith("yacCalc_bySep_")) {
      const sep = Number(label.split("_").pop()); let cum = 0; yacBySeparation[String(sep)] = [];
      for (let i = 0; i < yardBreaks.length; i++) { const pct = Number(row[i + 1]); if (!pct) continue;
        const min = i === 0 ? yardBreaks[0] : yardBreaks[i - 1] + 1; const max = yardBreaks[i];
        yacBySeparation[String(sep)].push({ rollMin: cum, rollMax: cum + pct, minYards: min, maxYards: max }); cum += pct; }
    }
  });
  const staminaDrains: Record<string, number> = {};
  rows.forEach((r) => { if (typeof r[0] === "string" && r[0].startsWith("Stamina_Drain_") && r[2]) staminaDrains[String(r[2])] = Number(r[1]); });
  return {
    thresholds,
    breakaways: settingRows(rows, "Break_").map((r) => ({ label: r[0], percentage: parseFloat(String(r[1])), minYards: parseInt(String(r[2]), 10), maxYards: parseInt(String(r[3]), 10) })),
    accelToLBYards: settingRows(rows, "accel_to_LB_")
      .map((r) => ({
        label: r[0],
        percentage: parseFloat(String(r[1])),
        minYards: parseInt(String(r[2]), 10),
        maxYards: parseInt(String(r[3]), 10),
      }))
      .filter((r) => Number.isFinite(r.percentage) && Number.isFinite(r.minYards) && Number.isFinite(r.maxYards)),
    secondarySpeedYards: settingRows(rows, "speed_lvl2_")
      .map((r) => ({ label: r[0], percentage: parseFloat(String(r[1])), minYards: parseInt(String(r[2]), 10), maxYards: parseInt(String(r[3]), 10) }))
      .filter((r) => Number.isFinite(r.percentage) && Number.isFinite(r.minYards) && Number.isFinite(r.maxYards)),
    secondaryBreakawayYards: settingRows(rows, "Breakaway_")
      .map((r) => ({ label: r[0], percentage: parseFloat(String(r[1])), minYards: parseInt(String(r[2]), 10), maxYards: parseInt(String(r[3]), 10) }))
      .filter((r) => Number.isFinite(r.percentage) && Number.isFinite(r.minYards) && Number.isFinite(r.maxYards)),
    negativeYardage: settingRows(rows, "negative_")
      .map((r) => ({ label: r[0], percentage: parseFloat(String(r[1])), minYards: parseInt(String(r[2]), 10), maxYards: parseInt(String(r[3]), 10) }))
      .filter((r) => Number.isFinite(r.percentage) && Number.isFinite(r.minYards) && Number.isFinite(r.maxYards)),
    staminaDrains,
    tackleTable: settingRows(rows, "Tackle_").map((r) => ({ label: r[0], yardageCap: Number(r[1]), DL: Number(r[2]) || 0, LB: Number(r[3]) || 0, DBS: Number(r[4]) || 0 })).sort((a,b)=>a.yardageCap-b.yardageCap),
    completionTable: settingRows(rows, "airYards_Completion_").map((r) => ({ label: r[0], pastLos: Number(r[1]), baseCompletion: Number(r[2]), percentage: Number(r[3]) })),
    routeTypeAirYards: settingRows(rows, "routeType_AirYardsReqd_").map((r) => ({ label: r[0], routeType: String(r[1]), minAirYards: Number(r[2]), maxAirYards: Number(r[3]) })),
    timeNeededToThrow: settingRows(rows, "TNTT_").map((r) => ({ label: r[0], qbRead: String(r[1]), lt10: Number(r[2]), tenTo20: Number(r[3]), twentyOnePlus: Number(r[4]) })),
    completionSeparationAdjustment: settingRows(rows, "separation_").map((r) => ({ label: r[0], separation: Number(r[1]), catchPctChange: Number(r[2]) })),
    yacBySeparation,
    sackLossTable: settingRows(rows, "SackLoss_").map((r) => ({ label: r[0], pct: Number(r[1]), max: Number(r[2]), min: Number(r[3]) })),
  };
}

const GAMEPLAY_SETTING_VALUES = {
  Visual_Mode: ["Dark", "Light"],
} as const;

async function getGameplaySettingsFromSheet() {
  const { headers, rows } = await sheetRows("GamePlaySettings");
  const variableColumn = headers.findIndex((header) => normHeader(header) === "variable");
  const valueColumn = headers.findIndex((header) => normHeader(header) === "value");
  if (variableColumn === -1 || valueColumn === -1) {
    throw new Error("GamePlaySettings must have Variable and Value columns.");
  }

  return Object.fromEntries(
    rows
      .map((row) => [String(cell(row, variableColumn)).trim(), String(cell(row, valueColumn)).trim()])
      .filter(([variable]) => variable),
  );
}

async function updateGameplaySetting(variable: string, value: string) {
  const allowedValues = GAMEPLAY_SETTING_VALUES[variable as keyof typeof GAMEPLAY_SETTING_VALUES];
  if (!allowedValues || !(allowedValues as readonly string[]).includes(value)) {
    throw new Error(`Invalid GamePlaySettings value for '${variable}'.`);
  }

  const { headers, rows } = await sheetRows("GamePlaySettings");
  const variableColumn = headers.findIndex((header) => normHeader(header) === "variable");
  const valueColumn = headers.findIndex((header) => normHeader(header) === "value");
  const rowIndex = rows.findIndex((row) => String(cell(row, variableColumn)).trim() === variable);
  if (variableColumn === -1 || valueColumn === -1 || rowIndex === -1) {
    throw new Error(`GamePlaySettings variable '${variable}' was not found.`);
  }

  await batchUpdateSheetValues([{
    range: `GamePlaySettings!${columnToLetters(valueColumn + 1)}${rowIndex + 2}`,
    values: [[value]],
  }]);
}
async function getPlayerTraitsFromSheet() {
  const jerseys = await getTeamJerseys();
  const { headers, rows } = await sheetRows("Players"); const headerIndex: Record<string, number> = {};
  headers.forEach((h, i) => { const k = normHeader(h); if (k) headerIndex[k] = i; });
  const val = (row: Row, ...hs: string[]) => { for (const h of hs) { const i = headerIndex[normHeader(h)]; if (i !== undefined) return row[i] ?? ""; } return ""; };
  return rows.filter((r) => val(r, "Team") !== "" && val(r, "Team") != null).map((r) => { const stamina = val(r, "Stamina"); return {
    team: val(r,"Team"), name: val(r,"Name"), position: val(r,"Pos"), offStars: val(r,"Off Stars"), defStars: val(r,"Def Stars"), size: val(r,"Size"), strength: val(r,"Strength"), speed: val(r,"Speed"), stamina, poise: val(r,"Poise"), accuracy: val(r,"Accuracy"), armStrength: val(r,"Arm-Strength","Arm Strength"), readDefense: val(r,"Read Defense"), juke: val(r,"Juke"), vision: val(r,"Vision"), acceleration: val(r,"Acceleration"), routeRunning: val(r,"Route Running"), jump: val(r,"Jump"), hands: val(r,"Hands"), ballsecurity: val(r,"Ball Security"), qbFavorite: val(r,"QB Favorite"), runBlocking: val(r,"Run Blocking"), passProtect: val(r,"Pass Protect"), runStop: val(r,"RunStop","Run Stop"), tackling: val(r,"Tackling"), runDef: val(r,"Run Def"), tackleChance: val(r,"Tackle Chance"), strip: val(r,"Strip"), passRush: val(r,"PassRush","Pass Rush"), sackChance: val(r,"Sack Chance"), ballHawk: val(r,"Ball Hawk"), readQB: val(r,"Read QB"), coverage: val(r,"Coverage"), defPos: val(r,"DefPos","Def Pos"), image: val(r,"Image","Player Image from AI"), translateX: val(r,"translateX"), translateY: val(r,"translateY"), scale: val(r,"scale"), jersey: jerseys.get(String(val(r,"Team")).trim().toLowerCase()) ?? "", carries: 0, fatigue: stamina } });
}
async function getPlayHistory(gameId: string) {
  const { headers, rows } = await sheetRows("PlayHistory");
  const result = rows.filter((r) => String(r[0]) === String(gameId)).map((r) => {
    const obj = objectFrom(headers, r) as Record<string, unknown>;
    if (obj["Defense Result"] !== undefined) { if (obj.DefenseResult === undefined) obj.DefenseResult = obj["Defense Result"]; delete obj["Defense Result"]; }
    if (obj["Turnover?"] !== undefined) { if (obj.Turnover === undefined) obj.Turnover = obj["Turnover?"]; delete obj["Turnover?"]; }
    if (obj.Description !== undefined) { obj.ResultCategory = obj.Result; if (obj.Description !== "") obj.Result = obj.Description; }
    if (obj.newballon !== undefined && obj.NewBallOn === undefined) { obj.NewBallOn = obj.newballon; delete obj.newballon; }
    if (obj.quarter !== undefined && obj.Qtr === undefined) { obj.Qtr = obj.quarter; delete obj.quarter; }
    if (obj.homescore !== undefined && obj.HomeScore === undefined) { obj.HomeScore = obj.homescore; delete obj.homescore; }
    if (obj.awayscore !== undefined && obj.AwayScore === undefined) { obj.AwayScore = obj.awayscore; delete obj.awayscore; }
    return obj;
  });
  const parseTime = (t: unknown) => typeof t === "number" ? t : String(t ?? "0").includes(":") ? String(t).split(":").map(Number).reduce((m,s)=>m*60+s) : Number(t) || 0;
  result.sort((a,b) => (Number(a.QTR ?? a.Qtr ?? 0) - Number(b.QTR ?? b.Qtr ?? 0)) || (parseTime(b.Time) - parseTime(a.Time)));
  return result;
}
function playValueForHeader(play: Record<string, unknown>, header: string) {
  const direct = play[header];
  if (direct !== undefined) return direct;

  const normalized = normHeader(header);
  const aliases: Record<string, string[]> = {
    gameid: ["gameid"],
    playid: ["playid"],
    time: ["time"],
    qtr: ["qtr", "quarter"],
    quarter: ["qtr", "quarter"],
    possession: ["possession"],
    down: ["down"],
    distance: ["distance"],
    ballon: ["ballon"],
    playtype: ["playtype"],
    player: ["player"],
    receiver: ["receiver"],
    yards: ["yards"],
    defensepredicted: ["defensepredicted"],
    predictioncorrect: ["predictioncorrect"],
    tackler: ["tackler"],
    result: ["result"],
    defenseresult: ["defenseresult"],
    turnover: ["turnover"],
    turnoverflag: ["turnover"],
    description: ["description", "desc"],
    recoveredby: ["recoveredby"],
    airyards: ["airyards"],
    newdown: ["newdown"],
    newdist: ["newdist"],
    newdistance: ["newdist"],
    newballon: ["newballon"],
    drivestart: ["drivestart"],
    homescore: ["homescore"],
    awayscore: ["awayscore"],
    lineMatchups: ["lineMatchups", "linematchups"],
    linematchups: ["lineMatchups", "linematchups"],
    olwins: ["olWins", "olwins"],
    ollosses: ["olLosses", "ollosses"],
    dlwins: ["dlWins", "dlwins"],
    dllosses: ["dlLosses", "dllosses"],
    jukes: ["jukes"],
    trucks: ["trucks"],
    brokentackles: ["brokenTackles", "brokentackles"],
    stopreason: ["stopReason", "stopreason"],
    runlog: ["runLog", "runlog"],
  };

  for (const key of aliases[normalized] ?? [normalized]) {
    if (play[key] !== undefined) return play[key];
  }

  return "";
}
function sheetSafe(value: unknown) {
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  if (typeof value === "boolean") return value;
  return value ?? "";
}
function gameStateUpdates(headers: string[], rowIndex: number, game: Record<string, unknown>) {
  const updates: Record<string, unknown> = { Qtr: game.quarter, Time: game.time, Down: game.down, Distance: game.distance, BallOn: game.ballOn, HomeScore: game.homeScore, AwayScore: game.awayScore, DriveStart: game.driveStart, Previous: game.previous, Possession: game.possession, HomeTimeouts: game.homeTimeouts, AwayTimeouts: game.awayTimeouts };
  return Object.entries(updates).flatMap(([key, value]) => {
    const col = headers.indexOf(key);
    return value === undefined || col === -1 ? [] : [{
      range: `Games!${columnToLetters(col + 1)}${rowIndex + 2}`,
      values: [[value]],
    }];
  });
}

function columnToLetters(column: number) {
  let value = column;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - remainder) / 26);
  }
  return letters;
}

function isRetryableSheetError(error: unknown) {
  const status = Number((error as { response?: { status?: unknown }; code?: unknown })?.response?.status
    ?? (error as { code?: unknown })?.code);
  return status === 429 || status >= 500;
}

async function savePlayAndGame(data: Record<string, unknown>, gameId: string) {
  const play = data.play as Record<string, unknown> | undefined;
  const suppliedGame = data.game as Record<string, unknown> | undefined;
  if (!play && !suppliedGame) return;

  const [playSheet, gamesSheet] = await Promise.all([
    play ? sheetRows("PlayHistory") : undefined,
    suppliedGame ? sheetRows("Games") : undefined,
  ]);
  const writes: { range: string; values: unknown[][] }[] = [];

  if (play && playSheet) {
    const playIdColumn = playSheet.headers.findIndex((header) => normHeader(header) === "playid");
    const playId = String(play.playid || play.PlayId || "");
    const alreadySaved = Boolean(playId) && playSheet.rows.some((row) => String(row[playIdColumn] ?? "") === playId);
    if (!alreadySaved) {
      const lastColumn = columnToLetters(playSheet.headers.length);
      writes.push({
        range: `PlayHistory!A${playSheet.rows.length + 2}:${lastColumn}${playSheet.rows.length + 2}`,
        values: [playSheet.headers.map((header) => sheetSafe(playValueForHeader(play, header)))],
      });
    }
  }

  if (suppliedGame && gamesSheet) {
    const game = { ...suppliedGame, gameId: suppliedGame.gameId ?? gameId };
    const rowIndex = gamesSheet.rows.findIndex((row) => String(row[0]) === String(game.gameId));
    if (rowIndex === -1) throw new Error(`No row found for gameId: ${game.gameId}`);
    writes.push(...gameStateUpdates(gamesSheet.headers, rowIndex, game));
  }

  // One Sheets API write request commits the play row and game snapshot together.
  await batchUpdateSheetValues(writes);
}

async function savePlayAndGameWithRetry(data: Record<string, unknown>, gameId: string) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await savePlayAndGame(data, gameId);
      return;
    } catch (error) {
      if (attempt === maxAttempts || !isRetryableSheetError(error)) throw error;
      const backoffMs = 1000 * 2 ** (attempt - 1) + Math.floor(Math.random() * 1000);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

gameRoutes.get("/health", (_req, res) => res.json({ ok: true, app: "football-game-api", message: "API is running" }));
gameRoutes.get("/players", async (_req, res, next) => { try { res.json({ players: await getPlayersWithTeamJerseys() }); } catch (e) { next(e); } });
gameRoutes.get("/player-stats", async (_req, res, next) => { try { res.json({ playerStats: await readSheetObjects("PlayerStats!A1:AI") }); } catch (e) { next(e); } });
gameRoutes.get("/players/:playerName/games", async (req, res, next) => {
  try {
    const [gamesSheet, historySheet] = await Promise.all([sheetRows("Games"), sheetRows("PlayHistory")]);
    const playerName = req.params.playerName.trim().toLowerCase();
    const index = (headers: string[], ...names: string[]) =>
      headers.findIndex((header) => names.includes(normHeader(header)));
    const playGame = index(historySheet.headers, "gameid");
    const playPlayer = index(historySheet.headers, "player", "rusher");
    const playReceiver = index(historySheet.headers, "receiver");
    const playType = index(historySheet.headers, "playtype");
    const playYards = index(historySheet.headers, "yards", "yardsgained");
    const playResult = index(historySheet.headers, "result", "description");
    const playerPlays = historySheet.rows.filter((row) =>
      [cell(row, playPlayer), cell(row, playReceiver)]
        .some((value) => String(value).trim().toLowerCase() === playerName),
    );
    const byGame = new Map<string, Row[]>();
    playerPlays.forEach((row) => {
      const id = String(cell(row, playGame));
      byGame.set(id, [...(byGame.get(id) ?? []), row]);
    });
    const gameId = index(gamesSheet.headers, "id", "gameid");
    const home = index(gamesSheet.headers, "home");
    const away = index(gamesSheet.headers, "away");
    const homeScore = index(gamesSheet.headers, "homescore");
    const awayScore = index(gamesSheet.headers, "awayscore");
    const quarter = index(gamesSheet.headers, "qtr", "quarter");
    const date = index(gamesSheet.headers, "date", "gamedate");
    const possession = index(historySheet.headers, "possession", "team");
    const games = gamesSheet.rows.flatMap((game) => {
      const id = String(cell(game, gameId));
      const plays = byGame.get(id);
      if (!plays?.length || String(cell(game, quarter)).trim().toUpperCase() !== "FINAL") return [];
      const rushingPlays = plays.filter((play) =>
        String(cell(play, playPlayer)).trim().toLowerCase() === playerName &&
        (!cell(play, playType) || /run|rush/i.test(String(cell(play, playType)))),
      );
      const homeTeam = String(cell(game, home));
      const awayTeam = String(cell(game, away));
      const playerTeam = String(cell(plays[0], possession));
      const isHome = playerTeam.toLowerCase() === "home" || playerTeam === homeTeam;
      const teamScore = asNumber(cell(game, isHome ? homeScore : awayScore));
      const opponentScore = asNumber(cell(game, isHome ? awayScore : homeScore));
      const yards = rushingPlays.map((play) => asNumber(cell(play, playYards)));
      const touchdowns = rushingPlays.filter((play) => /touchdown|\btd\b/i.test(String(cell(play, playResult)))).length;
      const isNamed = (play: Row, column: number) => String(cell(play, column)).trim().toLowerCase() === playerName;
      const isPass = (play: Row) => /pass/i.test(String(cell(play, playType)));
      const result = (play: Row) => String(cell(play, playResult));
      const passingPlays = plays.filter((play) => isNamed(play, playPlayer) && isPass(play));
      const passingAttempts = passingPlays.filter((play) => !/sack/i.test(result(play)));
      const completions = passingAttempts.filter((play) => !/incomplete|interception/i.test(result(play)));
      const receivingPlays = plays.filter((play) => isNamed(play, playReceiver) && isPass(play));
      const receptions = receivingPlays.filter((play) => !/incomplete|interception/i.test(result(play)));
      const fumblePlays = plays.filter((play) => (isNamed(play, playPlayer) || isNamed(play, playReceiver)) && /fumble/i.test(result(play)));
      const values = (rows: Row[]) => rows.map((play) => asNumber(cell(play, playYards)));
      const passYards = values(completions);
      const receivingYards = values(receptions);
      return [{ gameId: id, opponent: isHome ? awayTeam : homeTeam, location: isHome ? "vs" : "@",
        result: `${teamScore > opponentScore ? "W" : teamScore < opponentScore ? "L" : "T"} ${teamScore}-${opponentScore}`,
        carries: rushingPlays.length, yards: yards.reduce((sum, value) => sum + value, 0), touchdowns,
        long: Math.max(0, ...yards), date: String(cell(game, date)),
        passing: { completions: completions.length, attempts: passingAttempts.length, yards: passYards.reduce((sum, value) => sum + value, 0), touchdowns: completions.filter((play) => /touchdown|\btd\b/i.test(result(play))).length, interceptions: passingAttempts.filter((play) => /interception/i.test(result(play))).length, long: Math.max(0, ...passYards), sacks: passingPlays.filter((play) => /sack/i.test(result(play))).length },
        rushing: { carries: rushingPlays.length, yards: yards.reduce((sum, value) => sum + value, 0), touchdowns, long: Math.max(0, ...yards) },
        receiving: { receptions: receptions.length, targets: receivingPlays.length, yards: receivingYards.reduce((sum, value) => sum + value, 0), touchdowns: receptions.filter((play) => /touchdown|\btd\b/i.test(result(play))).length, long: Math.max(0, ...receivingYards), firstDowns: 0 },
        fumbles: { total: fumblePlays.length, lost: fumblePlays.filter((play) => /lost|turnover/i.test(result(play))).length },
      }];
    });
    res.json({ games });
  } catch (e) { next(e); }
});
gameRoutes.get("/player-traits", async (_req, res, next) => { try { res.json({ players: await getPlayerTraitsFromSheet() }); } catch (e) { next(e); } });
gameRoutes.get("/teams", async (_req, res, next) => { try { res.json({ teams: await getTeamsFromSheet() }); } catch (e) { next(e); } });
gameRoutes.get("/standings", async (_req, res, next) => { try { res.json({ standings: await getStandingsFromSheet() }); } catch (e) { next(e); } });
gameRoutes.get("/teams/:team/players", async (req, res, next) => { try { res.json({ players: await getTeamPlayers(req.params.team) }); } catch (e) { next(e); } });
gameRoutes.get("/games", async (_req, res, next) => { try { res.json({ games: await getGamesList() }); } catch (e) { next(e); } });
gameRoutes.get("/games/:gameId/state", async (req, res, next) => { try { res.json({ gameState: await getGameState(req.params.gameId) }); } catch (e) { next(e); } });
gameRoutes.get("/games/:gameId/play-history", async (req, res, next) => { try { res.json({ plays: await getPlayHistory(req.params.gameId) }); } catch (e) { next(e); } });
gameRoutes.get("/frontend-settings", async (_req, res, next) => { try { res.json(await getFrontendSettingsFromSheet()); } catch (e) { next(e); } });
gameRoutes.get("/gameplay-settings", async (_req, res, next) => { try { res.json({ settings: await getGameplaySettingsFromSheet() }); } catch (e) { next(e); } });
gameRoutes.put("/gameplay-settings/:variable", async (req, res, next) => {
  try {
    const value = String(req.body?.value ?? "");
    await updateGameplaySetting(req.params.variable, value);
    res.json({ ok: true, variable: req.params.variable, value });
  } catch (e) { next(e); }
});
gameRoutes.post("/games/:gameId/save-play-and-game", async (req, res, next) => { try { await savePlayAndGameWithRetry(req.body, req.params.gameId); res.json({ ok: true }); } catch (e) { next(e); } });

// Legacy route retained for existing callers while LeagueApp uses save-play-and-game.
gameRoutes.post("/plays", async (req, res, next) => {
  try {
    const { game_id, play_number, offense_team_id, defense_team_id, down, distance, yard_line, play_call, result, yards_gained } = req.body;
    const playId = crypto.randomUUID();
    const row = [playId, game_id, play_number, offense_team_id, defense_team_id, down, distance, yard_line, play_call, result, yards_gained, new Date().toISOString()];
    await appendSheetRow("Plays!A:L", row);
    res.json({ ok: true, play: { play_id: playId, game_id, play_number, play_call, result, yards_gained } });
  } catch (error) { next(error); }
});

gameRoutes.get("/game-state", async (_req, res, next) => { try { const rows = await readSheetObjects("GameState!A1:Z"); res.json({ gameState: rows[0] ?? null }); } catch (e) { next(e); } });
