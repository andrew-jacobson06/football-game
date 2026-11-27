ALTER TABLE leagues ADD COLUMN keeper_count INTEGER CHECK(keeper_count BETWEEN 0 AND 100);
ALTER TABLE seasons ADD COLUMN previous_season_id TEXT REFERENCES seasons(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX one_next_season ON seasons(previous_season_id) WHERE previous_season_id IS NOT NULL;
ALTER TABLE coach_team_assignments ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','released'));
CREATE UNIQUE INDEX current_team_head_coach ON coach_team_assignments(season_id,team_id) WHERE status='active' AND effective_until IS NULL;
CREATE UNIQUE INDEX current_coach_team ON coach_team_assignments(season_id,coach_id) WHERE status='active' AND effective_until IS NULL;
CREATE TABLE season_preparation (
 season_id TEXT PRIMARY KEY NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
 keeper_count INTEGER NOT NULL CHECK(keeper_count BETWEEN 0 AND 100),
 keepers_finalized INTEGER NOT NULL DEFAULT 0 CHECK(keepers_finalized IN (0,1)),
 coach_order_json TEXT CHECK(coach_order_json IS NULL OR json_valid(coach_order_json)),
 keepers_finalized_at TEXT,ready_at TEXT
) STRICT;
CREATE TABLE season_roster_candidates (
 season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
 previous_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
 PRIMARY KEY(season_id,player_id),
 FOREIGN KEY(season_id,previous_team_id) REFERENCES team_seasons(season_id,team_id) ON DELETE RESTRICT
) STRICT;
CREATE TABLE season_team_decisions (
 season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
 team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
 previous_coach_id TEXT REFERENCES coaches(id) ON DELETE RESTRICT,
 coach_action TEXT CHECK(coach_action IN ('keep','fire','hire')),
 keepers_locked INTEGER NOT NULL DEFAULT 0 CHECK(keepers_locked IN (0,1)),locked_at TEXT,
 PRIMARY KEY(season_id,team_id),
 FOREIGN KEY(season_id,team_id) REFERENCES team_seasons(season_id,team_id) ON DELETE RESTRICT
) STRICT;
CREATE TABLE season_keeper_selections (
 season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
 team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
 PRIMARY KEY(season_id,player_id),
 FOREIGN KEY(season_id,team_id) REFERENCES season_team_decisions(season_id,team_id) ON DELETE RESTRICT,
 FOREIGN KEY(season_id,player_id) REFERENCES season_roster_candidates(season_id,player_id) ON DELETE RESTRICT
) STRICT;
-- Leagues created before coach setup existed need their own coach pool too.
-- Copy only into leagues with no coach records; never invent names or change an existing pool.
CREATE TEMP TABLE coach_pool_backfill AS
SELECT l.id AS league_id,c.id AS source_coach_id,lower(hex(randomblob(16))) AS new_coach_id,
 (SELECT s.id FROM seasons s WHERE s.league_id=l.id ORDER BY season_number DESC LIMIT 1) AS season_id
FROM leagues l CROSS JOIN coaches c
WHERE c.league_id=(SELECT json_extract(value_json,'$') FROM app_preferences WHERE key='league_template_source_id')
 AND l.id<>c.league_id AND NOT EXISTS(SELECT 1 FROM coaches existing WHERE existing.league_id=l.id);
INSERT INTO coaches(id,league_id,display_name,coach_type,image_url)
SELECT b.new_coach_id,b.league_id,c.display_name,c.coach_type,c.image_url FROM coach_pool_backfill b JOIN coaches c ON c.id=b.source_coach_id WHERE c.retired_at IS NULL;
INSERT INTO coach_season_ratings(id,season_id,coach_id,version,points_available,special_teams,passing,running,receiving,defending,tackling,physical,conditioning,attributes_json,effective_from)
SELECT lower(hex(randomblob(16))),b.season_id,b.new_coach_id,1,r.points_available,r.special_teams,r.passing,r.running,r.receiving,r.defending,r.tackling,r.physical,r.conditioning,r.attributes_json,r.effective_from
FROM coach_pool_backfill b JOIN coaches c ON c.id=b.new_coach_id JOIN coach_season_ratings r ON r.coach_id=b.source_coach_id
WHERE b.season_id IS NOT NULL AND r.id=(SELECT r2.id FROM coach_season_ratings r2 JOIN seasons s ON s.id=r2.season_id WHERE r2.coach_id=b.source_coach_id ORDER BY s.season_number DESC,r2.version DESC LIMIT 1);
DROP TABLE coach_pool_backfill;
