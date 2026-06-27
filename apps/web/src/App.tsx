import { useState } from "react";
import { BackendStatus } from "./components/BackendStatus";
import { PlayersScreen } from "./components/players/PlayersScreen";
import "./App.css";

type Screen = "players";

function App() {
  const [screen] = useState<Screen>("players");

  return (
    <main className="app">
      <BackendStatus />
      <nav className="migration-nav" aria-label="Migration screens">
        <button className="migration-nav__button migration-nav__button--active" type="button">
          Players
        </button>
      </nav>
      {screen === "players" && <PlayersScreen />}
    </main>
  );
}

export default App;
