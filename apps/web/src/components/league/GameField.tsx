export default function GameField() {
  
  return (
    <div className="field-wrapper">
      <img
        src="https://andrew-jacobson06.github.io/public-audio/fpost1.png"
        id="fgPostLeft"
        alt="Field Goal Post"
      />
      <div id="field3D">
        <div className="yardline" style={{ left: "8.3333%" }}></div>
        <div className="yardline" style={{ left: "16.6667%"}}>                    
          <span className="label top left">1</span>
          <span className="label top right">0</span>               
          <span className="label bottom left">1</span>
          <span className="label bottom right">0</span>
        </div>
        <div className="yardline" style={{ left: "25%"}}>                
          <span className="label top left">2</span>
          <span className="label top right">0</span>               
          <span className="label bottom left">2</span>
          <span className="label bottom right">0</span>
        </div>
        <div className="yardline" style={{ left: "33.3333%"}}>                
          <span className="label top left">3</span>
          <span className="label top right">0</span>               
          <span className="label bottom left">3</span>
          <span className="label bottom right">0</span>
        </div>
        <div className="yardline" style={{ left: "41.6667%"}}>                 
          <span className="label top left">4</span>
          <span className="label top right">0</span>               
          <span className="label bottom left">4</span>
          <span className="label bottom right">0</span>
        </div>
        <div className="yardline" style={{ left: "50%"}}>                
          <span className="label top left">5</span>
          <span className="label top right">0</span>               
          <span className="label bottom left">5</span>
          <span className="label bottom right">0</span>
        </div>
        <div className="yardline" style={{ left: "58.3333%"}}>              
          <span className="label top left">4</span>
          <span className="label top right">0</span>               
          <span className="label bottom left">4</span>
          <span className="label bottom right">0</span>
        </div>
        <div className="yardline" style={{ left: "66.6667%"}}>                
          <span className="label top left">3</span>
          <span className="label top right">0</span>               
          <span className="label bottom left">3</span>
          <span className="label bottom right">0</span>
        </div>
        <div className="yardline" style={{ left: "75%"}}>               
          <span className="label top left">2</span>
          <span className="label top right">0</span>               
          <span className="label bottom left">2</span>
          <span className="label bottom right">0</span>
        </div>
        <div className="yardline" style={{ left: "83.3333%"}}>              
          <span className="label top left">1</span>
          <span className="label top right">0</span>               
          <span className="label bottom left">1</span>
          <span className="label bottom right">0</span>
        </div>
        <div className="yardline" style={{ left: "91.6667%"}}></div>
        <div className="yardline" style={{ left: "100%"}}></div>
        
        <div id="firstDownLine" className="yardline first-down-line"></div>
      </div>
      <img
        src="https://andrew-jacobson06.github.io/public-audio/fpost1.png"
        id="fgPost"
        alt="Field Goal Post"
      />
      <div className="driveWrapper">

        
        <div
          id="catchPoint"
          style={{
            position: "absolute",
            fontSize: "4vw",
            color: "var(--gray-light)",
            opacity: "0",
            zIndex: 4,
            pointerEvents: "none",
            transition: "opacity 0.5s ease",
          }}
        ></div>
        
        <div className="drive-line" id="drive"></div>
        <div className="play-line" id="play"></div>
        <div id="arc-container" className="arc-container"></div>
      </div>
    </div>
  );
}