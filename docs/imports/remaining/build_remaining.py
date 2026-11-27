"""Build reviewed snapshot artifacts. Requires openpyxl only for regeneration.
Usage: python docs/imports/remaining/build_remaining.py PATH_TO_WORKBOOK
Never connects to or writes a user's SQLite database.
"""
from pathlib import Path
import collections
import datetime
import hashlib
import json
import re
import sys
import uuid
import openpyxl

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SOURCE = Path(sys.argv[1])
CORE = json.loads((ROOT/'docs/imports/core/preview.json').read_text())
SEASON = json.loads((ROOT/'docs/imports/season/preview.json').read_text())
SHA = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
if SHA != CORE['source_sha256']:
    raise ValueError('Workbook differs from the reviewed 01-09 snapshot; reconcile before mixing imports.')
W = openpyxl.load_workbook(SOURCE, data_only=True, read_only=True)
F = openpyxl.load_workbook(SOURCE, data_only=False, read_only=True)
NS = uuid.uuid5(uuid.NAMESPACE_URL, 'https://github.com/andrew-jacobson06/football-game/import/initial-workbook')
def uid(value): return str(uuid.uuid5(NS, value))
def pack(value): return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)
def clean(value):
    if isinstance(value, (datetime.datetime, datetime.date)): return value.isoformat()
    return value

def rows(sheet):
    rr = list(W[sheet].iter_rows(values_only=True)); heads = rr[0]
    return [(n, {h:clean(r[i]) if i<len(r) else None for i,h in enumerate(heads)}, [clean(x) for x in r]) for n, r in enumerate(rr[1:], 2) if r and any(x is not None for x in r)]

LEAGUE = CORE['league_id']; SID = SEASON['season']['id']; VERSION = CORE['settings_version_id']
TEAMS = {r['abbreviation']:r for r in SEASON['team_seasons']}
BY_TEAM = {r['team_id']:r for r in TEAMS.values()}
GAMES = {g['legacy_game_number']:g for g in SEASON['games']}
PLAYERS = {d['Name'].strip():{'id':uid('player:'+d['Name'].strip().casefold()),'row':n,'source':d} for n,d,_ in rows('Players') if d.get('Name')}
assert len(PLAYERS)==107

def player(name):
    if name is None or str(name).strip().casefold() in ('', 'na', 'n/a', 'home', 'away'): return None
    if name not in PLAYERS: raise ValueError('Unresolved official player name: '+str(name))
    return PLAYERS[name]['id']

def q(value):
    if value is None: return 'NULL'
    if isinstance(value, bool): return str(int(value))
    if isinstance(value, (int,float)): return str(value)
    return "'"+str(value).replace("'", "''")+"'"

def chunks(items, size=250):
    for n in range(0,len(items),size): yield items[n:n+size]

def insert(table, columns, records, suffix=""):
    return ''.join('INSERT INTO '+table+' ('+', '.join(columns)+') VALUES\n'+',\n'.join('('+', '.join(q(row.get(c)) for c in columns)+')' for row in chunk)+suffix+';\n' for chunk in chunks(records))

# Dataset: table, records, key columns, source sheet, source row per record, natural-key SQL (or None).
CATALOG = []
RAW_CACHE = {}
def source_payload(sheet, n):
    if sheet not in W.sheetnames: return None
    if sheet not in RAW_CACHE: RAW_CACHE[sheet] = list(W[sheet].iter_rows(values_only=True))
    rr=RAW_CACHE[sheet]
    return pack({'source_sheet':sheet,'source_row':n,'cells':[clean(v) for v in rr[n-1]] if 0<n<=len(rr) else None})

def emit(number, name, datasets, requirements=(), note=''):
    stem=f'{number:02d}-{name}'; batch=uid('batch:'+SHA+':remaining-v1:'+stem); save=f'afl_remaining_{number}'
    sql=f'''-- {stem}. Reviewed uploaded workbook only; save pending edits and back up first.
-- Run ENTIRE file in DB Browser, verify counts, then Write Changes.
-- SAVEPOINT supports an existing transaction. No records are replaced.
-- {note or "Reviewed snapshot import."}
PRAGMA foreign_keys=ON;
SAVEPOINT {save};
'''
    stages=[];checks=[(f"NOT EXISTS(SELECT 1 FROM leagues WHERE id={q(LEAGUE)} AND name='AFL')",'Missing AFL league.'),(f"NOT EXISTS(SELECT 1 FROM seasons WHERE id={q(SID)} AND league_id={q(LEAGUE)})",'Import 05 season first.'),("NOT EXISTS(SELECT 1 FROM schema_migrations WHERE version=2)",'Apply schema upgrade 10 first.')]+list(requirements)
    for index,(table, records, keys, sheet, source_rows, natural) in enumerate(datasets):
        if not records: continue
        assert len(records)==len(source_rows)
        cols=list(records[0]); assert all(set(r)==set(cols) for r in records)
        assert len({tuple(r[k] for k in keys) for r in records})==len(records), table
        stage=f'{save}_{index}'; join=' AND '.join('t.'+k+'=i.'+k for k in keys)
        sql+=f'CREATE TEMP TABLE {stage} AS SELECT '+', '.join(cols)+f' FROM {table} WHERE 0;\n'+insert(stage, cols, records)
        differences=' OR '.join(f't.{c} IS NOT i.{c}' for c in cols if c not in keys)
        if differences: checks.append((f'EXISTS(SELECT 1 FROM {stage} i JOIN {table} t ON {join} WHERE {differences})',table+': existing record differs; no overwrite.'))
        if natural: checks.append((f'EXISTS(SELECT 1 FROM {stage} i JOIN {table} t ON {natural} WHERE NOT ({join}))',table+': natural key uses another ID.'))
        stages.append((table, records, keys, sheet, source_rows, cols, stage, join))
    guard=save+'_guard';trigger=save+'_check'
    sql+=f'CREATE TEMP TABLE {guard}(ok INTEGER);\nCREATE TEMP TRIGGER {trigger} BEFORE INSERT ON {guard}\nBEGIN\n'
    for condition,message in checks:sql+=f' SELECT CASE WHEN {condition} THEN RAISE(ROLLBACK,{q(message)}) END;\n'
    sql+=f'END;\nINSERT INTO {guard} VALUES(1);\n'
    for table,records,keys,sheet,source_rows,cols,stage,join in stages:
        sql+=f'INSERT INTO {table} ('+', '.join(cols)+') SELECT '+', '.join('i.'+c for c in cols)+f' FROM {stage} i WHERE NOT EXISTS(SELECT 1 FROM {table} t WHERE {join});\n'
    counts={t:len(r) for t,r,_,_,_,_ in datasets}
    batchrow={'id':batch,'source_filename':SOURCE.name,'source_sha256':SHA,'importer_version':'remaining-snapshot-v1-'+stem,'status':'imported','counts_json':pack(counts),'reconciliation_json':pack({'note':note,'source':'reviewed uploaded snapshot','policy':'insert only; identical reruns; no live provider switch'})}
    sql+=insert('import_batches',list(batchrow),[batchrow]).rstrip(';\n')+' ON CONFLICT(id) DO NOTHING;\n'
    # Source payloads for large play rows live once in play_details. Mappings point to them.
    mappings=[]
    for table,records,keys,sheet,source_rows,cols,stage,join in stages:
        for record,n in zip(records,source_rows):
            actual_sheet,actual_row = sheet(record,n) if callable(sheet) else (sheet,n)
            target='|'.join(str(record[k]) for k in keys)
            mappings.append({'id':uid('mapping:'+batch+':'+table+':'+target),'import_batch_id':batch,'source_sheet':actual_sheet,'source_row':actual_row,'source_legacy_key':target,'target_table':table,'target_id':target,'original_record_json':pack({'raw_source':'play_details.original_payload_json','source_row':n}) if actual_sheet=='PlayHistory' else source_payload(actual_sheet,actual_row)})
    if mappings:sql+=insert('source_record_mappings',list(mappings[0]),mappings,suffix=' ON CONFLICT(id) DO NOTHING')
    sql+=f'DROP TRIGGER {trigger};\nDROP TABLE {guard};\n'
    for *_,stage,join in stages:sql+=f'DROP TABLE {stage};\n'
    sql+=f'RELEASE SAVEPOINT {save};\nPRAGMA foreign_key_check;\n'
    sql+='\nUNION ALL\n'.join(f'SELECT {q(table)} AS imported_table,count(*) AS reviewed_records_present FROM {table} t WHERE EXISTS(SELECT 1 FROM source_record_mappings m WHERE m.import_batch_id={q(batch)} AND m.target_table={q(table)} AND m.target_id='+"||'|'||".join('CAST(t.'+k+' AS TEXT)' for k in keys)+')' for table,_,keys,_,_,_,_,_ in stages)+';\n'
    (OUT/(stem+'.sql')).write_text(sql,encoding='utf-8')
    CATALOG.append({'file':stem+'.sql','counts':counts,'note':note})

