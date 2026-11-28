/** Conversion attempts are history events, never normal statistical plays. */
export function isConversionPlay(play: Record<string, unknown>) {
  const value = (name: string) =>
    Object.entries(play).find(
      ([key]) => key.toLowerCase().replace(/[^a-z0-9]/g, "") === name,
    )?.[1];
  return (
    /^(true|1|yes)$/i.test(String(value("isconversion") ?? "")) ||
    /^(xp|2pt)$/i.test(String(value("time") ?? "")) ||
    /extra point|kick xp|two point|2pt/i.test(
      `${value("playtype") ?? ""} ${value("result") ?? ""}`,
    )
  );
}
