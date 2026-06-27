import type { LeagueGame, LeagueTeam } from "./types";

export function parseInteger(value: unknown, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseTimeToSeconds(time: string | number): number {
  if (typeof time === "number") return time;
  const [minutes = "0", seconds = "0"] = String(time || "0:00").split(":");
  return parseInteger(minutes) * 60 + parseInteger(seconds);
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

export function normalizeGames(rows: unknown[]): LeagueGame[] {
  return rows.filter(Boolean).map((row) => row as LeagueGame);
}
