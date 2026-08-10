import { useEffect, useMemo, useRef, useState } from "react";
import type { Player } from "../players/types";
import { PlayerImage } from "../players/PlayerImage";
import { leagueHeadlines } from "./leagueArticles";
import type { LeagueTeam } from "./types";

type Props = {
  teams: LeagueTeam[];
  players: Player[];
  onTeam: (team: LeagueTeam) => void;
  onPlayer: (player: Player) => void;
  onArticle: (index: number) => void;
};

const searchableTeamName = (team: LeagueTeam) =>
  [team.City, team.Location, team.Name, team.Nickname, team.Team, team.Abbrev]
    .filter(Boolean).join(" ");

export function LeagueSearch({ teams, players, onTeam, onPlayer, onArticle }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = query.trim().toLocaleLowerCase();
  const results = useMemo(() => ({
    teams: normalized ? teams.filter((team) => searchableTeamName(team).toLocaleLowerCase().includes(normalized)) : [],
    players: normalized ? players.filter((player) => `${player.Name ?? ""} ${player.Team ?? ""} ${player.Pos ?? ""}`.toLocaleLowerCase().includes(normalized)) : [],
    articles: normalized ? leagueHeadlines.map((headline, index) => ({ headline, index })).filter(({ headline }) => headline.toLocaleLowerCase().includes(normalized)) : [],
  }), [normalized, players, teams]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (action: () => void) => { action(); setOpen(false); setQuery(""); };
  const total = results.teams.length + results.players.length + results.articles.length;

  return (
    <div className={`league-search ${open ? "league-search--open" : ""}`} ref={rootRef} onKeyDown={(event) => event.key === "Escape" && setOpen(false)}>
      {!open ? (
        <button className="league-search__toggle" type="button" aria-label="Search teams, players, and articles" onClick={() => setOpen(true)}>
          <span aria-hidden="true">⌕</span>
        </button>
      ) : (
        <div className="league-search__control">
          <span aria-hidden="true">⌕</span>
          <input ref={inputRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teams, players, articles" aria-label="Search teams, players, and articles" />
          <button type="button" aria-label="Close search" onClick={() => { setOpen(false); setQuery(""); }}>×</button>
        </div>
      )}
      {open && normalized && (
        <div className="league-search__results" role="listbox" aria-label="Search results">
          {results.teams.length > 0 && <section><h3>Teams</h3>{results.teams.map((team) => <button type="button" key={String(team.ID ?? team.Team ?? team.Name)} onClick={() => choose(() => onTeam(team))}><img src={String(team.Logo ?? "")} alt="" /><span><strong>{searchableTeamName(team)}</strong><small>{team.Division ?? "League team"}</small></span></button>)}</section>}
          {results.players.length > 0 && <section><h3>Players</h3>{results.players.map((player, index) => <button type="button" key={`${player.Name}-${player.Team}-${index}`} onClick={() => choose(() => onPlayer(player))}><PlayerImage player={player} className="league-search__player-image" /><span><strong>{player.Name}</strong><small>{player.Team}{player.Pos ? ` · ${player.Pos}` : ""}</small></span></button>)}</section>}
          {results.articles.length > 0 && <section><h3>Articles</h3>{results.articles.map(({ headline, index }) => <button className="league-search__article" type="button" key={headline} onClick={() => choose(() => onArticle(index))}><strong>{headline}</strong></button>)}</section>}
          {total === 0 && <p className="league-search__empty">No teams, players, or articles found.</p>}
        </div>
      )}
    </div>
  );
}
