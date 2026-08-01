import { useEffect, useMemo, useState } from "react";
import { getPlayers, getPlayerStats, type PlayerStats } from "../../api/client";
import { PlayerImage } from "../players/PlayerImage";
import type { Player } from "../players/types";
import type { LeagueTeam } from "./types";

type StatsView = "Player" | "Team";
type CompleteView = "rushing" | "tackling" | null;
type Leader = { name: string; detail?: string; image?: string; player?: Player; value: number };
type Category = { title: string; label: string; fields: string[]; positions?: string[] };
type StatColumn = { label: string; fields: string[] };

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
  const leadersFor = (category: Category): Leader[] => {
    if (activeView === "Player") return stats.map((row) => ({ row, player: playerByName.get(normalized(row.Player)), value: statValue(row, category.fields) })).filter(({ player, value }) => value > 0 && (!category.positions || category.positions.includes(String(player?.Pos || "").toUpperCase()))).sort((a, b) => b.value - a.value).slice(0, 5).map(({ row, player, value }) => ({ name: row.Player, detail: String(player?.Team || ""), player, value }));
    const totals = new Map<string, number>();
    stats.forEach((row) => { const player = playerByName.get(normalized(row.Player)); const key = normalized(player?.Team); if (key) totals.set(key, (totals.get(key) || 0) + statValue(row, category.fields)); });
    return [...totals].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, value]) => { const team = teamByKey.get(key); return { name: team ? teamName(team) : players.find((player) => normalized(player.Team) === key)?.Team || key.toUpperCase(), image: String(team?.Logo || ""), value }; });
  };
  const allRushers = stats.filter((row) => number(row.Carries) > 0 && (!filter || normalized(row.Player).includes(normalized(filter)))).sort((a, b) => number(b.Yards) - number(a.Yards));
  const allTacklers = stats.filter((row) => statValue(row, DEFENSIVE_COLUMNS[0].fields) >= 1 && (!filter || normalized(row.Player).includes(normalized(filter)))).sort((a, b) => statValue(b, DEFENSIVE_COLUMNS[0].fields) - statValue(a, DEFENSIVE_COLUMNS[0].fields));
  const completeRows = completeView === "rushing" ? allRushers : allTacklers;
  const completeColumns: StatColumn[] = completeView === "rushing" ? RUSHING_COLUMNS.map((label) => ({ label, fields: [label] })) : DEFENSIVE_COLUMNS;

  return <main className="league-stats-card">
    <header className="league-stats-heading"><div><span>LEAGUE STATISTICS</span><h1>AFL Stat Leaders</h1></div><button type="button" onClick={() => setActiveView(activeView === "Player" ? "Team" : "Player")}>{activeView === "Player" ? "Team Statistics" : "Player Statistics"}⌄</button></header>
    <div className="stats-tabs" role="tablist">{(["Player", "Team"] as StatsView[]).map((view) => <button className={`stats-tab ${activeView === view ? "active" : ""}`} key={view} type="button" onClick={() => { setActiveView(view); setCompleteView(null); }}>{view}</button>)}</div>
    <div className="season-row"><button className="season-pill" type="button">Season 1 Regular Season⌄</button></div>
    {completeView ? <section className="complete-rushing-leaders"><div className="complete-leaders-tools"><button type="button" onClick={() => setCompleteView(null)}>← Back to stat leaders</button><label><span>Filter {completeView === "rushing" ? "rushers" : "tacklers"}</span><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Player name" /></label></div><div className="complete-leaders-table-scroll"><table className="complete-leaders-table"><thead><tr><th>Player</th>{completeColumns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{completeRows.map((row) => <tr key={row.Player}><td className="complete-leader-player"><PlayerImage player={playerByName.get(normalized(row.Player)) || {}} className="player-stats-image" /><span>{row.Player}</span></td>{completeColumns.map((column) => <td key={column.label}>{displayStat(row, column.fields)}</td>)}</tr>)}</tbody></table></div></section> : <div className="stats-leader-grid"><section><h2>Offensive Leaders</h2>{OFFENSE.map((category) => <LeaderTable key={category.title} category={category} leaders={leadersFor(category)} loading={loading} error={error} onComplete={category.title === "RUSHING" ? () => setCompleteView("rushing") : undefined} />)}</section><section><h2>Defensive Leaders</h2>{DEFENSE.map((category) => <LeaderTable key={category.title} category={category} leaders={leadersFor(category)} loading={loading} error={error} onComplete={category.title === "TACKLES" ? () => setCompleteView("tackling") : undefined} />)}</section></div>}
    <p className="stats-updated">Statistics are updated after every completed game.</p>
  </main>;
}