def ds(table, records, keys=('id',), sheet='Settings', source_rows=None, natural=None):
    return (table,records,list(keys),sheet,source_rows or list(range(1,len(records)+1)),natural)

def flag(v):
    if v is None or v=='':return None
    if v is True or str(v).casefold() in ('true','yes','1'):return 1
    if v is False or str(v).casefold() in ('false','no','0'):return 0
    raise ValueError('Unknown flag '+str(v))

# 11: exact canonical aliases and the global UI preference. No fuzzy name merges.
aliases=[{'id':uid('alias:'+p['id']),'player_id':p['id'],'alias':name,'normalized_alias':name.casefold(),'source':'Players.Name exact initial identity; casefold only'} for name,p in PLAYERS.items()]
prefs=[{'key':d['Variable'],'value_json':pack(d['Value'])} for _,d,_ in rows('GamePlaySettings') if d.get('Variable')]
emit(11,'aliases-and-preferences',[ds('player_aliases',aliases,sheet='Players',source_rows=[p['row'] for p in PLAYERS.values()],natural='t.player_id=i.player_id AND t.normalized_alias=i.normalized_alias'),ds('app_preferences',prefs,('key',),'GamePlaySettings',natural='t.key=i.key')])

# 12-15: immutable official event stream and details. Actors use the teams recorded on each play.
plays=[]; details=[]; participants=[]; matchups=[];seq=collections.Counter(); raw_by_id={}; row_by_id={}; by_game={}; corrections=[]; evidence=collections.defaultdict(list)
for row, d, cells in rows('PlayHistory'):
    if not d.get('playid'):continue
    num=int(d['gameid']);g=GAMES[num];gid=uid('game:1:'+str(num));pid=d['playid'];seq[num]+=1;assert pid not in raw_by_id
    raw_by_id[pid]=d;row_by_id[pid]=row;by_game[num]=pid
    offense=TEAMS[g['home'] if d['possession']=='Home' else g['away']]['team_id']; defense=TEAMS[g['away'] if d['possession']=='Home' else g['home']]['team_id']
    sack=flag(d['isSack']);complete=flag(d['isComplete']);fumble=int(d['result']=='Fumble' or d['defenseresult']=='Fumble');interception=int(d['result']=='Interception' or d['defenseresult']=='Interception')
    carrier=d['receiver'] if d['playtype']=='Pass' and complete else d['player']
    recovery_team=None
    if fumble and d.get('recoveredby'):
        recovery_team=offense if d['recoveredby']==carrier else defense
    lost=int(recovery_team==defense) if fumble and recovery_team else None
    turnover_type='interception' if interception else 'fumble' if lost else 'downs' if d['result']=='TO on Downs' else None
    actual_turnover=int(turnover_type is not None)
    if flag(d['turnover']) is not None and flag(d['turnover'])!=actual_turnover:corrections.append({'play_id':pid,'source_row':row,'source_turnover':d['turnover'],'canonical_turnover':actual_turnover,'reason':'Recovery by the recorded carrier retains possession; or explicit turnover-on-downs result.'})
    plays.append({'id':pid,'game_id':gid,'sequence':seq[num],'period_before':int(d['qtr']),'seconds_before':d['time'],'period_after':None,'seconds_after':None,'offense_team_id':offense,'defense_team_id':defense,'down_before':int(d['down']),'distance_before':d['distance'],'ball_before':d['ballon'],'down_after':int(d['newdown']),'distance_after':d['newdist'],'ball_after':d['newballon'],'drive_start':d['drivestart'],'play_type':d['playtype'],'yards':d['yards'],'air_yards':d['airyards'],'yac':d['YAC'],'result':d['result'],'defense_result':d['defenseresult'],'is_complete':complete,'is_sack':sack,'is_first_down':int(d['result'] in ('First Down','Touchdown')),'is_touchdown':int(d['result']=='Touchdown'),'is_safety':int(d['result']=='Safety'),'is_fumble':fumble,'fumble_lost':lost,'is_turnover':actual_turnover,'turnover_type':turnover_type,'home_score_after':int(d['homescore']),'away_score_after':int(d['awayscore']),'description_raw':d['description']})
    def parsed(k):
        value=d.get(k)
        if value is None or value=='':return None
        return pack(json.loads(value))
    details.append({'play_id':pid,'defense_predicted':d['defensepredicted'],'prediction_correct':flag(d['predictioncorrect']),'ol_wins':d['olWins'],'ol_losses':d['olLosses'],'dl_wins':d['dlWins'],'dl_losses':d['dlLosses'],'jukes':d['jukes'],'trucks':d['trucks'],'broken_tackles':d['brokentackles'],'stop_reason':d['stopReason'],'run_log_json':parsed('runlog'),'fatigue_recovery_json':parsed('fatigueRecovery'),'animation_json':None,'resolution_audit_json':pack({'after_clock':'unknown, not inferred from next snap','turnover_raw':d['turnover'],'turnover_canonical':actual_turnover,'fumble_recovery_policy':'same recorded carrier = offense; other recoverer = defense in this reviewed snapshot','historical_roster':'team per play role; never PlayerTeams','random_rolls':'only source runlog retained; no invented draws'}),'original_payload_json':pack({'source_row':row,'record':d})})
    def participate(name,role,team,slot=None):
        pl=player(name)
        if pl is None and name not in ('Home','Away'):return
        part={'id':uid('participant:'+pid+':'+role+':'+str(pl)+':'+team),'play_id':pid,'player_id':pl,'team_id':team,'role':role,'position_slot':slot,'participation_source':'PlayHistory named role; team from recorded possession'}
        participants.append(part)
        if pl:evidence[pl].append((num,team,role))
    participate(d['player'],'passer' if d['playtype']=='Pass' else 'runner' if d['playtype']=='Run' else 'team_actor',offense)
    if d.get('receiver'):participate(d['receiver'],'target',offense)
    if player(d.get('tackler')):participate(d['tackler'],'interceptor' if interception else 'deflector' if d['defenseresult']=='Deflection' else 'tackler',defense)
    if player(d.get('recoveredby')):
        if interception:participate(d['recoveredby'],'interceptor',defense)
        elif fumble:participate(d['recoveredby'],'recoverer',recovery_team)
    if player(d.get('leadblocker')):participate(d['leadblocker'],'lead_blocker',offense)
    for n,m in enumerate(json.loads(d['lineMatchups']) if d.get('lineMatchups') else []):
        op=player(m.get('offensePlayer')); dp=player(m.get('defensePlayer')); assert m['winner'] in ('OL','DL')
        matchups.append({'id':uid('matchup:'+pid+':'+str(n)),'play_id':pid,'matchup_number':n,'offense_player_id':op,'defense_player_id':dp,'offense_team_id':offense,'defense_team_id':defense,'offense_slot':m.get('slot'),'defense_slot':None,'winner_side':m['winner'],'detail_json':pack(m)})
        if op:evidence[op].append((num,offense,'blocker'))
        if dp:evidence[dp].append((num,defense,'line_defender'))
