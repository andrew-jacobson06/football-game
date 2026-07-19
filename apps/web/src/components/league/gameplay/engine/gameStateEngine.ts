import type { LeagueGame } from "../../types";
import { buildGameData } from "./playLogger";
export function updateGameState(game: LeagueGame, previous: unknown) {
  return buildGameData(game, previous);
}
export function handleTouchdown(game: LeagueGame) {
  return { ...game, pendingFGTeam: game.Possession };
}
export function handleSafety(game: LeagueGame) {
  return game;
}
export function handleTOonDowns(game: LeagueGame) {
  return game;
}
