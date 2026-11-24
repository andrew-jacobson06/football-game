import type { PlayoffSeed } from "../../api/client";
import type { LeagueGame, LeagueTeam } from "./types";
import { parseSeasonWeek } from "./seasonWeeks";
const key = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export function playoffTeam(seed: PlayoffSeed | undefined, teams: readonly LeagueTeam[]) {
  return seed ? teams.find(team => [team.Abbrev, team.Team, team.Name, team.ID].some(value => key(value) === key(seed.team))) : undefined;
}
export type BracketSlot = { seed?: PlayoffSeed; placeholder: string };
export type BracketMatch = { title: string; slots: BracketSlot[]; game?: LeagueGame; winner?: PlayoffSeed };

/** Match real game participants to the frozen seeds, and advance only final winners. */
export function buildPlayoffBracket(seeds: readonly PlayoffSeed[], teams: readonly LeagueTeam[], games: readonly LeagueGame[]) {
  const seeded = seeds.filter(seed => seed.team);
  const aliases = new Map<string, PlayoffSeed>();
  for (const seed of seeded) {
    const team = playoffTeam(seed, teams);
    for (const value of [seed.team, team?.Abbrev, team?.Team, team?.Name, team?.ID, `${team?.Location ?? ""} ${team?.Name ?? ""}`]) {
      if (key(value)) aliases.set(key(value), seed);
    }
  }
  const participant = (name: unknown) => aliases.get(key(name));
  const same = (a?: PlayoffSeed, b?: PlayoffSeed) => Boolean(a && b && key(a.team) === key(b.team));
  const winner = (game?: LeagueGame) => {
    if (!game || !/^(FINAL|F)$/i.test(String(game.Qtr).trim()) || String(game.HomeScore).trim() === "" || String(game.AwayScore).trim() === "") return undefined;
    const home = Number(game.HomeScore), away = Number(game.AwayScore);
    return !Number.isFinite(home) || !Number.isFinite(away) || home === away ? undefined : participant(home > away ? game.Home : game.Away);
  };
  const matchup = (round: string, first?: PlayoffSeed, second?: PlayoffSeed) => !first || !second ? undefined : games.find(game =>
    parseSeasonWeek(game.Week) === round && ((same(participant(game.Home), first) && same(participant(game.Away), second)) || (same(participant(game.Home), second) && same(participant(game.Away), first))));
  const divisions = ["East", "West"].map(division => {
    const get = (rank: number) => seeded.find(seed => key(seed.division) === key(division) && seed.seed === rank);
    const first = get(1), second = get(2), third = get(3);
    const openingGame = matchup("Divisionals", second, third), openingWinner = winner(openingGame);
    const championshipGame = matchup("Divisional Championships", first, openingWinner);
    const championshipWinner = winner(championshipGame);
    return { division, bye: first,
      opening: { title: "Divisionals", slots: [{ seed: second, placeholder: "No. 2 seed" }, { seed: third, placeholder: "No. 3 seed" }], game: openingGame, winner: openingWinner } as BracketMatch,
      championship: { title: "Divisional Championship", slots: [{ seed: first, placeholder: "No. 1 seed" }, { seed: openingWinner, placeholder: "Winner of No. 2 vs No. 3" }], game: championshipGame, winner: championshipWinner } as BracketMatch,
      winner: championshipWinner,
    };
  });
  const nationalGame = matchup("National Championship", divisions[0].winner, divisions[1].winner);
  const national: BracketMatch = { title: "National Championship", slots: divisions.map(division => ({ seed: division.winner, placeholder: `${division.division} champion` })), game: nationalGame, winner: winner(nationalGame) };
  const score = (game: LeagueGame, seed: PlayoffSeed) => same(participant(game.Home), seed) ? game.HomeScore : same(participant(game.Away), seed) ? game.AwayScore : undefined;
  return { divisions, national, score };
}
