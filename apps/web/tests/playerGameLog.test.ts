import test from "node:test";
import assert from "node:assert/strict";
import type { PlayerGame } from "../src/api/client";
import { gameLogGroups, gameLogTotals } from "../src/components/league/playerGameLog";
test("offensive positions use the requested ordered stat groups", () => {
  for (const [position, expected] of Object.entries({ QB: ["PASSING", "RUSHING"], RB: ["RUSHING", "RECEIVING"], WR: ["RECEIVING", "RUSHING"], TE: ["RECEIVING", "BLOCKING"], OL: ["BLOCKING"] })) assert.deepEqual(gameLogGroups(position).map(g => g.label), expected);
  assert.deepEqual(gameLogGroups("DB"), []);
});
test("game log totals keep longest plays and recompute weighted rates", () => {
  const game = (attempts: number, yards: number, long: number) => ({ passing: { attempts, completions: attempts / 2, yards, long }, rushing: { carries: attempts, yards, long }, receiving: { receptions: attempts / 2, yards, long, yac: 4 }, blocking: { wins: attempts, losses: 1, leadBlocks: 1 }, fumbles: { total: 0, lost: 0 } }) as PlayerGame;
  const total = gameLogTotals([game(10, 100, 50), game(30, 150, 35)]);
  assert.equal(total.passing.attempts, 40);
  assert.equal(total.passing.yards, 250);
  assert.equal(total.passing.long, 50);
  assert.equal(total.receiving.yac, 8);
  assert.equal(gameLogGroups("QB")[0].columns.find(c => c.label === "AVG")!.value(total), 6.25);
  assert.equal(gameLogGroups("QB")[0].columns.find(c => c.label === "CMP%")!.value(total), 50);
  assert.equal(gameLogGroups("OL")[0].columns.find(c => c.label === "WIN%")!.value(total), 40 / 42 * 100);
});
