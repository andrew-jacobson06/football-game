"""Full ordered import regression tests; stdlib only, no workbook required.
python -m unittest discover -s docs/imports/remaining -p 'test_*.py' -v
"""
from pathlib import Path
import collections
import hashlib
import importlib.util
import json
import sqlite3
import tempfile
import unittest

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
META=json.loads((HERE/'preview.json').read_text(encoding='utf-8'))
spec=importlib.util.spec_from_file_location('core_import_helpers',ROOT/'docs/imports/core/test_imports.py')
helpers=importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)

def execute_text(db, sql):
    text=''
    for line in sql.splitlines(keepends=True):
        text+=line
        if sqlite3.complete_statement(text):
            db.execute(text).fetchall()
            text=''
    assert not text.strip()

class RemainingImportsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory=tempfile.TemporaryDirectory(prefix='football-full-import-')
        cls.filename=Path(cls.directory.name)/'football.sqlite'
        db=sqlite3.connect(cls.filename)
        db.execute('PRAGMA foreign_keys=ON')
        db.executescript(helpers.SCHEMA)
        db.execute("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,name TEXT NOT NULL,checksum TEXT NOT NULL,applied_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))) STRICT")
        checksum=hashlib.sha256(helpers.SCHEMA.replace('\r\n','\n').encode()).hexdigest()
        db.execute("INSERT INTO schema_migrations(version,name,checksum) VALUES(1,'0001_core.sql',?)",(checksum,))
        db.execute("INSERT INTO leagues(id,name) VALUES(?,'AFL')",(META['league_id'],))
        db.commit()
        player_sql=(ROOT/'docs/imports/import-107-players.sql').read_text(encoding='utf-8').replace('BEGIN IMMEDIATE;','').replace('COMMIT;','')
        execute_text(db,player_sql)
        db.commit()
        for folder in ['core','season','remaining']:
            for file in sorted((ROOT/'docs/imports'/folder).glob('[0-9][0-9]-*.sql')):
                helpers.execute_file(db,file)
                db.commit()
        db.close()

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def setUp(self):
        self.db=sqlite3.connect(self.filename)
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.execute('BEGIN')

    def tearDown(self):
        if self.db.in_transaction:self.db.rollback()
        self.db.close()

    def test_every_final_check_and_managed_checksum(self):
        result=self.db.execute((HERE/'24-verify-complete-import.sql').read_text(encoding='utf-8')).fetchall()
        self.assertGreater(len(result),50)
        self.assertEqual([r for r in result if r[3]!='OK'],[])
        migration=(ROOT/'apps/api/src/db/migrations/0002_league_domains.sql').read_text(encoding='utf-8').replace('\r\n','\n')
        self.assertEqual(self.db.execute('SELECT checksum FROM schema_migrations WHERE version=2').fetchone()[0],hashlib.sha256(migration.encode()).hexdigest())
        self.assertEqual(self.db.execute('PRAGMA user_version').fetchone()[0],2)

    def test_complete_sequence_reruns_inside_db_browser_transaction(self):
        before=self.db.execute('SELECT sum(home_score),sum(away_score),sum(version) FROM game_state').fetchone()
        for folder in ['season','remaining']:
            for file in sorted((ROOT/'docs/imports'/folder).glob('[0-9][0-9]-*.sql')):
                helpers.execute_file(self.db,file)
                self.assertTrue(self.db.in_transaction,file.name)
        self.assertEqual(before,self.db.execute('SELECT sum(home_score),sum(away_score),sum(version) FROM game_state').fetchone())
        self.assertEqual([r for r in self.db.execute((HERE/'24-verify-complete-import.sql').read_text(encoding='utf-8')) if r[3]!='OK'],[])

    def test_raw_details_and_unknown_clock_fields_survive(self):
        self.assertEqual(self.db.execute('SELECT count(*) FROM plays WHERE period_after IS NOT NULL OR seconds_after IS NOT NULL').fetchone()[0],0)
        self.assertEqual(self.db.execute('SELECT count(*) FROM play_details WHERE run_log_json IS NOT NULL').fetchone()[0],8689)
        self.assertEqual(self.db.execute('SELECT count(*) FROM play_details WHERE fatigue_recovery_json IS NOT NULL').fetchone()[0],9042)
        for original, in self.db.execute('SELECT original_payload_json FROM play_details LIMIT 20'):
            value=json.loads(original)
            self.assertIn('record',value)
            self.assertEqual(len(value['record']),42)
        self.assertEqual(self.db.execute("SELECT count(*) FROM players WHERE lower(display_name) IN ('home','away','na')").fetchone()[0],0)

    def test_stats_reconcile_to_event_stream_without_sack_attempts(self):
        raw=[(json.loads(r[0])['record']) for r in self.db.execute('SELECT original_payload_json FROM play_details')]
        passes=[r for r in raw if r['playtype']=='Pass' and not r['isSack']]
        completions=[r for r in passes if r['isComplete']]
        runs=[r for r in raw if r['playtype']=='Run' and not r['isSack']]
        sums=self.db.execute('SELECT sum(carries),sum(rushing_yards),sum(passing_attempts),sum(passing_completions),sum(passing_yards),sum(defensive_interceptions),sum(deflections),sum(sacks_taken) FROM player_game_stats').fetchone()
        self.assertEqual(sums,(len(runs),sum(r['yards'] for r in runs),len(passes),len(completions),sum(r['yards'] for r in completions),21,12,135))
        self.assertEqual(self.db.execute('SELECT sum(receptions),sum(receiving_yards) FROM player_game_stats').fetchone(),(2401,28213))
        self.assertEqual(self.db.execute('SELECT sum(rushing_attempts),sum(rushing_yards),sum(passing_attempts) FROM team_game_stats').fetchone(),(4767,20804,4098))
        # Kneels and spikes are recorded as team actors: do not invent individual QB stats.
        self.assertEqual(sum(r['playtype']=='Kneel' for r in raw),59)
        self.assertEqual(sum(r['playtype']=='Spike' for r in raw),4)
        self.assertEqual(self.db.execute('SELECT count(*) FROM player_game_stats WHERE fumble_return_yards IS NOT NULL OR interception_return_yards IS NOT NULL').fetchone()[0],0)
        self.assertEqual(self.db.execute('SELECT count(*) FROM team_game_stats WHERE possession_seconds IS NOT NULL OR extra_point_attempts IS NOT NULL').fetchone()[0],0)

    def test_defensive_yards_are_the_same_game_opponents_only(self):
        for game,team,opponent,rush,passing in self.db.execute('SELECT game_id,team_id,opponent_team_id,rushing_yards_allowed,passing_yards_allowed FROM team_game_statistics'):
            expected=self.db.execute('SELECT rushing_yards,passing_yards FROM team_game_stats WHERE game_id=? AND team_id=? AND opponent_team_id=?',(game,opponent,team)).fetchone()
            self.assertEqual((rush,passing),expected)
        total=self.db.execute("SELECT sum(rushing_yards),sum(rushing_yards_allowed),sum(passing_yards),sum(passing_yards_allowed) FROM team_season_stats WHERE scope='regular'").fetchone()
        self.assertEqual(total,(19427,19427,26206,26206))
        self.assertEqual(self.db.execute("SELECT min(games_played),max(games_played) FROM team_season_stats WHERE scope='regular'").fetchone(),(13,13))

    def test_fumble_corrections_keep_original_flags(self):
        fixes=json.loads((HERE/'turnover-reconciliation.json').read_text(encoding='utf-8'))
        self.assertEqual(len(fixes),6)
        for correction in fixes:
            current=self.db.execute('SELECT is_fumble,fumble_lost,is_turnover FROM plays WHERE id=?',(correction['play_id'],)).fetchone()
            self.assertEqual(current,(1,0,0))
            raw=json.loads(self.db.execute('SELECT original_payload_json FROM play_details WHERE play_id=?',(correction['play_id'],)).fetchone()[0])['record']
            self.assertEqual(raw['turnover'],'Yes')
            self.assertEqual(raw['player'],raw['recoveredby'])
        self.assertEqual(self.db.execute('SELECT count(*) FROM plays WHERE fumble_lost=1').fetchone()[0],9)
        self.assertEqual(self.db.execute("SELECT count(*) FROM plays WHERE turnover_type='downs'").fetchone()[0],68)

    def test_frozen_seeds_honors_and_not_started_votes(self):
        self.assertEqual(self.db.execute("SELECT d.name,s.seed,t.abbreviation FROM playoff_seedings s JOIN divisions d ON d.id=s.division_id JOIN team_seasons t ON t.team_id=s.team_id AND t.season_id=s.season_id ORDER BY d.name,s.seed").fetchall(),[('East',1,'NAS'),('East',2,'CLT'),('East',3,'RIC'),('West',1,'POR'),('West',2,'SAN'),('West',3,'SAC')])
        self.assertEqual(self.db.execute("SELECT count(*) FROM bracket_slots WHERE source_type='bye'").fetchone()[0],2)
        self.assertEqual(self.db.execute('SELECT status,completed_ballots FROM award_vote_runs').fetchall(),[('not_started',0)]*3)
        self.assertEqual(self.db.execute('SELECT count(*) FROM award_rankings').fetchone()[0],0)
        self.assertEqual(self.db.execute('SELECT count(*) FROM award_results').fetchone()[0],0)
        self.assertEqual(self.db.execute('SELECT count(*) FROM honor_selections').fetchone()[0],34)
        self.assertEqual(self.db.execute("SELECT group_concat(points,',') FROM (SELECT points FROM award_weights w JOIN award_definitions a ON a.id=w.award_id WHERE a.code='MVP' ORDER BY place)").fetchone()[0],'10.0,7.0,5.0,4.0,3.0,2.0,1.0,0.0')

    def test_complete_ballots_can_tie_without_alphabetical_winner(self):
        run,award=self.db.execute("SELECT r.id,r.award_id FROM award_vote_runs r JOIN award_definitions a ON a.id=r.award_id WHERE a.code='MVP'").fetchone()
        nominees=[r[0] for r in self.db.execute('SELECT id FROM award_nominations WHERE award_id=? ORDER BY nomination_order',(award,))]
        self.db.execute("UPDATE award_vote_runs SET status='running' WHERE id=?",(run,))
        for i in range(125):
            if i<120:shift=i%8;order=nominees[shift:]+nominees[:shift]
            else:shift=i-120;order=nominees[shift:5]+nominees[:shift]+nominees[5:]
            bid='test-ballot-'+str(i)
            self.db.execute('INSERT INTO award_ballots(id,vote_run_id,ballot_number) VALUES(?,?,?)',(bid,run,i+1))
            self.db.executemany('INSERT INTO ballot_rankings(ballot_id,place,nomination_id) VALUES(?,?,?)',[(bid,n+1,nominee) for n,nominee in enumerate(order)])
        self.db.execute("UPDATE award_vote_runs SET status='completed',completed_ballots=125 WHERE id=?",(run,))
        self.assertEqual(self.db.execute('SELECT count(*) FROM award_rankings WHERE rank=1').fetchone()[0],5)
        self.assertEqual(self.db.execute('SELECT count(*) FROM award_results').fetchone()[0],0)

    def test_routes_are_version_consistent_and_aliases_are_explicit(self):
        screen=self.db.execute("SELECT display_name,aliases_json FROM routes WHERE route_key='wr_screen'").fetchone()
        self.assertEqual(screen,('WR Screen','["Screen"]'))
        self.assertEqual(self.db.execute("SELECT min_air_yards,max_air_yards FROM route_depths WHERE depth_key='Quick'").fetchone(),(-3,0))
        self.assertEqual(self.db.execute("SELECT max_air_yards FROM route_depths WHERE depth_key='Bomb'").fetchone(),(None,))
        self.assertEqual(self.db.execute('SELECT count(*) FROM route_depth_eligibility').fetchone()[0],171)
        self.assertEqual(self.db.execute("SELECT status FROM settings_versions").fetchone()[0],'draft')

    def test_article_content_and_dormant_data_are_not_activated(self):
        self.assertEqual(self.db.execute('SELECT count(*) FROM articles').fetchone()[0],19)
        self.assertGreater(self.db.execute("SELECT length(markdown) FROM articles WHERE id='2026-mvp-rankings'").fetchone()[0],1000)
        self.assertEqual(self.db.execute('SELECT count(*) FROM coaches').fetchone()[0],20)
        board=json.loads(self.db.execute('SELECT board_json FROM draft_board_snapshots').fetchone()[0])
        self.assertEqual(board['source_range'],'Draft!A1:K38')
        self.assertEqual(len(board['cells']),38)
        for table in META['empty_by_design']:
            self.assertEqual(self.db.execute('SELECT count(*) FROM '+table).fetchone()[0],0,table)

    def test_modified_play_is_rejected_and_reverts_uncommitted_changes(self):
        pid=self.db.execute('SELECT id FROM plays LIMIT 1').fetchone()[0]
        before=self.db.execute('SELECT yards FROM plays WHERE id=?',(pid,)).fetchone()[0]
        self.db.execute('UPDATE plays SET yards=999 WHERE id=?',(pid,))
        with self.assertRaisesRegex(sqlite3.IntegrityError,'existing record differs'):
            helpers.execute_file(self.db,HERE/'12-official-plays.sql')
        self.assertFalse(self.db.in_transaction)
        self.assertEqual(self.db.execute('SELECT yards FROM plays WHERE id=?',(pid,)).fetchone()[0],before)

if __name__=='__main__':unittest.main()
