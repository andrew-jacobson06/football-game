const key = (value: unknown) => String(value ?? "").trim().toLowerCase();

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
  const title = rows.findIndex((row) => row.some((value) => key(value) === "openness completion modifier"));
  if (title < 0) return { completionTable, opennessCompletionModifiers };
  const column = rows[title].findIndex((value) => key(value) === "openness completion modifier");
  const required = ["open score", "min open", "max open", "min adjust", "max adjust"];
  let headerIndex = title + 1;
  while (headerIndex < rows.length && rows[headerIndex].slice(column).every((value) => !key(value))) headerIndex++;
  const header = rows[headerIndex]?.slice(column).map(key) ?? [];
  if (!required.every((name) => header.includes(name)))
    throw new Error("Openness Completion Modifier is missing Open Score/min open/max open/min adjust/max adjust headers.");
  const columns = required.map((name) => column + header.indexOf(name));
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
