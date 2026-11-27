"""Run from repository root: python -m unittest discover -s docs/imports/season -p 'test_*.py' -v"""
import importlib.util
import json
from pathlib import Path
import sqlite3
import unittest

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PREVIEW = json.loads((HERE / 'preview.json').read_text(encoding='utf-8'))
CORE = ROOT / 'docs/imports/core'
spec = importlib.util.spec_from_file_location('core_import_helpers', CORE / 'test_imports.py')
helpers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)
FILES = sorted(HERE.glob('[0-9][0-9]-*.sql'))
LEAGUE = PREVIEW['league_id']
SEASON = PREVIEW['season']['id']

def execute_text(db, sql):
    statement = ''
    for line in sql.splitlines(keepends=True):
        statement += line
        if sqlite3.complete_statement(statement):
            db.execute(statement).fetchall()
            statement = ''
    assert not statement.strip()

class SeasonImportsTest(unittest.TestCase):
    def database(self, players=True):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.execute('PRAGMA foreign_keys=ON')
        db.executescript(helpers.SCHEMA)
        db.execute('INSERT INTO leagues(id,name) VALUES(?,?)', (LEAGUE, 'AFL'))
        db.commit()
        if players:
            # Same change the user made when importing in DB Browser.
            sql = (ROOT / 'docs/imports/import-107-players.sql').read_text(encoding='utf-8')
            execute_text(db, sql.replace('BEGIN IMMEDIATE;', '').replace('COMMIT;', ''))
            db.commit()
        for file in sorted(CORE.glob('[0-9][0-9]-*.sql')):
            helpers.execute_file(db, file)
        db.commit()
        return db

    def load(self, db, files=FILES):
        for file in files:
            helpers.execute_file(db, file)

    def snapshot(self, db):
        names = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
        return {name: db.execute(f'SELECT * FROM "{name}" ORDER BY rowid').fetchall() for name in names}

    def test_counts_integrity_provenance_and_final_season(self):
        db = self.database()
        self.load(db)
        for table, expected in PREVIEW['counts'].items():
            self.assertEqual(db.execute(f'SELECT count(*) FROM {table}').fetchone()[0], expected, table)
        self.assertEqual(db.execute('SELECT count(*) FROM players').fetchone()[0], 107)
        self.assertEqual(db.execute('SELECT count(*) FROM import_batches').fetchone()[0], 9)
        self.assertEqual(db.execute('SELECT count(*) FROM source_record_mappings').fetchone()[0], 416)
        self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
        self.assertEqual(db.execute('PRAGMA integrity_check').fetchone()[0], 'ok')
        self.assertEqual(db.execute('SELECT status,current_stage,display_year,settings_version_id FROM seasons').fetchone(), ('awards_pending', 'National Championship', 2026, None))
        self.assertEqual(db.execute('SELECT count(*) FROM plays').fetchone()[0], 0)
        self.assertFalse(db.in_transaction)

    def test_nested_transaction_and_identical_reruns_keep_timestamps(self):
        db = self.database()
        db.execute('BEGIN')
        self.load(db)
        self.assertTrue(db.in_transaction)
        db.commit()
        before = self.snapshot(db)
        db.execute('BEGIN')
        self.load(db)
        self.assertEqual(before, self.snapshot(db))
        self.assertTrue(db.in_transaction)
        db.commit()
        self.assertEqual(db.execute('SELECT count(DISTINCT effective_from) FROM player_team_assignments').fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT count(*) FROM player_team_assignments a JOIN import_batches b ON b.importer_version='season-snapshot-v1-08-player-team-assignments' WHERE a.effective_from=b.imported_at").fetchone()[0], 107)

    def test_ratings_positions_blanks_and_zeroes_are_preserved(self):
        db = self.database()
        self.load(db, FILES[:3])
        fuzz = db.execute("SELECT r.offense_position,r.defense_position,r.accuracy,r.speed,r.image_translate_x,r.image_scale,r.overall_rating,r.effective_from FROM player_season_ratings r JOIN players p ON p.id=r.player_id WHERE p.display_name='Fuzz'").fetchone()
        self.assertEqual(fuzz, ('OL', 'DL', None, 92, 0, 1, None, None))
        self.assertEqual(db.execute('SELECT count(*) FROM player_season_ratings WHERE version=1').fetchone()[0], 107)
        self.assertEqual(db.execute('SELECT count(*) FROM team_seasons WHERE logo_url IS NOT NULL AND home_jersey_url IS NOT NULL AND away_jersey_url IS NOT NULL AND primary_color IS NOT NULL').fetchone()[0], 10)

    def test_playerteams_is_authority_and_blank_teams_stay_unassigned(self):
        db = self.database()
        self.load(db, FILES[:4])
        self.assertEqual(db.execute('SELECT count(*) FROM player_team_assignments WHERE team_id IS NULL').fetchone()[0], 18)
        self.assertEqual(db.execute("SELECT ts.abbreviation FROM player_team_assignments a JOIN players p ON p.id=a.player_id JOIN team_seasons ts ON ts.team_id=a.team_id AND ts.season_id=a.season_id WHERE p.display_name='Fuzz'").fetchone()[0], 'ABQ')
        self.assertEqual(db.execute("SELECT a.team_id FROM player_team_assignments a JOIN players p ON p.id=a.player_id WHERE p.display_name='Garfield'").fetchone(), (None,))
        self.assertEqual(sum(r['different'] for r in PREVIEW['rosters']), 97)

    def test_games_final_scores_overtime_ties_and_neutral_site(self):
        db = self.database()
        self.load(db)
        self.assertEqual(db.execute("SELECT stage,count(*) FROM games GROUP BY stage ORDER BY stage").fetchall(), [('playoffs', 5), ('regular', 65)])
        self.assertEqual(db.execute("SELECT count(*) FROM games WHERE status='final'").fetchone()[0], 70)
        self.assertEqual(db.execute('SELECT s.phase,s.period,s.seconds_remaining,s.home_score,s.away_score,s.overtime_period FROM game_state s JOIN games g ON g.id=s.game_id WHERE g.legacy_game_number=68').fetchone(), ('final', 5, 274, 9, 12, 1))
        self.assertEqual(db.execute("SELECT legacy_game_number,field_branding_key FROM games WHERE is_neutral_site=1").fetchall(), [(70, 'afl_championship')])
        ties = db.execute('SELECT count(*) FROM games g JOIN game_state s ON s.game_id=g.id WHERE g.status=\'final\' AND s.home_score=s.away_score').fetchone()[0]
        self.assertGreater(ties, 0)
        self.assertEqual(db.execute('SELECT count(*) FROM games WHERE kickoff_at_utc IS NOT NULL OR kickoff_timezone IS NOT NULL OR engine_version IS NOT NULL OR settings_version_id IS NOT NULL').fetchone()[0], 0)
        self.assertEqual(db.execute('SELECT count(*) FROM game_state WHERE last_play_id IS NOT NULL').fetchone()[0], 0)

    def test_missing_players_and_team_seasons_fail_without_partial_import(self):
        db = self.database(players=False)
        self.load(db, FILES[:1])
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'Player IDs missing'):
            helpers.execute_file(db, FILES[2])
        self.assertEqual(db.execute('SELECT count(*) FROM player_season_ratings').fetchone()[0], 0)
        db = self.database()
        self.load(db, FILES[:1])
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'team-season details'):
            helpers.execute_file(db, FILES[4])
        self.assertEqual(db.execute('SELECT count(*) FROM games').fetchone()[0], 0)
        self.assertEqual(db.execute('SELECT count(*) FROM game_state').fetchone()[0], 0)

    def test_modified_existing_records_are_not_overwritten(self):
        for index, table, mutation in [
            (0, 'seasons', "UPDATE seasons SET display_name='Changed'"),
            (1, 'team_seasons', "UPDATE team_seasons SET nickname='Changed' WHERE abbreviation='POR'"),
            (2, 'player_season_ratings', 'UPDATE player_season_ratings SET speed=1 WHERE rowid=1'),
            (3, 'player_team_assignments', 'UPDATE player_team_assignments SET team_id=NULL WHERE rowid=1'),
            (4, 'games', "UPDATE games SET network='Changed' WHERE legacy_game_number=1"),
            (4, 'game_state', 'UPDATE game_state SET home_score=999 WHERE rowid=1'),
        ]:
            with self.subTest(table=table):
                db = self.database()
                self.load(db)
                db.execute(mutation)
                db.commit()
                before = self.snapshot(db)
                with self.assertRaisesRegex(sqlite3.IntegrityError, 'different data'):
                    helpers.execute_file(db, FILES[index])
                self.assertEqual(before, self.snapshot(db))

    def test_overlapping_roster_rejected_before_new_assignments(self):
        db = self.database()
        self.load(db, FILES[:2])
        p = db.execute('SELECT id FROM players ORDER BY id LIMIT 1').fetchone()[0]
        db.execute("INSERT INTO player_team_assignments(id,season_id,player_id,team_id,effective_from) VALUES('existing',?,?,NULL,'2020-01-01')", (SEASON, p))
        db.commit()
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'natural key'):
            helpers.execute_file(db, FILES[3])
        self.assertEqual(db.execute('SELECT count(*) FROM player_team_assignments').fetchone()[0], 1)

    def test_games_and_scores_roll_back_together_on_late_failure(self):
        db = self.database()
        self.load(db, FILES[:2])
        # Simulate a failure after games have inserted, during final-score saves.
        db.execute("CREATE TRIGGER fail_final_state BEFORE INSERT ON game_state BEGIN SELECT RAISE(ROLLBACK,'test score failure'); END")
        db.commit()
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'test score failure'):
            helpers.execute_file(db, FILES[4])
        self.assertEqual(db.execute('SELECT count(*) FROM games').fetchone()[0], 0)
        self.assertEqual(db.execute('SELECT count(*) FROM game_state').fetchone()[0], 0)

if __name__ == '__main__':
    unittest.main()
