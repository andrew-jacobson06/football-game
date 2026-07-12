import type {
  FormationSlot,
  DefensiveAssignment,
  PlayerTrait,
  RunAccelToLBSetting,
  RunSecondarySpeedSetting,
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


export type RunnerDefenderSecondChanceAttempt = {
  attempt: "Juke" | "Truck";
  truckChance: number;
  sizeDifference: number;
  cappedSizeDifference: number;
  roll: number;
};

export function chooseRunnerDefenderSecondChanceAttempt(
  runnerName: string,
  defenderName: string,
  players: PlayerTrait[]
): RunnerDefenderSecondChanceAttempt {
  const runner = findPlayerByName(players, runnerName);
  const defender = findPlayerByName(players, defenderName);
  const sizeDifference = trait(runner, "size") - trait(defender, "size");
  const cappedSizeDifference = Math.max(-25, Math.min(25, sizeDifference));
  const truckChance = 50 + cappedSizeDifference;
  const roll = Math.random() * 100;

  return {
    attempt: roll < truckChance ? "Truck" : "Juke",
    truckChance,
    sizeDifference,
    cappedSizeDifference,
    roll,
  };
}


export type TruckAttemptResult = {
  runner: string;
  defender: string;
  runnerPower: number;
  defenderPower: number;
  truckChance: number;
  roll: number;
  trucked: boolean;
};

export function performTruckAttempt(
  runnerName: string,
  defenderName: string,
  players: PlayerTrait[]
): TruckAttemptResult {
  const runner = findPlayerByName(players, runnerName);
  const defender = findPlayerByName(players, defenderName);
  const runnerPower = trait(runner, "size") + trait(runner, "strength");
  const defenderPower = trait(defender, "size") + trait(defender, "strength");
  const totalPower = runnerPower + defenderPower;
  const truckChance = totalPower > 0 ? (runnerPower / (totalPower + 80)) * 100 : 0;
  const roll = Math.random() * 100;

  return {
    runner: runnerName,
    defender: defenderName,
    runnerPower,
    defenderPower,
    truckChance,
    roll,
    trucked: roll <= truckChance,
  };
}

export type PostContactAccelerationCheckType = "truck" | "juke";

export type TruckOrJukeAccelerationResult = {
  runner: string;
  checkType: PostContactAccelerationCheckType;
  runnerAcceleration: number;
  accelPastChance: number;
  roll: number;
  acceleratedPast: boolean;
};

export function performPostTruckorJukeAccelerationCheck(
  runnerName: string,
  players: PlayerTrait[],
  checkType: PostContactAccelerationCheckType
): TruckOrJukeAccelerationResult {
  const runner = findPlayerByName(players, runnerName);
  const runnerAcceleration = trait(runner, "acceleration");
  const accelPastChance =
    checkType === "juke"
      ? runnerAcceleration
      : ((runnerAcceleration / 10) ** 2) / 3;
  const roll = Math.random() * 100;

  return {
    runner: runnerName,
    checkType,
    runnerAcceleration,
    accelPastChance,
    roll,
    acceleratedPast: roll <= accelPastChance,
  };
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

export function getSecondarySpeedYards(
  runner: PlayerTrait | undefined,
  settings: FrontendSettings | undefined,
  modLog?: string[]
) {
  const baseRoll = Math.floor(Math.random() * 101);
  const speed = trait(runner, "speed");
  const speedMod = (speed / 15) ** 2;
  const adjustedRoll = Math.min(100, baseRoll + speedMod);

  let cumulative = 0;
  const secondarySpeedSettings = settingArray<RunSecondarySpeedSetting>(settings, "secondarySpeedYards");
  for (const range of secondarySpeedSettings) {
    cumulative += Number(range.percentage) || 0;
    if (adjustedRoll <= cumulative) {
      const minYards = Number(range.minYards) || 0;
      const maxYards = Number(range.maxYards) || minYards;
      const yards = randomInt(Math.min(minYards, maxYards), Math.max(minYards, maxYards));
      modLog?.push(
        `Yard +${yards} Secondary Speed (roll ${adjustedRoll.toFixed(2)} = ${baseRoll} + ${speedMod.toFixed(2)})`
      );
      return yards;
    }
  }

  const fallback = secondarySpeedSettings[secondarySpeedSettings.length - 1];
  if (fallback) {
    const minYards = Number(fallback.minYards) || 0;
    const maxYards = Number(fallback.maxYards) || minYards;
    const yards = randomInt(Math.min(minYards, maxYards), Math.max(minYards, maxYards));
    modLog?.push(
      `Yard +${yards} Secondary Speed (capped roll ${adjustedRoll.toFixed(2)})`
    );
    return yards;
  }

  return 0;
}

function addSecondarySpeedYards(
  runState: RunPlayState,
  players: PlayerTrait[],
  settings: FrontendSettings | undefined,
  defenseFormation: DefensiveAssignment[] = []
) {
  const secondarySpeedYards = getSecondarySpeedYards(
    findPlayerByName(players, runState.runner),
    settings,
    runState.log
  );
  if (secondarySpeedYards > 0) {
    addYards(
      runState,
      secondarySpeedYards,
      `${runState.runner} uses speed in the secondary before pursuit can close`
    );
  }

  resolveSecondaryPursuit(runState, defenseFormation, players);
}

export type SecondaryPursuitResult = {
  chaser?: string;
  runnerSpeed: number;
  chaserSpeed: number;
  totalPursuitScore: number;
  pursuitRoll: number;
  speedCheck: number;
  speedRoll: number;
  escaped: boolean;
};

export function resolveSecondaryPursuit(
  runState: RunPlayState,
  defenseFormation: DefensiveAssignment[],
  players: PlayerTrait[]
): SecondaryPursuitResult | undefined {
  if (runState.stopped) return undefined;

  const pursuitCandidates = defenseFormation
    .filter((assignment) =>
      assignment.player &&
      (assignment.position.startsWith("LB") ||
        assignment.position.startsWith("DB") ||
        assignment.position.startsWith("S"))
    )
    .map((assignment) => {
      const player = findPlayerByName(players, assignment.player);
      const speed = trait(player, "speed");
      return {
        assignment,
        speed,
        pursuitScore: (speed / 10) ** 2,
      };
    })
    .filter(({ pursuitScore }) => pursuitScore > 0);

  const totalPursuitScore = pursuitCandidates.reduce(
    (sum, candidate) => sum + candidate.pursuitScore,
    0
  );

  if (totalPursuitScore <= 0) return undefined;

  const pursuitRoll = Math.random() * totalPursuitScore;
  let runningScore = 0;
  const selectedCandidate =
    pursuitCandidates.find((candidate) => {
      runningScore += candidate.pursuitScore;
      return pursuitRoll <= runningScore;
    }) ?? pursuitCandidates[pursuitCandidates.length - 1];

  const runnerSpeed = trait(findPlayerByName(players, runState.runner), "speed");
  const chaserSpeed = selectedCandidate.speed;
  const rawSpeedCheck = 50 + runnerSpeed - chaserSpeed;
  const speedCheck = Math.max(5, Math.min(95, rawSpeedCheck));
  const speedRoll = randomInt(1, 100);
  const escaped = speedRoll < speedCheck;
  const chaser = selectedCandidate.assignment.player;

  if (escaped) {
    runState.log.push(
      `${runState.runner} outruns ${chaser} in secondary pursuit (roll ${speedRoll} < ${speedCheck.toFixed(2)}%).`
    );
  } else {
    handleRunnerTackle(
      runState,
      chaser,
      "Secondary Pursuit Speed Check",
      players
    );
    runState.log.push(
      `${chaser} catches ${runState.runner} in secondary pursuit (roll ${speedRoll} >= ${speedCheck.toFixed(2)}%).`
    );
  }

  return {
    chaser,
    runnerSpeed,
    chaserSpeed,
    totalPursuitScore,
    pursuitRoll,
    speedCheck,
    speedRoll,
    escaped,
  };
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

export function getAdjacentDefensiveLinemenForRunLane(
  lineWinLossArray: LineWinLossResult[],
  selectedSlot: FormationSlot,
  jukedDefenders: string[] = []
): DefensiveAssignment[] {
  const selectedIndex = TEOL_SLOTS.indexOf(selectedSlot);
  if (selectedIndex < 0) return [];

  const jukedDefenderSet = new Set(jukedDefenders.filter(Boolean));

  return [selectedIndex - 1, selectedIndex + 1]
    .map((index) => TEOL_SLOTS[index])
    .filter((slot): slot is FormationSlot => Boolean(slot))
    .map((slot) => lineWinLossArray.find((battle) => battle.slot === slot))
    .filter((battle): battle is LineWinLossResult =>
      Boolean(
        battle?.defensePlayer &&
        battle.defensePosition.startsWith("DL") &&
        !jukedDefenderSet.has(battle.defensePlayer)
      )
    )
    .map((battle) => ({
      position: battle.defensePosition,
      player: battle.defensePlayer,
      align: battle.slot,
    }));
}

export function weightedPickDefenderByDefStars(
  defenders: DefensiveAssignment[],
  players: PlayerTrait[]
): DefensiveAssignment | undefined {
  const weightedDefenders = defenders
    .map((defender) => {
      const defensivePlayer = findPlayerByName(players, defender.player);
      return {
        defender,
        weight: trait(defensivePlayer, "defStars") ** 2,
      };
    })
    .filter(({ weight }) => weight > 0);

  if (weightedDefenders.length === 0) return defenders[0];

  const totalWeight = weightedDefenders.reduce((sum, { weight }) => sum + weight, 0);
  const roll = Math.random() * totalWeight;
  let runningTotal = 0;

  for (const weightedDefender of weightedDefenders) {
    runningTotal += weightedDefender.weight;
    if (roll <= runningTotal) return weightedDefender.defender;
  }

  return weightedDefenders[weightedDefenders.length - 1].defender;
}

export function pickShortAccelerationDefender(
  defenseFormation: DefensiveAssignment[],
  lineWinLossArray: LineWinLossResult[],
  runLaneTarget: RunLaneTargetResult,
  offenseFormation: Partial<Record<FormationSlot, string>>,
  runnerName: string,
  jukedDefenders: string[],
  players: PlayerTrait[]
): DefensiveAssignment | undefined {
  const runnerSlot = (Object.entries(offenseFormation) as [FormationSlot, string | undefined][])
    .find(([, player]) => player === runnerName)?.[0];
  const beatenDefenderSet = new Set(jukedDefenders.filter(Boolean));
  const linebacker = pickLinebackerForRunLane(
    defenseFormation.filter((assignment) => !beatenDefenderSet.has(assignment.player)),
    runLaneTarget.selectedSlot,
    runnerSlot
  );
  const adjacentDefensiveLinemen = getAdjacentDefensiveLinemenForRunLane(
    lineWinLossArray,
    runLaneTarget.selectedSlot,
    jukedDefenders
  );
  const candidates = [linebacker, ...adjacentDefensiveLinemen].filter(
    (defender): defender is DefensiveAssignment => Boolean(defender?.player)
  );

  return weightedPickDefenderByDefStars(candidates, players);
}

function getRemainingSecondLevelDefenders(
  defenseFormation: DefensiveAssignment[],
  lineWinLossArray: LineWinLossResult[],
  beatenDefenders: Set<string>,
  includeDefensiveLinemen: boolean
): DefensiveAssignment[] {
  const remainingLinebackers = defenseFormation.filter(
    (assignment) =>
      assignment.player &&
      assignment.position.startsWith("LB") &&
      !beatenDefenders.has(assignment.player)
  );

  const remainingDefensiveLinemen = includeDefensiveLinemen
    ? lineWinLossArray
        .filter(
          (battle) =>
            battle.defensePlayer &&
            battle.defensePosition.startsWith("DL") &&
            !beatenDefenders.has(battle.defensePlayer)
        )
        .map((battle) => ({
          position: battle.defensePosition,
          player: battle.defensePlayer,
          align: battle.slot,
        }))
    : [];

  return [...remainingLinebackers, ...remainingDefensiveLinemen];
}

export type LbSecondLevelResult = {
  linebacker?: DefensiveAssignment;
  wrapResult?: DefenderWrapResult;
  jukeResult?: LbJukeResult;
  fallForwardResult?: FallForwardResult;
  carryDefenderResult?: CarryDefenderResult;
  secondChanceAttempt?: RunnerDefenderSecondChanceAttempt;
  truckResult?: TruckAttemptResult;
  truckAccelerationResult?: TruckOrJukeAccelerationResult;
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


export function resolveLinebackerSecondLevel(
  runState: RunPlayState,
  defenseFormation: DefensiveAssignment[],
  runLaneTarget: RunLaneTargetResult,
  offenseFormation: Partial<Record<FormationSlot, string>>,
  players: PlayerTrait[],
  selectedDefender?: DefensiveAssignment,
  settings?: FrontendSettings,
  lineWinLossArray: LineWinLossResult[] = [],
  beatenDefenders: string[] = []
): LbSecondLevelResult {
  const runnerSlot = (Object.entries(offenseFormation) as [FormationSlot, string | undefined][])
    .find(([, player]) => player === runState.runner)?.[0];
  const beatenDefenderSet = new Set(beatenDefenders.filter(Boolean));
  const eligibleDefenseFormation = defenseFormation.filter(
    (assignment) => !assignment.player || !beatenDefenderSet.has(assignment.player)
  );
  const linebacker = selectedDefender ?? pickLinebackerForRunLane(
    eligibleDefenseFormation,
    runLaneTarget.selectedSlot,
    runnerSlot
  );

  if (!linebacker) {
    runState.log.push(`${runState.runner} reaches the second level with no linebacker in position and breaks into the secondary.`);
    addSecondarySpeedYards(runState, players, settings, defenseFormation);
    return { stopped: false };
  }

  const restartSecondLevelCycle = (beatenDefender: string, action: "juke" | "truck") => {
    beatenDefenderSet.add(beatenDefender);
    const remainingBeforeAcceleration = getRemainingSecondLevelDefenders(
      defenseFormation,
      lineWinLossArray,
      beatenDefenderSet,
      true
    );

    if (remainingBeforeAcceleration.length === 0) {
      runState.log.push(
        `${runState.runner} has no remaining linebackers or defensive linemen after the ${action} and accelerates into the secondary.`
      );
      addSecondarySpeedYards(runState, players, settings, defenseFormation);
      return undefined;
    }

    const escapeAccelerationResult = performPostTruckorJukeAccelerationCheck(
      runState.runner,
      players,
      action
    );
    if (escapeAccelerationResult.acceleratedPast) {
      runState.log.push(
        `${runState.runner} accelerates past the remaining defenders after the ${action} (roll ${escapeAccelerationResult.roll.toFixed(2)} <= ${escapeAccelerationResult.accelPastChance.toFixed(2)}%) and breaks into the secondary.`
      );
      addSecondarySpeedYards(runState, players, settings, defenseFormation);
      return undefined;
    }

    runState.log.push(
      `${runState.runner} cannot accelerate past the remaining defenders after the ${action} (roll ${escapeAccelerationResult.roll.toFixed(2)} > ${escapeAccelerationResult.accelPastChance.toFixed(2)}%), so the next defender-runner interaction is reevaluated.`
    );

    const accelerationYards = getAccelToLBYards(
      findPlayerByName(players, runState.runner),
      settings,
      runState.log
    );
    addYards(
      runState,
      accelerationYards,
      `${runState.runner} restarts downhill after the ${action}`
    );

    const remainingDefenders = getRemainingSecondLevelDefenders(
      defenseFormation,
      lineWinLossArray,
      beatenDefenderSet,
      accelerationYards <= 3
    );
    const nextDefender = weightedPickDefenderByDefStars(remainingDefenders, players);

    if (!nextDefender) {
      runState.log.push(
        `${runState.runner} has no remaining eligible defenders after gaining +${accelerationYards} and accelerates into the secondary.`
      );
      addSecondarySpeedYards(runState, players, settings, defenseFormation);
      return undefined;
    }

    return resolveLinebackerSecondLevel(
      runState,
      defenseFormation,
      runLaneTarget,
      offenseFormation,
      players,
      nextDefender,
      settings,
      lineWinLossArray,
      Array.from(beatenDefenderSet)
    );
  };

  runState.log.push(`${runState.runner} meets ${linebacker.player} at the second level.`);

  const wrapResult = performDefenderWrapCheck(linebacker.player, players);
  let carryDefenderResult: CarryDefenderResult | undefined;
  let fallForwardResult: FallForwardResult | undefined;
  let jukeResult: LbJukeResult | undefined;
  let secondChanceAttempt: RunnerDefenderSecondChanceAttempt | undefined;
  let truckResult: TruckAttemptResult | undefined;

  if (wrapResult.wrapped) {
    carryDefenderResult = handleLbWrapTackle(runState, linebacker.player, "LB Second-Level Wrap", players);
  } else {
    runState.log.push(`${linebacker.player} fails to wrap ${runState.runner} at the second level.`);

    secondChanceAttempt = chooseRunnerDefenderSecondChanceAttempt(
      runState.runner,
      linebacker.player,
      players
    );

    runState.log.push(
      `${runState.runner} chooses to ${secondChanceAttempt.attempt.toLowerCase()} ${linebacker.player} ` +
      `(truck chance ${secondChanceAttempt.truckChance.toFixed(2)}%, size diff ${secondChanceAttempt.cappedSizeDifference}).`
    );

    if (secondChanceAttempt.attempt === "Juke") {
      jukeResult = performLbJukeCheck(runState.runner, linebacker.player, players);

      if (jukeResult.juked) {
        runState.log.push(
          `${runState.runner} jukes ${linebacker.player} at the second level (roll ${jukeResult.roll.toFixed(2)} < ${jukeResult.targetToBeat.toFixed(2)}).`
        );
        const recursiveResult = restartSecondLevelCycle(linebacker.player, "juke");
        if (recursiveResult) {
          return {
            ...recursiveResult,
            linebacker,
            wrapResult,
            jukeResult,
            fallForwardResult,
            carryDefenderResult,
            secondChanceAttempt,
            truckResult,
            stopped: runState.stopped,
          };
        }
      } else {
        fallForwardResult = handleRunnerTackle(
          runState,
          linebacker.player,
          "LB Second-Level Juke Failed",
          players
        );
      }
    } else {
      truckResult = performTruckAttempt(runState.runner, linebacker.player, players);

      if (!truckResult.trucked) {
        runState.log.push(
          `${runState.runner} fails to truck ${linebacker.player} at the second level (roll ${truckResult.roll.toFixed(2)} > ${truckResult.truckChance.toFixed(2)}%).`
        );
        carryDefenderResult = handleLbWrapTackle(
          runState,
          linebacker.player,
          "LB Second-Level Truck Failed",
          players
        );
      } else {
        runState.log.push(
          `${runState.runner} trucks ${linebacker.player} at the second level (roll ${truckResult.roll.toFixed(2)} <= ${truckResult.truckChance.toFixed(2)}%) and tries to accelerate again.`
        );

        const recursiveResult = restartSecondLevelCycle(linebacker.player, "truck");
        if (recursiveResult) {
          return {
            ...recursiveResult,
            linebacker,
            wrapResult,
            jukeResult,
            fallForwardResult,
            carryDefenderResult,
            secondChanceAttempt,
            truckResult,
            stopped: runState.stopped,
          };
        }
      }
    }
  }

  return {
    linebacker,
    wrapResult,
    jukeResult,
    fallForwardResult,
    carryDefenderResult,
    secondChanceAttempt,
    truckResult,
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

export type DlPursuitStep = {
  defender: string;
  accelerationCheck: TruckOrJukeAccelerationResult;
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

export function resolveRemainingDlPursuit(
  runState: RunPlayState,
  remainingWinningDLs: LineWinLossResult[],
  players: PlayerTrait[]
): DlPursuitResult {
  const steps: DlPursuitStep[] = [];

  for (const dlBattle of remainingWinningDLs) {
    const defenderName = dlBattle.defensePlayer;

    const accelerationCheck = performPostTruckorJukeAccelerationCheck(
      runState.runner,
      players,
      "juke"
    );

    if (accelerationCheck.acceleratedPast) {
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
