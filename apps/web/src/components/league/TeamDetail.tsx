import { useEffect, useMemo, useState } from "react";
import { getTeamPlayers, type PlayerStats, type TeamPlayer } from "../../api/client";
import { PlayerImage } from "../players/PlayerImage";
import type { LeagueGame, LeagueTeam } from "./types";
import { computeWinPct, parseInteger } from "./leagueMappers";

type TeamSection = "overview" | "stats" | "schedule" | "roster";

function teamLabel(team: LeagueTeam) { return String(team.Name || team.Team || team.Nickname || team.Abbrev || "AFL Team"); }
function key(value: unknown) { return String(value ?? "").trim().toLowerCase(); }
function ordinal(value: number) {
  const mod100 = value % 100;
  return `${value}${mod100 >= 11 && mod100 <= 13 ? "th" : value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th"}`;
}
function numericStat(stats: PlayerStats | null | undefined, names: string[]) {
  if (!stats) return 0;
  const entry = Object.entries(stats).find(([name]) => names.includes(key(name).replace(/[^a-z0-9]/g, "")));
  return Number(String(entry?.[1] ?? 0).replace(/,/g, "")) || 0;
}
function stars(player: TeamPlayer, side: "off" | "def") {
  return Number(player[side === "off" ? "Off Stars" : "Def Stars"]) || 0;
}

export function TeamDetail({ team, standings, games, onBack, onGame }: { team: LeagueTeam; standings: LeagueTeam[]; games: LeagueGame[]; onBack: () => void; onGame: (game: LeagueGame) => void }) {
  const [section, setSection] = useState<TeamSection>("stats");
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [rosterError, setRosterError] = useState("");
  const id = String(team.Abbrev || team.Team || team.Name || "AFL");
  const standing = standings.find((row) => key(row.Abbrev ?? row.Team) === key(id)) ?? team;
  const name = teamLabel({ ...team, ...standing });
  const teamGames = useMemo(() => games.filter((game) => key(game.Home) === key(id) || key(game.Away) === key(id)), [games, id]);

  useEffect(() => {
    getTeamPlayers(id).then((result) => {
      setPlayers(result.players);
      setRosterError("");
    }).catch((error: unknown) => setRosterError(error instanceof Error ? error.message : "Unable to load roster"));
  }, [id]);

  const division = String(standing.Division ?? "").trim();
  const divisionRows = standings.filter((row) => key(row.Division) === key(division)).sort((a, b) => Number(computeWinPct(b)) - Number(computeWinPct(a)) || parseInteger(b.Wins) - parseInteger(a.Wins));
  const divisionPlace = divisionRows.findIndex((row) => key(row.Abbrev ?? row.Team) === key(id));
  const record = `${standing.Wins ?? 0}-${standing.Losses ?? 0}${parseInteger(standing.Ties) ? `-${standing.Ties}` : ""}`;
  const hasStats = players.some((player) => player.Stats && Object.entries(player.Stats).some(([field, value]) => !["player", "name", "team"].includes(key(field)) && (Number(String(value).replace(/,/g, "")) || 0) !== 0));
  const leaderSpecs = [
    { label: "Passing", positions: ["qb"], fields: ["passingyards", "passyards", "passyds"], side: "off" as const },
    { label: "Rushing", positions: ["rb", "qb"], fields: ["yards", "rushingyards", "rushyards"], side: "off" as const },
    { label: "Receiving", positions: ["wr", "te"], fields: ["receivingyards", "recyards", "receptions"], side: "off" as const },
    { label: "Defense", positions: ["dl", "de", "lb", "cb", "s", "db"], fields: ["tackles", "total", "sacks", "interceptions"], side: "def" as const },
  ];
  const leaders = leaderSpecs.map((spec) => {
    const eligible = players.filter((player) => spec.positions.includes(key(player.Pos ?? player.DefPos)));
    const pool = eligible.length ? eligible : players;
    return [...pool].sort((a, b) => hasStats ? numericStat(b.Stats, spec.fields) - numericStat(a.Stats, spec.fields) || stars(b, spec.side) - stars(a, spec.side) : stars(b, spec.side) - stars(a, spec.side))[0];
  });
  const statColumns = [...new Set(players.flatMap((player) => Object.keys(player.Stats ?? {})))].filter((column) => !["player", "name", "team"].includes(key(column)));

  return <main className="team-page">
    <button className="team-page-back" type="button" onClick={onBack}>← All teams</button>
    <header className="team-page-hero">{team.Logo ? <img src={String(team.Logo)} alt="" /> : <div className="team-page-crest">{id.slice(0, 2)}</div>}<div><span>AFL TEAM</span><h1>{name}</h1><p>{record} · {divisionPlace >= 0 ? `${ordinal(divisionPlace + 1)} in ${division}` : division || "2026 Regular Season"}</p></div></header>
    <nav className="team-page-nav" aria-label={`${name} sections`}>{(["overview", "stats", "schedule", "roster"] as TeamSection[]).map((item) => <button type="button" className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}>{item}</button>)}</nav>
    {section === "stats" ? <section className="team-stats-shell">
      <header className="team-stats-heading"><div><span>2026 REGULAR SEASON</span><h2>{name} Player Stats</h2></div></header>
      <h3>Team Leaders</h3>
      {rosterError ? <p className="players-message players-message--error">{rosterError}</p> : <div className="team-leaders">{leaders.map((leader, index) => leader && <article key={`${leader.Name}-${index}`}><small>{leaderSpecs[index].label}</small><PlayerImage player={leader} className="leader-avatar" /><p><b>{leader.Name}</b> <em>{leader.Pos || leader.DefPos}</em></p><strong>{hasStats ? numericStat(leader.Stats, leaderSpecs[index].fields) : `${stars(leader, leaderSpecs[index].side)}★`}</strong></article>)}</div>}
      <section className="team-stat-group"><h3>Season Stats</h3><div className="team-stat-scroll"><table><thead><tr><th>NAME</th>{statColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{players.map((player) => <tr key={String(player.Name)}><td><a>{player.Name}</a> <small>{player.Pos || player.DefPos}</small></td>{statColumns.map((column) => <td key={column}>{player.Stats?.[column] || "—"}</td>)}</tr>)}</tbody></table></div>{!players.length && !rosterError && <p>Loading roster…</p>}{players.length > 0 && !statColumns.length && <p>No season statistics have been recorded yet. Leaders are based on player star ratings.</p>}</section>
    </section> : section === "schedule" ? <section className="team-simple-panel"><h2>{name} Schedule</h2>{teamGames.length ? teamGames.map((game) => <button type="button" key={game.GameId} onClick={() => onGame(game)}>{game.Away} at {game.Home}<span>{game.Date || `Week ${game.Week || "—"}`} · Gamecast ›</span></button>) : <p>No games have been scheduled.</p>}</section> : section === "roster" ? <section className="team-simple-panel"><h2>{name} Roster</h2>{players.map((player) => <p key={String(player.Name)}><b>{player.Name}</b> · {player.Pos || player.DefPos || "Player"}</p>)}</section> : <section className="team-simple-panel"><h2>{name} Overview</h2><p>{record} · {divisionPlace >= 0 ? `${ordinal(divisionPlace + 1)} in ${division}` : division}</p></section>}
  </main>;
}
