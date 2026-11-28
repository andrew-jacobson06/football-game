import type { PlayerGame } from "../../api/client";

export type GameLogColumn = { label: string; value: (game: PlayerGame) => number; decimals?: number };
export type GameLogGroup = { label: string; columns: GameLogColumn[] };
const ratio = (value: number, count: number, factor = 1) => count ? value / count * factor : 0;
export function passerRating(game: PlayerGame) {
  const p = game.passing;
  if (!p.attempts) return 0;
  const cap = (n: number) => Math.max(0, Math.min(2.375, n));
  return (cap((p.completions / p.attempts - .3) * 5) + cap((p.yards / p.attempts - 3) * .25) + cap(p.touchdowns / p.attempts * 20) + cap(2.375 - p.interceptions / p.attempts * 25)) / 6 * 100;
}
const passing: GameLogGroup = { label: "PASSING", columns: [
  { label: "CMP", value: g => g.passing.completions }, { label: "ATT", value: g => g.passing.attempts },
  { label: "YDS", value: g => g.passing.yards }, { label: "CMP%", value: g => ratio(g.passing.completions, g.passing.attempts, 100), decimals: 1 },
  { label: "AVG", value: g => ratio(g.passing.yards, g.passing.attempts), decimals: 1 },
  { label: "TD", value: g => g.passing.touchdowns }, { label: "INT", value: g => g.passing.interceptions },
  { label: "LNG", value: g => g.passing.long }, { label: "SACK", value: g => g.passing.sacks }, { label: "RTG", value: passerRating, decimals: 1 },
] };
const rushing: GameLogGroup = { label: "RUSHING", columns: [
  { label: "CAR", value: g => g.rushing.carries }, { label: "YDS", value: g => g.rushing.yards },
  { label: "AVG", value: g => ratio(g.rushing.yards, g.rushing.carries), decimals: 1 },
  { label: "TD", value: g => g.rushing.touchdowns }, { label: "LNG", value: g => g.rushing.long },
] };
const receiving: GameLogGroup = { label: "RECEIVING", columns: [
  { label: "REC", value: g => g.receiving.receptions }, { label: "TGTS", value: g => g.receiving.targets },
  { label: "YDS", value: g => g.receiving.yards }, { label: "AVG", value: g => ratio(g.receiving.yards, g.receiving.receptions), decimals: 1 },
  { label: "TD", value: g => g.receiving.touchdowns }, { label: "LNG", value: g => g.receiving.long }, { label: "YAC", value: g => g.receiving.yac },
] };
const blocking: GameLogGroup = { label: "BLOCKING", columns: [
  { label: "PLAYS", value: g => g.blocking.wins + g.blocking.losses }, { label: "W", value: g => g.blocking.wins },
  { label: "L", value: g => g.blocking.losses }, { label: "WIN%", value: g => ratio(g.blocking.wins, g.blocking.wins + g.blocking.losses, 100), decimals: 1 },
  { label: "LEAD", value: g => g.blocking.leadBlocks },
] };
export function gameLogGroups(position: string): GameLogGroup[] {
  switch (position.trim().toUpperCase()) {
    case "QB": return [passing, rushing];
    case "RB": return [rushing, receiving];
    case "WR": return [receiving, rushing];
    case "TE": return [receiving, blocking];
    case "OL": case "OT": case "OG": case "C": case "LT": case "RT": case "LG": case "RG": return [blocking];
    default: return [];
  }
}
// Sum counting stats, keep longest plays, and recompute rates from the totals.
export function gameLogTotals(games: PlayerGame[]): PlayerGame {
  const keys = ["passing", "rushing", "receiving", "blocking", "fumbles"] as const;
  const total = { ...games[0] } as PlayerGame;
  for (const key of keys) {
    const fields = new Set(games.flatMap(g => Object.keys(g[key])));
    const values = Object.fromEntries([...fields].map(field => {
      const numbers = games.map(g => Number((g[key] as unknown as Record<string, number>)[field]) || 0);
      return [field, field === "long" ? Math.max(...numbers) : numbers.reduce((a, b) => a + b, 0)];
    }));
    Object.assign(total, { [key]: values });
  }
  return total;
}
