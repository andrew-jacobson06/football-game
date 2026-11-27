-- Nullable historical facts: unknown is different from no blitz/hit or zero seconds.
-- Names are immutable event snapshots; matching participant roles link player IDs.
ALTER TABLE plays ADD COLUMN blitz INTEGER CHECK(blitz IN (0,1));
ALTER TABLE plays ADD COLUMN blitz_by TEXT;
ALTER TABLE plays ADD COLUMN qb_pressures INTEGER CHECK(qb_pressures IN (0,1));
ALTER TABLE plays ADD COLUMN qb_hits INTEGER CHECK(qb_hits IN (0,1));
ALTER TABLE plays ADD COLUMN qb_hit_by TEXT;
ALTER TABLE plays ADD COLUMN time_to_throw REAL CHECK(time_to_throw>=0);
ALTER TABLE plays ADD COLUMN time_until_throw REAL CHECK(time_until_throw>=0);
ALTER TABLE plays ADD COLUMN covering_defender TEXT;
ALTER TABLE plays ADD COLUMN play_length REAL CHECK(play_length BETWEEN 0 AND 900);
CREATE INDEX plays_covering_defender ON plays(covering_defender,game_id) WHERE covering_defender IS NOT NULL;
-- Backfill ONLY when both clock snapshots were actually recorded. Historical
-- imports deliberately have NULL after-clocks, so their durations stay unknown.
UPDATE plays SET play_length=(period_after-period_before)*900+seconds_before-seconds_after
WHERE period_after BETWEEN period_before AND period_before+1
 AND seconds_before IS NOT NULL AND seconds_after IS NOT NULL
 AND (period_after-period_before)*900+seconds_before-seconds_after BETWEEN 0 AND 900;
