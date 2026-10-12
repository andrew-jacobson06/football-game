type StatRow = Record<string, unknown>;
const normalized = (value: string) => value.toLowerCase().replace(/%/g, "percentage").replace(/[^a-z0-9]/g, "");

// The Stats tab consumes PlayerStats sheet headers as well as API canonical names.
// Keep passing/receiving aliases specific so rushing Yards, TD and First Down
// never populate receiving columns or make a player eligible for that table.
const aliases = [
  ["Receiving Yards", "Rec Yards", "RecYards", "RecYds"],
  ["Targets", "Receiving Targets", "Tgt"],
  ["Receptions", "Rec"],
  ["Receiving TD", "Rec TD", "RecTD"],
  ["Yards After Catch", "YAC"],
  ["Completions", "Pass Completions", "CMP", "Comp"],
  ["Passing Attempts", "Pass Attempts", "Att"],
  ["Passing Yards", "Pass Yards", "PassYards", "Pass Yds"],
].map((group) => group.map(normalized));

export function seasonStatField(row: StatRow, fields: readonly string[]) {
  const names = fields.map(normalized);
  const entries = Object.entries(row).filter(([, value]) => value !== "" && value != null);
  // Prefer the requested canonical field before sheet aliases. A raw Rec="0"
  // must not hide Receptions="5" just because Rec appears first in the object.
  for (const name of names) {
    const exact = entries.find(([field]) => normalized(field) === name);
    if (exact) return exact[1];
  }
  const wanted = new Set(names.flatMap((name) => aliases.find((group) => group.includes(name)) ?? [name]));
  return entries.find(([field]) => wanted.has(normalized(field)))?.[1];
}

export function seasonStatValue(row: StatRow, fields: readonly string[]) {
  return Number(String(seasonStatField(row, fields) ?? 0).replace(/,/g, "")) || 0;
}

export function hasSeasonActivity(row: StatRow, view: "passing" | "receiving") {
  const fields = view === "receiving" ? ["Targets", "Receptions", "Receiving Yards", "Receiving TD", "YAC"]
    : ["Passing Attempts", "Completions", "Passing Yards", "Passing TD", "Pass INT", "Sacked"];
  return fields.some((field) => seasonStatValue(row, [field]) !== 0);
}
