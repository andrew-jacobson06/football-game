import { AWARD_COUNTS, AwardsError, parseAwards, rankCandidates, tallyBallots, nominationWrites, type AwardId, type AwardPlayer, type AwardsSheet } from "./awards.js";
import { generateBallots, generateNominations, type GenerateAwardsJSON } from "./awardsAI.js";
export type AwardsDependencies = {
  read:()=>Promise<unknown[][]>;
  write:(updates:Array<{range:string;values:unknown[][]}>)=>Promise<unknown>;
  context:()=>Promise<{players:AwardPlayer[];standings:unknown;games:unknown}>;
  generate?:GenerateAwardsJSON;
};
export function awardView(sheet: AwardsSheet,players:AwardPlayer[]){
  const detail=(name:string)=>{const p=players.find(p=>p.name.toLowerCase()===name.toLowerCase());return {name,team:p?.team??"",position:p?.position??""};};
  const nominations=Object.fromEntries(Object.keys(AWARD_COUNTS).map(award=>{
    const group=sheet.candidates.filter(c=>c.award===award), ranked=rankCandidates(group.filter(c=>c.name));
    const complete=group.every(c=>c.name && c.placeVotes.reduce((sum,v)=>sum+v,0)===125) && Array.from({length:group.length},(_,i)=>group.reduce((sum,c)=>sum+c.placeVotes[i],0)).every(n=>n===125);
    const tied=complete && ranked.length>1 && ranked[0].total===ranked[1].total && ranked[0].placeVotes.every((v,i)=>v===ranked[1].placeVotes[i]);
    return [award.toLowerCase(),{candidates:ranked.map(c=>({...detail(c.name),placeVotes:c.placeVotes,total:c.total})),complete,winner:complete&&!tied?ranked[0]?.name:null,tied}];
  }));
  return {nominations,firstTeams:sheet.firstTeams.map(h=>({...h,...detail(h.name),position:h.position}))};
}
export async function prepareAwardNominations(rows:unknown[][],context:Awaited<ReturnType<AwardsDependencies['context']>>,generate?:GenerateAwardsJSON){
  const sheet=parseAwards(rows);
  const answer=await generateNominations(sheet,context.players,context.standings,context.games,generate);
  return nominationWrites(sheet,answer,context.players);
}
export async function runAwardVote(award:AwardId,deps:AwardsDependencies){
  const original=await deps.read(),sheet=parseAwards(original);
  const group=sheet.candidates.filter(c=>c.award===award);
  if(group.some(c=>!c.name)) throw new AwardsError(`All ${AWARD_COUNTS[award]} ${award} candidates must be populated before voting.`);
  if(group.some(c=>c.placeVotes.some(n=>n!==0))) throw new AwardsError("Votes already exist for this award. Clear its place-vote cells in Awards before running a new vote.");
  const context=await deps.context();
  if(group.some(c=>!context.players.some(p=>p.name===c.name))) throw new AwardsError("Every award candidate must match a player in the roster.");
  const ballots=await generateBallots(award,group,context.players,context.standings,context.games,deps.generate);
  const results=tallyBallots(group,ballots);
  // Avoid overwriting sheet edits made while the model was voting.
  if(JSON.stringify((await deps.read()))!==JSON.stringify(original)) throw new AwardsError("Awards changed during voting. No votes were saved; reload and try again.");
  // Column K belongs to the workbook's Total formulas. Never overwrite it.
  await deps.write(results.map(c=>({range:`'Awards'!C${c.row}:J${c.row}`,values:[c.placeVotes]})));
  return awardView(parseAwards(await deps.read()),context.players);
}
