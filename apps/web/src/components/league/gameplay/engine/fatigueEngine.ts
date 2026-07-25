import type { EngineContext, PlayerTrait } from "./types";

const STATIC_TRAITS = new Set(["size", "strength"]);

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getPlayerName(player: PlayerTrait) {
  return String(
    player.name ?? player.Name ?? player.playername ?? player.PlayerName ?? "",
  );
}

/** Returns the points removed from skill traits at the player's current in-game stamina. */
export function fatigueTraitPenalty(
  player: PlayerTrait | undefined,
  traitName: string,
) {
  if (!player || STATIC_TRAITS.has(traitName.replace(/\s+/g, "").toLowerCase())) {
    return 0;
  }

  // A fatigue score is added when this player first participates in a play.
  // Players who have not participated must retain their roster trait values.
  if (player.fatigue === undefined || player.fatigue === null) return 0;

  const remainingStamina = number(player.fatigue);
  if (remainingStamina < 0) return 8;
  if (remainingStamina < 5) return 5;
  if (remainingStamina < 15) return 3;
  return 0;
}

/** Applies the in-game stamina penalty to a non-static trait value. */
export function applyFatigueToTrait(
  player: PlayerTrait | undefined,
  traitName: string,
  value: number,
) {
  return Math.max(0, value - fatigueTraitPenalty(player, traitName));
}

export function applyFatigue(
  ctx: EngineContext,
  playerName: string,
  actionType: string,
) {
  const player = ctx.players.find(
    (candidate) => getPlayerName(candidate) === playerName,
  );
  if (!player) return;
  const drain = number(
    (ctx.settings.drainSettings as Record<string, unknown> | undefined)?.[
      actionType
    ] ??
      (ctx.settings.staminaDrains as Record<string, unknown> | undefined)?.[
        actionType
      ] ??
      (ctx.settings as Record<string, unknown>)[actionType] ??
      0,
  );
  const stamina = number(player.stamina ?? player.Stamina, 100);
  const currentStamina = number(player.fatigue, stamina);

  // `fatigue` is the player's remaining in-game stamina. Do not clamp it: the
  // below-zero tier deliberately carries the largest skill penalty.
  player.fatigue = currentStamina - drain;
}
export function applyFatigueFromPlayHistory() {
  return undefined;
}
