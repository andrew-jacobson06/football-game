import { useEffect, useMemo, useState } from "react";
import type { LeagueGame, GameTab } from "./types";
import { formatBallOnForPoss, formatDownDistance } from "./leagueMappers";
import { getFrontendSettings, getGameState, getPlayerTraits, getPlayHistory, savePlayAndGame } from "../../api/client";
import { GameScoreboard } from "./GameScoreboard";
import { GameField } from "./GameField";
import { GameControls } from "./GameControls";
import { GameLog } from "./GameLog";
import { goForTwo, handleTimeout, kickFG, passPlay, punt, runPlay } from "./gameplay/gameEngine";

function normalizeGame(game: LeagueGame, state: Record<string, unknown> | null): LeagueGame {
  if (!state) return game;
  return {
    ...game,
    GameId: (state.Id ?? game.GameId) as string | number,
    Home: String(state.Home ?? game.Home), Away: String(state.Away ?? game.Away),
    HomeScore: (state.HomeScore ?? game.HomeScore) as string | number,
    AwayScore: (state.AwayScore ?? game.AwayScore) as string | number,
    Qtr: (state.Qtr ?? game.Qtr) as string | number, Time: (state.Time ?? game.Time) as string | number,
    Down: (state.Down ?? game.Down) as string | number, Distance: (state.Distance ?? game.Distance) as string | number,
    BallOn: (state.BallOn ?? game.BallOn) as string | number, Possession: String(state.Possession ?? game.Possession),
    HomeLogo: String(state.HomeLogo ?? game.HomeLogo ?? ""), AwayLogo: String(state.AwayLogo ?? game.AwayLogo ?? ""),
    ...(state as Record<string, unknown>),
  };
}
export function GameCenter({ game, onBack }: { game: LeagueGame; onBack: () => void }) {
  const [tab, setTab] = useState<GameTab>("gamecast");
  const [currentGame, setCurrentGame] = useState(game);
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [players, setPlayers] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [log, setLog] = useState(["Loading game state, play history, players, and frontend settings..."]);
  const ctx = useMemo(() => ({ players, settings, historyLength: history.length }), [players, settings, history.length]);
  useEffect(() => {
    let active = true;
    Promise.all([getGameState(game.GameId), getPlayHistory(game.GameId), getPlayerTraits(), getFrontendSettings()])
      .then(([stateRes, historyRes, playerRes, settingsRes]) => {
        if (!active) return;
        setCurrentGame(normalizeGame(game, stateRes.gameState));
        setHistory(historyRes.plays); setPlayers(playerRes.players); setSettings(settingsRes);
        setLog(historyRes.plays.length ? historyRes.plays.slice(-20).reverse().map((p) => String(p.Result ?? p.Description ?? p.result ?? "Loaded play")) : ["Game loaded. No prior play history found."]);
      })
      .catch((error: unknown) => setLog((l) => [`Failed to load live game data: ${error instanceof Error ? error.message : String(error)}`, ...l]));
    return () => { active = false; };
  }, [game]);
  const persist = async (result: ReturnType<typeof runPlay>) => {
    setCurrentGame(result.game); setHistory((h) => [...h, result.play]); setLog((l) => [result.text, ...l]);
    const gamePayload = { gameId: result.game.GameId, quarter: result.game.Qtr, time: result.game.Time, down: result.game.Down, distance: result.game.Distance, ballOn: result.game.BallOn, homeScore: result.game.HomeScore, awayScore: result.game.AwayScore, driveStart: (result.game as unknown as Record<string, unknown>).DriveStart, previous: currentGame.BallOn, possession: result.game.Possession, homeTimeouts: (result.game as unknown as Record<string, unknown>).HomeTimeouts, awayTimeouts: (result.game as unknown as Record<string, unknown>).AwayTimeouts };
    try { await savePlayAndGame(result.game.GameId, { play: result.play, game: gamePayload }); }
    catch (error) { setLog((l) => [`Save failed: ${error instanceof Error ? error.message : String(error)}`, ...l]); }
  };
  const action = (label: string) => {
    if (label === "Run Play") void persist(runPlay(currentGame, ctx));
    else if (label === "Pass Play") void persist(passPlay(currentGame, ctx));
    else if (label === "Field Goal") void persist(kickFG(currentGame, ctx));
    else if (label === "Punt") void persist(punt(currentGame, ctx));
    else if (label === "Two Point") void persist(goForTwo(currentGame, ctx));
    else if (label === "Timeout") void persist(handleTimeout(currentGame, ctx));
  };
  return (
    <div id="gameUI">
      <button className="back-button league-back-button" type="button" onClick={onBack}>← Back</button>
      <GameScoreboard game={currentGame} />
      <div className="spectate-control"><label className="spectate-switch"><input type="checkbox" onChange={(e) => setLog((l) => [`Spectate ${e.target.checked ? "ON" : "OFF"}`, ...l])} /><span className="spectate-slider" /></label><div className="spectate-meta"><div className="spectate-label">Spectate</div><div className="spectate-status">OFF</div></div></div>
      <div className="tabs">{(["gamecast", "playbyplay", "boxscore", "teamstats"] as GameTab[]).map((t) => <button key={t} className={`tab-button ${tab === t ? "active" : ""}`} type="button" onClick={() => setTab(t)}>{t === "gamecast" ? "Gamecast" : t === "playbyplay" ? "Play-by-Play" : t === "boxscore" ? "Box Score" : "Team Stats"}</button>)}</div>
      {tab === "gamecast" && <div className="tab-content active"><div className="game-info"><div className="info-block"><div className="info-label">DOWN:</div><div className="info-value">{formatDownDistance(currentGame.Down, currentGame.Distance)}</div></div><div className="info-block"><div className="info-label">BALL ON:</div><div className="info-value">{formatBallOnForPoss(currentGame.BallOn, currentGame.Possession)}</div></div><div className="info-block"><div className="info-label">DRIVE:</div><div className="info-value">{history.length} plays logged</div></div></div><GameField /><GameControls onAction={action} /><GameLog messages={log} /></div>}
      {tab !== "gamecast" && <div className="tab-content active"><div className="placeholder-panel"><h2>{tab === "playbyplay" ? "Play-by-Play" : tab === "boxscore" ? "Box Score" : "Team Stats"}</h2>{history.map((p, i) => <p key={String(p.PlayId ?? p.playid ?? i)}>{String(p.Result ?? p.Description ?? p.result ?? "Play")}</p>)}</div></div>}
    </div>
  );
}
