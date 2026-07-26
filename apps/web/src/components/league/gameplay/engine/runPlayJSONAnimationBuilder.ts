import type { LeagueGame } from "../../types";
import type {
  EngineContext,
  FormationSlot,
  LineStatMatchup,
  PlayCallOptions,
} from "./types";
import { defenseTeam, offenseTeam, playerName } from "./utils";

const OFFENSE_SETUP: Partial<
  Record<FormationSlot, { lane: string; offset: number }>
> = {
  WR1: { lane: "WR1", offset: -1 },
  WR2: { lane: "WR2", offset: -1 },
  WR3: { lane: "SLT1", offset: -1.5 },
  WR4: { lane: "SLT2", offset: -1.5 },
  RB1: { lane: "LG", offset: -6 },
  RB2: { lane: "RG", offset: -6 },
  QB: { lane: "C", offset: -3.5 },
  LT: { lane: "LT", offset: -1 },
  LG: { lane: "LG", offset: -0.75 },
  C: { lane: "C", offset: -0.5 },
  RG: { lane: "RG", offset: -0.75 },
  RT: { lane: "RT", offset: -1 },
};

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
 * Builds the animation data only after the run simulation has resolved. For
 * now it deliberately stops after the snap and handoff/line-battle phases.
 */
export function runPlayJSONAnimationBuilder(
  previousGame: LeagueGame,
  updatedGame: LeagueGame,
  ctx: EngineContext,
  options: PlayCallOptions,
  runnerName: string,
  yardsGained: number,
  lineMatchups: LineStatMatchup[],
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
  const initialYards = new Map<string, number>();

  const players: Array<Record<string, unknown>> = [];
  for (const [slot, name] of Object.entries(formation)) {
    if (!name) continue;
    const setup = OFFENSE_SETUP[slot as FormationSlot];
    if (!setup) continue;
    const id = domId("off", slot, name);
    const yard = los + direction * setup.offset;
    offenseIds.set(name, id);
    initialYards.set(id, yard);
    players.push({
      id,
      name,
      team: offense,
      position: slot,
      role: slot,
      unit: "offense",
      lane: setup.lane,
      yard,
      headUrl: imageOf(rosterByName.get(name)),
    });
  }

  for (const assignment of defense) {
    const id = domId("def", assignment.position, assignment.player);
    const isLineDefender = assignment.position.startsWith("DL");
    const lane =
      assignment.align && OFFENSE_SETUP[assignment.align as FormationSlot]
        ? OFFENSE_SETUP[assignment.align as FormationSlot]!.lane
        : assignment.position.startsWith("S")
          ? "C"
          : assignment.position.startsWith("LB")
            ? "C"
            : undefined;
    const yard = los + direction * (isLineDefender ? 1.5 : 6);
    defenseIds.set(assignment.player, id);
    initialYards.set(id, yard);
    players.push({
      id,
      name: assignment.player,
      team: defendingTeam,
      position: assignment.position,
      role: assignment.position,
      unit: "defense",
      lane,
      yard,
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
    const olStart = initialYards.get(olId) ?? los;
    const dlStart = initialYards.get(dlId) ?? los;
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
        lane: OFFENSE_SETUP[matchup.slot]?.lane ?? matchup.slot,
        yard: Number((olStart + direction * olMove).toFixed(2)),
        className: olWon ? "ol-win" : "ol-lost",
      },
      {
        playerId: dlId,
        lane: OFFENSE_SETUP[matchup.slot]?.lane ?? matchup.slot,
        yard: Number((dlStart + direction * dlMove).toFixed(2)),
        className: olWon ? "dl-lost" : "dl-win",
      },
    );
    labels.push({
      id: `${olId}-${dlId}`,
      text: `${olWon ? matchup.offensePlayer : matchup.defensePlayer} wins`,
      lane: OFFENSE_SETUP[matchup.slot]?.lane ?? matchup.slot,
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
            ((initialYards.get(quarterbackId) ?? los) - direction * 0.5).toFixed(
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
      lane: OFFENSE_SETUP[runnerSlot]?.lane,
      yard: Number(
        ((initialYards.get(runnerId) ?? los) + direction).toFixed(2),
      ),
      className: "handoff-target",
    });

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
    ],
  };
}
