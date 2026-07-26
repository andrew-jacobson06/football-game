import type { LeagueGame } from "../../types";
import type { EngineContext, PlayCallOptions } from "./types";
import { buildResult } from "./playLogger";
import {
  advanceBall,
  advanceQuarter,
  byName,
  clockRunoff,
  defenseTeam,
  isSafety,
  isTouchdown,
  n,
  nextDownDistance,
  offenseTeam,
  playerName,
  switchPoss,
  teamPlayers,
  trait,
  weightedChoose,
} from "./utils";
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
import { applyFatigue } from "./fatigueEngine";
import {
  runPlayJSONAnimationBuilder,
  type FirstRunChallenge,
} from "./runPlayJSONAnimationBuilder";

/** Chooses the most plausible tackler after a run or pass play has ended, weighting nearby defender groups by tackling ability. It is used by `runPlay` and pass-play fumble/tackle resolution when no specific tackler was already recorded. */
export function determineTackler(
  ctx: EngineContext,
  defense: string,
  yards: number,
) {
  const defenders = teamPlayers(ctx, defense);
  const preferred =
    yards <= 2
      ? ["DL", "LB"]
      : yards <= 8
        ? ["LB", "DB", "S"]
        : ["DB", "S", "LB"];
  const pool =
    defenders.filter((p) =>
      preferred.includes(String(p.defPos ?? "").toUpperCase()),
    ) || defenders;
  return playerName(
    weightedChoose(pool.length ? pool : defenders, (p) =>
      trait(p, "tackleChance"),
    ),
    "NA",
  ); // TRAIT USED: TackleChance
}
/** Resolves whether a tackle knocks the ball loose, then stubs recovery as 55% tackler / 45% runner. */
export function fumbleCheck(
  ctx: EngineContext,
  runnerName: string,
  tacklerName: string,
) {
  const runner = byName(ctx, runnerName);
  const tackler = byName(ctx, tacklerName);

  if (!runner || !tackler || tacklerName === "NA") {
    return { fumble: false, recoveredBy: "" };
  }

  const strip = trait(tackler, "strip", 0); // TRAIT USED: Strip
  const ripChance = Math.pow(strip / 20, 2);

  if (Math.random() * 100 >= ripChance) {
    return { fumble: false, recoveredBy: "" };
  }

  const ballSecurity = trait(runner, "ballsecurity", 50); // TRAIT USED: BallSecurity
  const ballSecurityFailureChance = 27 - Math.pow(ballSecurity / 20, 2);

  if (Math.random() * 100 >= ballSecurityFailureChance) {
    return { fumble: false, recoveredBy: "" };
  }

  return {
    fumble: true,
    recoveredBy: Math.random() < 0.55 ? tacklerName : runnerName,
  };
}

export function checkForFumble(
  ctx: EngineContext,
  runnerName: string,
  tacklerName: string,
) {
  return fumbleCheck(ctx, runnerName, tacklerName);
}
// ---------------------------------------------------------------------------
// Current run-play pipeline
// ---------------------------------------------------------------------------

