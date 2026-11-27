-- 03-settings-versions: 1 records from the uploaded workbook, not live Sheets.
-- DB Browser: save pending edits first. Execute this WHOLE file, then Write Changes.
-- SAVEPOINT supports DB Browser's existing transaction; there is no BEGIN/COMMIT.
-- Identical reruns do nothing. Conflicts roll back the transaction instead of overwriting.
PRAGMA foreign_keys=ON;
SAVEPOINT afl_import_3;
CREATE TEMP TABLE afl_import_3 AS SELECT id, league_id, version, label, status, content_hash FROM settings_versions WHERE 0;
INSERT INTO afl_import_3 (id, league_id, version, label, status, content_hash) VALUES
('05328eb3-a56b-5792-b238-e05c32377adc', '36c6e53f-7be2-5a94-84a8-0df871aae9fd', 1, 'Initial uploaded workbook settings snapshot', 'draft', '5fe3cbed093c254ca3e00c4bc2d73dc6fe9778839eefb35ae5cf7e705bdd90ea');
CREATE TEMP TABLE afl_import_3_guard(ok INTEGER);
CREATE TEMP TRIGGER afl_import_3_check BEFORE INSERT ON afl_import_3_guard
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM leagues WHERE id='36c6e53f-7be2-5a94-84a8-0df871aae9fd' AND name='AFL') THEN RAISE(ROLLBACK,'Missing expected AFL league record.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM afl_import_3 i JOIN settings_versions t ON t.id=i.id WHERE t.league_id IS NOT i.league_id OR t.version IS NOT i.version OR t.label IS NOT i.label OR t.status IS NOT i.status OR t.content_hash IS NOT i.content_hash) THEN RAISE(ROLLBACK,'Existing ID has different data; no records overwritten.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM afl_import_3 i JOIN settings_versions t ON t.league_id=i.league_id AND t.version=i.version WHERE t.id<>i.id) THEN RAISE(ROLLBACK,'An existing natural key uses another ID; reconcile before importing.') END;
END;
INSERT INTO afl_import_3_guard VALUES(1);
INSERT INTO settings_versions (id, league_id, version, label, status, content_hash) SELECT id, league_id, version, label, status, content_hash FROM afl_import_3 WHERE 1 ON CONFLICT(id) DO NOTHING;
INSERT INTO import_batches (id, source_filename, source_sha256, importer_version, status, counts_json, reconciliation_json, imported_at) VALUES ('cf5dbc19-03d6-58df-ab49-735eaab56581', 'Football Game DB spreadsheet (1).xlsx', 'ea9f4319219b46711d28143c90ab27a9fd5ba80b0ade895a2aebf6516c59b704', 'core-snapshot-v1-03-settings-versions', 'imported', '{"settings_versions":1}', '{"mode":"insert-only; identical reruns skipped","scope":"settings_versions","settings_status":"draft","source":"uploaded snapshot"}', strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(id) DO NOTHING;
INSERT INTO source_record_mappings (id, import_batch_id, source_sheet, source_row, source_legacy_key, target_table, target_id, original_record_json) VALUES
('50f3ebad-f82a-551b-89a8-87c980360080', 'cf5dbc19-03d6-58df-ab49-735eaab56581', 'Settings', 1, 'settings-version-1', 'settings_versions', '05328eb3-a56b-5792-b238-e05c32377adc', '{"configuration_count":38,"content_hash":"5fe3cbed093c254ca3e00c4bc2d73dc6fe9778839eefb35ae5cf7e705bdd90ea","source_sha256":"ea9f4319219b46711d28143c90ab27a9fd5ba80b0ade895a2aebf6516c59b704"}') ON CONFLICT(id) DO NOTHING;
DROP TRIGGER afl_import_3_check;
DROP TABLE afl_import_3_guard;
DROP TABLE afl_import_3;
RELEASE SAVEPOINT afl_import_3;
PRAGMA foreign_key_check;
SELECT 'settings_versions' AS imported_table, COUNT(*) AS reviewed_records_present FROM settings_versions WHERE id IN ('05328eb3-a56b-5792-b238-e05c32377adc');
