import { useState } from "react";
import type { LeagueGame } from "./types";

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
        <select value={week} onChange={(event) => setWeek(Number(event.target.value))}>
          {WEEKS.map((item) => <option key={item} value={item}>Week {item}</option>)}
        </select>
      </label>
      <div className="games-banner__rail">
        {weekGames.length ? (
          weekGames.map((game) => (
            <button
              className="banner-game"
              type="button"
              key={String(game.GameId)}
              onClick={() => onSelectGame(game)}
              aria-label={`Open gamecast for ${game.Away} at ${game.Home}`}
            >
              <div className="banner-game__meta">
                {game.Kickoff || "TBD"}{" "}
                <span>{game.Network || "AFL Network"}</span>
              </div>
              <div>
                <img src={game.AwayLogo || "/favicon.svg"} alt="" />
                <strong>{game.Away}</strong>
                <b>0-0</b>
              </div>
              <div>
                <img src={game.HomeLogo || "/favicon.svg"} alt="" />
                <strong>{game.Home}</strong>
                <b>0-0</b>
              </div>
            </button>
          ))
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
