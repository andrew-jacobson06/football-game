import { useEffect, useMemo, useState } from "react";
import { getPlayers, getPlayerStats, type PlayerStats } from "../../api/client";
import { PlayerImage } from "../players/PlayerImage";
import type { Player } from "../players/types";
import type { LeagueTeam } from "./types";

type StatsView = "Player" | "Team";
type CompleteView = "rushing" | "tackling" | "team-total" | "team-passing" | "team-rushing" | null;
type Leader = { name: string; detail?: string; image?: string; player?: Player; value: number };
type Category = { title: string; label: string; fields: string[]; positions?: string[] };
type StatColumn = { label: string; fields: string[] };
type TeamTotal = { team: LeagueTeam; rows: PlayerStats[]; gp: number; passing: number; rushing: number; total: number; sacks: number; turnovers: number; allowed: number };

const OFFENSE: Category[] = [
  { title: "PASSING", label: "YDS", fields: ["Passing Yards", "Pass Yards", "PassYards"], positions: ["QB"] },
  { title: "RUSHING", label: "YDS", fields: ["Yards", "Rushing Yards", "Rush Yards"] },
  { title: "RECEIVING", label: "YDS", fields: ["Receiving Yards", "Rec Yards", "RecYards"], positions: ["WR", "TE", "RB"] },
];
const DEFENSE: Category[] = [
  { title: "TACKLES", label: "TOT", fields: ["Tackles", "Total Tackles", "TOT"] },
  { title: "SACKS", label: "SACK", fields: ["Sacks", "Sack"] },
  { title: "INTERCEPTIONS", label: "INT", fields: ["Interceptions", "INT"] },
];
const TEAM_OFFENSE: Category[] = [
  { title: "TOTAL YARDS", label: "YDS/G", fields: ["total"] },
  { title: "PASSING", label: "YDS/G", fields: ["passing"] },
  { title: "RUSHING", label: "YDS/G", fields: ["rushing"] },
];
const TEAM_DEFENSE: Category[] = [
  { title: "YARDS ALLOWED", label: "YDS/G", fields: ["allowed"] },
  { title: "SACKS", label: "SACK", fields: ["sacks"] },
  { title: "TURNOVERS", label: "DIFF", fields: ["turnovers"] },
];
const RUSHING_COLUMNS = ["Carries", "Yards", "TD", "Fum", "Fum Lost", "First Down", "Juke", "BrokenTackle", "Avg", "Loss", "5+", "10+", "20+", "30+", "50+", "Long"] as const;
const DEFENSIVE_COLUMNS: StatColumn[] = [
  { label: "Tackles", fields: ["Tackles", "Total Tackles", "TOT"] },
  { label: "TFL", fields: ["TFL", "Tackles For Loss", "TacklesForLoss"] },
  { label: "FF", fields: ["FF", "Forced Fumbles", "ForcedFumbles"] },
  { label: "Sacks", fields: ["Sacks", "Sack"] },
  { label: "FR", fields: ["FR", "Fumble Recoveries", "FumbleRecoveries"] },
  { label: "INT", fields: ["INT", "Interceptions"] },
  { label: "Defl", fields: ["Defl", "Deflections", "Passes Defended", "PassDeflections"] },
];

const normalized = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const number = (value: unknown) => Number(String(value ?? 0).replace(/,/g, "")) || 0;
function statValue(row: PlayerStats, fields: string[]) {
  const wanted = new Set(fields.map(normalized));
  const match = Object.entries(row).find(([field]) => wanted.has(normalized(field)));
  return number(match?.[1]);
}
function displayStat(row: PlayerStats, fields: readonly string[]) {
  const wanted = new Set(fields.map(normalized));
  return String(Object.entries(row).find(([field]) => wanted.has(normalized(field)))?.[1] || "0");
}
function teamName(team: LeagueTeam) { return String(team.Name || team.Team || team.Nickname || team.Abbrev || "Team"); }
const teamGames = (team: LeagueTeam) => number(team.GP || team.Games || 1) || 1;
function teamField(team: LeagueTeam, fields: string[]) { return statValue(team as PlayerStats, fields); }

