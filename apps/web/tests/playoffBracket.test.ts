import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlayoffBracket} from '../src/components/league/playoffBracket.ts';
import {awardNominees,NOMINEE_AWARDS,OFFENSE_HONORS,DEFENSE_HONORS} from '../src/components/league/awardModels.ts';
import type {LeagueGame} from '../src/components/league/types.ts';
const seeds=['East','West'].flatMap(division=>[1,2,3].map(seed=>({division,seed,team:division[0]+seed})));
const teams=seeds.map((s,i)=>({Abbrev:s.team,ID:i+1,Name:s.team+' nickname'}));
const game=(Week:string,Home:string,Away:string,HomeScore=20,AwayScore=10,Qtr='FINAL'):LeagueGame=>({GameId:Week+Home,Week,Home,Away,HomeScore,AwayScore,Qtr,Time:0,Down:1,Distance:10,BallOn:25,Possession:'Home'});
test('seed one receives a bye and two plays three in each division',()=>{
 const result=buildPlayoffBracket(seeds,teams,[]);
 for(const division of result.divisions){assert.equal(division.bye?.seed,1);assert.deepEqual(division.opening.slots.map(s=>s.seed?.seed),[2,3]);assert.equal(division.championship.slots[0].seed?.seed,1);assert.equal(division.championship.slots[1].seed,undefined);}
 assert.ok(result.national.slots.every(s=>s.seed===undefined));
});
test('final results advance actual winners through both divisions and the national championship',()=>{
 const games=[game('Divisionals','E3','E2'),game('Divisionals','W2','W3'),game('Divisional Championships','E1','E3'),game('Divisional Championships','W2','W1'),game('National Championship','E1','W2',10,20)];
 const result=buildPlayoffBracket(seeds,teams,games);
 assert.equal(result.divisions[0].opening.winner?.team,'E3');
 assert.equal(result.divisions[0].championship.slots[1].seed?.team,'E3');
 assert.deepEqual(result.national.slots.map(s=>s.seed?.team),['E1','W2']);
 assert.equal(result.national.winner?.team,'W2');
 assert.equal(result.score(games[0],seeds[1]),10);
});
test('live and tied games do not advance teams; metadata aliases match game participants',()=>{
 const live=buildPlayoffBracket(seeds,teams,[game('Divisionals','E2','E3',99,0,'4')]);
 assert.equal(live.divisions[0].opening.winner,undefined);
 const tied=buildPlayoffBracket(seeds,teams,[game('Divisionals','E2','E3',10,10)]);
 assert.equal(tied.divisions[0].opening.winner,undefined);
 const aliased=buildPlayoffBracket(seeds,teams,[game('Divisionals','E2 nickname','3')]);
 assert.equal(aliased.divisions[0].opening.winner?.team,'E2');
});
test('awards cap nominees at eight/five/five and exclude quarterbacks from OPOY',()=>{
 assert.deepEqual(NOMINEE_AWARDS.map(a=>a.limit),[8,5,5]);
 const nominees=Array.from({length:12},(_,i)=>({name:'Player '+i,position:i===0?'QB':i===1?'WR/QB':'WR',team:'E1'}));
 assert.equal(awardNominees('mvp',nominees).length,8);
 assert.equal(awardNominees('dpoy',nominees).length,5);
 const offense=awardNominees('opoy',nominees);assert.equal(offense.length,5);assert.ok(offense.every(c=>!c.position.includes('QB')));
 assert.deepEqual(OFFENSE_HONORS,['QB','RB','WR','WR','TE','OL','OL','OL','K']);
 assert.deepEqual(DEFENSE_HONORS,['DB','DB','DL','LB','LB','ANY','ANY']);
});
