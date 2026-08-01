import { useMemo, useState } from "react";
import type { LeagueGame } from "./types";
import { formatBallOnForPoss, formatClock, formatDownDistance } from "./leagueMappers";

const WEEKS = Array.from({ length: 18 }, (_, index) => index + 1);

const gameWeek = (game: LeagueGame, index: number) =>
  Number(game.Week ?? (index % WEEKS.length) + 1);

function kickoffParts(game: LeagueGame) {
  const raw = String(game["Kickoff Time"] ?? game.Kickoff ?? "").trim();
  const parsed = new Date(raw);
  if (!raw || Number.isNaN(parsed.getTime())) {
    return { date: game.Date || `Week ${game.Week || "—"}`, time: raw || "Time TBD" };
  }
  return {
    date: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(parsed),
    time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(parsed),
  };
}

export function LeagueSchedule({ games, onSelectGame }: { games: LeagueGame[]; onSelectGame: (game: LeagueGame) => void }) {
  const [activeWeek, setActiveWeek] = useState(1);
  const weekGames = useMemo(
    () => games.filter((game, index) => gameWeek(game, index) === activeWeek),
    [activeWeek, games],
  );
  const finalGames = weekGames.filter((game) => String(game.Qtr).toUpperCase() === "FINAL").length;
  const weekLabel = (week: number) => {
    const game = games.find((item, index) => gameWeek(item, index) === week);
    if (!game) return `WEEK ${week}`;
    const parsed = new Date(String(game["Kickoff Time"] ?? game.Kickoff ?? ""));
    return Number.isNaN(parsed.getTime())
      ? `WEEK ${week}`
      : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parsed).toUpperCase();
  };

  return (
    <div className="scores-screen">
      <header className="scores-heading">
        <div><span className="scores-heading__eyebrow">2026 SEASON</span><h1>AFL Scoreboard</h1></div>
        <div className="scores-heading__status"><i /> {finalGames ? `${finalGames} final` : "Games scheduled"}</div>
      </header>
      <nav className="week-tabs" aria-label="Scoreboard weeks">
        {WEEKS.map((week) => (
          <button key={week} type="button" className={activeWeek === week ? "active" : ""} onClick={() => setActiveWeek(week)}>
            <span>WEEK {week}</span><small>{weekLabel(week)}</small>
          </button>
        ))}
      </nav>
      <section className="week-scoreboard">
        <div className="week-scoreboard__title"><div><span>WEEK {activeWeek}</span><h2>{finalGames ? "Scores & Results" : "Upcoming Games"}</h2></div><span>{weekGames.length} {weekGames.length === 1 ? "GAME" : "GAMES"}</span></div>
        {weekGames.length ? weekGames.map((game) => {
          const gameStatus = String(game.Qtr).toUpperCase();
          const final = gameStatus === "FINAL";
          const unstarted = gameStatus === "UNSTARTED";
          const possession = String(game.Possession).toLowerCase();
          const awayScore = Number(game.AwayScore);
          const homeScore = Number(game.HomeScore);
          const resultClass = (score: number, opponentScore: number) => final && score !== opponentScore
            ? score > opponentScore ? "schedule-game__team--winner" : "schedule-game__team--loser"
            : "";
          const kickoff = unstarted ? kickoffParts(game) : null;
          return (
          <article className={`schedule-game ${unstarted ? "schedule-game--unstarted" : ""}`} key={String(game.GameId)}>
            {kickoff && <div className="schedule-game__date"><strong>{kickoff.date}</strong><span>{kickoff.time} · {game.Network || "Network TBD"}</span>{game.Weather && <small>{game.Weather}</small>}</div>}
            <div className="schedule-game__teams">
              <div className={resultClass(awayScore, homeScore)}><img src={game.AwayLogo || "/favicon.svg"} alt="" /><span><strong>{game.AwayName || game.Away} {!final && possession === "away" && <i className="possession-football" aria-label="Possession">🏈</i>}</strong><small>AWAY · {game.Away}</small></span><b>{game.AwayScore}</b></div>
              <div className={resultClass(homeScore, awayScore)}><img src={game.HomeLogo || "/favicon.svg"} alt="" /><span><strong>{game.HomeName || game.Home} {!final && possession === "home" && <i className="possession-football" aria-label="Possession">🏈</i>}</strong><small>HOME · {game.Home}</small></span><b>{game.HomeScore}</b></div>
            </div>
            <div className="schedule-game__action">
              <div className="schedule-game__situation">
                {final ? <strong>FINAL</strong> : unstarted ? <strong>Q1 · {formatClock(game.Time)}</strong> : <><strong>{formatDownDistance(game.Down, game.Distance)}</strong><span>Ball on {formatBallOnForPoss(game.BallOn, game.Possession)}</span><small>Q{game.Qtr} · {formatClock(game.Time)}</small></>}
              </div>
              <button type="button" onClick={() => onSelectGame(game)}>Gamecast <b>›</b></button>
            </div>
          </article>
        );}) : <div className="schedule-empty"><strong>No games scheduled yet</strong><span>Check back for the Week {activeWeek} matchup announcement.</span></div>}
      </section>
    </div>
  );
}
