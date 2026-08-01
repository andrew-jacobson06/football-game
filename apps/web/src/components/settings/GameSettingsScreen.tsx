import { useState } from "react";
import { updateGameplaySetting, type VisualMode } from "../../api/client";
import { AppSelect } from "../ui/AppSelect";

type GameSettingsScreenProps = {
  visualMode: VisualMode;
  onVisualModeChange: (mode: VisualMode) => void;
  onBack: () => void;
};

export function GameSettingsScreen({ visualMode, onVisualModeChange, onBack }: GameSettingsScreenProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const changeVisualMode = async (nextMode: VisualMode) => {
    const previousMode = visualMode;
    onVisualModeChange(nextMode);
    setIsSaving(true);
    setMessage(null);
    try {
      await updateGameplaySetting("Visual_Mode", nextMode);
      setMessage("UI mode saved.");
    } catch {
      onVisualModeChange(previousMode);
      setMessage("Could not save UI mode. Your previous mode was restored.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="settings-screen" aria-labelledby="settings-title">
      <header className="settings-header">
        <button className="settings-back" type="button" onClick={onBack} aria-label="Back to main menu">←</button>
        <div>
          <p className="settings-eyebrow">Animal Football</p>
          <h1 id="settings-title">Game Settings</h1>
        </div>
      </header>
      <div className="settings-layout">
        <nav className="settings-tabs" aria-label="Settings sections">
          <button className="settings-tab settings-tab--active" type="button" aria-current="page">Visual</button>
        </nav>
        <div className="settings-panel">
          <div className="setting-row">
            <div>
              <label htmlFor="visual-mode">UI Mode</label>
              <p>Choose the color theme used throughout the game.</p>
            </div>
            <AppSelect
              id="visual-mode"
              value={visualMode}
              disabled={isSaving}
              onChange={(event) => void changeVisualMode(event.target.value as VisualMode)}
            >
              <option value="Dark">Dark</option>
              <option value="Light">Light</option>
            </AppSelect>
          </div>
          {message && <p className="settings-message" role="status">{message}</p>}
        </div>
      </div>
    </section>
  );
}
