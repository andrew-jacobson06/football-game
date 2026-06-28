import type { LeagueGame } from "./types";

type Play = Record<string, unknown>;

const num = (v: unknown) => Number(v) || 0;

function getFieldPercent(yardLine: unknown) {
  const yard = Math.max(0, Math.min(100, num(yardLine)));

  // Your old static field uses 0-100 as left-to-right field position.
  // 0 = left goal line, 100 = right goal line.
  return `${yard}%`;
}

function getDriveWidthPercent(start: unknown, current: unknown) {
  const startYard = num(start);
  const currentYard = num(current);
  return `${Math.abs(currentYard - startYard)}%`;
}

function getDriveLeftPercent(start: unknown, current: unknown) {
  const startYard = num(start);
  const currentYard = num(current);
  return `${Math.min(startYard, currentYard)}%`;
}

export function GameField({
  game,
  lastPlay,
}: {
  game: LeagueGame;
  lastPlay?: Play;
}) {
  const ballOn = num(game.BallOn);
  const distance = num(game.Distance);

  const driveStart = num((game as unknown as Play).DriveStart ?? ballOn);

  const firstDownYard =
    game.Possession === "Home"
      ? Math.min(100, ballOn + distance)
      : Math.max(0, ballOn - distance);

  const previousBallOn = lastPlay
    ? num(
        lastPlay.BallOn ??
          lastPlay.ballon ??
          lastPlay.PreviousBallOn ??
          lastPlay.previousBallOn ??
          ballOn
      )
    : ballOn;

  const playLeft = Math.min(previousBallOn, ballOn);
  const playWidth = Math.abs(ballOn - previousBallOn);

  const yardMarkers = [
    { left: 8.3333, label: null },
    { left: 16.6667, label: "10" },
    { left: 25, label: "20" },
    { left: 33.3333, label: "30" },
    { left: 41.6667, label: "40" },
    { left: 50, label: "50" },
    { left: 58.3333, label: "40" },
    { left: 66.6667, label: "30" },
    { left: 75, label: "20" },
    { left: 83.3333, label: "10" },
    { left: 91.6667, label: null },
    { left: 100, label: null },
  ];

  return (
    <div className="field-wrapper">
      <img
        src="https://andrew-jacobson06.github.io/public-audio/fpost1.png"
        id="fgPostLeft"
        alt="Field Goal Post"
      />

      <div id="field3D" className="field3D">
        {yardMarkers.map((marker, i) => (
          <div
            key={`${marker.left}-${i}`}
            className="yardline"
            style={{ left: `${marker.left}%` }}
          >
            {marker.label && (
              <>
                <span className="label top left">{marker.label[0]}</span>
                <span className="label top right">{marker.label[1]}</span>

                <span className="label bottom left">{marker.label[0]}</span>
                <span className="label bottom right">{marker.label[1]}</span>
              </>
            )}
          </div>
        ))}

        <div
          id="lineOfScrimmage"
          className="yardline line-of-scrimmage"
          style={{ left: getFieldPercent(ballOn) }}
        />

        <div
          id="firstDownLine"
          className="yardline first-down-line"
          style={{ left: getFieldPercent(firstDownYard) }}
        />
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
            opacity: 0,
            zIndex: 4,
            pointerEvents: "none",
            transition: "opacity 0.5s ease",
          }}
        />

        <div
          className="drive-line"
          id="drive"
          style={{
            left: getDriveLeftPercent(driveStart, ballOn),
            width: getDriveWidthPercent(driveStart, ballOn),
          }}
        />

        <div
          className="play-line"
          id="play"
          style={{
            left: `${playLeft}%`,
            width: `${playWidth}%`,
          }}
        />

        <div id="arc-container" className="arc-container" />
      </div>
    </div>
  );
}