# An interception may name the same DB in tackler and recoveredby: one role record.
participants=list({p['id']:p for p in participants}.values())
assert len(plays)==9575 and len(matchups)==32343
assert all(g in by_game for g in GAMES)
reqplays=[(f"(SELECT count(*) FROM games WHERE season_id={q(SID)} AND status='final')<>70",'Import all final games (09) first.'),(f"(SELECT count(*) FROM players WHERE league_id={q(LEAGUE)})<107",'Import player identities first.')]
emit(12,'official-plays',[ds('plays',plays,sheet='PlayHistory',source_rows=[row_by_id[p['id']] for p in plays],natural='t.game_id=i.game_id AND t.sequence=i.sequence')],reqplays,'9575 official plays; OLDPlayHistory excluded; original play IDs unchanged.')
req=[(f"(SELECT count(*) FROM plays WHERE game_id IN (SELECT id FROM games WHERE season_id={q(SID)}))<>9575",'Import all official plays (12) first.')]
emit(13,'play-details',[ds('play_details',details,('play_id',),'PlayHistory',[row_by_id[p['play_id']] for p in details])],req,'Raw payloads, logs and fatigue recovery retained; unknown historical animation/clock stays NULL.')
emit(14,'play-participants',[ds('play_participants',participants,sheet='PlayHistory',source_rows=[row_by_id[p['play_id']] for p in participants],natural="t.play_id=i.play_id AND t.player_id IS i.player_id AND t.team_id=i.team_id AND t.role=i.role")],req,'No Home/Away/NA fake players; participant teams come from play roles.')
emit(15,'line-matchups',[ds('play_line_matchups',matchups,sheet='PlayHistory',source_rows=[row_by_id[p['play_id']] for p in matchups],natural='t.play_id=i.play_id AND t.matchup_number=i.matchup_number')],req,'Structured source line winners, unchanged.')

# 16: pin known final play IDs without changing the archived game's clocks, version or scores.
links=[{'game_id':uid('game:1:'+str(n)),'last_play_id':p} for n,p in by_game.items()]
sql='''-- Run entire file, then Write Changes. Only fills known last-play links on archived final states.
PRAGMA foreign_keys=ON;
SAVEPOINT afl_remaining_16;
CREATE TEMP TABLE afl_final_links(game_id TEXT PRIMARY KEY,last_play_id TEXT NOT NULL);
'''+insert('afl_final_links',['game_id','last_play_id'],links)+'''
CREATE TEMP TABLE afl_links_guard(ok INTEGER);
CREATE TEMP TRIGGER afl_links_check BEFORE INSERT ON afl_links_guard BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM afl_final_links i LEFT JOIN game_state s ON s.game_id=i.game_id LEFT JOIN plays p ON p.id=i.last_play_id AND p.game_id=i.game_id
 WHERE s.game_id IS NULL OR s.phase<>'final' OR p.id IS NULL OR (s.last_play_id IS NOT NULL AND s.last_play_id<>i.last_play_id))
 THEN RAISE(ROLLBACK,'Missing or conflicting final state/play links') END;
END;
INSERT INTO afl_links_guard VALUES(1);
UPDATE game_state SET last_play_id=(SELECT last_play_id FROM afl_final_links WHERE game_id=game_state.game_id)
WHERE last_play_id IS NULL AND game_id IN (SELECT game_id FROM afl_final_links);
DROP TRIGGER afl_links_check;
DROP TABLE afl_links_guard;
DROP TABLE afl_final_links;
RELEASE SAVEPOINT afl_remaining_16;
'''+f"SELECT count(*) AS linked_final_games FROM game_state s JOIN games g ON g.id=s.game_id WHERE g.season_id={q(SID)} AND s.last_play_id IS NOT NULL;\n"
(OUT/'16-final-play-links.sql').write_text(sql);CATALOG.append({'file':'16-final-play-links.sql','counts':{'final_play_links':70},'note':'No runtime energy/fatigue state invented.'})

# Later files are appended below.
# 17: auditable, rebuildable stat deltas generated from the normalized event stream.
# No season totals are assigned to each opponent: defensive yardage uses same-game joins.
metric_sources=[]
def metric(name,amount,join='',where='1',actor='a.player_id',team='a.team_id'):
    metric_sources.append(f"SELECT p.id AS play_id,{actor} AS player_id,{team} AS team_id,{q(name)} AS metric_key,({amount}) AS amount FROM plays p {join} WHERE p.game_id IN (SELECT id FROM games WHERE season_id={q(SID)}) AND ({where})")
runner="JOIN play_participants a ON a.play_id=p.id AND a.role='runner' AND a.player_id IS NOT NULL"
passer="JOIN play_participants a ON a.play_id=p.id AND a.role='passer' AND a.player_id IS NOT NULL"
target="JOIN play_participants a ON a.play_id=p.id AND a.role='target' AND a.player_id IS NOT NULL"
for name,amount,where in [('carries','1',"p.play_type='Run' AND coalesce(p.is_sack,0)=0"),('rushing_yards','p.yards',"p.play_type='Run' AND coalesce(p.is_sack,0)=0"),('longest_rush','p.yards',"p.play_type='Run' AND coalesce(p.is_sack,0)=0"),('rushing_touchdowns','1',"p.is_touchdown=1 AND p.play_type='Run'"),('rushing_first_downs','1',"p.is_first_down=1 AND p.play_type='Run'"),('negative_rushes','1',"p.yards<0 AND p.play_type='Run' AND coalesce(p.is_sack,0)=0"),('rushing_fumbles','1',"p.is_fumble=1 AND p.play_type='Run'"),('rushing_fumbles_lost','1',"p.fumble_lost=1 AND p.play_type='Run'")]:metric(name,amount,runner,where)
for mark in [5,10,20,30,50]:metric('rushes_'+str(mark)+'_plus','1',runner,f"p.play_type='Run' AND coalesce(p.is_sack,0)=0 AND p.yards>={mark}")
for name,amount,where in [('passing_attempts','1',"p.play_type='Pass' AND coalesce(p.is_sack,0)=0"),('passing_completions','1',"p.play_type='Pass' AND p.is_complete=1 AND coalesce(p.is_sack,0)=0"),('passing_yards','p.yards',"p.play_type='Pass' AND p.is_complete=1 AND coalesce(p.is_sack,0)=0"),('longest_pass','p.yards',"p.play_type='Pass' AND p.is_complete=1 AND coalesce(p.is_sack,0)=0"),('passing_touchdowns','1',"p.play_type='Pass' AND p.is_complete=1 AND p.is_touchdown=1"),('interceptions_thrown','1',"p.turnover_type='interception'"),('sacks_taken','1',"p.is_sack=1"),('sack_yards_lost','max(-p.yards,0)',"p.is_sack=1")]:metric(name,amount,passer,where)
for name,amount,where in [('targets','1',"p.play_type='Pass' AND coalesce(p.is_sack,0)=0"),('receptions','1',"p.is_complete=1 AND coalesce(p.is_sack,0)=0"),('receiving_yards','p.yards',"p.is_complete=1 AND coalesce(p.is_sack,0)=0"),('longest_reception','p.yards',"p.is_complete=1 AND coalesce(p.is_sack,0)=0"),('receptions_20_plus','1',"p.is_complete=1 AND p.yards>=20"),('receiving_touchdowns','1',"p.is_complete=1 AND p.is_touchdown=1"),('receiving_first_downs','1',"p.is_complete=1 AND p.is_first_down=1"),('receiving_fumbles','1',"p.is_complete=1 AND p.is_fumble=1"),('receiving_fumbles_lost','1',"p.is_complete=1 AND p.fumble_lost=1"),('yac','p.yac',"p.is_complete=1 AND p.yac IS NOT NULL")]:metric(name,amount,target,where)
for name,amount,where in [('tackles','1','1'),('tackles_for_loss','1',"p.yards<0 OR p.is_sack=1 OR p.defense_result='TFL'"),('defensive_sacks','1','p.is_sack=1'),('forced_fumbles','1','p.is_fumble=1')]:metric(name,amount,"JOIN play_participants a ON a.play_id=p.id AND a.role='tackler' AND a.player_id IS NOT NULL",where)
for role,m in [('interceptor','defensive_interceptions'),('deflector','deflections'),('recoverer','fumble_recoveries'),('lead_blocker','lead_blocks')]:metric(m,'1',f"JOIN play_participants a ON a.play_id=p.id AND a.role={q(role)} AND a.player_id IS NOT NULL")
for side,pl,teamcol in [('ol','offense_player_id','offense_team_id'),('dl','defense_player_id','defense_team_id')]:
    for suffix,winner in [('wins','OL' if side=='ol' else 'DL'),('losses','DL' if side=='ol' else 'OL')]:
        metric(side+'_'+suffix,'1','JOIN play_line_matchups m ON m.play_id=p.id',f'm.{pl} IS NOT NULL AND m.winner_side={q(winner)}',actor='m.'+pl,team='m.'+teamcol)
