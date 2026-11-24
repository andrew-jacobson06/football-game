import test from "node:test";
import assert from "node:assert/strict";
import {parseAwards,tallyBallots,rankCandidates,nominationWrites,awardsPlayers,AWARD_COUNTS} from "./awards.js";
import {runAwardVote,awardView,prepareAwardNominations} from "./awardsWorkflow.js";

function fixture(){return [ ["AWARDS","","Place Votes"], ["Candidate","Award",1,2,3,4,5,6,7,8,"Total"],
 ...Object.entries(AWARD_COUNTS).flatMap(([award,n])=>Array.from({length:n},(_,i)=>[`${award}${i}`,award,0,0,0,0,0,0,0,0,0])),
 [],["FIRST TEAMS"],["Position","Side","Division","Player Name"],
 ...["East","West"].flatMap(d=>[["QB","Offense",d,""],["RB","Offense",d,""],["RB","Offense",d,""],["Blocker","Offense",d,""],["ANY","Defense",d,""]]) ];}
const players=()=>Object.entries(AWARD_COUNTS).flatMap(([award,n])=>Array.from({length:n},(_,i)=>({name:`${award}${i}`,team:"E1",position:award==="MVP"?"QB":award==="OPOY"?"RB":"DB",division:"East",stats:{}})));
test("Awards sections accept blank candidates and repeated first-team slots; reject malformed counts and duplicates",()=>{
 const rows=fixture(); rows[2][0]="";const sheet=parseAwards(rows);
 assert.equal(sheet.candidates.length,18);assert.equal(sheet.candidates[0].name,"");assert.equal(sheet.firstTeams.length,10);assert.equal(sheet.firstTeams[2].position,"RB");
 const bad=fixture();bad[3][0]=bad[2][0];assert.throws(()=>parseAwards(bad),/Duplicate/);
 const votes=fixture();votes[2][2]=-1;assert.throws(()=>parseAwards(votes),/Invalid/);
 assert.throws(()=>parseAwards([["Candidate","Award"]]),/headers/);
});
test("125 complete ballots produce place counts only; reject missing, duplicate and unknown candidates",()=>{
 const group=parseAwards(fixture()).candidates.filter(c=>c.award==="OPOY");
 const names=group.map(c=>c.name), ballots=Array.from({length:125},()=>names);
 const result=tallyBallots(group,ballots);assert.deepEqual(result.map(c=>c.placeVotes.slice(0,5)),Array.from({length:5},(_,i)=>Array.from({length:5},(_,j)=>i===j?125:0)));
 assert.ok(result.every(c=>c.total===0)); // Only workbook formulas calculate points.
 assert.throws(()=>tallyBallots(group,ballots.slice(1)),/125/);
 for(const invalid of [[...names.slice(1),names[1]],[...names.slice(1),"unknown"],names.slice(1)]) assert.throws(()=>tallyBallots(group,[invalid,...ballots.slice(1)]),/exactly once/);
});
test("ranking uses sheet Total first, then first-place, second-place, through last-place counts",()=>{
 const base=parseAwards(fixture()).candidates[0];
 const a={...base,name:"A",total:100,placeVotes:[2,1,3,0,0,0,0,0]}, b={...a,name:"B",placeVotes:[2,2,0,0,0,0,0,0]},c={...a,name:"C",total:101};
 assert.deepEqual(rankCandidates([a,b,c]).map(c=>c.name),["C","B","A"]);
 const x={...a,name:"X",placeVotes:[2,1,3,0,0,0,0,1]};assert.equal(rankCandidates([a,x])[0].name,"X");
});
test("roster joins current team assignment and season stats",()=>{
 const result=awardsPlayers([{Name:"A",Team:"OLD",Pos:"WR"}],[{Player:"A",RecYds:1200}],[{Abbrev:"NEW",Division:"West"}],[{Name:"A",Team:"NEW"}]);
 assert.equal(result[0].team,"NEW");assert.equal(result[0].division,"West");assert.equal(result[0].stats.RecYds,1200);
});
test("vote workflow gets five batches, preserves Total formulas, reloads totals, rejects reruns",async()=>{
 const rows=fixture(), writes:Array<{range:string;values:unknown[][]}>=[];let calls=0;
 const deps={read:async()=>rows,context:async()=>({players:players(),games:[],standings:[]}),generate:async()=>{calls++;return {ballots:Array.from({length:25},()=>Array.from({length:5},(_,i)=>`OPOY${i}`))};},write:async(updates:typeof writes)=>{writes.push(...updates);for(const u of updates){const row=Number(u.range.match(/C(\d+)/)![1])-1;rows[row].splice(2,8,...u.values[0] as number[]);rows[row][10]=rows[row][2] as number*99;}}};
 const result=await runAwardVote("OPOY",deps);assert.equal(calls,5);assert.equal(writes.length,5);assert.ok(writes.every(w=>/^'Awards'!C\d+:J\d+$/.test(w.range)));
 const award=result.nominations.opoy;assert.equal(award.complete,true);assert.equal(award.winner,"OPOY0");assert.equal(award.candidates[0].total,12375);
 await assert.rejects(()=>runAwardVote("OPOY",deps),/already exist/);
});
test("invalid AI ballots and concurrent edits never write partial votes",async()=>{
 for(const bad of [true,false]){const rows=fixture();let reads=0,writes=0;
 await assert.rejects(()=>runAwardVote("DPOY",{read:async()=>{reads++;return reads>1?[...rows,[]]:rows;},write:async()=>{writes++;},context:async()=>({players:players(),standings:[],games:[]}),generate:async()=>({ballots:Array.from({length:25},()=>bad?["fake"]:Array.from({length:5},(_,i)=>`DPOY${i}`))})}),bad?/exactly once/:/changed/);
 assert.equal(writes,0);}
});
test("nominations validate roster, non-QB OPOY, division and repeated honor slots without writing Total",async()=>{
 const rows=fixture(),sheet=parseAwards(rows), roster=players();
 for(const division of ["East","West"]) for(const [i,position] of ["QB","RB","RB","K","DB"].entries()) roster.push({name:`${division}${i}`,division,position,team:division[0],stats:{}});
 const answer={nominations:Object.fromEntries(Object.entries(AWARD_COUNTS).map(([award,n])=>[award,Array.from({length:n},(_,i)=>`${award}${i}`)])),firstTeams:sheet.firstTeams.map((h,i)=>({row:h.row,name:`${h.division}${i%5}`}))};
 const updates=await prepareAwardNominations(rows,{players:roster,standings:[],games:[]},async()=>answer);
 assert.equal(updates.length,46);assert.ok(updates.every(u=>!u.range.includes(":K")));
 assert.ok(updates.filter(u=>u.range.includes(":J")).every(u=>u.values[0].length===8));
 const qb=structuredClone(answer);qb.nominations.OPOY[0]="MVP0";assert.throws(()=>nominationWrites(sheet,qb,roster),/quarterback/);
 const wrong=structuredClone(answer);wrong.firstTeams[0].name="West0";assert.throws(()=>nominationWrites(sheet,wrong,roster),/not in East/);
 const unknown=structuredClone(answer);unknown.nominations.MVP[0]="Missing";assert.throws(()=>nominationWrites(sheet,unknown,roster),/unknown/);
});
test("unresolved total and place-count ties do not declare an arbitrary winner",()=>{
 const sheet=parseAwards(fixture());const group=sheet.candidates.filter(c=>c.award==="OPOY");
 group.forEach(c=>{c.total=400;c.placeVotes=[25,25,25,25,25,0,0,0];});
 const result=awardView(sheet,players()).nominations.opoy;assert.equal(result.complete,true);assert.equal(result.tied,true);assert.equal(result.winner,null);
});
