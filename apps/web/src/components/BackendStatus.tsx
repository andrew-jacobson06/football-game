import { useEffect, useState } from "react";
import { getApiHealth, type ApiHealth } from "../api/client";

export function BackendStatus() {
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkApi() {
      try {
        const result = await getApiHealth();
        setApiHealth(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown API error");
      }
    }

    checkApi();
  }, []);

  return (
    <aside className={`backend-status ${error ? "backend-status--error" : ""}`}>
      <strong>Backend:</strong>{" "}
      {error && <span>{error}</span>}
      {!error && !apiHealth && <span>Checking...</span>}
      {apiHealth && <span>Connected · {apiHealth.message}</span>}
    </aside>
  );
}
