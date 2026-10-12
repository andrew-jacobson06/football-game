import test from "node:test";
import assert from "node:assert/strict";
import { parsePlayerStats } from "./playerStats.js";

const headers = "Player|Carries|Yards|TD|Fum|Fum Lost|First Down|Juke|BrokenTackle|Avg|Loss|5+|10+|20+|30+|50+|Long|OL W|OL L|OL Win %|Lead Blocks|DL W|DL L|DL Win %|Tackles|TFL|Sacks|FF|FR|INT|Defl|Fum Ret yds|Fum TD|INT|Int Ret Yds|Int TD|Safety Forced|Tgt|Rec|RecYds|RecTD|YAC|Comp|Att|Pass Yds|Pass TD|Pass INT|Sacks|Yds|".split("|");

test("the full new header exposes passing/receiving stats and separates duplicate columns", () => {
  const values: unknown[] = headers.map((_, index) => index);
  values[0] = "Player One";
  const [stats] = parsePlayerStats([headers, values]);
  assert.equal(stats.Player, "Player One");
  for (const [field, index] of [["Targets", 37], ["Receptions", 38], ["Receiving Yards", 39], ["Receiving TD", 40],
    ["Yards After Catch", 41], ["Completions", 42], ["Passing Attempts", 43], ["Passing Yards", 44],
    ["Passing TD", 45], ["Interceptions Thrown", 46], ["Sacks", 26], ["Sacked", 47], ["Sack Yards Lost", 48],
    ["Rushing Yards", 2], ["INT", 29], ["INT 2", 33]] as const) assert.equal(stats[field], String(index));
  assert.equal(Number(stats["Completion Percentage"]), 42 / 43 * 100);
  assert.equal(Number(stats["Receiving Average"]), 39 / 38);
});

test("zeroes, blanks and existing descriptive headers are preserved", () => {
  const [stats] = parsePlayerStats([["Player", "Completions", "Passing Attempts", "Passing Yards", "Sacked", "Receiving Yards"], ["QB", 0, 0, "", 0, 0], []]);
  assert.equal(stats.Completions, "0");
  assert.equal(stats["Passing Yards"], "");
  assert.equal(stats.Sacked, "0");
  assert.equal(stats["Passing Average"], "0");
  assert.deepEqual(parsePlayerStats([]), []);
});

test("explicit receiving totals win over compact alias columns in either order", () => {
  for (const values of [
    [["Player", "Receptions", "Receiving Yards", "Rec", "RecYds"], ["Koala", 5, 58, 0, 0]],
    [["Player", "Rec", "RecYds", "Receptions", "Receiving Yards"], ["Koala", 0, 0, 5, 58]],
  ]) {
    const [row] = parsePlayerStats(values);
    assert.equal(row.Receptions, "5");
    assert.equal(row["Receiving Yards"], "58");
    assert.equal(row["Receiving Average"], "11.6");
  }
});
