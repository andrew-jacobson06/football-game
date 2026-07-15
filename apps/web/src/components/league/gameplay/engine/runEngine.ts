import type { LeagueGame } from "../../types";
import type { EngineContext, FrontendSettings, PlayCallOptions, RunBreakawaySetting, RunThreshold } from "./types";
import { buildResult } from "./playLogger";
import { advanceBall, advanceQuarter, byName, byPosition, choose, clockRunoff, defenseTeam, isSafety, isTouchdown, n, nextDownDistance, offenseTeam, playerName, switchPoss, teamPlayers, trait, weightedChoose } from "./utils";
import {
  performLineWinLoss,
  performVisionCheck,
  pickRunLaneTarget,
  createRunPlayState,
  performDlSwipeCheck,
  handleRunnerTackle,
  performDlWrapCheck,
  performDlJukeCheck,
  getOtherWinningDLs,
  resolveRemainingDlPursuit,
  randomInt,
  addYards,
  getAccelToLBYards,
  getBackfieldYards,
  resolveLinebackerSecondLevel,
  pickShortAccelerationDefender,
  chooseRunnerDefenderSecondChanceAttempt,
  performTruckAttempt,
  performBruiserCheck,
  performCarryDefenderChecks,
} from "./runEngineHelper";

/** Chooses the most plausible tackler after a run or pass play has ended, weighting nearby defender groups by tackling ability. It is used by `runPlay`, `runPlayOld`, and pass-play fumble/tackle resolution when no specific tackler was already recorded. */
export function determineTackler(ctx: EngineContext, defense: string, yards: number) {
  const defenders = teamPlayers(ctx, defense);
  const preferred = yards <= 2 ? ["DL", "LB"] : yards <= 8 ? ["LB", "DB", "S"] : ["DB", "S", "LB"];
  const pool = defenders.filter((p) => preferred.includes(String(p.defPos ?? "").toUpperCase())) || defenders;
  return playerName(weightedChoose(pool.length ? pool : defenders, (p) => trait(p, "tackleChance")), "NA"); // TRAIT USED: TackleChance
}
/** Resolves whether contact creates a fumble by comparing the defender's strip skill against the runner's ball security and hands. It is called after run and pass tackles so possession changes can be reflected in the final play result. */
export function checkForFumble(ctx: EngineContext, runnerName: string, tacklerName: string, sack = false) {
  const runner = byName(ctx, runnerName); const defender = byName(ctx, tacklerName);
  const strip = trait(defender, "strip", 20); const ballSecurity = (trait(runner, "ballsecurity", 50) + trait(runner, "hands", 50)) / 2; // TRAIT USED: Strip TRAIT USED: BallSecurity TRAIT USED: Hands
  const chance = sack ? (strip / 12) * ((110 - ballSecurity) / 100) + trait(defender, "defStars", 0) / 150 : (strip / 10) * ((100 - ballSecurity) / 100); // TRAIT USED: DefStars
  const fumble = Math.random() * 100 < chance;
  if (!fumble) return { fumble: false, recoveredBy: "" };
  const defStars = trait(defender, "defStars", 50), offStars = trait(runner, "offStars", 50); // TRAIT USED: DefStars TRAIT USED: OffStars
  return { fumble: true, recoveredBy: Math.random() * (defStars + offStars) < offStars ? runnerName : tacklerName };
}
type CarryStats = { name: string; runner?: Record<string, unknown>; offStar?: boolean; defStar?: boolean; autoStuff?: boolean; autoRelease?: boolean; settings?: FrontendSettings };

/** Safely reads a run-engine settings array so callers can use frontend tuning data without defensive null checks. It is used by the legacy carry outcome and breakaway-yard helpers below. */
function settingArray<T>(settings: FrontendSettings | undefined, key: keyof FrontendSettings): T[] {
  const value = settings?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}


// ---------------------------------------------------------------------------
// Legacy single-carry yardage model
// ---------------------------------------------------------------------------