for m,col in [('jukes','jukes'),('broken_tackles','broken_tackles')]:
    metric(m,'d.'+col,"JOIN play_details d ON d.play_id=p.id JOIN play_participants a ON a.play_id=p.id AND ((a.role='runner' AND p.play_type='Run') OR (a.role='target' AND p.is_complete=1))",f'a.player_id IS NOT NULL AND d.{col} IS NOT NULL AND d.{col}>0')
metric('safeties_forced','1',"JOIN play_participants a ON a.play_id=p.id AND a.role='tackler' AND a.player_id IS NOT NULL",'p.is_safety=1')
# Include team-only kneel/spike facts without guessing a quarterback's identity.
for m,amount,where in [('carries','1',"p.play_type='Kneel'"),('rushing_yards','p.yards',"p.play_type='Kneel'"),('passing_attempts','1',"p.play_type='Spike'")]:metric(m,amount,where=where,actor='NULL',team='p.offense_team_id')
# Explicit metric columns are derived from the checked-in schema, not guessed at import time.
schema=(ROOT/'apps/api/src/db/migrations/0002_league_domains.sql').read_text()
metriccols=re.search(r'CREATE TABLE IF NOT EXISTS player_game_stats \((.*?)\n\) STRICT;',schema,re.S).group(1)
metriccols=re.findall(r'^ (\w+) REAL,',metriccols,re.M)
unknown={'fumble_return_yards','fumble_return_touchdowns','interception_return_yards','interception_return_touchdowns'}
known={re.search(r"'([^']+)' AS metric_key",s).group(1) for s in metric_sources}
unknown |= set(metriccols)-known
agg=[]
for m in metriccols:
    if m in unknown:expr='NULL'
    elif m.startswith('longest_'):expr=f"max(CASE WHEN d.metric_key={q(m)} THEN d.amount END)"
    else:expr=f"coalesce(sum(CASE WHEN d.metric_key={q(m)} THEN d.amount ELSE 0 END),0)"
    agg.append(expr+' AS '+m)
stat_sql=f'''-- 17: derived statistics, history-v1. Run entire file; Write Changes after success.
-- Counts with no historical evidence (returns, exact possession time, conversions) stay NULL.
PRAGMA foreign_keys=ON;
SAVEPOINT afl_remaining_17;
CREATE TEMP TABLE afl_stats_guard(ok INTEGER);
CREATE TEMP TRIGGER afl_stats_prerequisites BEFORE INSERT ON afl_stats_guard BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM plays WHERE game_id IN (SELECT id FROM games WHERE season_id={q(SID)}))<>9575 OR
 (SELECT count(*) FROM play_details WHERE play_id IN (SELECT id FROM plays WHERE game_id IN (SELECT id FROM games WHERE season_id={q(SID)})))<>9575 OR
 (SELECT count(*) FROM play_line_matchups WHERE play_id IN (SELECT id FROM plays WHERE game_id IN (SELECT id FROM games WHERE season_id={q(SID)})))<>32343
 THEN RAISE(ROLLBACK,'Import complete plays and line matchups (12-15) first') END;
 SELECT CASE WHEN (SELECT count(*) FROM play_participants WHERE play_id IN (SELECT id FROM plays WHERE game_id IN (SELECT id FROM games WHERE season_id={q(SID)})))<>{len(participants)}
 THEN RAISE(ROLLBACK,'Import complete participants (14) first') END;
END;
INSERT INTO afl_stats_guard VALUES(1);
CREATE TEMP TABLE afl_delta_input AS
'''+ '\nUNION ALL\n'.join(metric_sources)+''';
CREATE TEMP TABLE afl_expected_deltas AS
SELECT play_id||'|'||coalesce(player_id,'TEAM')||'|'||team_id||'|'||metric_key AS id,
 play_id,player_id,team_id,metric_key,sum(amount) AS amount,'history-v1' AS calculation_version
FROM afl_delta_input GROUP BY play_id,player_id,team_id,metric_key;
CREATE TEMP TABLE afl_observed_players AS
SELECT DISTINCT p.game_id,a.player_id,a.team_id FROM play_participants a JOIN plays p ON p.id=a.play_id WHERE a.player_id IS NOT NULL
UNION SELECT DISTINCT p.game_id,m.offense_player_id,m.offense_team_id FROM play_line_matchups m JOIN plays p ON p.id=m.play_id WHERE m.offense_player_id IS NOT NULL
UNION SELECT DISTINCT p.game_id,m.defense_player_id,m.defense_team_id FROM play_line_matchups m JOIN plays p ON p.id=m.play_id WHERE m.defense_player_id IS NOT NULL;
'''+f'''CREATE TEMP TABLE afl_expected_player_stats AS
SELECT o.game_id,o.player_id,o.team_id,{','.join(agg)},1 AS participation_verified,
 {q(pack({'supported':sorted(known),'unknown':sorted(unknown),'participation':'observed event/line roles only; not a reconstructed full-game roster','spikes_and_kneels':'team-only if no QB identity recorded','version':'history-v1'}))} AS metric_availability_json,
 'history-v1' AS calculation_version,s.version AS source_game_version
FROM afl_observed_players o JOIN games g ON g.id=o.game_id JOIN game_state s ON s.game_id=g.id
LEFT JOIN plays p ON p.game_id=o.game_id
LEFT JOIN afl_expected_deltas d ON d.play_id=p.id AND d.player_id=o.player_id AND d.team_id=o.team_id
WHERE g.season_id={q(SID)} GROUP BY o.game_id,o.player_id,o.team_id,s.version;
'''
# Team totals are computed from their own plays and the same game's opponent.
team_expr={
'plays':"sum(p.play_type IN ('Run','Pass','Kneel','Spike'))",'drives':'NULL','first_downs':'sum(coalesce(p.is_first_down,0))',
'rushing_attempts':"sum(p.play_type IN ('Run','Kneel') AND coalesce(p.is_sack,0)=0)",'rushing_yards':"sum(CASE WHEN p.play_type IN ('Run','Kneel') AND coalesce(p.is_sack,0)=0 THEN p.yards ELSE 0 END)",'rushing_touchdowns':"sum(p.play_type='Run' AND p.is_touchdown=1)",
'passing_attempts':"sum(p.play_type IN ('Pass','Spike') AND coalesce(p.is_sack,0)=0)",'passing_completions':"sum(p.play_type='Pass' AND p.is_complete=1 AND coalesce(p.is_sack,0)=0)",'passing_yards':"sum(CASE WHEN p.play_type='Pass' AND p.is_complete=1 AND coalesce(p.is_sack,0)=0 THEN p.yards ELSE 0 END)",'passing_touchdowns':"sum(p.play_type='Pass' AND p.is_complete=1 AND p.is_touchdown=1)",
'sacks_taken':'sum(coalesce(p.is_sack,0))','sack_yards_lost':'sum(CASE WHEN p.is_sack=1 THEN max(-p.yards,0) ELSE 0 END)','interceptions_thrown':"sum(coalesce(p.turnover_type='interception',0))",'fumbles':'sum(coalesce(p.is_fumble,0))','fumbles_lost':'sum(coalesce(p.fumble_lost,0))','offensive_yac':'sum(CASE WHEN p.is_complete=1 THEN coalesce(p.yac,0) ELSE 0 END)',
'defensive_sacks':"(SELECT sum(coalesce(x.is_sack,0)) FROM plays x WHERE x.game_id=r.game_id AND x.defense_team_id=r.team_id)",'tackles':"(SELECT count(*) FROM play_participants a JOIN plays x ON x.id=a.play_id WHERE x.game_id=r.game_id AND a.team_id=r.team_id AND a.role='tackler')",'tackles_for_loss':"(SELECT count(*) FROM play_participants a JOIN plays x ON x.id=a.play_id WHERE x.game_id=r.game_id AND a.team_id=r.team_id AND a.role='tackler' AND (x.yards<0 OR x.is_sack=1 OR x.defense_result='TFL'))",'interceptions_made':"(SELECT count(*) FROM plays x WHERE x.game_id=r.game_id AND x.defense_team_id=r.team_id AND x.turnover_type='interception')",'fumbles_recovered':"(SELECT count(*) FROM plays x WHERE x.game_id=r.game_id AND x.defense_team_id=r.team_id AND x.fumble_lost=1)",'deflections':"(SELECT count(*) FROM play_participants a JOIN plays x ON x.id=a.play_id WHERE x.game_id=r.game_id AND a.team_id=r.team_id AND a.role='deflector')",'safeties_forced':"(SELECT count(*) FROM plays x WHERE x.game_id=r.game_id AND x.defense_team_id=r.team_id AND x.is_safety=1)",
'field_goal_attempts':"sum(p.play_type='Field Goal')",'field_goals_made':"sum(p.play_type='Field Goal' AND p.result='Kick FG')",'extra_point_attempts':'NULL','extra_points_made':'NULL','two_point_attempts':'NULL','two_points_made':'NULL','punts':"sum(p.play_type='Punt')",'possession_seconds':'NULL'}
stat_sql+='CREATE TEMP TABLE afl_expected_team_stats AS\nSELECT r.game_id,r.team_id,r.opponent_team_id,'+',\n'.join(f'{v} AS {k}' for k,v in team_expr.items())+f''',
 {q(pack({'unknown':['drives','possession_seconds','extra_point_attempts','extra_points_made','two_point_attempts','two_points_made'],'team_rushing':'Run + Kneel, excluding sacks','team_attempts':'Pass + Spike, excluding sacks','yardage':'gross passing; sacks stored separately; views expose gross and net','version':'history-v1'}))} AS metric_availability_json,
 'history-v1' AS calculation_version,s.version AS source_game_version
FROM team_game_results r JOIN game_state s ON s.game_id=r.game_id LEFT JOIN plays p ON p.game_id=r.game_id AND p.offense_team_id=r.team_id
WHERE r.season_id={q(SID)} GROUP BY r.game_id,r.team_id,r.opponent_team_id,s.version;
'''
# Use the real table column lists for guarded, insert-only saves; generated timestamps are not compared.
targets=[('play_stat_deltas','afl_expected_deltas',['id']),('player_game_stats','afl_expected_player_stats',['game_id','player_id','team_id']),('team_game_stats','afl_expected_team_stats',['game_id','team_id'])]
columns={'play_stat_deltas':['id','play_id','player_id','team_id','metric_key','amount','calculation_version'], 'player_game_stats':['game_id','player_id','team_id']+metriccols+['participation_verified','metric_availability_json','calculation_version','source_game_version'],'team_game_stats':['game_id','team_id','opponent_team_id']+list(team_expr)+['metric_availability_json','calculation_version','source_game_version']}
stat_sql+='CREATE TEMP TRIGGER afl_stats_conflicts BEFORE INSERT ON afl_stats_guard BEGIN\n'
for table,stage,keys in targets:
    join=' AND '.join(f't.{k}=i.{k}' for k in keys);diff=' OR '.join(f't.{c} IS NOT i.{c}' for c in columns[table] if c not in keys)
    stat_sql+=f" SELECT CASE WHEN EXISTS(SELECT 1 FROM {stage} i JOIN {table} t ON {join} WHERE {diff}) THEN RAISE(ROLLBACK,'{table}: existing computed stats differ; reconcile before rebuild') END;\n"
