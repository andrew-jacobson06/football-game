-- 10: schema migration 0002, managed by the same ledger/checksum as npm run db:migrate.
-- Save pending edits and back up first. Run ENTIRE file; then Write Changes.
-- Alternatively, after updating app code, run npm run db:migrate instead of this file.
PRAGMA foreign_keys=ON;
SAVEPOINT afl_remaining_10;
CREATE TEMP TABLE afl_schema_guard(ok INTEGER);
CREATE TEMP TRIGGER afl_schema_check BEFORE INSERT ON afl_schema_guard BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM schema_migrations WHERE version=1 AND checksum='5a7ebac34ac1786f46f9dd9806bbda8ba97f99f4df00c6853bf6ae0020648118') THEN RAISE(ROLLBACK,'Missing or different foundation schema') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM schema_migrations WHERE version>2 OR (version=2 AND (name<>'0002_league_domains.sql' OR checksum<>'c896ba114ee99212963227f17b3515ebb32028320be451e168c284e39179a441'))) THEN RAISE(ROLLBACK,'Unknown or different migration history') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM schema_migrations WHERE version=2) AND EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name IN ('play_stat_deltas','player_game_stats','team_game_stats','season_stat_snapshots','standing_snapshots','routes','route_depths','route_depth_eligibility','openness_curve_points','playoff_seedings','bracket_slots','award_definitions','award_weights','award_nominations','award_vote_runs','award_ballots','ballot_rankings','award_results','honor_slots','honor_selections','articles','coaches','coach_season_ratings','coach_team_assignments','draft_board_snapshots','drafts','draft_picks')) THEN RAISE(ROLLBACK,'Unmanaged destination tables exist; reconcile first') END;
END;
INSERT INTO afl_schema_guard VALUES(1);
-- Historical imports and remaining league domains. No seeded data or provider switch.

CREATE TABLE IF NOT EXISTS play_stat_deltas (
 id TEXT PRIMARY KEY NOT NULL,
 play_id TEXT NOT NULL REFERENCES plays(id) ON DELETE RESTRICT, player_id TEXT REFERENCES players(id) ON DELETE RESTRICT, team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
 metric_key TEXT NOT NULL, amount REAL NOT NULL, calculation_version TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE UNIQUE INDEX IF NOT EXISTS stat_delta_identity ON play_stat_deltas(play_id,ifnull(player_id,''),team_id,metric_key,calculation_version);

CREATE TABLE IF NOT EXISTS player_game_stats (
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE RESTRICT, team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
 player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
 carries REAL,
 rushing_yards REAL,
 rushing_touchdowns REAL,
 rushing_fumbles REAL,
 rushing_fumbles_lost REAL,
 rushing_first_downs REAL,
 jukes REAL,
 broken_tackles REAL,
 negative_rushes REAL,
 rushes_5_plus REAL,
 rushes_10_plus REAL,
 rushes_20_plus REAL,
 rushes_30_plus REAL,
 rushes_50_plus REAL,
 longest_rush REAL,
 ol_wins REAL,
 ol_losses REAL,
 lead_blocks REAL,
 dl_wins REAL,
 dl_losses REAL,
 tackles REAL,
 tackles_for_loss REAL,
 defensive_sacks REAL,
 forced_fumbles REAL,
 fumble_recoveries REAL,
 defensive_interceptions REAL,
 deflections REAL,
 fumble_return_yards REAL,
 fumble_return_touchdowns REAL,
 interception_return_yards REAL,
 interception_return_touchdowns REAL,
 safeties_forced REAL,
 targets REAL,
 receptions REAL,
 receiving_yards REAL,
 receiving_touchdowns REAL,
 receiving_first_downs REAL,
 receiving_fumbles REAL,
 receiving_fumbles_lost REAL,
 yac REAL,
 longest_reception REAL,
 receptions_20_plus REAL,
 passing_attempts REAL,
 passing_completions REAL,
 passing_yards REAL,
 passing_touchdowns REAL,
 interceptions_thrown REAL,
 sacks_taken REAL,
 sack_yards_lost REAL,
 longest_pass REAL,
 participation_verified INTEGER NOT NULL DEFAULT 0 CHECK(participation_verified IN (0,1)),
 metric_availability_json TEXT NOT NULL CHECK(json_valid(metric_availability_json)),
 calculation_version TEXT NOT NULL, source_game_version INTEGER NOT NULL DEFAULT 0,
 calculated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(game_id,player_id,team_id)
) STRICT;

CREATE TABLE IF NOT EXISTS team_game_stats (
 game_id TEXT NOT NULL REFERENCES games(id) ON DELETE RESTRICT, team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
 opponent_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
 plays REAL,
 drives REAL,
 first_downs REAL,
 rushing_attempts REAL,
 rushing_yards REAL,
 rushing_touchdowns REAL,
 passing_attempts REAL,
 passing_completions REAL,
 passing_yards REAL,
 passing_touchdowns REAL,
 sacks_taken REAL,
 sack_yards_lost REAL,
 interceptions_thrown REAL,
 fumbles REAL,
 fumbles_lost REAL,
 offensive_yac REAL,
 defensive_sacks REAL,
 tackles REAL,
 tackles_for_loss REAL,
 interceptions_made REAL,
 fumbles_recovered REAL,
 deflections REAL,
 safeties_forced REAL,
 field_goal_attempts REAL,
 field_goals_made REAL,
 extra_point_attempts REAL,
 extra_points_made REAL,
 two_point_attempts REAL,
 two_points_made REAL,
 punts REAL,
 possession_seconds REAL,
 metric_availability_json TEXT NOT NULL CHECK(json_valid(metric_availability_json)),
 calculation_version TEXT NOT NULL, source_game_version INTEGER NOT NULL DEFAULT 0,
 calculated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(game_id,team_id), CHECK(team_id<>opponent_team_id)
) STRICT;

CREATE INDEX IF NOT EXISTS player_stats_player ON player_game_stats(player_id,game_id);

CREATE TABLE IF NOT EXISTS season_stat_snapshots (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, scope TEXT NOT NULL,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('player','team')), player_id TEXT REFERENCES players(id) ON DELETE RESTRICT, team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
 source_kind TEXT NOT NULL, calculation_version TEXT, totals_json TEXT NOT NULL CHECK(json_valid(totals_json)),
 source_import_batch_id TEXT REFERENCES import_batches(id) ON DELETE RESTRICT, captured_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK((entity_type='player' AND player_id IS NOT NULL) OR (entity_type='team' AND team_id IS NOT NULL))
) STRICT;

