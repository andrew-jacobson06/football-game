import test from "node:test";
import assert from "node:assert/strict";
import { applyHalftimeRules, nextDownDistance } from "../src/components/league/gameplay/engine/utils.ts";
import { spikeBall, kneel } from "../src/components/league/gameplay/engine/specialTeamsEngine.ts";
import { formatDownDistance } from "../src/components/league/leagueMappers.ts";
import type { LeagueGame } from "../src/components/league/types.ts";

const game: LeagueGame = { GameId: 1, Home: "Home", Away: "Away", Possession: "Home", HomeScore: 0, AwayScore: 0, Qtr: 1, Time: 600, Down: 2, Distance: 7, BallOn: 50 };
const context = { players: [], settings: {}, historyLength: 0 };

test("every possession change resets down and distance without altering the turnover spot", () => {
  for (const possession of ["Home", "Away"]) {
    const previous = { ...game, Possession: possession };
    const otherTeam = possession === "Home" ? "Away" : "Home";
    const result = applyHalftimeRules(previous, { ...previous, Possession: otherTeam, Down: 3, Distance: 12, BallOn: 43 });
    assert.equal(result.Down, 1);
    assert.equal(result.Distance, 10);
    assert.equal(result.BallOn, 43);
    assert.equal(previous.Down, 2);
    assert.equal(previous.Distance, 7);
    assert.deepEqual(applyHalftimeRules(previous, { ...previous, Down: 3, Distance: 12 }), { ...previous, Down: 3, Distance: 12 });
  }
});

test("fourth-down failures, spikes and kneels give the other team first and ten and log it", () => {
  for (const possession of ["Home", "Away"]) {
    const previous = { ...game, Possession: possession, Down: 4 };
    assert.equal(nextDownDistance(previous, 0).turnover, true);
    for (const result of [spikeBall(previous, context), kneel(previous, context)]) {
      assert.equal(result.game.Possession, possession === "Home" ? "Away" : "Home");
      assert.equal(result.game.Down, 1);
      assert.equal(result.game.Distance, 10);
      assert.equal(result.play.result, "TO on Downs");
      assert.equal(result.play.turnover, "Yes");
      assert.equal(result.play.down, 4);
      assert.equal(result.play.newdown, 1);
      assert.equal(result.play.newdist, 10);
    }
  }
  const kneelResult = kneel(game, context);
  assert.equal(kneelResult.game.Possession, "Home");
  assert.equal(kneelResult.game.Down, 3);
  assert.equal(kneelResult.game.Distance, 8);
  const safety = kneel({ ...game, BallOn: 1 }, context);
  assert.equal(safety.play.result, "Safety");
  assert.equal(safety.game.Possession, "Away");
  assert.equal(safety.game.AwayScore, 2);
  assert.equal(safety.game.Down, 1);
  assert.equal(safety.game.Distance, 10);
});

test("halftime still resets the kickoff state after a turnover", () => {
  const result = applyHalftimeRules({ ...game, Qtr: 2, OpeningPossession: "Home" },
    { ...game, Qtr: 3, Possession: "Away", BallOn: 43, Down: 4, Distance: 12 });
  assert.equal(result.Possession, "Away");
  assert.equal(result.BallOn, 75);
  assert.equal(result.Down, 1);
  assert.equal(result.Distance, 10);
});

test("goal-to-go formatting follows possession direction and the goal line", () => {
  assert.equal(formatDownDistance(1, 7, 93, "Home"), "1st & Goal");
  assert.equal(formatDownDistance("1", "7", "7", "Away"), "1st & Goal");
  assert.equal(formatDownDistance(2, 10, 93, "Home"), "2nd & Goal");
  assert.equal(formatDownDistance(3, 9, 91, "Home"), "3rd & Goal");
  assert.equal(formatDownDistance(1, 5, 93, "Home"), "1st & 5");
  assert.equal(formatDownDistance(1, 7, 7, "Home"), "1st & 7");
  assert.equal(formatDownDistance(1, 7, 93, "Away"), "1st & 7");
  assert.equal(formatDownDistance(4, 3, 50, "Home"), "4th & 3");
  assert.equal(formatDownDistance(1, 7), "1st & 7");
});
