import { useState } from "react";
import { MainMenuScreen } from "./components/mainMenu/MainMenuScreen";
import { PlayersScreen } from "./components/players/PlayersScreen";
import { LeagueAppScreen } from "./components/league/LeagueAppScreen";
import "./App.css";

export type Screen = "mainMenu" | "players" | "league";

function App() {
  const [screen, setScreen] = useState<Screen>("mainMenu");

  return (
    <main className="app">
      {screen === "mainMenu" && (
        <MainMenuScreen
          onNavigate={(nextScreen) => nextScreen && setScreen(nextScreen)}
        />
      )}
      {screen === "players" && (
        <PlayersScreen onBack={() => setScreen("mainMenu")} />
      )}
      {screen === "league" && (
        <LeagueAppScreen onBack={() => setScreen("mainMenu")} />
      )}
    </main>
  );
}

export default App;
