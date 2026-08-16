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
type StatColumn = { label: string; fields: string[]; decimal?: boolean };
type StatGroup = { title: string; positions: string[]; columns: StatColumn[]; defaultSort: string };

const statGroups: StatGroup[] = [
  { title: "Passing", positions: ["qb"], defaultSort: "YDS", columns: [
    { label: "GP", fields: ["games", "gp"] }, { label: "CMP", fields: ["completions", "cmp", "passcompletions"] },
    { label: "ATT", fields: ["passattempts", "passingattempts", "att"] }, { label: "CMP%", fields: ["completionpercentage", "completionpct", "cmppct"], decimal: true },
    { label: "YDS", fields: ["passingyards", "passyards", "passyds"] }, { label: "AVG", fields: ["yardsperpass", "passaverage", "passavg"], decimal: true },
    { label: "YDS/G", fields: ["passingyardspergame", "passyardspergame", "passydsg"], decimal: true }, { label: "LNG", fields: ["longestpass", "passlong", "lng"] },
    { label: "TD", fields: ["passingtouchdowns", "passtds", "passtd"] }, { label: "INT", fields: ["interceptionsthrown", "passinterceptions", "passint"] },
    { label: "SACK", fields: ["sacked", "sackstaken", "passsacks"] }, { label: "SYL", fields: ["sackyardslost", "syl"] },
    { label: "QBR", fields: ["qbr"], decimal: true }, { label: "RTG", fields: ["passerrating", "rating", "rtg"], decimal: true },
  ]},
  { title: "Rushing", positions: ["qb", "rb", "wr", "te"], defaultSort: "YDS", columns: [
    { label: "GP", fields: ["games", "gp"] }, { label: "ATT", fields: ["carries", "rushingattempts", "rushattempts", "rushatt"] },
    { label: "YDS", fields: ["yards", "rushingyards", "rushyards", "rushyds"] }, { label: "AVG", fields: ["rushingaverage", "rushaverage", "rushavg", "yardspercarry"], decimal: true },
    { label: "LNG", fields: ["longestrush", "rushinglong", "rushlong"] }, { label: "BIG", fields: ["bigrushes", "rushbig"] }, { label: "TD", fields: ["rushingtouchdowns", "rushingtd", "rushtds", "rushtd"] },
    { label: "YDS/G", fields: ["rushingyardspergame", "rushyardspergame", "rushydsg"], decimal: true }, { label: "FUM", fields: ["fumbles", "fum"] },
    { label: "LST", fields: ["rushingfumbleslost", "fumbleslost", "fumlost"] }, { label: "FD", fields: ["rushingfirstdowns", "rushfirstdowns", "rushfd"] },
    { label: "LOSS", fields: ["rushloss", "loss"] }, { label: "5+", fields: ["rush5+", "5+"] }, { label: "10+", fields: ["rush10+", "10+"] },
    { label: "20+", fields: ["rush20+", "20+"] }, { label: "30+", fields: ["rush30+", "30+"] }, { label: "50+", fields: ["rush50+", "50+"] },
    { label: "BRK TKL", fields: ["brokentackles", "brokentackle"] }, { label: "JKE", fields: ["jukes", "juke"] },
  ]},
  { title: "Receiving", positions: ["rb", "wr", "te"], defaultSort: "YDS", columns: [
    { label: "GP", fields: ["games", "gp"] }, { label: "REC", fields: ["receptions", "rec"] }, { label: "TGTS", fields: ["targets", "tgts", "tgt"] },
    { label: "YDS", fields: ["receivingyards", "recyards", "recyds"] }, { label: "AVG", fields: ["receivingaverage", "recaverage", "recavg", "yardsperreception"], decimal: true },
    { label: "TD", fields: ["receivingtouchdowns", "receivingtd", "rectds", "rectd"] }, { label: "LNG", fields: ["longestreception", "receivinglong", "reclong"] },
    { label: "BIG", fields: ["bigreceptions", "big"] }, { label: "YDS/G", fields: ["receivingyardspergame", "recyardspergame", "recydsg"], decimal: true },
    { label: "FUM", fields: ["receivingfumbles", "fumbles", "fum"] }, { label: "LST", fields: ["receivingfumbleslost", "fumbleslost", "fumlost"] }, { label: "YAC", fields: ["yardsaftercatch", "yac"] },
    { label: "FD", fields: ["receivingfirstdowns", "recfirstdowns", "recfd"] },
  ]},
  { title: "Defense", positions: ["dl", "dt", "de", "lb", "cb", "s", "db"], defaultSort: "TKL", columns: [
    { label: "GP", fields: ["games", "gp"] }, { label: "TKL", fields: ["totaltackles", "tackles", "total", "tot", "tkl"] },
    { label: "SACK", fields: ["sacks", "sack"] }, { label: "YDS", fields: ["sackyards", "sackyardslost", "syl"] },
    { label: "TFL", fields: ["tacklesforloss", "tfl"] }, { label: "DEFL", fields: ["passesdefended", "passdeflections", "deflections", "defl"] },
    { label: "INT", fields: ["interceptions", "defensiveinterceptions", "int"] }, { label: "YDS (INT)", fields: ["interceptionreturnyards", "intreturnyards", "intyds"] },
    { label: "TD (INT)", fields: ["interceptionreturntd", "intreturntd", "inttd"] }, { label: "FF", fields: ["forcedfumbles", "ff"] },
    { label: "FR", fields: ["fumblerecoveries", "fr"] }, { label: "FTD", fields: ["fumblereturntd", "fumtd", "ftd"] },
    { label: "DL PLAYS", fields: ["dlplays"] }, { label: "WIN%", fields: ["dlwinpercentage", "dlwinpct"], decimal: true },
  ]},
];

