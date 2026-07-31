import type { LeagueGame } from "./types";

function teamMark(name: string, logo?: string) {
  return logo ? (
    <img src={logo} alt="" />
  ) : (
    <span className="team-mark-fallback">{name.slice(0, 3).toUpperCase()}</span>
  );
}

export function WeeklyGamesBanner({
  games,
  weeks,
  selectedWeek,
  onWeekChange,
}: {
  games: LeagueGame[];
  weeks: number[];
  selectedWeek: number;
  onWeekChange: (week: number) => void;
}) {
  const weekGames = games.filter((game) => Number(game.Week ?? 1) === selectedWeek);

  return (
    <section className="games-banner" aria-label="This week's games">
      <div className="games-banner__weeks" role="tablist" aria-label="Game week">
        {weeks.map((week) => (
          <button
            key={week}
            type="button"
            role="tab"
            aria-selected={selectedWeek === week}
            className={selectedWeek === week ? "active" : ""}
            onClick={() => onWeekChange(week)}
          >
            Week {week}
          </button>
        ))}
      </div>
      <div className="games-banner__rail">
        {weekGames.map((game) => (
          <article className="banner-game" key={String(game.GameId)}>
            <div className="banner-game__meta">
              <span>{game.Date || "Upcoming"}</span>
              <strong>{game.StartTime || "TBD"}</strong>
            </div>
            <div className="banner-game__team">
              {teamMark(game.Away, game.AwayLogo)}
              <strong>{game.Away}</strong>
              <span>–</span>
            </div>
            <div className="banner-game__team">
              {teamMark(game.Home, game.HomeLogo)}
              <strong>{game.Home}</strong>
              <span>–</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
