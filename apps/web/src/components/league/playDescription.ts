import { isConversionPlay } from "./conversionFacts";
import type { LeagueGame } from "./types";
import { formatBallOnForPoss } from "./leagueMappers";
import {
  historyField as playField,
  type DrivePlay as Play,
} from "./driveSummary";
import { playFlag } from "./gameplay/engine/playLogger";
const str = (value: unknown) => String(value ?? "");
const num = (value: unknown) => Number(value) || 0;
const escapeHtml = (value: unknown) =>
  str(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

/**
 * Builds the human-readable play description shown in the log and play-by-play.
 * The branches mirror football outcomes: special teams/conversions first, then
 * sacks/safeties, then passes, and finally standard run results.
 */
export function playText(play: Play, game?: LeagueGame): string {
  if (play.conversionSummary) {
    const copy = { ...play };
    delete copy.conversionSummary;
    return `${playText(copy, game)} (${String(play.conversionSummary)})`;
  }
  const description = str(playField(play, "Description", "description")).trim();
  const result = escapeHtml(
    playField(play, "ResultCategory", "Result", "result"),
  );
  const type = str(playField(play, "PlayType", "playtype"));
  const player = escapeHtml(playField(play, "Player", "Passer", "player"));
  const receiver = escapeHtml(
    playField(play, "Receiver", "Target", "receiver"),
  );
  const yards = num(playField(play, "Yards", "yards"));
  const tackler = escapeHtml(playField(play, "Tackler", "tackler"));
  const possession = str(playField(play, "Possession", "possession"));
  const newBallOn =
    (playField(play, "NewBallOn", "newBallOn", "newballon") as
      string | number) ?? 50;
  const recoveredBy = escapeHtml(playField(play, "RecoveredBy", "recoveredby"));
  if (result === "Timeout") return `${player} Timeout`;
  if (type === "Kick FG" || result === "Kick FG") return "Field Goal is Good!";
  if (type === "Extra Point" || type === "Kick XP" || result === "Kick XP")
    return `${player || "Team"} PAT is GOOD`;
  if (type === "Field Goal") return "Field Goal is No Good.";
  if (type === "Punt") return `${player} punts for ${yards} yards.`;
  if (type === "2PT" || type === "Two Point") {
    const success = result.toLowerCase().includes("successful");
    const status = `2-PT try is ${success ? "GOOD" : "NO GOOD"}!`;
    const isPass = play.conversionPlayType === "Pass" || Boolean(receiver);
    if (isPass && !success && !playFlag(play.conversionCompleted, false))
      return `${player} pass INCOMPLETE.${receiver ? ` Intended for ${receiver}.` : ""} ${status}`;
    return isPass
      ? `${player} ${yards} yard pass to ${receiver}. ${status}`
      : `${player} runs for ${yards} yards. ${status}`;
  }
  if (
    description === "Sack" ||
    (playFlag(playField(play, "isSack"), false) && result !== "Safety")
  ) {
    const spot = formatBallOnForPoss(newBallOn, possession);
    let text = `${player} sacked at the ${spot} for a loss of ${Math.abs(num(yards))}`;
    if (tackler && tackler !== "NA") text += ` (${tackler})`;
    text += ".";
    if (recoveredBy) {
      const recoveryPoss =
        recoveredBy === player
          ? possession
          : possession === "Home"
            ? "Away"
            : "Home";
      text += ` FUMBLE! Recovered by ${recoveredBy} at the ${formatBallOnForPoss(newBallOn, recoveryPoss)}.`;
    }
    return text;
  }
  if (result === "Safety" && type === "Pass" && !receiver) {
    let text = `${player} sacked in the end zone for a safety`;
    if (tackler && tackler !== "NA") text += ` (${tackler})`;
    return `${text}.`;
  }
  if (type === "Pass") {
    const isTouchdown = result.toLowerCase().includes("touchdown");
    let text: string;
    if (result === "Interception") {
      const poss = possession === "Home" ? "Away" : "Home";
      const interceptor = recoveredBy || tackler;
      text = `${player} pass intended for ${receiver}. Intercepted at the ${formatBallOnForPoss(newBallOn, poss)} by ${interceptor}.`;
    } else if (
      result === "Incomplete" ||
      !playFlag(playField(play, "isComplete"), true)
    ) {
      text = /deflection/i.test(String(playField(play, "defenseresult")))
        ? `${player} pass intended for ${receiver}. Deflected by ${tackler}. Incomplete.`
        : `${player} pass intended for ${receiver}. Incomplete.`;
    } else {
      text = `${player} pass to ${receiver}`;
      if (!isTouchdown)
        text += ` to ${formatBallOnForPoss(newBallOn, possession)}`;
      text += ` for ${yards} yards`;
      if (!isTouchdown && tackler && tackler !== "NA") text += ` (${tackler})`;
      text += ".";
    }
    if (
      result &&
      !["Normal", "Fumble", "Interception", "Incomplete"].includes(result)
    ) {
      if (isTouchdown)
        text += ` <span class="play-outcome--touchdown">Touchdown!</span>`;
      else if (result === "TO on Downs")
        text += ` <span class="play-outcome--turnover">${result}!</span>`;
      else text += ` <strong>${result}!</strong>`;
    }
    if (result === "Fumble" && recoveredBy) {
      const recoveryPoss =
        recoveredBy === receiver
          ? possession
          : possession === "Home"
            ? "Away"
            : "Home";
      text += ` FUMBLE! Recovered by ${recoveredBy} at the ${formatBallOnForPoss(newBallOn, recoveryPoss)}.`;
    }
    return text;
  }
  let text = `<strong>${player}</strong> runs for ${yards} Yards.`;
  if (result && result !== "Normal" && result !== "Fumble") {
    if (result === "Touchdown")
      text += ` <span class="play-outcome--touchdown">${result}!</span>`;
    else if (result === "TO on Downs")
      text += ` <span class="play-outcome--turnover">${result}!</span>`;
    else text += ` <strong>${result}!</strong>`;
  }
  if (result !== "Touchdown" && tackler && tackler !== "NA")
    text += ` Tackle made at the ${formatBallOnForPoss(newBallOn, possession)} by ${tackler}.`;
  if (result === "Fumble" && recoveredBy) {
    const recoveryPoss =
      recoveredBy === player
        ? possession
        : possession === "Home"
          ? "Away"
          : "Home";
    text += ` FUMBLE! Recovered by ${recoveredBy} at the ${formatBallOnForPoss(newBallOn, recoveryPoss)}.`;
  }
  void game;
  return text;
}

/** Raw conversion rows stay saved; display them as a suffix of their touchdown. */
export function playsWithConversions(history: Play[]): Play[] {
  const result: Play[] = [];
  for (const play of history) {
    if (!isConversionPlay(play)) {
      result.push({ ...play });
      continue;
    }
    const parent = String(playField(play, "touchdownPlayId") ?? "");
    const touchdown = [...result]
      .reverse()
      .find((p) =>
        parent
          ? String(playField(p, "playid")) === parent
          : String(playField(p, "result")).toLowerCase() === "touchdown" &&
            playField(p, "possession") === playField(play, "possession"),
      );
    if (!touchdown) {
      result.push(play);
      continue;
    }
    touchdown.conversionSummary = playText(play);
    for (const field of ["homescore", "awayscore"]) {
      const key =
        Object.keys(touchdown).find((k) => k.toLowerCase() === field) ?? field;
      touchdown[key] = playField(play, field);
    }
  }
  return result;
}
