import type { LeagueGame } from "../../types";
import type { EngineContext, FormationSlot, PlayerTrait } from "./types";
import { defenseTeam, playerName, str, teamPlayers, trait } from "./utils";

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
  const used = new Set<PlayerTrait>();
  const take = (pool: PlayerTrait[]) => {
    const player = pool.find((p) => !used.has(p));
    if (player) used.add(player);
    return player;
  };
  const out: FormationEntry[] = [];
  // Wide receivers create the first defensive obligations: the best available DBs travel to those exact receiver slots.
  offense
    .filter((s) => s.position.startsWith("WR"))
    .forEach((slot, i) => {
      const p = take(dbs);
      if (p)
        out.push({
          position: `DB${i + 1}`,
          player: playerName(p),
          align: slot.position,
        });
    });
  // Offensive linemen define the box, so each occupied line slot receives a DL/LB matchup aligned over that saved offensive position.
  offense
    .filter((s) => OL_SLOTS.has(String(s.position)))
    .forEach((slot, i) => {
      const p = take(i % 2 ? lbs : dls) ?? take(dls) ?? take(lbs);
      if (p)
        out.push({
          position: `${str(p.defPos ?? "DL")}${i + 1}`,
          player: playerName(p),
          align: slot.position,
        });
    });
  // After man/box assignments, leftover linebackers and a safety fill the second level/deep help so the final defense is complete enough for run and pass engines.
  while (out.length < EXPECTED_PLAYERS_PER_SIDE) {
    const p = take(lbs) ?? take(safeties) ?? take(dbs) ?? take(dls);
    if (!p) break;
    const defPos = str(p.defPos ?? p.DefPos ?? "LB").toUpperCase();
    out.push({
      position: `${defPos}${out.length + 1}`,
      player: playerName(p),
      align: defPos === "S" || defPos === "DB" ? "deep" : "box",
    });
  }
  return out.slice(0, EXPECTED_PLAYERS_PER_SIDE);
}
