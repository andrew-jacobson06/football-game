import type { EngineContext, PlayerTrait } from "./types";

const STATIC_TRAITS = new Set(["size", "strength"]);
const STARTING_ENERGY = 100;
const STARTING_TEMPORARY_FATIGUE = 0;

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPlayerName(player: PlayerTrait) {
  return String(
    player.name ?? player.Name ?? player.playername ?? player.PlayerName ?? "",
  );
}

/** Returns the energy available for display and trait calculations. */
export function totalEnergy(player: PlayerTrait | undefined) {
  if (!player) return STARTING_ENERGY;

  // Temporary fatigue is kept separate from the lasting energy drain so future
  // recovery rules can restore it without also restoring a player's energy.
  const energy = number(player.energy ?? player.Energy, STARTING_ENERGY);
  const temporaryFatigue = number(
    player.temporaryFatigue ?? player.TemporaryFatigue,
    STARTING_TEMPORARY_FATIGUE,
  );
  return Math.max(0, Math.min(STARTING_ENERGY, energy - temporaryFatigue));
}

/** Converts total energy into the percentage retained by non-static traits. */
export function fatigueTraitPercentage(player: PlayerTrait | undefined) {
  const energy = totalEnergy(player);
  const percentage =
    0.000026666666667 * energy ** 4 -
    0.0016 * energy ** 3 +
    0.019333333333334 * energy ** 2 +
    0.94 * energy +
    75;

  // The curve is intentionally bounded: fatigue can never improve a trait or
  // reduce it below 75 percent of the player's roster value.
  return Math.max(75, Math.min(100, percentage));
}

/** Applies the total-energy multiplier to every trait except size and strength. */
export function applyFatigueToTrait(
  player: PlayerTrait | undefined,
  traitName: string,
  value: number,
) {
  const normalizedTrait = traitName.replace(/\s+/g, "").toLowerCase();
  if (!player || STATIC_TRAITS.has(normalizedTrait)) return value;
  return Math.max(0, value * (fatigueTraitPercentage(player) / 100));
}

/** Energy drained from a ball carrier, based on the player's stamina trait. */
export function ballCarrierEnergyDrain(stamina: number) {
  return (
    -0.000000884897437 * stamina ** 3 +
    0.000306287478701 * stamina ** 2 -
    0.067104126069643 * stamina +
    6.5
  );
}

/** Temporary fatigue added to a ball carrier after the run is complete. */
export function ballCarrierTemporaryFatigue(stamina: number) {
  return (
    -0.000000884897437 * stamina ** 3 +
    0.000306287478701 * stamina ** 2 -
    0.067104126069643 * stamina +
    5.5
  );
}

/** Applies one run's ball-carrier fatigue after the play has been resolved. */
export function applyRunFatigue(ctx: EngineContext, playerName: string) {
  const player = ctx.players.find(
    (candidate) => getPlayerName(candidate) === playerName,
  );
  if (!player) return;

  // Stamina controls how hard the play hits the runner; every player still
  // begins the game with the same 100 energy and zero temporary fatigue.
  const stamina = number(player.stamina ?? player.Stamina, 100);
  const currentEnergy = number(player.energy ?? player.Energy, STARTING_ENERGY);
  const currentTemporaryFatigue = number(
    player.temporaryFatigue ?? player.TemporaryFatigue,
    STARTING_TEMPORARY_FATIGUE,
  );
  player.energy = currentEnergy - ballCarrierEnergyDrain(stamina);
  player.temporaryFatigue =
    currentTemporaryFatigue + ballCarrierTemporaryFatigue(stamina);
}

type HistoricalPlay = Record<string, unknown>;

export type FatigueRecovery = {
  player: string;
  amount: number;
  reason: "bench" | "opponent-drive";
};

function randomBetween(min: number, max: number, random: () => number) {
  return min + random() * (max - min);
}

