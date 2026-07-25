const DEFAULT_INTERVAL_MS = 4_000;

type Sleep = (milliseconds: number) => Promise<void>;
type Logger = (message: string, details: Record<string, unknown>) => void;

export type WriteRequestThrottleOptions = {
  intervalMs?: number;
  now?: () => number;
  sleep?: Sleep;
  logger?: Logger;
};

/**
 * Serializes outbound write requests and spaces their start times apart.
 * A four-second interval caps a single API process at 15 write attempts in
 * every 60-second period, including retries and requests that ultimately fail.
 */
export class WriteRequestThrottle {
  private readonly intervalMs: number;
  private readonly now: () => number;
  private readonly sleep: Sleep;
  private readonly logger: Logger;
  private queue: Promise<void> = Promise.resolve();
  private lastRequestStartedAt: number | undefined;
  private minute = "";
  private requestsThisMinute = 0;

  constructor(options: WriteRequestThrottleOptions = {}) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.logger = options.logger ?? ((message, details) => console.info(message, details));

    if (!Number.isFinite(this.intervalMs) || this.intervalMs < 0) {
      throw new Error("Write request interval must be a non-negative number.");
    }
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    const request = this.queue.then(async () => {
      if (this.lastRequestStartedAt !== undefined) {
        const waitMs = this.lastRequestStartedAt + this.intervalMs - this.now();
        if (waitMs > 0) await this.sleep(waitMs);
      }

      const startedAt = this.now();
      this.lastRequestStartedAt = startedAt;
      const minute = new Date(startedAt).toISOString().slice(0, 16);
      if (minute !== this.minute) {
        this.minute = minute;
        this.requestsThisMinute = 0;
      }
      this.requestsThisMinute += 1;
      this.logger("Google Sheets write request", {
        minute: `${minute}Z`,
        writeRequestsThisMinute: this.requestsThisMinute,
        intervalMs: this.intervalMs,
      });

      return operation();
    });

    this.queue = request.then(() => undefined, () => undefined);
    return request;
  }
}

export const sheetsWriteThrottle = new WriteRequestThrottle();
