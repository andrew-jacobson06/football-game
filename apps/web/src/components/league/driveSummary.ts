export const driveYardsFromSpots = (
  possession: string,
  start: number,
  end: number,
) => possession === "Home" ? end - start : start - end;

/**
 * Returns the final field coordinate for a drive. Touchdowns always finish at
 * the goal line, even when older play records contain the post-score kickoff
 * spot as their NewBallOn value.
 */
export function driveEndYard(
  possession: string,
  result: string,
  recordedEnd: number,
) {
  if (result.trim().toLowerCase() === "touchdown") {
    return possession === "Home" ? 100 : 0;
  }

  return recordedEnd;
}
