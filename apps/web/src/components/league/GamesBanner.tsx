import { useState } from "react";
import { AppSelect } from "../ui/AppSelect";
import type { LeagueGame } from "./types";
import { formatBallOnForPoss, formatClock, formatDownDistance } from "./leagueMappers";

const WEEKS = [1, 2, 3, 4, 5];

const gameWeek = (game: LeagueGame, index: number) =>
  Number(game.Week ?? (index % WEEKS.length) + 1);

type GamesBannerProps = {
  games: LeagueGame[];
  onHome: () => void;
  onSelectGame: (game: LeagueGame) => void;
};

export function GamesBanner({ games, onHome, onSelectGame }: GamesBannerProps) {
  const [week, setWeek] = useState(1);
  const weekGames = games.filter((game, index) => gameWeek(game, index) === week);

  return (
    <aside className="games-banner" aria-label="Games this week">
      <button
        className="games-banner__brand"
        type="button"
        onClick={onHome}
        aria-label="Return to the AFL league home"
      >
        AFL
      </button>
      <label className="games-banner__picker">
        <span>Week</span>
        <AppSelect containerClassName="app-select--compact" value={week} onChange={(event) => setWeek(Number(event.target.value))}>
          {WEEKS.map((item) => <option key={item} value={item}>Week {item}</option>)}
        </AppSelect>
      </label>
      <div className="games-banner__rail">
        {weekGames.length ? (
          weekGames.map((game) => {
            const final = String(game.Qtr).toUpperCase() === "FINAL";
            const possession = String(game.Possession).toLowerCase();
            return (
            <button
              className="banner-game"
              type="button"
              key={String(game.GameId)}
              onClick={() => onSelectGame(game)}
              aria-label={`Open gamecast for ${game.Away} at ${game.Home}`}
            >
              <div className="banner-game__meta">
                <span>{final ? "FINAL" : `Q${game.Qtr} · ${formatClock(game.Time)}`}</span>
                {!final && <span>{formatDownDistance(game.Down, game.Distance)} · Ball on {formatBallOnForPoss(game.BallOn, game.Possession)}</span>}
              </div>
              <div>
                <img src={game.AwayLogo || "/favicon.svg"} alt="" />
                <strong>{game.Away} {possession === "away" && <i aria-label="Possession">🏈</i>}</strong>
                <b>{game.AwayScore}</b>
              </div>
              <div>
                <img src={game.HomeLogo || "/favicon.svg"} alt="" />
                <strong>{game.Home} {possession === "home" && <i aria-label="Possession">🏈</i>}</strong>
                <b>{game.HomeScore}</b>
              </div>
            </button>
          );})
        ) : (
          <p className="games-banner__empty">
            Week {week} matchups are coming soon
          </p>
        )}
      </div>
      <div className="games-banner__all">Full Scoreboard <span aria-hidden="true">›</span></div>
    </aside>
  );
}
