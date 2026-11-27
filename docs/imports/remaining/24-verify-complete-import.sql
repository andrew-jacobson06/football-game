-- Read-only verification for this exact snapshot. All rows should show OK.
WITH checks AS (
SELECT 'leagues' AS check_name,1 AS expected,(SELECT count(*) FROM leagues) AS actual
UNION ALL
SELECT 'divisions' AS check_name,2 AS expected,(SELECT count(*) FROM divisions) AS actual
UNION ALL
SELECT 'teams' AS check_name,10 AS expected,(SELECT count(*) FROM teams) AS actual
UNION ALL
SELECT 'players' AS check_name,107 AS expected,(SELECT count(*) FROM players) AS actual
UNION ALL
SELECT 'seasons' AS check_name,1 AS expected,(SELECT count(*) FROM seasons) AS actual
UNION ALL
SELECT 'team_seasons' AS check_name,10 AS expected,(SELECT count(*) FROM team_seasons) AS actual
UNION ALL
SELECT 'player_season_ratings' AS check_name,107 AS expected,(SELECT count(*) FROM player_season_ratings) AS actual
UNION ALL
SELECT 'player_team_assignments' AS check_name,107 AS expected,(SELECT count(*) FROM player_team_assignments) AS actual
UNION ALL
SELECT 'games' AS check_name,70 AS expected,(SELECT count(*) FROM games) AS actual
UNION ALL
SELECT 'game_state' AS check_name,70 AS expected,(SELECT count(*) FROM game_state) AS actual
UNION ALL
SELECT 'plays' AS check_name,9575 AS expected,(SELECT count(*) FROM plays) AS actual
UNION ALL
SELECT 'play_details' AS check_name,9575 AS expected,(SELECT count(*) FROM play_details) AS actual
UNION ALL
SELECT 'play_participants' AS check_name,23811 AS expected,(SELECT count(*) FROM play_participants) AS actual
UNION ALL
SELECT 'play_line_matchups' AS check_name,32343 AS expected,(SELECT count(*) FROM play_line_matchups) AS actual
UNION ALL
SELECT 'play_stat_deltas' AS check_name,123766 AS expected,(SELECT count(*) FROM play_stat_deltas) AS actual
UNION ALL
SELECT 'player_game_stats' AS check_name,1237 AS expected,(SELECT count(*) FROM player_game_stats) AS actual
UNION ALL
SELECT 'team_game_stats' AS check_name,140 AS expected,(SELECT count(*) FROM team_game_stats) AS actual
UNION ALL
SELECT 'season_stat_snapshots' AS check_name,117 AS expected,(SELECT count(*) FROM season_stat_snapshots) AS actual
UNION ALL
SELECT 'standing_snapshots' AS check_name,36 AS expected,(SELECT count(*) FROM standing_snapshots) AS actual
UNION ALL
SELECT 'configuration_tables' AS check_name,38 AS expected,(SELECT count(*) FROM configuration_tables) AS actual
UNION ALL
SELECT 'settings_versions' AS check_name,1 AS expected,(SELECT count(*) FROM settings_versions) AS actual
UNION ALL
SELECT 'routes' AS check_name,19 AS expected,(SELECT count(*) FROM routes) AS actual
UNION ALL
SELECT 'route_depths' AS check_name,9 AS expected,(SELECT count(*) FROM route_depths) AS actual
UNION ALL
SELECT 'route_depth_eligibility' AS check_name,171 AS expected,(SELECT count(*) FROM route_depth_eligibility) AS actual
UNION ALL
SELECT 'openness_curve_points' AS check_name,28 AS expected,(SELECT count(*) FROM openness_curve_points) AS actual
UNION ALL
SELECT 'app_preferences' AS check_name,1 AS expected,(SELECT count(*) FROM app_preferences) AS actual
UNION ALL
SELECT 'playoff_seedings' AS check_name,6 AS expected,(SELECT count(*) FROM playoff_seedings) AS actual
UNION ALL
SELECT 'bracket_slots' AS check_name,12 AS expected,(SELECT count(*) FROM bracket_slots) AS actual
UNION ALL
SELECT 'award_definitions' AS check_name,3 AS expected,(SELECT count(*) FROM award_definitions) AS actual
UNION ALL
SELECT 'award_weights' AS check_name,18 AS expected,(SELECT count(*) FROM award_weights) AS actual
UNION ALL
SELECT 'award_nominations' AS check_name,18 AS expected,(SELECT count(*) FROM award_nominations) AS actual
UNION ALL
SELECT 'award_vote_runs' AS check_name,3 AS expected,(SELECT count(*) FROM award_vote_runs) AS actual
UNION ALL
SELECT 'honor_slots' AS check_name,34 AS expected,(SELECT count(*) FROM honor_slots) AS actual
UNION ALL
SELECT 'honor_selections' AS check_name,34 AS expected,(SELECT count(*) FROM honor_selections) AS actual
UNION ALL
SELECT 'articles' AS check_name,19 AS expected,(SELECT count(*) FROM articles) AS actual
UNION ALL
SELECT 'coaches' AS check_name,20 AS expected,(SELECT count(*) FROM coaches) AS actual
UNION ALL
SELECT 'coach_season_ratings' AS check_name,20 AS expected,(SELECT count(*) FROM coach_season_ratings) AS actual
UNION ALL
SELECT 'draft_board_snapshots' AS check_name,1 AS expected,(SELECT count(*) FROM draft_board_snapshots) AS actual
UNION ALL
SELECT 'player_aliases' AS check_name,107 AS expected,(SELECT count(*) FROM player_aliases) AS actual
UNION ALL
SELECT 'schema_migrations' AS check_name,2 AS expected,(SELECT count(*) FROM schema_migrations) AS actual
UNION ALL
SELECT 'import_batches' AS check_name,22 AS expected,(SELECT count(*) FROM import_batches) AS actual
UNION ALL
SELECT 'source_record_mappings' AS check_name,76396 AS expected,(SELECT count(*) FROM source_record_mappings) AS actual
UNION ALL
SELECT 'game_player_state' AS check_name,0 AS expected,(SELECT count(*) FROM game_player_state) AS actual
UNION ALL
SELECT 'coach_team_assignments' AS check_name,0 AS expected,(SELECT count(*) FROM coach_team_assignments) AS actual
UNION ALL
SELECT 'drafts' AS check_name,0 AS expected,(SELECT count(*) FROM drafts) AS actual
UNION ALL
SELECT 'draft_picks' AS check_name,0 AS expected,(SELECT count(*) FROM draft_picks) AS actual
UNION ALL
SELECT 'award_ballots' AS check_name,0 AS expected,(SELECT count(*) FROM award_ballots) AS actual
UNION ALL
SELECT 'ballot_rankings' AS check_name,0 AS expected,(SELECT count(*) FROM ballot_rankings) AS actual
UNION ALL
SELECT 'award_results' AS check_name,0 AS expected,(SELECT count(*) FROM award_results) AS actual
UNION ALL
SELECT 'ai_jobs' AS check_name,0 AS expected,(SELECT count(*) FROM ai_jobs) AS actual
UNION ALL
SELECT 'audit_log' AS check_name,0 AS expected,(SELECT count(*) FROM audit_log) AS actual
UNION ALL
SELECT 'final play links',70,(SELECT count(*) FROM game_state WHERE phase='final' AND last_play_id IS NOT NULL)
UNION ALL
SELECT 'tables',51,(SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%')
UNION ALL
SELECT 'foreign-key violations',0,(SELECT count(*) FROM pragma_foreign_key_check)
UNION ALL
SELECT 'incomplete award winners',0,(SELECT count(*) FROM award_rankings)
UNION ALL
SELECT 'managed schema checksum',1,(SELECT count(*) FROM schema_migrations WHERE version=2 AND checksum='c896ba114ee99212963227f17b3515ebb32028320be451e168c284e39179a441')
UNION ALL
SELECT 'integrity errors',0,(SELECT count(*) FROM pragma_integrity_check WHERE integrity_check<>'ok')
) SELECT check_name,expected,actual,CASE WHEN expected=actual THEN 'OK' ELSE 'CHECK' END AS result FROM checks ORDER BY check_name;