/** Simulates the old one-roll rushing model from handoff to yardage result. It remains available through `runPlayOld` and as a compact helper for legacy tests or fallback play logic. */
export function simulateSingleCarry(stats: CarryStats) {
  const modLog: string[] = [];
  //if auto stuff, -3 > 2 yards is the range +1 yard for straight up check against each vision and strength
  if (stats.autoStuff) {
    let yards = Math.floor(Math.random() * 5) - 2;
    //vision check - add 1 yard to autostuff
    if (Math.random() * 100 < trait(stats.runner, "vision")) { yards += 1; modLog.push("Vision softened auto-stuff"); } // TRAIT USED: Vision
    //strength check - add 1 yard to autostuff
    if (Math.random() * 100 < trait(stats.runner, "strength")) { yards += 1; modLog.push("Power fell forward"); } // TRAIT USED: Strength
    return { name: stats.name, roll: 0, yards, modLog };
  }
  let roll = Math.floor(Math.random() * 101);
  //if auto release, roll gets 8 added to it.
  if (stats.autoRelease) { roll += 8; modLog.push("Blocking created auto-release"); }

  //Vision Check - add (vision - 60) * 0.75 to roll 
  //  for 70: add 0.75 to roll 
  //  for 80: add 1.5 to roll 
  //  for 90: add 2.25 to roll
  //  for 100: add 3 to roll
  const visionMod = (trait(stats.runner, "vision") + Math.min(0, trait(stats.runner, "fatigue")) - 60) * 0.055; // TRAIT USED: Vision TRAIT USED: Fatigue
  roll += visionMod
  //HARDCODED 88 ALERT!
  if (roll < 88){
    roll += maybeBoostRollForAcceleration(trait(stats.runner, "acceleration"), trait(stats.runner, "fatigue")); // TRAIT USED: Acceleration TRAIT USED: Fatigue
  }

  //let yards = roll >= 98 ? Math.floor(Math.random() * 31) + 20 : roll >= 85 ? Math.floor(Math.random() * 11) + 10 : roll >= 65 ? Math.floor(Math.random() * 6) + 5 : roll >= 40 ? Math.floor(Math.random() * 5) + 1 : roll >= 20 ? 0 : -Math.floor(Math.random() * 4);
  let yards = getYardageOutcome(roll, stats, modLog);

  //Off Stars Check - add yards = floor(stars) if triggered
  if (stats.offStar) {
    yards += Math.floor(trait(stats.runner, "offStars")); // TRAIT USED: OffStars
    modLog.push(`Yard +`+Math.floor(trait(stats.runner, "offStars"))+` : offStarPower`); // TRAIT USED: OffStars
  }
  //Def Stars Check - remove yards = floor(stars) if triggered
  if (stats.defStar) {
    yards += - Math.floor(trait(stats.runner, "defStars")); // TRAIT USED: DefStars
    modLog.push(`Yard -`+Math.floor(trait(stats.runner, "defStars"))+` : defStarPower`); // TRAIT USED: DefStars
  }

  yards = maybeAvoidLoss(yards, stats, modLog);

  //Vision Check - 
  if (yards <= 2) yards += applyTraitEffect("Vision", trait(stats.runner, "vision") + Math.min(0, trait(stats.runner, "fatigue")), true, modLog); // TRAIT USED: Vision TRAIT USED: Fatigue
  //Strength Check, Size Check - 
  if (yards <= 4) yards += applyTraitEffect("Power", (trait(stats.runner, "size") + trait(stats.runner, "strength") + Math.min(0, trait(stats.runner, "fatigue")))/2, true, modLog); // TRAIT USED: Size TRAIT USED: Strength TRAIT USED: Fatigue
  //Acceleration Check - 
  if (yards >= 3 && yards <= 4) yards += applyTraitEffect("Acceleration", trait(stats.runner, "acceleration") + Math.min(0, trait(stats.runner, "fatigue")), true, modLog); // TRAIT USED: Acceleration TRAIT USED: Fatigue
  //Juke Check - 
  if (yards > 0 && yards < 10) yards += applyTraitEffect("Juke", trait(stats.runner, "juke") + Math.min(0, trait(stats.runner, "fatigue")), true, modLog); // TRAIT USED: Juke TRAIT USED: Fatigue

  yards = adjustChunkRunForSpeed(yards, stats, modLog, false);

  return { name: stats.name, roll, yards, modLog };
}


/** Converts a runner trait deviation from average into a small yardage modifier. It is used inside `simulateSingleCarry` after the base yardage tier has already been chosen. */
function applyTraitEffect(traitName: string, traitValue: number, condition: boolean, modLog: string[]) {
  if (!condition) return 0;
  const deviation = traitValue - 60;
  const triggerChance = Math.abs(deviation) / 100;
  if (Math.random() < triggerChance) {
    const effect = Math.sign(deviation) * Math.min(2, Math.floor(Math.abs(deviation) / 15));
    if (effect !== 0) {
      modLog.push(`Yard ${effect > 0 ? "+" : ""}${effect} ${traitName}`);
      return effect;
    }
  }
  return 0;
}

//Strength check, size check - size + strength/2.2 chance of avoiding loss and turning into 1-2 yard gain
/** Gives a powerful runner a chance to turn a negative legacy carry into a short gain. It is used by `simulateSingleCarry` before the final trait-based polish is applied. */
export function maybeAvoidLoss(yards: number, stats: CarryStats, modLog: string[]) {
  if (yards < 0) {
    const power = trait(stats.runner, "size") + trait(stats.runner, "strength") + Math.min(0, trait(stats.runner, "fatigue")); // TRAIT USED: Size TRAIT USED: Strength TRAIT USED: Fatigue
    const chanceToAvoid = power / 2.2; //CHANGE - no hard code
    if (Math.random() < chanceToAvoid / 100) {
      const newYards = randomInt(1, 2);
      modLog.push(`Loss Avoided by Power → ${newYards} yds`);
      return newYards;
    }
  }
  return yards;
}

