import type { LeagueGame, LeagueTeam } from "./types";

export function parseInteger(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseTimeToSeconds(time: string | number): number {
  if (typeof time === "number") return Math.max(0, Math.floor(time));
  const value = String(time ?? "").trim();
  if (!value) return 0;
  if (!value.includes(":")) {
    const seconds = Number(value);
    return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  }
  const [minutes = "0", seconds = "0"] = value.split(":");
  return Math.max(0, parseInteger(minutes) * 60 + parseInteger(seconds));
}

export function formatClock(secondsOrTime: string | number): string {
  const total = parseTimeToSeconds(secondsOrTime);
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function formatQuarter(qtr: string | number): string {
  if (String(qtr).toUpperCase() === "FINAL") return "FINAL";
  const n = parseInteger(qtr, 1);
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

export function formatDownDistance(
  down: string | number,
  distance: string | number,
): string {
  const d = parseInteger(down, 1);
  const suffix = d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th";
  return `${d}${suffix} & ${distance}`;
}

export function formatBallOnForPoss(
  ballOn: string | number,
  possession: string,
): string {
  const yard = parseInteger(ballOn, 50);
  if (yard === 50) return "50";
  const side =
    possession === "Home"
      ? yard > 50
        ? "OPP"
        : "OWN"
      : yard < 50
        ? "OPP"
        : "OWN";
  return `${side} ${yard > 50 ? 100 - yard : yard}`;
}

export function teamName(team: LeagueTeam): string {
  return String(
    team.Team ?? team.Name ?? team.team ?? team.name ?? "Team Name",
  );
}

export function computeWinPct(team: LeagueTeam): string {
  const wins = parseInteger(team.Wins ?? team.W ?? team.wins);
  const losses = parseInteger(team.Losses ?? team.L ?? team.losses);
  const ties = parseInteger(team.Ties ?? team.T ?? team.ties);
  const games = wins + losses + ties;
  return games
    ? ((wins + ties * 0.5) / games).toFixed(3).replace(/^0/, "")
    : ".000";
}

export function computeDiff(team: LeagueTeam): number {
  return (
    parseInteger(team.PF ?? team.PointsFor) -
    parseInteger(team.PA ?? team.PointsAgainst)
  );
}

export function mergeStandingsWithTeams(
  standings: LeagueTeam[],
  teams: LeagueTeam[],
): LeagueTeam[] {
  const teamsByAbbrev = new Map(
    teams.map((team) => [String(team.Abbrev ?? "").trim().toUpperCase(), team]),
  );

  return standings.map((standing) => {
    const abbrev = String(
      standing.Abbrev ?? standing.Team ?? standing[""] ?? "",
    ).trim().toUpperCase();

    return { ...teamsByAbbrev.get(abbrev), ...standing, Abbrev: abbrev };
  });
}

function teamKey(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function teamDisplayName(team: LeagueTeam | undefined, fallback: string): string {
  if (!team) return fallback;
  const city = String(team.City ?? "").trim();
  const nickname = String(team.Nickname ?? "").trim();
  return String(team.Team ?? team.Name ?? `${city} ${nickname}`.trim() ?? fallback) || fallback;
}

export function normalizeGames(rows: unknown[], teams: LeagueTeam[] = []): LeagueGame[] {
  const teamsByAbbrev = new Map(
    teams.map((team) => [teamKey(team.Abbrev ?? team.Team), team]),
  );

  return rows.filter(Boolean).map((row) => {
    const game = row as LeagueGame & { Id?: string | number };
    const home = teamsByAbbrev.get(teamKey(game.Home));
    const away = teamsByAbbrev.get(teamKey(game.Away));
    return {
      ...game,
      GameId: game.GameId ?? game.Id ?? "",
      Kickoff: game.Kickoff ?? game["Kickoff Time"],
      HomeLogo: String(home?.Logo ?? ""),
      AwayLogo: String(away?.Logo ?? ""),
      HomeName: teamDisplayName(home, game.Home),
      AwayName: teamDisplayName(away, game.Away),
    };
  });
}
