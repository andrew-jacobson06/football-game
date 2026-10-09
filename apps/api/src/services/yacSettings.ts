const key = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const throwTypes = ["Perfect", "Accurate", "Close", "Catchable", "Off Target"] as const;

/** Locate each matrix by title, preserving numeric axis bounds from the sheet. */
export function parseYACSettings(rows: unknown[][]) {
  function matrix(title: string) {
    const titleIndex = rows.findIndex((row) => row.some((value) => key(value) === key(title)));
    if (titleIndex < 0) return { column: -1, headerIndex: -1, bounds: [] as number[] };
    const column = rows[titleIndex].findIndex((value) => key(value) === key(title));
    let headerIndex = titleIndex + 1;
    while (headerIndex < rows.length && !String(rows[headerIndex][column + 1] ?? "").trim()) headerIndex++;
    const headers = rows[headerIndex]?.slice(column + 1) ?? [];
    const bounds: number[] = [];
    for (const value of headers) {
      if (!String(value ?? "").trim()) break;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || (bounds.length && parsed <= bounds[bounds.length - 1]))
        throw new Error(`Invalid ${title} axis at Settings row ${headerIndex + 1}.`);
      bounds.push(parsed);
    }
    if (!bounds.length) throw new Error(`${title} is missing its numeric headers.`);
    return { column, headerIndex, bounds };
  }
  function value(cell: unknown, row: number) {
    const parsed = Number(cell);
    if (!String(cell ?? "").trim() || !Number.isFinite(parsed) || parsed < 0)
      throw new Error(`Invalid YAC value at Settings row ${row + 1}.`);
    return parsed;
  }
  const basis = matrix("YAC Basis by airyards and openness");
  const yacBasis: Array<{ maxAirYards: number; openness: Array<{ maxOpen: number; basis: number }> }> = [];
  if (basis.headerIndex >= 0) {
    for (let index = basis.headerIndex + 1; index < rows.length; index++) {
      const row = rows[index], label = String(row[basis.column] ?? "").trim();
      if (!label || !Number.isFinite(Number(label))) break;
      const maxAirYards = Number(label);
      if (yacBasis.length && maxAirYards <= yacBasis[yacBasis.length - 1].maxAirYards)
        throw new Error(`Invalid YAC air-yards axis at Settings row ${index + 1}.`);
      yacBasis.push({ maxAirYards, openness: basis.bounds.map((maxOpen, offset) =>
        ({ maxOpen, basis: value(row[basis.column + offset + 1], index) })) });
    }
    if (!yacBasis.length) throw new Error("YAC Basis by airyards and openness has no rows.");
  }
  const types = matrix("YAC multiplier by throw type");
  const yacThrowMultipliers: Array<{ throwType: typeof throwTypes[number]; depths: Array<{ maxAirYards: number; multiplier: number }> }> = [];
  if (types.headerIndex >= 0) {
    for (let index = types.headerIndex + 1; index < rows.length; index++) {
      const row = rows[index];
      const throwType = throwTypes.find((name) => key(name) === key(row[types.column]));
      if (!throwType) break;
      if (yacThrowMultipliers.some((entry) => entry.throwType === throwType))
        throw new Error(`Duplicate YAC throw type at Settings row ${index + 1}.`);
      yacThrowMultipliers.push({ throwType, depths: types.bounds.map((maxAirYards, offset) =>
        ({ maxAirYards, multiplier: value(row[types.column + offset + 1], index) })) });
    }
    if (yacThrowMultipliers.length !== throwTypes.length) throw new Error("YAC multiplier by throw type needs all five types.");
  }
  return { yacBasis, yacThrowMultipliers };
}
