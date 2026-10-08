const key = (value: unknown) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function parseHandsImpactSettings(rows: unknown[][]) {
  const title = rows.findIndex((row) => row.some((value) => key(value) === "handsimpactbasedonopenness"));
  const required = ["openscore", "minopen", "maxopen", "handsimpact"];
  const header = rows.findIndex((row, index) => index >= Math.max(0, title) &&
    required.every((name) => row.some((value) => key(value) === name)));
  if (header < 0 && title < 0) return [];
  if (header < 0) throw new Error("Hands impact based on openness is missing headers.");
  const columns = required.map((name) => rows[header].findIndex((value) => key(value) === name));
  const result: Array<{ label: string; minOpen: number; maxOpen: number | null; handsImpact: number }> = [];
  for (let index = header + 1; index < rows.length; index++) {
    const row = rows[index];
    const label = String(row[columns[0]] ?? "").trim();
    if (!/^\d+\s*[-–—]/.test(label)) break;
    const minOpen = Number(row[columns[1]]), rawMax = Number(row[columns[2]]);
    const value = String(row[columns[3]] ?? "").trim();
    const numeric = Number(value.replace(/%$/, ""));
    const handsImpact = value.endsWith("%") || numeric > 1 ? numeric / 100 : numeric;
    const maxOpen = rawMax === -1 ? null : rawMax;
    const previous = result.at(-1);
    if (!String(row[columns[1]] ?? "").trim() || !String(row[columns[2]] ?? "").trim() || !value ||
        ![minOpen, rawMax, handsImpact].every(Number.isFinite) || minOpen < 0 ||
        (maxOpen !== null && maxOpen < minOpen) || handsImpact < 0 || handsImpact > 1 ||
        (previous && (previous.maxOpen === null || minOpen <= previous.maxOpen)))
      throw new Error(`Invalid hands impact range at Settings row ${index + 1}.`);
    result.push({ label, minOpen, maxOpen, handsImpact });
  }
  if (!result.length) throw new Error("Hands impact based on openness has no rows.");
  return result;
}
