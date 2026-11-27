-- 01-divisions: 2 records from the uploaded workbook, not live Sheets.
-- DB Browser: save pending edits first. Execute this WHOLE file, then Write Changes.
-- SAVEPOINT supports DB Browser's existing transaction; there is no BEGIN/COMMIT.
-- Identical reruns do nothing. Conflicts roll back the transaction instead of overwriting.
PRAGMA foreign_keys=ON;
SAVEPOINT afl_import_1;
CREATE TEMP TABLE afl_import_1 AS SELECT id, league_id, name, display_order FROM divisions WHERE 0;
INSERT INTO afl_import_1 (id, league_id, name, display_order) VALUES
('3c9d9288-a1af-5594-aa63-a62d14c02937', '36c6e53f-7be2-5a94-84a8-0df871aae9fd', 'West', 0),
('e0ffe481-09a5-520c-ac27-03a608d6e570', '36c6e53f-7be2-5a94-84a8-0df871aae9fd', 'East', 1);
CREATE TEMP TABLE afl_import_1_guard(ok INTEGER);
CREATE TEMP TRIGGER afl_import_1_check BEFORE INSERT ON afl_import_1_guard
BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM leagues WHERE id='36c6e53f-7be2-5a94-84a8-0df871aae9fd' AND name='AFL') THEN RAISE(ROLLBACK,'Missing expected AFL league record.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM afl_import_1 i JOIN divisions t ON t.id=i.id WHERE t.league_id IS NOT i.league_id OR t.name IS NOT i.name OR t.display_order IS NOT i.display_order) THEN RAISE(ROLLBACK,'Existing ID has different data; no records overwritten.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM afl_import_1 i JOIN divisions t ON t.league_id=i.league_id AND lower(t.name)=lower(i.name) WHERE t.id<>i.id) THEN RAISE(ROLLBACK,'An existing natural key uses another ID; reconcile before importing.') END;
END;
INSERT INTO afl_import_1_guard VALUES(1);
INSERT INTO divisions (id, league_id, name, display_order) SELECT id, league_id, name, display_order FROM afl_import_1 WHERE 1 ON CONFLICT(id) DO NOTHING;
INSERT INTO import_batches (id, source_filename, source_sha256, importer_version, status, counts_json, reconciliation_json, imported_at) VALUES ('d0ea2c7d-3be0-596d-9799-9d0f4c380fc7', 'Football Game DB spreadsheet (1).xlsx', 'ea9f4319219b46711d28143c90ab27a9fd5ba80b0ade895a2aebf6516c59b704', 'core-snapshot-v1-01-divisions', 'imported', '{"divisions":2}', '{"mode":"insert-only; identical reruns skipped","scope":"divisions","settings_status":"draft","source":"uploaded snapshot"}', strftime('%Y-%m-%dT%H:%M:%fZ','now')) ON CONFLICT(id) DO NOTHING;
INSERT INTO source_record_mappings (id, import_batch_id, source_sheet, source_row, source_legacy_key, target_table, target_id, original_record_json) VALUES
('2934eb07-93f3-5c6f-95b8-9936f2504316', 'd0ea2c7d-3be0-596d-9799-9d0f4c380fc7', 'Divisions', 2, 'West', 'divisions', '3c9d9288-a1af-5594-aa63-a62d14c02937', '{"Division":"West"}'),
('44239ee6-d0f3-5d41-b2fc-05edf455c487', 'd0ea2c7d-3be0-596d-9799-9d0f4c380fc7', 'Divisions', 3, 'East', 'divisions', 'e0ffe481-09a5-520c-ac27-03a608d6e570', '{"Division":"East"}') ON CONFLICT(id) DO NOTHING;
DROP TRIGGER afl_import_1_check;
DROP TABLE afl_import_1_guard;
DROP TABLE afl_import_1;
RELEASE SAVEPOINT afl_import_1;
PRAGMA foreign_key_check;
SELECT 'divisions' AS imported_table, COUNT(*) AS reviewed_records_present FROM divisions WHERE id IN ('3c9d9288-a1af-5594-aa63-a62d14c02937', 'e0ffe481-09a5-520c-ac27-03a608d6e570');
