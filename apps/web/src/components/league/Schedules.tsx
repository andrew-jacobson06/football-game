import { useMemo, useState } from "react";
import type { LeagueGame, LeagueTeam } from "./types";
import { parseInteger } from "./leagueMappers";

const teamName = (team: LeagueTeam) => String(team.Team || team.Name || "");
const gameWeek = (game: LeagueGame) => Math.max(1, parseInteger(game.Week) || 1);
const isFinal = (game: LeagueGame) => String(game.Qtr).toUpperCase() === "FINAL";

function TeamLogo({ src, name }: { src?: string; name: string }) {
  return src ? <img src={src} alt="" /> : <span aria-hidden="true">{name.slice(0, 2)}</span>;
}

export function Schedules({ games, teams }: { games: LeagueGame[]; teams: LeagueTeam[] }) {
  const [week, setWeek] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState("");
  const currentYear = new Date().getFullYear();
  const teamOptions = useMemo(() => {
    const names = new Set(teams.map(teamName).filter(Boolean));
    games.forEach((game) => { names.add(game.Home); names.add(game.Away); });
    return [...names].sort();
  }, [games, teams]);
  const weeks = useMemo(() => {
    const maximum = Math.max(4, ...games.map(gameWeek));
    return Array.from({ length: maximum }, (_, index) => index + 1);
  }, [games]);

  if (selectedTeam) {
    const teamGames = games.filter((game) => game.Home === selectedTeam || game.Away === selectedTeam);
    return (
      <section className="team-schedule-page">
        <header className="team-schedule-hero">
          <div className="team-schedule-monogram">{selectedTeam.slice(0, 2)}</div>
          <div><p>TEAM</p><h2>{selectedTeam}</h2><span>Football Club</span></div>
        </header>
        <nav className="team-subtabs" aria-label={`${selectedTeam} sections`}>
          <button type="button">Overview</button><button type="button">Roster</button>
          <button type="button" className="active">Schedule</button><button type="button">Stats</button>
        </nav>
        <div className="schedule-surface team-surface">
          <div className="schedule-title-row">
            <div><span className="schedule-eyebrow">{currentYear} SEASON</span><h1>{selectedTeam} Schedule</h1></div>
            <select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)} aria-label="Choose another team">
              <option value="">All weekly schedules</option>
              {teamOptions.map((team) => <option key={team} value={team}>{team}</option>)}
            </select>
          </div>
          <h3 className="schedule-section-title">Regular Season</h3>
          <div className="schedule-table-scroll"><table className="schedule-table team-schedule-table">
            <thead><tr><th>WK</th><th>DATE</th><th>OPPONENT</th><th>{teamGames.some(isFinal) ? "RESULT" : "TIME"}</th><th>STATUS</th></tr></thead>
            <tbody>{teamGames.length ? teamGames.map((game) => {
              const home = game.Home === selectedTeam;
              const opponent = home ? game.Away : game.Home;
              const ownScore = parseInteger(home ? game.HomeScore : game.AwayScore);
              const opponentScore = parseInteger(home ? game.AwayScore : game.HomeScore);
              const final = isFinal(game);
              return <tr key={String(game.GameId)}><td>{gameWeek(game)}</td><td>{game.Date || "Date TBD"}</td>
                <td><span className="venue-mark">{home ? "vs" : "@"}</span> <TeamLogo src={home ? game.AwayLogo : game.HomeLogo} name={opponent} /> <strong>{opponent}</strong></td>
                <td>{final ? <><b className={ownScore > opponentScore ? "result-win" : "result-loss"}>{ownScore > opponentScore ? "W" : "L"}</b> {ownScore}-{opponentScore}</> : String(game.Time || "TBD")}</td>
                <td>{final ? "Final" : `Week ${gameWeek(game)}`}</td></tr>;
            }) : <tr><td colSpan={5} className="schedule-empty">No games are scheduled for this team yet.</td></tr>}</tbody>
          </table></div>
          <button className="all-schedules-link" type="button" onClick={() => setSelectedTeam("")}>← Back to all schedules</button>
        </div>
      </section>
    );
  }

  const weeklyGames = games.filter((game) => gameWeek(game) === week);
  return <section className="schedule-page"><div className="schedule-surface">
    <div className="schedule-title-row"><div><span className="schedule-eyebrow">LEAGUE</span><h1>Weekly Schedule</h1></div>
      <select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)} aria-label="Team schedules">
        <option value="">All Team Schedules</option>{teamOptions.map((team) => <option key={team} value={team}>{team}</option>)}
      </select>
    </div>
    <div className="week-picker" aria-label="Select schedule week">
      {weeks.map((item) => <button key={item} type="button" className={week === item ? "active" : ""} onClick={() => setWeek(item)}><span>WEEK</span><strong>{item}</strong></button>)}
    </div>
    <div className="week-heading"><div><span>WEEK {week}</span><h2>League Matchups</h2></div><strong>{weeklyGames.length} {weeklyGames.length === 1 ? "GAME" : "GAMES"}</strong></div>
    <div className="weekly-games">{weeklyGames.length ? weeklyGames.map((game) => {
      const final = isFinal(game); return <article className="weekly-game" key={String(game.GameId)}>
        <div className="game-date"><span>{game.Date || `WEEK ${week}`}</span><b>{final ? "FINAL" : String(game.Time || "TBD")}</b></div>
        <div className="matchup-team"><TeamLogo src={game.AwayLogo} name={game.Away}/><strong>{game.Away}</strong><b>{final ? game.AwayScore : ""}</b></div>
        <div className="matchup-team"><TeamLogo src={game.HomeLogo} name={game.Home}/><strong>{game.Home}</strong><b>{final ? game.HomeScore : ""}</b></div>
        <button type="button" onClick={() => setSelectedTeam(game.Home)}>View team schedule <span>→</span></button>
      </article>;
    }) : <div className="schedule-empty">No games have been scheduled for Week {week}.</div>}</div>
  </div></section>;
}
