const key = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const throwTypes = ["Perfect", "Accurate", "Close", "Catchable", "Off Target"] as const;

export function parseAccuracySettings(rows: unknown[][]) {
  const title = rows.findIndex((row) => row.some((value) => key(value) === "accuracymod"));
  const required = ["throwtype", "min", "max"];
  const headerIndex = rows.findIndex((row, index) => index >= Math.max(0, title) &&
    required.every((name) => row.some((value) => key(value) === name)));
  if (headerIndex < 0 && title < 0) return [];
  if (headerIndex < 0) throw new Error("Accuracy Mod is missing Throw Type/MIN/MAX headers.");
  const columns = required.map((name) => rows[headerIndex].findIndex((value) => key(value) === name));
  const result: Array<{ throwType: typeof throwTypes[number]; min: number; max: number }> = [];
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const row = rows[index];
    const throwType = throwTypes.find((name) => key(name) === key(row[columns[0]]));
    if (!throwType) break;
    const min = Number(row[columns[1]]), max = Number(row[columns[2]]);
    if (!String(row[columns[1]] ?? "").trim() || !String(row[columns[2]] ?? "").trim() ||
        !Number.isFinite(min) || !Number.isFinite(max) || max < min || result.some((entry) => entry.throwType === throwType))
      throw new Error(`Invalid Accuracy Mod range at Settings row ${index + 1} for ${throwType}.`);
    result.push({ throwType, min, max });
  }
  if (result.length !== throwTypes.length) throw new Error("Accuracy Mod must include all five throw types.");
  return result;
}
