import type {
  FormationSlot,
  DefensiveAssignment,
  PlayerTrait,
  RunAccelToLBSetting,
  FrontendSettings,
  RunPlayState
} from "./types";

const TEOL_SLOTS: FormationSlot[] = ["TEOL1", "TEOL2", "TEOL3", "TEOL4", "TEOL5"];
const CENTER_SLOT: FormationSlot = "TEOL3";

function settingArray<T>(settings: FrontendSettings | undefined, key: keyof FrontendSettings): T[] {
  const value = settings?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}

// ---------------------------------------------------------------------------
// Player / formation lookup helpers
// ---------------------------------------------------------------------------

export type OlDlMatchup = {
  slot: FormationSlot;
  offensePlayer: string;
  defensePlayer: string;
  defensePosition: string;
};

export function buildOlDlMatchups(
  offense: Partial<Record<FormationSlot, string>>,
  defense: DefensiveAssignment[]
): OlDlMatchup[] {
  return TEOL_SLOTS
    .map((slot) => {
      const defender = defense.find(
        (d) => d.align === slot && d.position.startsWith("DL")
      );

      return {
        slot,
        offensePlayer: offense[slot] ?? "",
        defensePlayer: defender?.player ?? "",
        defensePosition: defender?.position ?? "",
      };
    })
    .filter((matchup) => matchup.offensePlayer || matchup.defensePlayer);
}

export function trait(player: PlayerTrait | undefined, key: string): number {
  if (!player) return 0;

  const normalizedKey = key.replace(/\s+/g, "");
  const camelKey = normalizedKey[0].toLowerCase() + normalizedKey.slice(1);
  const pascalKey = normalizedKey[0].toUpperCase() + normalizedKey.slice(1);

  const value =
    player[key] ??
    player[normalizedKey] ??
    player[camelKey] ??
    player[pascalKey];

  return Number(value ?? 0);
}

export function findPlayerByName(
  players: PlayerTrait[],
  playerName: string
): PlayerTrait | undefined {
  return players.find((p) => {
    const name = String(p.name ?? p.Name ?? p.playername ?? p.PlayerName ?? "");
    return name === playerName;
  });
}

// ---------------------------------------------------------------------------
// Line-of-scrimmage checks
// ---------------------------------------------------------------------------

export type LineWinLossResult = {
  slot: FormationSlot;
  offensePlayer: string;
  defensePlayer: string;
  defensePosition: string;

  olRunBlocking: number;
  dlRunStop: number;

  dlWinChance: number;
  roll: number;

  winner: "DL" | "OL";
};

export function performLineWinLoss(
  offenseFormation: Partial<Record<FormationSlot, string>>,
  defenseFormation: DefensiveAssignment[],
  players: PlayerTrait[]
): LineWinLossResult[] {
  const olDlMatchups = buildOlDlMatchups(offenseFormation, defenseFormation);

  return olDlMatchups.map((matchup) => {
    const offensivePlayer = findPlayerByName(players, matchup.offensePlayer);
    const defensivePlayer = findPlayerByName(players, matchup.defensePlayer);

    const olRunBlocking = trait(offensivePlayer, "Run Blocking");
    const dlRunStop = trait(defensivePlayer, "RunStop");

    const rawDlWinChance = 50 + dlRunStop - olRunBlocking;

    const dlWinChance = Math.max(5, Math.min(95, rawDlWinChance));

    const roll = Math.random() * 100;

    const winner: "DL" | "OL" = roll <= dlWinChance ? "DL" : "OL";

    return {
      slot: matchup.slot,
      offensePlayer: matchup.offensePlayer,
      defensePlayer: matchup.defensePlayer,
      defensePosition: matchup.defensePosition,
      olRunBlocking,
      dlRunStop,
      dlWinChance,
      roll,
      winner,
    };
  });
}

export type VisionCheckResult = {
  runner: string;
  runnerVision: number;
  runBlockingModifier: number;
  visionTarget: number;
  roll: number;
  result: "Auto Release" | "Auto Stuff" | "Hit Hole" | "Missed Hole";
  getsPastDL: boolean;
};

