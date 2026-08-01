import { useMemo, useState } from "react";
import type { LeagueGame, LeagueTeam } from "./types";

type TeamSection = "overview" | "stats" | "schedule" | "roster";
type StatRow = { name: string; pos: string; values: (string | number)[] };

const statGroups: { title: string; columns: string[]; rows: StatRow[] }[] = [
  { title: "Passing", columns: ["GP", "CMP", "ATT", "CMP%", "YDS", "AVG", "YDS/G", "LNG", "TD", "INT", "RTG"], rows: [
    { name: "Marcus Cole", pos: "QB", values: [17, 356, 521, "68.3", "4,218", "8.1", "248.1", 72, 31, 9, "106.4"] },
    { name: "Evan Brooks", pos: "QB", values: [6, 42, 68, "61.8", 487, "7.2", "81.2", 44, 3, 2, "88.7"] },
  ]},
  { title: "Rushing", columns: ["GP", "CAR", "YDS", "AVG", "LNG", "BIG", "TD", "YDS/G", "FUM", "FD"], rows: [
    { name: "Darius King", pos: "RB", values: [17, 284, "1,426", "5.0", 61, 14, 13, "83.9", 2, 72] },
    { name: "Marcus Cole", pos: "QB", values: [17, 82, 476, "5.8", 29, 5, 6, "28.0", 3, 31] },
    { name: "Jaylen Price", pos: "RB", values: [15, 96, 421, "4.4", 38, 4, 3, "28.1", 1, 22] },
    { name: "Andre Bell", pos: "WR", values: [17, 12, 91, "7.6", 24, 1, 1, "5.4", 0, 6] },
  ]},
  { title: "Receiving", columns: ["GP", "REC", "TGTS", "YDS", "AVG", "TD", "LNG", "BIG", "YDS/G", "YAC", "FD"], rows: [
    { name: "Andre Bell", pos: "WR", values: [17, 94, 132, "1,287", "13.7", 9, 58, 18, "75.7", 486, 61] },
    { name: "Malik Reed", pos: "WR", values: [16, 72, 103, 978, "13.6", 7, 49, 12, "61.1", 312, 45] },
    { name: "Noah Grant", pos: "TE", values: [17, 58, 76, 681, "11.7", 6, 37, 7, "40.1", 223, 38] },
  ]},
  { title: "Defense", columns: ["GP", "SOLO", "AST", "TOT", "SACK", "TFL", "PD", "INT", "YDS", "FF", "FR"], rows: [
    { name: "Isaiah Ward", pos: "LB", values: [17, 79, 54, 133, "4.5", 11, 6, 1, 18, 2, 1] },
    { name: "Cam Turner", pos: "S", values: [17, 64, 39, 103, "1.0", 5, 10, 4, 76, 2, 0] },
    { name: "Dante Lewis", pos: "CB", values: [16, 52, 21, 73, 0, 2, 17, 5, 112, 1, 1] },
    { name: "Bryce Stone", pos: "DE", values: [17, 39, 24, 63, "10.5", 14, 3, 0, 0, 3, 2] },
  ]},
  { title: "Scoring", columns: ["GP", "RUSH", "REC", "RET", "TD", "FG", "PAT", "2PT", "PTS", "PTS/G"], rows: [
    { name: "Luke Mason", pos: "K", values: [17, 0, 0, 0, 0, 29, 46, 0, 133, "7.8"] },
    { name: "Darius King", pos: "RB", values: [17, 13, 1, 0, 14, 0, 0, 0, 84, "4.9"] },
    { name: "Andre Bell", pos: "WR", values: [17, 1, 9, 0, 10, 0, 0, 0, 60, "3.5"] },
  ]},
];

function teamLabel(team: LeagueTeam) { return String(team.Name || team.Team || team.Nickname || team.Abbrev || "AFL Team"); }

export function TeamDetail({ team, games, onBack, onGame }: { team: LeagueTeam; games: LeagueGame[]; onBack: () => void; onGame: (game: LeagueGame) => void }) {
  const [section, setSection] = useState<TeamSection>("stats");
  const id = String(team.Abbrev || team.Team || team.Name || "AFL");
  const name = teamLabel(team);
  const teamGames = useMemo(() => games.filter((game) => game.Home === id || game.Away === id), [games, id]);
  const leaders = [statGroups[0].rows[0], statGroups[1].rows[0], statGroups[2].rows[0], statGroups[3].rows[0]];
  const leaderLabels = ["Passing Yards", "Rushing Yards", "Receiving Yards", "Tackles"];
  const leaderValues = ["4,218", "1,426", "1,287", "133"];

  return <main className="team-page">
    <button className="team-page-back" type="button" onClick={onBack}>← All teams</button>
    <header className="team-page-hero">
      {team.Logo ? <img src={String(team.Logo)} alt="" /> : <div className="team-page-crest">{id.slice(0, 2)}</div>}
      <div><span>AFL TEAM</span><h1>{name}</h1><p>{team.Wins ?? 0}-{team.Losses ?? 0} · 2026 Regular Season</p></div>
    </header>
    <nav className="team-page-nav" aria-label={`${name} sections`}>
      {(["overview", "stats", "schedule", "roster"] as TeamSection[]).map((item) => <button type="button" className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}>{item}</button>)}
    </nav>
    {section === "stats" ? <section className="team-stats-shell">
      <header className="team-stats-heading"><div><span>2026 REGULAR SEASON</span><h2>{name} Player Stats</h2></div><button type="button">2026 Regular Season⌄</button></header>
      <div className="team-stats-mode"><strong>Players</strong><span>Team</span></div>
      <h3>Team Leaders</h3>
      <div className="team-leaders">{leaders.map((leader, index) => <article key={leader.name}><small>{leaderLabels[index]}</small><div className="leader-avatar">{leader.name.split(" ").map((part) => part[0]).join("")}</div><p><b>{leader.name}</b> <em>{leader.pos}</em></p><strong>{leaderValues[index]}</strong></article>)}</div>
      {statGroups.map((group) => <section className="team-stat-group" key={group.title}><h3>{group.title}</h3><div className="team-stat-scroll"><table><thead><tr><th>NAME</th>{group.columns.map((column) => <th className={column === "YDS" || column === "TOT" || column === "PTS" ? "sorted" : ""} key={column}>{column}</th>)}</tr></thead><tbody>{group.rows.map((row) => <tr key={row.name}><td><a>{row.name}</a> <small>{row.pos}</small></td>{row.values.map((value, index) => <td className={group.columns[index] === "YDS" || group.columns[index] === "TOT" || group.columns[index] === "PTS" ? "sorted" : ""} key={index}>{value}</td>)}</tr>)}</tbody></table></div></section>)}
      <p className="stats-updated">Statistics are updated after every game</p>
    </section> : section === "schedule" ? <section className="team-simple-panel"><h2>{name} Schedule</h2>{teamGames.length ? teamGames.map((game) => <button type="button" key={game.GameId} onClick={() => onGame(game)}>{game.Away} at {game.Home}<span>{game.Date || `Week ${game.Week || "—"}`} · Gamecast ›</span></button>) : <p>No games have been scheduled.</p>}</section> : <section className="team-simple-panel"><h2>{name} {section === "roster" ? "Roster" : "Overview"}</h2><p>This section will be available during the 2026 season.</p></section>}
  </main>;
}
