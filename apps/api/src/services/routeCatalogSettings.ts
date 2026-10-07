const text = (value: unknown) => String(value ?? "").trim();
const sectionTitles = new Set(["route", "airyards", "curve type", "phase", "routetreedetails", "basetto", "baseimpact calcs", "time_to_throw"]);

export function parseRouteCatalogSettings(rows: unknown[][]) {
  const routeTypeAirYards = rows.flatMap((row) => {
    const column = row.findIndex((value) => text(value).toLowerCase().startsWith("routetype_airyardsreqd_"));
    if (column < 0) return [];
    const [label, name, min, max] = row.slice(column, column + 4);
    const minAirYards = Number(min);
    const maxAirYards = text(max) === "--" ? null : Number(max);
    if (!text(name) || !text(min) || !Number.isInteger(minAirYards) || minAirYards < 0 ||
        (maxAirYards !== null && (!text(max) || !Number.isInteger(maxAirYards) || maxAirYards < minAirYards)))
      throw new Error(`Invalid AirYards setting: ${text(label)}.`);
    return [{ label: text(label), routeType: text(name), minAirYards, maxAirYards }];
  });
  const routesByDepth: Record<string, string[]> = Object.fromEntries(routeTypeAirYards.map(({ routeType }) => [routeType, []]));
  const headerIndex = rows.findIndex((row) => row.some((value, index) =>
    text(value).toLowerCase() === "route" && row.slice(index + 1).some((header) => text(header) in routesByDepth)));
  if (headerIndex >= 0) {
    const column = rows[headerIndex].findIndex((value) => text(value).toLowerCase() === "route");
    const header = rows[headerIndex];
    for (let index = headerIndex + 1; index < rows.length; index++) {
      const row = rows[index], route = text(row[column]);
      if (!route || sectionTitles.has(route.toLowerCase())) break;
      for (const depth of routeTypeAirYards) {
        const depthColumn = header.findIndex((value, position) => position > column && text(value) === depth.routeType);
        if (depthColumn < 0) continue;
        const marker = text(row[depthColumn]);
        if (marker && marker !== "0" && Number(marker) !== 1)
          throw new Error(`Invalid route eligibility for ${route} / ${depth.routeType}.`);
        if (marker && Number(marker) === 1) routesByDepth[depth.routeType].push(route);
      }
    }
  }
  return { routeTypeAirYards, routesByDepth };
}
