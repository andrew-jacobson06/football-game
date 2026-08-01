import { useEffect, useMemo, useState } from "react";
import { getPlayerGames, getPlayers, getPlayerStats, type PlayerGame, type PlayerStats } from "../../api/client";
import { PlayerImage } from "../players/PlayerImage";
import { AppSelect } from "../ui/AppSelect";
import type { Player } from "../players/types";
import type { LeagueGame, LeagueTeam } from "./types";

type StatsView = "Player" | "Team";
type PlayerProfileTab = "Overview" | "News" | "Stats" | "Bio" | "Splits" | "Game Log";
type CompleteView = "rushing" | "tackling" | "team-total" | "team-passing" | "team-rushing" | "team-defense" | "team-sacks" | "team-turnovers" | "special-teams" | null;
type Leader = { name: string; detail?: string; image?: string; player?: Player; value: number };
type Category = { title: string; label: string; fields: string[]; positions?: string[] };
type StatColumn = { label: string; fields: string[] };
type PlayerStatSide = "offense" | "defense";
type ProfileStat = { label: string; value: string };
type TeamTotal = { team: LeagueTeam; rows: PlayerStats[]; gp: number; passing: number; rushing: number; total: number; sacks: number; interceptions: number; fumbleRecoveries: number; turnovers: number; allowedPassing: number; allowedRushing: number; allowed: number };

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
function profileStat(row: PlayerStats, label: string, fields: string[]): ProfileStat {
  return { label, value: displayStat(row, fields) };
}
function profileStats(player: Player, row: PlayerStats, side: PlayerStatSide): ProfileStat[] {
  const position = String(side === "offense" ? player.Pos : player.DefPos).trim().toUpperCase();
  const stat = (label: string, fields: string[]) => profileStat(row, label, fields);
  const average = (yards: string[], attempts: string[]) => {
    const recorded = statValue(row, ["Avg", "Average"]);
    const count = statValue(row, attempts);
    const value = recorded || (count ? statValue(row, yards) / count : 0);
    return { label: "AVG", value: value.toFixed(1) };
  };

  if (side === "defense") {
    if (position === "DB") return [stat("TKL", ["Tackles", "Total Tackles", "TOT"]), stat("DFL", ["DFL", "Defl", "Deflections", "Passes Defended", "PassDeflections"]), stat("INT", ["INT", "Interceptions"])];
    if (position === "LB") return [stat("TKL", ["Tackles", "Total Tackles", "TOT"]), stat("SACK", ["Sacks", "Sack"]), stat("FF", ["FF", "Forced Fumbles", "ForcedFumbles"]), stat("INT", ["INT", "Interceptions"])];
    return [stat("TKL", ["Tackles", "Total Tackles", "TOT"]), stat("TFL", ["TFL", "Tackles For Loss", "TacklesForLoss"]), stat("SACK", ["Sacks", "Sack"]), stat("FF", ["FF", "Forced Fumbles", "ForcedFumbles"])];
  }

  if (position === "QB") return [stat("YDS", ["Passing Yards", "Pass Yards", "PassYards"]), stat("TD", ["Passing TD", "Pass TD", "TD Passes"]), stat("INT", ["Interceptions Thrown", "Pass INT"]), stat("QBR", ["QBR", "Passer Rating", "Rating", "RTG"])];
  if (position === "RB") return [stat("CAR", ["Carries", "Rushing Attempts", "Rush Attempts"]), stat("YDS", ["Yards", "Rushing Yards", "Rush Yards"]), stat("TD", ["Rushing TD", "Rush TD", "TD"]), average(["Yards", "Rushing Yards", "Rush Yards"], ["Carries", "Rushing Attempts", "Rush Attempts"])];
  if (position === "WR" || position === "TE") return [stat("REC", ["Receptions", "REC"]), stat("YDS", ["Receiving Yards", "Rec Yards", "RecYards"]), stat("TD", ["Receiving TD", "Rec TD", "TD"]), average(["Receiving Yards", "Rec Yards", "RecYards"], ["Receptions", "REC"])];
  if (position === "K") return [stat("FG%", ["FG%", "Field Goal Percentage"]), stat("XP%", ["XP%", "Extra Point Percentage"]), stat("LNG", ["LNG", "Long", "Longest Field Goal"]), stat("PTS", ["PTS", "Points"])];
  const wins = statValue(row, ["OL W", "OL Wins", "Line Wins"]);
  const losses = statValue(row, ["OL L", "OL Losses", "Line Losses"]);
  const plays = statValue(row, ["Total Plays on Line", "Line Plays", "OL Plays"]) || wins + losses;
  const recordedWinRate = statValue(row, ["Win%", "Win Percentage", "OL Win Percentage"]);
  return [{ label: "TOTAL PLAYS ON LINE", value: String(plays) }, { label: "WIN%", value: `${(recordedWinRate || (plays ? wins / plays * 100 : 0)).toFixed(1)}%` }, stat("LEAD BLOCK", ["Lead Block", "Lead Blocks"])];
}
function teamName(team: LeagueTeam) { return String(team.Name || team.Team || team.Nickname || team.Abbrev || "Team"); }
function ordinal(rank: number) {
  const suffix = rank % 100 >= 11 && rank % 100 <= 13 ? "th" : rank % 10 === 1 ? "st" : rank % 10 === 2 ? "nd" : rank % 10 === 3 ? "rd" : "th";
  return `${rank}${suffix}`;
}
function leagueRanks(player: Player, row: PlayerStats, side: PlayerStatSide, stats: PlayerStats[], playersByName: Map<string, Player>) {
  const selected = profileStats(player, row, side);
  const position = normalized(side === "offense" ? player.Pos : player.DefPos);
  return selected.map((stat, index) => {
    const value = number(stat.value);
    const values = stats.map((candidate) => {
      const candidatePlayer = playersByName.get(normalized(candidate.Player));
      const candidatePosition = normalized(side === "offense" ? candidatePlayer?.Pos : candidatePlayer?.DefPos);
      return candidatePlayer && candidatePosition === position ? number(profileStats(candidatePlayer, candidate, side)[index]?.value) : 0;
    }).filter((candidate) => candidate > 0).sort((a, b) => b - a);
    const rank = values.findIndex((candidate) => candidate <= value) + 1;
    const tied = value > 0 && values.filter((candidate) => candidate === value).length > 1;
    return rank ? `${tied ? "Tied-" : ""}${ordinal(rank)}` : "Not ranked";
  });
}
const teamGames = (team: LeagueTeam) => number(team.GP || team.Games || 1) || 1;
function teamField(team: LeagueTeam, fields: string[]) { return statValue(team as PlayerStats, fields); }