stat_sql+='END;\nINSERT INTO afl_stats_guard VALUES(2);\n'
for table,stage,keys in targets:
    join=' AND '.join(f't.{k}=i.{k}' for k in keys)
    stat_sql+=f'INSERT INTO {table} ('+', '.join(columns[table])+') SELECT '+', '.join('i.'+c for c in columns[table])+f' FROM {stage} i WHERE NOT EXISTS(SELECT 1 FROM {table} t WHERE {join});\n'
batch17=uid('batch:'+SHA+':remaining-v1:17-derived-statistics')
stat_sql+=f"INSERT INTO import_batches(id,source_filename,source_sha256,importer_version,status,counts_json,reconciliation_json,imported_at) SELECT {q(batch17)},{q(SOURCE.name)},{q(SHA)},'remaining-snapshot-v1-17-derived-statistics','imported',json_object('play_stat_deltas',(SELECT count(*) FROM afl_expected_deltas),'player_game_stats',(SELECT count(*) FROM afl_expected_player_stats),'team_game_stats',(SELECT count(*) FROM afl_expected_team_stats)),{q(pack({'policy':'history-v1; structured roles and line JSON; unknowns NULL; no PlayerTeams historical attribution'}))},strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE NOT EXISTS(SELECT 1 FROM import_batches WHERE id={q(batch17)});\n"
for name in ['afl_stats_prerequisites','afl_stats_conflicts']:stat_sql+='DROP TRIGGER '+name+';\n'
for name in ['afl_stats_guard','afl_delta_input','afl_expected_deltas','afl_observed_players','afl_expected_player_stats','afl_expected_team_stats']:stat_sql+='DROP TABLE '+name+';\n'
stat_sql+='RELEASE SAVEPOINT afl_remaining_17;\nPRAGMA foreign_key_check;\n'+f"SELECT 'player_game_stats' AS imported_table,count(*) AS records FROM player_game_stats WHERE game_id IN(SELECT id FROM games WHERE season_id={q(SID)}) UNION ALL SELECT 'team_game_stats',count(*) FROM team_game_stats WHERE game_id IN(SELECT id FROM games WHERE season_id={q(SID)});\n"
(OUT/'17-derived-statistics.sql').write_text(stat_sql);CATALOG.append({'file':'17-derived-statistics.sql','counts':{'team_game_stats':140,'player_game_stats':'derived from recorded participation','play_stat_deltas':'derived metric events'},'note':'Returns, conversions, drive/possession time unknown; same-game defensive yardage.'})
# 18: worksheet baselines remain separate from corrected official-game snapshots.
snapshots=[]; snapshot_rows=[]
for sheet,entity in [('PlayerStats','player'),('Standings','team')]:
    rr=list(W[sheet].iter_rows(values_only=True));ff=list(F[sheet].iter_rows(values_only=True));heads=rr[0]
    for row,r in enumerate(rr[1:],2):
        if not r or not r[0]:continue
        if entity=='player' and r[0] not in PLAYERS:raise ValueError('Unknown stats player '+str(r[0]))
        if entity=='team' and r[0] not in TEAMS:raise ValueError('Unknown standings team '+str(r[0]))
        pid=player(r[0]) if entity=='player' else None;tid=TEAMS[r[0]]['team_id'] if entity=='team' else None
        columns=[{'column_number':i+1,'label':heads[i] if i<len(heads) else None,'value':clean(v),'formula':ff[row-1][i] if row-1<len(ff) and i<len(ff[row-1]) and isinstance(ff[row-1][i],str) and ff[row-1][i].startswith('=') else None} for i,v in enumerate(r[:49 if entity=='player' else 17])]
        snapshots.append({'id':uid('source-baseline:1:'+sheet+':'+str(r[0])),'season_id':SID,'scope':'worksheet_mixed','entity_type':entity,'player_id':pid,'team_id':tid,'source_kind':'workbook_cached','calculation_version':None,'totals_json':pack({'sheet':sheet,'source_row':row,'columns':columns,'warning':'Comparison baseline only: worksheet formulas have known scope/metric issues; never add these totals to rebuilt stats.'}),'source_import_batch_id':None});snapshot_rows.append(row)
