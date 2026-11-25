import test from "node:test";
import assert from "node:assert/strict";
import { prepareOvertime, overtimeState, resolveOvertime, needsOvertimeToss } from "../src/components/league/overtime.ts";
import { gameAfterToss } from "../src/components/league/gameStart.ts";
import { formatQuarter } from "../src/components/league/leagueMappers.ts";
import { kickFG, punt, spikeBall } from "../src/components/league/gameplay/gameEngine.ts";
import { buildResult } from "../src/components/league/gameplay/engine/playLogger.ts";
import { groupPlaysByDrive } from "../src/components/league/driveSummary.ts";
import { canAdvanceSeasonWeek } from "../src/components/league/seasonWeeks.ts";
import type { LeagueGame } from "../src/components/league/types.ts";
const regulation = (Week: number | string = 13): LeagueGame => ({GameId:1,Week,Home:"H",Away:"A",HomeScore:20,AwayScore:20,Qtr:4,Time:1,Down:1,Distance:10,BallOn:25,Possession:"Home",OpeningPossession:"Away"});
const ot = (Week: number | string = 13) => gameAfterToss(prepareOvertime(regulation(Week)),"Heads","Heads","receive");
const ctx = {players:[],settings:{},historyLength:0} as Parameters<typeof kickFG>[1];
const play = (prev: LeagueGame, changes:Partial<LeagueGame>, result="Normal")=>resolveOvertime(prev,{...prev,...changes},result);

