import { useEffect, useState } from "react";
import { getPlayoffBracket, type PlayoffSeed } from "../../api/client";
import type { LeagueGame, LeagueTeam } from "./types";
import { buildPlayoffBracket, playoffTeam, type BracketMatch, type BracketSlot } from "./playoffBracket";

export function LeaguePlayoffs({ postseason, teams, games, onTeam, onGame }: { postseason: boolean; teams: LeagueTeam[]; games: LeagueGame[]; onTeam: (team: LeagueTeam) => void; onGame: (game: LeagueGame) => void }) {
  const [seeds, setSeeds] = useState<PlayoffSeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!postseason) return;
    let active = true;
    getPlayoffBracket().then(result => { if (active) { setSeeds(result.seeds); setError(""); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load the playoff bracket."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postseason, attempt]);
  const bracket = buildPlayoffBracket(postseason ? seeds : [], teams, postseason ? games : []);
  function slot(row: BracketSlot, match?: BracketMatch) {
    const team = playoffTeam(row.seed, teams);
    const nickname = String(team?.Nickname ?? team?.Name ?? row.seed?.team ?? row.placeholder);
    const won = Boolean(row.seed && match?.winner?.team === row.seed.team);
    const content = <><span className="playoff-seed">{row.seed?.seed ?? "—"}</span>{team?.Logo ? <img src={String(team.Logo)} alt="" /> : <span className="playoff-logo-placeholder" aria-hidden="true">{row.seed?.team.slice(0, 2) ?? "?"}</span>}<span className="playoff-team-name">{nickname}</span>{match?.game && row.seed && <strong className="playoff-score">{bracket.score(match.game, row.seed)}</strong>}{won && <span className="playoff-winner-label">Winner</span>}</>;
    return team ? <button type="button" className={`playoff-team-row ${won ? "playoff-team-row--winner" : ""}`} onClick={() => onTeam(team)}>{content}</button>
      : <div className="playoff-team-row playoff-team-row--pending">{content}</div>;
  }
  function matchCard(match: BracketMatch) {
    return <section className="playoff-match" aria-label={match.title}><header><h3>{match.title}</h3><span>{match.game ? /^(FINAL|F)$/i.test(String(match.game.Qtr).trim()) ? "Final" : ["", "UNSTARTED"].includes(String(match.game.Qtr).toUpperCase()) ? "Upcoming" : "Live" : "Awaiting matchup"}</span></header>{match.slots.map((row, i) => <div key={i}>{slot(row, match)}</div>)}{match.game && <button type="button" className="postseason-action" onClick={() => onGame(match.game!)}>Gamecast →</button>}</section>;
  }
  return <main className="postseason-page"><header className="postseason-heading"><span>AFL POSTSEASON</span><h1>Playoffs</h1><p>Three seeds. Two division champions. One national champion.</p>{!postseason && <p>Playoff teams will be announced after the regular season.</p>}</header>
    {postseason && loading ? <p role="status">Loading playoff bracket…</p> : postseason && error ? <div role="alert"><p>{error}</p><button className="postseason-action" type="button" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>Retry</button></div> : <div className="playoff-layout">
      {bracket.divisions.map((division, index) => <section key={division.division} className={`playoff-division playoff-division--${index === 0 ? "east" : "west"}`} aria-label={`${division.division} bracket`}><h2>{division.division} Division</h2><section className="playoff-bye"><header><h3>No. 1 seed</h3><span>First-round bye</span></header>{slot({ seed: division.bye, placeholder: "No. 1 seed" })}</section>{matchCard(division.opening)}<div className="playoff-advance" aria-hidden="true">↓ Winner advances</div>{matchCard(division.championship)}</section>)}
      <section className="playoff-national" aria-label="National bracket">{matchCard(bracket.national)}{bracket.national.winner && <section className="playoff-champion"><span>NATIONAL CHAMPION</span>{slot({ seed: bracket.national.winner, placeholder: "Champion" })}</section>}</section>
    </div>}
  </main>;
}
