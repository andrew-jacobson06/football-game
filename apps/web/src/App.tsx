import { useEffect, useState } from "react";
import { getApiHealth } from "./api/client";
import "./App.css";

type ApiHealth = {
  ok: boolean;
  app: string;
  message: string;
};

function App() {
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
    <main className="app">
      <section className="scoreboard">
        <p className="eyebrow">Workbook Football</p>
        <h1>Local UI Migration</h1>
        <p>
          React frontend is running locally and checking the Node backend.
        </p>
      </section>

      <section className="card">
        <h2>Backend Connection</h2>

        {error && <p className="error">{error}</p>}

        {!error && !apiHealth && <p>Checking backend...</p>}

        {apiHealth && (
          <div className="success-box">
            <p>
              <strong>Status:</strong> Connected
            </p>
            <p>
              <strong>App:</strong> {apiHealth.app}
            </p>
            <p>
              <strong>Message:</strong> {apiHealth.message}
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;