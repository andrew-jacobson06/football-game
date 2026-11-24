import { sortStandings } from "../../../web/src/components/league/standings.js";
import { canAdvanceSeasonWeek, nextSeasonWeek, parseSeasonWeek, type SeasonWeek } from "../../../web/src/components/league/seasonWeeks.js";
import type { LeagueGame, LeagueTeam } from "../../../web/src/components/league/types.js";
export class SeasonProgressionError extends Error {}
const key = (value: unknown) => String(value ?? "").trim().toLowerCase();

/** Plan writes before touching Sheets, sharing the standings' full tiebreak order. */
export function planSeasonAdvance(week: SeasonWeek, games: LeagueGame[], standings: LeagueTeam[] = [], teams: LeagueTeam[] = [], bracket: unknown[][] = []) {
  const nextWeek = nextSeasonWeek(week);
  if (nextWeek === null) throw new SeasonProgressionError("The National Championship is the final round of the season.");
  if (!canAdvanceSeasonWeek(week, games)) throw new SeasonProgressionError(week === 13
    ? "All 13 regular-season weeks must be complete before seeding the playoffs."
    : `${typeof week === "number" ? `Week ${week}` : week} cannot advance until all of its games are final.`);
  if (week !== 13) return { nextWeek, bracketValues: undefined };
  const merged = standings.map(standing => {
    const abbrev = String(standing.Abbrev ?? standing.Team ?? standing[""] ?? "").trim();
    const metadata = teams.find(team => key(team.Abbrev ?? team.Team) === key(abbrev));
    return { ...metadata, ...standing, Abbrev: abbrev };
  }).filter(team => team.Abbrev);
  const divisionKey = (value: unknown) => key(value).replace(/\s+division$/, "");
  const regularGames = games.filter(game => typeof parseSeasonWeek(game.Week) === "number");
  const seeds = new Map<string, string[]>();
  for (const division of ["East", "West"]) {
    const candidates = merged.filter(team => divisionKey(team.Division) === key(division));
    if (new Set(candidates.map(team=>key(team.Abbrev))).size < 3 || candidates.length !== new Set(candidates.map(team=>key(team.Abbrev))).size)
      throw new SeasonProgressionError(`${division} needs at least three distinct teams with standings before playoff seeding.`);
    seeds.set(key(division), sortStandings(candidates, regularGames).slice(0, 3).map(team => team.Abbrev!));
  }
  const [headers = [], ...rows] = bracket;
  const divisionColumn = headers.findIndex(header => key(header) === "division");
  const seedColumn = headers.findIndex(header => key(header) === "seed");
  if (divisionColumn !== 0 || seedColumn !== 1 || key(headers[2]) !== "team" || rows.length !== 6)
    throw new SeasonProgressionError("Playoff Bracket must have Division / Seed / Team headers and six seed rows in A1:C7.");
  const seen = new Set<string>();
  const bracketValues = rows.map(row => {
    const division = divisionKey(row[divisionColumn]), seed = Number(row[seedColumn]);
    const id = `${division}:${seed}`;
    if (!seeds.has(division) || ![1, 2, 3].includes(seed) || seen.has(id)) throw new SeasonProgressionError("Playoff Bracket needs seeds 1–3 exactly once for East and West.");
    seen.add(id);
    return [seeds.get(division)![seed - 1]];
  });
  return { nextWeek, bracketValues };
}


export function seasonAdvanceWrites(plan: ReturnType<typeof planSeasonAdvance>, weekCell: string) {
  const updates: Array<{ range: string; values: unknown[][] }> = [];
  if (plan.bracketValues) updates.push({ range: "'Playoff Bracket'!C2:C7", values: plan.bracketValues });
  updates.push({ range: weekCell, values: [[plan.nextWeek]] });
  return updates;
}
