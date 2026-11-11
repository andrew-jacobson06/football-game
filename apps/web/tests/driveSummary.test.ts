import test from "node:test";
import assert from "node:assert/strict";
import {
  groupPlaysByDrive,
  currentDriveSummary,
} from "../src/components/league/driveSummary.ts";
const game = {
  Possession: "Home",
  Qtr: 1,
  Time: 800,
  BallOn: 35,
  HomeScore: 0,
  AwayScore: 0,
};
const play = (extra: Record<string, unknown> = {}) => ({
  possession: "Home",
  playtype: "Run",
  player: "Runner",
  qtr: 1,
  time: 900,
  ballon: 25,
  yards: 4,
  newballon: 29,
  result: "Normal",
  ...extra,
});

test("live and play-by-play drive totals use the first snap, ignoring missing or changing DriveStart metadata", () => {
  const plays = [
    play({ drivestart: 25 }),
    play({ time: 870, ballon: 29, yards: 6, newballon: 35, drivestart: 29 }),
  ];
  const drives = groupPlaysByDrive(plays, game);
  assert.equal(drives.length, 1);
  assert.equal(drives[0].driveStart, 25);
  assert.equal(drives[0].yards, 10);
  assert.equal(drives[0].playsCount, 2);
  assert.equal(drives[0].result, "Current Drive");
  assert.equal(drives[0].duration, 100);
  assert.deepEqual(currentDriveSummary(plays, game), { plays: 2, yards: 10 });
});

test("75-yard touchdowns from either own 25 use the goal line despite legacy kickoff endpoints", () => {
  for (const possession of ["Home", "Away"]) {
    const home = possession === "Home";
    const plays = [
      play({ possession, ballon: home ? 25 : 75, yards: 25 }),
      play({
        possession,
        time: 850,
        ballon: 50,
        yards: 50,
        newballon: home ? 75 : 25,
        result: "Touchdown",
        endofhalf: "Yes",
      }),
    ];
    const state = {
      ...game,
      Possession: home ? "Away" : "Home",
      BallOn: home ? 75 : 25,
    };
    const drives = groupPlaysByDrive(plays, state);
    assert.equal(drives[0].yards, 75);
    assert.equal(drives[0].result, "Touchdown");
    assert.deepEqual(currentDriveSummary(plays, state), { plays: 0, yards: 0 });
  }
});

test("punts, made/missed field goals and conversion kicks never add kick yardage or reset spots to drive gains", () => {
  for (const [playtype, result, label] of [
    ["Punt", "Punt", "Punt"],
    ["Field Goal", "Kick FG", "Field Goal"],
    ["Field Goal", "Missed FG", "Missed Field Goal"],
  ]) {
    const plays = [
      play({ yards: 40, newballon: 65 }),
      play({
        time: 850,
        ballon: 65,
        playtype,
        result,
        yards: 40,
        newballon: 75,
      }),
    ];
    const drive = groupPlaysByDrive(plays, {
      ...game,
      Possession: "Away",
      BallOn: 75,
    })[0];
    assert.equal(drive.yards, 40);
    assert.equal(drive.playsCount, 1);
    assert.equal(drive.result, label);
  }
  const drives = groupPlaysByDrive(
    [
      play({ yards: 75, result: "Touchdown" }),
      play({ playtype: "Field Goal", result: "Kick XP", yards: 0, ballon: 25 }),
      play({ possession: "Away", ballon: 75, yards: 4, result: "Normal" }),
    ],
    { ...game, Possession: "Away", BallOn: 71 },
  );
  assert.equal(drives.length, 2);
  assert.equal(drives[0].yards, 75);
  assert.equal(drives[0].playsCount, 1);
  assert.equal(drives[0].result, "Touchdown");
});

