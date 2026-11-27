export const PLAYOFF_ROUNDS = ["Divisionals", "Divisional Championships", "National Championship"] as const;
export type SeasonWeek = number | typeof PLAYOFF_ROUNDS[number];
export const SEASON_WEEKS: SeasonWeek[] = [...Array.from({ length: 13 }, (_, i) => i + 1), ...PLAYOFF_ROUNDS];

export function parseSeasonWeek(value: unknown): SeasonWeek | null {
  const text = String(value ?? "").trim();
  const round = PLAYOFF_ROUNDS.find(round => round.toLowerCase() === text.toLowerCase());
  if (round) return round;
  const week = Number(text);
  return Number.isInteger(week) && week >= 1 && week <= 13 ? week : null;
}
export function gameSeasonWeek(game: { Week?: unknown }, index = 0): SeasonWeek | null {
  return game.Week == null || String(game.Week).trim() === "" ? index % 13 + 1 : parseSeasonWeek(game.Week);
}
export function seasonWeekLabel(week: SeasonWeek | null | undefined): string {
  return typeof week === "number" ? `Week ${week}` : week ?? "—";
}
export function nextSeasonWeek(week: SeasonWeek): SeasonWeek | null {
  const index = SEASON_WEEKS.indexOf(week);
  return index < 0 ? null : SEASON_WEEKS[index + 1] ?? null;
}
export function canAdvanceSeasonWeek(week: SeasonWeek | null, games: readonly { Week?: unknown; Qtr: unknown }[]) {
  if (week === null || nextSeasonWeek(week) === null) return false;
  const current = games.filter(game => parseSeasonWeek(game.Week) === week);
  if (!current.length || current.some(game => !/^(FINAL|F)$/i.test(String(game.Qtr).trim()))) return false;
  // Playoff seeding requires all thirteen regular-season weeks to be complete.
  return week !== 13 || Array.from({ length: 13 }, (_, i) => i + 1).every(regularWeek => {
    const matches = games.filter(game => parseSeasonWeek(game.Week) === regularWeek);
    return matches.length > 0 && matches.every(game => /^(FINAL|F)$/i.test(String(game.Qtr).trim()));
  });
}
