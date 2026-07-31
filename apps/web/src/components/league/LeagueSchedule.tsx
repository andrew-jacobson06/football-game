import { useMemo, useState } from "react";
import type { LeagueGame } from "./types";

const WEEKS = [1, 2, 3, 4, 5];

const gameWeek = (game: LeagueGame, index: number) =>
  Number(game.Week ?? (index % WEEKS.length) + 1);

export function LeagueSchedule({ games, onSelectGame }: { games: LeagueGame[]; onSelectGame: (game: LeagueGame) => void }) {
  const [activeWeek, setActiveWeek] = useState(1);
  const weekGames = useMemo(
    () => games.filter((game, index) => gameWeek(game, index) === activeWeek),
    [activeWeek, games],
  );

  return (
    <div className="scores-screen">
      <header className="scores-heading">
        <div><span className="scores-heading__eyebrow">2026 SEASON</span><h1>AFL Scoreboard</h1></div>
        <div className="scores-heading__status"><i /> Games have not started</div>
      </header>
      <nav className="week-tabs" aria-label="Scoreboard weeks">
        {WEEKS.map((week) => (
          <button key={week} type="button" className={activeWeek === week ? "active" : ""} onClick={() => setActiveWeek(week)}>
            <span>WEEK {week}</span><small>{week === 1 ? "SEP 6" : `WEEK ${week}`}</small>
          </button>
        ))}
      </nav>
      <section className="week-scoreboard">
        <div className="week-scoreboard__title"><div><span>WEEK {activeWeek}</span><h2>Upcoming Games</h2></div><span>{weekGames.length} {weekGames.length === 1 ? "GAME" : "GAMES"}</span></div>
        {weekGames.length ? weekGames.map((game) => (
          <article className="schedule-game" key={String(game.GameId)}>
            <div className="schedule-game__date"><strong>{game.Date || `Week ${activeWeek}`}</strong><span>{game.Kickoff || "Time TBD"} · {game.Network || "AFL Network"}</span></div>
            <div className="schedule-game__teams">
              <div><img src={game.AwayLogo || "/favicon.svg"} alt="" /><span><strong>{game.Away}</strong><small>AWAY · 0-0</small></span><b>0</b></div>
              <div><img src={game.HomeLogo || "/favicon.svg"} alt="" /><span><strong>{game.Home}</strong><small>HOME · 0-0</small></span><b>0</b></div>
            </div>
            <div className="schedule-game__action"><span>PRE-GAME</span><button type="button" onClick={() => onSelectGame(game)}>Gamecast <b>›</b></button></div>
          </article>
        )) : <div className="schedule-empty"><strong>No games scheduled yet</strong><span>Check back for the Week {activeWeek} matchup announcement.</span></div>}
      </section>
    </div>
  );
}
