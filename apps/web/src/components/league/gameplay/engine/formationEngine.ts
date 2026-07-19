import type { LeagueGame } from "../../types";
import type { EngineContext, FormationSlot, PlayerTrait } from "./types";
import { byName, defenseTeam, playerName, str, teamPlayers, trait } from "./utils";

export type FormationEntry = {
  position: FormationSlot | string;
  player: string;
  align?: string;
};
const REQUIRED: FormationSlot[] = ["QB", "LG", "C", "RG"];
const OL_SLOTS = new Set<string>(["LT", "LG", "C", "RG", "RT"]);
const EXPECTED_PLAYERS_PER_SIDE = 8;
export function validateOffensiveFormation(
  formation: Partial<Record<FormationSlot, string>>,
) {
  return (
    Object.values(formation).filter(Boolean).length === EXPECTED_PLAYERS_PER_SIDE &&
    REQUIRED.every((slot) => Boolean(formation[slot]))
  );
}
export function saveOffensiveFormation(
  formation: Partial<Record<FormationSlot, string>>,
): FormationEntry[] {
  // This is the first durable handoff point: collapse the UI's slot->player map into portable entries that later play resolution can pass to defensive setup.
  return Object.entries(formation)
    .filter(([, player]) => Boolean(player))
    .map(([position, player]) => ({ position, player: String(player) }));
}
export function generateDefensiveFormation(
  game: LeagueGame,
  ctx: EngineContext,
  offense: FormationEntry[] = [],
): FormationEntry[] {
  // Defensive formation starts after the offense is saved because defenders align to known offensive threats rather than guessing at empty slots.
  const defenders = teamPlayers(ctx, defenseTeam(game));
  const group = (defPos: string) =>
    defenders
      .filter((p) => str(p.defPos ?? p.DefPos).toUpperCase() === defPos)
      .sort((a, b) => trait(b, "defStars") - trait(a, "defStars"));
  const dbs = group("DB"),
    dls = group("DL"),
    lbs = group("LB"),
    safeties = group("S");
  const protectedLb = lbs[0];
  const lbCoverageFallbacks = lbs.filter((p) => p !== protectedLb);
  const lbLineFallbacks = [...lbCoverageFallbacks].reverse();
  const dbLineFallbacks = [...dbs].reverse();
  const used = new Set<PlayerTrait>();
  const linebackerRolePlayers = new Set<PlayerTrait>();
  const take = (pool: PlayerTrait[]) => {
    const player = pool.find((p) => !used.has(p));
    if (player) used.add(player);
    return player;
  };
  const takeLineDefender = () => {
    const player = take(dls) ?? take(lbLineFallbacks);
    if (player) return player;
    const db = dbLineFallbacks.find((candidate) => !used.has(candidate));
    if (
      db &&
      trait(db, "size") < 50 &&
      protectedLb &&
      !used.has(protectedLb) &&
      trait(protectedLb, "size") >= 50
    ) {
      used.add(protectedLb);
      linebackerRolePlayers.add(db);
      return protectedLb;
    }
    return take(dbLineFallbacks) ?? take(lbs);
  };
  const out: FormationEntry[] = [];
  const offenseByPlayerStars = (a: FormationEntry, b: FormationEntry) =>
    trait(byName(ctx, b.player), "offStars", 0) -
    trait(byName(ctx, a.player), "offStars", 0);

  // Wide receivers create the first defensive obligations: the best available DBs travel to the highest-star receivers first.
  offense
    .filter((s) => s.position.startsWith("WR"))
    .sort(offenseByPlayerStars)
    .forEach((slot, i) => {
      const p = take(dbs);
      if (p)
        out.push({
          position: `DB${i + 1}`,
          player: playerName(p),
          align: slot.position,
        });
    });
  // Offensive linemen define the box, so the best available DLs/LBs align to the highest-star blockers first.
  offense
    .filter((s) => OL_SLOTS.has(String(s.position)))
    .sort(offenseByPlayerStars)
    .forEach((slot, i) => {
      const p = takeLineDefender();
      if (p)
        out.push({
          position: `DL${i + 1}`,
          player: playerName(p),
          align: slot.position,
        });
    });
  // After man/box assignments, leftover linebackers and a safety fill the second level/deep help so the final defense is complete enough for run and pass engines.
  while (out.length < EXPECTED_PLAYERS_PER_SIDE) {
    const p = take(lbs) ?? take(safeties) ?? take(dbs) ?? take(dls);
    if (!p) break;
    const defPos = linebackerRolePlayers.has(p)
      ? "LB"
      : str(p.defPos ?? p.DefPos ?? "LB").toUpperCase();
    out.push({
      position: `${defPos}${out.length + 1}`,
      player: playerName(p),
      align: defPos === "S" || defPos === "DB" ? "deep" : "box",
    });
  }
  return out.slice(0, EXPECTED_PLAYERS_PER_SIDE);
}
