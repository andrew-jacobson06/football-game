import { passPlayFacts, type PlayRow } from "./playStats.js";

const normalized = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
function field(row: PlayRow, ...names: string[]) {
  for (const name of names) {
    const entry = Object.entries(row).find(
      ([key, value]) =>
        normalized(key) === normalized(name) && value !== "" && value != null,
    );
    if (entry) return entry[1];
  }
  return undefined;
}
const text = (row: PlayRow, ...names: string[]) =>
  String(field(row, ...names) ?? "").trim();

/** Attribute actual opposing offensive gains by game and possession, never by
 * opponent season totals or a player's current roster assignment. */
export function aggregateTeamDefenseStats(
  teams: PlayRow[],
  games: PlayRow[],
  plays: PlayRow[],
) {
  const aliases = new Map<string, string>();
  const totals = new Map<
    string,
    {
      team: string;
      gamesPlayed: number;
      passingYardsAllowed: number;
      rushingYardsAllowed: number;
      totalYardsAllowed: number;
    }
  >();
  for (const team of teams) {
    const id = text(team, "Abbrev", "Team", "Name", "ID");
    if (!id) continue;
    const key = normalized(id);
    totals.set(key, {
      team: id,
      gamesPlayed: 0,
      passingYardsAllowed: 0,
      rushingYardsAllowed: 0,
      totalYardsAllowed: 0,
    });
    for (const value of [
      id,
      field(team, "Abbrev"),
      field(team, "Team"),
      field(team, "Name"),
      field(team, "ID"),
      field(team, "Location"),
      `${text(team, "Location", "City")} ${text(team, "Name", "Nickname")}`,
    ]) {
      if (normalized(value)) aliases.set(normalized(value), key);
    }
  }
  // Only completed games belong to the season table. A rematch has its own ID.
  const completed = new Map<string, { home: string; away: string }>();
  for (const game of games) {
    if (!/^(FINAL|F)$/i.test(text(game, "Qtr", "Quarter"))) continue;
    const gameId = text(game, "GameId", "Id");
    const home = aliases.get(normalized(field(game, "Home")));
    const away = aliases.get(normalized(field(game, "Away")));
    if (!gameId || !home || !away || home === away || completed.has(gameId))
      continue;
    completed.set(gameId, { home, away });
    totals.get(home)!.gamesPlayed++;
    totals.get(away)!.gamesPlayed++;
  }
  const counted = new Set<string>();
  for (const play of plays) {
    const gameId = text(play, "gameid");
    const game = completed.get(gameId);
    if (!game) continue;
    const possession = normalized(field(play, "possession"));
    const offense =
      possession === "home"
        ? game.home
        : possession === "away"
          ? game.away
          : aliases.get(possession);
    if (offense !== game.home && offense !== game.away) continue;
    const type = text(play, "playtype", "play type").toLowerCase();
    if (/kick|punt|timeout|two.?point|2pt|extra.?point/.test(type)) continue;
    const { isSack, isComplete } = passPlayFacts(play);
    // Match passing/receiving season totals: completed-pass gains (with YAC),
    // with sacks kept separate. Real rushing losses, including kneels, count.
    const rushing = /\b(run|rush|rushing|kneel)\b/.test(type) && !isSack;
    const passing = /pass/.test(type) && isComplete && !isSack;
    if (!rushing && !passing) continue;
    const rawYards = field(play, "yards", "yards gained");
    if (rawYards == null) continue;
    const yards = Number(String(rawYards).replace(/,/g, ""));
    if (!Number.isFinite(yards)) continue;
    const playId = text(play, "playid");
    const unique = JSON.stringify([gameId, playId]);
    if (playId && counted.has(unique)) continue;
    if (playId) counted.add(unique);
    const defense = totals.get(offense === game.home ? game.away : game.home)!;
    if (passing) defense.passingYardsAllowed += yards;
    else defense.rushingYardsAllowed += yards;
    defense.totalYardsAllowed += yards;
  }
  return [...totals.values()];
}
