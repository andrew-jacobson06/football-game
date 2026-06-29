type AnimationGameState = {
    DriveStart?: string | number;
    Previous?: string | number;
    BallOn: string | number;
    Possession: string;
};

type AnimationPassResult = Record<string, unknown> | null;

declare function buildArcWithArrow(mountEl: HTMLElement, options: Record<string, unknown>): Promise<void>;

export async function animatePlay(playType: string, passResult: AnimationPassResult = null, currentState: AnimationGameState){
    // use current game state to drive the animation in the proper direction
    const normalizedPassResult = passResult && typeof passResult === 'object'
        ? { ...passResult, airYards: Number(passResult.airYards) || 0 }
        : { airYards: 0 };
    const normalizedPlayType = playType.toLowerCase() === 'run' ? 'Run' : playType;
    await show3DDrive(currentState, currentState.DriveStart ?? currentState.Previous ?? currentState.BallOn, currentState.Previous ?? currentState.BallOn, currentState.BallOn, normalizedPlayType, normalizedPassResult); //CHANGE - dont hardcode run and pass
}

//UI Functions ONLY - ANIMATIONS BELOW!
  export function show3DDrive(state: AnimationGameState, startYard: string | number, prevYard: string | number, currentYard: string | number, playType = 'Run', passResult: Record<string, unknown>) {
    //hid incomplete if nec.
    const catchPoint = document.getElementById("catchPoint")!;
    catchPoint.style.display = 'none';

    const passComplete = Boolean(passResult.completed);
    if(playType == "Pass" && !passComplete){
      let airYds = Number(passResult.airYards) || 0;
      if (state.Possession === 'Away') {
        airYds = - (Number(passResult.airYards) || 0);
      }
      currentYard = Number(prevYard) + airYds;
    }
    if(passResult.sack){
      playType = 'Run';
    }

    const touchdown = Boolean(passResult.touchdown) || (playType === 'Run' && (Number(currentYard) <= 0 || Number(currentYard) >= 100));

    // Hide previous play visuals until we know which animation to show
    const runDiv = document.getElementById("play")!;
    const passDiv = document.getElementById("arc-container")!;
    runDiv.style.display = "none";
    passDiv.style.display = "none";

    return new Promise<void>(resolve => {
      const field = document.getElementById("field3D")!;
      const fieldWidth = field.offsetWidth;
      const yardPx = fieldWidth / 120;
      //const canvas = document.getElementById("arcCanvas");
      //canvas.width = fieldWidth;
      //canvas.height = fieldHeight;
      const endYard = touchdown ? (state.Possession === 'Home' ? 102 : -2) : currentYard;
      let drivePX = (Number(startYard) + 10) * yardPx;
      let prevPX = (Number(prevYard) + 10) * yardPx;
      let currPX = (Number(endYard) + 10) * yardPx;
      const drive = document.getElementById("drive")!;
      // Handle drive line based on direction
      if (state.Possession == "Home") {
        drive.style.left = `${drivePX}px`;
        drive.style.right = `auto`;
        drive.style.width = `${prevPX - drivePX}px`;
        drive.style.setProperty('--left-pos', `-5px`);
      } else {
        drivePX = fieldWidth - drivePX;
        prevPX = fieldWidth - prevPX;
        currPX = fieldWidth - currPX;
        drive.style.left = `auto`;
        drive.style.right = `${drivePX}px`;
        drive.style.width = `${prevPX - drivePX}px`;
        drive.style.setProperty('--left-pos', `${prevPX - drivePX - 5}px`);
      }

      const lastPlay = runDiv;
      // Fade out old marker
      lastPlay.style.opacity = "0";// lastDot.style.opacity = arrow.style.opacity = 0;
      setTimeout(() => {
        // Prepare the element for the upcoming animation
        if (playType === 'Run') {
          runDiv.style.display = "block";
        } else {
          passDiv.style.display = "block";
        }
        lastPlay.style.transition = "none";
        lastPlay.style.backgroundColor = playType === 'Pass' ? 'transparent' : 'black';
        lastPlay.style.width = `0px`;
        lastPlay.style.opacity = "1";
        if(state.Possession == "Home"){
          lastPlay.style.left = `${prevPX}px`;
        } else{
          lastPlay.style.right = `${prevPX}px`;
        }

        if (playType === 'Run') {
          lastPlay.style.top = `50%`;
          lastPlay.style.height = `6px`;
          setTimeout(() => {
            // Animate based on direction of play
            if (state.Possession == "Home") {
              lastPlay.style.transition = "width 1.4s ease, left 1.4s ease";
              lastPlay.style.left = `${prevPX}px`;
              lastPlay.style.right = `auto`;
              lastPlay.style.width = `${currPX - prevPX}px`;
              if(lastPlay.classList.contains("swapped")){                
                lastPlay.classList.remove("swapped");
              }
            } else {
              lastPlay.style.transition = "width 1.4s ease, right 1.4s ease";
              lastPlay.style.left = `auto`;
              lastPlay.style.right = `${prevPX}px`;
              lastPlay.style.width = `${(currPX - prevPX)}px`;
              if(!lastPlay.classList.contains("swapped")){                
                lastPlay.classList.add("swapped");
              }
            }
            const playWidth = currPX - prevPX;
            if (playWidth <= 0) {
              // No animation to wait for; resolve manually after short delay
              setTimeout(() => {
                resolve();
              }, 300);
            } else {
              const onEnd = (e: TransitionEvent) => {
                if (e.propertyName === 'width') {
                  lastPlay.removeEventListener('transitionend', onEnd);
                  resolve();
                }
              };
              lastPlay.addEventListener('transitionend', onEnd);
            }
          }, 50);
        } else {
          //lastDot.style.opacity = arrow.style.opacity = 0;
          buildArcWithArrow(passDiv, {
            prevPx: prevPX,
            currPx: currPX,
            rise: 150,
            direction: "up",
            completion: passComplete,
          }).then(resolve);
        }
      }, 400);
    });
  }

