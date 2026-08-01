import { useMemo, useState } from "react";
import type { LeagueGame, LeagueTeam } from "./types";

const getWeek = (game: LeagueGame, index: number) => Number(game.Week ?? index + 1);
const teamName = (team: LeagueTeam) => String(team.Team || team.Name || team.Abbrev || "Team");
const teamAbbrev = (team: LeagueTeam) => String(team.Abbrev || team.Team || "");

function kickoffDate(game: LeagueGame) {
  const raw = String(game["Kickoff Time"] ?? game.Kickoff ?? game.Date ?? "").trim();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function kickoffTime(game: LeagueGame) {
  const parsed = kickoffDate(game);
  if (!parsed) return String(game["Kickoff Time"] ?? game.Kickoff ?? "TBD");
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(parsed);
}

function dayLabel(game: LeagueGame) {
  const parsed = kickoffDate(game);
  if (!parsed) return game.Date || "Date TBD";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function dayKey(game: LeagueGame) {
  const parsed = kickoffDate(game);
  if (!parsed) return game.Date || "tbd";
  return `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`;
}

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
  const [selectedTeam, setSelectedTeam] = useState("");
  const [activeWeek, setActiveWeek] = useState<number>();
  const teamsByAbbrev = useMemo(() => new Map(teams.map((team) => [teamAbbrev(team), team])), [teams]);
  const teamOptions = useMemo(() => {
    const labels = new Map<string, string>();
    teams.forEach((team) => {
      const abbreviation = teamAbbrev(team);
      if (abbreviation) labels.set(abbreviation, teamName(team));
    });
    games.forEach((game) => {
      if (!labels.has(game.Home)) labels.set(game.Home, game.Home);
      if (!labels.has(game.Away)) labels.set(game.Away, game.Away);
    });
    return [...labels].sort((a, b) => a[1].localeCompare(b[1]));
  }, [games, teams]);
  const weeks = useMemo(() => [...new Set(games.map(getWeek))].sort((a, b) => a - b), [games]);
  const displayedWeek = activeWeek ?? weeks[0];

  const visibleGames = useMemo(() => games.filter((game, index) =>
    getWeek(game, index) === displayedWeek
    && (!selectedTeam || game.Home === selectedTeam || game.Away === selectedTeam)), [displayedWeek, games, selectedTeam]);
  const gamesByDay = useMemo(() => {
    const grouped = new Map<string, LeagueGame[]>();
    visibleGames.forEach((game) => grouped.set(dayKey(game), [...(grouped.get(dayKey(game)) ?? []), game]));
    return [...grouped.values()];
  }, [visibleGames]);
  const selectedLabel = teamOptions.find(([id]) => id === selectedTeam)?.[1] || selectedTeam;
  const selectedTeamDetails = teamsByAbbrev.get(selectedTeam);

  const locationFor = (game: LeagueGame) => {
    const home = teamsByAbbrev.get(game.Home);
    return game.Location || game.Stadium || game.Venue || String(home?.City || game.HomeName || game.Home);
  };

  return (
    <main className="schedule-center">
      {selectedTeam && (
        <header className="team-schedule-hero">
          <div className="team-schedule-crest">{selectedTeamDetails?.Logo ? <img src={String(selectedTeamDetails.Logo)} alt="" /> : selectedTeam.slice(0, 2)}</div>
          <div><span>AFL TEAM</span><h1>{selectedLabel}</h1><small>2026 season</small></div>
        </header>
      )}
      <section className="schedule-card">
        <header className="schedule-card__heading">
          <div><span className="schedule-kicker">2026 SEASON</span><h1>{selectedTeam ? `${selectedLabel} Schedule` : "AFL Schedule"}</h1></div>
          <label className="team-schedule-picker">
            <span className="sr-only">Choose a team schedule</span>
            <select value={selectedTeam} onChange={(event) => {
              const id = event.target.value;
              setSelectedTeam(id);
              const team = teamsByAbbrev.get(id);
              if (team) onSelectTeam?.(team);
            }}>
              <option value="">Team Schedules</option>
              {teamOptions.map(([id, label]) => <option value={id} key={id}>{label}</option>)}
            </select>
          </label>
        </header>

        <nav className="schedule-weeks" aria-label="Schedule weeks">
          {weeks.map((week) => <button className={week === displayedWeek ? "active" : ""} key={week} type="button" onClick={() => setActiveWeek(week)}><b>WEEK {week}</b><small>{games.filter((game, index) => getWeek(game, index) === week).length} games</small></button>)}
        </nav>

        <div className="schedule-table-wrap">
          {gamesByDay.map((dayGames) => (
            <section className="schedule-day" key={dayKey(dayGames[0])}>
              <h2>{dayLabel(dayGames[0])}</h2>
              <table className="schedule-table">
                <thead><tr><th>Matchup</th><th>Time</th><th>TV</th><th>Location / Weather</th></tr></thead>
                <tbody>{dayGames.map((game) => (
                  <tr key={String(game.GameId)} onClick={() => onSelectGame(game)}>
                    <td><div className="schedule-matchup">
                      <span className="schedule-team"><img src={game.HomeLogo || "/favicon.svg"} alt="" /><b>{game.HomeName || game.Home}</b></span>
                      <em>@</em>
                      <span className="schedule-team"><img src={game.AwayLogo || "/favicon.svg"} alt="" /><b>{game.AwayName || game.Away}</b></span>
                    </div></td>
                    <td><strong className="kickoff-time">{kickoffTime(game)}</strong></td>
                    <td>{game.Network || "TBD"}</td>
                    <td><span className="schedule-location">{locationFor(game)}</span>{game.Weather && <small className="schedule-weather">{game.Weather}</small>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </section>
          ))}
          {!visibleGames.length && <div className="schedule-no-games"><strong>No games scheduled</strong><span>No matchups have been announced for Week {displayedWeek ?? "—"}.</span></div>}
        </div>
      </section>
    </main>
  );
}
