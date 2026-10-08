const key = (value: unknown) => String(value ?? "").trim().toLowerCase();

export function parseQBDecisionSettings(rows: unknown[][]) {
  const title = rows.findIndex((row) => row.some((value) => key(value) === "qb decision table"));
  if (title < 0) return [];
  const column = rows[title].findIndex((value) => key(value) === "qb decision table");
  const headerIndex = rows.findIndex((row, index) => index > title && key(row[column]) === "open score");
  if (headerIndex < 0) throw new Error("QB Decision Table is missing headers.");
  const header = rows[headerIndex].slice(column).map(key);
  const columns = ["perceived max", "label", "base notice", "notice if primary"].map((name) => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`QB Decision Table is missing ${name}.`);
    return index;
  });
  function notice(value: unknown): number | null {
    if (["na", "n/a"].includes(key(value))) return null;
    const parsed = Number(String(value ?? "").trim().replace(/%$/, ""));
    if (!key(value) || !Number.isFinite(parsed) || parsed < 0 || parsed > 100)
      throw new Error("Invalid notice percentage in QB Decision Table.");
    return parsed;
  }
  const result: Array<{ perceivedMax: number; label: string; baseNotice: number | null; noticeIfPrimary: number | null }> = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const cells = row.slice(column);
    if (!key(cells[0])) break;
    // Open Score rows begin with a numeric range; stop at the next table title.
    if (!/^\d+\s*[-–—]/.test(key(cells[0]))) break;
    const perceivedMax = Number(cells[columns[0]]);
    if (!key(cells[columns[0]]) || !Number.isFinite(perceivedMax) ||
        (result.length > 0 && perceivedMax <= result[result.length - 1].perceivedMax))
      throw new Error("Invalid perceived max in QB Decision Table.");
    result.push({ perceivedMax, label: String(cells[columns[1]] ?? "").trim(),
      baseNotice: notice(cells[columns[2]]), noticeIfPrimary: notice(cells[columns[3]]) });
  }
  if (!result.length) throw new Error("QB Decision Table has no decision rows.");
  return result;
}
