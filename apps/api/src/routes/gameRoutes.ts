import { Router } from "express";
import {
  appendSheetRow,
  readSheetObjects,
  readSheetValues,
  updateSheetCell,
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
  return rows.map((row) => ({
    GameId: cell(row, idx("Id")), Home: cell(row, idx("Home")), Away: cell(row, idx("Away")),
    HomeScore: cell(row, idx("HomeScore")), AwayScore: cell(row, idx("AwayScore")), Qtr: cell(row, idx("Qtr")),
    Time: cell(row, idx("Time")), Down: cell(row, idx("Down")), Distance: cell(row, idx("Distance")),
    BallOn: cell(row, idx("BallOn")), Possession: cell(row, idx("Possession")), HomeLogo: cell(row, idx("HomeLogo")), AwayLogo: cell(row, idx("AwayLogo")),
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
      .map((r) => ({ label: r[0], percentage: parseFloat(String(r[1])), yards: parseInt(String(r[2]), 10) }))
      .filter((r) => Number.isFinite(r.percentage) && Number.isFinite(r.yards)),
    secondarySpeedYards: settingRows(rows, "speed_lvl2_")
      .map((r) => ({ label: r[0], percentage: parseFloat(String(r[1])), minYards: parseInt(String(r[2]), 10), maxYards: parseInt(String(r[3]), 10) }))
      .filter((r) => Number.isFinite(r.percentage) && Number.isFinite(r.minYards) && Number.isFinite(r.maxYards)),
    secondaryBreakawayYards: settingRows(rows, "Breakaway_")
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
async function getPlayerTraitsFromSheet() {
  const { headers, rows } = await sheetRows("Players"); const headerIndex: Record<string, number> = {};
  headers.forEach((h, i) => { const k = normHeader(h); if (k) headerIndex[k] = i; });
  const val = (row: Row, ...hs: string[]) => { for (const h of hs) { const i = headerIndex[normHeader(h)]; if (i !== undefined) return row[i] ?? ""; } return ""; };
  return rows.filter((r) => val(r, "Team") !== "" && val(r, "Team") != null).map((r) => { const stamina = val(r, "Stamina"); return {
    team: val(r,"Team"), name: val(r,"Name"), position: val(r,"Pos"), offStars: val(r,"Off Stars"), defStars: val(r,"Def Stars"), size: val(r,"Size"), strength: val(r,"Strength"), speed: val(r,"Speed"), stamina, poise: val(r,"Poise"), accuracy: val(r,"Accuracy"), armStrength: val(r,"Arm-Strength","Arm Strength"), readDefense: val(r,"Read Defense"), juke: val(r,"Juke"), vision: val(r,"Vision"), acceleration: val(r,"Acceleration"), routeRunning: val(r,"Route Running"), jump: val(r,"Jump"), hands: val(r,"Hands"), ballsecurity: val(r,"Ball Security"), qbFavorite: val(r,"QB Favorite"), runBlocking: val(r,"Run Blocking"), passProtect: val(r,"Pass Protect"), runStop: val(r,"RunStop","Run Stop"), tackling: val(r,"Tackling"), runDef: val(r,"Run Def"), tackleChance: val(r,"Tackle Chance"), strip: val(r,"Strip"), passRush: val(r,"PassRush","Pass Rush"), sackChance: val(r,"Sack Chance"), ballHawk: val(r,"Ball Hawk"), readQB: val(r,"Read QB"), coverage: val(r,"Coverage"), defPos: val(r,"DefPos","Def Pos"), image: val(r,"Image","Player Image from AI"), translateX: val(r,"translateX"), translateY: val(r,"translateY"), scale: val(r,"scale"), jersey: val(r,"jersey","Jersey","Jersey Image"), carries: 0, fatigue: stamina } });
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
async function logPlayHistory(play: Record<string, unknown>) {
  const descriptionValue = play.description ?? play.desc ?? "";
  await appendSheetRow("PlayHistory!A:AA", [String(play.gameid || ""), String(play.playid || ""), asNumber(play.time), asNumber(play.qtr), String(play.possession || ""), asNumber(play.down), asNumber(play.distance), asNumber(play.ballon), String(play.playtype || ""), String(play.player || ""), String(play.receiver || ""), asNumber(play.yards), String(play.defensepredicted || ""), play.predictioncorrect === true || play.predictioncorrect === "true", String(play.tackler || ""), String(play.result || ""), String(play.defenseresult || ""), String(play.turnover || ""), String(descriptionValue || ""), String(play.recoveredby || ""), asNumber(play.airyards), asNumber(play.newdown), asNumber(play.newdist), asNumber(play.newballon), asNumber(play.drivestart), asNumber(play.homescore), asNumber(play.awayscore)]);
}
async function pushGameState(game: Record<string, unknown>) {
  const { headers, rows } = await sheetRows("Games"); const rowIndex = rows.findIndex((r) => String(r[0]) === String(game.gameId)); if (rowIndex === -1) throw new Error(`No row found for gameId: ${game.gameId}`);
  const updates: Record<string, unknown> = { Qtr: game.quarter, Time: game.time, Down: game.down, Distance: game.distance, BallOn: game.ballOn, HomeScore: game.homeScore, AwayScore: game.awayScore, DriveStart: game.driveStart, Previous: game.previous, Possession: game.possession, HomeTimeouts: game.homeTimeouts, AwayTimeouts: game.awayTimeouts };
  await Promise.all(Object.entries(updates).map(([key, value]) => { const col = headers.indexOf(key); return value === undefined || col === -1 ? undefined : updateSheetCell("Games", rowIndex + 2, col + 1, value); }).filter(Boolean) as Promise<unknown>[]);
}

gameRoutes.get("/health", (_req, res) => res.json({ ok: true, app: "football-game-api", message: "API is running" }));
gameRoutes.get("/players", async (_req, res, next) => { try { res.json({ players: await readSheetObjects("Players!A1:AM") }); } catch (e) { next(e); } });
gameRoutes.get("/player-traits", async (_req, res, next) => { try { res.json({ players: await getPlayerTraitsFromSheet() }); } catch (e) { next(e); } });
gameRoutes.get("/teams", async (_req, res, next) => { try { res.json({ teams: await getTeamsFromSheet() }); } catch (e) { next(e); } });
gameRoutes.get("/games", async (_req, res, next) => { try { res.json({ games: await getGamesList() }); } catch (e) { next(e); } });
gameRoutes.get("/games/:gameId/state", async (req, res, next) => { try { res.json({ gameState: await getGameState(req.params.gameId) }); } catch (e) { next(e); } });
gameRoutes.get("/games/:gameId/play-history", async (req, res, next) => { try { res.json({ plays: await getPlayHistory(req.params.gameId) }); } catch (e) { next(e); } });
gameRoutes.get("/frontend-settings", async (_req, res, next) => { try { res.json(await getFrontendSettingsFromSheet()); } catch (e) { next(e); } });
gameRoutes.post("/games/:gameId/save-play-and-game", async (req, res, next) => { try { const data = req.body; if (data.play) await logPlayHistory(data.play); if (data.game) await pushGameState({ ...data.game, gameId: data.game.gameId ?? req.params.gameId }); res.json({ ok: true }); } catch (e) { next(e); } });

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
