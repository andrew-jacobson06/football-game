const text = (value: unknown) => String(value ?? "").trim();
const key = (value: unknown) => text(value).replace(/[‐‑–—]/g, "-").replace(/\s+/g, " ").toLowerCase();
const sectionTitles = new Set(["route", "routes", "airyards", "curve type", "phase", "routetreedetails", "basetto", "baseimpact calcs", "time_to_throw"]);

/** Depths belong exclusively to the named AirYards table, never other prefixed rows. */
export function parseRouteCatalogSettings(rows: unknown[][]) {
  const routeTypeAirYards: Array<{ label: string; routeType: string; minAirYards: number; maxAirYards: number | null }> = [];
  const depths = new Map<string, typeof routeTypeAirYards[number]>();
  const airTitleRow = rows.findIndex((row) => row.some((value) => key(value) === "airyards"));
  if (airTitleRow >= 0) {
    const startColumn = rows[airTitleRow].findIndex((value) => key(value) === "airyards");
    let headerIndex = airTitleRow;
    const isAirHeader = (row: unknown[]) => ["routetype", "airyards min", "airyards max"].every((name) =>
      row.slice(startColumn, startColumn + 4).some((value) => key(value) === name));
    // Support a section title above the column-header row as well as a combined title/header.
    while (headerIndex < rows.length && !isAirHeader(rows[headerIndex])) {
      headerIndex++;
      if (headerIndex < rows.length && rows[headerIndex].some((value) => sectionTitles.has(key(value)))) break;
    }
    if (headerIndex >= rows.length || !isAirHeader(rows[headerIndex]))
      throw new Error("AirYards table is missing routeType / airyards min / airyards max headers.");
    const header = rows[headerIndex];
    const column = (name: string) => header.findIndex((value, index) => index >= startColumn && index < startColumn + 4 && key(value) === name);
    const depthColumn = column("routetype"), minColumn = column("airyards min"), maxColumn = column("airyards max");
    for (let index = headerIndex + 1; index < rows.length; index++) {
      const row = rows[index];
      if (sectionTitles.has(key(row[startColumn]))) break;
      const routeType = text(row[depthColumn]);
      if (!routeType) {
        if (routeTypeAirYards.length) break;
        continue;
      }
      const min = row[minColumn], max = row[maxColumn];
      const minAirYards = Number(min), maxAirYards = text(max) === "--" ? null : Number(max);
      if (!text(min) || !Number.isInteger(minAirYards) || minAirYards < 0 ||
          (maxAirYards !== null && (!text(max) || !Number.isInteger(maxAirYards) || maxAirYards < minAirYards)))
        throw new Error(`Invalid AirYards setting at Settings row ${index + 1}: ${routeType}.`);
      const range = { label: text(row[startColumn]), routeType, minAirYards, maxAirYards };
      const existing = depths.get(key(routeType));
      if (existing) {
        if (existing.minAirYards !== minAirYards || existing.maxAirYards !== maxAirYards)
          throw new Error(`Conflicting AirYards ranges for depth ${routeType}.`);
        continue;
      }
      depths.set(key(routeType), range);
      routeTypeAirYards.push(range);
    }
  }
  const routesByDepth: Record<string, string[]> = Object.fromEntries(routeTypeAirYards.map(({ routeType }) => [routeType, []]));
  if (!routeTypeAirYards.length) return { routeTypeAirYards, routesByDepth };
  const headers = rows.flatMap((row, rowIndex) => row.flatMap((value, column) =>
    ["route", "routes"].includes(key(value)) && row.slice(column + 1).some((header) => depths.has(key(header)))
      ? [{ rowIndex, column, title: key(value) }] : []));
  // A Routes section heading can repeat the depth names above the actual Route header.
  // Prefer the column header so the section heading cannot produce an empty catalog.
  const selectedHeader = headers.find(({ title }) => title === "route") ?? headers[0];
  if (!selectedHeader) throw new Error("Missing Routes table with depth columns matching the AirYards table.");
  const { rowIndex: headerIndex, column: routeColumn } = selectedHeader;
  const header = rows[headerIndex];
  const depthColumns = routeTypeAirYards.map(({ routeType }) => ({
    routeType,
    columns: header.flatMap((value, index) => index > routeColumn && key(value) === key(routeType) ? [index] : []),
  }));
  let foundRoute = false;
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const row = rows[index], route = text(row[routeColumn]);
    // Also allow a label-only Route header underneath a combined Routes/depth heading.
    if (!foundRoute && ["route", "routes"].includes(key(route))) continue;
    if (sectionTitles.has(key(route))) break;
    if (!route) {
      if (foundRoute) break;
      continue;
    }
    foundRoute = true;
    for (const { routeType, columns } of depthColumns) {
      for (const column of columns) {
        const marker = text(row[column]);
        if (marker && Number(marker) !== 0 && Number(marker) !== 1)
          throw new Error(`Invalid route eligibility for ${route} / ${routeType}.`);
        if (marker && Number(marker) === 1 && !routesByDepth[routeType].includes(route))
          routesByDepth[routeType].push(route);
      }
    }
  }
  return { routeTypeAirYards, routesByDepth };
}
