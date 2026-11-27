-- Correct CURRENT Season 1 roster to the user's reviewed 107-player list.
-- Back up the database. In DB Browser click Write Changes before running.
-- Execute this WHOLE file, then click Write Changes and Close Database.
-- No PRAGMA assignments: DB Browser can commit savepoints on PRAGMA writes.
-- Blank team = an explicit unassigned (NULL team_id) roster assignment.
-- Bad active assignments are retained as cancelled records with audit history.
-- Past games, play participants, player/team game stats and other seasons stay intact.
-- Identical reruns do nothing; unresolved names/teams roll back the entire correction.
SAVEPOINT afl_roster_correction;
CREATE TEMP TABLE afl_roster_context AS
SELECT '97808f43-a0d5-5251-bf8d-fae1643c8258' AS season_id,
       strftime('%Y-%m-%dT%H:%M:%fZ','now') AS effective_at;
CREATE TEMP TABLE afl_roster_input(player_name TEXT PRIMARY KEY COLLATE NOCASE, abbreviation TEXT);
INSERT INTO afl_roster_input(player_name,abbreviation) VALUES
('RBI Bear','ABQ'),
('Tweety','CLT'),
('Marine Bear','COL'),
('John','RIC'),
('Leon Gory','NAS'),
('Micro','SAC'),
('Woodstock','MIL'),
('Olaf','SAN'),
('Ernie','NAS'),
('Big Boy','POR'),
('Duncan','TAL'),
('Piglet','RIC'),
('C Monster','POR'),
('Junior','RIC'),
('Baby','RIC'),
('Bobo','SAN'),
('Toad','TAL'),
('Blackie','TAL'),
('Ezekiel','POR'),
('Luke','SAN'),
('Koala','NAS'),
('BMC','RIC'),
('Dog','MIL'),
('Kiwi','SAC'),
('Rory',NULL),
('Rat','CLT'),
('Joey','TAL'),
('Trunky','MIL'),
('McGilla','ABQ'),
('T''Challa','CLT'),
('Otter',NULL),
('Black Dog','COL'),
('Eyeore',NULL),
('Jack','SAC'),
('Garfield','TAL'),
('Tiberius','POR'),
('Ming','ABQ'),
('Rolf','ABQ'),
('Mini','NAS'),
('Moose','SAC'),
('McJagger','MIL'),
('Ralph','RIC'),
('PullFrog','COL'),
('Tigger','CLT'),
('David','TAL'),
('Skunkers','ABQ'),
('Old Lion',NULL),
('Barnsworth','NAS'),
('Jimbo','CLT'),
('Brownie','RIC'),
('Nathan','SAN'),
('EMC','COL'),
('Hippo','POR'),
('NL Bear','COL'),
('Streak','SAC'),
('Dolphin','ABQ'),
('NS Bear','MIL'),
('Babe TreeClimbers','CLT'),
('Tom','MIL'),
('Monkey','TAL'),
('FlyingFish','COL'),
('Lil Slushie','CLT'),
('Zinger',NULL),
('Clipper','SAN'),
('SEMC','SAN'),
('Wasabi','POR'),
('Oliver','NAS'),
('Leo','POR'),
('Snout',NULL),
('Monkey Boo',NULL),
('O''sheep','RIC'),
('Jumbo','SAC'),
('Gregg','SAN'),
('Recycle',NULL),
('Groose',NULL),
('Pooh',NULL),
('Duckie','TAL'),
('Jerry',NULL),
('Zippy',NULL),
('Brion',NULL),
('Fuzz','SAN'),
('Kelso','NAS'),
('Buzz','CLT'),
('Fire Bear','ABQ'),
('Percy','SAC'),
('Jelly','NAS'),
('Mama',NULL),
('Bulldog','TAL'),
('Beaks',NULL),
('Frog','POR'),
('Doodle','COL'),
('Spider',NULL),
('Rusty','SAC'),
('Banjo','COL'),
('King Tiger','SAN'),
('Armadillo','MIL'),
('Sloth','NAS'),
('Kenny',NULL),
('Carl','COL'),
('Biz','SAC'),
('GreyBird','MIL'),
('Yankee','MIL'),
('BlackBird','CLT'),
('Wookie','RIC'),
('Joe the Shark','POR'),
('Bevo','ABQ'),
('Bunny',NULL);
CREATE TEMP TABLE afl_roster_guard(ok INTEGER);
CREATE TEMP TRIGGER afl_roster_validate BEFORE INSERT ON afl_roster_guard BEGIN
 SELECT CASE WHEN (SELECT count(*) FROM seasons WHERE id=(SELECT season_id FROM afl_roster_context))<>1
 THEN RAISE(ROLLBACK,'Roster correction: Season 1 not found. Check the selected database.') END;
 SELECT CASE WHEN (SELECT count(*) FROM afl_roster_input)<>107
 THEN RAISE(ROLLBACK,'Roster correction: expected exactly 107 distinct player names.') END;
 SELECT CASE WHEN EXISTS (
   SELECT 1 FROM afl_roster_input i WHERE
   (SELECT count(*) FROM players p JOIN seasons s ON s.league_id=p.league_id
    WHERE s.id=(SELECT season_id FROM afl_roster_context) AND p.display_name=i.player_name COLLATE NOCASE)<>1)
 THEN RAISE(ROLLBACK,'Roster correction: a player is missing or ambiguous. No assignments changed.') END;
 SELECT CASE WHEN EXISTS (
   SELECT 1 FROM afl_roster_input i WHERE i.abbreviation IS NOT NULL AND
   (SELECT count(*) FROM team_seasons t WHERE t.season_id=(SELECT season_id FROM afl_roster_context)
    AND t.abbreviation=i.abbreviation COLLATE NOCASE)<>1)
 THEN RAISE(ROLLBACK,'Roster correction: a team is missing or ambiguous. No assignments changed.') END;
