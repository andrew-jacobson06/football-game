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

  const resultYard = Number(updatedGame.BallOn);
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

  // Phase three currently specializes only the completed "hit hole + swipe"
  // branch. Other outcomes retain the existing result animation until their
  // first-challenge choreography is implemented.
  const resultPhases: Array<Record<string, unknown>> = successfulHoleSwipe
    ? [
        {
          id: "accelerate-to-swipe",
          caption: `${runnerName} hits the hole behind ${runLaneTarget!.selectedPlayer}.`,
          durationMs: 650,
          players: runnerId
            ? [
                {
                  playerId: runnerId,
                  lane: chosenHoleLane,
                  yard: resultYard,
                  className: "ball-carrier accelerating",
                },
              ]
            : [],
          labels: hiddenLabels,
          football: { mode: "carrier", carrierId: runnerId },
        },
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
    : [
        {
          id: "run-result",
          caption: `${runnerName} runs for ${yardsGained} yard${Math.abs(yardsGained) === 1 ? "" : "s"}.`,
          durationMs: 900,
          holdMs: 250,
          players: runnerId
            ? [
                {
                  playerId: runnerId,
                  lane: handoffLane,
                  yard: resultYard,
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
      {
        id: "snap",
        caption: `${quarterbackName} takes the snap.`,
        durationMs: 200,
        players: snapPlayers,
        football: { mode: "carrier", carrierId: quarterbackId },
      },
      {
        id: "handoff-line-battles",
        caption: `${quarterbackName} hands off to ${runnerName} as the lines battle.`,
        durationMs: 800,
        players: phaseTwoPlayers,
        labels,
        football: { mode: "carrier", carrierId: runnerId },
      },
      ...resultPhases,
    ],
  };
}
