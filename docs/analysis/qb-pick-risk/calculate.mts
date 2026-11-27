/** From apps/api: node --import tsx ../../docs/analysis/qb-pick-risk/calculate.mts */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {getThrowTypeChances} from '../../../apps/web/src/components/league/gameplay/engine/qbAccuracy.ts';
import {routeJumpBaseChance,pickBaseChance} from '../../../apps/web/src/components/league/gameplay/engine/passInterception.ts';
const folder=fileURLToPath(new URL('.',import.meta.url));
const inputs=JSON.parse(fs.readFileSync(folder+'inputs.json','utf8'));
const definitions=[['0–39',20],['40–49',45],['50–59',55],['60–69',65],['70–79',75],['80–89',85],['90+',95]] as const;
const completions=[75,70,65,60,55,50];
const clamp=(pct:number)=>Math.max(0,Math.min(100,pct))/100;
const H=clamp((inputs.ballHawk/12)**2),basePick=pickBaseChance(inputs.ballHawk);
if(Math.abs(basePick-18.353240029120766)>1e-9)throw Error('Engine differs from the revised model for this snapshot.');
for(const [i,expected] of [25,23,19,17,12.5,7].entries())if(Math.abs(routeJumpBaseChance(99,definitions[i][1])-expected)>1e-6)throw Error('Read QB curves differ from the latest requested rebalance.');
const qbs=inputs.qbs.map((qb:{name:string,accuracy:number})=>{
 const weights=getThrowTypeChances(qb.accuracy);
 if(Math.abs(weights.reduce((s,r)=>s+r.chancePct,0)-100)>1e-9)throw Error('Invalid accuracy weights.');
 const bands=definitions.map(([band,openness])=>{
  let A=0,B=0;
  const quality=weights.map(row=>{
   const weight=row.chancePct/100;
   const beat=inputs.multipliers['DB beats WR to ball based on accuracy'].find((v:{throwType:string})=>v.throwType===row.throwType).multiplier;
   const pick=inputs.multipliers['Pick Multiplier based on accuracy'].find((v:{throwType:string})=>v.throwType===row.throwType).multiplier;
   const J=clamp(routeJumpBaseChance(inputs.readQB,openness)*beat),K=clamp(basePick*pick);
   const secondary=['Close','Catchable','Off Target'].includes(row.throwType)?H*K:0;
   A+=weight*J*K;B+=weight*(1-J)*secondary;
   return {throwType:row.throwType,throwTypeChancePct:row.chancePct,jumpChancePct:J*100,pickGivenJumpChancePct:K*100,secondaryPickGivenIncompletePct:secondary*100};
  });
  const totalsByCompletionPct=Object.fromEntries(completions.map(c=>[c,(A+(1-c/100)*B)*100]));
  if(band==='90+'&&A!==0)throw Error('Wide-open route jump must be zero.');
  for(const c of completions)if(totalsByCompletionPct[c]<A*100||totalsByCompletionPct[c]>100)throw Error('Invalid risk.');
  return {band,routeJumpPickChancePct:A*100,secondaryFactorPct:B*100,totalsByCompletionPct,quality};
 });
 return {...qb,throwTypes:weights,bands};
});
const output={source_file:inputs.source_file,source_sha256:inputs.source_sha256,model:'Latest rebalanced Read QB curves with user-updated accuracy multipliers',multipliers:inputs.multipliers,settings_override:inputs.settings_override,readQB:inputs.readQB,ballHawk:inputs.ballHawk,completion_rates:completions,bands:definitions.map(x=>x[0]),base_pick_pct:basePick,ball_hawk_gate_pct:H*100,quarterbacks:qbs};
fs.writeFileSync(folder+'results.json',JSON.stringify(output,null,2));
for(const c of completions){
 const lines=[['QB','Accuracy',...definitions.map(x=>x[0]+' pick chance (%)')].join(',')];
 for(const qb of qbs)lines.push([qb.name,qb.accuracy,...qb.bands.map(b=>b.totalsByCompletionPct[c])].join(','));
 fs.writeFileSync(folder+'revised-completion-'+c+'.csv','\ufeff'+lines.join('\n')+'\n');
}
console.log('Calculated 6 matrices × 12 QBs × 7 bands; probability bounds and normalized accuracy weights verified.');