assert len(snapshots)==117
standing=[];standing_rows=[]
scopes={'regular':[],'postseason':[],'combined':[]}
for g in SEASON['games']:
    for scope in ['combined','postseason' if isinstance(g['week'],str) else 'regular']:scopes[scope].append(g)
statnum=['wins','losses','ties','home_wins','home_losses','home_ties','away_wins','away_losses','away_ties','division_wins','division_losses','division_ties','points_for','points_against']
for scope,gs in scopes.items():
    grouped=collections.defaultdict(list)
    for g in gs:
        for side,op in [('home','away'),('away','home')]:grouped[g[side]].append((g,side,op))
    for abbr,entries in grouped.items():
        t=TEAMS[abbr];rec={'id':uid('standing:1:'+scope+':'+abbr),'season_id':SID,'team_id':t['team_id'],'division_id':t['division_id'],'scope':scope,'source_kind':'official_games', 'rank':None,**{k:0 for k in statnum}}
        outcomes=[]
        for g,side,op in sorted(entries,key=lambda x:x[0]['legacy_game_number']):
            pf=g[side+'_score'];pa=g[op+'_score'];out='wins' if pf>pa else 'losses' if pf<pa else 'ties';rec[out]+=1;rec[side+'_'+out]+=1;rec['points_for']+=pf;rec['points_against']+=pa
            if TEAMS[g[op]]['division_id']==t['division_id']:rec['division_'+out]+=1
            outcomes.append(out[0].upper() if out!='ties' else 'T')
        last=outcomes[-1];n=next((i for i,v in enumerate(reversed(outcomes)) if v!=last),len(outcomes));rec.update(streak=last+str(n),calculation_version='official-games-v1');standing.append(rec);standing_rows.append(1)
for row,d,cells in rows('Standings'):
    abbr=cells[0]
    if abbr not in TEAMS:continue
    t=TEAMS[abbr];rec={'id':uid('standing-source:1:'+abbr),'season_id':SID,'team_id':t['team_id'],'division_id':t['division_id'],'scope':'worksheet_mixed','source_kind':'workbook_cached','rank':None,**{k:None for k in statnum}}
    mapping={'W':'wins','L':'losses','T':'ties','Home W':'home_wins','Home L':'home_losses','Away W':'away_wins','Away L':'away_losses','Div W':'division_wins','Div L':'division_losses','Div T':'division_ties','PF':'points_for','PA':'points_against'}
    for src,targetcol in mapping.items():rec[targetcol]=int(d[src])
    rec.update(streak=d['STRK'],calculation_version=None);standing.append(rec);standing_rows.append(row)
emit(18,'source-baselines-and-standings',[ds('season_stat_snapshots',snapshots,sheet=lambda r,n: ('Standings' if r['entity_type']=='team' else 'PlayerStats',n),source_rows=snapshot_rows),ds('standing_snapshots',standing,sheet=lambda r,n: ('Games' if r['source_kind']=='official_games' else 'Standings',n),source_rows=standing_rows)],note='107 player + 10 team comparison baselines; official regular/postseason/combined standings kept separate from mixed worksheet totals.')
# 19: normalized settings joins with exact Screen/WR Screen alias; no settings activation.
settings=list(W['Settings'].iter_rows(values_only=True))
shapes={r[0]:r[1] if len(r)>1 else None for r in settings[145:164]}
routes=[];route_rows=[];routeids={}
for n,r in enumerate(settings[186:205],187):
    name='WR Screen' if r[0]=='Screen' else r[0];key=re.sub(r'[^a-z0-9]+','_',name.casefold()).strip('_');rid=uid('route:1:'+key);routeids[name]=rid
    routes.append({'id':rid,'settings_version_id':VERSION,'route_key':key,'display_name':name,'aliases_json':pack(['Screen'] if name=='WR Screen' else []),'complexity':r[1],'curve_type':r[7],'timing_modifier':r[2],'release_pct':r[3],'stem_pct':r[4],'break_pct':r[5],'sustain_pct':r[6],'preview_shape_json':pack({'shape':shapes.get(name),'units':'source route-shape prose; not executable coordinates'})});route_rows.append(n)
depths=[];depthrows=[];depthids={};bt={r[1]:r[2] for r in settings[206:215]}
for i,r in enumerate(settings[114:123]):
    did=uid('depth:1:'+r[1]);depthids[r[1]]=did
    depths.append({'id':did,'settings_version_id':VERSION,'depth_key':r[1],'display_name':r[1],'sort_order':i,'min_air_yards':int(r[2]),'max_air_yards':None if r[3]=='--' else int(r[3]),'base_time_to_open':bt[r[1]]});depthrows.append(115+i)
eligibility=[];eligible_rows=[]
for n,r in enumerate(settings[124:143],125):
    for i,depth in enumerate(settings[123][1:10],1):eligibility.append({'settings_version_id':VERSION,'route_id':routeids[r[0]],'route_depth_id':depthids[depth],'is_available':int(i<len(r) and r[i]==1)});eligible_rows.append(n)
curves=[];curve_rows=[]
for n,r in enumerate(settings[176:180],177):
    for i,progress in enumerate(settings[175][1:8],1):curves.append({'settings_version_id':VERSION,'curve_type':r[0],'progress_fraction':progress,'openness_score':r[i]});curve_rows.append(n)
emit(19,'normalized-route-settings',[ds('routes',routes,sheet='Settings',source_rows=route_rows,natural='t.settings_version_id=i.settings_version_id AND t.route_key=i.route_key'),ds('route_depths',depths,sheet='Settings',source_rows=depthrows,natural='t.settings_version_id=i.settings_version_id AND t.depth_key=i.depth_key'),ds('route_depth_eligibility',eligibility,('settings_version_id','route_id','route_depth_id'),'Settings',eligible_rows),ds('openness_curve_points',curves,('settings_version_id','curve_type','progress_fraction'),'Settings',curve_rows)],note='19 routes, 9 depths, 171 eligibility pairs, 28 curve points; draft settings remain draft.')

# 20: preserve stamped seeds and source-game dependencies, not newly recalculated seeds.
seeds=[];seed_rows=[];seedids={}
for n,d,_ in rows('Playoff Bracket'):
    division=uid('division:'+d['Division']);seed=int(d['Seed']);team=TEAMS[d['Team']]['team_id'];assert BY_TEAM[team]['division_id']==division
    seedid=uid('seed:1:'+d['Division']+':'+str(seed));seedids[(division,seed)]=(seedid,team)
    seeds.append({'id':seedid,'season_id':SID,'division_id':division,'seed':seed,'team_id':team,'seeded_at':None,'source_import_batch_id':None});seed_rows.append(n)
slots=[];slot_rows=[]
for (division,seed),(seedid,team) in seedids.items():
    if seed==1:
        slots.append({'id':uid('bracket:1:bye:'+division),'season_id':SID,'division_id':division,'round':'Divisionals','game_id':None,'side':'Bye','source_type':'bye','source_seed_id':seedid,'source_game_id':None,'resolved_team_id':team,'resolved_at':None});slot_rows.append(1)
for n,g in sorted(GAMES.items()):
    if not isinstance(g['week'],str):continue
    division=None if g['week']=='National Championship' else TEAMS[g['home']]['division_id']
    for side in ['home','away']:
        tid=TEAMS[g[side]]['team_id'];seed_source=None;game_source=None
        if g['week']=='Divisionals':seed_source=next(v[0] for (div,s),v in seedids.items() if div==division and v[1]==tid and s in (2,3))
        elif g['week']=='Divisional Championships' and seedids[(division,1)][1]==tid:seed_source=seedids[(division,1)][0]
        else:
            prior='Divisionals' if g['week']=='Divisional Championships' else 'Divisional Championships'
            upstream=[(num,gg) for num,gg in GAMES.items() if gg['week']==prior and TEAMS[gg['home' if gg['home_score']>gg['away_score'] else 'away']]['team_id']==tid]
            assert len(upstream)==1;game_source=uid('game:1:'+str(upstream[0][0]))
        slots.append({'id':uid('bracket:1:'+str(n)+':'+side),'season_id':SID,'division_id':division,'round':g['week'],'game_id':uid('game:1:'+str(n)),'side':side.title(),'source_type':'seed' if seed_source else 'winner','source_seed_id':seed_source,'source_game_id':game_source,'resolved_team_id':tid,'resolved_at':None});slot_rows.append(n+1)
