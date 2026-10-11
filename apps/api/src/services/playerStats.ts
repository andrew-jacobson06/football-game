const key = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/** Read the whole sheet before making objects: duplicate headers otherwise overwrite each other. */
export function parsePlayerStats(values: unknown[][]) {
  const headers = (values[0] ?? []).map(String);
  const aliases: Record<string, string> = {
    carries: "Carries", yards: "Rushing Yards", td: "Rushing TD", fum: "Rushing Fumbles",
    fumlost: "Rushing Fumbles Lost", firstdown: "Rushing First Downs", juke: "Jukes",
    brokentackle: "Broken Tackles", avg: "Rushing Average", loss: "Rush Loss", long: "Rushing Long",
    tgt: "Targets", rec: "Receptions", recyds: "Receiving Yards", rectd: "Receiving TD", yac: "Yards After Catch",
    comp: "Completions", att: "Passing Attempts", passyds: "Passing Yards", passtd: "Passing TD",
    passint: "Interceptions Thrown", ff: "Forced Fumbles", fr: "Fumble Recoveries", int: "Interceptions",
    defl: "Passes Defended", yds: "Sack Yards Lost",
  };
  return values.slice(1).filter((row) => String(row[0] ?? "").trim()).map((row) => {
    const record: Record<string, string> = {};
    const seen = new Map<string, number>();
    headers.forEach((header, index) => {
      if (!header.trim()) return;
      const name = key(header);
      const occurrence = (seen.get(name) ?? 0) + 1;
      seen.set(name, occurrence);
      const value = String(row[index] ?? "");
      // Keep every workbook value, including the two INT and Sacks columns.
      record[occurrence === 1 ? header : `${header} ${occurrence}`] = value;
      const canonical = name === "sacks" ? (occurrence === 1 ? "Sacks" : "Sacked") : aliases[name];
      if (canonical && !(canonical in record && occurrence > 1)) record[canonical] = value;
    });
    const number = (field: string) => Number(record[field]?.replace(/,/g, "")) || 0;
    if (!record["Completion Percentage"]) record["Completion Percentage"] = String(number("Passing Attempts") ? number("Completions") / number("Passing Attempts") * 100 : 0);
    if (!record["Passing Average"]) record["Passing Average"] = String(number("Passing Attempts") ? number("Passing Yards") / number("Passing Attempts") : 0);
    if (!record["Receiving Average"]) record["Receiving Average"] = String(number("Receptions") ? number("Receiving Yards") / number("Receptions") : 0);
    return record;
  });
}
