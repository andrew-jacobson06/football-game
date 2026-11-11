export const driveYardsFromSpots = (
  possession: string,
  start: number,
  end: number,
) => (possession === "Home" ? end - start : start - end);

/**
 * Returns the final field coordinate for a drive. Touchdowns always finish at
 * the goal line, even when older play records contain the post-score kickoff
 * spot as their NewBallOn value.
 */
export function driveEndYard(
  possession: string,
  result: string,
  recordedEnd: number,
) {
  if (result.trim().toLowerCase() === "touchdown") {
    return possession === "Home" ? 100 : 0;
  }

  return recordedEnd;
}

export type DrivePlay = Record<string, unknown>;
type DriveGame = {
  Possession: string;
  Qtr: string | number;
  Time: string | number;
  BallOn: string | number;
  HomeScore?: unknown;
  AwayScore?: unknown;
};
export type Drive = {
  key: string;
  possession: string;
  driveStart: number;
  plays: DrivePlay[];
  result: string;
  homeScore: unknown;
  awayScore: unknown;
  yards: number;
  playsCount: number;
  duration: number;
  ended: boolean;
};
const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");
export function historyField(play: DrivePlay, ...names: string[]) {
  for (const name of names) {
    const entry = Object.entries(play).find(
      ([key, value]) =>
        normalize(key) === normalize(name) && value !== "" && value != null,
    );
    if (entry) return entry[1];
  }
  return undefined;
}
const text = (play: DrivePlay, ...names: string[]) =>
  String(historyField(play, ...names) ?? "");
const numeric = (value: unknown) =>
  value === "" || value == null || !Number.isFinite(Number(value))
    ? undefined
    : Number(value);
const quarter = (play: DrivePlay) =>
  numeric(historyField(play, "qtr", "quarter")) ?? 1;
const resultOf = (play: DrivePlay) =>
  text(play, "ResultCategory", "result", "description").trim();
const typeOf = (play: DrivePlay) => text(play, "playtype").toLowerCase();
const conversion = (play: DrivePlay) =>
  /kick xp|extra point|2pt|two point/.test(
    `${typeOf(play)} ${resultOf(play).toLowerCase()}`,
  );
const kick = (play: DrivePlay) =>
  /punt|field goal|kick fg/.test(
    `${typeOf(play)} ${resultOf(play).toLowerCase()}`,
  ) && !conversion(play);
const administrative = (play: DrivePlay) =>
  /timeout|kickoff/.test(`${typeOf(play)} ${resultOf(play).toLowerCase()}`);
const scrimmage = (play: DrivePlay) =>
  !kick(play) && !conversion(play) && !administrative(play);
const half = (qtr: number) => (qtr >= 3 ? 2 : 1);
function seconds(qtr: number, clock: unknown) {
  const remaining = String(clock ?? 0).includes(":")
    ? String(clock)
        .split(":")
        .reduce((total, value) => total * 60 + Number(value), 0)
    : Number(clock ?? 0);
  return (qtr - 1) * 900 + 900 - Math.max(0, Math.min(900, remaining || 0));
}
const elapsed = (play: DrivePlay) =>
  seconds(quarter(play), historyField(play, "time"));
function terminalResult(play: DrivePlay) {
  if (administrative(play) || conversion(play)) return "";
  const result = resultOf(play).toLowerCase();
  if (/touchdown|\btd\b/.test(result)) return "Touchdown";
  if (/safety/.test(result)) return "Safety";
  if (/interception|intercepted/.test(result)) return "Interception";
  if (/to on downs|turnover on downs/.test(result)) return "TO on Downs";
  if (/punt/.test(typeOf(play))) return "Punt";
  if (kick(play))
    return /miss|blocked/.test(result) ? "Missed Field Goal" : "Field Goal";
  if (/fumble/.test(result)) {
    const recovered = text(play, "recoveredby");
    if (
      recovered &&
      ![text(play, "player"), text(play, "receiver")].includes(recovered)
    )
      return "Fumble";
  }
  // Older fourth-down incompletions were stored only as Incomplete.
  const down = numeric(historyField(play, "down"));
  const yards = numeric(historyField(play, "yards"));
  const distance = numeric(historyField(play, "distance"));
  if (
    down !== undefined &&
    down >= 4 &&
    yards !== undefined &&
    distance !== undefined &&
    yards < distance
  )
    return "TO on Downs";
  return "";
}
function endSpot(play: DrivePlay, possession: string) {
  const start = numeric(historyField(play, "ballon"));
  const result = terminalResult(play);
  if (result === "Touchdown") return possession === "Home" ? 100 : 0;
  if (result === "Safety") return possession === "Home" ? 0 : 100;
  // Kicks and interception returns are not offensive drive yardage. Old
  // NewBallOn values may contain kickoff spots or a stale halftime endpoint.
  if (kick(play) || result === "Interception") return start;
  const yards = numeric(historyField(play, "yards"));
  if (start !== undefined && yards !== undefined)
    return Math.max(
      0,
      Math.min(100, start + (possession === "Home" ? yards : -yards)),
    );
  return numeric(historyField(play, "newballon")) ?? start;
}