CREATE UNIQUE INDEX IF NOT EXISTS snapshot_identity ON season_stat_snapshots(season_id,scope,entity_type,ifnull(player_id,''),ifnull(team_id,''),source_kind);

CREATE TABLE IF NOT EXISTS standing_snapshots (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT, division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
 scope TEXT NOT NULL, source_kind TEXT NOT NULL, rank INTEGER CHECK(rank>0),
 wins INTEGER CHECK(wins>=0),
 losses INTEGER CHECK(losses>=0),
 ties INTEGER CHECK(ties>=0),
 home_wins INTEGER CHECK(home_wins>=0),
 home_losses INTEGER CHECK(home_losses>=0),
 home_ties INTEGER CHECK(home_ties>=0),
 away_wins INTEGER CHECK(away_wins>=0),
 away_losses INTEGER CHECK(away_losses>=0),
 away_ties INTEGER CHECK(away_ties>=0),
 division_wins INTEGER CHECK(division_wins>=0),
 division_losses INTEGER CHECK(division_losses>=0),
 division_ties INTEGER CHECK(division_ties>=0),
 points_for INTEGER CHECK(points_for>=0),
 points_against INTEGER CHECK(points_against>=0),
 streak TEXT, calculation_version TEXT, captured_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), UNIQUE(season_id,team_id,scope,source_kind)
) STRICT;

CREATE TABLE IF NOT EXISTS routes (
 id TEXT PRIMARY KEY NOT NULL, settings_version_id TEXT NOT NULL REFERENCES settings_versions(id) ON DELETE RESTRICT, route_key TEXT NOT NULL, display_name TEXT NOT NULL,
 aliases_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(aliases_json)), complexity TEXT, curve_type TEXT NOT NULL,
 timing_modifier REAL NOT NULL, release_pct REAL NOT NULL CHECK(release_pct BETWEEN 0 AND 100), stem_pct REAL NOT NULL CHECK(stem_pct BETWEEN 0 AND 100),
 break_pct REAL NOT NULL CHECK(break_pct BETWEEN 0 AND 100), sustain_pct REAL NOT NULL CHECK(sustain_pct BETWEEN 0 AND 100),
 preview_shape_json TEXT CHECK(preview_shape_json IS NULL OR json_valid(preview_shape_json)),
 UNIQUE(settings_version_id,route_key), UNIQUE(settings_version_id,id),
 CHECK(abs(release_pct+stem_pct+break_pct+sustain_pct-100)<0.000001)
) STRICT;

CREATE TABLE IF NOT EXISTS route_depths (
 id TEXT PRIMARY KEY NOT NULL, settings_version_id TEXT NOT NULL REFERENCES settings_versions(id) ON DELETE RESTRICT, depth_key TEXT NOT NULL, display_name TEXT NOT NULL,
 sort_order INTEGER NOT NULL, min_air_yards INTEGER NOT NULL, max_air_yards INTEGER, base_time_to_open REAL NOT NULL CHECK(base_time_to_open>0),
 CHECK(max_air_yards IS NULL OR max_air_yards>=min_air_yards), UNIQUE(settings_version_id,depth_key), UNIQUE(settings_version_id,id)
) STRICT;

