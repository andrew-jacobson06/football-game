export type TimeToThrowRange = { min: number; max: number; percentage: number };

// Find the table by its title, rather than depending on its row or column.
export function parseTimeToThrowSettings(rows: unknown[][]): TimeToThrowRange[] {
  const titleRow = rows.findIndex((row) => row.some((value) =>
    String(value ?? "").trim().toLowerCase() === "time_to_throw"
  ));
  if (titleRow < 0) return [];
  const startColumn = rows[titleRow].findIndex((value) =>
    String(value ?? "").trim().toLowerCase() === "time_to_throw"
  );
  const headerRow = rows.findIndex((row, index) => index > titleRow &&
    ["min", "max", "avg", "pct"].every((header, offset) =>
      String(row[startColumn + offset] ?? "").trim().toLowerCase() === header
    )
  );
  if (headerRow < 0) throw new Error("time_to_Throw table is missing Min/Max/Avg/Pct headers.");
  const ranges: TimeToThrowRange[] = [];
  const followingTables = new Set(["jump effect (accuracy+coverage)", "jump based on air yards", "hands impact based on openness", "accuracy mod", "completion pct", "openness completion modifier", "qb decision table", "curve type openness", "curve type", "phase", "routetreedetails", "basetto", "baseimpact calcs", "route", "routes", "airyards"]);
  for (let rowIndex = headerRow + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const cells = row.slice(startColumn, startColumn + 4);
    if (cells.every((value) => value == null || String(value).trim() === "")) break;
    // Neighboring Settings tables need not have a blank separator row.
    if (followingTables.has(String(cells[0] ?? "").trim().toLowerCase())) break;
    // Ignore the table's placeholder row without a percentage.
    const pct = cells[3];
    if (pct == null || String(pct).trim() === "") {
      if (ranges.length) break;
      continue;
    }
    const min = Number(cells[0]);
    const max = Number(cells[1]);
    // Sheets returns formatted percentages as strings (e.g. "5.0%").
    const percentage = Number(String(pct).trim().replace(/%$/, ""));
    // The workbook placeholder may have a formula displaying 0% instead of blank.
    if (!ranges.length && (cells[0] == null || String(cells[0]).trim() === "") &&
        max === 0 && Number(cells[2]) === 0 && percentage === 0) continue;
    if (cells[0] == null || String(cells[0]).trim() === "" ||
        cells[1] == null || String(cells[1]).trim() === "" ||
        !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min ||
        !Number.isFinite(percentage) || percentage < 0) {
      throw new Error(`Invalid range in time_to_Throw settings table at Settings row ${rowIndex + 1} ` +
        `(Min=${JSON.stringify(cells[0] ?? "")}, Max=${JSON.stringify(cells[1] ?? "")}, Pct=${JSON.stringify(pct)}).`);
    }
    if (percentage > 0) ranges.push({ min, max, percentage });
  }
  return ranges;
}
