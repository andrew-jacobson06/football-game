import { Router } from "express";
import {
  repository,
  readTableObjects,
  readTableValues,
  writeTableValues,
} from "../db/leagueRepository.js";
import { parsePlayerStats } from "../services/playerStats.js";
import { parsePlayoffBracket } from "../services/playoffBracket.js";
import {
  AwardsError,
  AWARD_COUNTS,
  awardsPlayers,
  parseAwards,
  type AwardId,
} from "../services/awards.js";
import {
  awardView,
  prepareAwardNominations,
  runAwardVote,
} from "../services/awardsWorkflow.js";

import {
  planSeasonAdvance,
  seasonAdvanceWrites,
  SeasonProgressionError,
} from "../services/seasonProgression.js";
import { parseSeasonWeek } from "../../../web/src/components/league/seasonWeeks.js";
import type {
  LeagueGame,
  LeagueTeam,
} from "../../../web/src/components/league/types.js";

export const gameRoutes = Router();

type Row = (string | number | boolean | null | undefined)[];
const cell = (row: Row, idx: number) => (idx >= 0 ? (row[idx] ?? "") : "");
const normHeader = (h: unknown) =>
  String(h || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

async function tableRows(name: string) {
  const rows = (await readTableValues(`${name}!A1:ZZ`)) as Row[];
  if (!rows.length)
    throw new Error(`SQLite table view '${name}' not found or empty.`);
  return { headers: rows[0].map(String), rows: rows.slice(1) };
}
async function getSeasonWeek() {
  const { headers, rows } = await tableRows("Season");
  const variableIndex = headers.findIndex(
    (header) => normHeader(header) === "variable",
  );
  const valueIndex = headers.findIndex(
    (header) => normHeader(header) === "value",
  );
  const weekRow = rows.find(
    (row) => normHeader(cell(row, variableIndex)) === "week",
  );
  const week = parseSeasonWeek(cell(weekRow ?? [], valueIndex));
  if (variableIndex === -1 || valueIndex === -1 || !weekRow || week === null) {
    throw new SeasonProgressionError(
      "Season Week must be 1–13, Divisionals, Divisional Championships, or National Championship.",
    );
  }
  return {
    week,
    rowNumber: rows.indexOf(weekRow) + 2,
    valueColumn: valueIndex,
  };
}
// Serialize season advancement and awards writes within this API instance.
let awardsBusy = false;
async function withAwardsLock<T>(work: () => Promise<T>) {
  if (awardsBusy)
    throw new AwardsError(
      "Awards or season advancement is already running. Please wait.",
    );
  awardsBusy = true;
  try {
    return await work();
  } finally {
    awardsBusy = false;
  }
}
async function awardsContext() {
  const [players, stats, teams, assignments, standings, games] =
    await Promise.all([
      readTableObjects("Players!A1:AM"),
      getPlayerSeasonStats(),
      getTeamsFromDatabase(),
      readTableObjects("PlayerTeams!A1:B"),
      getStandingsFromDatabase(),
      getGamesList(),
    ]);
  return {
    players: awardsPlayers(players, stats, teams, assignments),
    standings,
    games: (games as unknown as LeagueGame[]).filter(
      (g) => typeof parseSeasonWeek(g.Week) === "number",
    ),
  };
}
async function advanceSeasonWeek() {
  const season = await getSeasonWeek();
  const games = (await getGamesList()) as unknown as LeagueGame[];
  const [standings, teams, bracket] =
    season.week === 13
      ? await Promise.all([
          getStandingsFromDatabase(),
          getTeamsFromDatabase(),
          readTableValues("'Playoff Bracket'!A1:C7"),
        ])
      : [[], [], []];
  const plan = planSeasonAdvance(
    season.week,
    games,
    standings,
    teams as LeagueTeam[],
    bracket,
  );
  const column = String.fromCharCode(65 + season.valueColumn);
  const updates = seasonAdvanceWrites(
    plan,
    `Season!${column}${season.rowNumber}`,
  );
  if (season.week === 13) {
    const rows = await readTableValues("'Awards'!A1:K");
    const nominations = await prepareAwardNominations(
      rows,
      await awardsContext(),
    );
    if (
      JSON.stringify(await readTableValues("'Awards'!A1:K")) !==
      JSON.stringify(rows)
    )
      throw new AwardsError(
        "Awards changed while nominations were being generated. No season changes were saved.",
      );
    updates.unshift(...nominations);
  }
  // Names, vote resets, playoff seeds and week advance commit together; Total formulas stay intact.
  await writeTableValues(updates);
  return plan.nextWeek;
}
function objectFrom(headers: string[], row: Row) {
  const obj: Record<string, unknown> = {};
  headers.forEach((h, i) => (obj[h] = row[i] ?? ""));
  return obj;
}

async function getGamesList() {
  const { headers, rows } = await tableRows("Games");
  const idx = (h: string) => headers.indexOf(h);
  return rows
    .filter((row) => cell(row, idx("Id")) !== "")
    .map((row) => ({
      ...objectFrom(headers, row),
      // Keep legacy numeric game IDs at the API boundary.
      GameId: cell(row, idx("Id")),
    }));
}
async function getPublishedArticles() {
  const { headers, rows } = await tableRows("Articles");
  const articles = rows
    .map((row) => objectFrom(headers, row))
    .filter((article) => String(article.Id ?? "").trim() !== "")
    .filter(
      (article) =>
        String(article.Status ?? "")
          .trim()
          .toLowerCase() === "published",
    )
    .sort((left, right) => {
      const leftTime = Date.parse(String(left.PublishedAt ?? ""));
      const rightTime = Date.parse(String(right.PublishedAt ?? ""));
      return (
        (Number.isNaN(rightTime) ? 0 : rightTime) -
        (Number.isNaN(leftTime) ? 0 : leftTime)
      );
    })
    .map((article) => ({
      id: String(article.Id ?? ""),
      season: Number(article.Season) || 0,
      week: Number(article.Week) || 0,
      gameId: String(article.GameId ?? ""),
      type: String(article.Type ?? ""),
      title: String(article.Title ?? ""),
      summary: String(article.Summary ?? ""),
      articleMarkdown: String(article.Article ?? ""),
      publishedAt: String(article.PublishedAt ?? ""),
      featured:
        String(article.Featured ?? "")
          .trim()
          .toLowerCase() === "true",
      heroImageUrl: String(article.HeroImageUrl ?? ""),
    }));

  return articles;
}
async function getGameState(gameId: string) {
  const repo = repository();
  const game = repo.game(gameId);
  return repo.games().find((row) => row.DatabaseId === game.id) ?? null;
}
async function getTeamsFromDatabase() {
  const { headers, rows } = await tableRows("Teams");
  return rows
    .filter((r) => r?.[0] !== "" && r?.[0] != null)
    .map((r) => objectFrom(headers, r));
}
async function getStandingsFromDatabase() {
  const standings = await readTableObjects("standings!A1:Z");
  const standingsAbbrev = (row: Record<string, string>) =>
    String(row.Abbrev ?? row.Team ?? row[""] ?? "")
      .trim()
      .toUpperCase();

  // The first standings column is intentionally unlabeled in the workbook.
  // Expose it as Abbrev while otherwise returning the sheet columns verbatim.
  return standings
    .filter((row) => standingsAbbrev(row) !== "")
    .map((row) => ({ ...row, Abbrev: standingsAbbrev(row) }));
}
async function getTeamJerseys(
  column: "Home Jersey Crop" | "Away Jersey Crop" = "Away Jersey Crop",
) {
  const teams = await getTeamsFromDatabase();
  const jerseys = new Map<string, unknown>();
  const add = (key: unknown, jersey: unknown) => {
    const normalized = String(key ?? "")
      .trim()
      .toLowerCase();
    if (normalized && jersey) jerseys.set(normalized, jersey);
  };
  teams.forEach((team) => {
    const jersey = team[column];
    add(team.Team, jersey);
    add(team.Name, jersey);
    add(team.Abbrev, jersey);
  });
  return jerseys;
}
async function getPlayersWithTeamJerseys() {
  const [players, jerseys] = await Promise.all([
    readTableObjects("Players!A1:AM"),
    getTeamJerseys("Away Jersey Crop"),
  ]);
  return players.map((player) => ({
    ...player,
    Jersey:
      jerseys.get(
        String(player.Team ?? "")
          .trim()
          .toLowerCase(),
      ) ?? "",
  }));
}
async function getTeamPlayers(teamAbbrev: string) {
  const teamId = repository().teamId(teamAbbrev);
  if (!teamId) return [];
  const [assignments, players, playerStats, jerseys] = await Promise.all([
    readTableObjects("PlayerTeams!A1:B"),
    readTableObjects("Players!A1:AM"),
    Promise.resolve(repository().playerStats(teamId)),
    getTeamJerseys("Away Jersey Crop"),
  ]);
  const teamKey = teamAbbrev.trim().toLowerCase();
  const rosterNames = new Set(
    assignments
      .filter(
        (row) =>
          String(row.Team ?? "")
            .trim()
            .toLowerCase() === teamKey,
      )
      .map((row) =>
        String(row.Name ?? "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
  const playersByName = new Map(
    players.map((player) => [
      String(player.Name ?? "")
        .trim()
        .toLowerCase(),
      player,
    ]),
  );
  const statsByName = new Map<string, Record<string, string>>();
  playerStats.forEach((stats) => {
    const name = String(stats.Player ?? stats.Name ?? "")
      .trim()
      .toLowerCase();
    if (name) { rosterNames.add(name); statsByName.set(name, stats); }
  });

  return [...rosterNames].map((name) => ({
    ...(playersByName.get(name) ?? {
      Name:
        assignments.find(
          (row) => String(row.Name).trim().toLowerCase() === name,
        )?.Name ?? name,
    }),
    Team: teamAbbrev,
    Jersey: jerseys.get(teamKey) ?? "",
    Stats: statsByName.get(name) ?? {},
  }));
}
async function getFrontendSettingsFromDatabase() {
  return repository().frontendSettings();
}

const GAMEPLAY_SETTING_VALUES = {
  Visual_Mode: ["Dark", "Light"],
} as const;

async function getGameplaySettingsFromDatabase() {
  const { headers, rows } = await tableRows("GamePlaySettings");
  const variableColumn = headers.findIndex(
    (header) => normHeader(header) === "variable",
  );
  const valueColumn = headers.findIndex(
    (header) => normHeader(header) === "value",
  );
  if (variableColumn === -1 || valueColumn === -1) {
    throw new Error("GamePlaySettings must have Variable and Value columns.");
  }

  return Object.fromEntries(
    rows
      .map((row) => [
        String(cell(row, variableColumn)).trim(),
        String(cell(row, valueColumn)).trim(),
      ])
      .filter(([variable]) => variable),
  );
}

async function updateGameplaySetting(variable: string, value: string) {
  const allowedValues =
    GAMEPLAY_SETTING_VALUES[variable as keyof typeof GAMEPLAY_SETTING_VALUES];
  if (!allowedValues || !(allowedValues as readonly string[]).includes(value)) {
    throw new Error(`Invalid GamePlaySettings value for '${variable}'.`);
  }

  const { headers, rows } = await tableRows("GamePlaySettings");
  const variableColumn = headers.findIndex(
    (header) => normHeader(header) === "variable",
  );
  const valueColumn = headers.findIndex(
    (header) => normHeader(header) === "value",
  );
  const rowIndex = rows.findIndex(
    (row) => String(cell(row, variableColumn)).trim() === variable,
  );
  if (variableColumn === -1 || valueColumn === -1 || rowIndex === -1) {
    throw new Error(`GamePlaySettings variable '${variable}' was not found.`);
  }

  await writeTableValues([
    {
      range: `GamePlaySettings!${columnToLetters(valueColumn + 1)}${rowIndex + 2}`,
      values: [[value]],
    },
  ]);
}
async function getPlayerTraitsFromDatabase() {
  // Player-trait consumers outside a live matchup (including stats views) use
  // the away crop. GameCenter replaces this with the matchup-specific crop.
  const jerseys = await getTeamJerseys("Away Jersey Crop");
  const { headers, rows } = await tableRows("Players");
  const headerIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    const k = normHeader(h);
    if (k) headerIndex[k] = i;
  });
  const val = (row: Row, ...hs: string[]) => {
    for (const h of hs) {
      const i = headerIndex[normHeader(h)];
      if (i !== undefined) return row[i] ?? "";
    }
    return "";
  };
  return rows
    .filter((r) => val(r, "Team") !== "" && val(r, "Team") != null)
    .map((r) => {
      const stamina = val(r, "Stamina");
      return {
        team: val(r, "Team"),
        name: val(r, "Name"),
        position: val(r, "Pos"),
        offStars: val(r, "Off Stars"),
        defStars: val(r, "Def Stars"),
        size: val(r, "Size"),
        strength: val(r, "Strength"),
        speed: val(r, "Speed"),
        stamina,
        poise: val(r, "Poise"),
        accuracy: val(r, "Accuracy"),
        armStrength: val(r, "Arm-Strength", "Arm Strength"),
        readDefense: val(r, "Read Defense"),
        juke: val(r, "Juke"),
        vision: val(r, "Vision"),
        acceleration: val(r, "Acceleration"),
        routeRunning: val(r, "Route Running"),
        jump: val(r, "Jump"),
        hands: val(r, "Hands"),
        ballsecurity: val(r, "Ball Security"),
        qbFavorite: val(r, "QB Favorite"),
        runBlocking: val(r, "Run Blocking"),
        passProtect: val(r, "Pass Protect"),
        runStop: val(r, "RunStop", "Run Stop"),
        tackling: val(r, "Tackling"),
        runDef: val(r, "Run Def"),
        tackleChance: val(r, "Tackle Chance"),
        strip: val(r, "Strip"),
        passRush: val(r, "PassRush", "Pass Rush"),
        sackChance: val(r, "Sack Chance"),
        ballHawk: val(r, "Ball Hawk"),
        readQB: val(r, "Read QB"),
        coverage: val(r, "Coverage"),
        defPos: val(r, "DefPos", "Def Pos"),
        image: val(r, "Image", "Player Image from AI"),
        translateX: val(r, "translateX"),
        translateY: val(r, "translateY"),
        scale: val(r, "scale"),
        jersey: jerseys.get(String(val(r, "Team")).trim().toLowerCase()) ?? "",
        carries: 0,
        fatigue: stamina,
      };
    });
}
async function getPlayHistory(gameId: string) {
  const plays = repository().history(gameId);
  const result = plays.map((play) => {
    // Preserve NULL tracking facts on historical plays; unknown is not zero.
    const obj = { ...play } as Record<string, unknown>;
    if (obj["Defense Result"] !== undefined) {
      if (obj.DefenseResult === undefined)
        obj.DefenseResult = obj["Defense Result"];
      delete obj["Defense Result"];
    }
    if (obj["Turnover?"] !== undefined) {
      if (obj.Turnover === undefined) obj.Turnover = obj["Turnover?"];
      delete obj["Turnover?"];
    }
    if (obj.Description !== undefined) {
      obj.ResultCategory = obj.Result;
      if (obj.Description !== "") obj.Result = obj.Description;
    }
    if (obj.newballon !== undefined && obj.NewBallOn === undefined) {
      obj.NewBallOn = obj.newballon;
      delete obj.newballon;
    }
    if (obj.quarter !== undefined && obj.Qtr === undefined) {
      obj.Qtr = obj.quarter;
      delete obj.quarter;
    }
    if (obj.homescore !== undefined && obj.HomeScore === undefined) {
      obj.HomeScore = obj.homescore;
      delete obj.homescore;
    }
    if (obj.awayscore !== undefined && obj.AwayScore === undefined) {
      obj.AwayScore = obj.awayscore;
      delete obj.awayscore;
    }
    return obj;
  });
  const parseTime = (t: unknown) =>
    typeof t === "number"
      ? t
      : String(t ?? "0").includes(":")
        ? String(t)
            .split(":")
            .map(Number)
            .reduce((m, s) => m * 60 + s)
        : Number(t) || 0;
  result.sort(
    (a, b) =>
      Number(a.QTR ?? a.Qtr ?? 0) - Number(b.QTR ?? b.Qtr ?? 0) ||
      parseTime(b.Time) - parseTime(a.Time),
  );
  return result;
}
function columnToLetters(column: number) {
  let letters = "";
  while (column > 0) {
    const remainder = (column - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    column = Math.floor((column - 1) / 26);
  }
  return letters;
}
gameRoutes.get("/health", (_req, res) =>
  res.json({
    ok: true,
    storage: "sqlite",
    app: "football-game-api",
    message: "SQLite API is running",
  }),
);
gameRoutes.get("/players", async (_req, res, next) => {
  try {
    res.json({ players: await getPlayersWithTeamJerseys() });
  } catch (e) {
    next(e);
  }
});
async function getPlayerSeasonStats() {
  return parsePlayerStats(await readTableValues("PlayerStats!A1:ZZ"));
}
gameRoutes.get("/player-stats", async (_req, res, next) => {
  try {
    res.json({ playerStats: await getPlayerSeasonStats() });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/players/:playerName/games", (req, res, next) => {
  try {
    res.json({
      games: repository().playerGames(
        req.params.playerName,
        String(req.query.team ?? ""),
      ),
    });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/player-traits", async (_req, res, next) => {
  try {
    res.json({ players: await getPlayerTraitsFromDatabase() });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/teams", async (_req, res, next) => {
  try {
    res.json({ teams: await getTeamsFromDatabase() });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/team-defense-stats", (_req, res, next) => {
  try {
    res.json({ teamDefenseStats: repository().defenseStats() });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/awards", async (_req, res, next) => {
  try {
    if (typeof (await getSeasonWeek()).week === "number") {
      res.json({ nominations: {}, firstTeams: [] });
      return;
    }
    const [rows, context] = await Promise.all([
      readTableValues("'Awards'!A1:K"),
      awardsContext(),
    ]);
    res.json(awardView(parseAwards(rows), context.players));
  } catch (e) {
    if (e instanceof AwardsError) res.status(400).json({ error: e.message });
    else next(e);
  }
});
gameRoutes.post("/awards/:award/vote", async (req, res, next) => {
  try {
    const award = String(req.params.award).toUpperCase();
    if (!Object.hasOwn(AWARD_COUNTS, award))
      throw new AwardsError("Unknown award.");
    const result = await withAwardsLock(async () => {
      if (typeof (await getSeasonWeek()).week === "number")
        throw new AwardsError("Awards voting opens after the regular season.");
      return runAwardVote(award as AwardId, {
        read: () => readTableValues("'Awards'!A1:K"),
        write: writeTableValues,
        context: awardsContext,
        saveBallots: async (a, b, o) => repository().saveBallots(a, b, o),
      });
    });
    res.json(result);
  } catch (e) {
    if (e instanceof AwardsError) res.status(400).json({ error: e.message });
    else next(e);
  }
});
gameRoutes.get("/playoff-bracket", async (_req, res, next) => {
  try {
    res.json({
      seeds: parsePlayoffBracket(
        await readTableValues("'Playoff Bracket'!A1:C7"),
      ),
    });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/standings", async (_req, res, next) => {
  try {
    res.json({ standings: await getStandingsFromDatabase() });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/teams/:team/players", async (req, res, next) => {
  try {
    res.json({ players: await getTeamPlayers(req.params.team) });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/games", async (_req, res, next) => {
  try {
    res.json({ games: await getGamesList() });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/articles", async (_req, res, next) => {
  try {
    res.json({ articles: await getPublishedArticles() });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/season", async (_req, res, next) => {
  try {
    res.json({ week: (await getSeasonWeek()).week });
  } catch (e) {
    next(e);
  }
});
gameRoutes.post("/season/advance", async (_req, res, next) => {
  try {
    res.json({ ok: true, week: await withAwardsLock(advanceSeasonWeek) });
  } catch (e) {
    if (e instanceof SeasonProgressionError || e instanceof AwardsError)
      res.status(400).json({ error: e.message });
    else next(e);
  }
});
gameRoutes.get("/games/:gameId/state", async (req, res, next) => {
  try {
    res.json({ gameState: await getGameState(req.params.gameId) });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/games/:gameId/play-history", async (req, res, next) => {
  try {
    res.json({ plays: await getPlayHistory(req.params.gameId) });
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/frontend-settings", async (_req, res, next) => {
  try {
    res.json(await getFrontendSettingsFromDatabase());
  } catch (e) {
    next(e);
  }
});
gameRoutes.get("/gameplay-settings", async (_req, res, next) => {
  try {
    res.json({ settings: await getGameplaySettingsFromDatabase() });
  } catch (e) {
    next(e);
  }
});
gameRoutes.put("/gameplay-settings/:variable", async (req, res, next) => {
  try {
    const value = String(req.body?.value ?? "");
    await updateGameplaySetting(req.params.variable, value);
    res.json({ ok: true, variable: req.params.variable, value });
  } catch (e) {
    next(e);
  }
});
gameRoutes.post("/games/:gameId/save-play-and-game", async (req, res, next) => {
  try {
    const saved = repository().savePlayAndGame(req.body, req.params.gameId);
    res.json({ ok: true, ...saved });
  } catch (e) {
    next(e);
  }
});

// The obsolete flat Plays sheet payload cannot identify normalized participants.
gameRoutes.post("/plays", (_req, res) =>
  res.status(410).json({
    error:
      "Use /games/:gameId/save-play-and-game to save a play and game atomically.",
  }),
);

gameRoutes.get("/game-state", async (_req, res, next) => {
  try {
    const rows = await readTableObjects("GameState!A1:Z");
    res.json({ gameState: rows[0] ?? null });
  } catch (e) {
    next(e);
  }
});
