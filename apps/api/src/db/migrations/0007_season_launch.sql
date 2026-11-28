CREATE TABLE season_launch (
 season_id TEXT PRIMARY KEY NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
 rosters_finalized_at TEXT,
 schedule_set_at TEXT,
 headlines_stubbed_at TEXT,
 completed_at TEXT
) STRICT;
CREATE TABLE season_schedule_teams (
 season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
 team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
 schedule_alias TEXT NOT NULL,
 division_slot INTEGER NOT NULL CHECK(division_slot IN (1,2)),
 team_index INTEGER NOT NULL CHECK(team_index BETWEEN 1 AND 5),
 PRIMARY KEY(season_id,team_id),
 UNIQUE(season_id,schedule_alias),
 UNIQUE(season_id,division_slot,team_index),
 FOREIGN KEY(season_id,team_id) REFERENCES team_seasons(season_id,team_id) ON DELETE RESTRICT,
 CHECK(schedule_alias='div'||division_slot||'-'||team_index)
) STRICT;
CREATE TABLE season_headline_stubs (
 season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
 headline_key TEXT NOT NULL,
 article_id TEXT NOT NULL UNIQUE REFERENCES articles(id) ON DELETE RESTRICT,
 PRIMARY KEY(season_id,headline_key)
) STRICT;
