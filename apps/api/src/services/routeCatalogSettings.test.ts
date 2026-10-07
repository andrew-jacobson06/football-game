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
  assert.throws(() => parseRouteCatalogSettings([
    ["AirYards", "routeType", "airyards min", "airyards max"],
    ["routeType_AirYardsReqd_Test", "Test", 10, 5],
  ]), /Invalid AirYards/);
});

test("uses only AirYards rows and joins the Routes table despite header formatting", () => {
  const result = parseRouteCatalogSettings([
    ["routeType_AirYardsReqd_Quick", "Quick", 100, 200],
    ["routeType_AirYardsReqd_Short", "Short", 100, 200],
    ["", "AirYards", "routeType", "airyards min", "airyards max"],
    ["", "routeType_AirYardsReqd_Quick", "Quick", 1, 2],
    ["", "routeType_AirYardsReqd_Short", "Short", 3, 5],
    ["", "duplicate", " quick ", 1, 2],
    ["", "routeType_AirYardsReqd_Short-Mid", "Short-Mid", 6, 10],
    [],
    ["Routes", " quick ", "SHORT", "Short–Mid"],
    [],
    ["WR Screen", 1, "", ""],
    ["Flat", 1, 1, ""],
    ["Hitch", 1, 1, 1],
    ["In", "", "", 1],
    [],
    ["routeType_AirYardsReqd_Quick", "Quick", 100, 200],
  ]);
  assert.deepEqual(result.routeTypeAirYards.map(({ routeType, minAirYards }) => ({ routeType, minAirYards })), [
    { routeType: "Quick", minAirYards: 1 }, { routeType: "Short", minAirYards: 3 }, { routeType: "Short-Mid", minAirYards: 6 },
  ]);
  assert.deepEqual(result.routesByDepth, {
    Quick: ["WR Screen", "Flat", "Hitch"], Short: ["Flat", "Hitch"], "Short-Mid": ["Hitch", "In"],
  });
});

test("supports a Routes section title above its Route column header", () => {
  const result = parseRouteCatalogSettings([
    ["AirYards"], ["", "routeType", "airyards min", "airyards max"],
    ["range", "Quick", 1, 2], [],
    ["Routes"], [], ["Route", "Quick"], ["Flat", 1],
  ]);
  assert.deepEqual(result.routesByDepth, { Quick: ["Flat"] });
});

test("does not treat other prefixed Settings rows as an AirYards table", () => {
  assert.deepEqual(parseRouteCatalogSettings([["routeType_AirYardsReqd_Quick", "Quick", 1, 2]]),
    { routeTypeAirYards: [], routesByDepth: {} });
});

test("missing route matrix and conflicting duplicate depths produce clear errors", () => {
  const header = ["AirYards", "routeType", "airyards min", "airyards max"];
  const range = ["range", "Quick", 1, 2];
  assert.throws(() => parseRouteCatalogSettings([header, range]), /Missing Routes table/);
  assert.throws(() => parseRouteCatalogSettings([header, range, ["duplicate", "Quick", 3, 5]]), /Conflicting AirYards/);
});

test("the supplied nine-depth catalog has one option per depth and the correct route joins", () => {
  const depthNames = ["Quick", "Short", "Short-Mid", "Mid", "Mid-Long", "Long", "Deep", "Shot", "Bomb"];
  const ranges = [[1, 2], [3, 5], [6, 10], [11, 15], [16, 20], [21, 25], [26, 30], [31, 39], [40, "--"]];
  const matrix = [
    ["WR Screen", 1], ["Flat", 1, 1], ["Swing", 1, 1], ["Hitch", 1, 1, 1],
    ["Out", 1, 1, 1, 1, 1], ["Slant", 1, 1, 1, 1], ["Drag", 1, 1, 1],
    ["In", "", "", 1, 1, 1], ["Curl", "", "", 1, 1, 1],
    ["Dig", "", "", "", 1, 1, 1], ["Wheel", "", "", 1, 1, 1, 1],
    ["Comeback", "", "", "", "", 1, 1, 1],
    ["Corner", "", "", "", "", 1, 1, 1, 1, 1], ["Seam", "", "", "", "", 1, 1, 1, 1, 1],
    ["Fade", "", "", "", "", "", 1, 1, 1, 1], ["Go", "", "", "", "", "", 1, 1, 1, 1],
    ["Post", "", "", "", "", "", 1, 1, 1, 1], ["Sluggo", "", "", "", "", "", 1, 1, 1],
    ["Post Corner", "", "", "", "", "", "", "", 1, 1],
  ];
  const result = parseRouteCatalogSettings([
    ...depthNames.map((depth, index) => [`routeType_AirYardsReqd_${depth}`, depth, ...ranges[index]]),
    [], ["AirYards", "routeType", "airyards min", "airyards max"],
    ...depthNames.map((depth, index) => [`routeType_AirYardsReqd_${depth}`, depth, ...ranges[index]]),
    [], ["Routes", ...depthNames], ...matrix,
  ]);
  assert.deepEqual(result.routeTypeAirYards.map((range) => range.routeType), depthNames);
  assert.deepEqual(result.routesByDepth.Quick, ["WR Screen", "Flat", "Swing", "Hitch", "Out", "Slant", "Drag"]);
  assert.deepEqual(result.routesByDepth.Short, ["Flat", "Swing", "Hitch", "Out", "Slant", "Drag"]);
  assert.deepEqual(result.routesByDepth.Shot, ["Corner", "Seam", "Fade", "Go", "Post", "Sluggo", "Post Corner"]);
  assert.deepEqual(result.routesByDepth.Bomb, ["Corner", "Seam", "Fade", "Go", "Post", "Post Corner"]);
  assert.ok(depthNames.every((depth) => result.routesByDepth[depth].length > 0));
});
