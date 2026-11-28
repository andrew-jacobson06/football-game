ALTER TABLE plays ADD COLUMN is_conversion INTEGER NOT NULL DEFAULT 0 CHECK(is_conversion IN (0,1));
ALTER TABLE plays ADD COLUMN conversion_type TEXT CHECK(conversion_type IN ('xp','2pt'));
ALTER TABLE plays ADD COLUMN touchdown_play_id TEXT REFERENCES plays(id) ON DELETE RESTRICT;
UPDATE plays SET is_conversion=1,conversion_type=CASE WHEN lower(play_type) IN ('two point','2pt') THEN '2pt' ELSE 'xp' END
WHERE lower(play_type) IN ('two point','2pt','extra point','kick xp') OR lower(result)='kick xp';
CREATE INDEX conversion_parent_lookup ON plays(touchdown_play_id) WHERE is_conversion=1;
CREATE UNIQUE INDEX one_try_per_touchdown ON plays(touchdown_play_id) WHERE touchdown_play_id IS NOT NULL AND is_conversion=1;
