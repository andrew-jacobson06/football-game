import { useMemo, useState } from "react";
import type { LeagueGame, LeagueTeam } from "./types";

const WEEKS = Array.from({ length: 18 }, (_, index) => index + 1);

const getWeek = (game: LeagueGame, index: number) => Number(game.Week ?? index + 1);
const isFinal = (game: LeagueGame) => String(game.Qtr).toUpperCase() === "FINAL";
const teamName = (team: LeagueTeam) => String(team.Team || team.Name || team.Abbrev || "Team");

export function LeagueSchedules({
  games,
  teams,
  onSelectGame,
  onSelectTeam,
}: {
  games: LeagueGame[];
  teams: LeagueTeam[];
  onSelectGame: (game: LeagueGame) => void;
  onSelectTeam?: (team: LeagueTeam) => void;
}) {
  const [week, setWeek] = useState(1);
  const [selectedTeam, setSelectedTeam] = useState("");
  const teamOptions = useMemo(() => {
    const labels = new Map<string, string>();
    teams.forEach((team) => {
      const abbreviation = String(team.Abbrev || team.Team || "");
      if (abbreviation) labels.set(abbreviation, teamName(team));
    });
    games.forEach((game) => {
      if (!labels.has(game.Home)) labels.set(game.Home, game.Home);
      if (!labels.has(game.Away)) labels.set(game.Away, game.Away);
    });
    return [...labels].sort((a, b) => a[1].localeCompare(b[1]));
  }, [games, teams]);

  const visibleGames = useMemo(
    () => selectedTeam
      ? games.filter((game) => game.Home === selectedTeam || game.Away === selectedTeam)
      : games.filter((game, index) => getWeek(game, index) === week),
    [games, selectedTeam, week],
  );
  const selectedLabel = teamOptions.find(([id]) => id === selectedTeam)?.[1] || selectedTeam;

  return (
    <main className="schedule-center">
      {selectedTeam && (
        <header className="team-schedule-hero">
          <div className="team-schedule-crest">{selectedTeam.slice(0, 2)}</div>
          <div><span>AFL TEAM</span><h1>{selectedLabel}</h1><small>2026 season</small></div>
        </header>
      )}
      {selectedTeam && <nav className="team-subtabs" aria-label={`${selectedLabel} sections`}><span>Overview</span><span>Stats</span><strong>Schedule</strong><span>Roster</span></nav>}
      <section className="schedule-card">
        <header className="schedule-card__heading">
          <div><span className="schedule-kicker">2026 SEASON</span><h1>{selectedTeam ? `${selectedLabel} Schedule` : "AFL Schedule"}</h1></div>
          <label className="team-schedule-picker">
            <span className="sr-only">Choose a team schedule</span>
            <select value={selectedTeam} onChange={(event) => {
              const id = event.target.value;
              setSelectedTeam(id);
              const team = teams.find((item) => String(item.Abbrev || item.Team || "") === id);
              if (team) onSelectTeam?.(team);
            }}>
              <option value="">All weekly schedules</option>
              {teamOptions.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
            </select>
          </label>
        </header>

        {!selectedTeam && <nav className="schedule-weeks" aria-label="Schedule weeks">
          {WEEKS.map((item) => <button type="button" key={item} className={week === item ? "active" : ""} onClick={() => setWeek(item)}><b>WEEK {item}</b><small>{item === 1 ? "SEP 6–12" : `2026 · WK ${item}`}</small></button>)}
        </nav>}

        <div className="schedule-table-wrap">
          <div className="schedule-section-title"><h2>{selectedTeam ? "Regular Season" : `Week ${week}`}</h2><span>{visibleGames.length} {visibleGames.length === 1 ? "game" : "games"}</span></div>
          <table className="schedule-table">
            <thead><tr>{selectedTeam && <th>WK</th>}<th>Date</th><th>Matchup</th><th>{visibleGames.some(isFinal) ? "Result / Time" : "Time"}</th><th>TV</th><th>Game</th></tr></thead>
            <tbody>
              {visibleGames.map((game, index) => {
                const final = isFinal(game);
                const homeWon = Number(game.HomeScore) > Number(game.AwayScore);
                const chosenIsHome = selectedTeam === game.Home;
                const won = chosenIsHome ? homeWon : !homeWon;
                return <tr key={String(game.GameId)}>
                  {selectedTeam && <td>{getWeek(game, games.indexOf(game))}</td>}
                  <td>{game.Date || `Week ${getWeek(game, index)}`}</td>
                  <td><div className="schedule-matchup"><span><b>{game.Away}</b><small>Away</small></span><em>at</em><span><b>{game.Home}</b><small>Home</small></span></div></td>
                  <td>{final ? <span className={`game-result ${won ? "win" : "loss"}`}><b>{selectedTeam ? (won ? "W" : "L") : "FINAL"}</b> {game.AwayScore}–{game.HomeScore}</span> : <strong className="kickoff-time">{game.Kickoff || "TBD"}</strong>}</td>
                  <td>{game.Network || "AFL Network"}</td>
                  <td><button className="schedule-game-link" type="button" onClick={() => onSelectGame(game)}>Gamecast ›</button></td>
                </tr>;
              })}
            </tbody>
          </table>
          {!visibleGames.length && <div className="schedule-no-games"><strong>No games scheduled</strong><span>The Week {week} schedule has not been announced yet.</span></div>}
        </div>
      </section>
    </main>
  );
}
