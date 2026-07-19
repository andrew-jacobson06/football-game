type GameFieldActionName = "loadExampleJson" | "runJsonFromBox" | "resetCurrentPlan";

declare global {
  interface Window {
    loadExampleJson?: () => void;
    runJsonFromBox?: () => void;
    resetCurrentPlan?: () => void;
  }
}

const runGameFieldAction = (actionName: GameFieldActionName) => {
  window[actionName]?.();
};

export default function GameField() {
  return (
    <div className="game-shell">
      <div className="scorebug">
        <div className="score-main" id="scoreMain">
          POR 7 | CLT 3
        </div>
        <div className="situation" id="situationText">
          Paste animation JSON below and run play
        </div>
      </div>
      <div className="field-viewport" id="fieldViewport">
        <div className="field-wrap" id="field">
          <div className="field-title">Dynamic Football Animation View</div>
          <div className="camera-note" id="cameraNote">
            Manual scroll field
          </div>
          <div className="team-end" id="cltEnd">
            WILDFIRE
          </div>
          <div className="team-end" id="porEnd">
            PORTLAND
          </div>
          <div className="field-line los-line" id="losLine" />
          <div className="field-line first-down-line" id="firstDownLine" />
          <div className="field-line end-line" id="endLine" />
          <div className="line-label" id="losLabel">
            LOS
          </div>
          <div className="line-label" id="firstDownLabel">
            1ST
          </div>
          <div className="line-label" id="endLabel">
            END
          </div>
          <div className="football" id="football" />
        </div>
      </div>
      <div className="caption" id="caption">
        Paste a play animation JSON below, or load the example.
      </div>
      <div className="controls">
        <button type="button" onClick={() => runGameFieldAction("loadExampleJson")}>
          Load Example JSON
        </button>
        <button type="button" onClick={() => runGameFieldAction("runJsonFromBox")}>
          Run JSON Play
        </button>
        <button type="button" onClick={() => runGameFieldAction("resetCurrentPlan")}>
          Reset Current Play
        </button>
      </div>
      <textarea id="jsonInput" spellCheck={false} placeholder="Paste PlayAnimationPlan JSON here..." />
      <div className="error-box" id="errorBox" />
    </div>
  );
}
