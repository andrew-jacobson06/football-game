import test from "node:test";
import assert from "node:assert/strict";
import { careerCategoryOrder, careerColumns, careerPasserRating } from "../src/components/league/careerStatColumns";
test("all four career categories appear in the requested order for every offensive position", () => {
  const expected = {
    QB: ["Passing", "Rushing", "Blocking", "Receiving"],
    RB: ["Rushing", "Receiving", "Blocking", "Passing"],
    WR: ["Receiving", "Rushing", "Blocking", "Passing"],
    TE: ["Receiving", "Blocking", "Rushing", "Passing"],
    OL: ["Blocking", "Rushing", "Receiving", "Passing"],
  };
  for (const [position, categories] of Object.entries(expected)) assert.deepEqual(careerCategoryOrder(position), categories);
});
test("career rates are derived from totals, category-specific fields do not mix, and unknown QBR stays unavailable", () => {
  const line = { gamesPlayed: 4, stats: { passing_attempts: 40, passing_completions: 30, passing_yards: 400, passing_touchdowns: 4, interceptions_thrown: 1, carries: 5, rushing_yards: 35, receptions: 2, receiving_yards: 30, rushing_fumbles: 1, receiving_fumbles: 2, ol_wins: 9, ol_losses: 3 } };
  assert.equal(careerColumns.Passing.find(c => c.label === "CMP%")!.value(line), 75);
  assert.equal(careerColumns.Rushing.find(c => c.label === "AVG")!.value(line), 7);
  assert.equal(careerColumns.Receiving.find(c => c.label === "AVG")!.value(line), 15);
  assert.equal(careerColumns.Rushing.find(c => c.label === "FUM")!.value(line), 1);
  assert.equal(careerColumns.Receiving.find(c => c.label === "FUM")!.value(line), 2);
  assert.equal(careerColumns.Blocking.find(c => c.label === "WIN%")!.value(line), 75);
  assert.equal(careerColumns.Passing.find(c => c.label === "QBR")!.value(line), null);
  assert.equal(careerPasserRating({ gamesPlayed: 0, stats: {} }), null);
  assert.ok(Math.abs(careerPasserRating(line)! - 129.1666666667) < .00001);
});
