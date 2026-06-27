import type { LeagueGame } from "../../types";

export type PlayKind = "Run" | "Pass" | "Punt" | "Field Goal" | "Two Point" | "Timeout" | "Spike" | "Kneel";
export type FormationSlot = "WR1" | "TEOL1" | "TEOL2" | "TEOL3" | "TEOL4" | "TEOL5" | "WR2" | "WR3" | "QB" | "RB1" | "RB2";
export type ClockMode = "Normal" | "Hurry Up" | "Chew Clock";
export type PlayCallOptions = {
  formation?: Partial<Record<FormationSlot, string>>;
  routes?: Record<string, string>;
  reads?: Record<string, string>;
  runner?: string;
  clockMode?: ClockMode;
};
export type PlayerTrait = Record<string, unknown>;
export type EngineContext = {
  players: PlayerTrait[];
  settings: Record<string, unknown>;
  historyLength: number;
};
export type PlayResult = {
  game: LeagueGame;
  play: Record<string, unknown>;
  text: string;
};
export type NormalizedOutcome = {
  outcome: string;
  defenseResult: string;
  turnover: string;
  description: string;
};