/** Runs the current detailed rushing pipeline from line matchups through second-level pursuit and final scoreboard bookkeeping. This is the primary run-play entry point re-exported by `gameEngine.ts`. */
export function runPlay(
  game: LeagueGame,
  ctx: EngineContext,
  options: PlayCallOptions = {},
) {
  const offense = offenseTeam(game);
  const defense = defenseTeam(game);

  // Establish the two teams before any football logic so all later lookups use the same possession snapshot.
  console.log("Offense:", offense);
  console.log("Defense:", defense);

  const offenseFormation = options.formation ?? {};
  const defenseFormation = options.defense ?? [];

  // The runner is explicitly selected by the caller when possible, then falls back to the primary back or quarterback in the formation.
  const runnerName =
    options.runner ?? offenseFormation.RB1 ?? offenseFormation.QB ?? "";

  if (!runnerName) {
    throw new Error("No runner available for run play.");
  }

  const runState = createRunPlayState(runnerName);

  // First phase: every trench slot resolves independently so the later vision check knows whether lanes are open or collapsed.
  const lineWinLossArray = performLineWinLoss(
    offenseFormation,
    defenseFormation,
    ctx.players,
  );

  const olWins = lineWinLossArray.filter(
    (battle) => battle.winner === "OL",
  ).length;
  const dlWins = lineWinLossArray.filter(
    (battle) => battle.winner === "DL",
  ).length;
  // More OL wins make the runner's vision target easier; more DL wins make the hole harder to find.
  const runBlockingModifier = (olWins - dlWins) * 10;

  // Second phase: the runner either reads the blocking and gets past the defensive line, or misses the hole into backfield trouble.
  const visionCheck = performVisionCheck(
    runnerName,
    ctx.players,
    lineWinLossArray,
    runBlockingModifier,
  );

  // The lane target records the blocker who sprung the lane or the defender who created penetration.
  const runLaneTarget = pickRunLaneTarget(
    lineWinLossArray,
    visionCheck,
    ctx.players,
  );

  let dlWrapResult: ReturnType<typeof performDlWrapCheck> | null = null;
  let dlSwipeResult: ReturnType<typeof performDlSwipeCheck> | null = null;
  let fallForwardResult: ReturnType<typeof handleRunnerTackle> | null = null;
  let dlJukeResult: ReturnType<typeof performDlJukeCheck> | null = null;
  let otherWinningDLsAfterJuke: ReturnType<typeof getOtherWinningDLs> = [];
  let dlPursuitResult: ReturnType<typeof resolveRemainingDlPursuit> | null =
    null;
  let bruiserResult: ReturnType<typeof performBruiserCheck> | null = null;
  let bruiserCarryDefenderResult: ReturnType<
    typeof performCarryDefenderChecks
  > | null = null;
  let firstChallenge: FirstRunChallenge | undefined;

  // Backfield branch: the runner missed the hole and must beat the winning DL.
  if (!visionCheck.getsPastDL) {
    // A missed hole immediately costs yardage before the runner can attempt to escape the penetrating defender.
    const backfieldYards = getBackfieldYards(ctx.settings, runState.log);

    addYards(
      runState,
      backfieldYards,
      `${runState.runner} fails to hit the hole and is forced into the backfield`,
    );

    bruiserResult = performBruiserCheck(runState.runner, ctx.players);

    if (bruiserResult.succeeded) {
      const bruiserTackler = runLaneTarget.selectedPlayer;
      runState.yards = 0;
      runState.log.push(
        `${runState.runner} powers out of the backfield loss (roll ${bruiserResult.roll.toFixed(2)} <= ${bruiserResult.bruiserScore.toFixed(2)}%) and gets back to the line of scrimmage.`,
      );

      bruiserCarryDefenderResult = performCarryDefenderChecks(
        runState.runner,
        ctx.players,
      );

      if (bruiserCarryDefenderResult.yardsAdded > 0) {
        runState.yards += bruiserCarryDefenderResult.yardsAdded;
        runState.log.push(
          `${runState.runner} carries ${bruiserTackler} for +${bruiserCarryDefenderResult.yardsAdded} ${bruiserCarryDefenderResult.yardsAdded === 1 ? "yard" : "yards"}.`,
        );
      }

      runState.tackler = bruiserTackler;
      runState.stopped = true;
      runState.stopReason = "Bruiser Check Tackle";
      runState.log.push(
        `${bruiserTackler} tackles ${runState.runner}. Reason: Bruiser Check Tackle.`,
      );
    } else {
      // The first penetrating DL gets a clean wrap attempt before the runner can choose a counter move.
      dlWrapResult = performDlWrapCheck(
        runLaneTarget.selectedPlayer,
        ctx.players,
      );

      if (dlWrapResult.wrapped) {
        fallForwardResult = handleRunnerTackle(
          runState,
          dlWrapResult.defender,
          "DL Backfield Wrap",
          ctx.players,
        );
      } else {
        // If the wrap fails, the runner chooses the more natural second-chance move for the size matchup.
        const dlSecondChanceAttempt = chooseRunnerDefenderSecondChanceAttempt(
          runState.runner,
          dlWrapResult.defender,
          ctx.players,
        );

        runState.log.push(
          `${runState.runner} chooses to ${dlSecondChanceAttempt.attempt.toLowerCase()} ${dlWrapResult.defender} ` +
            `(truck chance ${dlSecondChanceAttempt.truckChance.toFixed(2)}%, size diff ${dlSecondChanceAttempt.cappedSizeDifference}).`,
        );

        if (dlSecondChanceAttempt.attempt === "Truck") {
          // Truck attempts compare combined size/strength power and either restart the run or end in a tackle.
          const truckResult = performTruckAttempt(
            runState.runner,
            dlWrapResult.defender,
            ctx.players,
          );

          if (!truckResult.trucked) {
            runState.log.push(
              `${runState.runner} fails to truck ${dlWrapResult.defender} (roll ${truckResult.roll.toFixed(2)} > ${truckResult.truckChance.toFixed(2)}%).`,
            );
            fallForwardResult = handleRunnerTackle(
              runState,
              dlWrapResult.defender,
              "DL Backfield Truck Failed",
              ctx.players,
            );
          } else {
            runState.log.push(
              `${runState.runner} trucks ${dlWrapResult.defender} (roll ${truckResult.roll.toFixed(2)} <= ${truckResult.truckChance.toFixed(2)}%) and tries to restart downhill.`,
            );

            const otherWinningDLsAfterTruck = getOtherWinningDLs(
              lineWinLossArray,
              dlWrapResult.defender,
            );
            if (otherWinningDLsAfterTruck.length === 0) {
              runState.log.push(
                `${runState.runner} has no remaining penetrating defensive linemen to beat after the truck and escapes toward the second level.`,
              );
            } else {
              runState.log.push(
                `${runState.runner} trucks ${dlWrapResult.defender}, but other defensive linemen are still in pursuit.`,
              );

              dlPursuitResult = resolveRemainingDlPursuit(
                runState,
                otherWinningDLsAfterTruck,
                ctx.players,
                "truck",
              );

              console.log("DL pursuit result:", dlPursuitResult);
            }
          }
        } else {
          // Juke attempts are the agility counter to a failed DL wrap.
          dlJukeResult = performDlJukeCheck(
            runState.runner,
            dlWrapResult.defender,
            ctx.players,
          );
        }

        if (!runState.stopped && dlJukeResult && !dlJukeResult.juked) {
          // A failed backfield juke gives the original defender the tackle, with fall-forward contact still possible.
          fallForwardResult = handleRunnerTackle(
            runState,
            dlWrapResult.defender,
            "DL Backfield Juke Failed",
            ctx.players,
          );
        } else if (dlJukeResult?.juked) {
          // After beating the first DL, only other DLs that won their matchups can continue the backfield pursuit chain.
          otherWinningDLsAfterJuke = getOtherWinningDLs(
            lineWinLossArray,
            dlWrapResult.defender,
          );

          if (otherWinningDLsAfterJuke.length === 0) {
            runState.log.push(
              `${runState.runner} jukes ${dlWrapResult.defender} and escapes toward the second level.`,
            );
          } else {
            runState.log.push(
              `${runState.runner} jukes ${dlWrapResult.defender}, but other defensive linemen are still in pursuit.`,
            );

            dlPursuitResult = resolveRemainingDlPursuit(
              runState,
              otherWinningDLsAfterJuke,
              ctx.players,
              "juke",
            );

            console.log("DL pursuit result:", dlPursuitResult);
          }
        }
      }
    }
  }
  // Frontside branch: the runner found the intended lane and may face a swipe attempt.
  else {
    // If the selected lane came from an OL win, an adjacent DL who beat his blocker may swipe at the runner's legs.
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
        ctx.players,
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
      runState.log,
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
            ctx.players,
          )
        : undefined;

    addYards(
      runState,
      accelToSecondLevelYards,
      secondLevelDefender?.position.startsWith("DL")
        ? `${runState.runner} accelerates through a short crease before meeting a defensive lineman`
        : `${runState.runner} accelerates to the second level before meeting a linebacker`,
    );

    runState.log.push(
      `${runState.runner} hits the hole behind ${runLaneTarget.selectedPlayer} and clears the defensive line.`,
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
      jukedBackfieldDefenders,
    );

    if (lbSecondLevelResult?.linebacker && lbSecondLevelResult.wrapResult) {
      firstChallenge = {
        defender: lbSecondLevelResult.linebacker.player,
        position: lbSecondLevelResult.linebacker.position,
        accelerationYards: accelToSecondLevelYards,
        wrapped: lbSecondLevelResult.wrapResult.wrapped,
        attempt: lbSecondLevelResult.secondChanceAttempt?.attempt,
        moveSucceeded:
          lbSecondLevelResult.secondChanceAttempt?.attempt === "Juke"
            ? lbSecondLevelResult.jukeResult?.juked
            : lbSecondLevelResult.truckResult?.trucked,
        carryYards: lbSecondLevelResult.carryDefenderResult?.yardsAdded,
      };
    }

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
  const tackler = td
    ? "NA"
    : runState.tackler || determineTackler(ctx, defense, yards);
  const fumble =
    td || safety
      ? { fumble: false, recoveredBy: "" }
      : fumbleCheck(ctx, runnerName, tackler);
  const next = nextDownDistance(game, yards, newBall);
  // Final result priority mirrors football outcomes: scoring, turnover events, then first down or normal play.
  const result = td
    ? "Touchdown"
    : safety
      ? "Safety"
      : fumble.fumble
        ? "Fumble"
        : next.turnover
          ? "TO on Downs"
          : yards >= n(game.Distance)
            ? "First Down"
            : "Normal";
  let hs = n(game.HomeScore),
    as = n(game.AwayScore);
  if (td) {
    if (game.Possession === "Home") hs += 6;
    else as += 6;
  }
  if (safety) {
    if (game.Possession === "Home") as += 2;
    else hs += 2;
  }
  const possession =
    td ||
    safety ||
    next.turnover ||
    (fumble.fumble && fumble.recoveredBy === tackler)
      ? switchPoss(game)
      : game.Possession;
  const runner = byName(ctx, runnerName);
  const clock = advanceQuarter(
    game,
    clockRunoff(
      options.clockMode,
      Math.max(3, 12 - Math.floor(trait(runner, "speed") / 15)),
      ["Touchdown", "Safety", "TO on Downs", "Fumble"].includes(result),
    ),
  ); // TRAIT USED: Speed
  const updated = {
    ...game,
    HomeScore: hs,
    AwayScore: as,
    Qtr: clock.qtr,
    Time: clock.time,
    Down: next.down,
    Distance: next.distance,
    BallOn: next.ballOn,
    Previous: game.BallOn,
    DriveStart:
      next.turnover || td || safety
        ? next.ballOn
        : ((game as unknown as Record<string, unknown>).DriveStart ??
          game.BallOn),
    Possession: possession,
  };

  const successfulTrucks = runState.log.filter((entry) =>
    /\btrucks\b/i.test(entry),
  ).length;
  const successfulJukes = runState.log.filter((entry) =>
    /\bjukes\b/i.test(entry),
  ).length;
  const lineMatchups = lineWinLossArray.map((battle) => ({
    slot: battle.slot,
    offensePlayer: battle.offensePlayer,
    defensePlayer: battle.defensePlayer,
    winner: battle.winner,
  }));

  const playResult = buildResult(
    game,
    updated,
    "Run",
    runnerName,
    "",
    yards,
    tackler,
    result,
    ctx.historyLength,
    {
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
    },
  );

  // Resolution owns the football outcome; animation construction consumes the
  // completed result and never influences any of the simulation rolls above.
  Object.assign(playResult.play, {
    animation: runPlayJSONAnimationBuilder(
      game,
      updated,
      ctx,
      options,
      runnerName,
      yards,
      lineMatchups,
      visionCheck,
      runLaneTarget,
      dlSwipeResult,
      firstChallenge,
      tackler,
    ),
  });

  // Charge the rush after resolving the play so this snap uses the stamina the
  // runner brought into it and every subsequent snap sees the updated score.
  applyFatigue(ctx, runnerName, "Run");

  return playResult;
}
