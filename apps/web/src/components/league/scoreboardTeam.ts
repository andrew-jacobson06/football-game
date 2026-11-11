import type { LeagueGame, LeagueTeam } from "./types";

const normalized = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
const field = (row: Record<string, unknown> | undefined, name: string) =>
  Object.entries(row ?? {}).find(
    ([key]) => normalized(key) === normalized(name),
  )?.[1];
const titleCase = (value: string) =>
  value.toLowerCase().replace(/(^|\s|-)\S/g, (letter) => letter.toUpperCase());

/** Team metadata comes from the Teams sheet; the game remains the score source. */
export function scoreboardTeam(
  game: LeagueGame,
  side: "Home" | "Away",
  team?: LeagueTeam,
) {
  const location = String(
    field(team, "Location") ?? field(team, "City") ?? "",
  ).trim();
  const nickname = String(
    field(team, "Name") ?? field(team, "Nickname") ?? "",
  ).trim();
  const fullName =
    location && nickname
      ? titleCase(`${location} ${nickname}`)
      : String(game[`${side}Name`] || nickname || game[side]);
  const abbreviation = String(
    field(team, "Abbrev") || game[side],
  ).toUpperCase();
  const wins = field(team, "Wins"),
    losses = field(team, "Losses"),
    ties = Number(field(team, "Ties") ?? 0);
  const record = String(
    game[`${side} Record`] ||
      field(team, "Record") ||
      (wins != null && losses != null
        ? `${wins}-${losses}${ties ? `-${ties}` : ""}`
        : "0-0"),
  );
  const rawTimeouts = field(
    game as unknown as Record<string, unknown>,
    `${side}Timeouts`,
  );
  const timeouts =
    rawTimeouts == null || !Number.isFinite(Number(rawTimeouts))
      ? 3
      : Math.max(0, Math.min(3, Number(rawTimeouts)));
  return {
    fullName,
    abbreviation,
    record,
    timeouts,
    logo: String(field(team, "Logo") || game[`${side}Logo`] || ""),
    primaryColor: String(field(team, "Primary Color") || "transparent").trim(),
    score: game[`${side}Score`],
  };
}
