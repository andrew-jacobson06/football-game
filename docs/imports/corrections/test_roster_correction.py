"""Regression checks for the explicit user-reviewed Season 1 correction."""
from pathlib import Path
import hashlib
import sqlite3
import unittest

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
SQL=(HERE/'season-1-roster.sql').read_text(encoding='utf-8')
SEASON='97808f43-a0d5-5251-bf8d-fae1643c8258'
LEAGUE='36c6e53f-7be2-5a94-84a8-0df871aae9fd'

def execute(db,sql):
    statement=''
    output=[]
    for line in sql.splitlines(keepends=True):
        statement+=line
        if sqlite3.complete_statement(statement):
            output.append(db.execute(statement).fetchall())
            statement=''
    assert not statement.strip()
    return output

def expected():
    db=sqlite3.connect(':memory:')
    try:
        execute(db,SQL.split('CREATE TEMP TABLE afl_roster_guard')[0])
        return dict(db.execute('SELECT player_name,abbreviation FROM afl_roster_input'))
    finally:db.close()

class RosterCorrectionTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.addCleanup(self.db.close)
        self.db.execute('PRAGMA foreign_keys=ON')
        schema=(ROOT/'apps/api/src/db/migrations/0001_core.sql').read_text()
        self.db.executescript(schema)
        self.db.execute('CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,name TEXT,checksum TEXT,applied_at TEXT)')
        self.db.execute("INSERT INTO schema_migrations VALUES(1,'0001_core.sql',?,'test')",(hashlib.sha256(schema.encode()).hexdigest(),))
        self.db.execute("INSERT INTO leagues(id,name) VALUES(?,'AFL')",(LEAGUE,))
        self.db.commit()
        execute(self.db,(ROOT/'docs/imports/import-107-players.sql').read_text())
        for folder in ['core','season']:
            for file in sorted((ROOT/'docs/imports'/folder).glob('[0-9][0-9]-*.sql')):
                execute(self.db,file.read_text())
                self.db.commit()
        self.db.executescript((ROOT/'apps/api/src/db/migrations/0002_league_domains.sql').read_text())
        self.db.commit()

    def assignments(self):
        return self.db.execute('SELECT * FROM player_team_assignments ORDER BY id').fetchall()

    def roster(self):
        return dict(self.db.execute("""SELECT p.display_name,t.abbreviation FROM player_team_assignments a
          JOIN players p ON p.id=a.player_id LEFT JOIN team_seasons t ON t.season_id=a.season_id AND t.team_id=a.team_id
          WHERE a.season_id=? AND a.status='active' AND julianday(a.effective_from)<=julianday('now')
          AND (a.effective_until IS NULL OR julianday(a.effective_until)>julianday('now'))""",(SEASON,)))

    def test_all_107_exactly_match_reviewed_roster_and_repeat_is_noop(self):
        before_games=self.db.execute('SELECT * FROM games ORDER BY id').fetchall()
        old_ids=set(row[0] for row in self.assignments())
        execute(self.db,SQL)
        self.assertEqual(self.roster(),expected())
        self.assertEqual(sum(team is not None for team in self.roster().values()),89)
        self.assertEqual(sum(team is None for team in self.roster().values()),18)
        self.assertTrue(old_ids.issubset(row[0] for row in self.assignments()))
        self.assertEqual(before_games,self.db.execute('SELECT * FROM games ORDER BY id').fetchall())
        before=self.assignments()
        audit=self.db.execute('SELECT * FROM audit_log ORDER BY id').fetchall()
        execute(self.db,SQL)
        self.assertEqual(before,self.assignments())
        self.assertEqual(audit,self.db.execute('SELECT * FROM audit_log ORDER BY id').fetchall())
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(),[])

    def test_db_browser_outer_transaction_can_rollback_every_change(self):
        before=self.assignments()
        self.db.execute('BEGIN')
        execute(self.db,SQL)
        self.assertTrue(self.db.in_transaction)
        self.assertEqual(self.roster(),expected())
        self.db.rollback()
        self.assertEqual(self.assignments(),before)
        self.assertEqual(self.db.execute('SELECT count(*) FROM audit_log').fetchone()[0],0)

    def test_unknown_or_ambiguous_names_abort_before_any_roster_write(self):
        self.db.execute("UPDATE players SET display_name='Hippo missing' WHERE display_name='Hippo'")
        self.db.commit()
        before=self.assignments()
        with self.assertRaisesRegex(sqlite3.IntegrityError,'missing or ambiguous'):
            execute(self.db,SQL)
        self.assertEqual(before,self.assignments())

    def test_unknown_team_aborts_before_any_roster_write(self):
        self.db.execute("UPDATE team_seasons SET abbreviation='OTHER' WHERE abbreviation='POR'")
        self.db.commit()
        before=self.assignments()
        with self.assertRaisesRegex(sqlite3.IntegrityError,'team is missing or ambiguous'):
            execute(self.db,SQL)
        self.assertEqual(before,self.assignments())

    def test_missing_assignments_are_created_and_other_seasons_are_preserved(self):
        player=self.db.execute("SELECT id FROM players WHERE display_name='Hippo'").fetchone()[0]
        self.db.execute('DELETE FROM player_team_assignments WHERE player_id=?',(player,))
        self.db.execute("INSERT INTO seasons(id,league_id,season_number,display_name) VALUES('next',?,2,'Season 2')",(LEAGUE,))
        self.db.execute("INSERT INTO player_team_assignments(id,season_id,player_id,team_id,effective_from,status) VALUES('next-hippo','next',?,NULL,'2020-01-01','active')",(player,))
        self.db.commit()
        before=self.db.execute("SELECT * FROM player_team_assignments WHERE season_id='next'").fetchall()
        execute(self.db,SQL)
        self.assertEqual(self.roster(),expected())
        self.assertEqual(before,self.db.execute("SELECT * FROM player_team_assignments WHERE season_id='next'").fetchall())

if __name__=='__main__':unittest.main()
