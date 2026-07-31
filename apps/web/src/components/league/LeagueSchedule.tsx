import type { LeagueGame } from "./types";
export function LeagueSchedule({
  games,
  weeks,
  selectedWeek,
  onWeekChange,
  onSelectGame,
}: {
  games: LeagueGame[];
  weeks: number[];
  selectedWeek: number;
  onWeekChange: (week: number) => void;
  onSelectGame: (game: LeagueGame) => void;
}) {
  const weekGames = games.filter((game) => Number(game.Week ?? 1) === selectedWeek);

  return (
    <div className="scores-page">
      <header className="scores-heading">
        <div><span className="eyebrow">Regular season</span><h1>League Scores</h1></div>
        <span className="scores-heading__week">Week {selectedWeek}</span>
      </header>
      <div className="week-tabs" role="tablist" aria-label="Score weeks">
        {weeks.map((week) => <button key={week} type="button" role="tab" aria-selected={week === selectedWeek} className={week === selectedWeek ? "active" : ""} onClick={() => onWeekChange(week)}>Week {week}</button>)}
      </div>
      <div className="game-list">
      {weekGames.map((g) => (
          <button
            key={String(g.GameId)}
            type="button"
            className="game-card game-card--scheduled"
            onClick={() => onSelectGame(g)}
          >
            <div className="game-card__topline"><span>{g.Date || `Week ${selectedWeek}`}</span><span>Scheduled</span></div>
            <div className="scheduled-matchup">
              <div className="scheduled-team"><span className="team-mark-fallback">{g.Away.slice(0, 3)}</span><strong>{g.Away}</strong><span className="record">0-0</span></div>
              <div className="scheduled-kickoff"><strong>{g.StartTime || "TBD"}</strong><span>Kickoff</span><small>Game preview →</small></div>
              <div className="scheduled-team"><span className="team-mark-fallback">{g.Home.slice(0, 3)}</span><strong>{g.Home}</strong><span className="record">0-0</span></div>
            </div>
          </button>
      ))}
      </div>
    </div>
  );
}
