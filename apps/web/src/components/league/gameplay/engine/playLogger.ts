import type { LeagueGame } from "../../types";
import type { NormalizedOutcome, PlayKind } from "./types";
import { n } from "./utils";

export function determinePlayOutcome(result: string, playType: PlayKind, yards: number, receiver = "", tackler = "", recoveredBy = "", currentDown: unknown = 1): NormalizedOutcome {
  const turnover = ["Fumble", "Interception", "TO on Downs"].includes(result) || (result === "Fumble" && recoveredBy && recoveredBy !== receiver) ? "Yes" : "";
  const defenseResult = result === "Sack" ? "Sack" : result === "Interception" ? "Interception" : result === "Fumble" ? "Fumble" : yards < 0 ? "TFL" : "";
  const description = result === "Sack" ? "Sack" : result || (playType === "Pass" && !receiver ? "Incomplete" : "Normal");
  const outcome = result || (n(currentDown) === 4 && yards <= 0 ? "TO on Downs" : "Normal");
  void tackler;
  return { outcome, defenseResult, turnover, description };
}

export function buildGameData(game: LeagueGame, previous: unknown) {
  return { gameId: game.GameId, quarter: game.Qtr, time: game.Time, down: game.Down, distance: game.Distance, ballOn: game.BallOn, homeScore: game.HomeScore, awayScore: game.AwayScore, driveStart: (game as unknown as Record<string, unknown>).DriveStart, previous, possession: game.Possession, homeTimeouts: (game as unknown as Record<string, unknown>).HomeTimeouts, awayTimeouts: (game as unknown as Record<string, unknown>).AwayTimeouts };
}

export function logPlayToDB(prev: LeagueGame, game: LeagueGame, playtype: PlayKind, player: string, receiver: string, yards: number, tackler: string, result: string, historyLength: number, extra: Record<string, unknown> = {}) {
  const normalized = determinePlayOutcome(result, playtype, yards, receiver, tackler, String(extra.recoveredby ?? ""), prev.Down);
  const playid = `${prev.GameId}-${Date.now()}-${historyLength + 1}`;
  return {
    gameid: prev.GameId,
    playid,
    time: prev.Time,
    qtr: prev.Qtr,
    possession: prev.Possession,
    down: prev.Down,
    distance: prev.Distance,
    ballon: prev.BallOn,
    playtype,
    player,
    receiver,
    yards,
    defensepredicted: extra.defensepredicted ?? "Run",
    predictioncorrect: extra.predictioncorrect ?? (playtype === "Run"),
    tackler,
    result: normalized.outcome,
    defenseresult: normalized.defenseResult,
    turnover: normalized.turnover,
    description: normalized.description,
    desc: normalized.description,
    recoveredby: extra.recoveredby ?? "",
    airyards: extra.airyards ?? (playtype === "Pass" ? yards : 0),
    newdown: game.Down,
    newdist: game.Distance,
    newballon: game.BallOn,
    drivestart: (prev as unknown as Record<string, unknown>).DriveStart ?? prev.BallOn,
    homescore: game.HomeScore,
    awayscore: game.AwayScore,
    ...extra,
  };
}

export function buildResult(prev: LeagueGame, game: LeagueGame, playtype: PlayKind, player: string, receiver: string, yards: number, tackler: string, result: string, historyLength: number, extra: Record<string, unknown> = {}) {
  const play = logPlayToDB(prev, game, playtype, player, receiver, yards, tackler, result, historyLength, extra);
  return { game, play, text: `${playtype}: ${result}` };
}
