import { useEffect, useMemo, useRef, useState } from "react";
import {
  getPlayers,
  getPlayerRushingGames,
  getPlayerStats,
  type PlayerRushingGame,
  type PlayerStats,
} from "../../api/client";
import type { Player } from "../players/types";
import { PLACEHOLDER_LOGOS } from "./leagueConstants";

type StatsView = "Player" | "Team";
type Leader = { name: string; image: string; value: number };

const RUSHING_COLUMNS = [
  "Carries",
  "Yards",
  "TD",
  "Fum",
  "Fum Lost",
  "First Down",
  "Juke",
  "BrokenTackle",
  "Avg",
  "Loss",
  "5+",
  "10+",
  "20+",
  "30+",
  "50+",
  "Long",
] as const;

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
  onComplete,
  onPlayerSelect,
}: {
  title: string;
  stat: string;
  kind: StatsView;
  leaders?: Leader[];
  isLoading?: boolean;
  error?: string | null;
  onComplete?: () => void;
  onPlayerSelect?: (name: string) => void;
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
                  <img className="player-stats-image" src={leader.image} alt="" />
                  <button className="team-link player-name-button" type="button" onClick={() => onPlayerSelect?.(leader.name)}>
                    {leader.name}
                  </button>
                </td>
                <td className="stat-value">{leader.value}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {!isLoading && !error && rows.length > 0 && onComplete && (
        <div className="complete-link">
          <button type="button" onClick={onComplete}>
            Complete Leaders
          </button>
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
  const [showAllRushers, setShowAllRushers] = useState(false);
  const [rusherFilter, setRusherFilter] = useState("");
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [playerGames, setPlayerGames] = useState<PlayerRushingGame[]>([]);
  const [isGameLogLoading, setIsGameLogLoading] = useState(false);
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

  useEffect(() => {
    if (!selectedPlayerName) return;
    getPlayerRushingGames(selectedPlayerName)
      .then((result) => setPlayerGames(result.games))
      .catch(() => setPlayerGames([]))
      .finally(() => setIsGameLogLoading(false));
  }, [selectedPlayerName]);

  const selectPlayer = (name: string) => {
    setPlayerGames([]);
    setIsGameLogLoading(true);
    setSelectedPlayerName(name);
  };

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

  const allRushers = useMemo(() => {
    const query = rusherFilter.trim().toLowerCase();
    const playersByName = new Map(
      players.map((player) => [player.Name?.trim().toLowerCase(), player]),
    );

    return stats
      .filter((row) => Number(row.Carries) >= 1)
      .filter((row) => !query || row.Player?.toLowerCase().includes(query))
      .map((row) => ({
        row,
        image: playerImage(playersByName.get(row.Player.trim().toLowerCase())),
      }))
      .sort(
        (a, b) =>
          Number(b.row.Yards) - Number(a.row.Yards) ||
          a.row.Player.localeCompare(b.row.Player),
      );
  }, [players, rusherFilter, stats]);

  const selectedPlayer = players.find(
    (player) => player.Name?.trim().toLowerCase() === selectedPlayerName?.toLowerCase(),
  );
  const selectedTotals = stats.find(
    (row) => row.Player?.trim().toLowerCase() === selectedPlayerName?.toLowerCase(),
  );

  if (selectedPlayerName && selectedTotals) {
    const average = Number(selectedTotals.Carries)
      ? (Number(selectedTotals.Yards) / Number(selectedTotals.Carries)).toFixed(1)
      : "0.0";
    return (
      <section className="player-rushing-profile">
        <button className="profile-back" type="button" onClick={() => setSelectedPlayerName(null)}>← Back to rushing leaders</button>
        <header className="player-profile-summary">
          <div className="player-profile-image-wrap">
            <img src={playerImage(selectedPlayer)} alt={selectedPlayerName} />
          </div>
          <div>
            <p className="player-profile-kicker">{selectedPlayer?.Pos || "PLAYER"}</p>
            <h2>{selectedPlayerName}</h2>
            <p className="player-profile-team">{selectedPlayer?.Team || "Free Agent"}</p>
            <dl className="player-profile-facts">
              <div><dt>Position</dt><dd>{selectedPlayer?.Pos || "—"}</dd></div>
              <div><dt>Offense</dt><dd>{selectedPlayer?.["Off Stars"] || "—"} stars</dd></div>
              <div><dt>Speed</dt><dd>{selectedPlayer?.Speed || "—"}</dd></div>
              <div><dt>Stamina</dt><dd>{selectedPlayer?.Stamina || "—"}</dd></div>
            </dl>
          </div>
        </header>
        <section className="season-totals-card">
          <h3>Season 1 Rushing Totals</h3>
          <div className="season-total-grid">
            {[["CAR", selectedTotals.Carries], ["YDS", selectedTotals.Yards], ["TD", selectedTotals.TD || "0"], ["AVG", average], ["LONG", selectedTotals.Long || "0"]].map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
        </section>
        <section className="player-game-log">
          <h3>Game Log</h3>
          <div className="complete-leaders-table-scroll">
            <table>
              <thead><tr><th>Game</th><th>Opponent</th><th>Result</th><th>CAR</th><th>YDS</th><th>AVG</th><th>TD</th><th>LNG</th></tr></thead>
              <tbody>
                {isGameLogLoading ? <tr><td colSpan={8}>Loading game log…</td></tr> : playerGames.length === 0 ? <tr><td colSpan={8}>No game-by-game rushing stats available.</td></tr> : playerGames.map((game, index) => (
                  <tr key={game.gameId}><td>{game.date || `Game ${index + 1}`}</td><td>{game.location} {game.opponent}</td><td><span className={`game-result ${game.result.startsWith("W") ? "win" : "loss"}`}>{game.result}</span></td><td>{game.carries}</td><td>{game.yards}</td><td>{game.carries ? (game.yards / game.carries).toFixed(1) : "0.0"}</td><td>{game.touchdowns}</td><td>{game.long}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    );
  }

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
            {showAllRushers ? (
              <div className="complete-rushing-leaders">
                <div className="complete-leaders-tools">
                  <button type="button" onClick={() => setShowAllRushers(false)}>
                    Back to Leaders
                  </button>
                  <label>
                    <span>Filter rushers</span>
                    <input
                      type="search"
                      value={rusherFilter}
                      onChange={(event) => setRusherFilter(event.target.value)}
                      placeholder="Player name"
                    />
                  </label>
                </div>
                <div className="complete-leaders-table-scroll">
                  <table className="complete-leaders-table">
                    <thead>
                      <tr>
                        <th>Player</th>
                        {RUSHING_COLUMNS.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allRushers.length === 0 ? (
                        <tr>
                          <td colSpan={RUSHING_COLUMNS.length + 1} className="leader-message">
                            No rushers match this filter.
                          </td>
                        </tr>
                      ) : (
                        allRushers.map(({ row, image }) => (
                          <tr key={row.Player}>
                            <td className="complete-leader-player">
                              <img className="player-stats-image" src={image} alt="" />
                              <button className="player-name-button" type="button" onClick={() => selectPlayer(row.Player)}>{row.Player}</button>
                            </td>
                            {RUSHING_COLUMNS.map((column) => (
                              <td key={column}>{row[column] || "0"}</td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <LeaderTable
                title="RUSHING"
                stat="YDS"
                kind="Player"
                leaders={rushingLeaders}
                isLoading={isLoading}
                error={error}
                onComplete={() => setShowAllRushers(true)}
                onPlayerSelect={selectPlayer}
              />
            )}
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
