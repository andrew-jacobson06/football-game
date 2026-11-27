import test from "node:test";
import assert from "node:assert/strict";
import { gameAfterToss, isPregame } from "../src/components/league/gameStart.ts";
import { PLAYOFF_ROUNDS } from "../src/components/league/seasonWeeks.ts";
import { spikeBall } from "../src/components/league/gameplay/gameEngine.ts";
import type { LeagueGame } from "../src/components/league/types.ts";
const pending = (Week: string | number): LeagueGame => ({ GameId: `game-${Week}`, Week, Home: "E1", Away: "W1", Qtr: "UNSTARTED", Time: "", HomeScore: "", AwayScore: "", Down: "", Distance: "", BallOn: "", Possession: "" });

test("all playoff rounds use the regular opening coin toss and field orientation",()=>{
 for (const round of [1, 13, ...PLAYOFF_ROUNDS]) for(const result of ["Heads","Tails"] as const) for(const choice of ["receive","kick"] as const){
  const original=pending(round),started=gameAfterToss(original,"Heads",result,choice);
  const homeReceives=(result==="Heads") === (choice==="receive");
  assert.equal(started.Possession,homeReceives?"Home":"Away");assert.equal(started.OpeningPossession,started.Possession);
  assert.equal(started.BallOn,homeReceives?25:75);assert.equal(started.DriveStart,started.BallOn);assert.equal(started.Previous,started.BallOn);
  assert.deepEqual([started.Qtr,started.Time,started.Down,started.Distance,started.HomeScore,started.AwayScore,started.HomeTimeouts,started.AwayTimeouts],[1,900,1,10,0,0,3,3]);
  assert.equal(started.Week,round);assert.equal(started.GameId,original.GameId);assert.equal(started.Home,"E1");assert.equal(started.Away,"W1");assert.equal(original.Qtr,"UNSTARTED");
  assert.equal(isPregame(started),false);
 }
});
test("pregame markers require a toss while live and final games resume without another toss",()=>{
 for(const Qtr of ["",0,"0","UNSTARTED","Pregame","PRE-GAME","not started"]) assert.equal(isPregame({Qtr}),true);
 for(const Qtr of [1,2,3,4,"OT","FINAL","F"]) assert.equal(isPregame({Qtr}),false);
});
test("after the toss playoff games run through the normal play and clock pipeline",t=>{
 t.mock.method(console,"log",()=>{});t.mock.method(console,"debug",()=>{});
 for(const round of PLAYOFF_ROUNDS){
  const game=gameAfterToss(pending(round),"Heads","Heads","receive");
  const result=spikeBall(game,{players:[],settings:{},historyLength:0} as Parameters<typeof spikeBall>[1]);
  assert.equal(result.game.Week,round);assert.equal(result.game.GameId,game.GameId);
  assert.equal(result.game.Qtr,1);assert.equal(result.game.Time,899);assert.equal(result.game.Down,2);assert.equal(result.game.Possession,"Home");
  assert.equal(result.play.gameid,game.GameId);
 }
});