export function performVisionCheck(
  runnerName: string,
  players: PlayerTrait[],
  lineWinLossArray: LineWinLossResult[],
  runBlockingModifier: number
): VisionCheckResult {
  const runner = findPlayerByName(players, runnerName);
  const runnerVision = trait(runner, "vision");

  const olWins = lineWinLossArray.filter((battle) => battle.winner === "OL").length;
  const dlWins = lineWinLossArray.filter((battle) => battle.winner === "DL").length;
  const totalBattles = lineWinLossArray.length;

  const allOlWon = totalBattles > 0 && olWins === totalBattles;
  const allDlWon = totalBattles > 0 && dlWins === totalBattles;

  const rawVisionTarget = ((runnerVision * 0.19) + 75) + runBlockingModifier;

  const visionTarget = Math.max(0, Math.min(100, rawVisionTarget));

  if (allOlWon) {
    return {
      runner: runnerName,
      runnerVision,
      runBlockingModifier,
      visionTarget,
      roll: 0,
      result: "Auto Release",
      getsPastDL: true,
    };
  }

  if (allDlWon) {
    return {
      runner: runnerName,
      runnerVision,
      runBlockingModifier,
      visionTarget,
      roll: 100,
      result: "Auto Stuff",
      getsPastDL: false,
    };
  }

  const roll = Math.random() * 100;

  const getsPastDL = roll <= visionTarget;

  return {
    runner: runnerName,
    runnerVision,
    runBlockingModifier,
    visionTarget,
    roll,
    result: getsPastDL ? "Hit Hole" : "Missed Hole",
    getsPastDL,
  };
}

export type RunLaneTargetResult = {
  branch: "Past DL" | "Backfield Challenge";
  selectedPlayer: string;
  selectedSlot: FormationSlot;
  selectedSide: "OL" | "DL";
  selectedTraitValue: number;
  totalWeight: number;
  roll: number;
  candidates: {
    slot: FormationSlot;
    player: string;
    side: "OL" | "DL";
    traitValue: number;
  }[];
};

function weightedPick<T extends { traitValue: number }>(
  candidates: T[]
): { selected: T; totalWeight: number; roll: number } {
  const validCandidates = candidates.filter((candidate) => candidate.traitValue > 0);

  const totalWeight = validCandidates.reduce(
    (sum, candidate) => sum + candidate.traitValue,
    0
  );

  if (totalWeight <= 0 || validCandidates.length === 0) {
    throw new Error("weightedPick was called with no valid weighted candidates.");
  }

  const roll = Math.random() * totalWeight;

  let runningTotal = 0;

  for (const candidate of validCandidates) {
    runningTotal += candidate.traitValue;

    if (roll <= runningTotal) {
      return {
        selected: candidate,
        totalWeight,
        roll,
      };
    }
  }

  return {
    selected: validCandidates[validCandidates.length - 1],
    totalWeight,
    roll,
  };
}

export function pickRunLaneTarget(
  lineWinLossArray: LineWinLossResult[],
  visionCheck: VisionCheckResult,
  players: PlayerTrait[]
): RunLaneTargetResult {
  const visionPassed =
    visionCheck.result === "Auto Release" || visionCheck.result === "Hit Hole";

  const candidates = lineWinLossArray
    .filter((battle) => battle.winner === (visionPassed ? "OL" : "DL"))
    .map((battle) => {
      if (visionPassed) {
        const offensivePlayer = findPlayerByName(players, battle.offensePlayer);
        const traitValue = trait(offensivePlayer, "runBlocking");

        return {
          slot: battle.slot,
          player: battle.offensePlayer,
          side: "OL" as const,
          traitValue,
        };
      }

      const defensivePlayer = findPlayerByName(players, battle.defensePlayer);
      const traitValue = trait(defensivePlayer, "runStop");

      return {
        slot: battle.slot,
        player: battle.defensePlayer,
        side: "DL" as const,
        traitValue,
      };
    })
    .filter((candidate) => candidate.player);

  const picked = weightedPick(candidates);

  return {
    branch: visionPassed ? "Past DL" : "Backfield Challenge",
    selectedPlayer: picked.selected.player,
    selectedSlot: picked.selected.slot,
    selectedSide: picked.selected.side,
    selectedTraitValue: picked.selected.traitValue,
    totalWeight: picked.totalWeight,
    roll: picked.roll,
    candidates,
  };
}