function LeaderTable({ category, leaders, loading, error, onComplete }: { category: Category; leaders: Leader[]; loading: boolean; error: string | null; onComplete?: () => void }) {
  return <section className="leader-group">
    <table className="leader-table">
      <thead><tr><th>{category.title}</th><th>{category.label}</th></tr></thead>
      <tbody>{loading || error || !leaders.length ? <tr><td className="leader-message" colSpan={2}>{loading ? "Loading leaders…" : error || "No statistics recorded yet."}</td></tr> : leaders.map((leader, index) => <tr key={`${category.title}-${leader.name}`}>
        <td className="leader-identity"><span className="rank">{index + 1}</span>{leader.player ? <PlayerImage player={leader.player} className="player-stats-image" /> : leader.image ? <img className="team-stats-logo" src={leader.image} alt="" /> : <span className="team-stats-logo-fallback">{leader.name.slice(0, 2)}</span>}<span><b>{leader.name}</b>{leader.detail && <small>{leader.detail}</small>}</span></td>
        <td className="stat-value">{leader.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
      </tr>)}</tbody>
    </table>
    {onComplete && !loading && !error && leaders.length > 0 && <div className="complete-link"><button type="button" onClick={onComplete}>Complete Leaders</button></div>}
  </section>;
}

function TeamCompleteTable({ mode, rows, onBack }: { mode: "total" | "passing" | "rushing"; rows: TeamTotal[]; onBack: () => void }) {
  const columns = mode === "total" ? ["TOTAL YDS", "YDS/G", "PASS YDS", "YDS/G", "RUSH YDS", "YDS/G"] : mode === "passing" ? ["CMP", "ATT", "CMP%", "YDS", "AVG", "YDS/G", "TD", "INT", "SACK"] : ["ATT", "YDS", "AVG", "YDS/G", "TD", "FUM", "LST"];
  return <section className="team-complete-view">
    <div className="team-stat-nav"><b>Offense</b><span>Defense</span><span>Special Teams</span><span>Turnovers</span></div>
    <div className="team-stat-filters"><button type="button">{mode === "total" ? "Total" : mode === "passing" ? "Passing" : "Rushing"}⌄</button><button type="button">Season 1 Regular Season⌄</button></div>
    <button className="team-table-back" type="button" onClick={onBack}>← Back to stat leaders</button>
    <div className="complete-leaders-table-scroll"><table className="team-complete-table"><thead><tr><th>TEAM</th><th>GP</th>{columns.map((column, index) => <th key={`${column}-${index}`}>{column}</th>)}</tr></thead><tbody>{rows.map((row) => {
      const sum = (fields: string[]) => row.rows.reduce((n, stat) => n + statValue(stat, fields), 0);
      const attempts = sum(mode === "passing" ? ["Pass Attempts", "Attempts", "ATT"] : ["Carries", "Rushing Attempts"]);
      const values = mode === "total" ? [row.total, row.total / row.gp, row.passing, row.passing / row.gp, row.rushing, row.rushing / row.gp] : mode === "passing" ? [sum(["Completions", "CMP"]), attempts, attempts ? 100 * sum(["Completions", "CMP"]) / attempts : 0, row.passing, attempts ? row.passing / attempts : 0, row.passing / row.gp, sum(["Passing TD", "Pass TD", "TD Passes"]), sum(["Interceptions Thrown", "Pass INT"]), sum(["Sacked", "Times Sacked"])] : [attempts, row.rushing, attempts ? row.rushing / attempts : 0, row.rushing / row.gp, sum(["Rushing TD", "Rush TD", "TD"]), sum(["Fum", "Fumbles"]), sum(["Fum Lost", "Fumbles Lost"])];
      return <tr key={teamName(row.team)}><td><span className="team-table-name">{row.team.Logo && <img src={String(row.team.Logo)} alt="" />}{teamName(row.team)}</span></td><td>{row.gp}</td>{values.map((value, index) => <td key={index}>{Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}</td>)}</tr>;
    })}</tbody></table></div>
  </section>;
}

export function LeagueStats({ teams }: { teams: LeagueTeam[] }) {
  const [activeView, setActiveView] = useState<StatsView>("Player");
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completeView, setCompleteView] = useState<CompleteView>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => { Promise.all([getPlayerStats(), getPlayers()]).then(([statsResult, playersResult]) => { setStats(statsResult.playerStats); setPlayers(playersResult.players); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load statistics")).finally(() => setLoading(false)); }, []);

  const playerByName = useMemo(() => new Map(players.map((player) => [normalized(player.Name), player])), [players]);
  const teamByKey = useMemo(() => new Map(teams.flatMap((team) => [team.Abbrev, team.Team, team.Name].filter(Boolean).map((value) => [normalized(value), team] as const))), [teams]);
  const teamTotals = useMemo<TeamTotal[]>(() => teams.map((team) => {
    const keys = [team.Abbrev, team.Team, team.Name].filter(Boolean).map(normalized);
    const rows = stats.filter((row) => keys.includes(normalized(playerByName.get(normalized(row.Player))?.Team)));
    const sum = (fields: string[]) => rows.reduce((total, row) => total + statValue(row, fields), 0);
    const passing = sum(["Passing Yards", "Pass Yards", "PassYards"]);
    const rushing = sum(["Yards", "Rushing Yards", "Rush Yards"]);
    return { team, rows, gp: teamGames(team), passing, rushing, total: passing + rushing, sacks: sum(["Sacks", "Sack"]), turnovers: teamField(team, ["Turnover Differential", "TurnoverDiff", "DIFF", "Takeaways"]) || sum(["Interceptions", "INT", "Fumble Recoveries", "FR"]), allowed: teamField(team, ["Yards Allowed", "YardsAllowed", "YDS Allowed", "YDSA"]) };
  }), [teams, stats, playerByName]);
  const leadersFor = (category: Category): Leader[] => {
    if (activeView === "Player") return stats.map((row) => ({ row, player: playerByName.get(normalized(row.Player)), value: statValue(row, category.fields) })).filter(({ player, value }) => value > 0 && (!category.positions || category.positions.includes(String(player?.Pos || "").toUpperCase()))).sort((a, b) => b.value - a.value).slice(0, 5).map(({ row, player, value }) => ({ name: row.Player, detail: String(player?.Team || ""), player, value }));
    const totals = new Map<string, number>();
    stats.forEach((row) => { const player = playerByName.get(normalized(row.Player)); const key = normalized(player?.Team); if (key) totals.set(key, (totals.get(key) || 0) + statValue(row, category.fields)); });
    return [...totals].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, value]) => { const team = teamByKey.get(key); return { name: team ? teamName(team) : players.find((player) => normalized(player.Team) === key)?.Team || key.toUpperCase(), image: String(team?.Logo || ""), value }; });
  };
  const teamLeadersFor = (category: Category): Leader[] => teamTotals.map((row) => {
    const key = category.fields[0] as "total" | "passing" | "rushing" | "sacks" | "turnovers" | "allowed";
    const raw = row[key] as number;
    return { name: teamName(row.team), image: String(row.team.Logo || ""), value: ["total", "passing", "rushing", "allowed"].includes(key) ? raw / row.gp : raw };
  }).filter(({ value }) => value > 0).sort((a, b) => category.title === "YARDS ALLOWED" ? a.value - b.value : b.value - a.value).slice(0, 5);
  const allRushers = stats.filter((row) => number(row.Carries) > 0 && (!filter || normalized(row.Player).includes(normalized(filter)))).sort((a, b) => number(b.Yards) - number(a.Yards));
  const allTacklers = stats.filter((row) => statValue(row, DEFENSIVE_COLUMNS[0].fields) >= 1 && (!filter || normalized(row.Player).includes(normalized(filter)))).sort((a, b) => statValue(b, DEFENSIVE_COLUMNS[0].fields) - statValue(a, DEFENSIVE_COLUMNS[0].fields));
  const completeRows = completeView === "rushing" ? allRushers : allTacklers;
  const completeColumns: StatColumn[] = completeView === "rushing" ? RUSHING_COLUMNS.map((label) => ({ label, fields: [label] })) : DEFENSIVE_COLUMNS;
  const teamMode = completeView?.startsWith("team-") ? completeView.slice(5) as "total" | "passing" | "rushing" : null;

  return <main className="league-stats-card">
    <header className="league-stats-heading"><div><span>LEAGUE STATISTICS</span><h1>{teamMode ? `AFL Team ${teamMode === "total" ? "Total Offense" : teamMode[0].toUpperCase() + teamMode.slice(1)} Stats` : "AFL Stat Leaders"}</h1></div><button type="button" onClick={() => setActiveView(activeView === "Player" ? "Team" : "Player")}>{activeView === "Player" ? "Team Statistics" : "Player Statistics"}⌄</button></header>
    <div className="stats-tabs" role="tablist">{(["Player", "Team"] as StatsView[]).map((view) => <button className={`stats-tab ${activeView === view ? "active" : ""}`} key={view} type="button" onClick={() => { setActiveView(view); setCompleteView(null); }}>{view}</button>)}</div>
    <div className="season-row"><button className="season-pill" type="button">Season 1 Regular Season⌄</button></div>
    {teamMode ? <TeamCompleteTable mode={teamMode} rows={[...teamTotals].sort((a, b) => b[teamMode] - a[teamMode])} onBack={() => setCompleteView(null)} /> : completeView ? <section className="complete-rushing-leaders"><div className="complete-leaders-tools"><button type="button" onClick={() => setCompleteView(null)}>← Back to stat leaders</button><label><span>Filter {completeView === "rushing" ? "rushers" : "tacklers"}</span><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Player name" /></label></div><div className="complete-leaders-table-scroll"><table className="complete-leaders-table"><thead><tr><th>Player</th>{completeColumns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{completeRows.map((row) => <tr key={row.Player}><td className="complete-leader-player"><PlayerImage player={playerByName.get(normalized(row.Player)) || {}} className="player-stats-image" /><span>{row.Player}</span></td>{completeColumns.map((column) => <td key={column.label}>{displayStat(row, column.fields)}</td>)}</tr>)}</tbody></table></div></section> : <div className="stats-leader-grid"><section><h2>Offensive Leaders</h2>{(activeView === "Team" ? TEAM_OFFENSE : OFFENSE).map((category) => <LeaderTable key={category.title} category={category} leaders={activeView === "Team" ? teamLeadersFor(category) : leadersFor(category)} loading={loading} error={error} onComplete={activeView === "Team" ? () => setCompleteView(`team-${category.fields[0]}` as CompleteView) : category.title === "RUSHING" ? () => setCompleteView("rushing") : undefined} />)}</section><section><h2>Defensive Leaders</h2>{(activeView === "Team" ? TEAM_DEFENSE : DEFENSE).map((category) => <LeaderTable key={category.title} category={category} leaders={activeView === "Team" ? teamLeadersFor(category) : leadersFor(category)} loading={loading} error={error} onComplete={activeView === "Team" ? undefined : category.title === "TACKLES" ? () => setCompleteView("tackling") : undefined} />)}</section></div>}
    <p className="stats-updated">Statistics are updated after every completed game.</p>
  </main>;
}
