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
  resolveLinebackerSecondLevel,
  pickShortAccelerationDefender,
  chooseRunnerDefenderSecondChanceAttempt,
  performTruckAttempt,
  performPostTruckAccelerationCheck,
} from "./runEngineHelper";

export function determineTackler(ctx: EngineContext, defense: string, yards: number) {
  const defenders = teamPlayers(ctx, defense);
  const preferred = yards <= 2 ? ["DL", "LB"] : yards <= 8 ? ["LB", "DB", "S"] : ["DB", "S", "LB"];
  const pool = defenders.filter((p) => preferred.includes(String(p.defPos ?? "").toUpperCase())) || defenders;
  return playerName(weightedChoose(pool.length ? pool : defenders, (p) => trait(p, "tackleChance")), "NA");
}
export function checkForFumble(ctx: EngineContext, runnerName: string, tacklerName: string, sack = false) {
  const runner = byName(ctx, runnerName); const defender = byName(ctx, tacklerName);
  const strip = trait(defender, "strip", 20); const ballSecurity = (trait(runner, "ballsecurity", 50) + trait(runner, "hands", 50)) / 2;
  const chance = sack ? (strip / 12) * ((110 - ballSecurity) / 100) + trait(defender, "defStars", 0) / 150 : (strip / 10) * ((100 - ballSecurity) / 100);
  const fumble = Math.random() * 100 < chance;
  if (!fumble) return { fumble: false, recoveredBy: "" };
  const defStars = trait(defender, "defStars", 50), offStars = trait(runner, "offStars", 50);
  return { fumble: true, recoveredBy: Math.random() * (defStars + offStars) < offStars ? runnerName : tacklerName };
}
type CarryStats = { name: string; runner?: Record<string, unknown>; offStar?: boolean; defStar?: boolean; autoStuff?: boolean; autoRelease?: boolean; settings?: FrontendSettings };

function settingArray<T>(settings: FrontendSettings | undefined, key: keyof FrontendSettings): T[] {
  const value = settings?.[key];
  return Array.isArray(value) ? (value as T[]) : [];
}


// ---------------------------------------------------------------------------
// Legacy single-carry yardage model
// ---------------------------------------------------------------------------

