import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { DefensiveAssignment, FormationSlot } from "./gameplay/gameEngine";
import { PlayerImage } from "../players/PlayerImage";
import { playerImageUrl, playerJerseyUrl } from "../players/playerImageUrls";

import "./GameField.css";

type FormationPlayer = Record<string, unknown>;
type FormationSlotSetup = { lane: string; yardOffsetFromLos: number };

type PlayerAssignment = {
  type?: string;
  targetId?: string;
  cushionYards?: number;
  shade?: "inside" | "outside" | string;
};
type AnimationPlayer = {
  id: string;
  name: string;
  team: string;
  position?: string;
  role?: string;
  lane?: string;
  x?: number;
  yard?: number;
  headUrl?: string;
  jerseyUrl?: string;
  className?: string;
  unit?: "offense" | "defense";
  alignmentSlot?: FormationSlot;
  assignment?: PlayerAssignment;
};
type PlayerMoveStep = {
  lane?: string;
  x?: number;
  yard?: number;
  className?: string;
  durationMs?: number;
};
type PlayerMove = PlayerMoveStep & {
  playerId: string;
  path?: PlayerMoveStep[];
};
type FootballPhase = PlayerMoveStep & {
  mode?: "hidden" | "carrier" | "free" | string;
  carrierId?: string;
};
type PhaseLabel = PlayerMoveStep & {
  id: string;
  text?: string;
  visible?: boolean;
};
type FieldLine = { id: string; label: string; yard: number; type?: string };
type AnimationPhase = {
  durationMs?: number;
  holdMs?: number;
  caption?: string;
  situationText?: string;
  scoreText?: string;
  camera?: { note?: string };
  lines?: FieldLine[];
  labels?: PhaseLabel[];
  football?: FootballPhase;
  players?: PlayerMove[];
  fieldEffects?: {
    firstDownFlash?: boolean;
    touchdownFlash?: boolean;
    turnoverFlash?: boolean;
  };
};
export type AnimationPlan = {
  meta?: {
    playId?: string;
    playType?: string;
    homeTeam?: string;
    awayTeam?: string;
    direction?: string;
    startYard?: number;
    endYard?: number;
    yardsGained?: number;
  };
  scoreboard?: { scoreText?: string; situationText?: string };
  camera?: { note?: string };
  initialFootballCarrierId?: string;
  lines: FieldLine[];
  players: AnimationPlayer[];
  phases: AnimationPhase[];
};
type RuntimePlayer = Omit<AnimationPlayer, "yard"> & {
  x: number;
  yard: number;
  className: string;
  isRunner: boolean;
  el: HTMLDivElement;
};

const DEFAULT_PHASE_DURATION_MS = 1100;
const PLAY_WIDTH_INSET_PCT = 10;
const PLAY_WIDTH_PCT = 100 - PLAY_WIDTH_INSET_PCT * 2;
const squeezeFieldX = (originalX: number) =>
  PLAY_WIDTH_INSET_PCT + originalX * (PLAY_WIDTH_PCT / 100);
const LANE_ORDER = [
  "LSD",
  "WR1L",
  "WR1",
  "SLTL",
  "SLT2",
  "LFLTL",
  "LFLT",
  "LFLTR",
  "LTL",
  "LT",
  "LGL",
  "LG",
  "CL",
  "C",
  "CR",
  "RG",
  "RGR",
  "RT",
  "RTR",
  "RFLTL",
  "RFLT",
  "RFLTR",
  "SLT1",
  "SLT1R",
  "WR2",
  "WR2L",
  "RSD",
];
const LANES: Record<string, number> = Object.fromEntries(
  LANE_ORDER.map((lane, index) => [
    lane,
    squeezeFieldX((index / (LANE_ORDER.length - 1)) * 100),
  ]),
);
const DEFAULT_LINEUPS_BY_POSITION: Record<
  string,
  { lane: string; yardOffsetFromLos: number }
> = {
  WR1: { lane: "WR1", yardOffsetFromLos: -1 },
  WR2: { lane: "WR2", yardOffsetFromLos: -1 },
  WR3: { lane: "SLT1", yardOffsetFromLos: -1.5 },
  WR4: { lane: "SLT2", yardOffsetFromLos: -1.5 },
  RB1: { lane: "LG", yardOffsetFromLos: -6 },
  RB2: { lane: "RG", yardOffsetFromLos: -6 },
  QB: { lane: "C", yardOffsetFromLos: -3.5 },
  LT: { lane: "LT", yardOffsetFromLos: -1 },
  LG: { lane: "LG", yardOffsetFromLos: -0.75 },
  C: { lane: "C", yardOffsetFromLos: -0.5 },
  RG: { lane: "RG", yardOffsetFromLos: -0.75 },
  RT: { lane: "RT", yardOffsetFromLos: -1 },
  DB1: { lane: "LSD", yardOffsetFromLos: 1.25 },
  DB2: { lane: "RSD", yardOffsetFromLos: 1.25 },
  DB3: { lane: "RFLT", yardOffsetFromLos: 1.25 },
  LB1: { lane: "LGL", yardOffsetFromLos: 5 },
  LB2: { lane: "RGR", yardOffsetFromLos: 5 },
  LB3: { lane: "C", yardOffsetFromLos: 6 },
  DL1: { lane: "LT", yardOffsetFromLos: 1.5 },
  DL2: { lane: "LG", yardOffsetFromLos: 1.5 },
  DL3: { lane: "C", yardOffsetFromLos: 1.5 },
  DL4: { lane: "RG", yardOffsetFromLos: 1.5 },
  DL5: { lane: "RT", yardOffsetFromLos: 1.5 },
  FS: { lane: "C", yardOffsetFromLos: 14 },
  S1: { lane: "LG", yardOffsetFromLos: 13 },
  S2: { lane: "RG", yardOffsetFromLos: 13 },
  TE1: { lane: "RT", yardOffsetFromLos: -1 },
  TE2: { lane: "LT", yardOffsetFromLos: -1 },
};

/**
 * Maps a defensive position label to a default field lane and depth. Numbered
 * labels such as DB4 or DL7 are clamped to the available template positions so
 * generated defenses still receive reasonable coordinates.
 */