//   //New UI functionality
//   export function makeArcPath(x, y, width, rise, direction = "up", completion) {
//     let x0 = x, y0 = y;
//     let x1 = x + width, y1 = y;           // baseline anchors  
//     if(!completion){
//       y1 = y-20;
//     }
//     let cx = x + width / 2;  
//     const cy = direction === "up" ? y - rise : y + rise;
//     if(state.Possession == "Away"){
//       x0 = width-1;
//       x1 = 0;
//       cx = x + width / 2;
//     }
//     return {
//       d: `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`,
//       start: { x: x0, y: y0 },
//       end:   { x: x1, y: y1 }
//     };
//   }
  
//   export function buildArcWithArrow(mountEl, { prevPx, currPx, rise, direction = "up", completion }) {
//     return new Promise(resolve => {
//       let width = Math.abs(currPx - prevPx);
//       const cs = getComputedStyle(document.documentElement);
//       const stroke  = parseFloat(cs.getPropertyValue('--arc-width')) || 5;
//       const arrowL  = parseFloat(cs.getPropertyValue('--arrow-l'))   || 12;
//       // Duration/easing: read from CSS so both animations match
//       const durStr  = cs.getPropertyValue('--arc-duration').trim() || '1.2s';
//       const durMs   = durStr.endsWith('ms') ? parseFloat(durStr) : parseFloat(durStr) * 1000;
//       const easing  = 'ease-out';
//       // Pad so the arrow never clips
//       let pad = 1;//Math.ceil(Math.max(stroke, arrowL) + 6);
//       if(state.Possession == "Away"){
//         pad = -1;
//       }
//       const baselineY = calcResponsiveWidth()/2;// rise + pad;
//       const vbWidth = width + pad * 2;
//       const vbHeight = "100%";//baselineY + rise + pad;
//       // Build SVG
//       const svgNS = "http://www.w3.org/2000/svg";
//       const svg = document.createElementNS(svgNS, "svg");
//       svg.setAttribute("viewBox", `0 0 ${vbWidth} ${vbHeight}`);
//       svg.setAttribute("width", vbWidth);
//       svg.setAttribute("height", vbHeight);
//       const { d, start, end } = makeArcPath(pad, baselineY, width, rise, direction, completion);
//       // Compute control point (same as makeArcPath) for reversed path’s angle math
//       const cx = pad + width / 2;
//       const cy = direction === "up" ? baselineY - rise : baselineY + rise;
//       // Use drawStart/drawEnd so the rest of your code remains unchanged
//       const drawStart = start;
//       const drawEnd   = end;
//       const path = document.createElementNS(svgNS, "path");
//       path.setAttribute("class", "arc-path");
//       path.setAttribute("pathLength", "1");
//       path.setAttribute("d", d);
//       svg.appendChild(path);
//       // Position the arc container at the previous pixel location so the
//       // animation originates from the correct spot on the field.
//       mountEl.style.position = "absolute";
//       if(state.Possession == "Home"){
//         mountEl.style.left = `${prevPx}px`;
//         mountEl.style.right = ``;
//       } else{
//         mountEl.style.right = `${prevPx}px`;
//         mountEl.style.left = ``;
//       }
//       // Ensure the container dimensions match the SVG so width animates
//       // from the starting point instead of the page origin.
//       mountEl.style.width = `${vbWidth}px`;
//       mountEl.style.height = `${vbHeight}px`;
//       // Mount SVG
//       mountEl.innerHTML = "";
//       mountEl.appendChild(svg);
//       // Arrow element: tip aligned, oriented along the straight chord
//       const angleRad = Math.atan2(end.y - start.y, end.x - start.x);
//       const angleDeg = angleRad * (180 / Math.PI);
//       const arrow = document.createElement("span");
//       arrow.className = "arc-arrow";
//       arrow.style.setProperty("--angle", `${angleDeg}deg`);
//       let arrowLeft = end.x + 12;
//       if(state.Possession == "Away"){
//         arrowLeft = end.x - 12;
//       }
//       // Start at the base (start anchor), end at the right anchor
//       arrow.style.left = `${arrowLeft}px`;
//       arrow.style.top  = `50%`;

