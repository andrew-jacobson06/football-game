/** Game-clock seconds consumed, including a reset to 15:00 at a period boundary.
 * Missing/invalid clocks stay unknown; never infer a duration from the next play.
 */
export function elapsedPlaySeconds(
  before: { period: unknown; seconds: unknown },
  after: { period: unknown; seconds: unknown },
): number | null {
  const clock = (value: unknown) => {
    if (value == null || String(value).trim() === "") return null;
    const parts = String(value).split(":").map(Number);
    const result =
      parts.length === 2
        ? parts[0] * 60 + parts[1]
        : parts.length === 1
          ? parts[0]
          : NaN;
    return Number.isFinite(result) && result >= 0 && result <= 900
      ? result
      : null;
  };
  const period = (value: unknown) => {
    const text = String(value).trim().toUpperCase();
    const overtime = /^(\d*)OT$/.exec(text);
    const result = overtime ? 4 + Number(overtime[1] || 1) : Number(text);
    return Number.isInteger(result) && result > 0 ? result : null;
  };
  const start = clock(before.seconds),
    end = clock(after.seconds),
    first = period(before.period);
  const last = /^(FINAL|F)$/i.test(String(after.period).trim())
    ? first
    : period(after.period);
  if (
    start === null ||
    end === null ||
    first === null ||
    last === null ||
    last < first ||
    last > first + 1
  )
    return null;
  const elapsed = (last - first) * 900 + start - end;
  return elapsed >= 0 && elapsed <= 900 ? elapsed : null;
}