//Speed Check - for 10-15 yard runs, add (speed - 60)/10 yards to the total
//  for 70: add 1 yard
//  for 80: add 2 yard
//  for 90: add 3 yard
//  for 100: add 4 yard
/** Applies speed bonuses to chunk gains or yards-after-catch style runs in the legacy carry model. It is used by `simulateSingleCarry` and can also support YAC callers that pass the `yac` flag. */
export function adjustChunkRunForSpeed(yards: number, stats: CarryStats, modLog: string[], yac: boolean) {
    if (yac && yards >= 5){
      const bonus = Math.floor((trait(stats.runner, "speed") + Math.min(0, trait(stats.runner, "fatigue")) - 60) / 5); //CHANGE no hard code // TRAIT USED: Speed TRAIT USED: Fatigue
      if (bonus !== 0) modLog.push(`Yard ${bonus > 0 ? "+" : ""}${bonus} Speed`);
      return yards + bonus;
    }
    else if (yards >= 10 && yards <= 15) { //CHANGE no hard code
      const bonus = Math.floor((trait(stats.runner, "speed") + Math.min(0, trait(stats.runner, "fatigue")) - 60) / 10); //CHANGE no hard code // TRAIT USED: Speed TRAIT USED: Fatigue
      if (bonus !== 0) modLog.push(`Yard ${bonus > 0 ? "+" : ""}${bonus} Speed`);
      return yards + bonus;
    }
    return yards;
  }

/** Translates the legacy carry roll into yards using frontend thresholds, with breakaway rolls delegated to `getStrictBreakawayYards`. It is the main yardage table lookup inside `simulateSingleCarry`. */
export function getYardageOutcome(roll: number, stats: CarryStats, modLog: string[]) {
  if (roll >= 100){
    return getStrictBreakawayYards(stats, modLog);
  }
  const rollThresholds = settingArray<RunThreshold>(stats.settings, "thresholds");
  for (const r of rollThresholds) {
    if (roll >= r.rollMin && roll < r.rollMax) {
      if (r.label === "RunType_Breakaway") {
        return getStrictBreakawayYards(stats, modLog);
      }
      return randomInt(r.minYards, r.maxYards);
    }
  }
  return 0;
}

//Speed Check -
/** Rolls the specific yardage for a legacy breakaway run and lets speed push the runner toward longer breakaway buckets. It is used whenever `getYardageOutcome` reaches the breakaway tier. */
export function getStrictBreakawayYards(stats: CarryStats, modLog: string[]) {
  const baseRoll = Math.floor(Math.random() * 100);
  const speedBoost = Math.floor((trait(stats.runner, "speed") + Math.min(0, trait(stats.runner, "fatigue")) - 60) * 0.3); // TRAIT USED: Speed TRAIT USED: Fatigue
  const adjustedRoll = Math.min(100, baseRoll + Math.max(0, speedBoost));
  if (speedBoost !== 0) modLog.push(`Pre +${speedBoost} Speed`);

  let cumulative = 0;
  const breakawaySettings = settingArray<RunBreakawaySetting>(stats.settings, "breakaways");
  for (const range of breakawaySettings) {
    if (adjustedRoll >= 100){
      return randomInt(81, 100);
    }
    cumulative += range.percentage;
    if (adjustedRoll <= cumulative) {
      return randomInt(range.minYards, range.maxYards);
    }
  }
  return 16;
}

//Acceleration Check - (Accel - 60)/1.5 % chance of adding up to (Accel - 60)/3 to the roll 
//  for 70: 6.7% chance of 0 to 3.33 to roll 
//  for 80: 13.3% chance of 1.67 to 6.67 to roll 
//  for 90: 20% chance of 5 to 10 to roll 
//  for 100: 26.7% chance of 8.33 to 13.33 to roll
/** Gives acceleration a pre-yardage chance to lift an otherwise ordinary legacy carry roll. It is used by `simulateSingleCarry` before threshold lookup. */
export function maybeBoostRollForAcceleration(acceleration: number, fatigue: number){
  let boost = 0;
  const chance = (acceleration + Math.min(0, fatigue) - 60) / 1.5;
  if (Math.random() * 100 < Math.max(0, chance)) {
    const maxBoost = (acceleration + Math.min(0, fatigue) - 60) / 3;

    const minBoost = Math.max(0, maxBoost - 5);
    const maxBoostSafe = Math.max(0, maxBoost);
    
    boost = Math.floor(Math.random() * (maxBoostSafe - minBoost + 1)) + minBoost;
    //modLog.push(`Pre +${boost} Accel (Boost Roll)`);
  }
  return boost;
}

// ---------------------------------------------------------------------------
// Legacy run-play support
// ---------------------------------------------------------------------------