const defensiveLineupForPosition = (position?: string) => {
  const normalized = String(position || "").toUpperCase();
  if (DEFAULT_LINEUPS_BY_POSITION[normalized])
    return DEFAULT_LINEUPS_BY_POSITION[normalized];
  const [, group, rawIndex] = normalized.match(/^(DB|LB|DL|S)(\d+)?$/) || [];
  const index = Number(rawIndex || 1);
  if (group === "DB")
    return DEFAULT_LINEUPS_BY_POSITION[`DB${Math.min(Math.max(index, 1), 3)}`];
  if (group === "LB")
    return DEFAULT_LINEUPS_BY_POSITION[`LB${Math.min(Math.max(index, 1), 3)}`];
  if (group === "DL")
    return DEFAULT_LINEUPS_BY_POSITION[`DL${Math.min(Math.max(index, 1), 5)}`];
  if (group === "S")
    return DEFAULT_LINEUPS_BY_POSITION[`S${Math.min(Math.max(index, 1), 2)}`];
  if (normalized === "FS") return DEFAULT_LINEUPS_BY_POSITION.FS;
  return undefined;
};

const FORMATION_SLOT_LINEUP: Record<FormationSlot, FormationSlotSetup> = {
  WR1: DEFAULT_LINEUPS_BY_POSITION.WR1,
  WR2: DEFAULT_LINEUPS_BY_POSITION.WR2,
  WR3: DEFAULT_LINEUPS_BY_POSITION.WR3,
  RB1: DEFAULT_LINEUPS_BY_POSITION.RB1,
  RB2: DEFAULT_LINEUPS_BY_POSITION.RB2,
  QB: DEFAULT_LINEUPS_BY_POSITION.QB,
  LT: DEFAULT_LINEUPS_BY_POSITION.LT,
  LG: DEFAULT_LINEUPS_BY_POSITION.LG,
  C: DEFAULT_LINEUPS_BY_POSITION.C,
  RG: DEFAULT_LINEUPS_BY_POSITION.RG,
  RT: DEFAULT_LINEUPS_BY_POSITION.RT,
  WR4: DEFAULT_LINEUPS_BY_POSITION.WR4,
};
const FORMATION_SLOTS: FormationSlot[] = [
  "WR1",
  "LT",
  "LG",
  "C",
  "RG",
  "RT",
  "WR2",
  "WR3",
  "WR4",
  "QB",
  "RB1",
  "RB2",
];
const REQUIRED_FORMATION_SLOTS = new Set<FormationSlot>([
  "QB",
  "LG",
  "C",
  "RG",
]);
const nameOf = (p?: FormationPlayer) => String(p?.name ?? p?.Name ?? "");
const imgOf = (p?: FormationPlayer) => playerImageUrl(p);

const OFFENSIVE_DEFAULT_LANES: Record<string, string> = Object.fromEntries(
  Object.entries(DEFAULT_LINEUPS_BY_POSITION).map(([position, setup]) => [
    position,
    setup.lane,
  ]),
);
const exampleLaneBasedPlay: AnimationPlan = {
  meta: {
    playId: "EXAMPLE_EMPTY_TEMPLATE",
    playType: "Run",
    homeTeam: "HOME",
    awayTeam: "AWAY",
    direction: "upfield",
    startYard: 55,
    endYard: 55,
    yardsGained: 0,
  },
  scoreboard: {
    scoreText: "HOME 7 | AWAY 3",
    situationText: "Paste a full play JSON and run it.",
  },
  camera: { note: "Manual scroll field" },
  initialFootballCarrierId: "tweety",
  lines: [
    { id: "los", label: "LOS", yard: 55, type: "los" },
    { id: "firstDown", label: "1ST", yard: 61, type: "firstDown" },
  ],
  players: [],
  phases: [],
};
const wait = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));
const resolveMoveX = (move?: PlayerMoveStep) =>
  move?.x !== undefined ? move.x : move?.lane ? LANES[move.lane] : undefined;
// The painted field includes ten-yard end zones beyond both goal lines. Keep
// player offsets in that space instead of pinning every formation player whose
// alignment crosses a goal line directly on top of the goal line.
const yardToYPct = (yard: number) => {
  const fieldYard = Math.max(-10, Math.min(110, yard));
  return 91.8 - (fieldYard / 100) * (91.8 - 8.2);
};
const normalizeYard = (yard: string | number) =>
  Number.isFinite(Number(yard)) ? Number(yard) : 55;
const normalizeDistance = (distance: string | number) =>
  Number.isFinite(Number(distance)) ? Number(distance) : 10;
const clampYard = (yard: number) => Math.max(0, Math.min(100, yard));
const possessionDirection = (possession?: string) =>
  String(possession ?? "Home").toLowerCase() === "away" ? -1 : 1;

/**
 * Converts a team name into a CSS-safe side class. Known home/away names map to
 * stable classes, and arbitrary animation JSON team names are sanitized so they
 * can still be used in token class names.
 */
const sideClassForTeam = (
  team: string,
  homeTeam?: string,
  awayTeam?: string,
) => {
  const normalizedTeam = team.trim().toLowerCase();
  if (homeTeam && normalizedTeam === homeTeam.trim().toLowerCase())
    return "home";
  if (awayTeam && normalizedTeam === awayTeam.trim().toLowerCase())
    return "away";
  if (normalizedTeam === "home" || normalizedTeam === "away")
    return normalizedTeam;
  return normalizedTeam.replace(/[^a-z0-9_-]+/g, "-") || "home";
};
/**
 * Builds a deterministic DOM-safe player id from unit, slot/position, and name.
 * Animation phases reference these ids, so the sanitization rules must stay
 * consistent between setup generation and movement application.
 */
