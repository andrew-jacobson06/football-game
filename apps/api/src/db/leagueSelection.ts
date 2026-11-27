import { AsyncLocalStorage } from "node:async_hooks";
/** Per-request selection; one browser must never switch another browser's league. */
export const leagueSelection = new AsyncLocalStorage<{ leagueId?: string }>();
