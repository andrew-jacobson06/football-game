const API_BASE_URL = "http://localhost:4000/api";

export async function getApiHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Failed to reach backend API");
  }

  return response.json();
}