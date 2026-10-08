const key = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const throwTypes = ["Perfect", "Accurate", "Close", "Catchable", "Off Target"] as const;

export function parseJumpSettings(rows: unknown[][]) {
  function header(title: string, names: string[]) {
    const titleIndex = rows.findIndex((row) => row.some((cell) => key(cell) === key(title)));
    const index = rows.findIndex((row, index) => index >= Math.max(0, titleIndex) &&
      names.every((name) => row.some((cell) => key(cell) === key(name))));
    if (index < 0 && titleIndex >= 0) throw new Error(`${title} is missing headers.`);
    return { index, columns: names.map((name) => rows[index]?.findIndex((cell) => key(cell) === key(name)) ?? -1) };
  }
  function number(value: unknown, label: string, row: number) {
    const parsed = Number(String(value ?? "").trim().replace(/%$/, ""));
    if (!String(value ?? "").trim() || !Number.isFinite(parsed))
      throw new Error(`Invalid ${label} at Settings row ${row + 1}.`);
    return parsed;
  }
  const effectHeader = header("JUMP EFFECT (accuracy+coverage)", ["min open", "max open", ...throwTypes]);
  const jumpEffects: Array<{ label: string; minOpen: number; maxOpen: number | null;
    multipliers: Record<typeof throwTypes[number], number> }> = [];
  if (effectHeader.index >= 0) {
    const [minColumn, maxColumn, ...typeColumns] = effectHeader.columns;
    for (let index = effectHeader.index + 1; index < rows.length; index++) {
      const row = rows[index];
      if (!String(row[minColumn] ?? "").trim()) break;
      const minOpen = number(row[minColumn], "jump min open", index);
      const rawMax = number(row[maxColumn], "jump max open", index);
      const maxOpen = rawMax === -1 ? null : rawMax;
      const multipliers = Object.fromEntries(throwTypes.map((type, typeIndex) => {
        const value = row[typeColumns[typeIndex]];
        const parsed = number(value, `${type} jump multiplier`, index);
        const multiplier = String(value).trim().endsWith("%") || parsed > 1 ? parsed / 100 : parsed;
        if (multiplier < 0 || multiplier > 1) throw new Error(`Invalid jump percentage at Settings row ${index + 1}.`);
        return [type, multiplier];
      })) as Record<typeof throwTypes[number], number>;
      const previous = jumpEffects.at(-1);
      if (minOpen < 0 || (maxOpen !== null && maxOpen < minOpen) ||
          (previous && (previous.maxOpen === null || minOpen <= previous.maxOpen)))
        throw new Error(`Invalid jump openness range at Settings row ${index + 1}.`);
      jumpEffects.push({ label: String(row[minColumn - 1] ?? `${minOpen}-${rawMax}`).trim(), minOpen, maxOpen, multipliers });
    }
    if (!jumpEffects.length) throw new Error("JUMP EFFECT (accuracy+coverage) has no rows.");
  }
  const airHeader = header("JUMP Based on Air yards", ["Air Yards", "Jump Chance Multiplier"]);
  const jumpAirYards: Array<{ airYards: number | "EndZone"; multiplier: number }> = [];
  if (airHeader.index >= 0) {
    for (let index = airHeader.index + 1; index < rows.length; index++) {
      const row = rows[index];
      const value = row[airHeader.columns[0]];
      if (!String(value ?? "").trim()) break;
      if (key(value) !== "endzone" && !Number.isFinite(Number(value))) break;
      const airYards = key(value) === "endzone" ? "EndZone" : number(value, "jump air yards", index);
      const multiplier = number(row[airHeader.columns[1]], "jump air-yards multiplier", index);
      if ((typeof airYards === "number" && airYards < 0) || multiplier < 0 || jumpAirYards.some((entry) => entry.airYards === airYards))
        throw new Error(`Invalid jump air-yards range at Settings row ${index + 1}.`);
      jumpAirYards.push({ airYards, multiplier });
    }
    if (!jumpAirYards.some((row) => row.airYards === "EndZone") || !jumpAirYards.some((row) => typeof row.airYards === "number"))
      throw new Error("JUMP Based on Air yards needs EndZone and numeric depth rows.");
  }
  const routeHeader = header("JUMP Based on Route", ["Route", "Jump Chance Multiplier"]);
  const jumpRoutes: Array<{ route: string; multiplier: number }> = [];
  if (routeHeader.index >= 0) {
    const titles = ["JUMP EFFECT (accuracy+coverage)", "JUMP Based on Air yards", "JUMP Based on Route",
      "Hands impact based on openness", "Accuracy Mod", "Openness Completion Modifier", "QB Decision Table",
      "Completion Pct", "AirYards", "RouteTreeDetails", "Curve Type Openness", "Phase", "baseTTO", "BaseImpact Calcs", "time_to_Throw"];
    for (let index = routeHeader.index + 1; index < rows.length; index++) {
      const row = rows[index];
      const route = String(row[routeHeader.columns[0]] ?? "").trim();
      if (!route || titles.some((title) => key(title) === key(route))) break;
      const raw = String(row[routeHeader.columns[1]] ?? "").trim().replace(/^[x×]\s*/i, "");
      const multiplier = number(raw, "jump route multiplier", index);
      if (multiplier < 0 || jumpRoutes.some((entry) => key(entry.route) === key(route)))
        throw new Error(`Invalid jump route multiplier at Settings row ${index + 1}.`);
      jumpRoutes.push({ route, multiplier });
    }
    if (!jumpRoutes.some((row) => key(row.route) === "allelse"))
      throw new Error("JUMP Based on Route needs an ALL ELSE row.");
  }
  return { jumpEffects, jumpAirYards, jumpRoutes };
}
