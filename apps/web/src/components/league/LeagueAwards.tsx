import { awardNominees, NOMINEE_AWARDS, OFFENSE_HONORS, DEFENSE_HONORS, type AwardCandidate, type NomineeAwardId } from "./awardModels";

/** Nominations, voting and selected honors will be supplied by the future awards workflow. */
export function LeagueAwards({ visible, nominations = {}, firstTeams = {}, defenseByDivision = true }: {
  visible: boolean;
  nominations?: Partial<Record<NomineeAwardId, AwardCandidate[]>>;
  firstTeams?: Record<string, Array<AwardCandidate | undefined>>;
  defenseByDivision?: boolean;
}) {
  if (!visible) return null;
  const honors = (side: "offense" | "defense", division: string) => {
    const slots = side === "offense" ? OFFENSE_HONORS : DEFENSE_HONORS;
    const selections = firstTeams[`${division}:${side}`] ?? [];
    return <section className="honors-card" key={`${division}:${side}`}><h3>{division} first-team {side}</h3><table><thead><tr><th scope="col">Position</th><th scope="col">Player</th><th scope="col">Team</th></tr></thead><tbody>{slots.map((slot, i) => <tr key={`${slot}-${i}`}><th scope="row">{slot}</th><td>{selections[i]?.name ?? <span className="honor-pending">Selection pending</span>}</td><td>{selections[i]?.team ?? "—"}</td></tr>)}</tbody></table></section>;
  };
  return <main className="postseason-page"><header className="postseason-heading"><span>AFL SEASON HONORS</span><h1>League Awards</h1><p>Season honors and award nominees.</p></header>
    <div className="award-nominees-grid">{NOMINEE_AWARDS.map(award => {
      const candidates = awardNominees(award.id, nominations[award.id] ?? []);
      return <section className="award-card" key={award.id}><div className="award-card-heading"><span>{award.limit} candidates</span><h2>{award.title}</h2><p>{award.eligibility}</p></div>
        {candidates.length ? <><ol className="award-candidates">{candidates.map((candidate, i) => <li key={`${candidate.name}-${i}`}><strong>{candidate.name}</strong><span>{candidate.position} · {candidate.team}</span>{candidate.votes !== undefined && <small>{candidate.votes} votes</small>}</li>)}</ol></> : <p className="award-empty">Nominees to be announced.</p>}
        <button className="postseason-action" type="button" disabled title="Voting is not open yet">Run vote</button><p className="award-vote-status">Voting is not open yet.</p>
      </section>;
    })}</div>
    <section className="honors-section"><h2>First-team offense</h2><p>Selected for each division. The three OL honors recognize blocking regardless of position.</p><div className="honors-grid">{["East", "West"].map(division => honors("offense", division))}</div></section>
    <section className="honors-section"><h2>First-team defense</h2><p>ANY honors can go to any defensive position.</p><div className="honors-grid">{(defenseByDivision ? ["East", "West"] : ["League"]).map(division => honors("defense", division))}</div></section>
  </main>;
}
