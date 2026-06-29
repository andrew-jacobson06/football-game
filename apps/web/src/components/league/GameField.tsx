import type { CSSProperties } from "react";
import type { LeagueGame } from "./types";

type Play = Record<string, unknown>;

type FieldAnimation =
  | {
      kind: "run";
      key: string;
      left: number;
      width: number;
      directionClass: "play-line--right" | "play-line--left";
    }
  | {
      kind: "pass";
      key: string;
      left: number;
      width: number;
      directionClass: "pass-arc--right" | "pass-arc--left";
      completed: boolean;
      intercepted: boolean;
      catchPointLeft: number;
      risePercent: number;
    };

const TOTAL_FIELD_YARDS = 120;
const END_ZONE_YARDS = 10;

const num = (v: unknown) => Number(v) || 0;
const str = (v: unknown) => String(v ?? "");

function playField(play: Play | undefined, ...keys: string[]) {
  if (!play) return undefined;

  const key = keys.find((candidate) => {
    const value = play[candidate];
    return value !== undefined && value !== null && value !== "";
  });

  return key ? play[key] : undefined;
}

function clampYard(yard: number) {
  return Math.max(0, Math.min(100, yard));
}

function getFieldPercentNumber(yardLine: unknown) {
  const yard = clampYard(num(yardLine));

  /*
    Visual field is 120 yards wide:
    - 10 yard left end zone
    - 100 yard playable field
    - 10 yard right end zone

    Therefore:
    yard 0   => 8.3333%
    yard 41  => 42.5%
    yard 50  => 50%
    yard 100 => 91.6667%
  */
  return ((yard + END_ZONE_YARDS) / TOTAL_FIELD_YARDS) * 100;
}

function getFieldPercent(yardLine: unknown) {
  return `${getFieldPercentNumber(yardLine)}%`;
}

function getSegmentLeftPercent(start: unknown, end: unknown) {
  const startPct = getFieldPercentNumber(start);
  const endPct = getFieldPercentNumber(end);

  return `${Math.min(startPct, endPct)}%`;
}

function getSegmentWidthPercent(start: unknown, end: unknown) {
  const startPct = getFieldPercentNumber(start);
  const endPct = getFieldPercentNumber(end);

  return `${Math.abs(endPct - startPct)}%`;
}

function getDriveDotLeft(start: unknown, current: unknown) {
  const startPct = getFieldPercentNumber(start);
  const currentPct = getFieldPercentNumber(current);

  /*
    The white dot should stay at the drive start.
    If drive moves right, drive start is the left edge.
    If drive moves left, drive start is the right edge.
  */
  return startPct <= currentPct ? "0%" : "100%";
}

function getPlayType(lastPlay: Play | undefined) {
  return str(playField(lastPlay, "PlayType", "playtype", "Type", "type"));
}

function getPlayResult(lastPlay: Play | undefined) {
  return str(playField(lastPlay, "Result", "result", "Description", "description"));
}

function getPlayDescription(lastPlay: Play | undefined) {
  return str(playField(lastPlay, "Description", "description"));
}

function getPlayId(lastPlay: Play | undefined) {
  return str(playField(lastPlay, "PlayId", "playid", "Id", "id"));
}

function getPlayStartYard(lastPlay: Play | undefined, fallbackBallOn: number) {
  return clampYard(
    num(
      playField(
        lastPlay,
        "BallOn",
        "ballon",
        "Previous",
        "previous",
        "PreviousBallOn",
        "previousBallOn"
      ) ?? fallbackBallOn
    )
  );
}

function getPlayEndYard(
  lastPlay: Play | undefined,
  fallbackBallOn: number,
  possession: string
) {
  const result = getPlayResult(lastPlay);

  const rawEnd = num(
    playField(lastPlay, "NewBallOn", "newBallOn", "newballon") ?? fallbackBallOn
  );

  if (result === "Touchdown") {
    return possession === "Home" ? 100 : 0;
  }

  if (result === "Safety") {
    return possession === "Home" ? 0 : 100;
  }

  return clampYard(rawEnd);
}

function isTruthyValue(value: unknown) {
  if (typeof value === "boolean") return value;

  const text = str(value).toLowerCase();

  return ["true", "yes", "y", "1", "complete", "completed", "touchdown"].includes(text);
}

function getPassCompleted(lastPlay: Play | undefined) {
  const result = getPlayResult(lastPlay);

  if (["Incomplete", "Incompletion", "Interception"].includes(result)) {
    return false;
  }

  const explicitCompleted = playField(
    lastPlay,
    "completed",
    "Completed",
    "complete",
    "Complete"
  );

  if (explicitCompleted !== undefined) {
    return isTruthyValue(explicitCompleted);
  }

  return true;
}

function getPassIntercepted(lastPlay: Play | undefined) {
  const result = getPlayResult(lastPlay);

  if (result === "Interception") return true;

  return isTruthyValue(
    playField(lastPlay, "intercepted", "Intercepted", "isIntercepted", "IsIntercepted")
  );
}

function getAirYards(lastPlay: Play | undefined) {
  return num(
    playField(
      lastPlay,
      "AirYards",
      "airYards",
      "AirYds",
      "airYds",
      "TargetDepth",
      "targetDepth"
    )
  );
}