CREATE TABLE IF NOT EXISTS route_depth_eligibility (
 settings_version_id TEXT NOT NULL REFERENCES settings_versions(id) ON DELETE RESTRICT, route_id TEXT NOT NULL, route_depth_id TEXT NOT NULL,
 is_available INTEGER NOT NULL CHECK(is_available IN (0,1)), PRIMARY KEY(settings_version_id,route_id,route_depth_id),
 FOREIGN KEY(settings_version_id,route_id) REFERENCES routes(settings_version_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(settings_version_id,route_depth_id) REFERENCES route_depths(settings_version_id,id) ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS openness_curve_points (
 settings_version_id TEXT NOT NULL REFERENCES settings_versions(id) ON DELETE RESTRICT, curve_type TEXT NOT NULL, progress_fraction REAL NOT NULL CHECK(progress_fraction>=0),
 openness_score REAL NOT NULL, PRIMARY KEY(settings_version_id,curve_type,progress_fraction)
) STRICT;

CREATE TABLE IF NOT EXISTS playoff_seedings (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT, seed INTEGER NOT NULL CHECK(seed BETWEEN 1 AND 3),
 team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT, seeded_at TEXT, source_import_batch_id TEXT REFERENCES import_batches(id) ON DELETE RESTRICT,
 UNIQUE(season_id,division_id,seed), UNIQUE(season_id,team_id), UNIQUE(season_id,id),
 FOREIGN KEY(season_id,team_id) REFERENCES team_seasons(season_id,team_id) ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS bracket_slots (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, division_id TEXT REFERENCES divisions(id) ON DELETE RESTRICT,
 round TEXT NOT NULL CHECK(round IN ('Divisionals','Divisional Championships','National Championship')),
 game_id TEXT REFERENCES games(id) ON DELETE RESTRICT, side TEXT NOT NULL CHECK(side IN ('Home','Away','Bye')),
 source_type TEXT NOT NULL CHECK(source_type IN ('seed','bye','winner')), source_seed_id TEXT, source_game_id TEXT REFERENCES games(id) ON DELETE RESTRICT,
 resolved_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT, resolved_at TEXT,
 FOREIGN KEY(season_id,source_seed_id) REFERENCES playoff_seedings(season_id,id) ON DELETE RESTRICT,
 CHECK((source_type IN ('seed','bye') AND source_seed_id IS NOT NULL AND source_game_id IS NULL) OR (source_type='winner' AND source_game_id IS NOT NULL AND source_seed_id IS NULL)),
 CHECK(source_game_id IS NULL OR source_game_id<>game_id), CHECK((round='National Championship' AND division_id IS NULL) OR round<>'National Championship'), UNIQUE(game_id,side)
) STRICT;

CREATE TABLE IF NOT EXISTS award_definitions (
 id TEXT PRIMARY KEY NOT NULL, code TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
 nominee_count INTEGER NOT NULL CHECK(nominee_count>1), eligibility_json TEXT NOT NULL CHECK(json_valid(eligibility_json)), sort_order INTEGER NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS award_weights (
 award_id TEXT NOT NULL REFERENCES award_definitions(id) ON DELETE RESTRICT, settings_version_id TEXT NOT NULL REFERENCES settings_versions(id) ON DELETE RESTRICT,
 place INTEGER NOT NULL CHECK(place>0), points REAL NOT NULL CHECK(points>=0), PRIMARY KEY(award_id,settings_version_id,place)
) STRICT;

CREATE TABLE IF NOT EXISTS award_nominations (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, award_id TEXT NOT NULL REFERENCES award_definitions(id) ON DELETE RESTRICT, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT, team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
 nomination_order INTEGER NOT NULL CHECK(nomination_order>0), selection_source TEXT NOT NULL, ai_job_id TEXT REFERENCES ai_jobs(id) ON DELETE RESTRICT, nominated_at TEXT,
 UNIQUE(season_id,award_id,player_id), UNIQUE(season_id,award_id,nomination_order)
) STRICT;

CREATE TABLE IF NOT EXISTS award_vote_runs (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, award_id TEXT NOT NULL REFERENCES award_definitions(id) ON DELETE RESTRICT, settings_version_id TEXT NOT NULL REFERENCES settings_versions(id) ON DELETE RESTRICT,
 status TEXT NOT NULL CHECK(status IN ('not_started','running','completed','failed')), expected_ballots INTEGER NOT NULL DEFAULT 125 CHECK(expected_ballots=125),
 completed_ballots INTEGER NOT NULL DEFAULT 0 CHECK(completed_ballots BETWEEN 0 AND 125), ai_job_id TEXT REFERENCES ai_jobs(id) ON DELETE RESTRICT, started_at TEXT, completed_at TEXT,
 UNIQUE(season_id,award_id)
) STRICT;

CREATE TABLE IF NOT EXISTS award_ballots (
 id TEXT PRIMARY KEY NOT NULL, vote_run_id TEXT NOT NULL REFERENCES award_vote_runs(id) ON DELETE RESTRICT, ballot_number INTEGER NOT NULL CHECK(ballot_number BETWEEN 1 AND 125), recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(vote_run_id,ballot_number)
) STRICT;

CREATE TABLE IF NOT EXISTS ballot_rankings (
 ballot_id TEXT NOT NULL REFERENCES award_ballots(id) ON DELETE RESTRICT, place INTEGER NOT NULL CHECK(place>0), nomination_id TEXT NOT NULL REFERENCES award_nominations(id) ON DELETE RESTRICT,
 PRIMARY KEY(ballot_id,place), UNIQUE(ballot_id,nomination_id)
) STRICT;

CREATE TRIGGER IF NOT EXISTS ballot_membership_insert BEFORE INSERT ON ballot_rankings
 WHEN NOT EXISTS(SELECT 1 FROM award_ballots b JOIN award_vote_runs r ON r.id=b.vote_run_id JOIN award_definitions a ON a.id=r.award_id
 JOIN award_nominations n ON n.id=NEW.nomination_id AND n.season_id=r.season_id AND n.award_id=r.award_id
 WHERE b.id=NEW.ballot_id AND NEW.place<=a.nominee_count)
 BEGIN SELECT RAISE(ABORT,'Ballot nomination/placement does not belong to this award and season'); END;

CREATE TRIGGER IF NOT EXISTS ballot_membership_update BEFORE UPDATE ON ballot_rankings
 WHEN NOT EXISTS(SELECT 1 FROM award_ballots b JOIN award_vote_runs r ON r.id=b.vote_run_id JOIN award_definitions a ON a.id=r.award_id
 JOIN award_nominations n ON n.id=NEW.nomination_id AND n.season_id=r.season_id AND n.award_id=r.award_id
 WHERE b.id=NEW.ballot_id AND NEW.place<=a.nominee_count)
 BEGIN SELECT RAISE(ABORT,'Ballot nomination/placement does not belong to this award and season'); END;

CREATE TABLE IF NOT EXISTS award_results (
 id TEXT PRIMARY KEY NOT NULL, vote_run_id TEXT NOT NULL REFERENCES award_vote_runs(id) ON DELETE RESTRICT, nomination_id TEXT NOT NULL REFERENCES award_nominations(id) ON DELETE RESTRICT, total_points REAL NOT NULL,
 final_rank INTEGER NOT NULL CHECK(final_rank>0), is_winner INTEGER NOT NULL CHECK(is_winner IN (0,1)), is_tied INTEGER NOT NULL CHECK(is_tied IN (0,1)), finalized_at TEXT,
 UNIQUE(vote_run_id,nomination_id)
) STRICT;

CREATE TRIGGER IF NOT EXISTS award_result_requires_completed_vote BEFORE INSERT ON award_results
 WHEN NOT EXISTS(SELECT 1 FROM award_vote_runs r JOIN award_nominations n ON n.id=NEW.nomination_id AND n.award_id=r.award_id AND n.season_id=r.season_id
 WHERE r.id=NEW.vote_run_id AND r.status='completed' AND r.completed_ballots=125)
 BEGIN SELECT RAISE(ABORT,'Award result requires a completed matching vote'); END;

CREATE TABLE IF NOT EXISTS honor_slots (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT, side TEXT NOT NULL CHECK(side IN ('Offense','Defense')),
 slot_number INTEGER NOT NULL CHECK(slot_number>0), position_label TEXT NOT NULL, sort_order INTEGER NOT NULL,
 UNIQUE(season_id,division_id,side,slot_number)
) STRICT;

CREATE TABLE IF NOT EXISTS honor_selections (
 slot_id TEXT PRIMARY KEY NOT NULL REFERENCES honor_slots(id) ON DELETE RESTRICT, player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT, team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
 selection_source TEXT NOT NULL, ai_job_id TEXT REFERENCES ai_jobs(id) ON DELETE RESTRICT, selected_at TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS articles (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, game_id TEXT REFERENCES games(id) ON DELETE RESTRICT, stage TEXT NOT NULL, regular_week INTEGER CHECK(regular_week BETWEEN 1 AND 13),
 article_type TEXT NOT NULL, status TEXT NOT NULL, title TEXT NOT NULL, summary TEXT, markdown TEXT NOT NULL,
 published_at TEXT, is_featured INTEGER NOT NULL CHECK(is_featured IN (0,1)), hero_image_url TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE INDEX IF NOT EXISTS articles_feed ON articles(season_id,status,published_at);

CREATE TABLE IF NOT EXISTS coaches (
 id TEXT PRIMARY KEY NOT NULL, league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE RESTRICT, display_name TEXT NOT NULL, coach_type TEXT, image_url TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), retired_at TEXT,
 UNIQUE(league_id,display_name)
) STRICT;

CREATE TABLE IF NOT EXISTS coach_season_ratings (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, coach_id TEXT NOT NULL REFERENCES coaches(id) ON DELETE RESTRICT, version INTEGER NOT NULL CHECK(version>0),
 points_available REAL, special_teams REAL, passing REAL, running REAL, receiving REAL, defending REAL, tackling REAL, physical REAL, conditioning REAL,
 attributes_json TEXT NOT NULL CHECK(json_valid(attributes_json)), effective_from TEXT, UNIQUE(season_id,coach_id,version)
) STRICT;

CREATE TABLE IF NOT EXISTS coach_team_assignments (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, coach_id TEXT NOT NULL REFERENCES coaches(id) ON DELETE RESTRICT, team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT, role TEXT NOT NULL,
 effective_from TEXT NOT NULL CHECK(julianday(effective_from) IS NOT NULL), effective_until TEXT,
 CHECK(effective_until IS NULL OR julianday(effective_until)>julianday(effective_from)), FOREIGN KEY(season_id,team_id) REFERENCES team_seasons(season_id,team_id) ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS draft_board_snapshots (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, label TEXT NOT NULL, source_import_batch_id TEXT REFERENCES import_batches(id) ON DELETE RESTRICT,
 source_range TEXT NOT NULL, board_json TEXT NOT NULL CHECK(json_valid(board_json)), captured_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;

CREATE TABLE IF NOT EXISTS drafts (
 id TEXT PRIMARY KEY NOT NULL, season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT, status TEXT NOT NULL CHECK(status IN ('planned','running','completed')),
 round_count INTEGER CHECK(round_count>0), order_rules_json TEXT CHECK(order_rules_json IS NULL OR json_valid(order_rules_json)), started_at TEXT, completed_at TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS draft_picks (
 id TEXT PRIMARY KEY NOT NULL, draft_id TEXT NOT NULL REFERENCES drafts(id) ON DELETE RESTRICT, round INTEGER NOT NULL CHECK(round>0), pick_in_round INTEGER NOT NULL CHECK(pick_in_round>0),
 overall_pick INTEGER NOT NULL CHECK(overall_pick>0), original_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT, selecting_team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT, player_id TEXT REFERENCES players(id) ON DELETE RESTRICT, picked_at TEXT,
 UNIQUE(draft_id,overall_pick), UNIQUE(draft_id,round,pick_in_round), UNIQUE(draft_id,player_id)
) STRICT;

-- Results and opponent yardage always join the opposing row from the SAME game.
CREATE VIEW IF NOT EXISTS team_game_results AS
SELECT g.id AS game_id,g.season_id,g.stage,g.regular_week,g.playoff_round,g.legacy_game_number,
 g.home_team_id AS team_id,g.away_team_id AS opponent_team_id,1 AS is_home,
 hs.division_id,aws.division_id AS opponent_division_id,s.home_score AS points_for,s.away_score AS points_against,
 CASE WHEN s.home_score>s.away_score THEN 'W' WHEN s.home_score<s.away_score THEN 'L' ELSE 'T' END AS outcome
FROM games g JOIN game_state s ON s.game_id=g.id JOIN team_seasons hs ON hs.season_id=g.season_id AND hs.team_id=g.home_team_id
JOIN team_seasons aws ON aws.season_id=g.season_id AND aws.team_id=g.away_team_id WHERE g.status='final' AND s.phase='final'
UNION ALL
SELECT g.id,g.season_id,g.stage,g.regular_week,g.playoff_round,g.legacy_game_number,g.away_team_id,g.home_team_id,0,
 aws.division_id,hs.division_id,s.away_score,s.home_score,
 CASE WHEN s.away_score>s.home_score THEN 'W' WHEN s.away_score<s.home_score THEN 'L' ELSE 'T' END
FROM games g JOIN game_state s ON s.game_id=g.id JOIN team_seasons hs ON hs.season_id=g.season_id AND hs.team_id=g.home_team_id
JOIN team_seasons aws ON aws.season_id=g.season_id AND aws.team_id=g.away_team_id WHERE g.status='final' AND s.phase='final';
CREATE VIEW IF NOT EXISTS scoped_team_game_results AS
SELECT r.*, 'regular' AS scope FROM team_game_results r WHERE stage='regular'
UNION ALL SELECT r.*, 'postseason' FROM team_game_results r WHERE stage='playoffs'
UNION ALL SELECT r.*, 'combined' FROM team_game_results r;
CREATE VIEW IF NOT EXISTS season_standings AS
WITH marked AS (
 SELECT r.*,first_value(outcome) OVER(PARTITION BY season_id,team_id,scope ORDER BY legacy_game_number DESC) AS last_outcome
 FROM scoped_team_game_results r
), streaked AS (
 SELECT m.*,sum(outcome<>last_outcome) OVER(PARTITION BY season_id,team_id,scope ORDER BY legacy_game_number DESC ROWS UNBOUNDED PRECEDING) AS breaks
 FROM marked m
)
SELECT season_id,team_id,division_id,scope,count(*) AS games_played,
 sum(outcome='W') AS wins,sum(outcome='L') AS losses,sum(outcome='T') AS ties,
 sum(is_home=1 AND outcome='W') AS home_wins,sum(is_home=1 AND outcome='L') AS home_losses,sum(is_home=1 AND outcome='T') AS home_ties,
 sum(is_home=0 AND outcome='W') AS away_wins,sum(is_home=0 AND outcome='L') AS away_losses,sum(is_home=0 AND outcome='T') AS away_ties,
 sum(division_id=opponent_division_id AND outcome='W') AS division_wins,
 sum(division_id=opponent_division_id AND outcome='L') AS division_losses,
 sum(division_id=opponent_division_id AND outcome='T') AS division_ties,
 sum(points_for) AS points_for,sum(points_against) AS points_against,sum(points_for-points_against) AS point_differential,
 (sum(outcome='W')+.5*sum(outcome='T'))/count(*) AS win_percentage,
 (sum(division_id=opponent_division_id AND outcome='W')+.5*sum(division_id=opponent_division_id AND outcome='T'))/nullif(sum(division_id=opponent_division_id),0) AS division_win_percentage,
 max(last_outcome)||sum(breaks=0) AS streak
FROM streaked GROUP BY season_id,team_id,division_id,scope;
CREATE VIEW IF NOT EXISTS team_game_statistics AS
SELECT t.*,r.season_id,r.stage,r.points_for,r.points_against,
 t.rushing_yards+t.passing_yards AS total_gross_yards,
 t.rushing_yards+t.passing_yards-t.sack_yards_lost AS total_net_yards,
 o.rushing_yards AS rushing_yards_allowed,o.passing_yards AS passing_yards_allowed,
 o.rushing_yards+o.passing_yards AS total_gross_yards_allowed,
 o.rushing_yards+o.passing_yards-o.sack_yards_lost AS total_net_yards_allowed
FROM team_game_stats t JOIN team_game_stats o ON o.game_id=t.game_id AND o.team_id=t.opponent_team_id AND o.opponent_team_id=t.team_id
JOIN team_game_results r ON r.game_id=t.game_id AND r.team_id=t.team_id;
CREATE VIEW IF NOT EXISTS player_season_stats AS
WITH scoped AS (
 SELECT p.*,g.season_id,'regular' AS scope FROM player_game_stats p JOIN games g ON g.id=p.game_id WHERE g.status='final' AND g.stage='regular'
 UNION ALL SELECT p.*,g.season_id,'postseason' FROM player_game_stats p JOIN games g ON g.id=p.game_id WHERE g.status='final' AND g.stage='playoffs'
 UNION ALL SELECT p.*,g.season_id,'combined' FROM player_game_stats p JOIN games g ON g.id=p.game_id WHERE g.status='final'
)
SELECT s.season_id,s.scope,s.player_id,s.team_id,count(DISTINCT s.game_id) AS games_with_recorded_participation,
 sum(s.carries) AS carries,
 sum(s.rushing_yards) AS rushing_yards,
 sum(s.rushing_touchdowns) AS rushing_touchdowns,
 sum(s.rushing_fumbles) AS rushing_fumbles,
 sum(s.rushing_fumbles_lost) AS rushing_fumbles_lost,
 sum(s.rushing_first_downs) AS rushing_first_downs,
 sum(s.jukes) AS jukes,
 sum(s.broken_tackles) AS broken_tackles,
 sum(s.negative_rushes) AS negative_rushes,
 sum(s.rushes_5_plus) AS rushes_5_plus,
 sum(s.rushes_10_plus) AS rushes_10_plus,
 sum(s.rushes_20_plus) AS rushes_20_plus,
 sum(s.rushes_30_plus) AS rushes_30_plus,
 sum(s.rushes_50_plus) AS rushes_50_plus,
 max(s.longest_rush) AS longest_rush,
 sum(s.ol_wins) AS ol_wins,
 sum(s.ol_losses) AS ol_losses,
 sum(s.lead_blocks) AS lead_blocks,
 sum(s.dl_wins) AS dl_wins,
 sum(s.dl_losses) AS dl_losses,
 sum(s.tackles) AS tackles,
 sum(s.tackles_for_loss) AS tackles_for_loss,
 sum(s.defensive_sacks) AS defensive_sacks,
 sum(s.forced_fumbles) AS forced_fumbles,
 sum(s.fumble_recoveries) AS fumble_recoveries,
 sum(s.defensive_interceptions) AS defensive_interceptions,
 sum(s.deflections) AS deflections,
 sum(s.fumble_return_yards) AS fumble_return_yards,
 sum(s.fumble_return_touchdowns) AS fumble_return_touchdowns,
 sum(s.interception_return_yards) AS interception_return_yards,
 sum(s.interception_return_touchdowns) AS interception_return_touchdowns,
 sum(s.safeties_forced) AS safeties_forced,
 sum(s.targets) AS targets,
 sum(s.receptions) AS receptions,
 sum(s.receiving_yards) AS receiving_yards,
 sum(s.receiving_touchdowns) AS receiving_touchdowns,
 sum(s.receiving_first_downs) AS receiving_first_downs,
 sum(s.receiving_fumbles) AS receiving_fumbles,
 sum(s.receiving_fumbles_lost) AS receiving_fumbles_lost,
 sum(s.yac) AS yac,
 max(s.longest_reception) AS longest_reception,
 sum(s.receptions_20_plus) AS receptions_20_plus,
 sum(s.passing_attempts) AS passing_attempts,
 sum(s.passing_completions) AS passing_completions,
 sum(s.passing_yards) AS passing_yards,
 sum(s.passing_touchdowns) AS passing_touchdowns,
 sum(s.interceptions_thrown) AS interceptions_thrown,
 sum(s.sacks_taken) AS sacks_taken,
 sum(s.sack_yards_lost) AS sack_yards_lost,
 max(s.longest_pass) AS longest_pass,sum(s.passing_completions)*100.0/nullif(sum(s.passing_attempts),0) AS completion_percentage,
 sum(s.rushing_yards)*1.0/nullif(sum(s.carries),0) AS rushing_average,
 sum(s.receiving_yards)*1.0/nullif(sum(s.receptions),0) AS receiving_average
FROM scoped s GROUP BY s.season_id,s.scope,s.player_id,s.team_id;
CREATE VIEW IF NOT EXISTS player_career_stats AS
SELECT s.player_id,count(DISTINCT s.game_id) AS games_with_recorded_participation,
 sum(s.carries) AS carries,
 sum(s.rushing_yards) AS rushing_yards,
 sum(s.rushing_touchdowns) AS rushing_touchdowns,
 sum(s.rushing_fumbles) AS rushing_fumbles,
 sum(s.rushing_fumbles_lost) AS rushing_fumbles_lost,
 sum(s.rushing_first_downs) AS rushing_first_downs,
 sum(s.jukes) AS jukes,
 sum(s.broken_tackles) AS broken_tackles,
 sum(s.negative_rushes) AS negative_rushes,
 sum(s.rushes_5_plus) AS rushes_5_plus,
 sum(s.rushes_10_plus) AS rushes_10_plus,
 sum(s.rushes_20_plus) AS rushes_20_plus,
 sum(s.rushes_30_plus) AS rushes_30_plus,
 sum(s.rushes_50_plus) AS rushes_50_plus,
 max(s.longest_rush) AS longest_rush,
 sum(s.ol_wins) AS ol_wins,
 sum(s.ol_losses) AS ol_losses,
 sum(s.lead_blocks) AS lead_blocks,
 sum(s.dl_wins) AS dl_wins,
 sum(s.dl_losses) AS dl_losses,
 sum(s.tackles) AS tackles,
 sum(s.tackles_for_loss) AS tackles_for_loss,
 sum(s.defensive_sacks) AS defensive_sacks,
 sum(s.forced_fumbles) AS forced_fumbles,
 sum(s.fumble_recoveries) AS fumble_recoveries,
 sum(s.defensive_interceptions) AS defensive_interceptions,
 sum(s.deflections) AS deflections,
 sum(s.fumble_return_yards) AS fumble_return_yards,
 sum(s.fumble_return_touchdowns) AS fumble_return_touchdowns,
 sum(s.interception_return_yards) AS interception_return_yards,
 sum(s.interception_return_touchdowns) AS interception_return_touchdowns,
 sum(s.safeties_forced) AS safeties_forced,
 sum(s.targets) AS targets,
 sum(s.receptions) AS receptions,
 sum(s.receiving_yards) AS receiving_yards,
 sum(s.receiving_touchdowns) AS receiving_touchdowns,
 sum(s.receiving_first_downs) AS receiving_first_downs,
 sum(s.receiving_fumbles) AS receiving_fumbles,
 sum(s.receiving_fumbles_lost) AS receiving_fumbles_lost,
 sum(s.yac) AS yac,
 max(s.longest_reception) AS longest_reception,
 sum(s.receptions_20_plus) AS receptions_20_plus,
 sum(s.passing_attempts) AS passing_attempts,
 sum(s.passing_completions) AS passing_completions,
 sum(s.passing_yards) AS passing_yards,
 sum(s.passing_touchdowns) AS passing_touchdowns,
 sum(s.interceptions_thrown) AS interceptions_thrown,
 sum(s.sacks_taken) AS sacks_taken,
 sum(s.sack_yards_lost) AS sack_yards_lost,
 max(s.longest_pass) AS longest_pass,sum(s.passing_completions)*100.0/nullif(sum(s.passing_attempts),0) AS completion_percentage
FROM player_game_stats s JOIN games g ON g.id=s.game_id WHERE g.status='final' GROUP BY s.player_id;
CREATE VIEW IF NOT EXISTS team_season_stats AS
WITH scoped AS (
 SELECT t.*,'regular' AS scope FROM team_game_statistics t WHERE stage='regular'
 UNION ALL SELECT t.*,'postseason' FROM team_game_statistics t WHERE stage='playoffs'
 UNION ALL SELECT t.*,'combined' FROM team_game_statistics t
)
SELECT s.season_id,s.scope,s.team_id,count(*) AS games_played,
 sum(s.plays) AS plays,
 sum(s.drives) AS drives,
 sum(s.first_downs) AS first_downs,
 sum(s.rushing_attempts) AS rushing_attempts,
 sum(s.rushing_yards) AS rushing_yards,
 sum(s.rushing_touchdowns) AS rushing_touchdowns,
 sum(s.passing_attempts) AS passing_attempts,
 sum(s.passing_completions) AS passing_completions,
 sum(s.passing_yards) AS passing_yards,
 sum(s.passing_touchdowns) AS passing_touchdowns,
 sum(s.sacks_taken) AS sacks_taken,
 sum(s.sack_yards_lost) AS sack_yards_lost,
 sum(s.interceptions_thrown) AS interceptions_thrown,
 sum(s.fumbles) AS fumbles,
 sum(s.fumbles_lost) AS fumbles_lost,
 sum(s.offensive_yac) AS offensive_yac,
 sum(s.defensive_sacks) AS defensive_sacks,
 sum(s.tackles) AS tackles,
 sum(s.tackles_for_loss) AS tackles_for_loss,
 sum(s.interceptions_made) AS interceptions_made,
 sum(s.fumbles_recovered) AS fumbles_recovered,
 sum(s.deflections) AS deflections,
 sum(s.safeties_forced) AS safeties_forced,
 sum(s.field_goal_attempts) AS field_goal_attempts,
 sum(s.field_goals_made) AS field_goals_made,
 sum(s.extra_point_attempts) AS extra_point_attempts,
 sum(s.extra_points_made) AS extra_points_made,
 sum(s.two_point_attempts) AS two_point_attempts,
 sum(s.two_points_made) AS two_points_made,
 sum(s.punts) AS punts,
 sum(s.possession_seconds) AS possession_seconds,
 sum(s.points_for) AS points_for,
 sum(s.points_against) AS points_against,
 sum(s.total_gross_yards) AS total_gross_yards,
 sum(s.total_net_yards) AS total_net_yards,
 sum(s.rushing_yards_allowed) AS rushing_yards_allowed,
 sum(s.passing_yards_allowed) AS passing_yards_allowed,
 sum(s.total_gross_yards_allowed) AS total_gross_yards_allowed,
 sum(s.total_net_yards_allowed) AS total_net_yards_allowed,sum(s.total_gross_yards_allowed)*1.0/count(*) AS gross_yards_allowed_per_game
FROM scoped s GROUP BY s.season_id,s.scope,s.team_id;
CREATE VIEW IF NOT EXISTS award_vote_totals AS
SELECT r.id AS vote_run_id,r.status,n.id AS nomination_id,n.player_id,n.award_id,n.season_id,
 coalesce(sum(w.points),0) AS total_points,sum(CASE WHEN br.place=1 THEN 1 ELSE 0 END) AS place_1_votes,sum(CASE WHEN br.place=2 THEN 1 ELSE 0 END) AS place_2_votes,sum(CASE WHEN br.place=3 THEN 1 ELSE 0 END) AS place_3_votes,sum(CASE WHEN br.place=4 THEN 1 ELSE 0 END) AS place_4_votes,sum(CASE WHEN br.place=5 THEN 1 ELSE 0 END) AS place_5_votes,sum(CASE WHEN br.place=6 THEN 1 ELSE 0 END) AS place_6_votes,sum(CASE WHEN br.place=7 THEN 1 ELSE 0 END) AS place_7_votes,sum(CASE WHEN br.place=8 THEN 1 ELSE 0 END) AS place_8_votes
FROM award_vote_runs r JOIN award_nominations n ON n.award_id=r.award_id AND n.season_id=r.season_id
LEFT JOIN ballot_rankings br ON br.nomination_id=n.id AND br.ballot_id IN (SELECT id FROM award_ballots WHERE vote_run_id=r.id)
LEFT JOIN award_weights w ON w.award_id=r.award_id AND w.settings_version_id=r.settings_version_id AND w.place=br.place
GROUP BY r.id,r.status,n.id,n.player_id,n.award_id,n.season_id;
CREATE VIEW IF NOT EXISTS award_rankings AS
SELECT t.*,dense_rank() OVER(PARTITION BY vote_run_id ORDER BY total_points DESC,place_1_votes DESC,place_2_votes DESC,place_3_votes DESC,place_4_votes DESC,place_5_votes DESC,place_6_votes DESC,place_7_votes DESC,place_8_votes DESC) AS rank
FROM award_vote_totals t WHERE status='completed';
-- A completed vote must contain 125 complete ballots of the nominated slate.
CREATE TRIGGER IF NOT EXISTS completed_vote_validation BEFORE UPDATE OF status,completed_ballots ON award_vote_runs
WHEN NEW.status='completed' AND (
 NEW.completed_ballots<>125 OR
 (SELECT count(*) FROM award_ballots WHERE vote_run_id=NEW.id)<>125 OR
 (SELECT count(*) FROM award_nominations WHERE season_id=NEW.season_id AND award_id=NEW.award_id)<>(SELECT nominee_count FROM award_definitions WHERE id=NEW.award_id) OR
 EXISTS(SELECT 1 FROM award_ballots b WHERE b.vote_run_id=NEW.id AND
  (SELECT count(*) FROM ballot_rankings r WHERE r.ballot_id=b.id)<>(SELECT nominee_count FROM award_definitions WHERE id=NEW.award_id))
)
BEGIN SELECT RAISE(ABORT,'Completed award vote requires 125 complete valid ballots'); END;
CREATE TRIGGER IF NOT EXISTS new_vote_starts_uncompleted BEFORE INSERT ON award_vote_runs
WHEN NEW.status='completed'
BEGIN SELECT RAISE(ABORT,'Create a vote before recording ballots and completing it'); END;
CREATE TRIGGER IF NOT EXISTS player_stats_game_team BEFORE INSERT ON player_game_stats
WHEN NOT EXISTS(SELECT 1 FROM games WHERE id=NEW.game_id AND NEW.team_id IN (home_team_id,away_team_id))
BEGIN SELECT RAISE(ABORT,'Player stats team must participate in this game'); END;
CREATE TRIGGER IF NOT EXISTS team_stats_game_teams BEFORE INSERT ON team_game_stats
WHEN NOT EXISTS(SELECT 1 FROM games WHERE id=NEW.game_id AND
 ((home_team_id=NEW.team_id AND away_team_id=NEW.opponent_team_id) OR (away_team_id=NEW.team_id AND home_team_id=NEW.opponent_team_id)))
BEGIN SELECT RAISE(ABORT,'Team stats opponents must match this game'); END;
CREATE INDEX IF NOT EXISTS import_target_lookup ON source_record_mappings(import_batch_id,target_table,target_id);

INSERT INTO schema_migrations(version,name,checksum) VALUES(2,'0002_league_domains.sql','c896ba114ee99212963227f17b3515ebb32028320be451e168c284e39179a441') ON CONFLICT(version) DO NOTHING;
DROP TRIGGER afl_schema_check;
DROP TABLE afl_schema_guard;
RELEASE SAVEPOINT afl_remaining_10;
-- DB Browser commits pending changes before PRAGMA assignments. Keep this OUTSIDE our savepoint.
PRAGMA user_version=2;
SELECT version,name FROM schema_migrations ORDER BY version;
