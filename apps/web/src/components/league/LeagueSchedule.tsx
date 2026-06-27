import type { LeagueGame } from "./types";
import {
  formatBallOnForPoss,
  formatClock,
  formatDownDistance,
  formatQuarter,
  parseInteger,
} from "./leagueMappers";

export function LeagueSchedule({
  games,
  onSelectGame,
}: {
  games: LeagueGame[];
  onSelectGame: (game: LeagueGame) => void;
}) {
  return (
    <div className="game-list">
      {games.map((g) => {
        const final = String(g.Qtr).toUpperCase() === "FINAL";
        const hs = parseInteger(g.HomeScore);
        const as = parseInteger(g.AwayScore);
        const rowClass = (score: number, other: number) =>
          `team-row ${score > other ? "winner" : score < other ? "loser" : ""}`;
        return (
          <button
            key={String(g.GameId)}
            type="button"
            className={`game-card ${final ? "final" : ""}`}
            onClick={() => onSelectGame(g)}
          >
            <div className={rowClass(hs, as)}>
              <img
                className="team-logo"
                src={g.HomeLogo || "https://via.placeholder.com/24"}
                alt="Home Logo"
              />
              <div className="team-name-wrap">
                <span className="team-name">{g.Home}</span>
                <span className="poss-indicator">
                  {g.Possession === "Home" ? "🏈" : ""}
                </span>
              </div>
              <span className="team-score">{g.HomeScore}</span>
              {!final && (
                <>
                  <span className="team-time">{formatClock(g.Time)}</span>
                  <span className="team-down">
                    {formatDownDistance(g.Down, g.Distance)}
                  </span>
                </>
              )}
            </div>
            <div className={rowClass(as, hs)}>
              <img
                className="team-logo"
                src={g.AwayLogo || "https://via.placeholder.com/24"}
                alt="Away Logo"
              />
              <div className="team-name-wrap">
                <span className="team-name">{g.Away}</span>
                <span className="poss-indicator">
                  {g.Possession === "Away" ? "🏈" : ""}
                </span>
              </div>
              <span className="team-score">{g.AwayScore}</span>
              {!final && (
                <>
                  <span className="team-qtr">{formatQuarter(g.Qtr)}</span>
                  <span className="team-ball">
                    {formatBallOnForPoss(g.BallOn, g.Possession)}
                  </span>
                </>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
