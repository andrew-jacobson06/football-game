import { useState, type CSSProperties } from "react";
import type { LeagueGame, LeagueTeam } from "./types";
import { formatClock, formatQuarter } from "./leagueMappers";
import { scoreboardTeam } from "./scoreboardTeam";

function ScoreboardTeam({
  team,
  side,
  possession,
  trailing,
}: {
  team: ReturnType<typeof scoreboardTeam>;
  side: "home" | "away";
  possession: boolean;
  trailing: boolean;
}) {
  const [failedLogo, setFailedLogo] = useState("");
  return (
    <div
      className={`game-scoreboard__team game-scoreboard__team--${side}`}
      aria-label={team.fullName}
    >
      {team.logo && failedLogo !== team.logo ? (
        <img
          className="game-scoreboard__logo"
          src={team.logo}
          alt={`${team.fullName} logo`}
          onError={() => setFailedLogo(team.logo)}
        />
      ) : (
        <span
          className="game-scoreboard__logo game-scoreboard__logo--fallback"
          role="img"
          aria-label={`${team.fullName} logo`}
        >
          {team.abbreviation}
        </span>
      )}
      <div className="game-scoreboard__identity">
        <span className="game-scoreboard__name">{team.fullName}</span>
        <abbr className="game-scoreboard__abbreviation" title={team.fullName}>
          {team.abbreviation}
        </abbr>
      </div>
      <div className="game-scoreboard__meta">
        <span className="game-scoreboard__record">{team.record}</span>
        <span
          className="game-scoreboard__timeouts"
          aria-label={`${team.timeouts} timeouts remaining`}
        >
          {Array.from({ length: 3 }, (_, index) => (
            <span
              key={index}
              aria-hidden="true"
              className={`game-scoreboard__timeout${index < team.timeouts ? " game-scoreboard__timeout--available" : ""}`}
            />
          ))}
        </span>
      </div>
      <div
        className={`game-scoreboard__score-line${trailing ? " game-scoreboard__score-line--trailing" : ""}`}
      >
        <span className="game-scoreboard__score">{team.score}</span>
        {possession && (
          <span className="game-scoreboard__possession" role="img" aria-label="Possession" />
        )}
      </div>
    </div>
  );
}

export function GameScoreboard({
  game,
  home,
  away,
}: {
  game: LeagueGame;
  home?: LeagueTeam;
  away?: LeagueTeam;
}) {
  const homeTeam = scoreboardTeam(game, "Home", home),
    awayTeam = scoreboardTeam(game, "Away", away);
  const final = /^(FINAL|F)$/i.test(String(game.Qtr));
  const styles = {
    "--scoreboard-home-color": homeTeam.primaryColor,
    "--scoreboard-away-color": awayTeam.primaryColor,
  } as CSSProperties;
  return (
    <div
      className="scoreboard game-scoreboard"
      style={styles}
      aria-label="Game scoreboard"
    >
      <ScoreboardTeam
        team={homeTeam}
        side="home"
        possession={game.Possession === "Home"}
        trailing={final && Number(game.HomeScore) < Number(game.AwayScore)}
      />
      <div className="game-scoreboard__status" aria-live="polite">
        <span className="game-scoreboard__period">
          {final
            ? "Final"
            : Number(game.Qtr) > 0
              ? formatQuarter(game.Qtr)
              : "Pre-game"}
        </span>
        {!final && (
          <span className="game-scoreboard__clock">
            {formatClock(game.Time)}
          </span>
        )}
      </div>
      <ScoreboardTeam
        team={awayTeam}
        side="away"
        possession={game.Possession === "Away"}
        trailing={final && Number(game.AwayScore) < Number(game.HomeScore)}
      />
    </div>
  );
}