// ---------------------------------------------------------------------------
// Run-lane selection and run-state mutation helpers
// ---------------------------------------------------------------------------

export function createRunPlayState(runner: string): RunPlayState {
  return {
    yards: 0,
    runner,
    stopped: false,
    log: [],
  };
}

export function addYards(
  state: RunPlayState,
  yards: number,
  reason: string
): RunPlayState {
  state.yards += yards;
  state.log.push(`${reason}: ${yards >= 0 ? "+" : ""}${yards} yards.`);
  return state;
}

export function stopRun(
  state: RunPlayState,
  tackler: string,
  reason: string
): RunPlayState {
  state.tackler = tackler;
  state.stopped = true;
  state.stopReason = reason;
  state.log.push(`${tackler} stops ${state.runner}. Reason: ${reason}.`);
  return state;
}

// ---------------------------------------------------------------------------
// Defensive line resolution checks
// ---------------------------------------------------------------------------

export type DlSwipeResult = {
  attempted: boolean;
  slot: FormationSlot;
  blocker: string;
  defender: string;
  dlTackling: number;
  swipeScore: number;
  roll: number;
  tackled: boolean;
};

export function performDlSwipeCheck(
  lineWinLossArray: LineWinLossResult[],
  runLaneTarget: RunLaneTargetResult,
  players: PlayerTrait[]
): DlSwipeResult {
  const matchup = lineWinLossArray.find(
    (battle) => battle.slot === runLaneTarget.selectedSlot
  );

  if (!matchup) {
    throw new Error(`No OL/DL matchup found for slot ${runLaneTarget.selectedSlot}.`);
  }

  const defensivePlayer = findPlayerByName(players, matchup.defensePlayer);

  const dlTackling = trait(defensivePlayer, "tackling");

  const swipeScore = ((dlTackling / 17) ** 2) / 2;

  const roll = Math.random() * 100;

  const tackled = roll <= swipeScore;

  return {
    attempted: true,
    slot: matchup.slot,
    blocker: matchup.offensePlayer,
    defender: matchup.defensePlayer,
    dlTackling,
    swipeScore,
    roll,
    tackled,
  };
}

export type FallForwardResult = {
  runner: string;
  runnerSize: number;
  runnerStrength: number;
  fallForwardScore: number;
  roll: number;
  succeeded: boolean;
  yardsAdded: number;
};

export function performFallForwardCheck(
  runnerName: string,
  players: PlayerTrait[]
): FallForwardResult {
  const runner = findPlayerByName(players, runnerName);

  const runnerSize = trait(runner, "size");
  const runnerStrength = trait(runner, "strength");

  const fallForwardScore = (((runnerSize + runnerStrength) / 20) ** 2);

  const roll = Math.random() * 100;

  const succeeded = roll <= fallForwardScore;

  return {
    runner: runnerName,
    runnerSize,
    runnerStrength,
    fallForwardScore,
    roll,
    succeeded,
    yardsAdded: succeeded ? 1 : 0,
  };
}

export type CarryDefenderResult = {
  runner: string;
  runnerSize: number;
  runnerStrength: number;
  carryScore: number;
  rolls: number[];
  yardsAdded: number;
};

export function performCarryDefenderChecks(
  runnerName: string,
  players: PlayerTrait[]
): CarryDefenderResult {
  const runner = findPlayerByName(players, runnerName);

  const runnerSize = trait(runner, "size");
  const runnerStrength = trait(runner, "strength");
  const carryScore = (runnerSize + runnerStrength) / 2;
  const rolls = [Math.random() * 100, Math.random() * 100];
  const yardsAdded = rolls.filter((roll) => roll <= carryScore).length;

  return {
    runner: runnerName,
    runnerSize,
    runnerStrength,
    carryScore,
    rolls,
    yardsAdded,
  };
}

