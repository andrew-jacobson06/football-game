import type { LeagueGame } from "../../types";
import type { EngineContext, FormationSlot, PlayerTrait } from "./types";
import { defenseTeam, playerName, str, teamPlayers, trait } from "./utils";

export type FormationEntry = {
  position: FormationSlot | string;
  player: string;
  align?: string;
};
const REQUIRED: FormationSlot[] = ["QB", "TEOL2", "TEOL3", "TEOL4"];
export function validateOffensiveFormation(
  formation: Partial<Record<FormationSlot, string>>,
) {
  return REQUIRED.every((slot) => Boolean(formation[slot]));
}
export function saveOffensiveFormation(
  formation: Partial<Record<FormationSlot, string>>,
): FormationEntry[] {
  return Object.entries(formation)
    .filter(([, player]) => Boolean(player))
    .map(([position, player]) => ({ position, player: String(player) }));
}
export function generateDefensiveFormation(
  game: LeagueGame,
  ctx: EngineContext,
  offense: FormationEntry[] = [],
): FormationEntry[] {
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
  offense
    .filter((s) => s.position.startsWith("TEOL"))
    .forEach((slot, i) => {
      const p = take(i % 2 ? lbs : dls) ?? take(dls) ?? take(lbs);
      if (p)
        out.push({
          position: `${str(p.defPos ?? "DL")}${i + 1}`,
          player: playerName(p),
          align: slot.position,
        });
    });
  [take(lbs), take(lbs), take(safeties)]
    .filter(Boolean)
    .forEach((p, i) =>
      out.push({
        position: i === 2 ? "S1" : `LB${i + 1}`,
        player: playerName(p),
        align: i === 2 ? "deep" : "box",
      }),
    );
  return out;
}