//ballCarrier.offStars ^2 chance of true. Otherwise false
//NEEDS TRansition TO THIS CLASS
/** Checks whether the ball carrier's offensive star power activates for the legacy model. It is used by `runPlayOld` before calling `simulateSingleCarry`. */
export function rollOffStarPower(ctx: EngineContext, ballCarrierName: string) {
  const ballCarrier = byName(ctx, ballCarrierName);
  const stars = trait(ballCarrier, "offStars", 0); // TRAIT USED: OffStars

  const threshold = Math.pow(stars, 2);
  const roll = Math.random() * 100;

  return roll <= threshold;
}
//NEEDS TRansition TO THIS CLASS
/** Selects and checks a front-seven defender for defensive star power in the legacy model. It is used by `runPlayOld` to apply a defensive yardage penalty. */
export function rollDefStarPower(ctx: EngineContext, defense: string) {
  const candidates = teamPlayers(ctx, defense)
    .filter((p) => {
      const pos = String(p.defPos ?? "").toUpperCase();
      return pos === "DL" || pos === "LB";
    })
    .map((p) => {
      const stars = trait(p, "defStars", 0); // TRAIT USED: DefStars
      return {
        player: p,
        name: playerName(p),
        stars,
        weight: Math.pow(stars, 2),
      };
    })
    .filter((c) => c.weight > 0);

  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);

  if (totalWeight <= 0) {
    return {
      activated: false,
      tackler: "",
    };
  }

  let roll = Math.random() * totalWeight;
  let chosen = candidates[0];

  for (const candidate of candidates) {
    if (roll < candidate.weight) {
      chosen = candidate;
      break;
    }

    roll -= candidate.weight;
  }

  const threshold = Math.pow(chosen.stars, 2);
  const activationRoll = Math.random() * 100;

  return {
    activated: activationRoll <= threshold,
    tackler: chosen.name,
  };
}
//NEEDS TRansition TO THIS CLASS
/** Compares total run-blocking strength against defensive front run defense for the legacy auto-stuff/auto-release branch. It is used only by `runPlayOld`. */
export function runBlockVsRunDef(
  ctx: EngineContext,
  _offense: string,
  defense: string,
  formation: Record<string, string | undefined>,
  ballCarrierName: string
) {
  const defensiveFront = teamPlayers(ctx, defense).filter((p) => {
    const pos = String(p.defPos ?? "").toUpperCase();
    return pos === "DL" || pos === "LB";
  });

  const offensiveBlockerPositions = new Set([
    "QB",
    "RB1",
    "RB2",
    "TEOL1",
    "TEOL2",
    "TEOL3",
    "TEOL4",
    "TEOL5",
  ]);

  const offensiveBlockers = Object.entries(formation)
    .filter(([position, name]) => {
      if (!name) return false;
      if (!offensiveBlockerPositions.has(position)) return false;
      return name !== ballCarrierName;
    })
    .map(([, name]) => byName(ctx, name))
    .filter(Boolean);

  const dlTotal = defensiveFront.reduce(
    (sum, p) => sum + trait(p, "runDef", 0), // TRAIT USED: RunDef
    0
  );

  const olTotal = offensiveBlockers.reduce(
    (sum, p) => sum + trait(p, "runBlocking", 0), // TRAIT USED: RunBlocking
    0
  );

  const total = dlTotal + olTotal;

  if (total <= 0) {
    return {
      defenseWins: false,
      dlTotal,
      olTotal,
      roll: 0,
    };
  }

  const roll = Math.floor(Math.random() * total) + 1;

  return {
    defenseWins: roll <= dlTotal,
    dlTotal,
    olTotal,
    roll,
  };
}
//NEEDS TRansition TO THIS CLASS
/** Rolls whether a winning defensive front immediately stuffs the legacy run. It is used by `runPlayOld` after `runBlockVsRunDef` says the defense won the blocking contest. */
export function tryAutoStuff(ctx: EngineContext, defense: string) {
  const defensiveFront = teamPlayers(ctx, defense).filter((p) => {
    const pos = String(p.defPos ?? "").toUpperCase();
    return pos === "DL" || pos === "LB";
  });

  const starPower = defensiveFront.reduce((sum, p) => {
    const stars = trait(p, "defStars", 0); // TRAIT USED: DefStars
    return sum + Math.pow(stars, 2) / 2.5;
  }, 0);

  const roll = Math.floor(Math.random() * 100) + 1;

  return roll <= starPower;
}
//NEEDS TRansition TO THIS CLASS
/** Rolls whether a winning blocking unit creates an automatic release in the legacy run. It is used by `runPlayOld` after `runBlockVsRunDef` says the offense won the blocking contest. */
export function tryAutoRelease(
  ctx: EngineContext,
  formation: Record<string, string | undefined>,
  ballCarrierName: string
) {
  const offensiveBlockerPositions = new Set([
    "QB",
    "RB1",
    "RB2",
    "TEOL1",
    "TEOL2",
    "TEOL3",
    "TEOL4",
    "TEOL5",
  ]);

  const blockers = Object.entries(formation)
    .filter(([position, name]) => {
      if (!name) return false;
      if (!offensiveBlockerPositions.has(position)) return false;
      return name !== ballCarrierName;
    })
    .map(([, name]) => byName(ctx, name))
    .filter(Boolean);

  const starPower = blockers.reduce((sum, p) => {
    const stars = trait(p, "offStars", 0); // TRAIT USED: OffStars
    return sum + Math.pow(stars, 2) / 2.5;
  }, 0);

  const roll = Math.floor(Math.random() * 100) + 1;

  return roll <= starPower;
}

