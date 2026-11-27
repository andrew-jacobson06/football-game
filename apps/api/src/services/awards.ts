/** Awards are read by section headers, never by hard-coded row offsets. */
export const AWARD_COUNTS = { MVP: 8, OPOY: 5, DPOY: 5 } as const;
export type AwardId = keyof typeof AWARD_COUNTS;
export class AwardsError extends Error {}
const text = (v: unknown) => String(v ?? "").trim();
const key = (v: unknown) => text(v).toLowerCase();
export type Candidate = { row: number; name: string; award: AwardId; placeVotes: number[]; total: number };
export type Honor = { row: number; position: string; side: string; division: string; name: string };
export type AwardsSheet = { candidates: Candidate[]; firstTeams: Honor[] };
export function parseAwards(rows: unknown[][]): AwardsSheet {
  const candidateHeader = rows.findIndex(r => key(r[0]) === "candidate" && key(r[1]) === "award");
  const honorHeader = rows.findIndex(r => key(r[0]) === "position" && key(r[1]) === "side" && key(r[2]) === "division" && key(r[3]) === "player name");
  if (candidateHeader < 0 || honorHeader <= candidateHeader || key(rows[candidateHeader][10]) !== "total" || !Array.from({length:8}, (_,i)=>String(i+1)).every((v,i)=>text(rows[candidateHeader][i+2])===v))
    throw new AwardsError("Awards needs Candidate / Award / 1–8 / Total and Position / Side / Division / Player Name headers.");
  const count = (v: unknown, row: number) => {
    const n = Number(text(v).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) throw new AwardsError(`Invalid Awards vote count at row ${row}.`);
    return n;
  };
  const points = (v: unknown, row: number) => {
    const n = Number(text(v).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) throw new AwardsError(`Invalid Awards Total formula result at row ${row}.`);
    return n;
  };
  const candidates: Candidate[] = [], firstTeams: Honor[] = [];
  rows.forEach((r,i) => {
    const award = text(r[1]).toUpperCase() as AwardId;
    if (i > candidateHeader && i < honorHeader && Object.hasOwn(AWARD_COUNTS, award)) {
      const placeVotes = Array.from({length:8},(_,p)=>count(r[p+2],i+1));
      candidates.push({row:i+1,name:text(r[0]),award,placeVotes,total:points(r[10],i+1)});
    }
    if (i > honorHeader && text(r[0])) {
      const side = key(r[1]), division = text(r[2]);
      if (!["offense","defense"].includes(side) || !["east","west"].includes(key(division))) throw new AwardsError(`Invalid first-team slot at Awards row ${i+1}.`);
      firstTeams.push({row:i+1,position:text(r[0]),side,division:key(division)==="east"?"East":"West",name:text(r[3])});
    }
  });
  for (const [award,n] of Object.entries(AWARD_COUNTS)) {
    const group = candidates.filter(c=>c.award===award);
    if (group.length!==n) throw new AwardsError(`Awards needs exactly ${n} ${award} candidate rows.`);
    const names = group.filter(c=>c.name).map(c=>key(c.name));
    if (new Set(names).size!==names.length) throw new AwardsError(`Duplicate ${award} candidates in Awards.`);
  }
  for (const division of ["East", "West"]) for (const side of ["offense", "defense"])
    if (!firstTeams.some(h=>h.division===division && h.side===side)) throw new AwardsError(`Awards is missing ${division} first-team ${side} slots.`);
  return {candidates,firstTeams};
}
/** Sheet formulas supply total points; place counts break total-point ties. */
export function rankCandidates(candidates: readonly Candidate[]) {
  return [...candidates].sort((a,b)=> b.total-a.total || a.placeVotes.reduce((diff,v,i)=>diff || b.placeVotes[i]-v,0));
}
export function tallyBallots(candidates: readonly Candidate[], ballots: unknown) {
  if (!Array.isArray(ballots) || ballots.length!==125) throw new AwardsError("AI voting must return exactly 125 complete ranked ballots.");
  const results=candidates.map(c=>({...c,placeVotes:Array(8).fill(0) as number[],total:0}));
  const names=new Map(results.map(c=>[key(c.name),c]));
  if (names.size!==results.length || results.some(c=>!c.name)) throw new AwardsError("All candidates must be named before voting.");
  for(const ballot of ballots) {
    if(!Array.isArray(ballot) || ballot.length!==results.length || new Set(ballot.map(key)).size!==results.length || ballot.some(name=>!names.has(key(name)))) throw new AwardsError("Each AI ballot must rank every candidate exactly once.");
    ballot.forEach((name,place)=>{const c=names.get(key(name))!; c.placeVotes[place]++;});
  }
  return results;
}
export type AwardPlayer = { name:string; team:string; position:string; division:string; stats:Record<string,unknown> };
export function awardsPlayers(players:Record<string,unknown>[],stats:Record<string,unknown>[],teams:Record<string,unknown>[],assignments:Record<string,unknown>[]) : AwardPlayer[] {
  return players.filter(p=>text(p.Name)).map(p=>{
    const teamName=assignments.find(a=>key(a.Name)===key(p.Name))?.Team ?? p.Team;
    const team=teams.find(t=>[t.Abbrev,t.Team,t.Name,t.ID].some(v=>key(v)===key(teamName)));
    return {name:text(p.Name),team:text(team?.Abbrev??teamName),position:text(p.Pos??p.Position),division:text(team?.Division).replace(/\s+division$/i,""),stats:stats.find(s=>key(s.Player??s.Name)===key(p.Name))??{}};
  });
}
/** Validate AI selections against the roster and existing sheet slots before any write. */
export function nominationWrites(sheet: AwardsSheet, answer: unknown, players: AwardPlayer[]) {
  const a=answer as {nominations?:Record<string,unknown>;firstTeams?:Array<{row:number;name:string}>};
  if (!a || !a.nominations || !Array.isArray(a.firstTeams)) throw new AwardsError("AI nominations are missing awards or first teams.");
  const player=(name:unknown)=>{const matches=players.filter(p=>key(p.name)===key(name));if(matches.length!==1) throw new AwardsError(`AI selected an unknown or ambiguous player: ${text(name)}.`);return matches[0];};
  const writes:Array<{range:string;values:unknown[][]}>=[];
  for(const [award,n] of Object.entries(AWARD_COUNTS)) {
    const names=a.nominations[award];
    if(!Array.isArray(names)||names.length!==n||new Set(names.map(key)).size!==n) throw new AwardsError(`AI must nominate ${n} distinct ${award} players.`);
    const group=sheet.candidates.filter(c=>c.award===award);
    names.forEach((name,i)=>{
      const p=player(name);
      if(award==="OPOY" && /\bQB\b|quarterback/i.test(p.position)) throw new AwardsError("OPOY cannot nominate a quarterback.");
      writes.push({range:`'Awards'!A${group[i].row}`,values:[[p.name]]});
      writes.push({range:`'Awards'!C${group[i].row}:J${group[i].row}`,values:[Array(8).fill(0)]});
    });
  }
  if(a.firstTeams.length!==sheet.firstTeams.length || new Set(a.firstTeams.map(h=>h.row)).size!==sheet.firstTeams.length) throw new AwardsError("AI must select every first-team slot exactly once.");
  const used=new Set<string>();
  for(const slot of sheet.firstTeams) {
    const selection=a.firstTeams.find(h=>h.row===slot.row);
    const p=player(selection?.name);
    if(key(p.division)!==key(slot.division)) throw new AwardsError(`First-team player ${p.name} is not in ${slot.division}.`);
    if(!["blocker","ol","any"].includes(key(slot.position)) && !p.position.toUpperCase().split(/[^A-Z]+/).includes(slot.position.toUpperCase())) throw new AwardsError(`Invalid ${slot.position} selection: ${p.name}.`);
    const id=`${slot.division}:${slot.side}:${key(p.name)}`;
    if(used.has(id)) throw new AwardsError("First teams cannot select the same player twice on the same side.");
    used.add(id);
    writes.push({range:`'Awards'!D${slot.row}`,values:[[p.name]]});
  }
  return writes;
}
