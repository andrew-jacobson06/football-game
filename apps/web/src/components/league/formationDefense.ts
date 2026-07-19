import type { LeagueGame } from "./types";
import type { DefensiveAssignment, FormationSlot } from "./gameplay/gameEngine";

const str = (v: unknown) => String(v ?? "");
const WR_SLOTS: FormationSlot[] = ["WR1", "WR2", "WR3", "WR4"];
const OL_SLOTS: FormationSlot[] = ["LT", "LG", "C", "RG", "RT"];
const EXPECTED_PLAYERS_PER_SIDE = 8;

type Player = Record<string, unknown>;

function nameOf(p: Player) {
  return str(p.name ?? p.Name);
}
function teamOf(p: Player) {
  return str(p.team ?? p.Team);
}
function trait(p: Player | undefined, key: string) {
  return Number(p?.[key] ?? p?.[key[0].toUpperCase() + key.slice(1)] ?? 0);
}

/**
 * Creates an eight-player defensive preview from the offense formation. It
 * picks the non-possessing team, ranks defenders by defensive stars inside each
 * position group, aligns coverage to receivers, aligns linemen to blockers, and
 * fills any remaining spots with linebackers/safeties.
 */
export function buildDefense(
  game: LeagueGame,
  players: Player[],
  formation: Partial<Record<FormationSlot, string>>,
): DefensiveAssignment[] {
  // The defense belongs to the team without possession; deriving it here keeps the UI preview and play-call payload in sync with the scoreboard.
  const defenseTeam = game.Possession === "Home" ? game.Away : game.Home;
  const defenders = players.filter((p) => teamOf(p) === defenseTeam);
  const by = (d: string, sortBy = "defStars") =>
    defenders
      .filter(
        (p) =>
          str(p.defPos ?? p.DefPos ?? p.defensePosition).toUpperCase() === d,
      )
      .sort((a, b) => trait(b, sortBy) - trait(a, sortBy));
  const dbs = by("DB", "coverage"),
    dls = by("DL", "size"),
    lbs = by("LB"),
    safeties = by("S");
  const protectedLb = lbs[0];
  const reserveProtectedLb = (p: Player) => p !== protectedLb;
  const lbCoverageFallbacks = lbs.filter(reserveProtectedLb);
  const lbLineFallbacks = [...lbCoverageFallbacks].reverse();
  const selectedDefenders = new Set<Player>();
  const take = (arrs: Player[][]) => {
    for (const arr of arrs) {
      while (arr.length) {
        const player = arr.shift();
        if (player && !selectedDefenders.has(player)) {
          selectedDefenders.add(player);
          return player;
        }
      }
    }
    return undefined;
  };
  const byName = (playerName?: string) =>
    players.find((p) => nameOf(p) === playerName);
  // Saved receivers and linemen are ranked by offensive stars so the best coverage DBs and biggest DLs match the best WRs/OLs.
  const byOffStars = (a: FormationSlot, b: FormationSlot) =>
    trait(byName(formation[b]), "offStars") -
    trait(byName(formation[a]), "offStars");
  const wrs = WR_SLOTS.filter((s) => formation[s]).sort(byOffStars);
  const ol = OL_SLOTS.filter((s) => formation[s]).sort(byOffStars);
  const out: DefensiveAssignment[] = [];
  wrs.forEach((slot, i) =>
    out.push({
      position: `DB${i + 1}`,
      player: nameOf(take([dbs, lbCoverageFallbacks]) ?? {}),
      align: slot,
    }),
  );
  ol.forEach((slot, i) =>
    out.push({
      position: `DL${i + 1}`,
      player: nameOf(take([dls, lbLineFallbacks, lbs]) ?? {}),
      align: slot,
    }),
  );
  // Any remaining defenders key on backfield/QB slots before the safety fallback
  // so the final formation always matches the eight-player offense.
  (["QB", "RB1", "RB2"] as FormationSlot[]).forEach((slot) => {
    if (out.length >= EXPECTED_PLAYERS_PER_SIDE) return;
    const p = take([lbs, dls, dbs]);
    if (p)
      out.push({
        position: `LB${out.length + 1}`,
        player: nameOf(p),
        align: slot,
      });
  });
  while (out.length < EXPECTED_PLAYERS_PER_SIDE) {
    const p = take([safeties, lbs, dbs, dls]);
    if (!p) break;
    out.push({ position: `S${out.length + 1}`, player: nameOf(p) });
  }
  return out.slice(0, EXPECTED_PLAYERS_PER_SIDE);
}
