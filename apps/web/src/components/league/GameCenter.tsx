import { useState } from "react";
import type { LeagueGame, GameTab } from "./types";
import { formatBallOnForPoss, formatDownDistance } from "./leagueMappers";
import { GameScoreboard } from "./GameScoreboard";
import { GameField } from "./GameField";
import { GameControls } from "./GameControls";
import { GameLog } from "./GameLog";
export function GameCenter({
  game,
  onBack,
}: {
  game: LeagueGame;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<GameTab>("gamecast");
  const [log, setLog] = useState([
    "Game loaded. Active play controls are stubbed for this migration pass.",
  ]);
  const stub = (label: string) =>
    setLog((l) => [
      `${label} clicked — TODO: port LeagueAppScript game logic.`,
      ...l,
    ]);
  return (
    <div id="gameUI">
      <button
        className="back-button league-back-button"
        type="button"
        onClick={onBack}
      >
        ← Back
      </button>
      <GameScoreboard game={game} />
      <div className="spectate-control">
        <label className="spectate-switch">
          <input
            type="checkbox"
            onChange={(e) =>
              stub(e.target.checked ? "Spectate ON" : "Spectate OFF")
            }
          />
          <span className="spectate-slider" />
        </label>
        <div className="spectate-meta">
          <div className="spectate-label">Spectate</div>
          <div className="spectate-status">OFF</div>
        </div>
      </div>
      <div className="tabs">
        {(["gamecast", "playbyplay", "boxscore", "teamstats"] as GameTab[]).map(
          (t) => (
            <button
              key={t}
              className={`tab-button ${tab === t ? "active" : ""}`}
              type="button"
              onClick={() => setTab(t)}
            >
              {t === "gamecast"
                ? "Gamecast"
                : t === "playbyplay"
                  ? "Play-by-Play"
                  : t === "boxscore"
                    ? "Box Score"
                    : "Team Stats"}
            </button>
          ),
        )}
      </div>
      {tab === "gamecast" && (
        <div className="tab-content active">
          <div className="game-info">
            <div className="info-block">
              <div className="info-label">DOWN:</div>
              <div className="info-value">
                {formatDownDistance(game.Down, game.Distance)}
              </div>
            </div>
            <div className="info-block">
              <div className="info-label">BALL ON:</div>
              <div className="info-value">
                {formatBallOnForPoss(game.BallOn, game.Possession)}
              </div>
            </div>
            <div className="info-block">
              <div className="info-label">DRIVE:</div>
              <div className="info-value">0 plays, 0 yards</div>
            </div>
          </div>
          <GameField />
          <GameControls onStub={stub} />
          <GameLog messages={log} />
        </div>
      )}
      {tab !== "gamecast" && (
        <div className="tab-content active">
          <div className="placeholder-panel">
            <h2>
              {tab === "playbyplay"
                ? "Play-by-Play"
                : tab === "boxscore"
                  ? "Box Score"
                  : "Team Stats"}
            </h2>
            <p>
              Visible shell migrated from LeagueApp. Detailed live calculations
              are TODO.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