export function simulateSingleCarry(stats: CarryStats) {
  const modLog: string[] = [];
  //if auto stuff, -3 > 2 yards is the range +1 yard for straight up check against each vision and strength
  if (stats.autoStuff) {
    let yards = Math.floor(Math.random() * 5) - 2;
    //vision check - add 1 yard to autostuff
    if (Math.random() * 100 < trait(stats.runner, "vision")) { yards += 1; modLog.push("Vision softened auto-stuff"); }
    //strength check - add 1 yard to autostuff
    if (Math.random() * 100 < trait(stats.runner, "strength")) { yards += 1; modLog.push("Power fell forward"); }
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
  const visionMod = (trait(stats.runner, "vision") + Math.min(0, trait(stats.runner, "fatigue")) - 60) * 0.055;
  roll += visionMod
  //HARDCODED 88 ALERT!
  if (roll < 88){
    roll += maybeBoostRollForAcceleration(trait(stats.runner, "acceleration"), trait(stats.runner, "fatigue"));
  }

  //let yards = roll >= 98 ? Math.floor(Math.random() * 31) + 20 : roll >= 85 ? Math.floor(Math.random() * 11) + 10 : roll >= 65 ? Math.floor(Math.random() * 6) + 5 : roll >= 40 ? Math.floor(Math.random() * 5) + 1 : roll >= 20 ? 0 : -Math.floor(Math.random() * 4);
  let yards = getYardageOutcome(roll, stats, modLog);

  //Off Stars Check - add yards = floor(stars) if triggered
  if (stats.offStar) {
    yards += Math.floor(trait(stats.runner, "offStars"));
    modLog.push(`Yard +`+Math.floor(trait(stats.runner, "offStars"))+` : offStarPower`);
  }
  //Def Stars Check - remove yards = floor(stars) if triggered
  if (stats.defStar) {
    yards += - Math.floor(trait(stats.runner, "defStars"));
    modLog.push(`Yard -`+Math.floor(trait(stats.runner, "defStars"))+` : defStarPower`);
  }

  yards = maybeAvoidLoss(yards, stats, modLog);

  //Vision Check - 
  if (yards <= 2) yards += applyTraitEffect("Vision", trait(stats.runner, "vision") + Math.min(0, trait(stats.runner, "fatigue")), true, modLog);
  //Strength Check, Size Check - 
  if (yards <= 4) yards += applyTraitEffect("Power", (trait(stats.runner, "size") + trait(stats.runner, "strength") + Math.min(0, trait(stats.runner, "fatigue")))/2, true, modLog);
  //Acceleration Check - 
  if (yards >= 3 && yards <= 4) yards += applyTraitEffect("Acceleration", trait(stats.runner, "acceleration") + Math.min(0, trait(stats.runner, "fatigue")), true, modLog);
  //Juke Check - 
  if (yards > 0 && yards < 10) yards += applyTraitEffect("Juke", trait(stats.runner, "juke") + Math.min(0, trait(stats.runner, "fatigue")), true, modLog);

  yards = adjustChunkRunForSpeed(yards, stats, modLog, false);

  return { name: stats.name, roll, yards, modLog };
}


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
export function maybeAvoidLoss(yards: number, stats: CarryStats, modLog: string[]) {
  if (yards < 0) {
    const power = trait(stats.runner, "size") + trait(stats.runner, "strength") + Math.min(0, trait(stats.runner, "fatigue"));
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
export function adjustChunkRunForSpeed(yards: number, stats: CarryStats, modLog: string[], yac: boolean) {
    if (yac && yards >= 5){
      const bonus = Math.floor((trait(stats.runner, "speed") + Math.min(0, trait(stats.runner, "fatigue")) - 60) / 5); //CHANGE no hard code
      if (bonus !== 0) modLog.push(`Yard ${bonus > 0 ? "+" : ""}${bonus} Speed`);
      return yards + bonus;
    }
    else if (yards >= 10 && yards <= 15) { //CHANGE no hard code
      const bonus = Math.floor((trait(stats.runner, "speed") + Math.min(0, trait(stats.runner, "fatigue")) - 60) / 10); //CHANGE no hard code
      if (bonus !== 0) modLog.push(`Yard ${bonus > 0 ? "+" : ""}${bonus} Speed`);
      return yards + bonus;
    }
    return yards;
  }

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
export function getStrictBreakawayYards(stats: CarryStats, modLog: string[]) {
  const baseRoll = Math.floor(Math.random() * 100);
  const speedBoost = Math.floor((trait(stats.runner, "speed") + Math.min(0, trait(stats.runner, "fatigue")) - 60) * 0.3);
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
export function rollOffStarPower(ctx: EngineContext, ballCarrierName: string) {
  const ballCarrier = byName(ctx, ballCarrierName);
  const stars = trait(ballCarrier, "offStars", 0);

  const threshold = Math.pow(stars, 2);
  const roll = Math.random() * 100;

  return roll <= threshold;
}
//NEEDS TRansition TO THIS CLASS
export function rollDefStarPower(ctx: EngineContext, defense: string) {
  const candidates = teamPlayers(ctx, defense)
    .filter((p) => {
      const pos = String(p.defPos ?? "").toUpperCase();
      return pos === "DL" || pos === "LB";
    })
    .map((p) => {
      const stars = trait(p, "defStars", 0);
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
    (sum, p) => sum + trait(p, "runDef", 0),
    0
  );

  const olTotal = offensiveBlockers.reduce(
    (sum, p) => sum + trait(p, "runBlocking", 0),
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
export function tryAutoStuff(ctx: EngineContext, defense: string) {
  const defensiveFront = teamPlayers(ctx, defense).filter((p) => {
    const pos = String(p.defPos ?? "").toUpperCase();
    return pos === "DL" || pos === "LB";
  });

  const starPower = defensiveFront.reduce((sum, p) => {
    const stars = trait(p, "defStars", 0);
    return sum + Math.pow(stars, 2) / 2.5;
  }, 0);

  const roll = Math.floor(Math.random() * 100) + 1;

  return roll <= starPower;
}
//NEEDS TRansition TO THIS CLASS
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
    const stars = trait(p, "offStars", 0);
    return sum + Math.pow(stars, 2) / 2.5;
  }, 0);

  const roll = Math.floor(Math.random() * 100) + 1;

  return roll <= starPower;
}

export function runPlayOld(game: LeagueGame, ctx: EngineContext, options: PlayCallOptions = {}) {
  const offense = offenseTeam(game), defense = defenseTeam(game);
  const formation = options.formation ?? {};
  const runner = byName(ctx, options.runner) ?? byName(ctx, formation.RB1) ?? byName(ctx, formation.RB2) ?? byName(ctx, formation.QB) ?? choose([...byPosition(ctx, offense, "RB"), ...byPosition(ctx, offense, "WR"), ...byPosition(ctx, offense, "QB")]);
  const runnerName = playerName(runner, `${offense} Runner`);
  //const blockers = Object.values(formation).map((name) => byName(ctx, name)).filter(Boolean).filter((p) => playerName(p) !== runnerName);
  //const rushers = teamPlayers(ctx, defense).filter((p) => ["DL", "LB"].includes(String(p.defPos ?? "").toUpperCase()));
  //const offTotal = blockers.reduce((s, p) => s + trait(p, "runBlocking"), 0);
  //const defTotal = rushers.reduce((s, p) => s + trait(p, "runDef"), 0);

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
  const clock = advanceQuarter(game, clockRunoff(options.clockMode, Math.max(3, 12 - Math.floor(trait(runner, "speed") / 15)), ["Touchdown", "Safety", "TO on Downs", "Fumble"].includes(result)));
  const updated = { ...game, HomeScore: hs, AwayScore: as, Qtr: clock.qtr, Time: clock.time, Down: next.down, Distance: next.distance, BallOn: next.ballOn, Previous: game.BallOn, DriveStart: next.turnover || td || safety ? next.ballOn : (game as unknown as Record<string, unknown>).DriveStart ?? game.BallOn, Possession: possession };
  return buildResult(game, updated, "Run", runnerName, "", yards, tackler, result, ctx.historyLength, { recoveredby: fumble.recoveredBy });
}

// ---------------------------------------------------------------------------
// Current run-play pipeline
// ---------------------------------------------------------------------------

export function runPlay(
  game: LeagueGame,
  ctx: EngineContext,
  options: PlayCallOptions = {}
) {
  const offense = offenseTeam(game);
  const defense = defenseTeam(game);

  console.log("Offense:", offense);
  console.log("Defense:", defense);

  const offenseFormation = options.formation ?? {};
  const defenseFormation = options.defense ?? [];

  const runnerName = options.runner ?? offenseFormation.RB1 ?? offenseFormation.QB ?? "";

  if (!runnerName) {
    throw new Error("No runner available for run play.");
  }

  const runState = createRunPlayState(runnerName);

  const lineWinLossArray = performLineWinLoss(
    offenseFormation,
    defenseFormation,
    ctx.players
  );

  const olWins = lineWinLossArray.filter((battle) => battle.winner === "OL").length;
  const dlWins = lineWinLossArray.filter((battle) => battle.winner === "DL").length;
  const runBlockingModifier = (olWins - dlWins) * 10;

  const visionCheck = performVisionCheck(
    runnerName,
    ctx.players,
    lineWinLossArray,
    runBlockingModifier
  );

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

  // Backfield branch: the runner missed the hole and must beat the winning DL.
  if (!visionCheck.getsPastDL) {
    const backfieldYards = randomInt(-5, -1);

    addYards(
      runState,
      backfieldYards,
      `${runState.runner} fails to hit the hole and is forced into the backfield`
    );

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
            const accelerationResult = performPostTruckAccelerationCheck(
              runState.runner,
              ctx.players
            );

            if (accelerationResult.acceleratedPast) {
              runState.log.push(
                `${runState.runner} accelerates after contact (roll ${accelerationResult.roll.toFixed(2)} <= ${accelerationResult.accelPastChance.toFixed(2)}%) and escapes toward the second level.`
              );
            } else {
              const pursuingDefender = otherWinningDLsAfterTruck[0]?.defensePlayer || dlWrapResult.defender;
              runState.log.push(
                `${runState.runner} cannot accelerate past the remaining defenders after the truck (roll ${accelerationResult.roll.toFixed(2)} > ${accelerationResult.accelPastChance.toFixed(2)}%).`
              );
              fallForwardResult = handleRunnerTackle(
                runState,
                pursuingDefender,
                "DL Backfield Post-Truck Acceleration Failed",
                ctx.players
              );
            }
          }
        }
      } else {
        dlJukeResult = performDlJukeCheck(
          runState.runner,
          dlWrapResult.defender,
          ctx.players
        );
      }

      if (!runState.stopped && dlJukeResult && !dlJukeResult.juked) {
        fallForwardResult = handleRunnerTackle(
          runState,
          dlWrapResult.defender,
          "DL Backfield Juke Failed",
          ctx.players
        );
      } 
      else if (dlJukeResult?.juked) {
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
            ctx.players
          );

          console.log("DL pursuit result:", dlPursuitResult);
        }
      }
    }
  }
  // Frontside branch: the runner found the intended lane and may face a swipe attempt.
  else {
    dlSwipeResult =
      runLaneTarget.selectedSide === "OL"
        ? performDlSwipeCheck(lineWinLossArray, runLaneTarget, ctx.players)
        : null;

    if (dlSwipeResult?.tackled) {
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

  //if tackled in backfield or snuffed at line
  if (runState.stopped) {
    console.log("Run stopped during DL phase:", runState);
    //return runState;
  }
  //if hit hole or juked out of backfield...
  else {
    console.log("Run survived DL phase:", runState);

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
}
