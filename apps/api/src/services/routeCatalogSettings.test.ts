import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRouteCatalogSettings } from "./routeCatalogSettings.js";

test("reads depth names and availability dynamically, including open-ended ranges", () => {
  const rows = [
    ["Route", "Quick", "New Depth", "Bomb"],
    ["WR Screen", 1, "", ""], ["Corner", "", 1, 1], ["Go", "", 0, "1"],
    ["AirYards", "routeType", "airyards min", "airyards max"],
    ["routeType_AirYardsReqd_Quick", "Quick", 1, 2],
    ["routeType_AirYardsReqd_Custom", "New Depth", 10, 18],
    ["routeType_AirYardsReqd_Bomb", "Bomb", 40, "--"],
  ];
  const result = parseRouteCatalogSettings(rows.map((row) => ["", ...row]));
  assert.deepEqual(result.routeTypeAirYards.map((range) => range.routeType), ["Quick", "New Depth", "Bomb"]);
  assert.equal(result.routeTypeAirYards[2].maxAirYards, null);
  assert.deepEqual(result.routesByDepth, { Quick: ["WR Screen"], "New Depth": ["Corner"], Bomb: ["Corner", "Go"] });
});

test("rejects invalid ranges and does not invent defaults when tables are absent", () => {
  assert.deepEqual(parseRouteCatalogSettings([]), { routeTypeAirYards: [], routesByDepth: {} });
  assert.throws(() => parseRouteCatalogSettings([["routeType_AirYardsReqd_Test", "Test", 10, 5]]), /Invalid AirYards/);
});