END;
INSERT INTO afl_roster_guard VALUES(1);
CREATE TEMP TABLE afl_roster_resolved AS
SELECT p.id AS player_id,i.player_name,t.team_id,c.season_id,c.effective_at
FROM afl_roster_input i CROSS JOIN afl_roster_context c
JOIN seasons s ON s.id=c.season_id
JOIN players p ON p.league_id=s.league_id AND p.display_name=i.player_name COLLATE NOCASE
LEFT JOIN team_seasons t ON t.season_id=c.season_id AND t.abbreviation=i.abbreviation COLLATE NOCASE;
CREATE TEMP TABLE afl_roster_changes AS
SELECT r.* FROM afl_roster_resolved r WHERE NOT EXISTS (
 SELECT 1 FROM player_team_assignments a WHERE a.season_id=r.season_id AND a.player_id=r.player_id
 AND a.status='active' AND a.team_id IS r.team_id
 AND julianday(a.effective_from)<=julianday(r.effective_at) AND a.effective_until IS NULL
);
-- Audit every superseded active assignment before cancelling it. These are
-- corrections to imported roster data, not invented historical player trades.
INSERT INTO audit_log(id,action,actor,entity_type,entity_id,season_id,before_json,after_json,reason)
SELECT lower(hex(randomblob(16))),'roster_assignment_corrected','manual-reviewed-roster',
 'player_team_assignment',a.id,a.season_id,
 json_object('player_id',a.player_id,'team_id',a.team_id,'status',a.status,'source',a.source,
             'effective_from',a.effective_from,'effective_until',a.effective_until),
 json_object('player_id',a.player_id,'team_id',a.team_id,'status','cancelled'),
 'Superseded incorrect current roster using the user-reviewed Season 1 list.'
