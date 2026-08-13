import type { Player } from "../components/players/types";

const API_BASE_URL = "http://localhost:4000/api";

export type ApiHealth = { ok: boolean; app: string; message: string };
async function getJson<T>(path: string, message: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) throw new Error(message);
  return response.json();
}
async function postJson<T>(
  path: string,
  body: unknown,
  message: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(message);
  return response.json();
}
async function putJson<T>(path: string, body: unknown, message: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(message);
  return response.json();
}
export async function getApiHealth(): Promise<ApiHealth> {
  return getJson("/health", "Failed to reach backend API");
}
export async function getPlayers(): Promise<{ players: Player[] }> {
  return getJson("/players", "Failed to load players from backend API");
}
export type PlayerStats = Record<string, string> & {
  Player: string;
  Carries: string;
  Yards: string;
};
export async function getPlayerStats(): Promise<{
  playerStats: PlayerStats[];
}> {
  return getJson("/player-stats", "Failed to load player stats");
}
export type PlayerGame = {
  gameId: string;
  opponent: string;
  location: "vs" | "@";
  result: string;
  carries: number;
  yards: number;
  touchdowns: number;
  long: number;
  date: string;
  passing: { completions: number; attempts: number; yards: number; touchdowns: number; interceptions: number; long: number; sacks: number };
  rushing: { carries: number; yards: number; touchdowns: number; long: number };
  receiving: { receptions: number; targets: number; yards: number; touchdowns: number; long: number; firstDowns: number };
  fumbles: { total: number; lost: number };
  defense: { dlWins: number; dlAttempts: number; tackles: number; tacklesForLoss: number; sacks: number; forcedFumbles: number; interceptions: number };
};
export async function getPlayerGames(
  playerName: string,
  team?: string,
): Promise<{ games: PlayerGame[] }> {
  const teamQuery = team ? `?team=${encodeURIComponent(team)}` : "";
  return getJson(
    `/players/${encodeURIComponent(playerName)}/games${teamQuery}`,
    "Failed to load player game log",
  );
}
export async function getTeams(): Promise<{
  teams: Record<string, unknown>[];
}> {
  return getJson("/teams", "Failed to load teams from backend API");
}
export async function getStandings(): Promise<{
  standings: Record<string, unknown>[];
}> {
  return getJson("/standings", "Failed to load standings from backend API");
}
export type TeamPlayer = Player & { Stats?: PlayerStats | null };
export async function getTeamPlayers(team: string): Promise<{ players: TeamPlayer[] }> {
  return getJson(
    `/teams/${encodeURIComponent(team)}/players`,
    "Failed to load the team roster",
  );
}
export async function getGames(): Promise<{
  games: Record<string, unknown>[];
}> {
  return getGamesList();
}
export async function getGamesList(): Promise<{
  games: Record<string, unknown>[];
}> {
  return getJson("/games", "Failed to load games from backend API");
}
export async function getSeason(): Promise<{ week: number }> {
  return getJson("/season", "Failed to load the current season week");
}
export async function advanceSeason(): Promise<{ ok: boolean; week: number }> {
  return postJson("/season/advance", {}, "Failed to advance the season week");
}
export async function getGameState(
  gameId: string | number,
): Promise<{ gameState: Record<string, unknown> | null }> {
  return getJson(
    `/games/${encodeURIComponent(String(gameId))}/state`,
    "Failed to load game state",
  );
}
export async function getPlayHistory(
  gameId: string | number,
): Promise<{ plays: Record<string, unknown>[] }> {
  return getJson(
    `/games/${encodeURIComponent(String(gameId))}/play-history`,
    "Failed to load play history",
  );
}
export async function savePlayAndGame(
  gameId: string | number,
  data: unknown,
): Promise<{ ok: boolean }> {
  return postJson(
    `/games/${encodeURIComponent(String(gameId))}/save-play-and-game`,
    data,
    "Failed to save play and game",
  );
}
export async function getPlayerTraits(): Promise<{
  players: Record<string, unknown>[];
}> {
  return getJson("/player-traits", "Failed to load player traits");
}
export async function getFrontendSettings(): Promise<Record<string, unknown>> {
  return getJson("/frontend-settings", "Failed to load frontend settings");
}
export type VisualMode = "Dark" | "Light";
export type GameplaySettings = Record<string, string> & { Visual_Mode?: VisualMode };

export async function getGameplaySettings(): Promise<{ settings: GameplaySettings }> {
  return getJson("/gameplay-settings", "Failed to load game settings");
}

export async function updateGameplaySetting(variable: "Visual_Mode", value: VisualMode) {
  return putJson<{ ok: boolean; variable: string; value: string }>(
    `/gameplay-settings/${encodeURIComponent(variable)}`,
    { value },
    "Failed to save game settings",
  );
}
