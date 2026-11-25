import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import {openDatabase,resolveDatabasePath,type DatabaseConnection} from "./connection.js";
import {loadMigrations,migrateDatabase,migration,migrationHistory,verifyMigrationHistory} from "./migrations.js";
import {backupDatabase,restoreDatabase,checkDatabase,databaseStatus} from "./management.js";
import {commitPlay,StaleGameStateError} from "./gameTransactions.js";
function fixture(t:{after:(fn:()=>void)=>void}){
 const directory=mkdtempSync(path.join(tmpdir(),"Football Game SQLite "));const filename=path.join(directory,"league.sqlite");
 const db=openDatabase({filename});t.after(()=>{if(db.open)db.close();rmSync(directory,{recursive:true,force:true});});
 migrateDatabase(db);return {directory,filename,db};
}
function seed(db:DatabaseConnection){db.exec(`
 INSERT INTO leagues(id,name) VALUES('l','AFL');
 INSERT INTO divisions(id,league_id,name) VALUES('d','l','East');
 INSERT INTO teams(id,league_id) VALUES('h','l'),('a','l');
 INSERT INTO seasons(id,league_id,season_number,display_name) VALUES('s','l',1,'Season 1');
 INSERT INTO team_seasons(id,season_id,team_id,division_id,abbreviation,nickname) VALUES('hs','s','h','d','H','Home'),('as','s','a','d','A','Away');
 INSERT INTO players(id,league_id,display_name) VALUES('p','l','Player');
 INSERT INTO games(id,season_id,legacy_game_number,stage,regular_week,home_team_id,away_team_id,status) VALUES('g','s',1,'regular',1,'h','a','live');
 INSERT INTO game_state(game_id,phase,possession_team_id) VALUES('g','playing','h');`);}
