import { test } from "node:test";
import assert from "node:assert/strict";
import { planSeasonAdvance, seasonAdvanceWrites } from "./seasonProgression.js";
import { parseSeasonWeek, nextSeasonWeek, gameSeasonWeek, canAdvanceSeasonWeek } from "../../../web/src/components/league/seasonWeeks.js";
import type { LeagueGame } from "../../../web/src/components/league/types.js";
const game = (week: number | string, id = String(week), home = "E1", away = "E2", hs = 10, as = 0): LeagueGame => ({ GameId: id, Week: week, Home: home, Away: away, HomeScore: hs, AwayScore: as, Qtr: "FINAL", Time: 0, Down: 1, Distance: 10, BallOn: 25, Possession: "Home" });
const games = Array.from({length:13},(_,i)=>game(i+1));
const teams = ["E1","E2","E3","E4","W1","W2","W3","W4"].map(Abbrev=>({Abbrev,Division:Abbrev.startsWith("E")?"East":"West"}));
const standings = teams.map(team=>({"":team.Abbrev, W:5,L:5,T:0, DIFF:team.Abbrev.endsWith("4")?1000:0}));
const bracket = [["Division","Seed","Team"],["East",1,""],["East",2,""],["East",3,""],["West",1,""],["West",2,""],["West",3,""]];

test("regular weeks and each named round parse consistently and advance in order",()=>{
  assert.equal(parseSeasonWeek("13"),13);
  assert.equal(parseSeasonWeek(" divisional championships "),"Divisional Championships");
  assert.equal(parseSeasonWeek(14),null);
  assert.equal(parseSeasonWeek(""),null);
  assert.equal(nextSeasonWeek(12),13);
  assert.equal(nextSeasonWeek(13),"Divisionals");
  assert.equal(nextSeasonWeek("Divisionals"),"Divisional Championships");
  assert.equal(nextSeasonWeek("Divisional Championships"),"National Championship");
  assert.equal(nextSeasonWeek("National Championship"),null);
  assert.equal(nextSeasonWeek(99),null);
  assert.equal(gameSeasonWeek(game("Divisionals")),"Divisionals");
});

test("week 13 requires all thirteen weeks, not just week 13, to be final",()=>{
  assert.equal(canAdvanceSeasonWeek(13,games),true);
  assert.equal(canAdvanceSeasonWeek(13,games.slice(1)),false);
  const unfinished=games.map(g=>g.Week===1?{...g,Qtr:4}:g);
  assert.throws(()=>planSeasonAdvance(13,unfinished,standings,teams,bracket),/All 13/);
  assert.throws(()=>planSeasonAdvance(13,games.slice(1),standings,teams,bracket),/All 13/);
  assert.throws(()=>planSeasonAdvance("Divisionals",[]),/all of its games/);
});

test("seeds exactly three per division using shared head-to-head standings tiebreakers",()=>{
  const regular = [...games.map(g=>({...g,Home:"OUTSIDE1",Away:"OUTSIDE2"})),game(1,"e21","E2","E1",20,0),game(2,"e13","E1","E3",20,0),game(3,"e23","E2","E3",20,0)];
  const rows=standings.map(s=>({...s,"Win%":s[""].endsWith("4")?"0%":"50%"}));
  // West ties use differential; East head-to-head puts E2 above E1.
  rows.find(s=>s[""]==="W2")!.DIFF=20;
  rows.find(s=>s[""]==="W3")!.DIFF=10;
  const plan=planSeasonAdvance(13,regular,rows,teams,bracket);
  assert.equal(plan.nextWeek,"Divisionals");
  assert.deepEqual(plan.bracketValues,[["E2"],["E1"],["E3"],["W2"],["W3"],["W1"]]);
  assert.deepEqual(seasonAdvanceWrites(plan,"Season!B2"),[
    {range:"'Playoff Bracket'!C2:C7",values:plan.bracketValues},
    {range:"Season!B2",values:[["Divisionals"]]},
  ]);
});

test("regular advances and later rounds only update Season Week, never reseeding",()=>{
  assert.deepEqual(seasonAdvanceWrites(planSeasonAdvance(12,games),"Season!B2"),[{range:"Season!B2",values:[[13]]}]);
  for(const [round,next] of [["Divisionals","Divisional Championships"],["Divisional Championships","National Championship"]] as const){
    const plan=planSeasonAdvance(round,[game(round,"66"),game(round,"67")]);
    assert.equal(plan.nextWeek,next);
    assert.equal(plan.bracketValues,undefined);
    assert.deepEqual(seasonAdvanceWrites(plan,"Season!D5"),[{range:"Season!D5",values:[[next]]}]);
    assert.throws(()=>planSeasonAdvance(round,[{...game(round),Qtr:4}]),/all of its games/);
  }
  assert.throws(()=>planSeasonAdvance("National Championship",[game("National Championship")]),/final round/);
  assert.equal(canAdvanceSeasonWeek("National Championship",[game("National Championship")]),false);
});

test("bracket validation prevents partial, duplicate or missing seed writes",()=>{
  assert.throws(()=>planSeasonAdvance(13,games,standings,teams,[]),/headers/);
  const duplicate=structuredClone(bracket);duplicate[2][1]=1;
  assert.throws(()=>planSeasonAdvance(13,games,standings,teams,duplicate),/exactly once/);
  assert.throws(()=>planSeasonAdvance(13,games,standings.slice(0,2),teams,bracket),/at least three/);
});

test("existing bracket row order and labels are respected; source data is unchanged",()=>{
  const before=structuredClone({games,standings,teams,bracket});
  const reordered=[bracket[0],...bracket.slice(1).reverse()];
  const normal=planSeasonAdvance(13,games,standings,teams,bracket);
  const reversed=planSeasonAdvance(13,games,standings,teams,reordered);
  assert.deepEqual(reversed.bracketValues,[...normal.bracketValues!].reverse());
  assert.deepEqual({games,standings,teams,bracket},before);
});