emit(20,'playoff-bracket',[ds('playoff_seedings',seeds,sheet='Playoff Bracket',source_rows=seed_rows,natural='t.season_id=i.season_id AND (t.team_id=i.team_id OR (t.division_id=i.division_id AND t.seed=i.seed))'),ds('bracket_slots',slots,sheet=lambda r,n: ('Playoff Bracket',next(seed_rows[i] for i,ss in enumerate(seeds) if ss['id']==r['source_seed_id'])) if r['side']=='Bye' else ('Games',n),source_rows=slot_rows,natural='t.game_id=i.game_id AND t.side=i.side')],note='Six frozen seeds; two first-seed byes; ten resolved game-side slots.')

# 21: nominees and honors are existing selections; no AI calls or invented ballots/results.
awards=[];weights=[];nominations=[];nom_rows=[];runs=[];honors=[];honorselections=[];hon_rows=[];orders=collections.Counter();slot_orders=collections.Counter();award_team_notes=[]
for i,(code,title,count) in enumerate([('MVP','Most Valuable Player',8),('OPOY','Offensive Player of the Year',5),('DPOY','Defensive Player of the Year',5)]):
    aid=uid('award:'+code);awards.append({'id':aid,'code':code,'display_name':title,'nominee_count':count,'eligibility_json':pack({'source':'existing Awards nominees','exclude_qb':code=='OPOY'}),'sort_order':i})
    for place,points in enumerate([10,7,5,4,3,2,1,0][:count],1):weights.append({'award_id':aid,'settings_version_id':VERSION,'place':place,'points':points})
    runs.append({'id':uid('vote-run:1:'+code),'season_id':SID,'award_id':aid,'settings_version_id':VERSION,'status':'not_started','expected_ballots':125,'completed_ballots':0,'ai_job_id':None,'started_at':None,'completed_at':None})
def historical_team(pid,division=None):
    ev=[e for e in evidence.get(pid,[]) if e[0]<=65]
    if not ev:return None
    last=max(e[0] for e in ev);teams={e[1] for e in ev if e[0]==last}
    if len(teams)!=1:return None
    team=next(iter(teams))
    return team if division is None or BY_TEAM[team]['division_id']==division else None
awardrows=list(W['Awards'].iter_rows(values_only=True));awardformulas=list(F['Awards'].iter_rows(values_only=True))
for n,r in enumerate(awardrows[2:20],3):
    name,code=r[:2];assert all(v is None for v in r[2:10]);assert r[10]==0
    formula=awardformulas[n-1][10];assert isinstance(formula,str) and '*10' in formula and '*7' in formula and '*5' in formula
    pid=player(name);orders[code]+=1;team=historical_team(pid)
    nominations.append({'id':uid('nomination:1:'+code+':'+pid),'season_id':SID,'award_id':uid('award:'+code),'player_id':pid,'team_id':team,'nomination_order':orders[code],'selection_source':'Awards sheet; team inferred only from last recorded regular-season participation, otherwise NULL','ai_job_id':None,'nominated_at':None});nom_rows.append(n)
    if team is None:award_team_notes.append({'name':name,'kind':code,'reason':'No unambiguous last regular-season team; not replaced by PlayerTeams.'})
for n,r in enumerate(awardrows[24:58],25):
    if not r or r[0] is None:continue
    pos,side,division,name=r[:4];div=uid('division:'+division);slot_orders[(division,side)]+=1;slot=slot_orders[(division,side)];hid=uid('honor:1:'+division+':'+side+':'+str(slot));pid=player(name);team=historical_team(pid,div)
    honors.append({'id':hid,'season_id':SID,'division_id':div,'side':side,'slot_number':slot,'position_label':pos,'sort_order':n-25});honorselections.append({'slot_id':hid,'player_id':pid,'team_id':team,'selection_source':'Awards FIRST TEAMS; keep recorded division/slot/player; team from unambiguous matching historical participation only','ai_job_id':None,'selected_at':None});hon_rows.append(n)
    if team is None:award_team_notes.append({'name':name,'kind':division+' '+side+' '+pos,'reason':'No unambiguous matching-division last regular-season team; selection preserved, team NULL.'})
assert len(nominations)==18 and len(honors)==34
emit(21,'awards-and-first-teams',[ds('award_definitions',awards,sheet='Awards',natural='t.code=i.code'),ds('award_weights',weights,('award_id','settings_version_id','place'),'Awards'),ds('award_nominations',nominations,sheet='Awards',source_rows=nom_rows,natural='t.season_id=i.season_id AND t.award_id=i.award_id AND (t.player_id=i.player_id OR t.nomination_order=i.nomination_order)'),ds('award_vote_runs',runs,sheet='Awards',natural='t.season_id=i.season_id AND t.award_id=i.award_id'),ds('honor_slots',honors,sheet='Awards',source_rows=hon_rows,natural='t.season_id=i.season_id AND t.division_id=i.division_id AND t.side=i.side AND t.slot_number=i.slot_number'),ds('honor_selections',honorselections,('slot_id',),'Awards',hon_rows)],note='18 nominees, 34 honors; three NOT STARTED vote runs; 0 ballots, 0 winners. Exact workbook weights retained.')

# 22: exact source Markdown, IDs, publication fields and source stage.
articles=[];article_rows=[]
for n,d,_ in rows('Articles'):
    if not d.get('Id'):continue
    week=d['Week'];regular=isinstance(week,(int,float));num=int(d['GameId']) if d.get('GameId') is not None else None
    assert int(d['Season'])==1 and (num is None or num in GAMES)
    articles.append({'id':d['Id'],'season_id':SID,'game_id':uid('game:1:'+str(num)) if num else None,'stage':'regular' if regular else str(week),'regular_week':int(week) if regular else None,'article_type':d['Type'],'status':d['Status'],'title':d['Title'],'summary':d.get('Summary'),'markdown':d['Article'],'published_at':d.get('PublishedAt'),'is_featured':flag(d['Featured']),'hero_image_url':None});article_rows.append(n)
assert len(articles)==19
emit(22,'articles',[ds('articles',articles,sheet='Articles',source_rows=article_rows)],note='19 articles; exact IDs, Markdown including img tags, and publication timestamps retained.')

# 23: dormant coach data and a draft BOARD snapshot, not fabricated chronological picks.
coaches=[];coachratings=[];coach_rows=[]
for n,d,_ in rows('Coaches'):
    if not d.get('Name'):continue
    cid=uid('coach:'+d['Name'].casefold());coaches.append({'id':cid,'league_id':LEAGUE,'display_name':d['Name'],'coach_type':d['Type'],'image_url':d.get('Image'),'retired_at':None});coach_rows.append(n)
    coachratings.append({'id':uid('coach-rating:1:'+cid),'season_id':SID,'coach_id':cid,'version':1,'points_available':d.get('Pts to hand out'),'special_teams':d.get('SpclTeams'),'passing':d.get('Passing'),'running':d.get('Running'),'receiving':d.get('Recieving'),'defending':d.get('DB'),'tackling':d.get('Tackling'),'physical':d.get('strength training'),'conditioning':d.get('conditioning'),'attributes_json':pack({'linemen':d.get('Linemen'),'coaching_method':d.get('coaching method'),'clock_management':d.get('Clock management'),'source_headers_and_subheaders':'Coaches rows 1 and 2; allocations preserved, no active coaching feature'}),'effective_from':None})