function formatStat(value: number, decimal = false) {
  return decimal ? value.toFixed(1) : new Intl.NumberFormat("en-US").format(value);
}

function SortableStatTable({ group, players }: { group: StatGroup; players: TeamPlayer[] }) {
  const [sort, setSort] = useState({ column: group.defaultSort, direction: "desc" as "asc" | "desc" });
  const rows = useMemo(() => players.filter((player) => group.positions.includes(key(group.title === "Defense" ? player.DefPos : player.Pos))).sort((a, b) => {
    const column = group.columns.find((item) => item.label === sort.column) ?? group.columns[0];
    const difference = numericStat(b.Stats, column.fields) - numericStat(a.Stats, column.fields);
    return (sort.direction === "desc" ? difference : -difference) || String(a.Name).localeCompare(String(b.Name));
  }), [group, players, sort]);
  const changeSort = (column: string) => setSort((current) => ({ column, direction: current.column === column && current.direction === "desc" ? "asc" : "desc" }));

  const sumFields = (fields: string[]) => rows.reduce((sum, player) => sum + numericStat(player.Stats, fields), 0);
  const games = Math.max(0, ...rows.map((player) => numericStat(player.Stats, ["games", "gp"])));
  const total = (column: StatColumn) => {
    if (column.label === "GP") return games;
    if (column.label === "LNG") return Math.max(0, ...rows.map((player) => numericStat(player.Stats, column.fields)));
    if (column.label === "CMP%") { const attempts = sumFields(["passattempts", "passingattempts", "att"]); return attempts ? sumFields(["completions", "cmp", "passcompletions"]) / attempts * 100 : 0; }
    if (column.label === "AVG") {
      const attempts = sumFields(group.title === "Passing" ? ["passattempts", "passingattempts", "att"] : group.title === "Rushing" ? ["carries", "rushingattempts", "rushattempts"] : ["receptions", "rec"]);
      const yards = sumFields(group.title === "Passing" ? ["passingyards", "passyards"] : group.title === "Rushing" ? ["yards", "rushingyards", "rushyards"] : ["receivingyards", "recyards"]);
      return attempts ? yards / attempts : 0;
    }
    if (column.label === "YDS/G") {
      const yards = sumFields(group.title === "Passing" ? ["passingyards", "passyards"] : group.title === "Rushing" ? ["yards", "rushingyards", "rushyards"] : ["receivingyards", "recyards"]);
      return games ? yards / games : 0;
    }
    return sumFields(column.fields);
  };
  return <section className="team-stat-group"><h3>{group.title}</h3><div className="team-stat-scroll"><table><thead><tr><th>NAME</th>{group.columns.map((column) => <th className={sort.column === column.label ? "sorted" : ""} key={column.label}><button type="button" onClick={() => changeSort(column.label)}>{column.label}<span aria-hidden="true">{sort.column === column.label ? (sort.direction === "desc" ? "▾" : "▴") : ""}</span></button></th>)}</tr></thead><tbody>{rows.map((player) => <tr key={String(player.Name)}><td><a>{player.Name}</a> <small>{group.title === "Defense" ? player.DefPos : player.Pos}</small></td>{group.columns.map((column) => <td className={sort.column === column.label ? "sorted" : ""} key={column.label}>{formatStat(numericStat(player.Stats, column.fields), column.decimal)}</td>)}</tr>)}{rows.length > 0 && <tr className="team-stat-total"><td><strong>Total</strong></td>{group.columns.map((column) => <td key={column.label}><strong>{formatStat(total(column), column.decimal)}</strong></td>)}</tr>}</tbody></table></div>{rows.length === 0 && <p className="team-stats-empty">No {group.title.toLowerCase()} players on the active roster.</p>}</section>;
}
function stars(player: TeamPlayer, side: "off" | "def") {
  return Number(player[side === "off" ? "Off Stars" : "Def Stars"]) || 0;
}
function kickoffParts(game: LeagueGame) {
  const raw = String(game["Kickoff Time"] ?? game.Kickoff ?? "").trim();
  const parsed = new Date(raw);
  if (!raw || Number.isNaN(parsed.getTime())) return { date: game.Date || "TBD", time: raw || "TBD" };
  return {
    date: new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(parsed),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(parsed),
  };
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
    { label: "Passing Yards", positions: ["qb"], fields: ["passingyards", "passyards", "passyds"], side: "off" as const },
    { label: "Rushing Yards", positions: ["rb", "qb", "wr"], fields: ["yards", "rushingyards", "rushyards", "rushyds"], side: "off" as const },
    { label: "Receiving Yards", positions: ["wr", "te", "rb"], fields: ["receivingyards", "recyards", "recyds"], side: "off" as const },
    { label: "Tackles", positions: ["dl", "dt", "de", "lb", "cb", "s", "db"], fields: ["totaltackles", "tackles", "total", "tot"], side: "def" as const },
    { label: "Interceptions", positions: ["dl", "dt", "de", "lb", "cb", "s", "db"], fields: ["interceptions", "defensiveinterceptions", "int"], side: "def" as const },
  ];
  const leaders = leaderSpecs.map((spec) => {
    const eligible = players.filter((player) => spec.positions.includes(key(player.Pos ?? player.DefPos)));
    const pool = eligible.length ? eligible : players;
    return [...pool].sort((a, b) => hasStats ? numericStat(b.Stats, spec.fields) - numericStat(a.Stats, spec.fields) || stars(b, spec.side) - stars(a, spec.side) : stars(b, spec.side) - stars(a, spec.side))[0];
  });
  return <main className="team-page">
    <button className="team-page-back" type="button" onClick={onBack}>← All teams</button>
    <header className="team-page-hero">{team.Logo ? <img src={String(team.Logo)} alt="" /> : <div className="team-page-crest">{id.slice(0, 2)}</div>}<div><span>AFL TEAM</span><h1>{name}</h1><p>{record} · {divisionPlace >= 0 ? `${ordinal(divisionPlace + 1)} in ${division}` : division || "2026 Regular Season"}</p></div></header>
    <nav className="team-page-nav" aria-label={`${name} sections`}>{(["overview", "stats", "schedule", "roster"] as TeamSection[]).map((item) => <button type="button" className={section === item ? "active" : ""} onClick={() => setSection(item)} key={item}>{item}</button>)}</nav>
    {section === "stats" ? <section className="team-stats-shell">
      <header className="team-stats-heading"><div><h2>{name} Player Stats 2026</h2></div><button type="button">2026 Regular Season⌄</button></header>
      <div className="team-stats-mode"><strong>Players</strong><span>Team</span></div>
      <h3>Team Leaders</h3>
      {rosterError ? <p className="players-message players-message--error">{rosterError}</p> : <div className="team-leaders">{leaders.map((leader, index) => leader && <article key={`${leader.Name}-${index}`}><small>{leaderSpecs[index].label}</small><PlayerImage player={leader} className="leader-avatar" /><p><b>{leader.Name}</b> <em>{leader.Pos || leader.DefPos}</em></p><strong>{hasStats ? formatStat(numericStat(leader.Stats, leaderSpecs[index].fields)) : `${stars(leader, leaderSpecs[index].side)}★`}</strong></article>)}</div>}
      {!players.length && !rosterError ? <p>Loading roster…</p> : statGroups.map((group) => <SortableStatTable group={group} players={players} key={group.title} />)}
    </section> : section === "schedule" ? <section className="team-schedule-panel"><header><span>2026 SEASON</span><h2>{name} Schedule 2026</h2></header>{teamGames.length ? <><h3>Regular Season</h3><div className="team-schedule-scroll"><table><thead><tr><th>WK</th><th>DATE</th><th>OPPONENT</th><th>TIME</th><th>TV</th></tr></thead><tbody>{teamGames.map((game, index) => {
      const isHome = key(game.Home) === key(id);
      const opponent = isHome ? game.Away : game.Home;
      const opponentName = isHome ? game.AwayName : game.HomeName;
      const opponentLogo = isHome ? game.AwayLogo : game.HomeLogo;
      const kickoff = kickoffParts(game);
      const final = String(game.Qtr).toUpperCase() === "FINAL";
      return <tr key={game.GameId} onClick={() => onGame(game)}><td>{game.Week || index + 1}</td><td>{kickoff.date}</td><td><span className="team-schedule-opponent"><em>{isHome ? "vs" : "@"}</em>{opponentLogo ? <img src={opponentLogo} alt="" /> : <i>{opponent.slice(0, 2)}</i>}<strong>{opponentName || opponent}</strong></span></td><td><button type="button" onClick={() => onGame(game)}>{final ? `${Number(game.HomeScore) === Number(game.AwayScore) ? "T" : (isHome ? Number(game.HomeScore) > Number(game.AwayScore) : Number(game.AwayScore) > Number(game.HomeScore)) ? "W" : "L"} ${game.AwayScore}-${game.HomeScore}` : kickoff.time}</button></td><td>{game.Network || "AFL Network"}</td></tr>;
    })}</tbody></table></div></> : <p>No games have been scheduled.</p>}</section> : section === "roster" ? <section className="team-simple-panel"><h2>{name} Roster</h2>{players.map((player) => <p key={String(player.Name)}><b>{player.Name}</b> · {player.Pos || player.DefPos || "Player"}</p>)}</section> : <section className="team-simple-panel"><h2>{name} Overview</h2><p>{record} · {divisionPlace >= 0 ? `${ordinal(divisionPlace + 1)} in ${division}` : division}</p></section>}
  </main>;
}
