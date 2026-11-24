/** Read the stamped bracket without recalculating seeds from changing standings. */
export function parsePlayoffBracket(rows: unknown[][]) {
  const key = (value: unknown) => String(value ?? "").trim().toLowerCase();
  const [headers = [], ...data] = rows;
  if (!["division", "seed", "team"].every((header, i) => key(headers[i]) === header))
    throw new Error("Playoff Bracket must have Division / Seed / Team headers in A1:C1.");
  if (data.length !== 6) throw new Error("Playoff Bracket must contain the six East/West seed rows in A2:C7.");
  const seen = new Set<string>();
  return data.map((row, i) => {
    const division = ["East", "West"].find(name => key(name) === key(row[0]));
    const seed = Number(row[1]), id = `${division}:${seed}`;
    if (!division || ![1, 2, 3].includes(seed) || seen.has(id)) throw new Error(`Invalid Playoff Bracket seed at row ${i + 2}.`);
    seen.add(id);
    return { division, seed, team: String(row[2] ?? "").trim() };
  });
}
