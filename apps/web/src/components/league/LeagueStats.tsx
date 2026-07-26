import { useEffect, useMemo, useRef, useState } from "react";
import {
  getPlayers,
  getPlayerStats,
  type PlayerStats,
} from "../../api/client";
import type { Player } from "../players/types";
import { PLACEHOLDER_LOGOS } from "./leagueConstants";

type StatsView = "Player" | "Team";
type Leader = { name: string; image: string; value: number };

function playerImage(player: Player | undefined) {
  return (
    player?.Image ||
    player?.["Player Image from AI"] ||
    player?.Jersey ||
    player?.["Jersey Image"] ||
    PLACEHOLDER_LOGOS.team
  );
}

function LeaderTable({
  title,
  stat,
  kind,
  leaders,
  isLoading = false,
  error,
}: {
  title: string;
  stat: string;
  kind: StatsView;
  leaders?: Leader[];
  isLoading?: boolean;
  error?: string | null;
}) {
  const placeholderLeaders = Array.from({ length: 5 }, (_, i) => ({
    name: `${kind} Name`,
    image: PLACEHOLDER_LOGOS.team,
    value: [308.5, 298.7, 296.4, 294.0, 291.7][i],
  }));
  const rows = leaders ?? placeholderLeaders;

  return (
    <div className="leader-group">
      <table className="leader-table">
        <thead>
          <tr>
            <th className="statCol1">{title}</th>
            <th className="stat-value">{stat}</th>
          </tr>
        </thead>
        <tbody>
          {isLoading || error || rows.length === 0 ? (
            <tr>
              <td className="leader-message" colSpan={2}>
                {isLoading
                  ? "Loading leaders…"
                  : error || "No rushing stats available."}
              </td>
            </tr>
          ) : (
            rows.map((leader, i) => (
              <tr key={`${leader.name}-${i}`}>
                <td className="team-cell">
                  <span className="rank">{i + 1}</span>
                  <img className="team-logo" src={leader.image} alt="" />
                  <span className="team-link">{leader.name}</span>
                </td>
                <td className="stat-value">{leader.value}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!isLoading && !error && rows.length > 0 && (
        <div className="complete-link">
          <a href="#">Complete Leaders</a>
        </div>
      )}
    </div>
  );
}

export function LeagueStats() {
  const [activeView, setActiveView] = useState<StatsView>("Team");
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRequestedPlayerStats = useRef(false);

  useEffect(() => {
    if (activeView !== "Player" || hasRequestedPlayerStats.current) return;

    hasRequestedPlayerStats.current = true;
    setIsLoading(true);
    setError(null);
    Promise.all([getPlayerStats(), getPlayers()])
      .then(([statsResult, playersResult]) => {
        setStats(statsResult.playerStats);
        setPlayers(playersResult.players);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unable to load leaders"),
      )
      .finally(() => setIsLoading(false));
  }, [activeView]);

  const rushingLeaders = useMemo(() => {
    const playersByName = new Map(
      players.map((player) => [player.Name?.trim().toLowerCase(), player]),
    );

    return stats
      .filter((row) => row.Player?.trim())
      .map((row) => {
        const name = row.Player.trim();
        const player = playersByName.get(name.toLowerCase());
        return { name, image: playerImage(player), value: Number(row.Yards) || 0 };
      })
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [players, stats]);

  return (
    <>
      <div className="stats-tabs">
        {(["Player", "Team"] as StatsView[]).map((view) => (
          <button
            className={`stats-tab ${activeView === view ? "active" : ""}`}
            key={view}
            type="button"
            aria-pressed={activeView === view}
            onClick={() => setActiveView(view)}
          >
            {view}
          </button>
        ))}
      </div>
      <div className="season-row">
        <button className="season-pill">Season 1 ▾</button>
      </div>
      <div className="stats-content active">
        {activeView === "Player" ? (
          <div className="stats-section">
            <div className="stats-section-title">Offensive Leaders</div>
            <LeaderTable
              title="RUSHING"
              stat="YDS"
              kind="Player"
              leaders={rushingLeaders}
              isLoading={isLoading}
              error={error}
            />
          </div>
        ) : (
          <>
            <div className="stats-section">
              <div className="stats-section-title">Offensive Leaders</div>
              {["TOTAL YARDS", "PASSING", "RUSHING"].map((title) => (
                <LeaderTable key={title} title={title} stat="YDS/G" kind="Team" />
              ))}
            </div>
            <div className="stats-section">
              <div className="stats-section-title">Defensive Leaders</div>
              {["TACKLES", "SACKS", "INTERCEPTIONS"].map((title) => (
                <LeaderTable
                  key={title}
                  title={title}
                  stat={
                    title === "TACKLES" ? "TOT" : title === "SACKS" ? "SACK" : "INT"
                  }
                  kind="Player"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
