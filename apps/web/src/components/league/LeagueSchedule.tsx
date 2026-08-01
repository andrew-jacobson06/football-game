import { useMemo, useState } from "react";
import type { LeagueGame } from "./types";

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
          const kickoff = kickoffParts(game);
          const final = String(game.Qtr).toUpperCase() === "FINAL";
          return (
          <article className="schedule-game" key={String(game.GameId)}>
            <div className="schedule-game__date"><strong>{kickoff.date}</strong><span>{kickoff.time} · {game.Network || "Network TBD"}</span>{game.Weather && <small>{game.Weather}</small>}</div>
            <div className="schedule-game__teams">
              <div><img src={game.AwayLogo || "/favicon.svg"} alt="" /><span><strong>{game.AwayName || game.Away}</strong><small>AWAY · {game.Away}</small></span><b>{game.AwayScore}</b></div>
              <div><img src={game.HomeLogo || "/favicon.svg"} alt="" /><span><strong>{game.HomeName || game.Home}</strong><small>HOME · {game.Home}</small></span><b>{game.HomeScore}</b></div>
            </div>
            <div className="schedule-game__action"><span>{final ? "FINAL" : `Q${game.Qtr} · ${game.Time}`}</span><button type="button" onClick={() => onSelectGame(game)}>Gamecast <b>›</b></button></div>
          </article>
        );}) : <div className="schedule-empty"><strong>No games scheduled yet</strong><span>Check back for the Week {activeWeek} matchup announcement.</span></div>}
      </section>
    </div>
  );
}
