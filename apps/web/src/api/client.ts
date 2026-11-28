import type { SeasonWeek } from "../components/league/seasonWeeks";
import type { Player } from "../components/players/types";

const API_BASE_URL = "http://localhost:4000/api";

const LEAGUE_SELECTION_KEY = "football-active-league";
export function selectedLeagueId(): string | null {
  try {
    return sessionStorage.getItem(LEAGUE_SELECTION_KEY);
  } catch {
    return null;
  }
}
export function selectLeague(id: string) {
  try {
    sessionStorage.setItem(LEAGUE_SELECTION_KEY, id);
  } catch {
    /* Request selection still works if browser storage is blocked. */
  }
  activeLeagueId = id;
}
let activeLeagueId = selectedLeagueId();
function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  const id = activeLeagueId;
  if (id) headers.set("X-League-Id", id);
  return fetch(url, { ...options, headers });
}
export type LeagueSummary = {
  id: string;
  name: string;
  slot: number;
  seasonId: string;
  seasonNumber: number;
  status: string;
  stage: string;
  week: number | null;
  teamCount: number;
  keeperCount: number | null;
};
export type CatalogTeam = {
  id: string;
  abbreviation: string;
  location: string;
  nickname: string;
  logoUrl: string | null;
  primaryColor: string | null;
  defaultDivision: string;
};
export type LeagueCatalog = { divisions: string[]; teams: CatalogTeam[] };
export type LeagueTeamChoice = {
  catalogId?: string;
  division: string;
  custom?: {
    abbreviation: string;
    nickname: string;
    location?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
};
export function getLeagueSlots(): Promise<{
  leagues: LeagueSummary[];
  maxSlots: number;
}> {
  return getJson("/leagues", "Unable to load saved leagues.");
}
export function getLeagueCatalog(): Promise<LeagueCatalog> {
  return getJson(
    "/league-catalog",
    "Unable to load available teams and divisions.",
  );
}
export function createLeague(input: {
  name: string;
  keeperCount: number;
  requestId: string;
  divisions: string[];
  teams: LeagueTeamChoice[];
}): Promise<{ league: LeagueSummary }> {
  return postJson("/leagues", input, "Unable to create this league.");
}

export type ApiHealth = { ok: boolean; app: string; message: string };
async function getJson<T>(path: string, message: string): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || message);
  }
  return response.json();
}
async function postJson<T>(
  path: string,
  body: unknown,
  message: string,
): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || message);
  }
  return response.json();
}
async function putJson<T>(
  path: string,
  body: unknown,
  message: string,
): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || message);
  }
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
export type TeamDefenseStats = {
  team: string;
  gamesPlayed: number;
  passingYardsAllowed: number;
  rushingYardsAllowed: number;
  totalYardsAllowed: number;
};
export async function getTeamDefenseStats(): Promise<{
  teamDefenseStats: TeamDefenseStats[];
}> {
  return getJson(
    "/team-defense-stats",
    "Failed to load game-specific defensive yardage",
  );
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
  passing: {
    completions: number;
    attempts: number;
    yards: number;
    touchdowns: number;
    interceptions: number;
    long: number;
    sacks: number;
  };
  rushing: { carries: number; yards: number; touchdowns: number; long: number };
  receiving: {
    receptions: number;
    targets: number;
    yards: number;
    touchdowns: number;
    long: number;
    firstDowns: number;
  };
  fumbles: { total: number; lost: number };
  defense: {
    dlWins: number;
    dlAttempts: number;
    tackles: number;
    tacklesForLoss: number;
    sacks: number;
    forcedFumbles: number;
    interceptions: number;
  };
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
export async function getTeamPlayers(
  team: string,
): Promise<{ players: TeamPlayer[] }> {
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
export type LeagueArticle = {
  id: string;
  season: number;
  week: number;
  gameId: string;
  type: string;
  title: string;
  summary: string;
  articleMarkdown: string;
  publishedAt: string;
  featured: boolean;
  heroImageUrl: string;
};
export async function getArticles(): Promise<{ articles: LeagueArticle[] }> {
  return getJson("/articles", "Failed to load league articles");
}
export async function getSeason(): Promise<{ week: SeasonWeek }> {
  return getJson("/season", "Failed to load the current season week");
}
export async function advanceSeason(): Promise<{
  ok: boolean;
  week: SeasonWeek;
}> {
  const response = await apiFetch(`${API_BASE_URL}/season/advance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Failed to advance the season week");
  return result;
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
): Promise<{ ok: boolean; version: number; duplicate: boolean }> {
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
export type GameplaySettings = Record<string, string> & {
  Visual_Mode?: VisualMode;
};

export async function getGameplaySettings(): Promise<{
  settings: GameplaySettings;
}> {
  return getJson("/gameplay-settings", "Failed to load game settings");
}

export async function updateGameplaySetting(
  variable: "Visual_Mode",
  value: VisualMode,
) {
  return putJson<{ ok: boolean; variable: string; value: string }>(
    `/gameplay-settings/${encodeURIComponent(variable)}`,
    { value },
    "Failed to save game settings",
  );
}

export type PlayoffSeed = { division: string; seed: number; team: string };
export async function getPlayoffBracket(): Promise<{ seeds: PlayoffSeed[] }> {
  return getJson("/playoff-bracket", "Unable to load the playoff bracket.");
}

export type AwardResult = {
  candidates: Array<{
    name: string;
    team: string;
    position: string;
    placeVotes: number[];
    total: number;
  }>;
  complete: boolean;
  winner: string | null;
  tied: boolean;
};
export type LeagueAwardsData = {
  nominations: Partial<Record<"mvp" | "opoy" | "dpoy", AwardResult>>;
  firstTeams: Array<{
    row: number;
    position: string;
    side: string;
    division: string;
    name: string;
    team: string;
  }>;
};
async function awardsRequest(
  path: string,
  method = "GET",
): Promise<LeagueAwardsData> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, { method });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to load awards.");
  return data;
}
export const getLeagueAwards = () => awardsRequest("/awards");
export const runLeagueAwardVote = (award: "mvp" | "opoy" | "dpoy") =>
  awardsRequest(`/awards/${award}/vote`, "POST");

export type PreparationTeam = {
  id: string;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  roster: { id: string; name: string; position: string | null }[];
  selectedPlayerIds: string[];
  locked: boolean;
  coachAction: "keep" | "fire" | "hire" | null;
  previousCoach: { id: string; name: string } | null;
  coach: { id: string; name: string } | null;
};
export type SeasonPreparationState = {
  seasonId: string;
  seasonNumber: number;
  year: number | null;
  leagueKeeperCount: number | null;
  keeperCount: number | null;
  phase:
    | "in_progress"
    | "season_complete"
    | "not_initialized"
    | "keepers"
    | "finalize_keepers"
    | "coach_hiring"
    | "draft_ready";
  draftReady: boolean;
  canAdvanceSeason: boolean;
  teams: PreparationTeam[];
  coachOrder: string[];
  nextTeamId: string | null;
  availableCoaches: { id: string; name: string; type: string | null }[];
};
export const getSeasonPreparation = () =>
  getJson<SeasonPreparationState>(
    "/season/preparation",
    "Unable to load season preparation.",
  );
export const advanceYear = (fromSeasonId: string, keeperCount: number) =>
  postJson<SeasonPreparationState>(
    "/season/advance-year",
    { fromSeasonId, keeperCount },
    "Unable to advance the season.",
  );
export const lockKeepers = (
  seasonId: string,
  teamId: string,
  playerIds: string[],
  coachAction: string,
) =>
  putJson<SeasonPreparationState>(
    `/season/keepers/${encodeURIComponent(teamId)}`,
    { seasonId, playerIds, coachAction },
    "Unable to lock this team’s keepers.",
  );
export const unlockKeepers = (seasonId: string, teamId: string) =>
  postJson<SeasonPreparationState>(
    `/season/keepers/${encodeURIComponent(teamId)}/unlock`,
    { seasonId },
    "Unable to unlock keepers.",
  );
export const finalizeKeepers = (seasonId: string) =>
  postJson<SeasonPreparationState>(
    "/season/keepers/finalize",
    { seasonId },
    "Unable to finalize keepers.",
  );
export const hireCoach = (seasonId: string, teamId: string, coachId: string) =>
  postJson<SeasonPreparationState>(
    "/season/coaches/hire",
    { seasonId, teamId, coachId },
    "Unable to hire this coach.",
  );

export type DraftPlayer = Player & { id: string; teamId: string | null };
export type DraftTeam = {
  awayJerseyUrl: string | null;
  id: string;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
};
export type DraftPick = {
  id: string;
  round: number;
  pickInRound: number;
  overallPick: number;
  teamId: string;
  playerId: string | null;
};
export type PlayerDraftState = {
  seasonId: string;
  draftId: string;
  status: "planned" | "running" | "completed";
  ready: boolean;
  orderMethod: string;
  teams: DraftTeam[];
  players: DraftPlayer[];
  picks: DraftPick[];
  currentPick: DraftPick | null;
  rounds: number;
  rosterTarget: number | null;
  suggestedRosterTarget: number;
};
export const getPlayerDraft = () =>
  getJson<PlayerDraftState>("/draft", "Unable to load the draft.");
export const startPlayerDraft = (seasonId: string, rosterTarget: number) =>
  postJson<PlayerDraftState>(
    "/draft/start",
    { seasonId, rosterTarget },
    "Unable to start the draft.",
  );
export const makeDraftPick = (
  seasonId: string,
  pickId: string,
  playerId: string,
) =>
  postJson<PlayerDraftState>(
    "/draft/pick",
    { seasonId, pickId, playerId },
    "Unable to save this pick.",
  );
