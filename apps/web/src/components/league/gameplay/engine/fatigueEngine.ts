import type { EngineContext } from "./types";
import { byName, n } from "./utils";
export function applyFatigue(ctx: EngineContext, playerName: string, actionType: string) {
  const player = byName(ctx, playerName); if (!player) return;
  const drain = n((ctx.settings.drainSettings as Record<string, unknown> | undefined)?.[actionType] ?? (ctx.settings as Record<string, unknown>)[actionType] ?? 0);
  player.fatigue = Math.max(0, n(player.fatigue ?? 100) - drain);
}
export function applyFatigueFromPlayHistory() { return undefined; }