const addPlay=(db:DatabaseConnection,id='play-1',sequence=1)=>db.prepare("INSERT INTO plays(id,game_id,sequence,period_before,play_type,yards) VALUES(?,'g',?,1,'Run',4)").run(id,sequence);
test('initial schema is persistent, enforces foreign keys, uses WAL and initializes repeatedly',t=>{
 const {db}=fixture(t),s=databaseStatus(db);assert.equal(s.schemaVersion,1);assert.equal(s.journalMode,'wal');assert.equal(s.foreignKeys,1);assert.ok(s.tables.length>=20);
 assert.deepEqual(migrateDatabase(db),[]);assert.equal(migrationHistory(db).length,1);assert.deepEqual(checkDatabase(db),{integrity:'ok',foreignKeyViolations:0});
});
test('database defaults use platform application data and explicit locations',()=>{
 assert.equal(resolveDatabasePath({databasePath:'',platform:'win32',homeDirectory:'C:\\Users\\Test',localAppData:'C:\\Users\\Test\\AppData\\Local'}),'C:\\Users\\Test\\AppData\\Local\\FootballGame\\data\\football.sqlite');
 assert.equal(resolveDatabasePath({databasePath:'',platform:'linux',homeDirectory:'/users/test',dataHome:'/users/test/data'}),'/users/test/data/FootballGame/data/football.sqlite');assert.equal(resolveDatabasePath({databasePath:':memory:'}),':memory:');
});
test('failed schema migration rolls back all pending tables and history',()=>{
 const db=openDatabase({filename:':memory:'});try{assert.throws(()=>migrateDatabase(db,[migration(1,'0001_good.sql','CREATE TABLE good(id TEXT);'),migration(2,'0002_bad.sql','CREATE TABLE bad(;')]));assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE name='good'").get(),undefined);assert.deepEqual(migrationHistory(db),[]);}finally{db.close();}
});
test('schema checksums tolerate CRLF, apply upgrades once, and reject edited or unknown history',t=>{
 assert.equal(migration(1,'x','SELECT 1;\r\n').checksum,migration(1,'x','SELECT 1;\n').checksum);
 const {db}=fixture(t),base=loadMigrations(),up=[...base,migration(2,'0002_more.sql','CREATE TABLE extra(id TEXT PRIMARY KEY);')];assert.deepEqual(migrateDatabase(db,up),['0002_more.sql']);assert.deepEqual(migrateDatabase(db,up),[]);
 assert.throws(()=>verifyMigrationHistory(db),/newer|unknown/);assert.throws(()=>migrateDatabase(db,[{...base[0],checksum:'changed'},up[1]]),/changed/);assert.throws(()=>migrateDatabase(db,[base[0],migration(3,'gap','SELECT 1')]),/contiguous/);
});
test('missing readonly paths are not created and unmanaged databases are preserved',t=>{
 const dir=mkdtempSync(path.join(tmpdir(),'sqlite-other-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));const filename=path.join(dir,'missing.sqlite');assert.throws(()=>openDatabase({filename,readonly:true}),/not found/);assert.equal(existsSync(filename),false);
 const db=openDatabase({filename});try{db.exec("CREATE TABLE other(value TEXT); INSERT INTO other VALUES('keep')");assert.throws(()=>migrateDatabase(db),/no Football Game/);assert.deepEqual(db.prepare('SELECT value FROM other').get(),{value:'keep'});}finally{db.close();}
});
test('constraints protect references, schedule, clock, JSON and zero versus NULL traits',t=>{
 const {db}=fixture(t);seed(db);assert.throws(()=>db.exec("INSERT INTO teams(id,league_id) VALUES('bad','unknown')"),/FOREIGN KEY/);assert.throws(()=>db.exec("INSERT INTO games(id,season_id,stage,regular_week,home_team_id,away_team_id) VALUES('bad','s','regular',1,'h','h')"),/CHECK/);assert.throws(()=>db.exec("UPDATE game_state SET seconds_remaining=901 WHERE game_id='g'"),/CHECK/);
 db.exec("INSERT INTO player_season_ratings(id,season_id,player_id,version,speed) VALUES('r','s','p',1,0)");assert.deepEqual(db.prepare('SELECT speed,accuracy FROM player_season_ratings').get(),{speed:0,accuracy:null});addPlay(db);assert.throws(()=>db.exec("INSERT INTO play_details(play_id,run_log_json) VALUES('play-1','invalid json')"),/CHECK/);
});
test('roster intervals reject overlaps but allow adjacent transfers and free agents',t=>{
 const {db}=fixture(t);seed(db);db.exec("INSERT INTO player_team_assignments(id,season_id,player_id,team_id,effective_from,effective_until) VALUES('r1','s','p','h','2026-01-01','2026-02-01')");assert.throws(()=>db.exec("INSERT INTO player_team_assignments(id,season_id,player_id,team_id,effective_from) VALUES('bad','s','p','a','2026-01-15')"),/Overlapping/);
 db.exec("INSERT INTO player_team_assignments(id,season_id,player_id,team_id,effective_from) VALUES('r2','s','p',NULL,'2026-02-01')");assert.throws(()=>db.exec("UPDATE player_team_assignments SET effective_from='2026-01-31' WHERE id='r2'"),/Overlapping/);assert.deepEqual(db.prepare('SELECT count(*) AS n FROM player_team_assignments').get(),{n:2});
});
test('play commits deduplicate, reject stale state and roll back failed saves',t=>{
 const {db}=fixture(t);seed(db);let calls=0;const req={gameId:'g',playId:'play-1',expectedVersion:0};
 assert.equal(commitPlay(db,req,c=>{calls++;addPlay(c);c.exec("UPDATE game_state SET down=2 WHERE game_id='g'");}).version,1);assert.equal(commitPlay(db,req,()=>{calls++;}).duplicate,true);assert.equal(calls,1);
 assert.throws(()=>commitPlay(db,{...req,playId:'p2'},()=>{}),StaleGameStateError);assert.throws(()=>commitPlay(db,{...req,playId:'p2',expectedVersion:1},c=>{addPlay(c,'p2',2);c.exec("UPDATE game_state SET home_score=7 WHERE game_id='g'");throw new Error('save failed');}),/save failed/);
 assert.equal(db.prepare("SELECT 1 FROM plays WHERE id='p2'").get(),undefined);assert.deepEqual(db.prepare("SELECT version,home_score,last_play_id FROM game_state WHERE game_id='g'").get(),{version:1,home_score:0,last_play_id:'play-1'});db.exec("UPDATE games SET status='final' WHERE id='g'");assert.throws(()=>commitPlay(db,{...req,playId:'after',expectedVersion:1},()=>{}),/final game/);assert.equal(commitPlay(db,req,()=>{}).duplicate,true);
});
test('a callback that omits its promised play cannot increment the game version',t=>{
 const {db}=fixture(t);seed(db);assert.throws(()=>commitPlay(db,{gameId:'g',playId:'missing',expectedVersion:0},()=>{}),/did not insert/);assert.deepEqual(db.prepare("SELECT version FROM game_state WHERE game_id='g'").get(),{version:0});
});
test('online backup and restore include WAL data and cannot overwrite an existing file',async t=>{
 const {db,directory}=fixture(t);seed(db);addPlay(db);const backup=await backupDatabase(db,path.join(directory,'backup.sqlite'));const b=openDatabase({filename:backup,readonly:true});try{assert.deepEqual(b.prepare('SELECT count(*) AS n FROM plays').get(),{n:1});assert.deepEqual(checkDatabase(b),{integrity:'ok',foreignKeyViolations:0});}finally{b.close();}const original=readFileSync(backup);await assert.rejects(()=>backupDatabase(db,backup),/EEXIST|existing journal files/);assert.deepEqual(readFileSync(backup),original);
 const restored=await restoreDatabase(backup,path.join(directory,'restored.sqlite')),r=openDatabase({filename:restored,readonly:true});try{assert.deepEqual(r.prepare('SELECT count(*) AS n FROM plays').get(),{n:1});}finally{r.close();}
 const keep=path.join(directory,'keep.sqlite');writeFileSync(keep,'keep');await assert.rejects(()=>restoreDatabase(backup,keep),/new destination/);assert.equal(readFileSync(keep,'utf8'),'keep');
});
test('reused legacy game numbers in another season are separate; play IDs and last-play links remain game-specific',t=>{
 const {db}=fixture(t);seed(db);
 db.exec(`INSERT INTO seasons(id,league_id,season_number,display_name) VALUES('s2','l',2,'Season 2');
 INSERT INTO team_seasons(id,season_id,team_id,division_id,abbreviation,nickname) VALUES('hs2','s2','h','d','H','Home'),('as2','s2','a','d','A','Away');
 INSERT INTO games(id,season_id,legacy_game_number,stage,regular_week,home_team_id,away_team_id,status) VALUES('g2','s2',1,'regular',1,'h','a','live');
 INSERT INTO game_state(game_id,phase,possession_team_id) VALUES('g2','playing','a');`);
 commitPlay(db,{gameId:'g',playId:'global-play',expectedVersion:0},c=>addPlay(c,'global-play'));
 assert.throws(()=>commitPlay(db,{gameId:'g2',playId:'global-play',expectedVersion:0},()=>{}),/another game/);
 assert.throws(()=>db.exec("UPDATE game_state SET last_play_id='global-play' WHERE game_id='g2'"),/FOREIGN KEY/);
 assert.deepEqual(db.prepare("SELECT version,last_play_id FROM game_state WHERE game_id='g2'").get(),{version:0,last_play_id:null});
 commitPlay(db,{gameId:'g2',playId:'season-two-play',expectedVersion:0},c=>c.exec("INSERT INTO plays(id,game_id,sequence,period_before,play_type,yards) VALUES('season-two-play','g2',1,1,'Pass',7)"));
 assert.deepEqual(db.prepare('SELECT count(*) AS n FROM plays').get(),{n:2});
});
