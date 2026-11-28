import type { CareerStatLine } from "../../api/client";

export type CareerCategory = "Passing" | "Rushing" | "Receiving" | "Blocking";
export type CareerColumn = { label: string; value: (line: CareerStatLine) => number | null; decimals?: number };
const stat = (key: string, label: string): CareerColumn => ({ label, value: line => line.stats[key] ?? 0 });
const rate = (label: string, numerator: string, denominator: string, factor = 1): CareerColumn => ({ label, decimals: 1, value: line => line.stats[denominator] ? (line.stats[numerator] ?? 0) / line.stats[denominator] * factor : null });
const gp: CareerColumn = { label: "GP", value: line => line.gamesPlayed };
export function careerPasserRating(line: CareerStatLine) {
  const s = line.stats, attempts = s.passing_attempts;
  if (!attempts) return null;
  const cap = (value: number) => Math.max(0, Math.min(2.375, value));
  return (cap(((s.passing_completions ?? 0) / attempts - .3) * 5) + cap(((s.passing_yards ?? 0) / attempts - 3) * .25) + cap((s.passing_touchdowns ?? 0) / attempts * 20) + cap(2.375 - (s.interceptions_thrown ?? 0) / attempts * 25)) / 6 * 100;
}
export const careerColumns: Record<CareerCategory, CareerColumn[]> = {
  Passing: [gp, stat("passing_completions", "CMP"), stat("passing_attempts", "ATT"), rate("CMP%", "passing_completions", "passing_attempts", 100), stat("passing_yards", "YDS"), rate("AVG", "passing_yards", "passing_attempts"), stat("passing_touchdowns", "TD"), stat("interceptions_thrown", "INT"), stat("longest_pass", "LNG"), stat("sacks_taken", "SACK"), { label: "RTG", value: careerPasserRating, decimals: 1 }, { label: "QBR", value: () => null }],
  Rushing: [gp, stat("carries", "CAR"), stat("rushing_yards", "YDS"), rate("AVG", "rushing_yards", "carries"), stat("rushing_touchdowns", "TD"), stat("longest_rush", "LNG"), stat("rushing_first_downs", "FD"), stat("rushing_fumbles", "FUM"), stat("rushing_fumbles_lost", "LST")],
  Receiving: [gp, stat("receptions", "REC"), stat("targets", "TGTS"), stat("receiving_yards", "YDS"), rate("AVG", "receiving_yards", "receptions"), stat("receiving_touchdowns", "TD"), stat("longest_reception", "LNG"), stat("receiving_first_downs", "FD"), stat("receiving_fumbles", "FUM"), stat("receiving_fumbles_lost", "LST"), stat("yac", "YAC")],
  Blocking: [gp, { label: "PLAYS", value: line => (line.stats.ol_wins ?? 0) + (line.stats.ol_losses ?? 0) }, stat("ol_wins", "W"), stat("ol_losses", "L"), { label: "WIN%", decimals: 1, value: line => { const wins = line.stats.ol_wins ?? 0, losses = line.stats.ol_losses ?? 0; return wins + losses ? wins / (wins + losses) * 100 : null; } }, stat("lead_blocks", "LEAD")],
};
export function careerCategoryOrder(position: string): CareerCategory[] {
  switch (position.trim().toUpperCase()) {
    case "QB": return ["Passing", "Rushing", "Blocking", "Receiving"];
    case "RB": return ["Rushing", "Receiving", "Blocking", "Passing"];
    case "WR": return ["Receiving", "Rushing", "Blocking", "Passing"];
    case "TE": return ["Receiving", "Blocking", "Rushing", "Passing"];
    default: return ["Blocking", "Rushing", "Receiving", "Passing"];
  }
}
