import assert from "node:assert/strict";
import test from "node:test";
import { WriteRequestThrottle } from "./writeRequestThrottle.js";

test("spaces every queued write request four seconds apart", async () => {
  let now = Date.parse("2026-07-25T12:00:00.000Z");
  const waits: number[] = [];
  const starts: number[] = [];
  const throttle = new WriteRequestThrottle({
    now: () => now,
    sleep: async (milliseconds) => {
      waits.push(milliseconds);
      now += milliseconds;
    },
    logger: () => undefined,
  });

  await Promise.all(Array.from({ length: 3 }, () => throttle.run(async () => starts.push(now))));

  assert.deepEqual(waits, [4_000, 4_000]);
  assert.deepEqual(starts, [
    Date.parse("2026-07-25T12:00:00.000Z"),
    Date.parse("2026-07-25T12:00:04.000Z"),
    Date.parse("2026-07-25T12:00:08.000Z"),
  ]);
});

test("logs the write count for its UTC minute and resets in the next minute", async () => {
  let now = Date.parse("2026-07-25T12:00:56.000Z");
  const entries: Record<string, unknown>[] = [];
  const throttle = new WriteRequestThrottle({
    now: () => now,
    sleep: async (milliseconds) => { now += milliseconds; },
    logger: (_message, details) => entries.push(details),
  });

  await throttle.run(async () => undefined);
  await throttle.run(async () => undefined);

  assert.deepEqual(entries.map(({ minute, writeRequestsThisMinute }) => ({ minute, writeRequestsThisMinute })), [
    { minute: "2026-07-25T12:00Z", writeRequestsThisMinute: 1 },
    { minute: "2026-07-25T12:01Z", writeRequestsThisMinute: 1 },
  ]);
});

test("continues processing the queue after a failed write", async () => {
  let now = 0;
  const throttle = new WriteRequestThrottle({
    now: () => now,
    sleep: async (milliseconds) => { now += milliseconds; },
    logger: () => undefined,
  });

  await assert.rejects(throttle.run(async () => { throw new Error("write failed"); }));
  const result = await throttle.run(async () => "saved");

  assert.equal(result, "saved");
  assert.equal(now, 4_000);
});
