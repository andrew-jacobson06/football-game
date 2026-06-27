import type { Player } from "../components/players/types";

const API_BASE_URL = "http://localhost:4000/api";

export type ApiHealth = {
  ok: boolean;
  app: string;
  message: string;
};

export async function getApiHealth(): Promise<ApiHealth> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Failed to reach backend API");
  }

  return response.json();
}

export async function getPlayers(): Promise<{ players: Player[] }> {
  const response = await fetch(`${API_BASE_URL}/players`);

  if (!response.ok) {
    throw new Error("Failed to load players from backend API");
  }

  return response.json();
}
