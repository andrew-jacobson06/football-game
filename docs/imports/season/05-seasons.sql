-- 05-seasons: uploaded workbook snapshot. Run entire file, then Write Changes.
-- Save pending edits and take a backup first. No BEGIN/COMMIT needed in DB Browser.
-- Identical reruns are safe; changed existing records are never overwritten.
PRAGMA foreign_keys=ON;
SAVEPOINT afl_season_5;
CREATE TEMP TABLE afl_season_import_stamp(effective_at TEXT NOT NULL);
INSERT INTO afl_season_import_stamp VALUES(COALESCE((SELECT imported_at FROM import_batches WHERE id='857ea104-a87a-5924-b8e5-5ab1f8e2f48b'),strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE TEMP TABLE afl_season_5_0 AS SELECT id, league_id, season_number, display_name, display_year, status, current_stage, current_week, settings_version_id, started_at, games_completed_at, finalized_at FROM seasons WHERE 0;
INSERT INTO afl_season_5_0 (id, league_id, season_number, display_name, display_year, status, current_stage, current_week, settings_version_id, started_at, games_completed_at, finalized_at) VALUES
('97808f43-a0d5-5251-bf8d-fae1643c8258', '36c6e53f-7be2-5a94-84a8-0df871aae9fd', 1, 'Season 1', 2026, 'awards_pending', 'National Championship', NULL, NULL, NULL, NULL, NULL);
CREATE TEMP TABLE afl_season_5_guard(ok INTEGER);
CREATE TEMP TRIGGER afl_season_5_check BEFORE INSERT ON afl_season_5_guard
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM leagues WHERE id='36c6e53f-7be2-5a94-84a8-0df871aae9fd' AND name='AFL') THEN RAISE(ROLLBACK,'Missing AFL league.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM afl_season_5_0 i JOIN seasons t ON t.id=i.id WHERE t.league_id IS NOT i.league_id OR t.season_number IS NOT i.season_number OR t.display_name IS NOT i.display_name OR t.display_year IS NOT i.display_year OR t.status IS NOT i.status OR t.current_stage IS NOT i.current_stage OR t.current_week IS NOT i.current_week OR t.settings_version_id IS NOT i.settings_version_id OR t.started_at IS NOT i.started_at OR t.games_completed_at IS NOT i.games_completed_at OR t.finalized_at IS NOT i.finalized_at) THEN RAISE(ROLLBACK,'seasons: existing ID has different data; no records overwritten.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM afl_season_5_0 i JOIN seasons t ON t.league_id=i.league_id AND t.season_number=i.season_number WHERE t.id<>i.id) THEN RAISE(ROLLBACK,'seasons: natural key belongs to another ID.') END;
END;
INSERT INTO afl_season_5_guard VALUES(1);
INSERT INTO seasons (id, league_id, season_number, display_name, display_year, status, current_stage, current_week, settings_version_id, started_at, games_completed_at, finalized_at) SELECT i.id, i.league_id, i.season_number, i.display_name, i.display_year, i.status, i.current_stage, i.current_week, i.settings_version_id, i.started_at, i.games_completed_at, i.finalized_at FROM afl_season_5_0 i WHERE NOT EXISTS(SELECT 1 FROM seasons t WHERE t.id=i.id) ON CONFLICT(id) DO NOTHING;
INSERT INTO import_batches (id, source_filename, source_sha256, importer_version, status, counts_json, reconciliation_json, imported_at) VALUES
('857ea104-a87a-5924-b8e5-5ab1f8e2f48b', 'Football Game DB spreadsheet (1).xlsx', 'ea9f4319219b46711d28143c90ab27a9fd5ba80b0ade895a2aebf6516c59b704', 'season-snapshot-v1-05-seasons', 'imported', '{"seasons":1}', '{"historical_settings_and_timezone":"unknown, not fabricated","policy":"insert-only; no replacement; uploaded snapshot","roster_policy":"PlayerTeams; NULL team allowed; import-time effective date","scope":"seasons"}', (SELECT effective_at FROM afl_season_import_stamp)) ON CONFLICT(id) DO NOTHING;
INSERT INTO source_record_mappings (id, import_batch_id, source_sheet, source_row, source_legacy_key, target_table, target_id, original_record_json) VALUES
('d2240029-99df-5e2c-a22f-d78347fe642a', '857ea104-a87a-5924-b8e5-5ab1f8e2f48b', 'Season', 3, '1', 'seasons', '97808f43-a0d5-5251-bf8d-fae1643c8258', '{"display_year_derivation":"All schedule kickoff dates have year 2026.","settings_note":"Draft settings have not been proven historical or activated; link remains NULL.","source_values":{"Season":1.0,"Week":"National Championship"},"status_derivation":"All 70 Games are FINAL; awards not finalized; no invented historical completion timestamp."}') ON CONFLICT(id) DO NOTHING;
DROP TRIGGER afl_season_5_check;
DROP TABLE afl_season_5_guard;
DROP TABLE afl_season_5_0;
DROP TABLE afl_season_import_stamp;
RELEASE SAVEPOINT afl_season_5;
PRAGMA foreign_key_check;
SELECT 'seasons' AS imported_table, COUNT(*) AS reviewed_records_present FROM seasons WHERE id IN ('97808f43-a0d5-5251-bf8d-fae1643c8258');
