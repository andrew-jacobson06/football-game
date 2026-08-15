const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "driveSummary.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "drive-summary-"));
const compiledPath = path.join(temporaryDirectory, "driveSummary.cjs");
fs.writeFileSync(compiledPath, compiled);
const { driveEndYard, driveYardsFromSpots } = require(compiledPath);

test("home touchdown ignores a recorded post-score 25-yard spot", () => {
  const end = driveEndYard("Home", "Touchdown", 25);
  assert.equal(end, 100);
  assert.equal(driveYardsFromSpots("Home", 25, end), 75);
});

test("away touchdown ignores a recorded post-score 25-yard spot", () => {
  const end = driveEndYard("Away", "Touchdown", 75);
  assert.equal(end, 0);
  assert.equal(driveYardsFromSpots("Away", 75, end), 75);
});

test("non-touchdown drives retain their recorded ending spot", () => {
  assert.equal(driveEndYard("Home", "Punt", 62), 62);
});