test("stale halftime markers and endpoints cannot replace second-half drive results or yardage", () => {
  const plays = [
    play({
      qtr: 3,
      result: "Touchdown",
      yards: 75,
      newballon: 50,
      endofhalf: "Yes",
    }),
    play({
      qtr: 3,
      time: 850,
      possession: "Away",
      ballon: 75,
      yards: 10,
      newballon: 50,
      endofhalf: "Yes",
    }),
    play({
      qtr: 3,
      time: 800,
      possession: "Away",
      ballon: 65,
      yards: 5,
      newballon: 50,
      result: "TO on Downs",
      endofhalf: "Yes",
    }),
  ];
  const drives = groupPlaysByDrive(plays, {
    ...game,
    Qtr: 3,
    Possession: "Home",
  });
  assert.deepEqual(
    drives.map((d) => d.result),
    ["Touchdown", "TO on Downs"],
  );
  assert.equal(drives[1].yards, 15);
});

test("a genuine halftime boundary splits drives even if the same team starts at the same spot", () => {
  const drives = groupPlaysByDrive(
    [play({ qtr: 2, time: 20 }), play({ qtr: 3, time: 900 })],
    { ...game, Qtr: 3, Time: 870 },
  );
  assert.equal(drives.length, 2);
  assert.equal(drives[0].result, "End of Half");
  assert.equal(drives[0].duration, 20);
  assert.equal(drives[1].result, "Current Drive");
  const td = groupPlaysByDrive(
    [
      play({
        qtr: 2,
        time: 1,
        yards: 75,
        result: "Touchdown",
        endofhalf: "Yes",
      }),
    ],
    { ...game, Qtr: 3, Possession: "Away" },
  );
  assert.equal(td[0].result, "Touchdown");
});

test("interceptions, lost fumbles and downs retain their real endings instead of Current Drive", () => {
  for (const result of ["Interception", "Fumble", "TO on Downs"]) {
    const p = play({
      result,
      yards: 0,
      recoveredby: result === "Fumble" ? "Defender" : "",
      newballon: 75,
    });
    const drive = groupPlaysByDrive([p], { ...game, Possession: "Away" })[0];
    assert.equal(drive.result, result);
    assert.equal(drive.yards, 0);
    assert.equal(drive.ended, true);
  }
});

test("offensive fumble recoveries remain in the same drive; actual losses may legitimately be negative", () => {
  const drives = groupPlaysByDrive(
    [
      play({ result: "Fumble", recoveredby: "Runner", yards: -4 }),
      play({ time: 850, ballon: 21, yards: 2 }),
    ],
    { ...game, BallOn: 23 },
  );
  assert.equal(drives.length, 1);
  assert.equal(drives[0].yards, -2);
  assert.equal(drives[0].result, "Current Drive");
});

test("quarter changes within a half do not split drives; final non-scoring drives end as End of Game", () => {
  const drives = groupPlaysByDrive(
    [
      play({ qtr: 3, time: 10 }),
      play({ qtr: 4, time: 900, ballon: 29, yards: 6 }),
    ],
    { ...game, Qtr: "FINAL" },
  );
  assert.equal(drives.length, 1);
  assert.equal(drives[0].result, "End of Game");
  assert.equal(drives[0].yards, 10);
});

test("legacy fourth-down incompletions end as downs; timeouts do not end a fourth-down drive", () => {
  const incomplete = play({
    playtype: "Pass",
    down: 4,
    distance: 7,
    yards: 0,
    result: "Incomplete",
  });
  assert.equal(
    groupPlaysByDrive([incomplete], { ...game, Possession: "Away" })[0].result,
    "TO on Downs",
  );
  const timeout = play({
    playtype: "Timeout",
    down: 4,
    distance: 7,
    yards: 0,
    result: "Timeout",
    time: 890,
  });
  const drives = groupPlaysByDrive(
    [play({ down: 3, yards: 0 }), timeout],
    game,
  );
  assert.equal(drives.length, 1);
  assert.equal(drives[0].result, "Current Drive");
  assert.equal(drives[0].playsCount, 1);
});