function LeaderTable({ category, leaders, loading, error, onComplete, onPlayer }: { category: Category; leaders: Leader[]; loading: boolean; error: string | null; onComplete?: () => void; onPlayer?: (player: Player) => void }) {
  return <section className="leader-group">
    <table className="leader-table">
      <thead><tr><th>{category.title}</th><th>{category.label}</th></tr></thead>
      <tbody>{loading || error || !leaders.length ? <tr><td className="leader-message" colSpan={2}>{loading ? "Loading leaders…" : error || "No statistics recorded yet."}</td></tr> : leaders.map((leader, index) => <tr key={`${category.title}-${leader.name}`}>
        <td className="leader-identity"><span className="rank">{index + 1}</span>{leader.player ? <PlayerImage player={leader.player} className="player-stats-image" /> : leader.image ? <img className="team-stats-logo" src={leader.image} alt="" /> : <span className="team-stats-logo-fallback">{leader.name.slice(0, 2)}</span>}<span>{leader.player && onPlayer ? <button className="player-name-button" type="button" onClick={() => onPlayer(leader.player!)}>{leader.name}</button> : <b>{leader.name}</b>}{leader.detail && <small>{leader.detail}</small>}</span></td>
        <td className="stat-value">{leader.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
      </tr>)}</tbody>
    </table>
    {onComplete && !loading && !error && leaders.length > 0 && <div className="complete-link"><button type="button" onClick={onComplete}>Complete Leaders</button></div>}
  </section>;
}

function StatsSelect({ value, onChange, children, label }: { value: string; onChange?: (value: string) => void; children: React.ReactNode; label: string }) {
  return <label className="stats-select"><span className="sr-only">{label}</span><AppSelect value={value} onChange={(event) => onChange?.(event.target.value)}>{children}</AppSelect></label>;
}

function PlayerStatsProfile({ player, row, team, stats, playersByName, onBack }: { player: Player; row?: PlayerStats; team?: LeagueTeam; stats: PlayerStats[]; playersByName: Map<string, Player>; onBack: () => void }) {
  const [tab, setTab] = useState<PlayerProfileTab>("Overview");
  const [statSide, setStatSide] = useState<PlayerStatSide>("offense");
  const [recentGames, setRecentGames] = useState<PlayerGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gameStatTab, setGameStatTab] = useState<"Passing" | "Receiving" | "Rushing" | "Fumbles">("Rushing");
  const name = String(player.Name || row?.Player || "Player");
  const summary = profileStats(player, row || {} as PlayerStats, statSide);
  const ranks = leagueRanks(player, row || {} as PlayerStats, statSide, stats, playersByName);
  const shownPosition = String(statSide === "offense" ? player.Pos : player.DefPos || "DL").toUpperCase();
  const otherSide = statSide === "offense" ? "Defense" : "Offense";
  const logo = String(team?.Logo || "");
  const isRunningBack = statSide === "offense" && shownPosition === "RB";
  const isQuarterback = statSide === "offense" && shownPosition === "QB";
  const isReceiver = statSide === "offense" && (shownPosition === "WR" || shownPosition === "TE");
  useEffect(() => {
    if (!isRunningBack && !isQuarterback && !isReceiver) return;
    getPlayerGames(name).then(({ games }) => {
      setRecentGames(games);
      setGameStatTab(isQuarterback ? "Passing" : isReceiver ? "Receiving" : "Rushing");
    }).catch(() => setRecentGames([])).finally(() => setGamesLoading(false));
  }, [isQuarterback, isReceiver, isRunningBack, name]);
  const rbGroups = [
    { title: "RUSHING", stats: [{ label: "CAR", fields: ["Carries", "Rushing Attempts", "Rush Attempts"] }, { label: "YDS", fields: ["Yards", "Rushing Yards", "Rush Yards"] }, { label: "AVG", value: summary.find((item) => item.label === "AVG")?.value || "0.0" }, { label: "TD", fields: ["Rushing TD", "Rush TD", "TD"] }, { label: "LNG", fields: ["Long", "LNG"] }] },
    { title: "RECEIVING", stats: [{ label: "REC", fields: ["Receptions", "REC"] }, { label: "YDS", fields: ["Receiving Yards", "Rec Yards", "RecYards"] }, { label: "AVG", value: (statValue(row || {} as PlayerStats, ["Receptions", "REC"]) ? statValue(row || {} as PlayerStats, ["Receiving Yards", "Rec Yards", "RecYards"]) / statValue(row || {} as PlayerStats, ["Receptions", "REC"]) : 0).toFixed(1) }, { label: "TD", fields: ["Receiving TD", "Rec TD"] }, { label: "LNG", fields: ["Receiving Long", "Rec Long"] }] },
    { title: "FUMBLES", stats: [{ label: "FUM", fields: ["Fum", "Fumbles"] }, { label: "LST", fields: ["Fum Lost", "Fumbles Lost"] }] },
  ];
  const qbGroups = [
    { title: "PASSING", stats: [{ label: "CMP", fields: ["Completions", "Pass Completions", "CMP"] }, { label: "ATT", fields: ["Passing Attempts", "Pass Attempts", "ATT"] }, { label: "CMP%", value: (statValue(row || {} as PlayerStats, ["Passing Attempts", "Pass Attempts", "ATT"]) ? statValue(row || {} as PlayerStats, ["Completions", "Pass Completions", "CMP"]) / statValue(row || {} as PlayerStats, ["Passing Attempts", "Pass Attempts", "ATT"]) * 100 : 0).toFixed(1) }, { label: "YDS", fields: ["Passing Yards", "Pass Yards", "PassYards"] }, { label: "AVG", value: (statValue(row || {} as PlayerStats, ["Passing Attempts", "Pass Attempts", "ATT"]) ? statValue(row || {} as PlayerStats, ["Passing Yards", "Pass Yards", "PassYards"]) / statValue(row || {} as PlayerStats, ["Passing Attempts", "Pass Attempts", "ATT"]) : 0).toFixed(1) }, { label: "TD", fields: ["Passing TD", "Pass TD", "TD Passes"] }, { label: "INT", fields: ["Interceptions Thrown", "Pass INT"] }, { label: "LNG", fields: ["Passing Long", "Pass Long"] }, { label: "SACK", fields: ["Sacked", "Times Sacked"] }, { label: "RTG", fields: ["QBR", "Passer Rating", "Rating", "RTG"] }] },
    rbGroups[0],
  ];
  const receiverGroups = [
    { title: "RECEIVING", stats: [{ label: "REC", fields: ["Receptions", "REC"] }, { label: "TGTS", fields: ["Targets", "Receiving Targets"] }, { label: "YDS", fields: ["Receiving Yards", "Rec Yards", "RecYards"] }, { label: "AVG", value: (statValue(row || {} as PlayerStats, ["Receptions", "REC"]) ? statValue(row || {} as PlayerStats, ["Receiving Yards", "Rec Yards", "RecYards"]) / statValue(row || {} as PlayerStats, ["Receptions", "REC"]) : 0).toFixed(1) }, { label: "TD", fields: ["Receiving TD", "Rec TD"] }, { label: "LNG", fields: ["Receiving Long", "Rec Long"] }, { label: "FD", fields: ["Receiving First Downs", "Rec First Downs", "First Down"] }] },
    rbGroups[0],
    rbGroups[2],
  ];
  const overviewGroups = isQuarterback ? qbGroups : isReceiver ? receiverGroups : isRunningBack ? rbGroups : null;
  const gameTabs = isQuarterback ? ["Passing", "Rushing"] as const : isReceiver ? ["Receiving", "Rushing", "Fumbles"] as const : ["Rushing"] as const;
  const recentColumns = gameStatTab === "Passing" ? ["CMP", "ATT", "YDS", "CMP%", "AVG", "TD", "INT", "LNG", "SACK"] : gameStatTab === "Receiving" ? ["REC", "TGTS", "YDS", "AVG", "TD", "LNG", "FD"] : gameStatTab === "Fumbles" ? ["FUM", "LST"] : ["CAR", "YDS", "AVG", "TD", "LNG"];
  const recentValues = (game: PlayerGame) => gameStatTab === "Passing" ? [game.passing.completions, game.passing.attempts, game.passing.yards, game.passing.attempts ? (game.passing.completions / game.passing.attempts * 100).toFixed(1) : "0.0", game.passing.attempts ? (game.passing.yards / game.passing.attempts).toFixed(1) : "0.0", game.passing.touchdowns, game.passing.interceptions, game.passing.long, game.passing.sacks] : gameStatTab === "Receiving" ? [game.receiving.receptions, game.receiving.targets, game.receiving.yards, game.receiving.receptions ? (game.receiving.yards / game.receiving.receptions).toFixed(1) : "0.0", game.receiving.touchdowns, game.receiving.long, game.receiving.firstDowns] : gameStatTab === "Fumbles" ? [game.fumbles.total, game.fumbles.lost] : [game.rushing.carries, game.rushing.yards, game.rushing.carries ? (game.rushing.yards / game.rushing.carries).toFixed(1) : "0.0", game.rushing.touchdowns, game.rushing.long];
  return <main className="player-detail-page">
    <button className="profile-back" type="button" onClick={onBack}>← Back to league leaders</button>
    <section className="player-detail-hero">
      <div className="player-detail-art"><div className="glass-line glass-line-one" /><div className="glass-line glass-line-two" />{logo && <img className="player-detail-watermark" src={logo} alt="" />}<PlayerImage player={player} className="player-detail-photo" fallback={<div className="player-detail-initials">{name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>} /></div>
      <div className="player-detail-name"><span>{shownPosition || "PLAYER"}</span><h1>{name}</h1><p>{logo && <img src={logo} alt="" />} <b>{teamName(team || {})}</b> · #{String(player.Jersey || player.jersey || "--")} · {shownPosition || "--"}</p><button className="player-stat-side-toggle" type="button" onClick={() => setStatSide(statSide === "offense" ? "defense" : "offense")}>View {otherSide} Stats</button></div>
      <dl className="player-detail-facts"><div><dt>HEIGHT / WEIGHT</dt><dd>{String(player.Size || "—")}</dd></div><div><dt>TEAM</dt><dd>{teamName(team || {})}</dd></div><div><dt>POSITION</dt><dd>{shownPosition || "—"}</dd></div><div><dt>STATUS</dt><dd><i /> Active</dd></div></dl>
    </section>
    <section className="player-featured-stats"><h2>SEASON 1 REGULAR SEASON {statSide.toUpperCase()} STATS</h2><div>{summary.map(({ label, value }, index) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{ranks[index]}</small></article>)}</div></section>
    <nav className="player-detail-tabs">{(["Overview", "News", "Stats", "Bio", "Splits", "Game Log"] as PlayerProfileTab[]).map((item) => <button className={tab === item ? "active" : ""} type="button" onClick={() => setTab(item)} key={item}>{item}</button>)}</nav>
    {tab === "Overview" ? <div className="player-overview-grid"><section><header><h3>Season 1 {shownPosition || "Player"} Statistics</h3></header>{overviewGroups ? <div className="player-stat-table-scroll"><table className="rb-overview-table"><thead><tr><th rowSpan={2}>STATS</th>{overviewGroups.map((group) => <th key={group.title} colSpan={group.stats.length}>{group.title}</th>)}</tr><tr>{overviewGroups.flatMap((group) => group.stats.map((stat) => <th key={`${group.title}-${stat.label}`}>{stat.label}</th>))}</tr></thead><tbody><tr><td>Regular Season</td>{overviewGroups.flatMap((group) => group.stats.map((stat) => <td key={`${group.title}-${stat.label}`}>{"value" in stat ? stat.value : displayStat(row || {} as PlayerStats, stat.fields)}</td>))}</tr></tbody></table></div> : <div className="player-stat-table-scroll"><table><thead><tr><th>STATS</th>{summary.map(({ label }) => <th key={label}>{label}</th>)}</tr></thead><tbody><tr><td>Regular Season</td>{summary.map(({ label, value }) => <td key={label}>{value}</td>)}</tr></tbody></table></div>}</section><section><header><h3>Recent Games</h3></header>{overviewGroups && <nav className="recent-game-tabs" aria-label="Recent game statistic category">{gameTabs.map((item) => <button type="button" className={gameStatTab === item ? "active" : ""} onClick={() => setGameStatTab(item)} key={item}>{item}</button>)}</nav>}{overviewGroups && recentGames.length ? <div className="player-stat-table-scroll"><table className="recent-games-table"><thead><tr><th>DATE</th><th>OPP</th><th>RESULT</th>{recentColumns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{recentGames.map((game) => <tr key={game.gameId}><td>{game.date || "—"}</td><td>{game.location} {game.opponent}</td><td className={game.result.startsWith("W") ? "game-result-win" : "game-result-loss"}>{game.result}</td>{recentValues(game).map((value, index) => <td key={`${game.gameId}-${recentColumns[index]}`}>{value}</td>)}</tr>)}</tbody></table></div> : <div className="empty-profile-state">{gamesLoading && overviewGroups ? "Loading completed games…" : "Game-by-game statistics will appear after completed games."}</div>}</section></div> : <section className="player-tab-stub"><span>{tab.toUpperCase()}</span><h2>{tab} coming soon</h2><p>This player section is ready for future league data.</p></section>}
  </main>;
}

function TeamCompleteTable({ mode, rows, onBack, onSpecialTeams }: { mode: "total" | "passing" | "rushing" | "defense" | "sacks" | "turnovers"; rows: TeamTotal[]; onBack: () => void; onSpecialTeams: () => void }) {
  const defensive = mode === "defense" || mode === "sacks";
  const columns = mode === "defense" ? ["TOTAL YDS", "YDS/G", "PASS YDS", "YDS/G", "RUSH YDS", "YDS/G"] : mode === "sacks" ? ["PASS YDS", "YDS/G", "SACK", "INT", "FUM REC", "TAKEAWAYS"] : mode === "turnovers" ? ["DIFF", "INT", "FUM", "TAKEAWAYS"] : mode === "total" ? ["TOTAL YDS", "YDS/G", "PASS YDS", "YDS/G", "RUSH YDS", "YDS/G"] : mode === "passing" ? ["YDS", "YDS/G", "TD", "INT", "SACK"] : ["ATT", "YDS", "AVG", "YDS/G", "TD"];
  const values = (row: TeamTotal) => {
    const sum = (fields: string[]) => row.rows.reduce((n, stat) => n + statValue(stat, fields), 0); const attempts = sum(["Carries", "Rushing Attempts"]);
    if (mode === "defense") return [row.allowed, row.allowed / row.gp, row.allowedPassing, row.allowedPassing / row.gp, row.allowedRushing, row.allowedRushing / row.gp];
    if (mode === "sacks") return [row.allowedPassing, row.allowedPassing / row.gp, row.sacks, row.interceptions, row.fumbleRecoveries, row.interceptions + row.fumbleRecoveries];
    if (mode === "turnovers") return [row.turnovers, row.interceptions, row.fumbleRecoveries, row.interceptions + row.fumbleRecoveries];
    if (mode === "total") return [row.total, row.total / row.gp, row.passing, row.passing / row.gp, row.rushing, row.rushing / row.gp];
    if (mode === "passing") return [row.passing, row.passing / row.gp, sum(["Passing TD", "Pass TD", "TD Passes"]), sum(["Interceptions Thrown", "Pass INT"]), sum(["Sacked", "Times Sacked"])];
    return [attempts, row.rushing, attempts ? row.rushing / attempts : 0, row.rushing / row.gp, sum(["Rushing TD", "Rush TD", "TD"])];
  };
  return <section className="team-complete-view"><div className="team-stat-nav"><span className={!defensive && mode !== "turnovers" ? "active" : ""}>Offense</span><span className={defensive ? "active" : ""}>Defense</span><button type="button" onClick={onSpecialTeams}>Special Teams</button><span className={mode === "turnovers" ? "active" : ""}>Turnovers</span></div><div className="team-stat-filters"><button className="dropdown-button" type="button">{mode === "defense" ? "Total" : mode === "sacks" ? "Passing" : mode[0].toUpperCase() + mode.slice(1)}<span aria-hidden="true">⌄</span></button><button className="dropdown-button" type="button">Season 1 Regular Season<span aria-hidden="true">⌄</span></button></div><button className="team-table-back" type="button" onClick={onBack}>← Back to stat leaders</button><div className="complete-leaders-table-scroll"><table className="team-complete-table"><thead><tr><th>TEAM</th><th>GP</th>{columns.map((column, index) => <th key={`${column}-${index}`}>{column}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={teamName(row.team)}><td><span className="team-table-name">{row.team.Logo && <img src={String(row.team.Logo)} alt="" />}{teamName(row.team)}</span></td><td>{row.gp}</td>{values(row).map((value, index) => <td key={index}>{Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1)}</td>)}</tr>)}</tbody></table></div></section>;
}

export function LeagueStats({ teams, games = [] }: { teams: LeagueTeam[]; games?: LeagueGame[] }) {
  const [activeView, setActiveView] = useState<StatsView>("Player");
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completeView, setCompleteView] = useState<CompleteView>(null);
  const [filter, setFilter] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  useEffect(() => { Promise.all([getPlayerStats(), getPlayers()]).then(([statsResult, playersResult]) => { setStats(statsResult.playerStats); setPlayers(playersResult.players); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load statistics")).finally(() => setLoading(false)); }, []);

  const playerByName = useMemo(() => new Map(players.map((player) => [normalized(player.Name), player])), [players]);
  const teamByKey = useMemo(() => new Map(teams.flatMap((team) => [team.Abbrev, team.Team, team.Name].filter(Boolean).map((value) => [normalized(value), team] as const))), [teams]);
  const teamTotals = useMemo<TeamTotal[]>(() => {
    const offense = new Map<string, { passing: number; rushing: number }>();
    const rowsForTeam = (team: LeagueTeam) => {
      const keys = [team.Abbrev, team.Team, team.Name].filter(Boolean).map(normalized);
      return stats.filter((row) => keys.includes(normalized(playerByName.get(normalized(row.Player))?.Team)));
    };
    teams.forEach((team) => {
      const rows = rowsForTeam(team);
      offense.set(normalized(team.Abbrev || team.Team || team.Name), {
        passing: rows.reduce((n, row) => n + statValue(row, ["Passing Yards", "Pass Yards", "PassYards"]), 0),
        rushing: rows.reduce((n, row) => n + statValue(row, ["Yards", "Rushing Yards", "Rush Yards"]), 0),
      });
    });
    const findTeam = (key: unknown) => teams.find((team) => [team.Abbrev, team.Team, team.Name].some((value) => normalized(value) === normalized(key)));
    return teams.map((team) => {
      const keys = [team.Abbrev, team.Team, team.Name].filter(Boolean).map(normalized);
      const rows = rowsForTeam(team);
      const sum = (fields: string[]) => rows.reduce((total, row) => total + statValue(row, fields), 0);
      const passing = sum(["Passing Yards", "Pass Yards", "PassYards"]);
      const rushing = sum(["Yards", "Rushing Yards", "Rush Yards"]);
      const opponents = games
        .filter((game) => String(game.Qtr).toUpperCase() === "FINAL" && [game.Home, game.Away].some((value) => keys.includes(normalized(value))))
        .map((game) => findTeam(keys.includes(normalized(game.Home)) ? game.Away : game.Home))
        .filter((value): value is LeagueTeam => Boolean(value));
      // Defensive yardage is the offense produced by each opponent in games this team actually played.
      const allowedPassing = opponents.reduce((n, opponent) => n + (offense.get(normalized(opponent.Abbrev || opponent.Team || opponent.Name))?.passing || 0), 0);
      const allowedRushing = opponents.reduce((n, opponent) => n + (offense.get(normalized(opponent.Abbrev || opponent.Team || opponent.Name))?.rushing || 0), 0);
      const interceptions = sum(["Interceptions", "INT"]);
      const fumbleRecoveries = sum(["Fumble Recoveries", "FR"]);
      return { team, rows, gp: teamGames(team), passing, rushing, total: passing + rushing, sacks: sum(["Sacks", "Sack"]), interceptions, fumbleRecoveries, turnovers: teamField(team, ["Turnover Differential", "TurnoverDiff", "DIFF"]) || interceptions + fumbleRecoveries, allowedPassing, allowedRushing, allowed: allowedPassing + allowedRushing };
    });
  }, [teams, games, stats, playerByName]);
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
  const teamMode = completeView?.startsWith("team-") ? completeView.slice(5) as "total" | "passing" | "rushing" | "defense" | "sacks" | "turnovers" : null;

  if (selectedPlayer) {
    const row = stats.find((item) => normalized(item.Player) === normalized(selectedPlayer.Name));
    const team = teamByKey.get(normalized(selectedPlayer.Team));
    return <PlayerStatsProfile player={selectedPlayer} row={row} team={team} stats={stats} playersByName={playerByName} onBack={() => setSelectedPlayer(null)} />;
  }

  return <main className="league-stats-card">
    <header className="league-stats-heading"><div><span>LEAGUE STATISTICS</span><h1>{teamMode ? `AFL Team ${teamMode === "total" ? "Total Offense" : teamMode[0].toUpperCase() + teamMode.slice(1)} Stats` : "AFL Stat Leaders"}</h1></div><StatsSelect label="Statistics view" value={activeView} onChange={(value) => { setActiveView(value as StatsView); setCompleteView(null); }}><option value="Player">Player Statistics</option><option value="Team">Team Statistics</option></StatsSelect></header>
    <div className="stats-tabs" role="tablist">{(["Player", "Team"] as StatsView[]).map((view) => <button className={`stats-tab ${activeView === view ? "active" : ""}`} key={view} type="button" onClick={() => { setActiveView(view); setCompleteView(null); }}>{view}</button>)}</div>
    <div className="season-row"><StatsSelect label="Season" value="season-1"><option value="season-1">Season 1 Regular Season</option></StatsSelect></div>
    {completeView === "special-teams" ? <section className="player-tab-stub"><span>SPECIAL TEAMS</span><h2>Special Teams Stats</h2><p>Special teams leader tables are ready for future league data.</p><button className="team-table-back" type="button" onClick={() => setCompleteView(null)}>← Back to stat leaders</button></section> : teamMode ? <TeamCompleteTable mode={teamMode} rows={[...teamTotals].sort((a, b) => teamMode === "defense" ? a.allowed - b.allowed : b[teamMode] - a[teamMode])} onBack={() => setCompleteView(null)} onSpecialTeams={() => setCompleteView("special-teams")} /> : completeView ? <section className="complete-rushing-leaders"><div className="complete-leaders-tools"><button type="button" onClick={() => setCompleteView(null)}>← Back to stat leaders</button><label><span>Filter {completeView === "rushing" ? "rushers" : "tacklers"}</span><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Player name" /></label></div><div className="complete-leaders-table-scroll"><table className="complete-leaders-table"><thead><tr><th>Player</th>{completeColumns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{completeRows.map((row) => <tr key={row.Player}><td className="complete-leader-player"><PlayerImage player={playerByName.get(normalized(row.Player)) || {}} className="player-stats-image" /><button className="player-name-button" type="button" onClick={() => { const player = playerByName.get(normalized(row.Player)); if (player) setSelectedPlayer(player); }}>{row.Player}</button></td>{completeColumns.map((column) => <td key={column.label}>{displayStat(row, column.fields)}</td>)}</tr>)}</tbody></table></div></section> : <div className="stats-leader-grid"><section><h2>Offensive Leaders</h2>{(activeView === "Team" ? TEAM_OFFENSE : OFFENSE).map((category) => <LeaderTable key={category.title} category={category} leaders={activeView === "Team" ? teamLeadersFor(category) : leadersFor(category)} loading={loading} error={error} onPlayer={setSelectedPlayer} onComplete={activeView === "Team" ? () => setCompleteView(`team-${category.fields[0]}` as CompleteView) : category.title === "RUSHING" ? () => setCompleteView("rushing") : undefined} />)}</section><section><h2>Defensive Leaders</h2>{(activeView === "Team" ? TEAM_DEFENSE : DEFENSE).map((category) => <LeaderTable key={category.title} category={category} leaders={activeView === "Team" ? teamLeadersFor(category) : leadersFor(category)} loading={loading} error={error} onPlayer={setSelectedPlayer} onComplete={activeView === "Team" ? () => setCompleteView(category.title === "YARDS ALLOWED" ? "team-defense" : category.title === "SACKS" ? "team-sacks" : "team-turnovers") : category.title === "TACKLES" ? () => setCompleteView("tackling") : undefined} />)}</section></div>}
    <p className="stats-updated">Statistics are updated after every completed game.</p>
  </main>;
}
