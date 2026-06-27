export function GameControls({ onAction }: { onAction: (label: string) => void }) {
  const buttons = ["Run Play", "Pass Play", "Field Goal", "Punt", "Two Point", "Timeout"];
  return (
    <div className="control-panel">
      <h3>Controls</h3>
      <div className="game-controls">
        {buttons.map((b) => <button key={b} type="button" onClick={() => onAction(b)}>{b}</button>)}
      </div>
      <p className="control-note">Gameplay controls now call the migrated API-backed game engine. DOM-specific Apps Script animations remain TODO.</p>
    </div>
  );
}
