import test from "node:test";
import assert from "node:assert/strict";
import { playValueForHeader, sheetSafe } from "../../api/src/services/playHistory.ts";
import { logPlayToDB, playFlag } from "../src/components/league/gameplay/engine/playLogger.ts";

const headers = "gameid|playid|time|qtr|possession|down|distance|ballon|playtype|player|receiver|yards|defensepredicted|predictioncorrect|tackler|result|isSack|defenseresult|turnover|description|recoveredby|isComplete|airyards|YAC|newdown|newdist|newballon|drivestart|homescore|awayscore|lineMatchups|olWins|olLosses|dlWins|dlLosses|leadblocker|jukes|trucks|brokentackles|stopReason|runlog|fatigueRecovery".split("|");
const game = { GameId: 1, Home: "Home", Away: "Away", HomeScore: 0, AwayScore: 0, Time: 600, Qtr: 1, Down: 1, Distance: 10, BallOn: 30, Possession: "Home" };

test("every new PlayHistory header resolves to a logged field with zero/false and JSON metadata intact", () => {
  const extra = { isSack: false, isComplete: true, airyards: 10, yac: 5, lineMatchups: [{ offensePlayer: "OL", defensePlayer: "DL", winner: "OL" }], olWins: 1, dlLosses: 1,
    runLog: ["play log"], stopReason: "throw", fatigueRecovery: { players: ["WR"] } };
  const play = logPlayToDB(game, game, "Pass", "QB", "WR", 15, "DB", "First Down", 0, extra);
  const values = headers.map((header) => {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    assert.ok(Object.keys(play).some((field) => normalize(field) === normalize(header)), `Missing ${header}`);
    assert.notEqual(playValueForHeader(play, header), undefined, header);
    return sheetSafe(playValueForHeader(play, header));
  });
  assert.equal(values[headers.indexOf("isSack")], false);
  assert.equal(values[headers.indexOf("isComplete")], true);
  assert.equal(values[headers.indexOf("YAC")], 5);
  assert.equal(values[headers.indexOf("olLosses")], 0);
  assert.equal(values[headers.indexOf("brokentackles")], 0);
  assert.deepEqual(JSON.parse(String(values[headers.indexOf("lineMatchups")])), extra.lineMatchups);
  assert.deepEqual(JSON.parse(String(values[headers.indexOf("fatigueRecovery")])), extra.fatigueRecovery);
  assert.deepEqual(JSON.parse(String(values[headers.indexOf("runlog")])), extra.runLog);
});

test("run and special-team plays have explicit false flags and zero YAC", () => {
  for (const type of ["Run", "Punt", "Field Goal", "Timeout"] as const) {
    const play = logPlayToDB(game, game, type, "Player", "", 0, "", "Normal", 0);
    assert.equal(play.isSack, false);
    assert.equal(play.isComplete, false);
    assert.equal(play.yac, 0);
  }
  assert.equal(playValueForHeader({ ISSACK: true }, "isSack"), true);
  assert.equal(playFlag("FALSE", true), false);
  assert.equal(playFlag("TRUE", false), true);
  assert.equal(playFlag("", true), true); // Old rows retain their result-based behavior.
});
