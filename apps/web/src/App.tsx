import { useEffect, useState } from "react";
import { getGameplaySettings, type VisualMode } from "./api/client";
import { GameSettingsScreen } from "./components/settings/GameSettingsScreen";
import { MainMenuScreen } from "./components/mainMenu/MainMenuScreen";
import { PlayersScreen } from "./components/players/PlayersScreen";
import { LeagueAppScreen } from "./components/league/LeagueAppScreen";
import "./App.css";

export type Screen = "mainMenu" | "players" | "league" | "settings";

function App() {
  const [screen, setScreen] = useState<Screen>("mainMenu");
  const [visualMode, setVisualMode] = useState<VisualMode>("Dark");

  useEffect(() => {
    let active = true;
    getGameplaySettings()
      .then(({ settings }) => {
        if (active && (settings.Visual_Mode === "Dark" || settings.Visual_Mode === "Light")) {
          setVisualMode(settings.Visual_Mode);
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = visualMode.toLowerCase();
    document.documentElement.style.colorScheme = visualMode.toLowerCase();
  }, [visualMode]);

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
      {screen === "settings" && (
        <GameSettingsScreen
          visualMode={visualMode}
          onVisualModeChange={setVisualMode}
          onBack={() => setScreen("mainMenu")}
        />
      )}
    </main>
  );
}

export default App;
