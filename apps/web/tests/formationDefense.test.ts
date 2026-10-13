import test from "node:test";
import assert from "node:assert/strict";
import { buildDefense } from "../src/components/league/formationDefense.ts";
import type { LeagueGame } from "../src/components/league/types.ts";
import type { FormationSlot } from "../src/components/league/gameplay/engine/types.ts";

const game: LeagueGame = { GameId: 1, Home: "Home", Away: "Away", Possession: "Home", HomeScore: 0, AwayScore: 0, Qtr: 1, Time: 900, Down: 1, Distance: 10, BallOn: 25 };
const formation: Partial<Record<FormationSlot, string>> = { QB: "QB", RB1: "RB", WR1: "WR Strong", WR2: "WR Other", LT: "Left", RT: "Right", LG: "Guard", C: "Center" };
const offense = [
  { name: "QB", team: "Home", position: "QB" }, { name: "RB", team: "Home", position: "RB" },
  { name: "WR Strong", team: "Home", position: "WR", offStars: 100 }, { name: "WR Other", team: "Home", position: "WR", offStars: 80 },
  { name: "Left", team: "Home", position: "OL", offStars: 80 }, { name: "Right", team: "Home", position: "OL", offStars: 90 },
  { name: "Guard", team: "Home", position: "OL", offStars: 70 }, { name: "Center", team: "Home", position: "OL", offStars: 60 },
];
const defense = [
  { name: "DB Strong", team: "Away", defPos: "DB", coverage: 100, readQB: 100, speed: 100, acceleration: 100 },
  { name: "DB Other", team: "Away", defPos: "DB", coverage: 80, readQB: 80, speed: 80, acceleration: 80 },
  { name: "DL Big", team: "Away", defPos: "DL", size: 100, coverage: 10 },
  { name: "DL Coverage", team: "Away", defPos: "DL", size: 60, coverage: 70, readQB: 70, speed: 70, acceleration: 70 },
  { name: "LB Stars", team: "Away", defPos: "LB", defStars: 100, size: 60, coverage: 50, readQB: 50, speed: 50, acceleration: 50 },
  { name: "LB Coverage", team: "Away", defPos: "LB", defStars: 60, coverage: 90, readQB: 90, speed: 90, acceleration: 90 },
  { name: "LB Backup", team: "Away", defPos: "LB", defStars: 50, coverage: 40 },
  { name: "Safety", team: "Away", defPos: "S", defStars: 90 },
];
const assigned = (players: Record<string, unknown>[]) => buildDefense(game, players, formation);
const at = (result: ReturnType<typeof assigned>, slot: FormationSlot) => result.find((row) => row.align === slot)?.player;

test("normal tackles retain DL size ranking, WR coverage ranking and existing LB fallbacks", () => {
  const result = assigned([...offense, ...defense]);
  assert.equal(at(result, "WR1"), "DB Strong");
  assert.equal(at(result, "WR2"), "DB Other");
  assert.equal(at(result, "RT"), "DL Big");
  assert.equal(at(result, "LT"), "DL Coverage");
  assert.equal(at(result, "LG"), "LB Backup");
  assert.equal(at(result, "C"), "LB Coverage");
  assert.equal(at(result, "QB"), "LB Stars");
  assert.equal(result.length, 8);
});

test("a WR or TE at either tackle gets the best LB/DL coverage defender before normal assignments", () => {
  for (const slot of ["LT", "RT"] as const) for (const position of ["TE", "WR"]) {
    const players = offense.map((player) => player.name === formation[slot] ? { ...player, position } : player);
    const result = assigned([...players, ...defense]);
    assert.equal(at(result, slot), "LB Coverage");
    assert.equal(at(result, slot === "LT" ? "RT" : "LT"), "DL Big");
    assert.equal(at(result, "WR1"), "DB Strong");
    assert.equal(at(result, "WR2"), "DB Other");
    assert.equal(at(result, "QB"), "LB Stars");
    assert.equal(result.length, 8);
    assert.equal(new Set(result.map((row) => row.player)).size, 8);
  }
});

test("two route-running tackles get distinct coverage defenders in Off Stars order", () => {
  const players = offense.map((player) => player.name === "Left" ? { ...player, position: "TE" } : player.name === "Right" ? { ...player, position: "WR" } : player);
  const result = assigned([...players, ...defense]);
  assert.equal(at(result, "RT"), "LB Coverage");
  assert.equal(at(result, "LT"), "DL Coverage");
  assert.equal(at(result, "LG"), "DL Big");
  assert.equal(at(result, "QB"), "LB Stars");
  assert.equal(new Set(result.map((row) => row.player)).size, 8);
});

test("DL can win the coverage ranking; Def Stars breaks ties and PascalCase traits work", () => {
  const players = offense.map((player) => player.name === "Left" ? { ...player, position: "TE" } : player);
  const defenders = defense.map((player) => player.name === "DL Coverage" ? { ...player, coverage: 90, readQB: 90, speed: 90, acceleration: 90, defStars: 80 } : player)
    .map((player) => Object.fromEntries(Object.entries(player).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value])));
  const result = assigned([...players, ...defenders]);
  assert.equal(at(result, "LT"), "DL Coverage");
  assert.equal(at(result, "RT"), "DL Big");
});

test("priority coverage can use the highest-star LB and reserves the best remaining LB", () => {
  const players = offense.map((player) => player.name === "Right" ? { ...player, position: "TE" } : player);
  const defenders = defense.map((player) => player.name === "LB Stars" ? { ...player, coverage: 100, readQB: 100, speed: 100, acceleration: 100 } : player);
  const result = assigned([...players, ...defenders]);
  assert.equal(at(result, "RT"), "LB Stars");
  assert.equal(at(result, "QB"), "LB Coverage");
});

test("WR/TE at interior OL slots keep the existing line assignment", () => {
  const players = offense.map((player) => player.name === "Guard" ? { ...player, position: "TE", offStars: 110 } : player);
  const result = assigned([...players, ...defense]);
  assert.equal(at(result, "LG"), "DL Big");
  assert.equal(at(result, "RT"), "DL Coverage");
});

test("without an LB/DL candidate, tackle coverage retains the existing fallback assignment", () => {
  const dbs = Array.from({ length: 8 }, (_, index) => ({ name: `DB ${index}`, team: "Away", defPos: "DB", coverage: 100 - index, size: 40 }));
  const baseline = assigned([...offense, ...dbs]);
  const players = offense.map((player) => player.name === "Left" ? { ...player, position: "TE" } : player);
  assert.deepEqual(assigned([...players, ...dbs]), baseline);
});
