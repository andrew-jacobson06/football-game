import { useState } from "react";
import { BackendStatus } from "./components/BackendStatus";
import { MainMenuScreen } from "./components/mainMenu/MainMenuScreen";
import { PlayersScreen } from "./components/players/PlayersScreen";
import { LeagueAppScreen } from "./components/league/LeagueAppScreen";
import "./App.css";

export type Screen = "mainMenu" | "players" | "league" | "debug";

function App() {
  const [screen, setScreen] = useState<Screen>("mainMenu");

  return (
    <main className="app">
      <BackendStatus />
      <nav className="migration-nav" aria-label="Migration screens">
        <button
          className={`migration-nav__button ${screen === "mainMenu" ? "migration-nav__button--active" : ""}`}
          type="button"
          onClick={() => setScreen("mainMenu")}
        >
          Main Menu
        </button>
        <button
          className={`migration-nav__button ${screen === "players" ? "migration-nav__button--active" : ""}`}
          type="button"
          onClick={() => setScreen("players")}
        >
          Players
        </button>
        <button
          className={`migration-nav__button ${screen === "league" ? "migration-nav__button--active" : ""}`}
          type="button"
          onClick={() => setScreen("league")}
        >
          League App
        </button>
        <button
          className={`migration-nav__button ${screen === "debug" ? "migration-nav__button--active" : ""}`}
          type="button"
          onClick={() => setScreen("debug")}
        >
          Backend Status
        </button>
      </nav>
      {screen === "mainMenu" && (
        <MainMenuScreen
          onNavigate={(nextScreen) => nextScreen && setScreen(nextScreen)}
        />
      )}
      {screen === "players" && (
        <PlayersScreen onBack={() => setScreen("mainMenu")} />
      )}
      {screen === "league" && <LeagueAppScreen />}
      {screen === "debug" && (
        <section className="debug-status-screen">
          <h1>Backend / Debug Status</h1>
          <p>
            The backend connection indicator remains visible in the top-right
            corner.
          </p>
          <button
            className="back-button debug-status-screen__back"
            type="button"
            onClick={() => setScreen("mainMenu")}
          >
            ← Back
          </button>
        </section>
      )}
    </main>
  );
}

export default App;