draft_rows=list(W['Draft'].iter_rows(values_only=True));draft_formulas=list(F['Draft'].iter_rows(values_only=True))
board={'source_range':'Draft!A1:K38','cells':[[clean(v) for v in r[:11]] for r in draft_rows[:38]],'formulas':[[clean(v) if isinstance(v,str) and v.startswith('=') else None for v in r[:11]] for r in draft_formulas[:38]],'status':'reference only; duplicate names, spelling variants and error markers preserved; no inferred pick order or assignments'}
boards=[{'id':uid('draft-board:1:source'),'season_id':SID,'label':'Original workbook draft board (reference only)','source_import_batch_id':None,'source_range':'Draft!A1:K38','board_json':pack(board)}]
assert len(coaches)==20
emit(23,'coaches-and-draft-reference',[ds('coaches',coaches,sheet='Coaches',source_rows=coach_rows,natural='t.league_id=i.league_id AND t.display_name=i.display_name'),ds('coach_season_ratings',coachratings,sheet='Coaches',source_rows=coach_rows,natural='t.season_id=i.season_id AND t.coach_id=i.coach_id AND t.version=i.version'),ds('draft_board_snapshots',boards,sheet='Draft')],note='20 coaches + rating snapshots, 1 raw draft board; 0 coach assignments, 0 active drafts, 0 draft picks.')
# 10: DB Browser equivalent of the managed migration, with the exact CLI checksum.
migration_path=ROOT/'apps/api/src/db/migrations/0002_league_domains.sql'
migration_sql=migration_path.read_text().replace('\r\n','\n').lstrip('\ufeff');checksum=hashlib.sha256(migration_sql.encode()).hexdigest()
first_sql=(ROOT/'apps/api/src/db/migrations/0001_core.sql').read_text().replace('\r\n','\n').lstrip('\ufeff');first_hash=hashlib.sha256(first_sql.encode()).hexdigest()
newtables=re.findall(r'CREATE TABLE IF NOT EXISTS (\w+)',migration_sql)
upgrade=f'''-- 10: schema migration 0002, managed by the same ledger/checksum as npm run db:migrate.
-- Save pending edits and back up first. Run ENTIRE file; then Write Changes.
-- Alternatively, after updating app code, run npm run db:migrate instead of this file.
PRAGMA foreign_keys=ON;
SAVEPOINT afl_remaining_10;
CREATE TEMP TABLE afl_schema_guard(ok INTEGER);
CREATE TEMP TRIGGER afl_schema_check BEFORE INSERT ON afl_schema_guard BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM schema_migrations WHERE version=1 AND checksum={q(first_hash)}) THEN RAISE(ROLLBACK,'Missing or different foundation schema') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM schema_migrations WHERE version>2 OR (version=2 AND (name<>'0002_league_domains.sql' OR checksum<>{q(checksum)}))) THEN RAISE(ROLLBACK,'Unknown or different migration history') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM schema_migrations WHERE version=2) AND EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name IN ({','.join(q(n) for n in newtables)})) THEN RAISE(ROLLBACK,'Unmanaged destination tables exist; reconcile first') END;
END;
INSERT INTO afl_schema_guard VALUES(1);
'''+migration_sql+f'''
INSERT INTO schema_migrations(version,name,checksum) VALUES(2,'0002_league_domains.sql',{q(checksum)}) ON CONFLICT(version) DO NOTHING;
DROP TRIGGER afl_schema_check;
DROP TABLE afl_schema_guard;
RELEASE SAVEPOINT afl_remaining_10;
-- DB Browser commits pending changes before PRAGMA assignments. Keep this OUTSIDE our savepoint.
PRAGMA user_version=2;
SELECT version,name FROM schema_migrations ORDER BY version;
'''
(OUT/'10-schema-upgrade.sql').write_text(upgrade)
# Add provenance to the link update, without changing an already-saved archive.
p16=OUT/'16-final-play-links.sql';s16=p16.read_text();b16=uid('batch:'+SHA+':remaining-v1:16-final-play-links')
record={'id':b16,'source_filename':SOURCE.name,'source_sha256':SHA,'importer_version':'remaining-snapshot-v1-16-final-play-links','status':'imported','counts_json':pack({'final_play_links':70}),'reconciliation_json':pack({'source':'last play by per-game workbook order; no clocks/scores changed'})}
s16=s16.replace('DROP TRIGGER afl_links_check;',insert('import_batches',list(record),[record]).rstrip(';\n')+' ON CONFLICT(id) DO NOTHING;\nDROP TRIGGER afl_links_check;');p16.write_text(s16)
# Catalog counts and source policies are sufficient to inspect without executing any script.
manifest={'source_filename':SOURCE.name,'source_sha256':SHA,'schema_version':2,'migration_checksum':checksum,'league_id':LEAGUE,'season_id':SID,'files':[{'file':'10-schema-upgrade.sql','counts':{'new_tables':len(newtables)},'note':'Exact managed schema migration 2.'}]+CATALOG,'source_turnover_corrections':corrections,'award_team_inference_notes':award_team_notes,'historical_team_policy':'Per-play possession/role/line evidence; never retroactively assigned from PlayerTeams. Award teams use last unambiguous regular-season participation or NULL.','empty_by_design':['game_player_state','coach_team_assignments','drafts','draft_picks','award_ballots','ballot_rankings','award_results','ai_jobs'],'excluded_source_data':['OLDGames','OLDPlayHistory','test analyses and design/prototype sheets; retain original workbook backup']}
(OUT/'preview.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
(OUT/'turnover-reconciliation.json').write_text(json.dumps(corrections,indent=2))
print('Created',len(CATALOG)+1,'numbered imports; participants',len(participants),'line matchups',len(matchups),'source turnover corrections',len(corrections),'award team notes',award_team_notes)
for file in sorted(OUT.glob('[0-9][0-9]-*.sql')):print(file.name,round(file.stat().st_size/1024/1024,2),'MiB')
# 24: read-only completion checks. The first nine imports are included in the totals.
expected_counts={'leagues':1,'divisions':2,'teams':10,'players':107,'seasons':1,'team_seasons':10,'player_season_ratings':107,'player_team_assignments':107,'games':70,'game_state':70,'plays':9575,'play_details':9575,'play_participants':23811,'play_line_matchups':32343,'play_stat_deltas':123766,'player_game_stats':1237,'team_game_stats':140,'season_stat_snapshots':117,'standing_snapshots':36,'configuration_tables':38,'settings_versions':1,'routes':19,'route_depths':9,'route_depth_eligibility':171,'openness_curve_points':28,'app_preferences':1,'playoff_seedings':6,'bracket_slots':12,'award_definitions':3,'award_weights':18,'award_nominations':18,'award_vote_runs':3,'honor_slots':34,'honor_selections':34,'articles':19,'coaches':20,'coach_season_ratings':20,'draft_board_snapshots':1,'player_aliases':107,'schema_migrations':2,'import_batches':22,'source_record_mappings':76396,'game_player_state':0,'coach_team_assignments':0,'drafts':0,'draft_picks':0,'award_ballots':0,'ballot_rankings':0,'award_results':0,'ai_jobs':0,'audit_log':0}
checks=[f"SELECT {q(table)} AS check_name,{count} AS expected,(SELECT count(*) FROM {table}) AS actual" for table,count in expected_counts.items()]
checks += [f"SELECT 'final play links',70,(SELECT count(*) FROM game_state WHERE phase='final' AND last_play_id IS NOT NULL)", "SELECT 'tables',51,(SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%')", "SELECT 'foreign-key violations',0,(SELECT count(*) FROM pragma_foreign_key_check)", "SELECT 'incomplete award winners',0,(SELECT count(*) FROM award_rankings)",f"SELECT 'managed schema checksum',1,(SELECT count(*) FROM schema_migrations WHERE version=2 AND checksum={q(checksum)})", "SELECT 'integrity errors',0,(SELECT count(*) FROM pragma_integrity_check WHERE integrity_check<>'ok')"]
(OUT/'24-verify-complete-import.sql').write_text('-- Read-only verification for this exact snapshot. All rows should show OK.\nWITH checks AS (\n'+'\nUNION ALL\n'.join(checks)+"\n) SELECT check_name,expected,actual,CASE WHEN expected=actual THEN 'OK' ELSE 'CHECK' END AS result FROM checks ORDER BY check_name;\n")
manifest['expected_table_counts']=expected_counts
manifest['files'].append({'file':'24-verify-complete-import.sql','counts':{},'note':'Read-only; every check should say OK for this snapshot.'})
(OUT/'preview.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
