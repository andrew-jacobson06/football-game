import type { LeagueGame, LeagueTeam } from "./types";

const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
export function standingValue(team: LeagueTeam, ...names: string[]) {
  for (const name of names) {
    const entry = Object.entries(team).find(([key, value]) => normalized(key) === normalized(name) && value !== undefined && String(value).trim() !== "");
    if (entry) return entry[1];
  }
  return undefined;
}
export function standingNumber(team: LeagueTeam, ...names: string[]) {
  const value = Number(String(standingValue(team, ...names) ?? 0).replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}
function percentage(team: LeagueTeam, names: string[], wins: number, losses: number, ties: number) {
  const raw = standingValue(team, ...names);
  if (raw !== undefined) {
    const text = String(raw).trim();
    const numeric = Number(text.replace(/%$/, ""));
    const fraction = text.endsWith("%") || numeric > 1 ? numeric / 100 : numeric;
    if (Number.isFinite(fraction) && fraction >= 0 && fraction <= 1) return fraction;
  }
  const games = wins + losses + ties;
  return games ? (wins + ties / 2) / games : 0;
}
export function standingWinPercentage(team: LeagueTeam) {
  return percentage(team, ["Win%"], standingNumber(team, "W", "Wins"), standingNumber(team, "L", "Losses"), standingNumber(team, "T", "Ties"));
}
export function standingDivisionPercentage(team: LeagueTeam) {
  return percentage(team, ["Div Win%", "Division Win%"], standingNumber(team, "Div W", "DivisionWins"), standingNumber(team, "Div L", "DivisionLosses"), standingNumber(team, "Div T", "DivisionTies"));
}
export function standingDiff(team: LeagueTeam) {
  return standingValue(team, "DIFF") !== undefined ? standingNumber(team, "DIFF") : standingNumber(team, "PF", "PointsFor") - standingNumber(team, "PA", "PointsAgainst");
}
export function standingRecord(team: LeagueTeam, split: "Home" | "Away" | "Div") {
  const legacy = split === "Div" ? "Division" : split;
  const wins = standingNumber(team, `${split} W`, `${legacy}Wins`);
  const losses = standingNumber(team, `${split} L`, `${legacy}Losses`);
  const ties = standingNumber(team, `${split} T`, `${legacy}Ties`);
  return `${wins}-${losses}${ties ? `-${ties}` : ""}`;
}

/** Resolve an entire equal-win% group together, avoiding non-transitive pairwise sorting. */
function sortTiedGroup(teams: LeagueTeam[], games: readonly LeagueGame[]) {
  const records = teams.map(team => ({ team, games: 0, wins: 0, ties: 0, diff: 0 }));
  const aliases = new Map<string, typeof records[number]>();
  for (const record of records) {
    const team = record.team;
    for (const value of [team.Abbrev, team.Team, team[""], team.ID, team.Name, team.Location, team.City,
      `${team.Location ?? team.City ?? ""} ${team.Name ?? team.Nickname ?? ""}`]) {
      if (normalized(value)) aliases.set(normalized(value), record);
    }
  }
  const counted = new Set<string>();
  for (const game of games) {
    if (!/^(FINAL|F)$/i.test(String(game.Qtr).trim())) continue;
    const home = aliases.get(normalized(game.Home)), away = aliases.get(normalized(game.Away));
    if (!home || !away || home === away) continue;
    if (String(game.HomeScore).trim() === "" || String(game.AwayScore).trim() === "") continue;
    const homeScore = Number(game.HomeScore), awayScore = Number(game.AwayScore);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue;
    const id = String(game.GameId ?? "").trim();
    if (id && counted.has(id)) continue;
    if (id) counted.add(id);
    home.games++; away.games++;
    home.diff += homeScore - awayScore; away.diff += awayScore - homeScore;
    if (homeScore === awayScore) { home.ties++; away.ties++; }
    else if (homeScore > awayScore) home.wins++;
    else away.wins++;
  }
  // No head-to-head comparison is available if any tied team has no such games.
  const hasHeadToHead = records.every(record => record.games > 0);
  const winPct = (record: typeof records[number]) => (record.wins + record.ties / 2) / record.games;
  return records.sort((a, b) =>
    (hasHeadToHead ? winPct(b) - winPct(a) || b.diff - a.diff : 0) ||
    standingDiff(b.team) - standingDiff(a.team) || standingDivisionPercentage(b.team) - standingDivisionPercentage(a.team),
  ).map(record => record.team);
}

export function sortStandings(teams: readonly LeagueTeam[], games: readonly LeagueGame[] = []): LeagueTeam[] {
  const groups = new Map<string, LeagueTeam[]>();
  for (const team of teams) {
    const key = standingWinPercentage(team).toFixed(12);
    const group = groups.get(key) ?? [];
    group.push(team); groups.set(key, group);
  }
  return [...groups].sort(([a], [b]) => Number(b) - Number(a))
    .flatMap(([, group]) => group.length > 1 ? sortTiedGroup(group, games) : group);
}