FROM player_team_assignments a JOIN afl_roster_changes r ON r.season_id=a.season_id AND r.player_id=a.player_id
WHERE a.status='active' AND (a.effective_until IS NULL OR julianday(a.effective_until)>julianday(r.effective_at));
UPDATE player_team_assignments SET status='cancelled'
WHERE status='active' AND EXISTS (
 SELECT 1 FROM afl_roster_changes r WHERE r.season_id=player_team_assignments.season_id AND r.player_id=player_team_assignments.player_id
 AND (player_team_assignments.effective_until IS NULL OR julianday(player_team_assignments.effective_until)>julianday(r.effective_at))
);
INSERT INTO player_team_assignments(id,season_id,player_id,team_id,effective_from,status,source)
SELECT lower(hex(randomblob(16))),season_id,player_id,team_id,effective_at,'active',
 'User-reviewed Season 1 roster correction (107 names)'
FROM afl_roster_changes;
INSERT INTO audit_log(id,action,actor,entity_type,entity_id,season_id,after_json,reason)
SELECT lower(hex(randomblob(16))),'roster_assignment_created','manual-reviewed-roster',
 'player_team_assignment',a.id,a.season_id,
 json_object('player_id',a.player_id,'team_id',a.team_id,'status',a.status,'effective_from',a.effective_from),
 'Applied the user-reviewed roster; NULL team_id explicitly means unassigned.'
FROM player_team_assignments a JOIN afl_roster_changes r ON r.season_id=a.season_id AND r.player_id=a.player_id
WHERE a.status='active' AND a.effective_from=r.effective_at;
CREATE TEMP TRIGGER afl_roster_check_result BEFORE INSERT ON afl_roster_guard BEGIN
 SELECT CASE WHEN EXISTS (
 SELECT 1 FROM afl_roster_resolved r WHERE
 (SELECT count(*) FROM player_team_assignments a WHERE a.season_id=r.season_id AND a.player_id=r.player_id
  AND a.status='active' AND a.team_id IS r.team_id
  AND julianday(a.effective_from)<=julianday(r.effective_at)
  AND (a.effective_until IS NULL OR julianday(a.effective_until)>julianday(r.effective_at)))<>1)
 THEN RAISE(ROLLBACK,'Roster verification failed. The entire correction was rolled back.') END;
END;
INSERT INTO afl_roster_guard VALUES(2);
-- Summary: expect players_checked=107, assigned=89, unassigned=18.
SELECT count(*) AS players_checked,sum(team_id IS NOT NULL) AS assigned,
       sum(team_id IS NULL) AS unassigned,
       (SELECT count(*) FROM afl_roster_changes) AS assignments_corrected
FROM afl_roster_resolved;
-- Final roster, shown by team then player. This is the same effective-date rule as the API.
SELECT r.player_name AS Player,coalesce(t.abbreviation,'UNASSIGNED') AS Team,t.nickname AS Team_Name
FROM afl_roster_resolved r LEFT JOIN team_seasons t ON t.season_id=r.season_id AND t.team_id=r.team_id
ORDER BY t.abbreviation,r.player_name;
DROP TRIGGER afl_roster_check_result;
DROP TRIGGER afl_roster_validate;
DROP TABLE afl_roster_guard;
DROP TABLE afl_roster_changes;
DROP TABLE afl_roster_resolved;
DROP TABLE afl_roster_input;
DROP TABLE afl_roster_context;
RELEASE SAVEPOINT afl_roster_correction;
-- Keep this last so DB Browser displays the corrected current roster.
SELECT p.display_name AS Player,coalesce(t.abbreviation,'UNASSIGNED') AS Team,t.nickname AS Team_Name
FROM players p JOIN seasons s ON s.league_id=p.league_id
LEFT JOIN player_team_assignments a ON a.player_id=p.id AND a.season_id=s.id AND a.status='active'
 AND julianday(a.effective_from)<=julianday('now')
 AND (a.effective_until IS NULL OR julianday(a.effective_until)>julianday('now'))
LEFT JOIN team_seasons t ON t.season_id=a.season_id AND t.team_id=a.team_id
WHERE s.id='97808f43-a0d5-5251-bf8d-fae1643c8258'
ORDER BY t.abbreviation,p.display_name;
