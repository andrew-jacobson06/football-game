export function GameControls({ onStub }: { onStub: (label: string) => void }) {
  const buttons = [
    "Run Play",
    "Pass Play",
    "Field Goal",
    "Punt",
    "Kickoff",
    "Timeout",
  ];
  return (
    <div className="control-panel">
      <h3>Controls</h3>
      <div className="game-controls">
        {buttons.map((b) => (
          <button key={b} type="button" onClick={() => onStub(b)}>
            {b}
          </button>
        ))}
      </div>
      <p className="control-note">
        Game logic migration TODO: these controls are preserved visually and
        currently use safe placeholder handlers.
      </p>
    </div>
  );
}
