"""Validate the downloadable SQL against the real schema, including DB Browser nesting.
Run: python -m unittest discover -s docs/imports/core -p 'test_*.py' -v
No workbook or third-party Python packages are needed to run these tests.
"""
import json
from pathlib import Path
import sqlite3
import unittest

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PREVIEW = json.loads((HERE / 'preview.json').read_text(encoding='utf-8'))
LEAGUE = PREVIEW['league_id']
FILES = sorted(HERE.glob('[0-9][0-9]-*.sql'))
SCHEMA = (ROOT / 'apps/api/src/db/migrations/0001_core.sql').read_text(encoding='utf-8')

def execute_file(db, filename):
    # executescript() commits pending work first; execute each complete statement
    # instead so this also tests running inside DB Browser's open transaction.
    statement = ''
    for line in filename.read_text(encoding='utf-8').splitlines(keepends=True):
        statement += line
        if sqlite3.complete_statement(statement):
            db.execute(statement).fetchall()
            statement = ''
    assert not statement.strip()

class ImportsTest(unittest.TestCase):
    def database(self, league=True):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.execute('PRAGMA foreign_keys=ON')
        db.executescript(SCHEMA)
        if league:
            db.execute('INSERT INTO leagues(id,name) VALUES(?,?)', (LEAGUE, 'AFL'))
            db.commit()
        return db

    def run_files(self, db, files=FILES):
        for file in files:
            execute_file(db, file)

    def snapshot(self, db):
        names = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
        return {name: db.execute(f'SELECT * FROM "{name}" ORDER BY rowid').fetchall() for name in names}

    def test_counts_foreign_keys_and_provenance(self):
        db = self.database()
        db.execute('INSERT INTO players(id,league_id,display_name) VALUES(?,?,?)', ('existing-player', LEAGUE, 'Keep Me'))
        db.commit()
        self.run_files(db)
        for table, count in [('divisions', 2), ('teams', 10), ('settings_versions', 1), ('configuration_tables', 38), ('import_batches', 4), ('source_record_mappings', 51), ('players', 1), ('seasons', 0), ('team_seasons', 0)]:
            self.assertEqual(db.execute(f'SELECT count(*) FROM {table}').fetchone()[0], count, table)
        self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
        self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
        self.assertEqual(db.execute('SELECT status FROM settings_versions').fetchone()[0], 'draft')
        self.assertEqual(db.execute('SELECT sum(is_active) FROM configuration_tables').fetchone()[0], 24)
        self.assertFalse(db.in_transaction)

    def test_db_browser_open_transaction_and_repeat(self):
        db = self.database()
        db.execute('BEGIN')
        self.run_files(db)
        self.assertTrue(db.in_transaction)
        db.commit()  # DB Browser Write Changes
        before = self.snapshot(db)
        db.execute('BEGIN')
        self.run_files(db)
        self.assertEqual(before, self.snapshot(db))
        self.assertTrue(db.in_transaction)
        db.commit()

    def test_missing_league_leaves_no_imported_records(self):
        db = self.database(False)
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'Missing expected AFL'):
            execute_file(db, FILES[0])
        self.assertFalse(db.in_transaction)
        self.assertEqual(db.execute('SELECT count(*) FROM divisions').fetchone()[0], 0)
        self.assertEqual(db.execute('SELECT count(*) FROM import_batches').fetchone()[0], 0)

    def test_configuration_requires_exact_settings_snapshot(self):
        db = self.database()
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'matching draft'):
            execute_file(db, FILES[3])
        self.assertEqual(db.execute('SELECT count(*) FROM configuration_tables').fetchone()[0], 0)
        self.run_files(db, FILES[:3])
        db.execute("UPDATE settings_versions SET content_hash='changed'")
        db.commit()
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'matching draft'):
            execute_file(db, FILES[3])

    def test_natural_key_conflict_does_not_overwrite(self):
        for index, setup in [
            (0, lambda db: db.execute('INSERT INTO divisions(id,league_id,name) VALUES(?,?,?)', ('other', LEAGUE, 'West'))),
            (1, lambda db: db.execute('INSERT INTO teams(id,league_id,legacy_team_id) VALUES(?,?,?)', ('other', LEAGUE, '1'))),
            (2, lambda db: db.execute('INSERT INTO settings_versions(id,league_id,version,label) VALUES(?,?,?,?)', ('other', LEAGUE, 1, 'Existing'))),
        ]:
            with self.subTest(index=index):
                db = self.database()
                setup(db)
                db.commit()
                before = self.snapshot(db)
                with self.assertRaisesRegex(sqlite3.IntegrityError, 'natural key'):
                    execute_file(db, FILES[index])
                self.assertEqual(before, self.snapshot(db))

    def test_modified_existing_configuration_is_not_replaced(self):
        db = self.database()
        self.run_files(db)
        db.execute("UPDATE configuration_tables SET values_json='{}' WHERE table_key='pick_accuracy_multipliers'")
        db.commit()
        before = self.snapshot(db)
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'different data'):
            execute_file(db, FILES[3])
        self.assertEqual(before, self.snapshot(db))

    def test_config_values_and_reference_isolation(self):
        db = self.database()
        self.run_files(db)
        configs = {key: (json.loads(value), active) for key, value, active in db.execute('SELECT table_key,values_json,is_active FROM configuration_tables')}
        time = configs['time_to_throw_ranges'][0]
        self.assertAlmostEqual(sum(r['percentage'] for r in time['data']), 100)
        self.assertEqual(time['source']['cells'][3][3], .05)
        self.assertEqual(time['data'][0]['percentage'], 5)
        depths = configs['route_type_air_yards'][0]['data']
        self.assertEqual(depths[0]['minAirYards'], -3)
        self.assertIsNone(depths[-1]['maxAirYards'])
        self.assertEqual(configs['jump_air_yards'][0]['data'][0]['multiplier'], 1)
        self.assertEqual(configs['jump_routes'][0]['data'][0]['multiplier'], 1.5)
        self.assertIsNone(configs['qb_decision_table'][0]['data'][0]['noticeIfPrimary'])
        self.assertEqual(configs['yac_throw_multipliers'][0]['data'][1]['depths'][0]['multiplier'], 1)
        reference, active = configs['reference_fatigue_experiments']
        self.assertEqual(active, 0)
        self.assertIsNone(reference['data'])
        self.assertTrue(reference['source']['formulas'])
        self.assertTrue(reference['source']['special_cell_types'])
        # Formula text is preserved as provenance, never evaluated as executable SQL.
        self.assertEqual(len(PREVIEW['branding_and_membership_for_future_team_seasons']), 10)

if __name__ == '__main__':
    unittest.main()
