import type {
  FormationSlot,
  DefensiveAssignment,
  PlayerTrait,
  RunAccelToLBSetting,
  RunSecondarySpeedSetting,
  RunSecondaryBreakawaySetting,
  FrontendSettings,
  RunPlayState
} from "./types";

const TEOL_SLOTS: FormationSlot[] = ["TEOL1", "TEOL2", "TEOL3", "TEOL4", "TEOL5"];
const CENTER_SLOT: FormationSlot = "TEOL3";

/** Reads an optional frontend setting array and returns an empty list when the setting is absent. Run-yardage helpers use this to stay safe when tuning data is not loaded. */
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

/** Builds the offensive-line versus defensive-line battles for each trench slot. It is used by `performLineWinLoss` to decide who controls each run lane. */
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

/** Normalizes trait-name spelling and casing before reading a numeric player trait. It is the central trait accessor used by every helper in this file and by run-engine callers. */
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

/** Looks up a player object by the display/name fields used across roster data. It is used anywhere the run engine has a player name but needs trait values. */
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

/** Resolves every OL/DL trench matchup and records whether the blocker or defender wins. `runPlay` uses this as the first phase of the detailed run simulation. */
export function performLineWinLoss(
  offenseFormation: Partial<Record<FormationSlot, string>>,
  defenseFormation: DefensiveAssignment[],
  players: PlayerTrait[]
): LineWinLossResult[] {
  const olDlMatchups = buildOlDlMatchups(offenseFormation, defenseFormation);

  return olDlMatchups.map((matchup) => {
    const offensivePlayer = findPlayerByName(players, matchup.offensePlayer);
    const defensivePlayer = findPlayerByName(players, matchup.defensePlayer);

    const olRunBlocking = trait(offensivePlayer, "Run Blocking"); // TRAIT USED: RunBlocking - measures how well this blocker controls the run lane.
    const dlRunStop = trait(defensivePlayer, "RunStop"); // TRAIT USED: RunStop - measures how likely this defender is to penetrate the lane.

    // Start the trench battle at 50/50, then shift it by the defender-minus-blocker trait gap.
    const rawDlWinChance = 50 + dlRunStop - olRunBlocking;

    // Clamp the chance so great players matter without making a single matchup completely deterministic.
    const dlWinChance = Math.max(5, Math.min(95, rawDlWinChance));

    const roll = Math.random() * 100;

    // Low rolls are defensive wins because `dlWinChance` is the DL success target.
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

/** Determines whether the runner sees and reaches the intended hole after the line battle. `runPlay` uses the result to branch into either a backfield challenge or a clean lane. */
export function performVisionCheck(
  runnerName: string,
  players: PlayerTrait[],
  lineWinLossArray: LineWinLossResult[],
  runBlockingModifier: number
): VisionCheckResult {
  const runner = findPlayerByName(players, runnerName);
  const runnerVision = trait(runner, "vision"); // TRAIT USED: Vision - determines whether the runner can identify and hit the crease.

  // Count line wins to detect automatic outcomes and explain how blocking modifies the vision target.
  const olWins = lineWinLossArray.filter((battle) => battle.winner === "OL").length;
  const dlWins = lineWinLossArray.filter((battle) => battle.winner === "DL").length;
  const totalBattles = lineWinLossArray.length;

  const allOlWon = totalBattles > 0 && olWins === totalBattles;
  const allDlWon = totalBattles > 0 && dlWins === totalBattles;

  // Vision starts from the runner trait plus the line result; the clamp keeps the target in percent-roll bounds.
  const rawVisionTarget = ((runnerVision * 0.19) + 75) + runBlockingModifier;

  const visionTarget = Math.max(0, Math.min(100, rawVisionTarget));

  if (allOlWon) {
    // Perfect blocking means every gap is clean enough that the runner automatically reaches the second phase.
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
    // Perfect penetration means the runner has no viable read and is automatically trapped in the backfield.
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

  // Passing this percentage check sends the play past the DL; failing it creates the backfield challenge.
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

/** Chooses one candidate proportionally to its trait value. Lane and defender selection helpers use it when several successful blockers or defenders could become the focal point. */
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

/** Picks the specific blocker or defender that defines the run lane after the vision check. `runPlay` uses this selected target to decide DL swipe/wrap pressure and second-level alignment. */
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
        const traitValue = trait(offensivePlayer, "runBlocking"); // TRAIT USED: RunBlocking

        return {
          slot: battle.slot,
          player: battle.offensePlayer,
          side: "OL" as const,
          traitValue,
        };
      }

      const defensivePlayer = findPlayerByName(players, battle.defensePlayer);
      const traitValue = trait(defensivePlayer, "runStop"); // TRAIT USED: RunStop

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

/** Creates the mutable state object that tracks yards, stoppage, tackler, and human-readable run logs. `runPlay` passes this object through every phase. */
export function createRunPlayState(runner: string): RunPlayState {
  return {
    yards: 0,
    runner,
    stopped: false,
    log: [],
  };
}

/** Adds yardage to the current run state and records the reason in the play log. It is used throughout the run pipeline whenever acceleration, contact, or pursuit changes the gain. */
export function addYards(
  state: RunPlayState,
  yards: number,
  reason: string
): RunPlayState {
  state.yards += yards;
  state.log.push(`${reason}: ${yards >= 0 ? "+" : ""}${yards} yards.`);
  return state;
}

/** Marks the run as stopped without running extra contact checks. It is available for direct stoppages, though most current tackles use `handleRunnerTackle` or `handleLbWrapTackle`. */
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

/** Decides whether a runner who survived initial contact should truck or juke based on the size matchup. DL and LB contact branches use this before resolving the chosen move. */
export function chooseRunnerDefenderSecondChanceAttempt(
  runnerName: string,
  defenderName: string,
  players: PlayerTrait[]
): RunnerDefenderSecondChanceAttempt {
  const runner = findPlayerByName(players, runnerName);
  const defender = findPlayerByName(players, defenderName);
  const sizeDifference = trait(runner, "size") - trait(defender, "size"); // TRAIT USED: Size TRAIT USED: Size
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

/** Resolves a truck attempt by comparing runner and defender power. It is used after `chooseRunnerDefenderSecondChanceAttempt` selects Truck. */
export function performTruckAttempt(
  runnerName: string,
  defenderName: string,
  players: PlayerTrait[]
): TruckAttemptResult {
  const runner = findPlayerByName(players, runnerName);
  const defender = findPlayerByName(players, defenderName);
  const runnerPower = trait(runner, "size") + trait(runner, "strength"); // TRAIT USED: Size TRAIT USED: Strength
  const defenderPower = trait(defender, "size") + trait(defender, "strength"); // TRAIT USED: Size TRAIT USED: Strength
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

/** Checks whether the runner can accelerate away after a successful truck or juke. Backfield pursuit and second-level restart logic use it before assigning another defender. */
export function performPostTruckorJukeAccelerationCheck(
  runnerName: string,
  players: PlayerTrait[],
  checkType: PostContactAccelerationCheckType
): TruckOrJukeAccelerationResult {
  const runner = findPlayerByName(players, runnerName);
  const runnerAcceleration = trait(runner, "acceleration"); // TRAIT USED: Acceleration
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

/** Gives a beaten defensive lineman a chance to swipe the runner at the line. `runPlay` uses it on clean frontside lanes before the runner accelerates to linebackers. */
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

  const dlTackling = trait(defensivePlayer, "tackling"); // TRAIT USED: Tackling

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

/** Gives a tackled runner a chance to fall forward for an extra yard. Tackle handlers use it when the runner is brought down by DL-style contact. */
export function performFallForwardCheck(
  runnerName: string,
  players: PlayerTrait[]
): FallForwardResult {
  const runner = findPlayerByName(players, runnerName);

  const runnerSize = trait(runner, "size"); // TRAIT USED: Size
  const runnerStrength = trait(runner, "strength"); // TRAIT USED: Strength

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

/** Gives a wrapped runner up to two extra yards for carrying a defender. Linebacker tackle handling uses it to model power through contact. */
export function performCarryDefenderChecks(
  runnerName: string,
  players: PlayerTrait[]
): CarryDefenderResult {
  const runner = findPlayerByName(players, runnerName);

  const runnerSize = trait(runner, "size"); // TRAIT USED: Size
  const runnerStrength = trait(runner, "strength"); // TRAIT USED: Strength
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

/** Applies a standard tackle, including the fall-forward check, and marks the play stopped. DL tackles, pursuit tackles, and secondary pursuit all call this helper. */
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

/** Applies a linebacker wrap tackle, including possible carry-the-defender yards, and marks the play stopped. The second-level branch uses it for LB wraps and failed trucks. */
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

/** Returns an inclusive random integer for yardage ranges. Both legacy and current run logic use it for bounded random gains or losses. */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Rolls how many yards the runner gains while accelerating from the line to linebacker depth. `runPlay` and second-level restart logic use it before choosing the next defender. */
export function getAccelToLBYards(
  runner: PlayerTrait | undefined,
  settings: FrontendSettings | undefined,
  modLog?: string[]
) {
  const baseRoll = Math.floor(Math.random() * 101);
  const acceleration = trait(runner, "acceleration"); // TRAIT USED: Acceleration
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

/** Rolls extra open-field yards using the runner's speed and configured secondary-yard buckets. Secondary entry points use it before resolving chase pursuit. */
export function getSecondarySpeedYards(
  runner: PlayerTrait | undefined,
  settings: FrontendSettings | undefined,
  modLog?: string[]
) {
  const baseRoll = Math.floor(Math.random() * 101);
  const speed = trait(runner, "speed"); // TRAIT USED: Speed
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

/** Adds open-field speed yardage and immediately resolves secondary pursuit. It is used when a runner clears linebackers or no linebacker is in position. */
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

  const pursuitResult = resolveSecondaryPursuit(runState, defenseFormation, players);
  if (pursuitResult?.escaped) {
    addSecondaryBreakawayYards(runState, players, settings);
    tackleByFastestSecondaryDefender(runState, defenseFormation, players);
  }
}


/** Rolls true breakaway yardage after the runner has escaped the initial secondary DB/LB chase. A separate speed check determines whether the speed modifier applies to the yardage-bucket roll. */
export function getSecondaryBreakawayYards(
  runner: PlayerTrait | undefined,
  settings: FrontendSettings | undefined,
  modLog?: string[]
) {
  const speed = trait(runner, "speed"); // TRAIT USED: Speed
  const speedModifier = (speed / 18) ** 2;
  const modifierChance = ((speed / 15) ** 2) / 100;
  const modifierRoll = Math.floor(Math.random() * 101);
  const modifierApplied = modifierRoll <= modifierChance;
  const baseRoll = Math.floor(Math.random() * 101);
  const adjustedRoll = Math.min(100, baseRoll + (modifierApplied ? speedModifier : 0));

  let cumulative = 0;
  const breakawaySettings = settingArray<RunSecondaryBreakawaySetting>(settings, "secondaryBreakawayYards");
  for (const range of breakawaySettings) {
    cumulative += Number(range.percentage) || 0;
    if (adjustedRoll <= cumulative) {
      const minYards = Number(range.minYards) || 0;
      const maxYards = Number(range.maxYards) || minYards;
      const yards = randomInt(Math.min(minYards, maxYards), Math.max(minYards, maxYards));
      modLog?.push(
        `Yard +${yards} Breakaway (roll ${adjustedRoll.toFixed(2)} = ${baseRoll}${modifierApplied ? ` + ${speedModifier.toFixed(2)} Speed` : ""}; speed bonus roll ${modifierRoll} <= ${modifierChance.toFixed(2)} ${modifierApplied ? "applied" : "failed"})`
      );
      return yards;
    }
  }

  const fallback = breakawaySettings[breakawaySettings.length - 1];
  if (fallback) {
    const minYards = Number(fallback.minYards) || 0;
    const maxYards = Number(fallback.maxYards) || minYards;
    const yards = randomInt(Math.min(minYards, maxYards), Math.max(minYards, maxYards));
    modLog?.push(
      `Yard +${yards} Breakaway (capped roll ${adjustedRoll.toFixed(2)}; speed bonus ${modifierApplied ? "applied" : "failed"})`
    );
    return yards;
  }

  modLog?.push(
    `Breakaway yardage skipped because no Breakaway_ settings were loaded (roll ${adjustedRoll.toFixed(2)}).`
  );
  return 0;
}

function addSecondaryBreakawayYards(
  runState: RunPlayState,
  players: PlayerTrait[],
  settings: FrontendSettings | undefined
) {
  const breakawayYards = getSecondaryBreakawayYards(
    findPlayerByName(players, runState.runner),
    settings,
    runState.log
  );
  if (breakawayYards > 0) {
    addYards(
      runState,
      breakawayYards,
      `${runState.runner} breaks away after escaping the initial secondary pursuit`
    );
  }
}

function tackleByFastestSecondaryDefender(
  runState: RunPlayState,
  defenseFormation: DefensiveAssignment[],
  players: PlayerTrait[]
) {
  if (runState.stopped) return;

  const fastestDefender = defenseFormation
    .filter((assignment) =>
      assignment.player &&
      (assignment.position.startsWith("DB") ||
        assignment.position.startsWith("LB") ||
        assignment.position.startsWith("S"))
    )
    .map((assignment) => ({
      assignment,
      speed: trait(findPlayerByName(players, assignment.player), "speed"), // TRAIT USED: Speed
    }))
    .sort((a, b) => b.speed - a.speed)[0];

  if (!fastestDefender) return;

  handleRunnerTackle(
    runState,
    fastestDefender.assignment.player,
    "Breakaway End Fastest Secondary Defender",
    players
  );
  runState.log.push(
    `${fastestDefender.assignment.player} makes the automatic tackle after the breakaway as the fastest DB/LB/S on the field.`
  );
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

/** Selects a DB/LB/safety chaser and compares speed to decide whether the runner is caught in the secondary. It is called after secondary speed yardage is awarded. */
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
      const speed = trait(player, "speed"); // TRAIT USED: Speed
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

/** Checks whether any named defender wraps the runner cleanly based on tackling. DL and LB wrap wrappers both delegate here. */
export function performDefenderWrapCheck(
  defenderName: string,
  players: PlayerTrait[]
): DefenderWrapResult {
  const defender = findPlayerByName(players, defenderName);

  const defenderTackling = trait(defender, "tackling"); // TRAIT USED: Tackling

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

/** Names the generic wrap check as a defensive-line wrap for backfield readability. `runPlay` and DL pursuit call it during DL contact. */
export function performDlWrapCheck(
  defenderName: string,
  players: PlayerTrait[]
): DlWrapResult {
  return performDefenderWrapCheck(defenderName, players);
}


type RunLaneSide = "left" | "center" | "right";

/** Converts a trench slot into left, center, or right. Linebacker targeting uses it to match pursuit to the run lane. */
function laneSide(slot: FormationSlot): RunLaneSide {
  const slotIndex = TEOL_SLOTS.indexOf(slot);
  const centerIndex = TEOL_SLOTS.indexOf(CENTER_SLOT);

  if (slotIndex < 0 || slotIndex === centerIndex) return "center";
  return slotIndex < centerIndex ? "left" : "right";
}

/** Converts a defensive assignment alignment into a lane side. `pickLinebackerForRunLane` uses this to find same-side linebackers. */
function assignmentSide(assignment: DefensiveAssignment): RunLaneSide {
  return assignment.align ? laneSide(assignment.align) : "center";
}

/** Extracts the numeric linebacker order from a position label. Linebacker selection uses it for stable left-to-right sorting. */
function lbPositionNumber(assignment: DefensiveAssignment): number {
  return Number(assignment.position.match(/\d+/)?.[0] ?? 0);
}

/** Chooses the linebacker most responsible for the selected run lane. Second-level resolution and short-acceleration defender selection call this helper. */
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

/** Finds defensive linemen adjacent to the chosen lane who can still chase. Short-acceleration pressure uses these DLs when the runner has not created enough space. */
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

/** Chooses among eligible defenders by defensive star power. Short-acceleration and second-level restart logic use this when several defenders can challenge. */
export function weightedPickDefenderByDefStars(
  defenders: DefensiveAssignment[],
  players: PlayerTrait[]
): DefensiveAssignment | undefined {
  const weightedDefenders = defenders
    .map((defender) => {
      const defensivePlayer = findPlayerByName(players, defender.player);
      return {
        defender,
        weight: trait(defensivePlayer, "defStars") ** 2, // TRAIT USED: DefStars
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

/** Chooses a nearby LB or adjacent DL when the runner gains only a short burst after the line. `runPlay` uses this to keep tight creases from becoming free linebacker entries. */
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

/** Lists unbeaten linebackers and, when close enough, defensive linemen still eligible to challenge. The recursive second-level cycle uses it after successful jukes or trucks. */
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

/** Resolves a runner juke against a linebacker by comparing juke skill against tackling. `resolveLinebackerSecondLevel` uses it when the runner chooses Juke. */
export function performLbJukeCheck(
  runnerName: string,
  defenderName: string,
  players: PlayerTrait[]
): LbJukeResult {
  const runner = findPlayerByName(players, runnerName);
  const defender = findPlayerByName(players, defenderName);

  const runnerJukeTrait = trait(runner, "juke"); // TRAIT USED: Juke
  const defenderTacklingTrait = trait(defender, "tackling"); // TRAIT USED: Tackling

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


/** Runs the linebacker/second-level phase, including wraps, jukes, trucks, recursive restarts, and secondary entry. `runPlay` calls this after the runner clears or survives the defensive line. */
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

/** Resolves a runner juke against a defensive lineman using the runner's juke trait. Backfield and DL pursuit branches call it after a failed wrap. */
export function performDlJukeCheck(
  runnerName: string,
  defenderName: string,
  players: PlayerTrait[]
): DlJukeResult {
  const runner = findPlayerByName(players, runnerName);

  const runnerJuke = trait(runner, "juke"); // TRAIT USED: Juke

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

/** Returns other penetrating defensive linemen besides the one already challenged. Backfield truck and juke wins use it to continue DL pursuit if needed. */
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

/** Resolves pursuit by any remaining winning defensive linemen after the runner beats the first DL. `runPlay` uses it in the backfield juke branch before moving to linebackers. */
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