/** Reconstruct drives from possession and actual ending events, never changing DriveStart metadata. */
export function groupPlaysByDrive(
  plays: DrivePlay[],
  game: DriveGame,
): Drive[] {
  const drives: Drive[] = [];
  let current: Drive | undefined;
  for (const play of plays) {
    const possession = text(play, "possession");
    if (!possession) continue;
    if (conversion(play)) {
      // A PAT belongs to the scoring drive, not a new offensive series.
      if (
        current &&
        current.possession === possession &&
        current.result === "Touchdown"
      )
        current.plays.push(play);
      continue;
    }
    if (
      administrative(play) &&
      (!current || current.possession !== possession || current.ended)
    )
      continue;
    if (
      !current ||
      current.possession !== possession ||
      current.ended ||
      half(quarter(current.plays[0])) !== half(quarter(play))
    ) {
      const start =
        numeric(historyField(play, "ballon")) ??
        numeric(historyField(play, "drivestart")) ??
        0;
      current = {
        key: `${drives.length}-${possession}`,
        possession,
        driveStart: start,
        plays: [],
        result: "",
        homeScore: game.HomeScore,
        awayScore: game.AwayScore,
        yards: 0,
        playsCount: 0,
        duration: 0,
        ended: false,
      };
      drives.push(current);
    }
    current.plays.push(play);
    const result = terminalResult(play);
    if (result) {
      current.result = result;
      current.ended = true;
    }
  }
  const final = /^(FINAL|F)$/i.test(String(game.Qtr));
  drives.forEach((drive, index) => {
    const last = drive.plays.at(-1)!;
    const football = drive.plays.filter(
      (play) => !administrative(play) && !conversion(play),
    );
    const lastFootball = football.at(-1) ?? last;
    const next = drives[index + 1];
    const nextQuarter = next
      ? quarter(next.plays[0])
      : final
        ? 4
        : Number(game.Qtr);
    const endsHalf = quarter(lastFootball) <= 2 && nextQuarter >= 3;
    // Explicit football outcomes take priority over halftime. Ignore stale
    // endofhalf flags on later plays from older versions of the game.
    if (!drive.ended && endsHalf) {
      drive.result = "End of Half";
      drive.ended = true;
    }
    if (
      !drive.ended &&
      (next || final || drive.possession !== game.Possession)
    ) {
      drive.result = /fumble/i.test(resultOf(lastFootball))
        ? "Fumble"
        : final && !next
          ? "End of Game"
          : "End of Drive";
      drive.ended = true;
    }
    if (!drive.ended) drive.result = "Current Drive";
    drive.homeScore = historyField(last, "homescore") ?? game.HomeScore;
    drive.awayScore = historyField(last, "awayscore") ?? game.AwayScore;
    drive.playsCount = drive.plays.filter(scrimmage).length;
    const end = endSpot(lastFootball, drive.possession) ?? drive.driveStart;
    drive.yards = driveYardsFromSpots(drive.possession, drive.driveStart, end);
    const endedAt = endsHalf
      ? 1800
      : next
        ? elapsed(next.plays[0])
        : final
          ? 3600
          : seconds(Number(game.Qtr), game.Time);
    drive.duration = Math.max(0, endedAt - elapsed(drive.plays[0]));
  });
  return drives;
}

export function currentDriveSummary(plays: DrivePlay[], game: DriveGame) {
  const last = groupPlaysByDrive(plays, game).at(-1);
  return last && !last.ended && last.possession === game.Possession
    ? { plays: last.playsCount, yards: last.yards }
    : { plays: 0, yards: 0 };
}
