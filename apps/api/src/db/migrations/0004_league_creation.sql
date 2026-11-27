-- Existing leagues occupy the first available save slots; nothing is deleted.
ALTER TABLE leagues ADD COLUMN save_slot INTEGER CHECK(save_slot BETWEEN 1 AND 3);
ALTER TABLE leagues ADD COLUMN creation_request_id TEXT;
ALTER TABLE leagues ADD COLUMN creation_config_json TEXT CHECK(creation_config_json IS NULL OR json_valid(creation_config_json));
CREATE UNIQUE INDEX league_save_slot ON leagues(save_slot) WHERE save_slot IS NOT NULL;
CREATE UNIQUE INDEX league_creation_request ON leagues(creation_request_id) WHERE creation_request_id IS NOT NULL;
WITH ranked AS (SELECT id,row_number() OVER(ORDER BY created_at,id) AS slot FROM leagues)
UPDATE leagues SET save_slot=(SELECT slot FROM ranked WHERE ranked.id=leagues.id)
WHERE id IN (SELECT id FROM ranked WHERE slot<=3);
INSERT INTO app_preferences(key,value_json)
SELECT 'default_league_id',json_quote(l.id) FROM leagues l
WHERE EXISTS(SELECT 1 FROM seasons s WHERE s.league_id=l.id)
ORDER BY l.created_at,l.id LIMIT 1
ON CONFLICT(key) DO NOTHING;
INSERT INTO app_preferences(key,value_json)
SELECT 'league_template_source_id',value_json FROM app_preferences WHERE key='default_league_id'
ON CONFLICT(key) DO NOTHING;
-- This independent catalog avoids offering duplicate teams from cloned leagues.
CREATE TABLE team_catalog (
 id TEXT PRIMARY KEY NOT NULL,
 abbreviation TEXT NOT NULL COLLATE NOCASE UNIQUE,
 location TEXT NOT NULL DEFAULT '',
 nickname TEXT NOT NULL CHECK(length(trim(nickname))>0),
 logo_url TEXT,home_jersey_url TEXT,away_jersey_url TEXT,
 home_uniform_url TEXT,away_uniform_url TEXT,
 primary_color TEXT,secondary_color TEXT,third_color TEXT,
 default_division TEXT NOT NULL CHECK(length(trim(default_division))>0)
) STRICT;
ALTER TABLE teams ADD COLUMN default_division TEXT;
ALTER TABLE teams ADD COLUMN catalog_team_id TEXT REFERENCES team_catalog(id) ON DELETE RESTRICT;
-- Each team's first season supplies its original default, independent of later moves.
UPDATE teams SET default_division=(
 SELECT d.name FROM team_seasons ts JOIN seasons s ON s.id=ts.season_id
 JOIN divisions d ON d.id=ts.division_id WHERE ts.team_id=teams.id
 ORDER BY s.season_number,ts.rowid LIMIT 1
);
INSERT INTO team_catalog(id,abbreviation,location,nickname,logo_url,home_jersey_url,away_jersey_url,home_uniform_url,away_uniform_url,primary_color,secondary_color,third_color,default_division)
SELECT t.id,ts.abbreviation,coalesce(ts.location,''),ts.nickname,ts.logo_url,ts.home_jersey_url,ts.away_jersey_url,ts.home_uniform_url,ts.away_uniform_url,ts.primary_color,ts.secondary_color,ts.third_color,t.default_division
FROM teams t JOIN team_seasons ts ON ts.team_id=t.id JOIN seasons s ON s.id=ts.season_id
WHERE t.league_id=(SELECT json_extract(value_json,'$') FROM app_preferences WHERE key='league_template_source_id')
 AND s.season_number=(SELECT min(s2.season_number) FROM team_seasons ts2 JOIN seasons s2 ON s2.id=ts2.season_id WHERE ts2.team_id=t.id);
UPDATE teams SET catalog_team_id=id WHERE id IN (SELECT id FROM team_catalog);
