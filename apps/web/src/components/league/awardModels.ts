export type AwardCandidate = { name: string; team: string; position: string; votes?: number };
export const NOMINEE_AWARDS = [
  { id: "mvp", title: "MVP", limit: 8, eligibility: "All positions" },
  { id: "opoy", title: "Offensive Player of the Year", limit: 5, eligibility: "Non-quarterbacks" },
  { id: "dpoy", title: "Defensive Player of the Year", limit: 5, eligibility: "Defense" },
] as const;
export type NomineeAwardId = typeof NOMINEE_AWARDS[number]["id"];
export function awardNominees(id: NomineeAwardId, candidates: readonly AwardCandidate[]) {
  const award = NOMINEE_AWARDS.find(award => award.id === id)!;
  return candidates.filter(candidate => id !== "opoy" || !/\bQB\b|quarterback/i.test(candidate.position)).slice(0, award.limit);
}
export const OFFENSE_HONORS = ["QB", "RB", "RB", "WR", "WR", "TE", "Blocker", "Blocker", "K"];
export const DEFENSE_HONORS = ["DB", "DB", "LB", "LB", "DL", "ANY", "ANY", "ANY"];