function playerTeam(player: PlayerTrait) {
  return String(player.team ?? player.Team ?? "").trim().toLowerCase();
}

function recoverTemporaryFatigue(player: PlayerTrait, amount: number) {
  const current = number(
    player.temporaryFatigue ?? player.TemporaryFatigue,
    STARTING_TEMPORARY_FATIGUE,
  );
  player.temporaryFatigue = Math.max(0, current - Math.max(0, amount));
}

/**
 * Applies recovery earned during a completed offensive snap. Exact rolls are
 * returned so they can be saved with the play and replayed after a refresh.
 */
export function applyFatigueRecovery(
  ctx: EngineContext,
  options: {
    offenseTeam: string;
    defenseTeam: string;
    offensivePlayers: string[];
    opponentDrivePlays?: number;
    random?: () => number;
  },
) {
  const random = options.random ?? Math.random;
  const offenseTeam = options.offenseTeam.trim().toLowerCase();
  const defenseTeam = options.defenseTeam.trim().toLowerCase();
  const onField = new Set(options.offensivePlayers.filter(Boolean));
  const recovery: FatigueRecovery[] = [];

  // An absent formation does not prove that everybody was on the bench (for
  // example, special-teams calls do not currently carry an offensive lineup).
  if (onField.size) {
    ctx.players.forEach((player) => {
      const name = getPlayerName(player);
      if (playerTeam(player) !== offenseTeam || onField.has(name)) return;
      const amount = randomBetween(0.75, 1.75, random);
      recoverTemporaryFatigue(player, amount);
      recovery.push({ player: name, amount, reason: "bench" });
    });
  }

  const drivePlays = Math.max(0, options.opponentDrivePlays ?? 0);
  if (drivePlays) {
    ctx.players.forEach((player) => {
      if (playerTeam(player) !== defenseTeam) return;
      const amount =
        randomBetween(3, 6, random) +
        randomBetween(0.75, 1.5, random) * drivePlays;
      recoverTemporaryFatigue(player, amount);
      recovery.push({
        player: getPlayerName(player),
        amount,
        reason: "opponent-drive",
      });
    });
  }

  return recovery;
}

function savedRecovery(play: HistoricalPlay): FatigueRecovery[] {
  const value = historicalField(play, "fatigueRecovery");
  if (Array.isArray(value)) return value as FatigueRecovery[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as FatigueRecovery[]) : [];
  } catch {
    return [];
  }
}

function historicalField(play: HistoricalPlay, fieldName: string) {
  const normalizedFieldName = fieldName.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const entry = Object.entries(play).find(
    ([key]) =>
      key.replace(/[^a-z0-9]/gi, "").toLowerCase() === normalizedFieldName,
  );
  return entry?.[1];
}

/** Rebuilds offensive fatigue by replaying persisted run plays. */
export function applyFatigueFromPlayHistory(
  ctx: EngineContext,
  playHistory: HistoricalPlay[],
) {
  // Fatigue is derived game state rather than saved roster data. Reset first so
  // refreshing the same history is idempotent and all players start at 100/0.
  ctx.players.forEach((player) => {
    player.energy = STARTING_ENERGY;
    player.temporaryFatigue = STARTING_TEMPORARY_FATIGUE;
  });

  playHistory.forEach((play) => {
    const playerName = String(historicalField(play, "player") ?? "").trim();
    const actionType = String(historicalField(play, "playtype") ?? "").trim();

    // For now a run's recorded ball carrier is the only offensive participant
    // who receives fatigue; other play types remain deliberately unaffected.
    if (playerName && actionType.toLowerCase() === "run") {
      applyRunFatigue(ctx, playerName);
    }

    savedRecovery(play).forEach(({ player: recoveredPlayer, amount }) => {
      const player = ctx.players.find(
        (candidate) => getPlayerName(candidate) === recoveredPlayer,
      );
      if (player) recoverTemporaryFatigue(player, number(amount));
    });
  });

  return ctx.players;
}