/** Runs the previous compact rushing simulation and then applies normal football bookkeeping. It remains exported for compatibility while `runPlay` below is the current step-by-step pipeline. */
export function runPlayOld(game: LeagueGame, ctx: EngineContext, options: PlayCallOptions = {}) {
  const offense = offenseTeam(game), defense = defenseTeam(game);
  const formation = options.formation ?? {};
  const runner = byName(ctx, options.runner) ?? byName(ctx, formation.RB1) ?? byName(ctx, formation.RB2) ?? byName(ctx, formation.QB) ?? choose([...byPosition(ctx, offense, "RB"), ...byPosition(ctx, offense, "WR"), ...byPosition(ctx, offense, "QB")]);
  const runnerName = playerName(runner, `${offense} Runner`);
  //const blockers = Object.values(formation).map((name) => byName(ctx, name)).filter(Boolean).filter((p) => playerName(p) !== runnerName);
  //const rushers = teamPlayers(ctx, defense).filter((p) => ["DL", "LB"].includes(String(p.defPos ?? "").toUpperCase()));
  //const offTotal = blockers.reduce((s, p) => s + trait(p, "runBlocking"), 0); // TRAIT USED: RunBlocking
  //const defTotal = rushers.reduce((s, p) => s + trait(p, "runDef"), 0); // TRAIT USED: RunDef

  const offStarPower = rollOffStarPower(ctx, runnerName);
  const defStarPowerResult = rollDefStarPower(ctx, defense);
  const defStarPower = defStarPowerResult.activated;

  let autoReleaseVal = false;
  let autoStuffVal = false;

  const blockResult = runBlockVsRunDef(
    ctx,
    offense,
    defense,
    formation,
    runnerName
  );

  if (blockResult.defenseWins) {
    autoStuffVal = tryAutoStuff(ctx, defense);
  } else {
    autoReleaseVal = tryAutoRelease(ctx, formation, runnerName);
  }

  const carry = simulateSingleCarry({ 
    name: runnerName, runner, 
    offStar: offStarPower, 
    defStar: defStarPower, 
    autoStuff: autoStuffVal, 
    autoRelease: autoReleaseVal,
    settings: ctx.settings
  });

  const newBall = advanceBall(game, carry.yards);
  const td = isTouchdown(game, newBall), safety = isSafety(game, newBall);
  const yards = td ? Math.abs((game.Possession === "Home" ? 100 : 0) - n(game.BallOn)) : safety ? -Math.abs(n(game.BallOn) - (game.Possession === "Home" ? 0 : 100)) : carry.yards;
  const tackler = td ? "NA" : determineTackler(ctx, defense, yards);
  const fumble = tackler !== "NA" && !td ? checkForFumble(ctx, runnerName, tackler) : { fumble: false, recoveredBy: "" };
  const next = nextDownDistance(game, yards, newBall);
  const result = td ? "Touchdown" : safety ? "Safety" : fumble.fumble ? "Fumble" : next.turnover ? "TO on Downs" : yards >= n(game.Distance) ? "First Down" : "Normal";
  let hs = n(game.HomeScore), as = n(game.AwayScore); if (td) { if (game.Possession === "Home") hs += 6; else as += 6; } if (safety) { if (game.Possession === "Home") as += 2; else hs += 2; }
  const possession = td || safety || next.turnover || (fumble.fumble && fumble.recoveredBy === tackler) ? switchPoss(game) : game.Possession;
  const clock = advanceQuarter(game, clockRunoff(options.clockMode, Math.max(3, 12 - Math.floor(trait(runner, "speed") / 15)), ["Touchdown", "Safety", "TO on Downs", "Fumble"].includes(result))); // TRAIT USED: Speed
  const updated = { ...game, HomeScore: hs, AwayScore: as, Qtr: clock.qtr, Time: clock.time, Down: next.down, Distance: next.distance, BallOn: next.ballOn, Previous: game.BallOn, DriveStart: next.turnover || td || safety ? next.ballOn : (game as unknown as Record<string, unknown>).DriveStart ?? game.BallOn, Possession: possession };
  return buildResult(game, updated, "Run", runnerName, "", yards, tackler, result, ctx.historyLength, { recoveredby: fumble.recoveredBy });
}

// ---------------------------------------------------------------------------
// Current run-play pipeline
// ---------------------------------------------------------------------------