function getFieldAnimation(
  lastPlay: Play | undefined,
  fallbackBallOn: number,
  gamePossession: string
): FieldAnimation | null {
  if (!lastPlay) return null;

  let playType = getPlayType(lastPlay);
  const result = getPlayResult(lastPlay);
  const description = getPlayDescription(lastPlay);

  const possession =
    str(playField(lastPlay, "Possession", "possession")) || gamePossession;

  const isSack =
    result === "Sack" ||
    description === "Sack" ||
    description.toLowerCase() === "sack";

  if (isSack) {
    playType = "Run";
  }

  if (!["Run", "Kneel", "Pass"].includes(playType)) {
    return null;
  }

  const start = getPlayStartYard(lastPlay, fallbackBallOn);
  let end = getPlayEndYard(lastPlay, fallbackBallOn, possession);

  const completed = getPassCompleted(lastPlay);
  const intercepted = getPassIntercepted(lastPlay);

  /*
    Old behavior for incomplete passes:
    show the arc to intended air-yard depth, not to NewBallOn.
  */
  if (playType === "Pass" && !completed && !intercepted) {
    const signedAirYards =
      possession === "Away" ? -getAirYards(lastPlay) : getAirYards(lastPlay);

    end = clampYard(start + signedAirYards);
  }

  const startPct = getFieldPercentNumber(start);
  const endPct = getFieldPercentNumber(end);
  const movesRight = endPct >= startPct;

  const key =
    getPlayId(lastPlay) ||
    `${playType}-${start}-${end}-${result}-${str(playField(lastPlay, "Time", "time"))}`;

  if (playType === "Run" || playType === "Kneel" || isSack) {
    return {
      kind: "run",
      key,

      /*
        Important:
        The run line is anchored at the previous LOS.
        CSS animates the actual width from 0 to --play-target-width.
        Do NOT use Math.min(startPct, endPct) here or the dot will appear
        to slide backward on right/left-moving plays.
      */
      left: startPct,
      width: Math.abs(endPct - startPct),
      directionClass: movesRight ? "play-line--right" : "play-line--left",
    };
  }

  return {
    kind: "pass",
    key,
    left: Math.min(startPct, endPct),
    width: Math.max(Math.abs(endPct - startPct), 0.5),
    directionClass: movesRight ? "pass-arc--right" : "pass-arc--left",
    completed,
    intercepted,
    catchPointLeft: endPct,
    risePercent: completed || intercepted ? 36 : 28,
  };
}

function PassArc({
  animation,
}: {
  animation: Extract<FieldAnimation, { kind: "pass" }>;
}) {
  const startsRight = animation.directionClass === "pass-arc--left";

  const startX = startsRight ? 100 : 0;
  const endX = startsRight ? 0 : 100;

  const baselineY = 58;
  const endY = animation.completed || animation.intercepted ? baselineY : baselineY - 10;
  const controlX = 50;
  const controlY = baselineY - animation.risePercent;

  const path = `M ${startX} ${baselineY} Q ${controlX} ${controlY} ${endX} ${endY}`;

  return (
    <div
      id="arc-container"
      className={`arc-container ${animation.directionClass}`}
      style={{
        left: `${animation.left}%`,
        width: `${animation.width}%`,
      }}
    >
      <svg
        className="arc-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path className="arc-path" pathLength={1} d={path} />
      </svg>

      <span
        className="arc-start"
        style={{
          left: startsRight ? "100%" : "0%",
        }}
      />

      {(animation.completed || animation.intercepted) && (
        <span
          className="arc-arrow"
          style={{
            left: startsRight ? "0%" : "100%",
            top: `${endY}%`,
          }}
        />
      )}
    </div>
  );
}

export function GameField({
  game,
  lastPlay,
}: {
  game: LeagueGame;
  lastPlay?: Play;
}) {
  const ballOn = clampYard(num(game.BallOn));
  const distance = num(game.Distance);
  const possession = str(game.Possession);

  const previousLos = getPlayStartYard(lastPlay, ballOn);

  const driveStart = clampYard(
    num((game as unknown as Play).DriveStart ?? previousLos)
  );

  const firstDownYard =
    possession === "Home"
      ? Math.min(100, ballOn + distance)
      : Math.max(0, ballOn - distance);

  const fieldAnimation = getFieldAnimation(lastPlay, ballOn, possession);

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

  const showCatchPoint =
    fieldAnimation?.kind === "pass" &&
    !fieldAnimation.completed &&
    !fieldAnimation.intercepted;

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
        {showCatchPoint && (
          <div
            key={`catch-${fieldAnimation.key}`}
            id="catchPoint"
            style={{
              left: `${fieldAnimation.catchPointLeft}%`,
            }}
          >
            ✖
          </div>
        )}

        <div
          className="drive-line"
          id="drive"
          style={
            {
              left: getSegmentLeftPercent(driveStart, previousLos),
              width: getSegmentWidthPercent(driveStart, previousLos),
              "--drive-dot-left": getDriveDotLeft(driveStart, previousLos),
            } as CSSProperties
          }
        />

        {fieldAnimation?.kind === "run" && (
          <div
            key={fieldAnimation.key}
            className={`play-line ${fieldAnimation.directionClass}`}
            id="play"
            style={
              {
                left: `${fieldAnimation.left}%`,
                "--play-target-width": `${fieldAnimation.width}%`,
              } as CSSProperties
            }
          />
        )}

        {fieldAnimation?.kind === "pass" && (
          <PassArc key={fieldAnimation.key} animation={fieldAnimation} />
        )}

        {fieldAnimation?.kind !== "pass" && (
          <div id="arc-container" className="arc-container" />
        )}
      </div>
    </div>
  );
}