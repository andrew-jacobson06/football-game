import { test } from "node:test";
import assert from "node:assert/strict";
import { routeDepthBounds, routePreviewDepth } from "../src/components/league/gameplay/engine/routeCatalog.ts";
import { assignRoutes } from "../src/components/league/gameplay/engine/passEngine.ts";
import type { LeagueGame } from "../src/components/league/types.ts";
import type { EngineContext } from "../src/components/league/gameplay/engine/types.ts";

test("preview and open-ended bounds use the sheet ranges", () => {
  assert.equal(routePreviewDepth({ routeType: "Custom", minAirYards: 10, maxAirYards: 18 }, 75), 14);
  assert.deepEqual(routeDepthBounds({ routeType: "Bomb", minAirYards: 40, maxAirYards: null }, 75), { min: 40, max: 75 });
});

test("pass engine samples the entire Settings range and validates route eligibility", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const game: LeagueGame = { GameId: 1, Home: "Home", Away: "Away", Possession: "Home", HomeScore: 0, AwayScore: 0, Qtr: 1, Time: 900, Down: 1, Distance: 10, BallOn: 25 };
  const weights = { speed: 1, acceleration: 1, routeCoverage: 1, size: 1 };
  const ctx: EngineContext = {
    players: [
      { name: "WR", team: "Home", speed: 60, acceleration: 60, routeRunning: 60, size: 60 },
      { name: "DB", team: "Away", defPos: "DB", speed: 60, acceleration: 60, coverage: 60, size: 60 },
    ], historyLength: 0, settings: {
      routeTypeAirYards: [{ routeType: "Custom", minAirYards: 10, maxAirYards: 18 }],
      routesByDepth: { Custom: ["Flat"] },
      routeOpennessSettings: {
        curves: {}, phaseWeights: { Release: weights, Stem: weights, Break: weights, Sustain: weights },
        routeTree: { Flat: { type: "Simple", timingMod: 0, phases: { Release: 35, Stem: 0, Break: 5, Sustain: 60 } } },
        baseTTO: { Custom: 2 }, baseImpacts: Object.fromEntries(["Speed", "Accel", "Route/Coverage", "Size"].map((key) => [key, { base: 5, max: 10, diffWeight: 0.25 }])),
      },
    },
  };
  const options = { routes: { WR: "Flat" }, routeDepths: { WR: "Custom" } };
  assert.equal(assignRoutes(game, ctx, options)[0].airYards, 14);
  t.mock.method(Math, "random", () => 0.25);
  assert.equal(assignRoutes(game, ctx, options)[0].airYards, 12);
  assert.throws(() => assignRoutes(game, ctx, { ...options, routes: { WR: "Go" } }), /not available/);
  assert.deepEqual(assignRoutes(game, ctx, { routes: { WR: "" } }), []);
});
