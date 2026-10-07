const titles = ["Curve Type", "Phase", "RouteTreeDetails", "baseTTO", "BaseImpact Calcs", "Route", "AirYards", "time_to_Throw"];
const key = (value: unknown) => String(value ?? "").trim().toLowerCase();

/** Read the workbook tables wherever they are placed, including offset columns. */
export function parseRouteOpennessSettings(rows: unknown[][]) {
  function table(title: string) {
    const rowIndex = rows.findIndex((row) => row.some((cell) => key(cell) === key(title)));
    if (rowIndex < 0) return { header: [] as unknown[], rows: [] as unknown[][] };
    const column = rows[rowIndex].findIndex((cell) => key(cell) === key(title));
    const data: unknown[][] = [];
    for (const row of rows.slice(rowIndex + 1)) {
      const cells = row.slice(column);
      if (!key(cells[0])) {
        if (data.length) break;
        continue;
      }
      if (titles.some((name) => key(name) === key(cells[0]))) break;
      data.push(cells);
    }
    return { header: rows[rowIndex].slice(column), rows: data };
  }
  function number(value: unknown, label: string) {
    const parsed = Number(String(value ?? "").trim().replace(/%$/, ""));
    if (value == null || String(value).trim() === "" || !Number.isFinite(parsed))
      throw new Error(`Invalid ${label} in route openness Settings.`);
    return parsed;
  }
  const curves = table("Curve Type");
  const phases = table("Phase");
  const routes = table("RouteTreeDetails");
  const depths = table("baseTTO");
  const impacts = table("BaseImpact Calcs");
  return {
    curves: Object.fromEntries(curves.rows.map((row) => [String(row[0]).trim(),
      curves.header.slice(1).flatMap((header, index) => key(header) ? [{
        time: number(header, "curve time"), openness: number(row[index + 1], "curve openness"),
      }] : []),
    ])),
    phaseWeights: Object.fromEntries(phases.rows.map((row) => [String(row[0]).trim(), {
      speed: number(row[1], "phase speed"), acceleration: number(row[2], "phase acceleration"),
      routeCoverage: number(row[3], "phase route/coverage"), size: number(row[4], "phase size"),
    }])),
    routeTree: Object.fromEntries(routes.rows.map((row) => [String(row[0]).trim(), {
      type: String(row[1] ?? "").trim(), timingMod: number(row[2], "route timing modifier"),
      phases: { Release: number(row[3], "release percentage"), Stem: number(row[4], "stem percentage"),
        Break: number(row[5], "break percentage"), Sustain: number(row[6], "sustain percentage") },
    }])),
    baseTTO: Object.fromEntries(depths.rows.map((row) => [String(row[1]).trim(), number(row[2], "base TTO")])),
    baseImpacts: Object.fromEntries(impacts.rows.map((row) => [String(row[0]).trim(), {
      base: number(row[1], "impact base"), max: number(row[2], "impact maximum"),
      diffWeight: number(row[3], "impact difference weight"),
    }])),
  };
}
