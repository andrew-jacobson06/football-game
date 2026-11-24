import { useEffect, useState } from "react";
import { getLeagueAwards, runLeagueAwardVote, type LeagueAwardsData } from "../../api/client";
import { NOMINEE_AWARDS, OFFENSE_HONORS, DEFENSE_HONORS, type NomineeAwardId } from "./awardModels";

const empty: LeagueAwardsData = { nominations: {}, firstTeams: [] };
export function LeagueAwards({ postseason }: { postseason: boolean }) {
  const [data, setData] = useState<LeagueAwardsData>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [voting, setVoting] = useState<NomineeAwardId | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!postseason) return;
    let active = true;
    setLoading(true);
    getLeagueAwards().then(result => { if (active) { setData(result); setError(""); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load awards."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postseason, attempt]);
  async function vote(award: NomineeAwardId) {
    setVoting(award); setError("");
    try { setData(await runLeagueAwardVote(award)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to run voting."); }
    finally { setVoting(null); }
  }
  const current = postseason ? data : empty;
  const honors = (side: "offense" | "defense", division: string) => {
    const selected = current.firstTeams.filter(h => h.side === side && h.division === division);
    // Real sheet rows define the lineup, including repeated slots. Defaults keep the season layout visible.
    const slots = selected.length ? selected : (side === "offense" ? OFFENSE_HONORS : DEFENSE_HONORS).map(position => ({ position, name: "", team: "" }));
    return <section className="honors-card" key={`${division}:${side}`}><h3>{division} first-team {side}</h3><table><thead><tr><th scope="col">Position</th><th scope="col">Player</th><th scope="col">Team</th></tr></thead><tbody>{slots.map((slot, i) => <tr key={i}><th scope="row">{slot.position}</th><td>{slot.name || <span className="honor-pending">Selection pending</span>}</td><td>{slot.team || "—"}</td></tr>)}</tbody></table></section>;
  };
  return <main className="postseason-page"><header className="postseason-heading"><span>AFL SEASON HONORS</span><h1>League Awards</h1><p>Season honors and award nominees.</p>{!postseason && <p>Candidates and selections will be announced after the regular season.</p>}</header>
    {postseason && loading && <p role="status">Loading awards…</p>}
    {error && <div role="alert"><p>{error}</p><button type="button" className="postseason-action" disabled={Boolean(voting)} onClick={() => setAttempt(n => n + 1)}>Reload awards</button></div>}
    <div className="award-nominees-grid">{NOMINEE_AWARDS.map(award => {
      const result = current.nominations[award.id], candidates = result?.candidates ?? [];
      const started = candidates.some(c => c.placeVotes.some(n => n > 0));
      return <section className="award-card" key={award.id}><div className="award-card-heading"><span>{award.limit} candidates</span><h2>{award.title}</h2><p>{award.eligibility}</p></div>
        {result?.winner && <p className="award-winner"><strong>Winner: {result.winner}</strong></p>}
        {result?.tied && <p className="award-winner">Tied after all place-vote tiebreakers.</p>}
        {candidates.length ? <ol className="award-candidates">{candidates.map(candidate => <li key={candidate.name}><strong>{candidate.name}</strong><span>{[candidate.position, candidate.team].filter(Boolean).join(" · ")}</span><small>{candidate.total.toLocaleString()} points</small>{started && <small>{candidate.placeVotes.slice(0, award.limit).map((n,i) => `${i + 1}: ${n}`).join(" · ")} (place: votes)</small>}</li>)}</ol> : <p className="award-empty">Nominees to be announced.</p>}
        <button className="postseason-action" type="button" disabled={!postseason || loading || Boolean(voting) || candidates.length !== award.limit || started} onClick={() => void vote(award.id)}>{voting === award.id ? "Voting…" : "Run vote"}</button>
        <p className="award-vote-status" role={voting === award.id ? "status" : undefined}>{voting === award.id ? "Generating 125 ranked ballots. This may take a few minutes." : result?.complete ? "125 ballots counted. Ranked by points, then votes at each place." : started ? "Votes already recorded in Awards." : "125 ranked ballots per award."}</p>
      </section>;
    })}</div>
    <section className="honors-section"><h2>First-team offense</h2><p>Selected for each division. Blocker honors recognize blocking regardless of position.</p><div className="honors-grid">{["East", "West"].map(division => honors("offense", division))}</div></section>
    <section className="honors-section"><h2>First-team defense</h2><p>ANY honors can go to any defensive position.</p><div className="honors-grid">{["East", "West"].map(division => honors("defense", division))}</div></section>
  </main>;
}
