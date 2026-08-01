import type { LeagueGame } from "./types";
import { formatClock, formatQuarter } from "./leagueMappers";
export function GameScoreboard({ game }: { game: LeagueGame }) {
  return (
    <div className="scoreboard">
      <div className="team-block home">
        <div className="team-info">
          <img
            className="team-logo"
            src={game.HomeLogo || "https://via.placeholder.com/96"}
            alt={`${game.Home} logo`}
          />
          <div className="team-name">{game.Home}</div>
          <div className="team-record">{game["Home Record"] || "0-0"}</div>
        </div>
        <div className="score-section">
          <div className="score-row">
            <div className="team-score">{game.HomeScore}</div>
            <span className="football-icon">
              {game.Possession === "Home" ? "🏈" : ""}
            </span>
          </div>
          <div className="timeouts">
            <span className="timeout-dot" />
            <span className="timeout-dot" />
            <span className="timeout-dot" />
          </div>
        </div>
      </div>
      <div className="center-info">
        <span className="quarter">{formatQuarter(game.Qtr)}</span>
        <span className="clock">{formatClock(game.Time)}</span>
      </div>
      <div className="team-block away">
        <div className="team-info">
          <img
            className="team-logo"
            src={game.AwayLogo || "https://via.placeholder.com/96"}
            alt={`${game.Away} logo`}
          />
          <div className="team-name">{game.Away}</div>
          <div className="team-record">{game["Away Record"] || "0-0"}</div>
        </div>
        <div className="score-section">
          <div className="score-row">
            <span className="football-icon">
              {game.Possession === "Away" ? "🏈" : ""}
            </span>
            <div className="team-score">{game.AwayScore}</div>
          </div>
          <div className="timeouts">
            <span className="timeout-dot" />
            <span className="timeout-dot" />
            <span className="timeout-dot" />
          </div>
        </div>
      </div>
    </div>
  );
}
