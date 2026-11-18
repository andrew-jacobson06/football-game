import type { PlayCallOptions } from "./types";

/** Temporary coaching placeholder: one unrounded 0–100 decimal roll per snap.
 * Replace this decision with game-state/coaching logic when it is available.
 * An existing call is reused so continuations (such as scrambles) never reroll.
 */
export function resolveDefensivePlayCall(
  options: Pick<PlayCallOptions, "blitz" | "blitzRoll"> = {},
  random: () => number = Math.random,
) {
  if (options.blitz !== undefined) {
    return { blitz: options.blitz, blitzRoll: options.blitzRoll };
  }
  const blitzRoll = random() * 100;
  return { blitz: blitzRoll < 30, blitzRoll };
}
