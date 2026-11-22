const key = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const throwTypes = ["Perfect", "Accurate", "Close", "Catchable", "Off Target"] as const;

/** Each named table is bounded by its five throw types, including at Settings EOF. */
export function parseInterceptionSettings(rows: unknown[][]) {
  function table(title: string) {
    const start = rows.findIndex(row => row.some(value => key(value) === key(title)));
    if (start < 0) return [];
    const column = rows[start].findIndex(value => key(value) === key(title));
    const multiplierColumn = rows[start].findIndex((value, index) => index > column && key(value) === "multiplier");
    if (multiplierColumn < 0) throw new Error(`${title} is missing its multiplier header.`);
    const result: Array<{ throwType: typeof throwTypes[number]; multiplier: number }> = [];
    for (let i = start + 1; i < rows.length; i++) {
      const throwType = throwTypes.find(type => key(type) === key(rows[i][column]));
      if (!throwType) break;
      const raw = String(rows[i][multiplierColumn] ?? "").trim();
      const multiplier = Number(raw);
      if (!raw || !Number.isFinite(multiplier) || multiplier < 0 || result.some(row => row.throwType === throwType))
        throw new Error(`Invalid ${title} multiplier at Settings row ${i + 1}.`);
      result.push({ throwType, multiplier });
    }
    if (result.length !== throwTypes.length) throw new Error(`${title} must include all five throw types.`);
    return result;
  }
  return {
    dbBeatWRAccuracyMultipliers: table("DB beats WR to ball based on accuracy"),
    pickAccuracyMultipliers: table("Pick Multiplier based on accuracy"),
  };
}