test("tied fourth-quarter expiration enters a 900-second OT and a new toss; a regulation winner stays final",t=>{
 t.mock.method(console,"log",()=>{});
 const result=spikeBall(regulation(),ctx);
 assert.equal(result.game.Qtr,5);assert.equal(result.game.Time,900);assert.equal(needsOvertimeToss(result.game),true);assert.equal(overtimeState(result.game)?.phase,"toss");
 const winner=spikeBall({...regulation(),HomeScore:21},ctx);assert.equal(winner.game.Qtr,"FINAL");assert.equal(needsOvertimeToss(winner.game),false);
});
test("new OT toss preserves scores and picks the correct receiving team without changing regulation kickoff metadata",()=>{
 for(const result of ["Heads","Tails"] as const)for(const choice of ["receive","kick"] as const){
  const started=gameAfterToss(prepareOvertime(regulation()),"Heads",result,choice);
  const home=(result==="Heads")===(choice==="receive");
  assert.deepEqual([started.HomeScore,started.AwayScore,started.Qtr,started.Time],[20,20,5,900]);
  assert.equal(started.Possession,home?"Home":"Away");assert.equal(started.BallOn,home?25:75);assert.equal(started.OpeningPossession,"Away");assert.equal(overtimeState(started)?.phase,"playing");assert.equal(needsOvertimeToss(started),false);
 }
});
test("a TD wins immediately on either side, and an opening FG preserves the answering possession while time remains",()=>{
 const started=ot();
 for(const changes of [{HomeScore:26,Possession:"Away"},{AwayScore:26,Possession:"Away"}]) assert.equal(play(started,changes,"Touchdown").Qtr,"FINAL");
 const fg=play(started,{HomeScore:23,Possession:"Away",Time:700},"Kick FG");assert.equal(fg.Qtr,5);assert.deepEqual(overtimeState(fg)?.completed,["Home"]);
 const running=play(fg,{Time:660});assert.equal(running.Qtr,5);
 assert.equal(play(running,{AwayScore:26,Possession:"Home"},"Touchdown").Qtr,"FINAL");
 const tied=play(running,{AwayScore:23,Possession:"Home"},"Kick FG");assert.equal(tied.Qtr,5);assert.deepEqual(overtimeState(tied)?.completed,["Home","Away"]);
 assert.equal(play(tied,{HomeScore:26,Possession:"Away"},"Kick FG").Qtr,"FINAL");
});
test("a failed answering possession ends the game; a field goal after a scoreless opening drive wins",t=>{
 t.mock.method(console,"log",()=>{});t.mock.method(Math,"random",()=>0);
 const openingFG=kickFG({...ot(),BallOn:80},ctx).game;
 for(const result of ["Punt","Missed FG","Interception","Fumble","TO on Downs"]) assert.equal(play(openingFG,{Possession:"Home"},result).Qtr,"FINAL");
 const openingPunt=punt(ot(),ctx).game;assert.equal(openingPunt.Qtr,5);
 const winningFG=kickFG({...openingPunt,BallOn:20},ctx).game;assert.equal(winningFG.Qtr,"FINAL");assert.equal(winningFG.AwayScore,23);
 // Keeping a fumble on offense does not consume the answering possession.
 assert.equal(play(openingFG,{Time:600},"Fumble").Qtr,5);
});
test("the clock ends overtime: an opening-drive FG as time expires wins without an answering possession",t=>{
 t.mock.method(console,"log",()=>{});t.mock.method(Math,"random",()=>0);
 const winner=kickFG({...ot(),Time:3,BallOn:80},ctx).game;
 assert.equal(winner.Qtr,"FINAL");assert.equal(winner.Time,0);assert.equal(winner.HomeScore,23);assert.equal(overtimeState(winner)?.phase,"final");
 for(const Week of [13,"Divisionals"]){const expires=play(ot(Week),{Time:0,Qtr:"FINAL",HomeScore:23},"Normal");assert.equal(expires.Qtr,"FINAL");}
});
test("scoreless or tied OT ends regular games in a tie but starts another toss in every playoff round",t=>{
 t.mock.method(console,"log",()=>{});
 const regular=spikeBall({...ot(),Time:1},ctx).game;assert.equal(regular.Qtr,"FINAL");assert.equal(needsOvertimeToss(regular),false);
 for(const round of ["Divisionals","Divisional Championships","National Championship"]){
  const next=spikeBall({...ot(round),Time:1},ctx).game;assert.equal(next.Qtr,6);assert.equal(next.Time,900);assert.equal(overtimeState(next)?.period,2);assert.equal(needsOvertimeToss(next),true);
  const second=gameAfterToss(next,"Heads","Tails","receive");assert.equal(second.Possession,"Away");assert.equal(second.HomeScore,20);assert.deepEqual(overtimeState(second)?.completed,[]);
  const third=spikeBall({...second,Time:1},ctx).game;assert.equal(third.Qtr,7);assert.equal(overtimeState(third)?.period,3);
  assert.equal(canAdvanceSeasonWeek(round as "Divisionals",[third]),false);
 }
 const equalFGs=play(ot(),{HomeScore:23,AwayScore:23,Qtr:"FINAL",Time:0},"Kick FG");assert.equal(equalFGs.Qtr,"FINAL");
});
test("OT state survives a Sheets JSON round trip; old tied FINAL games can start OT, finished OT ties cannot",()=>{
 const started=ot();const resumed={...started,Overtime:JSON.stringify(started.Overtime)};
 assert.deepEqual(overtimeState(resumed),overtimeState(started));
 assert.equal(play(resumed,{HomeScore:26},"Touchdown").Qtr,"FINAL");
 assert.equal(needsOvertimeToss({...regulation(),Qtr:"FINAL"}),true);
 assert.equal(needsOvertimeToss({...resumed,Qtr:"FINAL",Overtime:{...overtimeState(resumed)!,phase:"final"}}),false);
 for(const value of ["bad JSON",{period:0,phase:"playing",completed:[]},{period:1,phase:"playing",completed:["Other"]}]) assert.equal(overtimeState({Overtime:value as never}),undefined);
});
test("OT play logging keeps the play's period and scores while the live game transitions to final or a new period",()=>{
 const previous=ot(), next={...previous,HomeScore:26};
 const result=buildResult(previous,next,"Run","Runner","",75,"DB","Touchdown",10);
 assert.equal(result.game.Qtr,"FINAL");assert.equal(result.play.qtr,5);assert.equal(result.play.homescore,26);
 assert.equal(formatQuarter(5),"OT");assert.equal(formatQuarter(6),"2OT");assert.equal(formatQuarter(7),"3OT");
});
test("OT drives split at the fresh period and final drive duration uses the actual OT clock",()=>{
 const history=[{possession:"Home",qtr:4,time:60,ballon:30,newballon:30,result:"Normal",playtype:"Run"},{possession:"Home",qtr:5,time:900,ballon:25,newballon:30,result:"Normal",playtype:"Run"}];
 const drives=groupPlaysByDrive(history,{...ot(),Qtr:"FINAL",Time:840});assert.equal(drives.length,2);assert.equal(drives[0].result,"End of Regulation");assert.equal(drives[1].duration,60);
});
