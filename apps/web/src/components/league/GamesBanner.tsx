import { useEffect, useState } from "react";
import { AppSelect } from "../ui/AppSelect";
import type { LeagueGame } from "./types";
import { formatBallOnForPoss, formatClock, formatDownDistance } from "./leagueMappers";

import { SEASON_WEEKS, gameSeasonWeek, parseSeasonWeek, seasonWeekLabel, type SeasonWeek } from "./seasonWeeks";

type GamesBannerProps = {
  games: LeagueGame[];
  currentWeek: SeasonWeek | null;
  onHome: () => void;
  onSelectGame: (game: LeagueGame) => void;
};

export function GamesBanner({ games, currentWeek, onHome, onSelectGame }: GamesBannerProps) {
  const [selectedWeek, setSelectedWeek] = useState<SeasonWeek | null>(null);
  useEffect(() => { setSelectedWeek(null); }, [currentWeek]);
  const week = selectedWeek ?? currentWeek ?? 1;
  const weeks = SEASON_WEEKS;
  const weekGames = games.filter((game, index) => gameSeasonWeek(game, index) === week);

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
      <label className={`games-banner__picker ${typeof week === "string" ? "games-banner__picker--playoffs" : ""}`}>
        <span>{typeof week === "string" ? "Round" : "Week"}</span>
        <AppSelect containerClassName="app-select--compact" value={week} onChange={(event) => setSelectedWeek(parseSeasonWeek(event.target.value))}>
          {weeks.map((item) => <option key={item} value={item}>{seasonWeekLabel(item)}</option>)}
        </AppSelect>
      </label>
      <div className="games-banner__rail">
        {weekGames.length ? (
          weekGames.map((game) => {
            const final = String(game.Qtr).toUpperCase() === "FINAL";
            const possession = String(game.Possession).toLowerCase();
            const unstarted = ["", "UNSTARTED"].includes(String(game.Qtr).trim().toUpperCase());
            return (
            <button
              className="banner-game"
              type="button"
              key={String(game.GameId)}
              onClick={() => onSelectGame(game)}
              aria-label={`Open gamecast for ${game.Away} at ${game.Home}`}
            >
              <div className="banner-game__meta">
                <span>{final ? "FINAL" : unstarted ? "PRE-GAME" : `Q${game.Qtr} · ${formatClock(game.Time)}`}</span>
                {!final && !unstarted && <span>{formatDownDistance(game.Down, game.Distance, game.BallOn, game.Possession)} · Ball on {formatBallOnForPoss(game.BallOn, game.Possession)}</span>}
              </div>
              <div>
                <img src={game.AwayLogo || "/favicon.svg"} alt="" />
                <strong>{game.Away} {!final && !unstarted && possession === "away" && <i aria-label="Possession">🏈</i>}</strong>
                <b>{game.AwayScore}</b>
              </div>
              <div>
                <img src={game.HomeLogo || "/favicon.svg"} alt="" />
                <strong>{game.Home} {!final && !unstarted && possession === "home" && <i aria-label="Possession">🏈</i>}</strong>
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
