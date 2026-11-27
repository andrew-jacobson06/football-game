ALTER TABLE drafts ADD COLUMN roster_target INTEGER CHECK(roster_target BETWEEN 1 AND 100);
CREATE INDEX draft_season_lookup ON drafts(season_id);
CREATE INDEX draft_pending_pick ON draft_picks(draft_id,overall_pick) WHERE player_id IS NULL;
