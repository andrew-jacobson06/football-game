import type { LeagueGame } from "../../types";
import type {
  EngineContext,
  FormationSlot,
  LineStatMatchup,
  PlayCallOptions,
} from "./types";
import { defenseTeam, offenseTeam, playerName } from "./utils";
import type {
  DlSwipeResult,
  RunLaneTargetResult,
  VisionCheckResult,
} from "./runEngineHelper";

const domId = (prefix: string, position: string, name: string) =>
  `${prefix}-${position}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const imageOf = (player?: Record<string, unknown>) =>
  String(
    player?.image ??
      player?.Image ??
      player?.photo ??
      player?.Photo ??
      player?.headUrl ??
      "",
  );
const jerseyOf = (player?: Record<string, unknown>) =>
  String(player?.jersey ?? player?.Jersey ?? player?.["Jersey Image"] ?? "");

const randomYards = (min: number, max: number, random: () => number) =>
  Number((min + random() * (max - min)).toFixed(2));

const scoreText = (game: LeagueGame) =>
  `${String(game.Home ?? "HOME")} ${Number(game.HomeScore) || 0} | ${String(game.Away ?? "AWAY")} ${Number(game.AwayScore) || 0}`;

const situationText = (game: LeagueGame) =>
  `Q${game.Qtr} ${game.Time} - ${game.Down} & ${game.Distance} - Ball on ${game.BallOn}`;

export type RunAnimationPlan = {
  meta: Record<string, unknown>;
  scoreboard: { scoreText: string; situationText: string };
  camera: { note: string };
  initialFootballCarrierId?: string;
  lines: Array<{ id: string; label: string; yard: number; type: string }>;
  players: Array<Record<string, unknown>>;
  phases: Array<Record<string, unknown>>;
};

export type FirstRunChallenge = {
  defender: string;
  position: string;
  accelerationYards: number;
  wrapped: boolean;
  attempt?: "Juke" | "Truck";
  moveSucceeded?: boolean;
  carryYards?: number;
};

export type RunPursuitEvent = {
  stage: "secondary" | "breakaway";
  chaser: string;
  startYards: number;
  endYards: number;
  escaped: boolean;
};

/** Converts runner speed into an open-field animation pace of 6-9 yards/sec. */
export const breakawayDurationMs = (yards: number, speed: number) => {
  const normalizedSpeed = Math.max(0, Math.min(100, speed));
  const yardsPerSecond = 6 + (normalizedSpeed / 100) * 3;
  return Math.max(1, Math.round((Math.abs(yards) / yardsPerSecond) * 1000));
};

/**
 * Builds the animation data only after the run simulation has resolved. The
 * final phase carries the result to its ending yard before the next setup.
 */
export function runPlayJSONAnimationBuilder(
  previousGame: LeagueGame,
  updatedGame: LeagueGame,
  ctx: EngineContext,
  options: PlayCallOptions,
  runnerName: string,
  yardsGained: number,
  lineMatchups: LineStatMatchup[],
  visionCheck?: VisionCheckResult,
  runLaneTarget?: RunLaneTargetResult,
  dlSwipeResult?: DlSwipeResult | null,
  runChallenges: FirstRunChallenge[] = [],
  tacklerName = "NA",
  isBreakaway = false,
  pursuitEvents: RunPursuitEvent[] = [],
  random: () => number = Math.random,
): RunAnimationPlan {
  const formation = options.formation ?? {};
  const defense = options.defense ?? [];
  const direction = previousGame.Possession === "Away" ? -1 : 1;
  const los = Number(previousGame.BallOn);
  const offense = offenseTeam(previousGame);
  const defendingTeam = defenseTeam(previousGame);
  const rosterByName = new Map(
    ctx.players.map((player) => [playerName(player), player]),
  );
  const offenseIds = new Map<string, string>();
  const defenseIds = new Map<string, string>();
  const players: Array<Record<string, unknown>> = [];
  // GameField owns the canonical pre-snap lane and depth setup. The animation
  // plan describes personnel and assignments, then only supplies coordinates
  // once a phase actually moves a player.
  for (const [slot, name] of Object.entries(formation)) {
    if (!name) continue;
    const id = domId("off", slot, name);
    offenseIds.set(name, id);
    players.push({
      id,
      name,
      team: offense,
      position: slot,
      role: slot,
      unit: "offense",
      headUrl: imageOf(rosterByName.get(name)),
      jerseyUrl: jerseyOf(rosterByName.get(name)),
    });
  }

  for (const assignment of defense) {
    const id = domId("def", assignment.position, assignment.player);
    defenseIds.set(assignment.player, id);
    players.push({
      id,
      name: assignment.player,
      team: defendingTeam,
      position: assignment.position,
      role: assignment.position,
      unit: "defense",
      alignmentSlot: assignment.align as FormationSlot | undefined,
      headUrl: imageOf(rosterByName.get(assignment.player)),
      jerseyUrl: jerseyOf(rosterByName.get(assignment.player)),
    });
  }

  const quarterbackName = formation.QB ?? "";
  const centerName = formation.C ?? "";
  const quarterbackId = offenseIds.get(quarterbackName);
  const centerId = offenseIds.get(centerName);
  const runnerId = offenseIds.get(runnerName);
  const runnerSlot = (Object.entries(formation).find(
    ([slot, name]) => name === runnerName && /^RB[12]$/.test(slot),
  )?.[0] ?? "RB1") as "RB1" | "RB2";
  const handoffLane = runnerSlot === "RB2" ? "CR" : "CL";

  const battlePlayers: Array<Record<string, unknown>> = [];
  const labels: Array<Record<string, unknown>> = [];
  for (const matchup of lineMatchups) {
    const olId = offenseIds.get(matchup.offensePlayer);
    const dlId = defenseIds.get(matchup.defensePlayer);
    if (!olId || !dlId) continue;
    const olStart = los;
    const dlStart = los + direction * 1.5;
    const olWon = matchup.winner === "OL";
    const olMove = olWon
      ? randomYards(1, 2.5, random)
      : -randomYards(0.5, 1.5, random);
    const dlMove = olWon
      ? randomYards(1, 2, random)
      : -randomYards(1.5, 2, random);
    battlePlayers.push(
      {
        playerId: olId,
        lane: matchup.slot,
        yard: Number((olStart + direction * olMove).toFixed(2)),
        className: olWon ? "ol-win" : "ol-lost",
      },
      {
        playerId: dlId,
        lane: matchup.slot,
        yard: Number((dlStart + direction * dlMove).toFixed(2)),
        className: olWon ? "dl-lost" : "dl-win",
      },
    );
    labels.push({
      id: `${olId}-${dlId}`,
      text: `${olWon ? matchup.offensePlayer : matchup.defensePlayer} wins`,
      lane: matchup.slot,
      yard: Number(((olStart + dlStart) / 2).toFixed(2)),
      className: olWon ? "win" : "loss",
      visible: true,
    });
  }

  const snapPlayers = quarterbackId
    ? [
        {
          playerId: quarterbackId,
          lane: "C",
          yard: Number(
            ((los - direction * 3.5) - direction * 0.5).toFixed(
              2,
            ),
          ),
          className: "handoff-qb",
        },
      ]
    : [];
  const phaseTwoPlayers = [...battlePlayers];
  if (quarterbackId)
    phaseTwoPlayers.push({
      playerId: quarterbackId,
      lane: handoffLane,
      yard: Number(
        ((snapPlayers[0]?.yard ?? los) - direction * 0.25).toFixed(2),
      ),
      className: "handoff-qb",
    });
  if (runnerId)
    phaseTwoPlayers.push({
      playerId: runnerId,
      yard: Number(
        (los - direction * 5).toFixed(2),
      ),
      className: "handoff-target",
    });

  const scoringYard = los + direction * yardsGained;
  const isTouchdown =
    tacklerName === "NA" &&
    (direction === 1 ? scoringYard >= 100 : scoringYard <= 0);
  // The updated game is already set for the ensuing possession after a score,
  // so keep the animation on the scoring goal line instead of the kickoff spot.
  const resultYard = isTouchdown
    ? (direction === 1 ? 100 : 0)
    : Number(updatedGame.BallOn);
  const runnerSpeed = Number(rosterByName.get(runnerName)?.speed) || 0;
  const openFieldDurationMs = breakawayDurationMs(yardsGained, runnerSpeed);
  const breakawayStartYard = Number(
    (los + direction * Math.min(Math.abs(yardsGained), 8)).toFixed(2),
  );
  const successfulHoleSwipe = Boolean(
    visionCheck?.getsPastDL &&
      runLaneTarget?.selectedSide === "OL" &&
      dlSwipeResult?.tackled,
  );
  const swipeDefenderId = dlSwipeResult
    ? defenseIds.get(dlSwipeResult.defender)
    : undefined;
  const swipeBlockerLane = dlSwipeResult?.slot;
  const chosenHoleLane = runLaneTarget?.selectedSlot ?? handoffLane;
  const hiddenLabels = labels.map((label) => ({ ...label, visible: false }));
  const firstChallenge = runChallenges[0];
  const challengeDefenderId = firstChallenge
    ? defenseIds.get(firstChallenge.defender)
    : undefined;
  const challengeYard = Number(
    (los + direction * (firstChallenge?.accelerationYards ?? 0)).toFixed(2),
  );
  const challengeAssignment = firstChallenge
    ? defense.find((assignment) => assignment.player === firstChallenge.defender)
    : undefined;
  const challengeLane = challengeAssignment?.align ?? chosenHoleLane;
  const tacklerId = defenseIds.get(tacklerName);
  const cutLanes = ["LTL", "LT", "LG", "CL", "C", "CR", "RG", "RT", "RTR"];
  const holeIndex = Math.max(0, cutLanes.indexOf(chosenHoleLane));
  const fakeLeft = random() < 0.5;
  const fakeLane = cutLanes[
    Math.max(0, Math.min(cutLanes.length - 1, holeIndex + (fakeLeft ? -1 : 1)))
  ];
  const cutLane = cutLanes[
    Math.max(0, Math.min(cutLanes.length - 1, holeIndex + (fakeLeft ? 1 : -1)))
  ];
  const jukeMove =
    firstChallenge?.attempt === "Juke" && random() >= 0.7 ? "spin" : "juke";
  const defenderIsInFront = challengeLane === chosenHoleLane;
  const powerMove = defenderIsInFront ? "truck" : "stiff-arm";
  const challengeLaneIndex = cutLanes.includes(challengeLane)
    ? cutLanes.indexOf(challengeLane)
    : holeIndex;
  const stiffArmLane = cutLanes[
    Math.max(
      0,
      Math.min(
        cutLanes.length - 1,
        challengeLaneIndex + (challengeLaneIndex < holeIndex ? -1 : 1),
      ),
    )
  ];

  const firstChallengePhases: Array<Record<string, unknown>> = firstChallenge
    ? [
        /*
         * Phase: accelerate-to-first-challenge
         * What: advances the runner and the first unblocked defender to the
         * same simulated contact yard.
         * How: both player records receive that yard while their CSS classes
         * show acceleration/pursuit; the football remains attached to runnerId.
         */
        {
          id: "accelerate-to-first-challenge",
          caption: `${runnerName} accelerates through the hole and meets ${firstChallenge.defender}.`,
          durationMs: 650,
          players: [
            ...(runnerId
              ? [{ playerId: runnerId, lane: chosenHoleLane, yard: challengeYard, className: "ball-carrier accelerating" }]
              : []),
            ...(challengeDefenderId
              ? [{ playerId: challengeDefenderId, lane: challengeLane, yard: challengeYard, className: "chasing" }]
              : []),
          ],
          labels: hiddenLabels,
          football: { mode: "carrier", carrierId: runnerId },
        },
        // Pick exactly one contact sequence from the simulation result so the
        // animation illustrates the resolved outcome rather than rerolling it.
        firstChallenge.wrapped
          ? {
              /*
               * Phase: first-challenge-wrap-tackle
               * What: shows an immediate form tackle with no attempted move.
               * How: co-locates runner and defender in the chosen lane and
               * applies the tackled/tackling CSS action classes, then holds the
               * pose long enough for the contact to read clearly.
               */
              id: "first-challenge-wrap-tackle",
              caption: `${firstChallenge.defender} wraps up ${runnerName} at the point of contact.`,
              durationMs: 450,
              holdMs: 350,
              players: [
                ...(runnerId ? [{ playerId: runnerId, lane: chosenHoleLane, yard: challengeYard, className: "tackled" }] : []),
                ...(challengeDefenderId ? [{ playerId: challengeDefenderId, lane: chosenHoleLane, yard: challengeYard, className: "tackling" }] : []),
              ],
              football: { mode: "carrier", carrierId: runnerId },
            }
          : firstChallenge.attempt === "Juke"
            ? {
                /*
                 * Phase: first-challenge-(failed-)?(juke|spin)
                 * What: shows a runner's evasive move and whether it succeeds.
                 * How: a two-step path first fakes/spins at the contact yard,
                 * then cuts away or ends tackled; the defender's action class
                 * changes to juked or tackling to match the resolved check.
                 */
                id: `first-challenge-${firstChallenge.moveSucceeded ? "" : "failed-"}${jukeMove}`,
                caption: firstChallenge.moveSucceeded
                  ? jukeMove === "spin"
                    ? `${runnerName} spins away from ${firstChallenge.defender}.`
                    : `${runnerName} steps ${fakeLeft ? "left" : "right"}, cuts back hard, and jukes ${firstChallenge.defender}.`
                  : jukeMove === "spin"
                    ? `${runnerName} tries to spin away, but ${firstChallenge.defender} delivers an immediate tackle.`
                    : `${runnerName} cuts back, but ${firstChallenge.defender} delivers an immediate tackle.`,
                durationMs: 700,
                holdMs: firstChallenge.moveSucceeded ? 150 : 350,
                players: [
                  ...(runnerId
                    ? [{
                        playerId: runnerId,
                        path: jukeMove === "spin"
                          ? [
                              { lane: chosenHoleLane, yard: challengeYard, className: "spinning", durationMs: 400 },
                              { lane: chosenHoleLane, yard: challengeYard, className: firstChallenge.moveSucceeded ? "ball-carrier accelerating" : "tackled", durationMs: 300 },
                            ]
                          : [
                              { lane: fakeLane, yard: challengeYard, className: "juking", durationMs: 250 },
                              { lane: cutLane, yard: challengeYard, className: firstChallenge.moveSucceeded ? "ball-carrier accelerating" : "tackled", durationMs: 450 },
                            ],
                      }]
                    : []),
                  ...(challengeDefenderId
                    ? [{ playerId: challengeDefenderId, lane: cutLane, yard: challengeYard, className: firstChallenge.moveSucceeded ? "juked" : "tackling" }]
                    : []),
                ],
                football: { mode: "carrier", carrierId: runnerId },
              }
            : [
                /*
                 * Phase: first-challenge-(truck|stiff-arm)-attempt
                 * What: stages the initial power-move collision.
                 * How: brings both players to the contact yard and adds the
                 * lowering-shoulder or stiff-arming pose before the result.
                 */
                {
                  id: `first-challenge-${powerMove}-attempt`,
                  caption: powerMove === "truck"
                    ? `${runnerName} lowers his shoulder and tries to power through ${firstChallenge.defender}.`
                    : `${runnerName} extends a stiff arm toward ${firstChallenge.defender}.`,
                  durationMs: 350,
                  players: [
                    ...(runnerId ? [{ playerId: runnerId, lane: chosenHoleLane, yard: challengeYard, className: powerMove === "truck" ? "lowering-shoulder" : "stiff-arming" }] : []),
                    ...(challengeDefenderId ? [{ playerId: challengeDefenderId, lane: challengeLane, yard: challengeYard, className: "tackling" }] : []),
                  ],
                  football: { mode: "carrier", carrierId: runnerId },
                },
                /*
                 * Phase: first-challenge power-move result
                 * What: resolves the truck/stiff-arm as a win, tackle, or drag.
                 * How: action classes show who won, lateral lane displacement
                 * sells a stiff-arm, and carryYards moves a stopped runner and
                 * tackler together to the simulation's final yard.
                 */
                {
                  id: firstChallenge.moveSucceeded
                    ? `first-challenge-${powerMove}`
                    : firstChallenge.carryYards
                      ? "first-challenge-truck-drag"
                      : "first-challenge-failed-truck",
                  caption: firstChallenge.moveSucceeded
                    ? powerMove === "truck"
                      ? `${runnerName} trucks through ${firstChallenge.defender}.`
                      : `${runnerName} stiff-arms ${firstChallenge.defender} away.`
                    : firstChallenge.carryYards
                      ? `${firstChallenge.defender} stops the truck, but ${runnerName} drags him for ${firstChallenge.carryYards} ${firstChallenge.carryYards === 1 ? "yard" : "yards"}.`
                      : `${firstChallenge.defender} stands up ${runnerName}'s truck attempt and tackles him at contact.`,
                  durationMs: 600,
                  holdMs: firstChallenge.moveSucceeded ? 150 : 350,
                  players: [
                    ...(runnerId ? [{ playerId: runnerId, lane: chosenHoleLane, yard: firstChallenge.moveSucceeded ? challengeYard : firstChallenge.carryYards ? resultYard : challengeYard, className: firstChallenge.moveSucceeded ? powerMove === "truck" ? "trucking" : "stiff-arming" : "tackled" }] : []),
                    ...(challengeDefenderId ? [{ playerId: challengeDefenderId, lane: firstChallenge.moveSucceeded && powerMove === "stiff-arm" ? stiffArmLane : chosenHoleLane, yard: firstChallenge.carryYards ? resultYard : challengeYard, className: firstChallenge.moveSucceeded ? powerMove === "truck" ? "trucked" : "stiff-armed" : "tackling" }] : []),
                  ],
                  football: { mode: "carrier", carrierId: runnerId },
                },
              ],
      ]
        .flat()
    : [];

  // A runner can beat several defenders. Preserve every simulation contact in
  // the animation instead of jumping from the first move to the final spot.
  // Each pursuit phase brings the *next* challenger to the contact point while
  // the runner accelerates there, so the defender is established before the
  // tackle, juke, or truck begins.
  const followingChallengePhases: Array<Record<string, unknown>> = runChallenges
    .slice(1)
    .flatMap((challenge, index) => {
      const defenderId = defenseIds.get(challenge.defender);
      const assignment = defense.find(({ player }) => player === challenge.defender);
      const lane = assignment?.align ?? chosenHoleLane;
      const yard = Number((los + direction * challenge.accelerationYards).toFixed(2));
      const succeeded = Boolean(challenge.moveSucceeded);
      const move = challenge.attempt?.toLowerCase() ?? "wrap";
      const stopped = challenge.wrapped || (challenge.attempt && !succeeded);
      return [
        /*
         * Phase: pursuit-to-challenge-N
         * What: connects one successful escape to the next defender encounter.
         * How: moves runner and the next defender to this challenge's resolved
         * yard with accelerating/chasing classes and keeps the ball on runner.
         */
        {
          id: `pursuit-to-challenge-${index + 2}`,
          caption: `${runnerName} tries to accelerate away, but ${challenge.defender} closes at the next challenge point.`,
          durationMs: 650,
          players: [
            ...(runnerId ? [{ playerId: runnerId, lane: chosenHoleLane, yard, className: "ball-carrier accelerating" }] : []),
            ...(defenderId ? [{ playerId: defenderId, lane, yard, className: "chasing" }] : []),
          ],
          labels: hiddenLabels,
          football: { mode: "carrier", carrierId: runnerId },
        },
        /*
         * Phase: challenge-N-(tackle|juke|truck)
         * What: displays the outcome of every later challenge in order.
         * How: both players meet in one lane and outcome-specific CSS classes
         * plus holdMs distinguish a quick escape from a play-ending tackle.
         */
        {
          id: `challenge-${index + 2}-${stopped ? "tackle" : move}`,
          caption: challenge.wrapped
            ? `${challenge.defender} gets into position and wraps up ${runnerName}.`
            : succeeded
              ? `${runnerName} ${move === "juke" ? "jukes" : "trucks through"} ${challenge.defender} and looks to accelerate again.`
              : `${challenge.defender} defeats ${runnerName}'s ${move} attempt and makes the tackle.`,
          durationMs: 600,
          holdMs: stopped ? 350 : 150,
          players: [
            ...(runnerId ? [{ playerId: runnerId, lane: chosenHoleLane, yard, className: stopped ? "tackled" : move === "juke" ? "juking" : "trucking" }] : []),
            ...(defenderId ? [{ playerId: defenderId, lane: chosenHoleLane, yard, className: stopped ? "tackling" : move === "juke" ? "juked" : "trucked" }] : []),
          ],
          football: { mode: "carrier", carrierId: runnerId },
        },
      ];
    });

  const challengePhases = [...firstChallengePhases, ...followingChallengePhases];

  // The resolved play selects either the line swipe or first-challenge
  // choreography; animation randomness only selects the juke fake side and
  // whether a successful or failed Juke attempt is shown as a juke or spin.
  const resultPhases: Array<Record<string, unknown>> = successfulHoleSwipe
    ? [
        /*
         * Phase: accelerate-to-swipe
         * What: sends the runner through the selected blocker-created hole.
         * How: moves the carrier up the chosen lane toward the final result (or
         * the eight-yard breakaway staging point) while hiding matchup labels.
         */
        {
          id: "accelerate-to-swipe",
          caption: `${runnerName} hits the hole behind ${runLaneTarget!.selectedPlayer}.`,
          durationMs: 650,
          players: runnerId
            ? [
                {
                  playerId: runnerId,
                  lane: chosenHoleLane,
                  yard: isBreakaway ? breakawayStartYard : resultYard,
                  className: "ball-carrier accelerating",
                },
              ]
            : [],
          labels: hiddenLabels,
          football: { mode: "carrier", carrierId: runnerId },
        },
        /*
         * Phase: dl-swipe-tackle
         * What: shows the defensive lineman crossing the block for the tackle.
         * How: the defender follows a two-point path from the blocker's lane to
         * the runner's lane, where tackle action classes and field flashes fire.
         */
        {
          id: "dl-swipe-tackle",
          caption: `${dlSwipeResult!.defender} swipes across ${dlSwipeResult!.blocker} and tackles ${runnerName}.`,
          durationMs: 450,
          players: [
            ...(runnerId
              ? [
                  {
                    playerId: runnerId,
                    lane: chosenHoleLane,
                    yard: resultYard,
                    className: "tackled",
                  },
                ]
              : []),
            ...(swipeDefenderId
              ? [
                  {
                    playerId: swipeDefenderId,
                    path: [
                      {
                        lane: swipeBlockerLane,
                        yard: resultYard,
                        className: "chasing",
                      },
                      {
                        lane: chosenHoleLane,
                        yard: resultYard,
                        className: "tackling",
                      },
                    ],
                  },
                ]
              : []),
          ],
          football: { mode: "carrier", carrierId: runnerId },
          fieldEffects: {
            firstDownFlash:
              Number(previousGame.Distance) <= Math.max(0, yardsGained),
          },
        },
        /*
         * Phase: dl-swipe-celebration
         * What: gives the lineman a readable post-tackle reaction.
         * How: leaves him at the result yard with the celebrating CSS class and
         * holds the frame before the field resets.
         */
        {
          id: "dl-swipe-celebration",
          caption: `${dlSwipeResult!.defender} celebrates the stop.`,
          durationMs: 500,
          holdMs: 500,
          players: swipeDefenderId
            ? [
                {
                  playerId: swipeDefenderId,
                  lane: chosenHoleLane,
                  yard: resultYard,
                  className: "celebrating",
                },
              ]
            : [],
          football: { mode: "carrier", carrierId: runnerId },
        },
      ]
    : challengePhases.length > 0
      ? challengePhases
      : [
        /*
         * Phase: run-result
         * What: handles runs that have no separately animated defender event.
         * How: moves the carrier directly to the resolved yard (or breakaway
         * staging point), then triggers first-down/touchdown field feedback.
         */
        {
          id: "run-result",
          caption: `${runnerName} runs for ${yardsGained} yard${Math.abs(yardsGained) === 1 ? "" : "s"}.`,
          durationMs: 900,
          holdMs: 250,
          players: runnerId
            ? [
                {
                  playerId: runnerId,
                  lane: chosenHoleLane,
                  yard: isBreakaway ? breakawayStartYard : resultYard,
                  className: "ball-carrier",
                },
              ]
            : [],
          labels: hiddenLabels,
          football: { mode: "carrier", carrierId: runnerId },
          fieldEffects: {
            touchdownFlash: resultYard === 0 || resultYard === 100,
            firstDownFlash:
              Number(previousGame.Distance) <= Math.max(0, yardsGained),
          },
        },
      ];

  const lastChallenge = runChallenges.at(-1);
  const firstChallengeShowsTackle = Boolean(
    lastChallenge &&
      (lastChallenge.wrapped ||
        (!lastChallenge.moveSucceeded && lastChallenge.attempt)),
  );
  const needsFinalTackle = Boolean(
    tacklerName &&
      tacklerName !== "NA" &&
      tacklerId &&
      !successfulHoleSwipe &&
      !firstChallengeShowsTackle,
  );
  const finalTacklePhase: Array<Record<string, unknown>> = needsFinalTackle
    ? [
        /*
         * Phase: final-tackle-pursuit
         * What: establishes the recorded tackler before the finishing contact.
         * How: moves tackler and carrier together at resultYard with chase and
         * acceleration classes, avoiding a defender suddenly appearing there.
         */
        {
          id: "final-tackle-pursuit",
          caption: `${tacklerName} tracks ${runnerName} into position for the final challenge.`,
          durationMs: 550,
          players: [
            ...(runnerId ? [{ playerId: runnerId, lane: chosenHoleLane, yard: resultYard, className: "ball-carrier accelerating" }] : []),
            { playerId: tacklerId, lane: chosenHoleLane, yard: resultYard, className: "chasing" },
          ],
          football: { mode: "carrier", carrierId: runnerId },
        },
        /*
         * Phase: final-tackle
         * What: ends the run with the recorded tackler making contact.
         * How: co-locates both sprites, applies tackled/tackling classes, and
         * holds the finished pose while the ball stays attached to the runner.
         */
        {
          id: "final-tackle",
          caption: `${tacklerName} closes on ${runnerName} and makes the tackle.`,
          durationMs: 500,
          holdMs: 400,
          players: [
            ...(runnerId
              ? [
                  {
                    playerId: runnerId,
                    lane: chosenHoleLane,
                    yard: resultYard,
                    className: "tackled",
                  },
                ]
              : []),
            {
              playerId: tacklerId,
              lane: chosenHoleLane,
              yard: resultYard,
              className: "tackling",
            },
          ],
          football: { mode: "carrier", carrierId: runnerId },
        },
      ]
    : [];

  const breakawayPhase: Array<Record<string, unknown>> = isBreakaway
    ? [{
        /*
         * Phase: breakaway-run
         * What: carries an uncontested runner through the open field.
         * How: duration is derived from yards and player speed, the carrier is
         * moved to resultYard, and a scoring run activates touchdown feedback.
         */
        id: "breakaway-run",
        caption: isTouchdown
          ? `${runnerName} breaks free and races into the end zone!`
          : `${runnerName} breaks free into the open field!`,
        durationMs: openFieldDurationMs,
        players: runnerId
          ? [{ playerId: runnerId, lane: chosenHoleLane, yard: resultYard, className: "ball-carrier accelerating" }]
          : [],
        labels: hiddenLabels,
        football: { mode: "carrier", carrierId: runnerId },
        fieldEffects: { touchdownFlash: isTouchdown },
      }]
    : [];

  const pursuitPhases: Array<Record<string, unknown>> = pursuitEvents.flatMap((event, index) => {
    const chaserId = defenseIds.get(event.chaser);
    if (!runnerId || !chaserId) return [];
    const endYard = event.escaped && event.stage === "breakaway"
      ? (direction === 1 ? 100 : 0)
      : Number((los + direction * event.endYards).toFixed(2));
    const chaseYard = Number((los + direction * event.startYards).toFixed(2));
    const prefix = `${event.stage}-pursuit-${index + 1}`;
    return [
      /*
       * Phase: (secondary|breakaway)-pursuit-N-chase
       * What: visually establishes a pursuit defender two yards behind.
       * How: advances both sprites to the simulation's pursuit start distance
       * while acceleration/chasing classes communicate their relative motion.
       */
      {
        id: `${prefix}-chase`,
        caption: `${event.chaser} is in hot pursuit of ${runnerName}.`,
        durationMs: 800,
        players: [
          { playerId: runnerId, lane: chosenHoleLane, yard: chaseYard, className: "ball-carrier accelerating" },
          { playerId: chaserId, lane: chosenHoleLane, yard: Number((chaseYard - direction * 2).toFixed(2)), className: "chasing" },
        ],
        labels: hiddenLabels,
        football: { mode: "carrier", carrierId: runnerId },
      },
      /*
       * Phase: (secondary|breakaway)-pursuit-N-(escape|tackle)
       * What: resolves whether the chaser catches the runner.
       * How: an escape preserves a three-yard gap; a tackle co-locates both
       * players. Duration scales for breakaways and scoring triggers a flash.
       */
      {
        id: `${prefix}-${event.escaped ? "escape" : "tackle"}`,
        caption: event.escaped
          ? event.stage === "breakaway"
            ? `${runnerName} pulls away from ${event.chaser} and reaches the end zone!`
            : `${runnerName} escapes ${event.chaser}, but the defense keeps chasing.`
          : `${event.chaser} catches ${runnerName} from behind and makes the tackle.`,
        durationMs: event.stage === "breakaway" ? openFieldDurationMs : 700,
        holdMs: event.escaped ? 150 : 400,
        players: [
          { playerId: runnerId, lane: chosenHoleLane, yard: endYard, className: event.escaped ? "ball-carrier accelerating" : "tackled" },
          { playerId: chaserId, lane: chosenHoleLane, yard: event.escaped ? Number((endYard - direction * 3).toFixed(2)) : endYard, className: event.escaped ? "chasing" : "tackling" },
        ],
        football: { mode: "carrier", carrierId: runnerId },
        fieldEffects: { touchdownFlash: event.escaped && event.stage === "breakaway" },
      },
    ];
  });

  const touchdownCelebrationPhase: Array<Record<string, unknown>> = isTouchdown
    ? [{
        /*
         * Phase: touchdown-celebration
         * What: finishes a scoring run with an end-zone celebration.
         * How: keeps the carrier and football on the goal line, applies the
         * celebrating loop, and varies its duration from four to six seconds.
         */
        id: "touchdown-celebration",
        caption: `Touchdown! ${runnerName} celebrates in the end zone!`,
        durationMs: Math.round(4000 + random() * 2000),
        players: runnerId
          ? [{ playerId: runnerId, lane: chosenHoleLane, yard: resultYard, className: "celebrating" }]
          : [],
        football: { mode: "carrier", carrierId: runnerId },
        fieldEffects: { touchdownFlash: true },
      }]
    : [];

  // On successful reads, make the backfield cut its own phase. This prevents
  // the carrier from appearing to run straight through a winning lineman and
  // establishes the blocker-created gap before any upfield acceleration.
  const chooseLanePhases: Array<Record<string, unknown>> =
    visionCheck?.getsPastDL && runLaneTarget?.selectedSide === "OL"
      ? [
          /*
           * Phase: choose-run-lane
           * What: makes the back's successful vision read visible before he
           * reaches the line of scrimmage.
           * How: cuts the carrier laterally behind the selected winning blocker
           * at backfield depth and hides line-result labels for a clean handoff
           * into the next phase.
           */
          {
            id: "choose-run-lane",
            caption: `${runnerName} presses the backfield, then cuts behind ${runLaneTarget.selectedPlayer}.`,
            durationMs: 450,
            players: runnerId
              ? [
                  {
                    playerId: runnerId,
                    lane: chosenHoleLane,
                    yard: Number((los - direction * 2.25).toFixed(2)),
                    className: "ball-carrier choosing-lane",
                  },
                ]
              : [],
            labels: hiddenLabels,
            football: { mode: "carrier", carrierId: runnerId },
          },
        ]
      : [];

  return {
    meta: {
      playId: String((updatedGame as unknown as Record<string, unknown>).PlayId ?? `RUN-${Date.now()}`),
      playType: "Run",
      offenseTeam: offense,
      defenseTeam: defendingTeam,
      direction: direction === 1 ? "upfield" : "downfield",
      startYard: los,
      endYard: Number(updatedGame.BallOn),
      yardsGained,
    },
    scoreboard: {
      scoreText: scoreText(previousGame),
      situationText: situationText(previousGame),
    },
    camera: { note: "Manual scroll field" },
    initialFootballCarrierId: centerId,
    lines: [
      { id: "los", label: "LOS", yard: los, type: "los" },
      {
        id: "firstDown",
        label: "1ST",
        yard: los + direction * Number(previousGame.Distance),
        type: "firstDown",
      },
    ],
    players,
    phases: [
      /*
       * Phase: snap
       * What: starts the play by transferring the ball from center to QB.
       * How: moves the QB to his exchange depth and changes carrierId to the QB.
       */
      {
        id: "snap",
        caption: `${quarterbackName} takes the snap.`,
        durationMs: 200,
        players: snapPlayers,
        football: { mode: "carrier", carrierId: quarterbackId },
      },
      /*
       * Phase: handoff-line-battles
       * What: runs the handoff at the same time as every OL/DL matchup.
       * How: moves the QB and back toward the exchange, shifts each lineman by
       * its resolved win/loss distance, displays winner labels, and attaches
       * the football to the runner for all subsequent phases.
       */
      {
        id: "handoff-line-battles",
        caption: `${quarterbackName} hands off to ${runnerName} as the lines battle.`,
        durationMs: 800,
        players: phaseTwoPlayers,
        labels,
        football: { mode: "carrier", carrierId: runnerId },
      },
      // Optional phases are appended in football order: backfield lane choice,
      // contact result, pursuit or uncontested breakaway, any final tackle, and
      // touchdown celebration. Each collection is empty when it does not apply.
      ...chooseLanePhases,
      ...resultPhases,
      ...(pursuitPhases.length ? pursuitPhases : breakawayPhase),
      ...(pursuitPhases.length ? [] : finalTacklePhase),
      ...touchdownCelebrationPhase,
    ],
  };
}