const animationPlayerId = (
  prefix: string,
  slotOrPosition: string,
  playerName: string,
) =>
  `${prefix}-${slotOrPosition}-${playerName}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
/**
 * Infers whether a token should use offense or defense styling. Explicit unit
 * data wins, otherwise defensive position markers and generated def-* ids are
 * treated as defense with offense as the default fallback.
 */
const unitClassForPlayer = (
  player: Pick<AnimationPlayer, "unit" | "id" | "role" | "position">,
) => {
  if (player.unit) return player.unit;
  const marker = String(
    player.role || player.position || player.id,
  ).toUpperCase();
  return /^(DB|LB|DL|FS|S\d*)/.test(marker) ||
    String(player.id).startsWith("def-")
    ? "defense"
    : "offense";
};

/**
 * Visual football field and animation runner. It can render formation-editing
 * slots, build a static setup preview from selected personnel, or execute a
 * PlayAnimationPlan by imperatively moving DOM tokens and the football.
 */
export default function GameField({
  formationMode = false,
  formation = {},
  defense = [],
  players = [],
  selectedFormationPlayer = "",
  onFormationSlotClick,
  onPlayerSubstitute,
  onPlayerChangePosition,
  ballOn = 55,
  distance = 10,
  possession = "Home",
  homeLogo,
  homeTeam,
  homeTeamName,
  homeTeamLocation,
  homeTeamPrimaryColor,
  awayTeam,
  onSetupTransitionChange,
  animationRequest,
  onAnimationComplete,
  children,
}: {
  formationMode?: boolean;
  formation?: Partial<Record<FormationSlot, string>>;
  defense?: DefensiveAssignment[];
  players?: FormationPlayer[];
  selectedFormationPlayer?: string;
  onFormationSlotClick?: (slot: FormationSlot) => void;
  onPlayerSubstitute?: (playerName: string) => void;
  onPlayerChangePosition?: (playerName: string) => void;
  ballOn?: string | number;
  distance?: string | number;
  possession?: string;
  homeLogo?: string;
  homeTeam?: string;
  homeTeamName?: string;
  homeTeamLocation?: string;
  homeTeamPrimaryColor?: string;
  awayTeam?: string;
  onSetupTransitionChange?: (active: boolean) => void;
  animationRequest?: { id: number; plan: unknown } | null;
  onAnimationComplete?: (id: number) => void;
  children?: ReactNode;
}) {
  const fieldViewportRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const footballRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const situationTextRef = useRef<HTMLDivElement>(null);
  const scoreMainRef = useRef<HTMLDivElement>(null);
  const cameraNoteRef = useRef<HTMLDivElement>(null);
  const jsonInputRef = useRef<HTMLTextAreaElement>(null);
  const errorBoxRef = useRef<HTMLDivElement>(null);
  const currentPlanRef = useRef<AnimationPlan | null>(null);
  const playersRef = useRef<Record<string, RuntimePlayer>>({});
  const labelsRef = useRef<Record<string, HTMLDivElement>>({});
  const footballCarrierIdRef = useRef<string | null>(null);
  const isRunningRef = useRef(false);
  const lastAnimationRequestRef = useRef<number | null>(null);
  const isSetupTransitionRef = useRef(false);
  const footballFollowRafRef = useRef<number | null>(null);
  const activePhaseDurationMsRef = useRef(DEFAULT_PHASE_DURATION_MS);
  const teamEndStyle = homeTeamPrimaryColor
    ? { background: homeTeamPrimaryColor }
    : undefined;
  const teamEndTopText = homeTeamName || homeTeam || "HOME";
  const teamEndBottomText = homeTeamLocation || homeTeam || "HOME";

  const [selectedPlayerMenu, setSelectedPlayerMenu] = useState<{
    player: AnimationPlayer;
    leftPct: number;
    topPct: number;
  } | null>(null);
  const findFormationPlayer = useCallback(
    (playerName?: string) =>
      players.find((player) => nameOf(player) === playerName),
    [players],
  );

  const formationLosYard = normalizeYard(ballOn);
  const offenseDirection = possessionDirection(possession);
  const formationDistance = Math.max(0, normalizeDistance(distance));
  const formationFirstDownYard = clampYard(
    formationLosYard + offenseDirection * formationDistance,
  );

  const buildFormationSetupPlan = useCallback((): AnimationPlan => {
    const losYard = formationLosYard;
    const offensePlayers = FORMATION_SLOTS.flatMap((slot) => {
      const playerName = formation[slot];
      if (!playerName) return [];
      const player = findFormationPlayer(playerName);
      return [
        {
          id: animationPlayerId("off", slot, playerName),
          name: playerName,
          team: sideClassForTeam(
            String(player?.team ?? player?.Team ?? "home"),
            homeTeam,
            awayTeam,
          ),
          position: slot,
          role: slot,
          unit: "offense" as const,
          headUrl: imgOf(player),
          jerseyUrl: playerJerseyUrl(player),
        },
      ];
    });
    const defensePlayers = defense.map((assignment) => {
      const player = findFormationPlayer(assignment.player);
      return {
        id: animationPlayerId("def", assignment.position, assignment.player),
        name: assignment.player,
        team: sideClassForTeam(
          String(player?.team ?? player?.Team ?? "away"),
          homeTeam,
          awayTeam,
        ),
        position: assignment.position,
        role: assignment.position,
        unit: "defense" as const,
        alignmentSlot: assignment.align as FormationSlot | undefined,
        headUrl: imgOf(player),
        jerseyUrl: playerJerseyUrl(player),
      };
    });

    return {
      meta: {
        playId: "FORMATION_SETUP",
        playType: "Setup",
        direction: offenseDirection === 1 ? "upfield" : "downfield",
        startYard: losYard,
        endYard: losYard,
        yardsGained: 0,
      },
      scoreboard: {
        scoreText: scoreMainRef.current?.textContent || "Formation set",
        situationText:
          "Formation saved. Players are ready for the upcoming play.",
      },
      camera: { note: "Upcoming play setup" },
      initialFootballCarrierId:
        offensePlayers.find((player) => player.position === "C")?.id ||
        offensePlayers.find((player) => player.position === "QB")?.id ||
        offensePlayers[0]?.id,
      lines: [
        { id: "los", label: "LOS", yard: losYard, type: "los" },
        {
          id: "firstDown",
          label: "1ST",
          yard: formationFirstDownYard,
          type: "firstDown",
        },
      ],
      players: [...offensePlayers, ...defensePlayers],
      phases: [],
    };
  }, [
    awayTeam,
    defense,
    findFormationPlayer,
    formation,
    formationFirstDownYard,
    formationLosYard,
    homeTeam,
    offenseDirection,
  ]);

  const showError = useCallback((message: string) => {
    if (errorBoxRef.current) {
      errorBoxRef.current.style.display = "block";
      errorBoxRef.current.textContent = message;
    }
  }, []);
  const clearError = useCallback(() => {
    if (errorBoxRef.current) {
      errorBoxRef.current.style.display = "none";
      errorBoxRef.current.textContent = "";
    }
  }, []);
  const getDefaultLaneForPlayer = useCallback(
    (player: AnimationPlayer, allPlayers: AnimationPlayer[]) => {
      if (player.lane && LANES[player.lane] !== undefined) return player.lane;
      if (
        player.alignmentSlot &&
        FORMATION_SLOT_LINEUP[player.alignmentSlot]?.lane
      )
        return FORMATION_SLOT_LINEUP[player.alignmentSlot].lane;
      if (player.role && OFFENSIVE_DEFAULT_LANES[player.role])
        return OFFENSIVE_DEFAULT_LANES[player.role];
      if (player.position && LANES[player.position] !== undefined)
        return player.position;
      if (player.position === "QB") return "C";
      if (player.position === "RB" || player.position === "WR") {
        const teammates = allPlayers
          .filter(
            (candidate) =>
              candidate.team === player.team &&
              candidate.position === player.position,
          )
          .sort(
            (a, b) =>
              String(a.role || "").localeCompare(String(b.role || "")) ||
              String(a.id).localeCompare(String(b.id)),
          );
        const index = teammates.findIndex(
          (candidate) => candidate.id === player.id,
        );
        if (player.position === "RB")
          return index === 0 ? "LG" : index === 1 ? "RG" : "C";
        return index === 0
          ? "WR1"
          : index === 1
            ? "WR2"
            : index === 2
              ? "SLT1"
              : "SLT2";
      }
      if (player.position === "TE")
        return player.role && OFFENSIVE_DEFAULT_LANES[player.role]
          ? OFFENSIVE_DEFAULT_LANES[player.role]
          : "RT";
      return player.lane || "C";
    },
    [],
  );
  const normalizePlayerLane = useCallback(
    (
      player: AnimationPlayer,
      allPlayers: AnimationPlayer[] = [],
    ): AnimationPlayer & { x: number; yard: number } => {
      const yard = player.yard ?? 50;
      if (player.x !== undefined) return { ...player, x: player.x, yard };
      const lane = player.lane || getDefaultLaneForPlayer(player, allPlayers);
      return { ...player, lane, x: LANES[lane] ?? 50, yard };
    },
    [getDefaultLaneForPlayer],
  );

  const stopFootballFollow = useCallback(() => {
    if (footballFollowRafRef.current)
      cancelAnimationFrame(footballFollowRafRef.current);
    footballFollowRafRef.current = null;
  }, []);
  const syncFootballToCarrierDom = useCallback(() => {
    const carrierId = footballCarrierIdRef.current;
    const field = fieldRef.current;
    const footballEl = footballRef.current;
    if (!carrierId || !field || !footballEl) return;
    const player = playersRef.current[carrierId];
    if (!player?.el) return;
    const fieldRect = field.getBoundingClientRect();
    const playerRect = player.el.getBoundingClientRect();
    footballEl.style.opacity = "1";
    footballEl.style.transition = "opacity 120ms ease, transform 300ms ease";
    footballEl.style.left = `${((playerRect.left - fieldRect.left + playerRect.width / 2 + 13) / fieldRect.width) * 100}%`;
    footballEl.style.top = `${((playerRect.top - fieldRect.top + playerRect.height / 2 - 3) / fieldRect.height) * 100}%`;
  }, []);
  const scrollViewportToFootball = useCallback(() => {
    const fieldViewport = fieldViewportRef.current;
    const field = fieldRef.current;
    const footballEl = footballRef.current;
    if (!fieldViewport || !field || !footballEl) return;
    const footballTopPercent = parseFloat(footballEl.style.top);
    if (Number.isNaN(footballTopPercent)) return;
    fieldViewport.scrollTop = Math.max(
      0,
      Math.min(
        field.scrollHeight - fieldViewport.clientHeight,
        field.offsetHeight * (footballTopPercent / 100) -
          fieldViewport.clientHeight / 2,
      ),
    );
  }, []);
  const startFootballCarrierFollow = useCallback(() => {
    stopFootballFollow();
    if (!footballCarrierIdRef.current) return;
    const tick = () => {
      syncFootballToCarrierDom();
      scrollViewportToFootball();
      footballFollowRafRef.current = footballCarrierIdRef.current
        ? requestAnimationFrame(tick)
        : null;
    };
    footballFollowRafRef.current = requestAnimationFrame(tick);
  }, [scrollViewportToFootball, stopFootballFollow, syncFootballToCarrierDom]);
  const setFootballTransition = (durationMs: number) => {
    if (footballRef.current)
      footballRef.current.style.transition = `left ${durationMs}ms linear, top ${durationMs}ms linear, opacity 200ms ease, transform 300ms ease`;
  };
  const updateLinePositions = useCallback(() => {
    ["los", "firstDown", "end"].forEach((id) => {
      const lineEl = document.getElementById(`${id}Line`);
      const labelEl = document.getElementById(`${id}Label`);
      if (lineEl) lineEl.style.opacity = "0";
      if (labelEl) labelEl.style.opacity = "0";
    });
    (currentPlanRef.current?.lines || []).forEach((line) => {
      const lineEl = document.getElementById(`${line.id}Line`);
      const labelEl = document.getElementById(`${line.id}Label`);
      if (!lineEl || !labelEl) return;
      const y = yardToYPct(line.yard);
      lineEl.style.top = `${y}%`;
      labelEl.style.top = `${y}%`;
      labelEl.textContent = line.label;
      lineEl.style.opacity = "1";
      labelEl.style.opacity = "1";
    });
  }, []);
  const updateScreenPositionsWithoutFootball = useCallback(() => {
    Object.values(playersRef.current).forEach((player) => {
      player.el.style.top = `${yardToYPct(player.yard)}%`;
    });
    Object.values(labelsRef.current).forEach((labelEl) => {
      const yard = Number(labelEl.dataset.yard);
      if (!Number.isNaN(yard)) labelEl.style.top = `${yardToYPct(yard)}%`;
    });
    updateLinePositions();
    document
      .querySelectorAll<HTMLElement>(".hash, .yard-number")
      .forEach((el) => {
        const yard = Number(el.dataset.yard);
        el.style.top = `${yardToYPct(yard)}%`;
        el.style.opacity = "1";
      });
  }, [updateLinePositions]);
  const applyPlayerMove = useCallback(
    async (move: PlayerMove) => {
      const player = playersRef.current[move.playerId];
      if (!player) {
        console.warn(`Unknown playerId in phase: ${move.playerId}`);
        return;
      }
      const applyStep = async (step: PlayerMoveStep, durationMs: number) => {
        player.el.style.transition = `left ${durationMs}ms linear, top ${durationMs}ms linear, transform 280ms ease, filter 280ms ease, opacity 280ms ease`;
        if (step.className !== undefined) player.className = step.className;
        const resolvedX = resolveMoveX(step);
        if (resolvedX !== undefined) player.x = resolvedX;
        if (step.lane !== undefined) player.lane = step.lane;
        if (step.yard !== undefined) player.yard = step.yard;
        player.el.style.left = `${player.x}%`;
        player.el.style.top = `${yardToYPct(player.yard)}%`;
        player.el.className = `token ${player.team.toLowerCase()} ${unitClassForPlayer(player)} ${player.isRunner ? "runner" : ""} ${player.className || ""}`;
        updateScreenPositionsWithoutFootball();
        await wait(durationMs);
      };
      if (Array.isArray(move.path) && move.path.length > 0) {
        const phaseDuration = activePhaseDurationMsRef.current;
        const pathLength = move.path.length;
        const totalStepDuration = move.path.reduce(
          (sum, step) => sum + (step.durationMs || phaseDuration / pathLength),
          0,
        );
        const scale =
          totalStepDuration > 0 ? phaseDuration / totalStepDuration : 1;
        for (const step of move.path)
          await applyStep(
            step,
            Math.round((step.durationMs || phaseDuration / pathLength) * scale),
          );
      } else
        await applyStep(
          move,
          move.durationMs || activePhaseDurationMsRef.current,
        );
      player.el.style.transition = "";
    },
    [updateScreenPositionsWithoutFootball],
  );
  const applyFootballPhase = useCallback(
    (football?: FootballPhase) => {
      const footballEl = footballRef.current;
      if (!footballEl) return;
      if (!football) {
        if (footballCarrierIdRef.current) startFootballCarrierFollow();
        return;
      }
      if (football.mode === "hidden") {
        stopFootballFollow();
        footballCarrierIdRef.current = null;
        footballEl.style.opacity = "0";
        return;
      }
      if (football.mode === "carrier") {
        footballCarrierIdRef.current = football.carrierId || null;
        if (football.carrierId && !playersRef.current[football.carrierId])
          console.warn(`Unknown football carrierId: ${football.carrierId}`);
        syncFootballToCarrierDom();
        startFootballCarrierFollow();
        return;
      }
      if (football.mode === "free") {
        stopFootballFollow();
        footballCarrierIdRef.current = null;
        setFootballTransition(football.durationMs ?? 250);
        footballEl.style.opacity = "1";
        footballEl.style.left = `${resolveMoveX(football) ?? football.x ?? 50}%`;
        footballEl.style.top = `${yardToYPct(football.yard ?? 50)}%`;
      }
    },
    [startFootballCarrierFollow, stopFootballFollow, syncFootballToCarrierDom],
  );
  const resetAnimationScene = useCallback(
    (plan: AnimationPlan) => {
      const field = fieldRef.current;
      if (!field) return;
      currentPlanRef.current = plan;
      field
        .querySelectorAll(".token, .battle-label, .hash, .yard-number")
        .forEach((el) => el.remove());
      stopFootballFollow();
      playersRef.current = {};
      labelsRef.current = {};
      setSelectedPlayerMenu(null);
      footballCarrierIdRef.current = null;
      if (scoreMainRef.current)
        scoreMainRef.current.textContent =
          plan.scoreboard?.scoreText || "HOME 7 | AWAY 3";
      if (situationTextRef.current)
        situationTextRef.current.textContent =
          plan.scoreboard?.situationText || "";
      if (captionRef.current)
        captionRef.current.textContent = "Animation ready.";
      if (cameraNoteRef.current)
        cameraNoteRef.current.textContent =
          plan.camera?.note || "Manual scroll field";
      if (!Array.isArray(plan.players))
        throw new Error("Invalid animation plan: players must be an array.");
      for (let yard = 1; yard < 100; yard++)
        [42, 58].forEach((x) => {
          const hash = document.createElement("div");
          hash.className = "hash";
          hash.dataset.yard = String(yard);
          hash.style.left = `${x}%`;
          hash.style.top = `${yardToYPct(yard)}%`;
          field.appendChild(hash);
        });
      for (let yard = 10; yard <= 90; yard += 5) {
        const el = document.createElement("div");
        el.className = "yard-number";
        el.dataset.yard = String(yard);
        el.textContent = yard >= 50 ? `AWAY ${100 - yard}` : `HOME ${yard}`;
        el.style.top = `${yardToYPct(yard)}%`;
        field.appendChild(el);
      }
      const homeTeam = plan.meta?.homeTeam;
      const homePlayers = plan.players.filter((player) =>
        homeTeam
          ? player.team === homeTeam
          : player.team !== plan.meta?.awayTeam,
      );
      if (
        !homePlayers.some(
          (player) =>
            player.position === "C" ||
            player.role === "C" ||
            (player.lane === "C" && player.position !== "QB"),
        )
      )
        console.warn(
          "No home Center found. Add a home player with position: 'C'.",
        );
      const losYard =
        plan.lines.find((line) => line.id === "los")?.yard ??
        plan.meta?.startYard ??
        50;
      const normalizedPlayers = plan.players.map((player) => {
        const lineup =
          player.unit === "defense"
            ? defensiveLineupForPosition(player.role || player.position)
            : player.role
              ? DEFAULT_LINEUPS_BY_POSITION[player.role]
              : player.position
                ? DEFAULT_LINEUPS_BY_POSITION[player.position]
                : undefined;
        return normalizePlayerLane(
          {
            ...player,
            yard:
              player.yard ??
              (lineup
                ? losYard + offenseDirection * lineup.yardOffsetFromLos
                : losYard),
          },
          plan.players,
        );
      });
      const byId = Object.fromEntries(
        normalizedPlayers.map((player) => [player.id, player]),
      );
      const runnerIds = new Set(
        plan.phases.flatMap((phase) =>
          (phase.players || []).flatMap((move) => {
            const steps = [move, ...(move.path || [])];
            return steps.some((step) =>
              /(?:^|\s)(?:active-runner|handoff-target|ball-carrier)(?:\s|$)/.test(
                step.className || "",
              ),
            )
              ? [move.playerId]
              : [];
          }),
        ),
      );
      plan.players = normalizedPlayers.map((player) => {
        if (player.assignment?.type !== "manCoverage") return player;
        const target = player.assignment.targetId
          ? byId[player.assignment.targetId]
          : undefined;
        if (!target) {
          if (player.assignment.targetId)
            console.warn(
              `Coverage target not found: ${player.assignment.targetId}`,
            );
          return player;
        }
        const index = LANE_ORDER.indexOf(target.lane || "");
        const lane =
          player.assignment.shade === "inside" && index !== -1
            ? LANE_ORDER[index < 4 ? index + 1 : index > 4 ? index - 1 : index]
            : player.assignment.shade === "outside" && index !== -1
              ? LANE_ORDER[
                  index < 4
                    ? Math.max(0, index - 1)
                    : index > 4
                      ? Math.min(LANE_ORDER.length - 1, index + 1)
                      : index
                ]
              : target.lane;
        return {
          ...player,
          lane,
          x: lane ? (LANES[lane] ?? target.x) : target.x,
          yard:
            losYard +
            offenseDirection * (player.assignment.cushionYards ?? 1.9),
        };
      });
      plan.players.forEach((rawPlayer) => {
        const player = normalizePlayerLane(rawPlayer, plan.players);
        const el = document.createElement("div");
        const isRunner = runnerIds.has(player.id);
        el.className = `token ${player.team.toLowerCase()} ${unitClassForPlayer(player)} ${isRunner ? "runner" : ""} reset`;
        el.id = `player-${player.id}`;
        el.style.left = `${player.x}%`;
        el.style.top = `${yardToYPct(player.yard)}%`;
        const portrait = document.createElement("span");
        portrait.className = "player-image-layers";
        if (player.jerseyUrl) {
          const jersey = document.createElement("img");
          jersey.className = "player-image-layer player-image-layer--jersey";
          jersey.src = player.jerseyUrl;
          jersey.alt = "";
          portrait.appendChild(jersey);
        }
        const img = document.createElement("img");
        img.className = "player-image-layer player-image-layer--player";
        img.src = player.headUrl || "";
        img.alt = player.name;
        portrait.appendChild(img);
        const label = document.createElement("div");
        label.className = "name";
        label.textContent = player.name;
        el.appendChild(portrait);
        el.appendChild(label);
        el.tabIndex = 0;
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", `Open ${player.name} player actions`);
        const openPlayerMenu = (event: MouseEvent | KeyboardEvent) => {
          event.stopPropagation();
          const target = event.currentTarget as HTMLDivElement;
          const leftPct = parseFloat(target.style.left) || player.x;
          const topPct =
            parseFloat(target.style.top) || yardToYPct(player.yard);
          setSelectedPlayerMenu({ player, leftPct, topPct });
        };
        el.addEventListener("click", openPlayerMenu);
        el.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") openPlayerMenu(event);
        });
        field.appendChild(el);
        playersRef.current[player.id] = {
          ...player,
          className: "reset",
          isRunner,
          el,
        };
      });
      footballCarrierIdRef.current =
        plan.initialFootballCarrierId ||
        plan.players.find((player) => player.position === "QB")?.id ||
        plan.players[0]?.id ||
        null;
      setFootballTransition(0);
      updateScreenPositionsWithoutFootball();
      if (footballCarrierIdRef.current) {
        syncFootballToCarrierDom();
        scrollViewportToFootball();
        startFootballCarrierFollow();
      } else if (footballRef.current) footballRef.current.style.opacity = "0";
      const startYard = plan.meta?.startYard ?? losYard;
      if (fieldViewportRef.current)
        fieldViewportRef.current.scrollTop = Math.max(
          0,
          field.offsetHeight * (yardToYPct(startYard) / 100) -
            fieldViewportRef.current.clientHeight / 2,
        );
      field.classList.remove(
        "first-down-flash",
        "touchdown-flash",
        "turnover-flash",
      );
    },
    [
      normalizePlayerLane,
      offenseDirection,
      scrollViewportToFootball,
      startFootballCarrierFollow,
      stopFootballFollow,
      syncFootballToCarrierDom,
      updateScreenPositionsWithoutFootball,
    ],
  );
  const validatePlan = (plan: unknown): AnimationPlan => {
    if (!plan || typeof plan !== "object")
      throw new Error("JSON must be an object.");
    const candidate = plan as Partial<AnimationPlan>;
    if (!Array.isArray(candidate.players))
      throw new Error("Plan must include players array.");
    if (!Array.isArray(candidate.phases))
      throw new Error("Plan must include phases array.");
    return {
      ...candidate,
      lines: Array.isArray(candidate.lines) ? candidate.lines : [],
      camera: candidate.camera || { note: "Manual scroll field" },
      scoreboard: candidate.scoreboard || {
        scoreText: "HOME 7 | AWAY 3",
        situationText: "",
      },
    } as AnimationPlan;
  };
  const runAnimationPlan = useCallback(
    async (plan: AnimationPlan) => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;
      clearError();
      try {
        resetAnimationScene(plan);
        for (const phase of plan.phases) {
          activePhaseDurationMsRef.current =
            phase.durationMs || DEFAULT_PHASE_DURATION_MS;
          if (phase.caption && captionRef.current)
            captionRef.current.textContent = phase.caption;
          if (phase.situationText && situationTextRef.current)
            situationTextRef.current.textContent = phase.situationText;
          if (phase.scoreText && scoreMainRef.current)
            scoreMainRef.current.textContent = phase.scoreText;
          if (phase.camera?.note && cameraNoteRef.current)
            cameraNoteRef.current.textContent = phase.camera.note;
          if (phase.lines) {
            currentPlanRef.current!.lines = phase.lines;
            updateLinePositions();
          }
          phase.labels?.forEach((labelData) => {
            const field = fieldRef.current;
            if (!field) return;
            let el = labelsRef.current[labelData.id];
            if (!el) {
              el = document.createElement("div");
              el.className = "battle-label";
              el.id = `battle-${labelData.id}`;
              field.appendChild(el);
              labelsRef.current[labelData.id] = el;
            }
            el.textContent = labelData.text || "";
            el.style.left = `${resolveMoveX(labelData) ?? 50}%`;
            el.style.top = `${yardToYPct(labelData.yard ?? 50)}%`;
            el.dataset.yard = String(labelData.yard ?? 50);
            el.className = labelData.visible
              ? `battle-label show ${labelData.className || "neutral"}`
              : "battle-label";
          });
          applyFootballPhase(phase.football);
          if (phase.players?.length)
            await Promise.all(phase.players.map(applyPlayerMove));
          else await wait(activePhaseDurationMsRef.current);
          if (phase.fieldEffects) {
            const field = fieldRef.current;
            if (field) {
              const className = phase.fieldEffects.firstDownFlash
                ? "first-down-flash"
                : phase.fieldEffects.touchdownFlash
                  ? "touchdown-flash"
                  : phase.fieldEffects.turnoverFlash
                    ? "turnover-flash"
                    : "";
              if (className) {
                field.classList.remove(
                  "first-down-flash",
                  "touchdown-flash",
                  "turnover-flash",
                );
                void field.offsetWidth;
                field.classList.add(className);
              }
            }
          }
          updateScreenPositionsWithoutFootball();
          await wait(phase.holdMs ?? 0);
        }
      } catch (error) {
        console.error(error);
        showError(error instanceof Error ? error.message : String(error));
      } finally {
        stopFootballFollow();
        activePhaseDurationMsRef.current = DEFAULT_PHASE_DURATION_MS;
        isRunningRef.current = false;
      }
    },
    [
      applyFootballPhase,
      applyPlayerMove,
      clearError,
      resetAnimationScene,
      showError,
      stopFootballFollow,
      updateLinePositions,
      updateScreenPositionsWithoutFootball,
    ],
  );
  useEffect(() => {
    if (!animationRequest) return;
    if (lastAnimationRequestRef.current === animationRequest.id) return;
    lastAnimationRequestRef.current = animationRequest.id;

    const executeRequestedAnimation = async () => {
      try {
        await runAnimationPlan(validatePlan(animationRequest.plan));
      } catch (error) {
        console.error(error);
        showError(error instanceof Error ? error.message : String(error));
      } finally {
        onAnimationComplete?.(animationRequest.id);
      }
    };
    void executeRequestedAnimation();
  }, [animationRequest, onAnimationComplete, runAnimationPlan, showError]);
  const loadExampleJson = useCallback(() => {
    if (jsonInputRef.current)
      jsonInputRef.current.value = JSON.stringify(
        exampleLaneBasedPlay,
        null,
        2,
      );
    clearError();
    if (captionRef.current)
      captionRef.current.textContent =
        "Example JSON loaded. Click “Run JSON Play”.";
  }, [clearError]);
  const runJsonFromBox = () => {
    clearError();
    try {
      const raw = jsonInputRef.current?.value.trim() || "";
      if (!raw) throw new Error("Paste a PlayAnimationPlan JSON first.");
      void runAnimationPlan(validatePlan(JSON.parse(raw)));
    } catch (error) {
      console.error(error);
      showError(error instanceof Error ? error.message : String(error));
    }
  };
  const resetCurrentPlan = () => {
    if (!currentPlanRef.current) {
      if (captionRef.current)
        captionRef.current.textContent = "No current plan loaded.";
      return;
    }
    resetAnimationScene(currentPlanRef.current);
  };
  useEffect(() => {
    if (!formationMode) return;
    stopFootballFollow();
    footballCarrierIdRef.current = null;
    playersRef.current = {};
    labelsRef.current = {};
    if (footballRef.current) footballRef.current.style.opacity = "0";
    fieldRef.current
      ?.querySelectorAll(".token, .battle-label, .hash, .yard-number")
      .forEach((el) => el.remove());
  }, [formationMode, stopFootballFollow]);

  useEffect(() => {
    if (formationMode) return;
    if (!Object.values(formation).some(Boolean)) return;
    const nextPlan = buildFormationSetupPlan();
    const currentPlan = currentPlanRef.current;
    if (!currentPlan || !Object.keys(playersRef.current).length) {
      resetAnimationScene(nextPlan);
      return;
    }

    const currentLos = currentPlan.lines.find(
      (line) => line.id === "los",
    )?.yard;
    const nextLos = nextPlan.lines.find((line) => line.id === "los")?.yard;
    const currentFirstDown = currentPlan.lines.find(
      (line) => line.id === "firstDown",
    )?.yard;
    const nextFirstDown = nextPlan.lines.find(
      (line) => line.id === "firstDown",
    )?.yard;
    if (currentLos === nextLos && currentFirstDown === nextFirstDown) {
      resetAnimationScene(nextPlan);
      return;
    }

    let cancelled = false;
    const runSetupTransition = async () => {
      isSetupTransitionRef.current = true;
      onSetupTransitionChange?.(true);
      try {
        currentPlanRef.current = nextPlan;
        Object.values(playersRef.current).forEach((player) => {
          player.className = "reset";
          player.el.className = `token ${player.team.toLowerCase()} ${unitClassForPlayer(player)} reset`;
        });
        fieldRef.current
          ?.querySelectorAll(".battle-label")
          .forEach((label) => label.remove());
        labelsRef.current = {};
        fieldRef.current?.classList.remove(
          "first-down-flash",
          "touchdown-flash",
          "turnover-flash",
        );
        updateLinePositions();
        await wait(350);
        if (cancelled) return;
        activePhaseDurationMsRef.current = 700;
        const moves = nextPlan.players.flatMap((targetPlayer) => {
          if (!playersRef.current[targetPlayer.id]) return [];
          const lineup =
            targetPlayer.unit === "defense"
              ? defensiveLineupForPosition(
                  targetPlayer.role || targetPlayer.position,
                )
              : targetPlayer.role
                ? DEFAULT_LINEUPS_BY_POSITION[targetPlayer.role]
                : targetPlayer.position
                  ? DEFAULT_LINEUPS_BY_POSITION[targetPlayer.position]
                  : undefined;
          const normalized = normalizePlayerLane(
            {
              ...targetPlayer,
              yard:
                targetPlayer.yard ??
                (lineup && nextLos !== undefined
                  ? nextLos + offenseDirection * lineup.yardOffsetFromLos
                  : nextLos),
            },
            nextPlan.players,
          );
          return [
            applyPlayerMove({
              playerId: targetPlayer.id,
              lane: normalized.lane,
              x: normalized.x,
              yard: normalized.yard,
              durationMs: 700,
            }),
          ];
        });
        await Promise.all(moves);
        if (!cancelled) {
          syncFootballToCarrierDom();
          scrollViewportToFootball();
        }
      } finally {
        if (!cancelled) {
          activePhaseDurationMsRef.current = DEFAULT_PHASE_DURATION_MS;
          isSetupTransitionRef.current = false;
          onSetupTransitionChange?.(false);
        }
      }
    };
    void runSetupTransition();
    return () => {
      cancelled = true;
      isSetupTransitionRef.current = false;
      onSetupTransitionChange?.(false);
    };
  }, [
    applyPlayerMove,
    buildFormationSetupPlan,
    formation,
    formationMode,
    normalizePlayerLane,
    offenseDirection,
    onSetupTransitionChange,
    resetAnimationScene,
    scrollViewportToFootball,
    syncFootballToCarrierDom,
    updateLinePositions,
  ]);

  useEffect(() => {
    loadExampleJson();
    return stopFootballFollow;
  }, [loadExampleJson, stopFootballFollow]);

  return (
    <div className="game-shell">
      <div className="field-viewport" id="fieldViewport" ref={fieldViewportRef}>
        {children && <div className="field-controls-overlay">{children}</div>}
        <div
          className="field-wrap"
          id="field"
          ref={fieldRef}
          onClick={() => setSelectedPlayerMenu(null)}
        >
          <div className="field-title">Dynamic Football Animation View</div>
          <div
            className="team-end team-end--top"
            id="awayEnd"
            style={teamEndStyle}
          >
            {teamEndTopText}
          </div>
          <div
            className="team-end team-end--bottom"
            id="homeEnd"
            style={teamEndStyle}
          >
            {teamEndBottomText}
          </div>
          {homeLogo && (
            <img
              className="field-midfield-logo"
              src={homeLogo}
              alt="Home team logo at midfield"
            />
          )}
          <div className="field-line los-line" id="losLine" />
          <div className="field-line first-down-line" id="firstDownLine" />
          <div className="field-line end-line" id="endLine" />
          <div className="line-label" id="losLabel">
            LOS
          </div>
          <div className="line-label" id="firstDownLabel">
            1ST
          </div>
          <div className="line-label" id="endLabel">
            END
          </div>
          <div className="football" id="football" ref={footballRef} />
          {formationMode &&
            FORMATION_SLOTS.map((slot) => {
              const lineup = FORMATION_SLOT_LINEUP[slot];
              const playerName = formation[slot];
              const player = findFormationPlayer(playerName);
              const playerImage = imgOf(player);
              return (
                <button
                  key={slot}
                  type="button"
                  className={`field-formation-slot ${slot.startsWith("WR") ? "wr" : slot.startsWith("RB") ? "rb" : slot === "QB" ? "qb" : "teol"} ${REQUIRED_FORMATION_SLOTS.has(slot) ? "required" : ""} ${playerName ? "filled" : "open"} ${selectedFormationPlayer ? "targetable" : ""} ${playerName && selectedFormationPlayer === playerName ? "selected" : ""}`}
                  style={{
                    left: `${LANES[lineup.lane] ?? 50}%`,
                    top: `${yardToYPct(formationLosYard + offenseDirection * lineup.yardOffsetFromLos)}%`,
                  }}
                  aria-label={
                    playerName
                      ? `${slot}: ${playerName}`
                      : selectedFormationPlayer
                        ? `Place ${selectedFormationPlayer} at ${slot}`
                        : `${slot} open`
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onFormationSlotClick?.(slot);
                  }}
                >
                  {playerName ? (
                    playerImage ? (
                      <PlayerImage player={player} alt={playerName} />
                    ) : (
                      <span className="field-formation-avatar">👤</span>
                    )
                  ) : (
                    <span className="field-formation-label">{slot}</span>
                  )}
                  {playerName && (
                    <span className="field-formation-name">{playerName}</span>
                  )}
                </button>
              );
            })}

          {formationMode &&
            defense.map((assignment) => {
              const lineup = assignment.align
                ? FORMATION_SLOT_LINEUP[assignment.align as FormationSlot]
                : defensiveLineupForPosition(assignment.position);
              if (!lineup) return null;
              const player = findFormationPlayer(assignment.player);
              const playerImage = imgOf(player);
              return (
                <div
                  key={`${assignment.position}-${assignment.player}`}
                  className="field-formation-slot defense"
                  style={{
                    left: `${LANES[lineup.lane] ?? 50}%`,
                    top: `${yardToYPct(formationLosYard + offenseDirection * lineup.yardOffsetFromLos)}%`,
                  }}
                  aria-hidden="true"
                >
                  {playerImage ? (
                    <PlayerImage player={player} />
                  ) : (
                    <span className="field-formation-avatar">👤</span>
                  )}
                  <span className="field-formation-name">
                    {assignment.player}
                  </span>
                </div>
              );
            })}

          {selectedPlayerMenu && (
            <div
              className="player-action-menu"
              style={{
                left: `${selectedPlayerMenu.leftPct}%`,
                top: `${selectedPlayerMenu.topPct}%`,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="player-action-menu-title">
                {selectedPlayerMenu.player.name}
              </div>
              <button
                type="button"
                onClick={() => {
                  onPlayerSubstitute?.(selectedPlayerMenu.player.name);
                  setSelectedPlayerMenu(null);
                }}
              >
                Substitute
              </button>
              <button
                type="button"
                onClick={() => {
                  onPlayerChangePosition?.(selectedPlayerMenu.player.name);
                  setSelectedPlayerMenu(null);
                }}
              >
                Change Position
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="caption" id="caption" ref={captionRef}>
        Paste a play animation JSON below, or load the example.
      </div>
      <div className="controls">
        <button className="jbutton" type="button" onClick={loadExampleJson}>
          Load Example JSON
        </button>
        <button className="jbutton" type="button" onClick={runJsonFromBox}>
          Run JSON Play
        </button>
        <button className="jbutton" type="button" onClick={resetCurrentPlan}>
          Reset Current Play
        </button>
      </div>
      <textarea
        id="jsonInput"
        ref={jsonInputRef}
        spellCheck={false}
        placeholder="Paste PlayAnimationPlan JSON here..."
      />
      <div className="error-box" id="errorBox" ref={errorBoxRef} />
    </div>
  );
}
