import type { LeagueGame } from "../../types";

export type PlayKind =
  | "Run"
  | "Pass"
  | "Punt"
  | "Field Goal"
  | "Two Point"
  | "Timeout"
  | "Spike"
  | "Kneel";
export type FormationSlot =
  | "WR1"
  | "LT"
  | "LG"
  | "C"
  | "RG"
  | "RT"
  | "WR2"
  | "WR3"
  | "WR4"
  | "QB"
  | "RB1"
  | "RB2";
export type ClockMode = "Normal" | "Hurry Up" | "Chew Clock";
export type DefensiveAssignment = {
  position: string;
  player: string;
  align?: FormationSlot;
};

export type PlayCallOptions = {
  formation?: Partial<Record<FormationSlot, string>>;
  routes?: Record<string, string>;
  routeDepths?: Record<string, string>;
  reads?: Record<string, string>;
  runner?: string;
  clockMode?: ClockMode;
  defense?: DefensiveAssignment[];
};
export type PlayerTrait = Record<string, unknown>;
export type RunThreshold = {
  label: string;
  minYards: number;
  maxYards: number;
  rollMin: number;
  rollMax: number;
};
export type RunBreakawaySetting = {
  label: string;
  percentage: number;
  minYards: number;
  maxYards: number;
};
export type RunAccelToLBSetting = {
  label: string;
  percentage: number;
  minYards: number;
  maxYards: number;
  yards?: number;
};
export type RunSecondarySpeedSetting = {
  label: string;
  percentage: number;
  minYards: number;
  maxYards: number;
};
export type RunSecondaryBreakawaySetting = {
  label: string;
  percentage: number;
  minYards: number;
  maxYards: number;
};
export type RunNegativeYardageSetting = {
  label: string;
  percentage: number;
  minYards: number;
  maxYards: number;
};
export type FrontendSettings = Record<string, unknown> & {
  thresholds?: RunThreshold[];
  breakaways?: RunBreakawaySetting[];
  accelToLBYards?: RunAccelToLBSetting[];
  secondarySpeedYards?: RunSecondarySpeedSetting[];
  secondaryBreakawayYards?: RunSecondaryBreakawaySetting[];
  negativeYardage?: RunNegativeYardageSetting[];
  staminaDrains?: Record<string, number>;
  drainSettings?: Record<string, number>;
  tackleTable?: unknown[];
  tackleSettings?: unknown[];
  completionTable?: unknown[];
  routeTypeAirYards?: unknown[];
  routeInfo?: unknown[];
  timeNeededToThrow?: unknown[];
  timeNeededToOpen?: unknown[];
  completionSeparationAdjustment?: unknown[];
  yacBySeparation?: Record<string, unknown>;
  sackLossTable?: unknown[];
};
export type EngineContext = {
  players: PlayerTrait[];
  settings: FrontendSettings;
  historyLength: number;
};
export type PlayResult = {
  game: LeagueGame;
  play: Record<string, unknown>;
  text: string;
};
export type PassPlayPhase =
  | "blitz-check"
  | "line-clash"
  | "qb-chase"
  | "pocket-formed"
  | "base-time-to-throw"
  | "pass-rush-vs-pass-block"
  | "final-time-to-throw"
  | "routes-available"
  | "openness-trajectory"
  | "qb-read-cycle"
  | "qb-decision"
  | "pressure-response"
  | "throw-to-receiver";
export type PassPlayDecision =
  | "pending"
  | "throw"
  | "throw-away"
  | "scramble"
  | "sack";
export type PassPlayState = {
  qb: string;
  phases: PassPlayPhase[];
  log: string[];
  blitz: boolean;
  instantPressure: boolean;
  pocketFormed: boolean;
  baseTimeToThrow: number | null;
  finalTimeToThrow: number | null;
  routes: Array<Record<string, unknown>>;
  opennessTrajectory: Array<Record<string, unknown>>;
  target?: Record<string, unknown>;
  decision: PassPlayDecision;
};
export type NormalizedOutcome = {
  outcome: string;
  defenseResult: string;
  turnover: string;
  description: string;
};
export type RunPlayState = {
  yards: number;
  runner: string;
  tackler?: string;
  stopped: boolean;
  stopReason?: string;
  log: string[];
  pursuitEvents: Array<{
    stage: "secondary" | "breakaway";
    chaser: string;
    startYards: number;
    endYards: number;
    escaped: boolean;
  }>;
};
export type LineStatMatchup = {
  slot: FormationSlot;
  offensePlayer: string;
  defensePlayer: string;
  winner: "OL" | "DL";
};