export function handleRunnerTackle(
  state: RunPlayState,
  tackler: string,
  reason: string,
  players: PlayerTrait[]
): FallForwardResult {
  const fallForwardResult = performFallForwardCheck(state.runner, players);

  if (fallForwardResult.succeeded) {
    state.yards += fallForwardResult.yardsAdded;
    state.log.push(
      `${state.runner} falls forward for +${fallForwardResult.yardsAdded} yard.`
    );
  }

  state.tackler = tackler;
  state.stopped = true;
  state.stopReason = reason;
  state.log.push(`${tackler} tackles ${state.runner}. Reason: ${reason}.`);

  return fallForwardResult;
}

export function handleLbWrapTackle(
  state: RunPlayState,
  tackler: string,
  reason: string,
  players: PlayerTrait[]
): CarryDefenderResult {
  const carryDefenderResult = performCarryDefenderChecks(state.runner, players);

  if (carryDefenderResult.yardsAdded > 0) {
    state.yards += carryDefenderResult.yardsAdded;
    state.log.push(
      `${state.runner} carries ${tackler} for +${carryDefenderResult.yardsAdded} extra ${carryDefenderResult.yardsAdded === 1 ? "yard" : "yards"}.`
    );
  }

  state.tackler = tackler;
  state.stopped = true;
  state.stopReason = reason;
  state.log.push(`${tackler} tackles ${state.runner}. Reason: ${reason}.`);

  return carryDefenderResult;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getAccelToLBYards(
  runner: PlayerTrait | undefined,
  settings: FrontendSettings | undefined,
  modLog?: string[]
) {
  const baseRoll = Math.floor(Math.random() * 101);
  const acceleration = trait(runner, "acceleration");
  const accelerationMod = ((acceleration / 10) ** 2) / 9;
  const adjustedRoll = Math.min(100, baseRoll + accelerationMod);

  let cumulative = 0;
  const accelToLBSettings = settingArray<RunAccelToLBSetting>(settings, "accelToLBYards");
  for (const range of accelToLBSettings) {
    cumulative += Number(range.percentage) || 0;
    if (adjustedRoll <= cumulative) {
      const yards = Number(range.yards) || 0;
      modLog?.push(
        `Yard +${yards} Accel to LB (roll ${adjustedRoll.toFixed(2)} = ${baseRoll} + ${accelerationMod.toFixed(2)})`
      );
      return yards;
    }
  }

  const fallbackYards = Number(accelToLBSettings[accelToLBSettings.length - 1]?.yards) || 0;
  if (fallbackYards) {
    modLog?.push(
      `Yard +${fallbackYards} Accel to LB (capped roll ${adjustedRoll.toFixed(2)})`
    );
  }
  return fallbackYards;
}

export type DefenderWrapResult = {
  defender: string;
  defenderTackling: number;
  dlTackling: number;
  wrapScore: number;
  roll: number;
  wrapped: boolean;
};

export type DlWrapResult = DefenderWrapResult;

export function performDefenderWrapCheck(
  defenderName: string,
  players: PlayerTrait[]
): DefenderWrapResult {
  const defender = findPlayerByName(players, defenderName);

  const defenderTackling = trait(defender, "tackling");

  const wrapScore = defenderTackling / 2;

  const roll = Math.random() * 100;

  const wrapped = roll <= wrapScore;

  return {
    defender: defenderName,
    defenderTackling,
    dlTackling: defenderTackling,
    wrapScore,
    roll,
    wrapped,
  };
}

export function performDlWrapCheck(
  defenderName: string,
  players: PlayerTrait[]
): DlWrapResult {
  return performDefenderWrapCheck(defenderName, players);
}


type RunLaneSide = "left" | "center" | "right";

function laneSide(slot: FormationSlot): RunLaneSide {
  const slotIndex = TEOL_SLOTS.indexOf(slot);
  const centerIndex = TEOL_SLOTS.indexOf(CENTER_SLOT);

  if (slotIndex < 0 || slotIndex === centerIndex) return "center";
  return slotIndex < centerIndex ? "left" : "right";
}

function assignmentSide(assignment: DefensiveAssignment): RunLaneSide {
  return assignment.align ? laneSide(assignment.align) : "center";
}

function lbPositionNumber(assignment: DefensiveAssignment): number {
  return Number(assignment.position.match(/\d+/)?.[0] ?? 0);
}

export function pickLinebackerForRunLane(
  defenseFormation: DefensiveAssignment[],
  selectedSlot: FormationSlot,
  runnerSlot?: FormationSlot
): DefensiveAssignment | undefined {
  const linebackers = defenseFormation
    .filter((assignment) => assignment.player && assignment.position.startsWith("LB"))
    .sort((a, b) => lbPositionNumber(a) - lbPositionNumber(b));

  if (linebackers.length === 0) return undefined;
  if (linebackers.length === 1) return linebackers[0];

  const side = laneSide(selectedSlot);

  if (side === "center") {
    return (
      linebackers.find((assignment) => runnerSlot && assignment.align === runnerSlot) ??
      linebackers.find((assignment) => assignmentSide(assignment) === "center") ??
      linebackers[0]
    );
  }

  const sameSideLinebacker = linebackers.find(
    (assignment) => assignmentSide(assignment) === side
  );

  if (sameSideLinebacker) return sameSideLinebacker;

  return side === "left"
    ? linebackers[0]
    : linebackers[linebackers.length - 1];
}

export type LbSecondLevelResult = {
  linebacker?: DefensiveAssignment;
  wrapResult?: DefenderWrapResult;
  jukeResult?: LbJukeResult;
  fallForwardResult?: FallForwardResult;
  carryDefenderResult?: CarryDefenderResult;
  secondChanceAttempt?: "Juke" | "Truck";
  nextLevelPressure?: LbNextLevelPressureResult;
  stopped: boolean;
};

export type LbNextLevelPressureResult = {
  otherLinebacker?: DefensiveAssignment;
  hasDbChase: boolean;
  accelerationRoll?: number;
  runnerAcceleration: number;
  escaped: boolean;
};

export type LbJukeResult = {
  runner: string;
  defender: string;
  runnerJukeTrait: number;
  defenderTacklingTrait: number;
  rbJukeScore: number;
  lbDefendScore: number;
  targetToBeat: number;
  roll: number;
  juked: boolean;
};

export function performLbJukeCheck(
  runnerName: string,
  defenderName: string,
  players: PlayerTrait[]
): LbJukeResult {
  const runner = findPlayerByName(players, runnerName);
  const defender = findPlayerByName(players, defenderName);

  const runnerJukeTrait = trait(runner, "juke");
  const defenderTacklingTrait = trait(defender, "tackling");

  const rbJukeScore = 15 + ((runnerJukeTrait / 10) ** 2) / 3;
  const lbDefendScore = ((defenderTacklingTrait / 15) ** 2) / 2;
  const targetToBeat = rbJukeScore - lbDefendScore;
  const roll = Math.random() * 100;

  return {
    runner: runnerName,
    defender: defenderName,
    runnerJukeTrait,
    defenderTacklingTrait,
    rbJukeScore,
    lbDefendScore,
    targetToBeat,
    roll,
    juked: roll < targetToBeat,
  };
}


function getOtherLinebackerInPlay(
  defenseFormation: DefensiveAssignment[],
  beatenLinebacker: DefensiveAssignment
): DefensiveAssignment | undefined {
  return defenseFormation.find((assignment) =>
    assignment.player &&
    assignment.position.startsWith("LB") &&
    assignment.player !== beatenLinebacker.player
  );
}

function hasDbChasingPlay(
  defenseFormation: DefensiveAssignment[],
  runLaneTarget: RunLaneTargetResult
): boolean {
  void defenseFormation;
  void runLaneTarget;
  // TODO: Calculate DB pursuit once defensive back chase logic is implemented.
  return false;
}

function resolvePostJukeSecondLevelPressure(
  runState: RunPlayState,
  defenseFormation: DefensiveAssignment[],
  beatenLinebacker: DefensiveAssignment,
  runLaneTarget: RunLaneTargetResult,
  players: PlayerTrait[]
): LbNextLevelPressureResult {
  const otherLinebacker = getOtherLinebackerInPlay(defenseFormation, beatenLinebacker);
  const hasDbChase = hasDbChasingPlay(defenseFormation, runLaneTarget);
  const runnerAcceleration = trait(findPlayerByName(players, runState.runner), "acceleration");

  if (!otherLinebacker && !hasDbChase) {
    runState.log.push(`${runState.runner} has no other linebackers or defensive backs in chase and takes off into the secondary.`);
    return { hasDbChase, runnerAcceleration, escaped: true };
  }

  if (otherLinebacker) {
    const accelerationRoll = Math.random() * 100;
    const escaped = accelerationRoll <= runnerAcceleration;

    if (escaped) {
      runState.log.push(
        `${runState.runner} accelerates past ${otherLinebacker.player} (roll ${accelerationRoll.toFixed(2)} <= ${runnerAcceleration.toFixed(2)}) and takes off into the secondary.`
      );
    } else {
      handleRunnerTackle(
        runState,
        otherLinebacker.player,
        "LB Post-Juke Acceleration Failed",
        players
      );
    }

    return { otherLinebacker, hasDbChase, accelerationRoll, runnerAcceleration, escaped };
  }

  runState.log.push(`${runState.runner} beat the linebacker, but DB chase resolution is not implemented yet.`);
  return { hasDbChase, runnerAcceleration, escaped: true };
}

export function resolveLinebackerSecondLevel(
  runState: RunPlayState,
  defenseFormation: DefensiveAssignment[],
  runLaneTarget: RunLaneTargetResult,
  offenseFormation: Partial<Record<FormationSlot, string>>,
  players: PlayerTrait[]
): LbSecondLevelResult {
  const runnerSlot = (Object.entries(offenseFormation) as [FormationSlot, string | undefined][])
    .find(([, player]) => player === runState.runner)?.[0];
  const linebacker = pickLinebackerForRunLane(
    defenseFormation,
    runLaneTarget.selectedSlot,
    runnerSlot
  );

  if (!linebacker) {
    runState.log.push(`${runState.runner} reaches the second level with no linebacker in position.`);
    return { stopped: false };
  }

  runState.log.push(`${runState.runner} meets ${linebacker.player} at the second level.`);

  const wrapResult = performDefenderWrapCheck(linebacker.player, players);
  let carryDefenderResult: CarryDefenderResult | undefined;
  let fallForwardResult: FallForwardResult | undefined;
  let jukeResult: LbJukeResult | undefined;
  let nextLevelPressure: LbNextLevelPressureResult | undefined;
  let secondChanceAttempt: "Juke" | "Truck" | undefined;

  if (wrapResult.wrapped) {
    carryDefenderResult = handleLbWrapTackle(runState, linebacker.player, "LB Second-Level Wrap", players);
  } else {
    runState.log.push(`${linebacker.player} fails to wrap ${runState.runner} at the second level.`);

    secondChanceAttempt = Math.random() < 0.5 ? "Juke" : "Truck";

    if (secondChanceAttempt === "Juke") {
      jukeResult = performLbJukeCheck(runState.runner, linebacker.player, players);

      if (jukeResult.juked) {
        runState.log.push(
          `${runState.runner} jukes ${linebacker.player} at the second level (roll ${jukeResult.roll.toFixed(2)} < ${jukeResult.targetToBeat.toFixed(2)}).`
        );
        nextLevelPressure = resolvePostJukeSecondLevelPressure(
          runState,
          defenseFormation,
          linebacker,
          runLaneTarget,
          players
        );
      } else {
        fallForwardResult = handleRunnerTackle(
          runState,
          linebacker.player,
          "LB Second-Level Juke Failed",
          players
        );
      }
    } else {
      runState.log.push(
        `${runState.runner} lowers a shoulder into ${linebacker.player}; truck check is not implemented yet.`
      );
    }
  }

  return {
    linebacker,
    wrapResult,
    jukeResult,
    fallForwardResult,
    carryDefenderResult,
    secondChanceAttempt,
    nextLevelPressure,
    stopped: runState.stopped,
  };
}

export type DlJukeResult = {
  runner: string;
  defender: string;
  runnerJuke: number;
  jukeScore: number;
  roll: number;
  juked: boolean;
};

export function performDlJukeCheck(
  runnerName: string,
  defenderName: string,
  players: PlayerTrait[]
): DlJukeResult {
  const runner = findPlayerByName(players, runnerName);

  const runnerJuke = trait(runner, "juke");

  const jukeScore = ((runnerJuke / 10) ** 2) / 2;

  const roll = Math.random() * 100;

  const juked = roll <= jukeScore;

  return {
    runner: runnerName,
    defender: defenderName,
    runnerJuke,
    jukeScore,
    roll,
    juked,
  };
}

export function getOtherWinningDLs(
  lineWinLossArray: LineWinLossResult[],
  challengedDefender: string
): LineWinLossResult[] {
  return lineWinLossArray.filter(
    (battle) =>
      battle.winner === "DL" &&
      battle.defensePlayer &&
      battle.defensePlayer !== challengedDefender
  );
}

export type AccelerationCheckResult = {
  runner: string;
  runnerAcceleration: number;
  roll: number;
  succeeded: boolean;
};

export type DlPursuitStep = {
  defender: string;
  accelerationCheck: AccelerationCheckResult;
  wrapResult?: DlWrapResult;
  jukeResult?: DlJukeResult;
  outcome: "Accelerated Past DLs" | "Wrapped" | "Juked" | "Juke Failed";
};

export type DlPursuitResult = {
  clearedDLs: boolean;
  stopped: boolean;
  finalDefender?: string;
  steps: DlPursuitStep[];
};

export function performAccelerationCheck(
  runnerName: string,
  players: PlayerTrait[]
): AccelerationCheckResult {
  const runner = findPlayerByName(players, runnerName);

  const runnerAcceleration = trait(runner, "acceleration");

  const roll = Math.random() * 100;

  const succeeded = roll <= runnerAcceleration;

  return {
    runner: runnerName,
    runnerAcceleration,
    roll,
    succeeded,
  };
}

export function resolveRemainingDlPursuit(
  runState: RunPlayState,
  remainingWinningDLs: LineWinLossResult[],
  players: PlayerTrait[]
): DlPursuitResult {
  const steps: DlPursuitStep[] = [];

  for (const dlBattle of remainingWinningDLs) {
    const defenderName = dlBattle.defensePlayer;

    const accelerationCheck = performAccelerationCheck(
      runState.runner,
      players
    );

    if (accelerationCheck.succeeded) {
      steps.push({
        defender: defenderName,
        accelerationCheck,
        outcome: "Accelerated Past DLs",
      });

      runState.log.push(
        `${runState.runner} accelerates past the remaining penetrating defensive linemen.`
      );

      return {
        clearedDLs: true,
        stopped: false,
        steps,
      };
    }

    const wrapResult = performDlWrapCheck(defenderName, players);

    if (wrapResult.wrapped) {
      const fallForwardResult = handleRunnerTackle(
        runState,
        defenderName,
        "DL Pursuit Wrap",
        players
      );

      steps.push({
        defender: defenderName,
        accelerationCheck,
        wrapResult,
        outcome: "Wrapped",
      });

      runState.log.push(
        `${defenderName} catches ${runState.runner} from pursuit after the acceleration check failed.`
      );

      void fallForwardResult;

      return {
        clearedDLs: false,
        stopped: true,
        finalDefender: defenderName,
        steps,
      };
    }

    const jukeResult = performDlJukeCheck(
      runState.runner,
      defenderName,
      players
    );

    if (!jukeResult.juked) {
      const fallForwardResult = handleRunnerTackle(
        runState,
        defenderName,
        "DL Pursuit Juke Failed",
        players
      );

      steps.push({
        defender: defenderName,
        accelerationCheck,
        wrapResult,
        jukeResult,
        outcome: "Juke Failed",
      });

      void fallForwardResult;

      return {
        clearedDLs: false,
        stopped: true,
        finalDefender: defenderName,
        steps,
      };
    }

    steps.push({
      defender: defenderName,
      accelerationCheck,
      wrapResult,
      jukeResult,
      outcome: "Juked",
    });

    runState.log.push(
      `${runState.runner} jukes ${defenderName} in pursuit.`
    );
  }

  runState.log.push(
    `${runState.runner} escapes all penetrating defensive linemen and heads toward the second level.`
  );

  return {
    clearedDLs: true,
    stopped: false,
    steps,
  };
}
