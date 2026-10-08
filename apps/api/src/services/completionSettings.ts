const key = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/** Read completion inputs independently of table order, including a final table at EOF. */
export function parseCompletionSettings(rows: unknown[][]) {
  function numeric(value: unknown, label: string, row: number) {
    const parsed = Number(String(value ?? "").trim().replace(/%$/, ""));
    if (!key(value) || !Number.isFinite(parsed))
      throw new Error(`Invalid ${label} at Settings row ${row + 1} (value=${JSON.stringify(value ?? "")}).`);
    return parsed;
  }
  // These named rows also support older sheets without a Completion Pct title.
  const completionTable = rows.flatMap((row, index) => {
    const column = row.findIndex((value) => /^airyards_completion_\d+$/i.test(String(value ?? "").trim()));
    if (column < 0) return [];
    const pastLos = numeric(row[column + 1], "completion past los", index);
    const baseCompletion = numeric(row[column + 2], "base completion", index);
    if (pastLos < 0 || baseCompletion < 0 || baseCompletion > 100)
      throw new Error(`Invalid completion range at Settings row ${index + 1}.`);
    return [{ label: String(row[column]).trim(), pastLos, baseCompletion }];
  }).sort((a, b) => a.pastLos - b.pastLos);
  if (completionTable.some((row, index) => index > 0 && row.pastLos === completionTable[index - 1].pastLos))
    throw new Error("Duplicate past los threshold in Completion Pct Settings.");

  const opennessCompletionModifiers: Array<{ label: string; minOpen: number; maxOpen: number | null;
    minAdjust: number; maxAdjust: number }> = [];
  const title = rows.findIndex((row) => row.some((value) => key(value) === "opennesscompletionmodifier"));
  const required = ["open score", "min open", "max open", "min adjust", "max adjust"];
  // The five headers uniquely identify this table, unlike Open Score alone,
  // which also occurs in the QB Decision Table. Titles may be wrapped, merged,
  // or placed in a different column from the data.
  const headerIndex = rows.findIndex((row, index) => index >= Math.max(0, title) &&
    required.every((name) => row.some((value) => key(value) === key(name))));
  if (headerIndex < 0 && title < 0) return { completionTable, opennessCompletionModifiers };
  if (headerIndex < 0)
    throw new Error("Openness Completion Modifier is missing Open Score/min open/max open/min adjust/max adjust headers.");
  const columns = required.map((name) => rows[headerIndex].findIndex((value) => key(value) === key(name)));
  for (let index = headerIndex + 1; index < rows.length; index++) {
    const row = rows[index];
    const label = String(row[columns[0]] ?? "").trim();
    if (!label || !/^\d+\s*[-–—]/.test(label)) break;
    const minOpen = numeric(row[columns[1]], "min open", index);
    const rawMax = numeric(row[columns[2]], "max open", index);
    const maxOpen = rawMax === -1 ? null : rawMax;
    const minAdjust = numeric(row[columns[3]], "min adjust", index);
    const maxAdjust = numeric(row[columns[4]], "max adjust", index);
    const previous = opennessCompletionModifiers.at(-1);
    if (minOpen < 0 || (maxOpen !== null && maxOpen < minOpen) || maxAdjust < minAdjust ||
        (previous && (previous.maxOpen === null || minOpen <= previous.maxOpen)))
      throw new Error(`Invalid Openness Completion Modifier range at Settings row ${index + 1}.`);
    opennessCompletionModifiers.push({ label, minOpen, maxOpen, minAdjust, maxAdjust });
  }
  if (!opennessCompletionModifiers.length) throw new Error("Openness Completion Modifier has no rows.");
  return { completionTable, opennessCompletionModifiers };
}