//       arrow.style.display = 'flex';
//       if(!completion){
//         arrow.style.display = 'none';
//         showCatchPoint(currPx, end.y, state.Possession == "Home");
//       }

//       mountEl.appendChild(arrow);
//       // ✅ Circle at the starting point
//       const circle = document.createElement("span");
//       circle.className = "arc-start";
//       circle.style.left = `${start.x}px`;
//       circle.style.top  = `50%`;
//       mountEl.appendChild(circle);
//       // Animate the arrow's position in sync with the path draw
//       const animation = arrow.animate(
//         [
//           { left: `${start.x}px`, top: `50%` },
//           { left: `${arrowLeft}px`, top: `50%` }
//         ],
//         { duration: durMs, easing, fill: 'forwards' }
//       );
//       animation.finished.then(() => resolve());
//     });
//   }
//   // Example: arc 280px wide, 60px rise, arrow travels left -> right while the arc draws
//   /**buildArcWithArrow(document.getElementById("arc-container"), startYd, {
//     width: 300,
//     rise: 150,
//     direction: "up"
//   });**/
//   export function calcResponsiveWidth() {
//     const vw = window.innerWidth * 0.85; // 85vw
//     const minVal = Math.min(vw, 1200);
//     const result = minVal * 0.3; // multiply by 0.3
//     return result; // in pixels
//   }

//   export function showCatchPoint(x, y, homeBall) {
//     return new Promise(resolve => {
//       const catchPoint = document.getElementById("catchPoint");
//       catchPoint.innerText = "✖";
//       if(homeBall){
//         catchPoint.style.left = `${x - 8}px`;
//         catchPoint.style.right = ``;
//       } else{
//         catchPoint.style.right = `${x - 8}px`;
//         catchPoint.style.left = ``;
//       }
//       catchPoint.style.opacity = 0;
//       catchPoint.style.display = 'block';
//       // Fade in and stay
//       setTimeout(() => {
//         catchPoint.style.transition = "opacity 0.8s ease";
//         catchPoint.style.opacity = 1;
//         setTimeout(resolve, 800);
//       }, 100);
//     });
//   }
  