/** Runs the current detailed rushing pipeline from line matchups through second-level pursuit and final scoreboard bookkeeping. This is the primary run-play entry point re-exported by `gameEngine.ts`. */
export function runPlay(
  game: LeagueGame,
  ctx: EngineContext,
  options: PlayCallOptions = {}
) {
  const offense = offenseTeam(game);
  const defense = defenseTeam(game);

  // Establish the two teams before any football logic so all later lookups use the same possession snapshot.
  console.log("Offense:", offense);
  console.log("Defense:", defense);

  const offenseFormation = options.formation ?? {};
  const defenseFormation = options.defense ?? [];

  // The runner is explicitly selected by the caller when possible, then falls back to the primary back or quarterback in the formation.
  const runnerName = options.runner ?? offenseFormation.RB1 ?? offenseFormation.QB ?? "";

  if (!runnerName) {
    throw new Error("No runner available for run play.");
  }

  const runState = createRunPlayState(runnerName);

  // First phase: every trench slot resolves independently so the later vision check knows whether lanes are open or collapsed.
  const lineWinLossArray = performLineWinLoss(
    offenseFormation,
    defenseFormation,
    ctx.players
  );

  const olWins = lineWinLossArray.filter((battle) => battle.winner === "OL").length;
  const dlWins = lineWinLossArray.filter((battle) => battle.winner === "DL").length;
  // More OL wins make the runner's vision target easier; more DL wins make the hole harder to find.
  const runBlockingModifier = (olWins - dlWins) * 10;

  // Second phase: the runner either reads the blocking and gets past the defensive line, or misses the hole into backfield trouble.
  const visionCheck = performVisionCheck(
    runnerName,
    ctx.players,
    lineWinLossArray,
    runBlockingModifier
  );

  // The lane target records the blocker who sprung the lane or the defender who created penetration.
  const runLaneTarget = pickRunLaneTarget(
    lineWinLossArray,
    visionCheck,
    ctx.players
  );

  let dlWrapResult: ReturnType<typeof performDlWrapCheck> | null = null;
  let dlSwipeResult: ReturnType<typeof performDlSwipeCheck> | null = null;
  let fallForwardResult: ReturnType<typeof handleRunnerTackle> | null = null;    
  let dlJukeResult: ReturnType<typeof performDlJukeCheck> | null = null;
  let otherWinningDLsAfterJuke: ReturnType<typeof getOtherWinningDLs> = [];
  let dlPursuitResult: ReturnType<typeof resolveRemainingDlPursuit> | null = null;
  let bruiserResult: ReturnType<typeof performBruiserCheck> | null = null;
  let bruiserCarryDefenderResult: ReturnType<typeof performCarryDefenderChecks> | null = null;

  // Backfield branch: the runner missed the hole and must beat the winning DL.
  if (!visionCheck.getsPastDL) {
    // A missed hole immediately costs yardage before the runner can attempt to escape the penetrating defender.
    const backfieldYards = getBackfieldYards(ctx.settings, runState.log);

    addYards(
      runState,
      backfieldYards,
      `${runState.runner} fails to hit the hole and is forced into the backfield`
    );

    bruiserResult = performBruiserCheck(runState.runner, ctx.players);

    if (bruiserResult.succeeded) {
      const bruiserTackler = runLaneTarget.selectedPlayer;
      runState.yards = 0;
      runState.log.push(
        `${runState.runner} powers out of the backfield loss (roll ${bruiserResult.roll.toFixed(2)} <= ${bruiserResult.bruiserScore.toFixed(2)}%) and gets back to the line of scrimmage.`
      );

      bruiserCarryDefenderResult = performCarryDefenderChecks(runState.runner, ctx.players);

      if (bruiserCarryDefenderResult.yardsAdded > 0) {
        runState.yards += bruiserCarryDefenderResult.yardsAdded;
        runState.log.push(
          `${runState.runner} carries ${bruiserTackler} for +${bruiserCarryDefenderResult.yardsAdded} ${bruiserCarryDefenderResult.yardsAdded === 1 ? "yard" : "yards"}.`
        );
      }

      runState.tackler = bruiserTackler;
      runState.stopped = true;
      runState.stopReason = "Bruiser Check Tackle";
      runState.log.push(`${bruiserTackler} tackles ${runState.runner}. Reason: Bruiser Check Tackle.`);
    }
    else{
      // The first penetrating DL gets a clean wrap attempt before the runner can choose a counter move.
      dlWrapResult = performDlWrapCheck(
        runLaneTarget.selectedPlayer,
        ctx.players
      );

      if (dlWrapResult.wrapped) {
        fallForwardResult = handleRunnerTackle(
          runState,
          dlWrapResult.defender,
          "DL Backfield Wrap",
          ctx.players
        );
      } 
      else {
        // If the wrap fails, the runner chooses the more natural second-chance move for the size matchup.
        const dlSecondChanceAttempt = chooseRunnerDefenderSecondChanceAttempt(
          runState.runner,
          dlWrapResult.defender,
          ctx.players
        );

        runState.log.push(
          `${runState.runner} chooses to ${dlSecondChanceAttempt.attempt.toLowerCase()} ${dlWrapResult.defender} ` +
          `(truck chance ${dlSecondChanceAttempt.truckChance.toFixed(2)}%, size diff ${dlSecondChanceAttempt.cappedSizeDifference}).`
        );

        if (dlSecondChanceAttempt.attempt === "Truck") {
          // Truck attempts compare combined size/strength power and either restart the run or end in a tackle.
          const truckResult = performTruckAttempt(
            runState.runner,
            dlWrapResult.defender,
            ctx.players
          );

          if (!truckResult.trucked) {
            runState.log.push(
              `${runState.runner} fails to truck ${dlWrapResult.defender} (roll ${truckResult.roll.toFixed(2)} > ${truckResult.truckChance.toFixed(2)}%).`
            );
            fallForwardResult = handleRunnerTackle(
              runState,
              dlWrapResult.defender,
              "DL Backfield Truck Failed",
              ctx.players
            );
          } else {
            runState.log.push(
              `${runState.runner} trucks ${dlWrapResult.defender} (roll ${truckResult.roll.toFixed(2)} <= ${truckResult.truckChance.toFixed(2)}%) and tries to restart downhill.`
            );

            const otherWinningDLsAfterTruck = getOtherWinningDLs(
              lineWinLossArray,
              dlWrapResult.defender
            );
            if (otherWinningDLsAfterTruck.length === 0) {
              runState.log.push(
                `${runState.runner} has no remaining penetrating defensive linemen to beat after the truck and escapes toward the second level.`
              );
            } else {
              runState.log.push(
                `${runState.runner} trucks ${dlWrapResult.defender}, but other defensive linemen are still in pursuit.`
              );

              dlPursuitResult = resolveRemainingDlPursuit(
                runState,
                otherWinningDLsAfterTruck,
                ctx.players,
                "truck"
              );

              console.log("DL pursuit result:", dlPursuitResult);
            }
          }
        } 
        else {
          // Juke attempts are the agility counter to a failed DL wrap.
          dlJukeResult = performDlJukeCheck(
            runState.runner,
            dlWrapResult.defender,
            ctx.players
          );
        }

        if (!runState.stopped && dlJukeResult && !dlJukeResult.juked) {
          // A failed backfield juke gives the original defender the tackle, with fall-forward contact still possible.
          fallForwardResult = handleRunnerTackle(
            runState,
            dlWrapResult.defender,
            "DL Backfield Juke Failed",
            ctx.players
          );
        } 
        else if (dlJukeResult?.juked) {
          // After beating the first DL, only other DLs that won their matchups can continue the backfield pursuit chain.
          otherWinningDLsAfterJuke = getOtherWinningDLs(
            lineWinLossArray,
            dlWrapResult.defender
          );

          if (otherWinningDLsAfterJuke.length === 0) {
            runState.log.push(
              `${runState.runner} jukes ${dlWrapResult.defender} and escapes toward the second level.`
            );
          } else {
            runState.log.push(
              `${runState.runner} jukes ${dlWrapResult.defender}, but other defensive linemen are still in pursuit.`
            );

            dlPursuitResult = resolveRemainingDlPursuit(
              runState,
              otherWinningDLsAfterJuke,
              ctx.players,
              "juke"
            );

            console.log("DL pursuit result:", dlPursuitResult);
          }
      }
      }
    }
  }
  // Frontside branch: the runner found the intended lane and may face a swipe attempt.
  else {
    // If the selected lane came from an OL win, the beaten DL can still make a last swipe at the runner's legs.
    dlSwipeResult =
      runLaneTarget.selectedSide === "OL"
        ? performDlSwipeCheck(lineWinLossArray, runLaneTarget, ctx.players)
        : null;

    if (dlSwipeResult?.tackled) {
      // A successful swipe stops the runner at the line before acceleration yardage is added.
      runState.yards = 0;

      fallForwardResult = handleRunnerTackle(
        runState,
        dlSwipeResult.defender,
        "DL Swipe Tackle",
        ctx.players
      );
    } 
  }

  console.log("OL wins:", olWins);
  console.log("DL wins:", dlWins);
  console.log("Run blocking modifier:", runBlockingModifier);
  console.log("Vision check:", visionCheck);
  console.log("Run lane target:", runLaneTarget);
  console.log("DL wrap result:", dlWrapResult);
  console.log("DL swipe result:", dlSwipeResult);
  console.log("Fall forward result:", fallForwardResult);
  console.log("Run state:", runState);
  console.log("DL juke result:", dlJukeResult);
  console.log("Other winning DLs after juke:", otherWinningDLsAfterJuke);
  console.log("DL pursuit result:", dlPursuitResult);
  console.log("Bruiser result:", bruiserResult);
  console.log("Bruiser carry defender result:", bruiserCarryDefenderResult);

  //if tackled in backfield or snuffed at line
  if (runState.stopped) {
    console.log("Run stopped during DL phase:", runState);
    //return runState;
  }
  //if hit hole or juked out of backfield...
  else {
    console.log("Run survived DL phase:", runState);

    // Surviving the line creates acceleration yardage before the runner meets linebackers or short-crease DL pursuit.
    const accelToSecondLevelYards = getAccelToLBYards(
      byName(ctx, runState.runner),
      ctx.settings,
      runState.log
    );

    const jukedBackfieldDefenders = [
      dlJukeResult?.juked ? dlJukeResult.defender : undefined,
      ...(dlPursuitResult?.steps
        .filter((step) => step.outcome === "Juked")
        .map((step) => step.defender) ?? []),
    ].filter((defender): defender is string => Boolean(defender));

    // Short acceleration keeps nearby DLs alive as possible tacklers; longer acceleration means only second-level defenders are in position.
    const secondLevelDefender =
      accelToSecondLevelYards <= 3
        ? pickShortAccelerationDefender(
            defenseFormation,
            lineWinLossArray,
            runLaneTarget,
            offenseFormation,
            runState.runner,
            jukedBackfieldDefenders,
            ctx.players
          )
        : undefined;
    
    addYards(
      runState,
      accelToSecondLevelYards,
      secondLevelDefender?.position.startsWith("DL")
        ? `${runState.runner} accelerates through a short crease before meeting a defensive lineman`
        : `${runState.runner} accelerates to the second level before meeting a linebacker`
    );

    runState.log.push(
      `${runState.runner} hits the hole behind ${runLaneTarget.selectedPlayer} and clears the defensive line.`
    );

    // The second-level resolver owns all LB contact, recursive juke/truck restarts, and secondary breakaway handling.
    const lbSecondLevelResult = resolveLinebackerSecondLevel(
      runState,
      defenseFormation,
      runLaneTarget,
      offenseFormation,
      ctx.players,
      secondLevelDefender,
      ctx.settings,
      lineWinLossArray,
      jukedBackfieldDefenders
    );

    console.log("LB second level result:", lbSecondLevelResult);
  }

  const rawYards = runState.yards;
  // Convert simulated yards into field position and clamp special scoring plays to the actual distance to goal/safety.
  const newBall = advanceBall(game, rawYards);
  const td = isTouchdown(game, newBall);
  const safety = isSafety(game, newBall);
  const yards = td
    ? Math.abs((game.Possession === "Home" ? 100 : 0) - n(game.BallOn))
    : safety
      ? -Math.abs(n(game.BallOn) - (game.Possession === "Home" ? 0 : 100))
      : rawYards;
  const tackler = td ? "NA" : runState.tackler || determineTackler(ctx, defense, yards);
  const fumble = td || safety ? { fumble: false, recoveredBy: "" } : checkForFumble(ctx, runnerName, tackler);
  const next = nextDownDistance(game, yards, newBall);
  // Final result priority mirrors football outcomes: scoring, turnover events, then first down or normal play.
  const result = td ? "Touchdown" : safety ? "Safety" : fumble.fumble ? "Fumble" : next.turnover ? "TO on Downs" : yards >= n(game.Distance) ? "First Down" : "Normal";
  let hs = n(game.HomeScore), as = n(game.AwayScore);
  if (td) { if (game.Possession === "Home") hs += 6; else as += 6; }
  if (safety) { if (game.Possession === "Home") as += 2; else hs += 2; }
  const possession = td || safety || next.turnover || (fumble.fumble && fumble.recoveredBy === tackler) ? switchPoss(game) : game.Possession;
  const runner = byName(ctx, runnerName);
  const clock = advanceQuarter(game, clockRunoff(options.clockMode, Math.max(3, 12 - Math.floor(trait(runner, "speed") / 15)), ["Touchdown", "Safety", "TO on Downs", "Fumble"].includes(result))); // TRAIT USED: Speed
  const updated = { ...game, HomeScore: hs, AwayScore: as, Qtr: clock.qtr, Time: clock.time, Down: next.down, Distance: next.distance, BallOn: next.ballOn, Previous: game.BallOn, DriveStart: next.turnover || td || safety ? next.ballOn : (game as unknown as Record<string, unknown>).DriveStart ?? game.BallOn, Possession: possession };

  const successfulTrucks = runState.log.filter((entry) => /\btrucks\b/i.test(entry)).length;
  const successfulJukes = runState.log.filter((entry) => /\bjukes\b/i.test(entry)).length;
  const lineMatchups = lineWinLossArray.map((battle) => ({
    slot: battle.slot,
    offensePlayer: battle.offensePlayer,
    defensePlayer: battle.defensePlayer,
    winner: battle.winner,
  }));

  return buildResult(game, updated, "Run", runnerName, "", yards, tackler, result, ctx.historyLength, {
    recoveredby: fumble.recoveredBy,
    runLog: runState.log,
    stopReason: runState.stopReason ?? "",
    lineMatchups,
    olWins,
    olLosses: dlWins,
    dlWins,
    dlLosses: olWins,
    trucks: successfulTrucks,
    brokenTackles: successfulTrucks,
    jukes: successfulJukes,
  });
}
