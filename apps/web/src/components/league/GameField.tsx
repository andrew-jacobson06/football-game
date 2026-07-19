export default function GameField() {
  
  return (
      <div class="game-shell"> 
        <div class="scorebug"> 
          <div class="score-main" id="scoreMain">POR 7 | CLT 3</div> 
          <div class="situation" id="situationText">Paste animation JSON below and run play</div> 
        </div> 
        <div class="field-viewport" id="fieldViewport"> 
          <div class="field-wrap" id="field"> 
            <div class="field-title">Dynamic Football Animation View</div> 
            <div class="camera-note" id="cameraNote">Manual scroll field</div> 
            <div class="team-end" id="cltEnd">WILDFIRE</div> 
            <div class="team-end" id="porEnd">PORTLAND</div> 
            <div class="field-line los-line" id="losLine"></div> 
            <div class="field-line first-down-line" id="firstDownLine"></div> 
            <div class="field-line end-line" id="endLine"></div> 
            <div class="line-label" id="losLabel">LOS</div> 
            <div class="line-label" id="firstDownLabel">1ST</div> 
            <div class="line-label" id="endLabel">END</div> 
            <div class="football" id="football"></div> 
          </div> 
        </div> 
        <div class="caption" id="caption"> Paste a play animation JSON below, or load the example. </div> 
        <div class="controls"> 
          <button onclick="loadExampleJson()">Load Example JSON</button> 
          <button onclick="runJsonFromBox()">Run JSON Play</button> 
          <button onclick="resetCurrentPlan()">Reset Current Play</button> 
        </div> 
        <textarea id="jsonInput" spellcheck="false" placeholder="Paste PlayAnimationPlan JSON here..."></textarea> 
        <div class="error-box" id="errorBox"></div> 
      </div>
  );
}