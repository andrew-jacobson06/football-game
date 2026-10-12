import test from "node:test";
import assert from "node:assert/strict";
import { hasSeasonActivity, seasonStatField, seasonStatValue } from "../src/components/league/seasonStats.ts";
import { parsePlayerStats } from "../../api/src/services/playerStats.ts";

test("the Stats tab reads the compact receiving and passing sheet headers directly", () => {
  const row = { Player: "WR", Tgt: "12", Rec: "8", RecYds: "1,200", RecTD: "3", YAC: "220", Comp: "5", Att: "9", "Pass Yds": "100" };
  for (const [field, value] of [["Targets", 12], ["Receptions", 8], ["Receiving Yards", 1200], ["Receiving TD", 3],
    ["Yards After Catch", 220], ["Completions", 5], ["Passing Attempts", 9], ["Passing Yards", 100]] as const)
    assert.equal(seasonStatValue(row, [field]), value);
  assert.equal(seasonStatField(row, ["Receiving Yards"]), "1,200");
});

test("receiving eligibility comes from receiving activity, not rushing totals or position", () => {
  assert.equal(hasSeasonActivity({ Player: "Runner", Yards: 932, TD: 4, Fum: 1, "First Down": 36, Rec: 0, RecYds: 0 }, "receiving"), false);
  assert.equal(hasSeasonActivity({ Player: "QB", RecYds: 12 }, "receiving"), true);
  assert.equal(hasSeasonActivity({ Player: "Target", Tgt: 1, Rec: 0 }, "receiving"), true);
  assert.equal(hasSeasonActivity({ Player: "Runner", Yards: 932, Carries: 10 }, "passing"), false);
  assert.equal(hasSeasonActivity({ Player: "WR", Att: 1 }, "passing"), true);
  assert.equal(seasonStatValue({ "First Down": 36 }, ["Receiving First Downs", "Rec First Downs"]), 0);
});

test("canonical API rows and raw sheet rows produce the same descending yardage leaders", () => {
  const headers = ["Player", "Yards", "Tgt", "Rec", "RecYds", "RecTD", "YAC", "Comp", "Att", "Pass Yds"];
  const values = [["Runner", 932, 0, 0, 0, 0, 0, 0, 0, 0], ["Receiver", 0, 10, 8, 120, 2, 40, 0, 0, 0],
    ["QB", 5, 2, 2, 20, 0, 5, 12, 20, 230]];
  const raw = values.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  for (const rows of [raw, parsePlayerStats([headers, ...values])]) {
    const receiving = rows.filter((row) => hasSeasonActivity(row, "receiving"))
      .sort((a, b) => seasonStatValue(b, ["Receiving Yards"]) - seasonStatValue(a, ["Receiving Yards"]));
    assert.deepEqual(receiving.map((row) => row.Player), ["Receiver", "QB"]);
    assert.equal(seasonStatValue(receiving[0], ["Targets"]), 10);
    assert.equal(seasonStatValue(receiving[0], ["Receptions"]), 8);
    assert.equal(seasonStatValue(receiving[0], ["Receiving TD"]), 2);
  }
});
