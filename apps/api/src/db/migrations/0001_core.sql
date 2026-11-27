-- Core storage foundation. Workbook import, summaries and postseason services follow in later migrations.
CREATE TABLE leagues (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE TABLE divisions (
  id TEXT PRIMARY KEY NOT NULL,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(league_id, name)
) STRICT;
CREATE TABLE teams (
  id TEXT PRIMARY KEY NOT NULL,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE RESTRICT,
  legacy_team_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  retired_at TEXT,
  UNIQUE(league_id, legacy_team_id)
) STRICT;
CREATE TABLE settings_versions (
  id TEXT PRIMARY KEY NOT NULL,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK(version > 0),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','retired')),
  content_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  activated_at TEXT,
  UNIQUE(league_id, version)
) STRICT;
CREATE TABLE seasons (
  id TEXT PRIMARY KEY NOT NULL,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE RESTRICT,
  season_number INTEGER NOT NULL CHECK(season_number > 0),
  display_name TEXT NOT NULL,
  display_year INTEGER,
  status TEXT NOT NULL DEFAULT 'setup' CHECK(status IN ('setup','regular','postseason','awards_pending','finalized')),
  current_stage TEXT NOT NULL DEFAULT 'regular',
  current_week INTEGER CHECK(current_week BETWEEN 1 AND 13),
  settings_version_id TEXT REFERENCES settings_versions(id) ON DELETE RESTRICT,
  started_at TEXT,
  games_completed_at TEXT,
  finalized_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(league_id, season_number)
) STRICT;
CREATE TABLE team_seasons (
  id TEXT PRIMARY KEY NOT NULL,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
  abbreviation TEXT NOT NULL,
  location TEXT,
  nickname TEXT NOT NULL,
  logo_url TEXT,
  home_jersey_url TEXT,
  away_jersey_url TEXT,
  home_uniform_url TEXT,
  away_uniform_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  third_color TEXT,
  cap_space REAL,
  UNIQUE(season_id, team_id),
  UNIQUE(season_id, abbreviation)
) STRICT;
CREATE TABLE players (
  id TEXT PRIMARY KEY NOT NULL,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL CHECK(length(trim(display_name)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  retired_at TEXT
) STRICT;
CREATE INDEX players_name ON players(league_id, display_name COLLATE NOCASE);
CREATE TABLE player_aliases (
  id TEXT PRIMARY KEY NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  source TEXT,
  UNIQUE(player_id, normalized_alias)
) STRICT;
CREATE INDEX player_alias_lookup ON player_aliases(normalized_alias);
CREATE TABLE player_season_ratings (
  id TEXT PRIMARY KEY NOT NULL,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK(version > 0),
  offense_position TEXT,
  defense_position TEXT,
  offense_stars REAL,
  defense_stars REAL,
  size REAL, strength REAL, speed REAL, stamina REAL, poise REAL,
  accuracy REAL, arm_strength REAL, read_defense REAL, juke REAL, vision REAL,
  acceleration REAL, route_running REAL, jump REAL, hands REAL, ball_security REAL,
  run_blocking REAL, pass_protection REAL, run_stop REAL, tackling REAL,
  strip REAL, pass_rush REAL, ball_hawk REAL, read_qb REAL, coverage REAL,
  qb_favorite REAL, run_defense REAL, tackle_chance REAL, sack_chance REAL,
  image_url TEXT, image_translate_x REAL, image_translate_y REAL, image_scale REAL,
  overall_rating REAL, overall_rating_formula_version TEXT,
  effective_from TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(season_id, player_id, version)
) STRICT;
CREATE TABLE player_team_assignments (
  id TEXT PRIMARY KEY NOT NULL,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  effective_from TEXT NOT NULL CHECK(julianday(effective_from) IS NOT NULL),
  effective_until TEXT CHECK(effective_until IS NULL OR (julianday(effective_until) IS NOT NULL AND julianday(effective_until) > julianday(effective_from))),
  source TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','planned','cancelled')),
  FOREIGN KEY(season_id, team_id) REFERENCES team_seasons(season_id, team_id) ON DELETE RESTRICT
) STRICT;
CREATE UNIQUE INDEX roster_one_open_assignment ON player_team_assignments(season_id, player_id)
  WHERE effective_until IS NULL AND status = 'active';
CREATE INDEX roster_team ON player_team_assignments(season_id, team_id, effective_from);
CREATE TRIGGER roster_no_overlap_insert BEFORE INSERT ON player_team_assignments
WHEN NEW.status = 'active' AND EXISTS (
  SELECT 1 FROM player_team_assignments a WHERE a.season_id = NEW.season_id AND a.player_id = NEW.player_id AND a.status = 'active'
  AND (a.effective_until IS NULL OR julianday(NEW.effective_from) < julianday(a.effective_until))
  AND (NEW.effective_until IS NULL OR julianday(a.effective_from) < julianday(NEW.effective_until))
) BEGIN SELECT RAISE(ABORT, 'Overlapping player roster assignment'); END;
CREATE TRIGGER roster_no_overlap_update BEFORE UPDATE ON player_team_assignments
WHEN NEW.status = 'active' AND EXISTS (
  SELECT 1 FROM player_team_assignments a WHERE a.id <> NEW.id AND a.season_id = NEW.season_id AND a.player_id = NEW.player_id AND a.status = 'active'
  AND (a.effective_until IS NULL OR julianday(NEW.effective_from) < julianday(a.effective_until))
  AND (NEW.effective_until IS NULL OR julianday(a.effective_from) < julianday(NEW.effective_until))
) BEGIN SELECT RAISE(ABORT, 'Overlapping player roster assignment'); END;
CREATE TABLE configuration_tables (
  id TEXT PRIMARY KEY NOT NULL,
  settings_version_id TEXT NOT NULL REFERENCES settings_versions(id) ON DELETE RESTRICT,
  table_key TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK(schema_version > 0),
  units_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(units_json)),
  values_json TEXT NOT NULL CHECK(json_valid(values_json)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
  UNIQUE(settings_version_id, table_key)
) STRICT;
CREATE TABLE games (
  id TEXT PRIMARY KEY NOT NULL,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  legacy_game_number INTEGER,
  stage TEXT NOT NULL CHECK(stage IN ('regular','playoffs')),
  regular_week INTEGER CHECK(regular_week BETWEEN 1 AND 13),
  playoff_round TEXT CHECK(playoff_round IN ('Divisionals','Divisional Championships','National Championship')),
  home_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','live','final')),
  kickoff_at_utc TEXT, kickoff_source_local TEXT, kickoff_timezone TEXT,
  network TEXT, weather_text TEXT, venue_name TEXT,
  is_neutral_site INTEGER NOT NULL DEFAULT 0 CHECK(is_neutral_site IN (0,1)),
  field_branding_key TEXT,
  settings_version_id TEXT REFERENCES settings_versions(id) ON DELETE RESTRICT,
  engine_version TEXT, started_at TEXT, ended_at TEXT,
  CHECK(home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id),
  CHECK((stage = 'regular' AND regular_week IS NOT NULL AND playoff_round IS NULL) OR (stage = 'playoffs' AND playoff_round IS NOT NULL AND regular_week IS NULL)),
  CHECK(status = 'scheduled' OR (home_team_id IS NOT NULL AND away_team_id IS NOT NULL)),
  UNIQUE(season_id, legacy_game_number),
  FOREIGN KEY(season_id, home_team_id) REFERENCES team_seasons(season_id, team_id) ON DELETE RESTRICT,
  FOREIGN KEY(season_id, away_team_id) REFERENCES team_seasons(season_id, team_id) ON DELETE RESTRICT
) STRICT;
CREATE INDEX games_schedule ON games(season_id, stage, regular_week, status);
CREATE INDEX games_home ON games(season_id, home_team_id);
CREATE INDEX games_away ON games(season_id, away_team_id);
CREATE TABLE plays (
  id TEXT PRIMARY KEY NOT NULL,
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  sequence INTEGER NOT NULL CHECK(sequence > 0),
  period_before INTEGER NOT NULL CHECK(period_before > 0),
  seconds_before REAL CHECK(seconds_before BETWEEN 0 AND 900),
  period_after INTEGER CHECK(period_after > 0),
  seconds_after REAL CHECK(seconds_after BETWEEN 0 AND 900),
  offense_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  defense_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  down_before INTEGER CHECK(down_before BETWEEN 1 AND 4), distance_before REAL,
  ball_before REAL CHECK(ball_before BETWEEN 0 AND 100),
  down_after INTEGER CHECK(down_after BETWEEN 1 AND 4), distance_after REAL,
  ball_after REAL CHECK(ball_after BETWEEN 0 AND 100), drive_start REAL,
  play_type TEXT NOT NULL,
  yards REAL NOT NULL,
  air_yards REAL, yac REAL,
  result TEXT, defense_result TEXT,
  is_complete INTEGER CHECK(is_complete IN (0,1)),
  is_sack INTEGER CHECK(is_sack IN (0,1)),
  is_first_down INTEGER CHECK(is_first_down IN (0,1)),
  is_touchdown INTEGER CHECK(is_touchdown IN (0,1)),
  is_safety INTEGER CHECK(is_safety IN (0,1)),
  is_fumble INTEGER CHECK(is_fumble IN (0,1)),
  fumble_lost INTEGER CHECK(fumble_lost IN (0,1)),
  is_turnover INTEGER CHECK(is_turnover IN (0,1)),
  turnover_type TEXT, home_score_after INTEGER CHECK(home_score_after >= 0), away_score_after INTEGER CHECK(away_score_after >= 0),
  description_raw TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(game_id, sequence),
  UNIQUE(game_id, id)
) STRICT;
CREATE TABLE game_state (
  game_id TEXT PRIMARY KEY NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
  phase TEXT NOT NULL DEFAULT 'pregame' CHECK(phase IN ('pregame','awaiting_toss','playing','pending_conversion','halftime','final')),
  period INTEGER NOT NULL DEFAULT 1 CHECK(period > 0),
  seconds_remaining REAL NOT NULL DEFAULT 900 CHECK(seconds_remaining BETWEEN 0 AND 900),
  home_score INTEGER NOT NULL DEFAULT 0 CHECK(home_score >= 0),
  away_score INTEGER NOT NULL DEFAULT 0 CHECK(away_score >= 0),
  possession_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  down INTEGER CHECK(down BETWEEN 1 AND 4), distance REAL CHECK(distance >= 0),
  ball_on REAL CHECK(ball_on BETWEEN 0 AND 100), drive_start REAL, previous_ball_on REAL,
  home_timeouts INTEGER NOT NULL DEFAULT 3 CHECK(home_timeouts BETWEEN 0 AND 3),
  away_timeouts INTEGER NOT NULL DEFAULT 3 CHECK(away_timeouts BETWEEN 0 AND 3),
  opening_receiving_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  pending_conversion_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  pending_action TEXT,
  overtime_period INTEGER CHECK(overtime_period > 0),
  overtime_phase TEXT CHECK(overtime_phase IN ('toss','playing','final')),
  overtime_first_receiving_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  overtime_home_initial_possession_completed INTEGER NOT NULL DEFAULT 0 CHECK(overtime_home_initial_possession_completed IN (0,1)),
  overtime_away_initial_possession_completed INTEGER NOT NULL DEFAULT 0 CHECK(overtime_away_initial_possession_completed IN (0,1)),
  last_play_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(game_id, last_play_id) REFERENCES plays(game_id, id) ON DELETE RESTRICT
) STRICT;
CREATE TABLE game_player_state (
  game_id TEXT NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE RESTRICT,
  rating_snapshot_id TEXT REFERENCES player_season_ratings(id) ON DELETE RESTRICT,
  energy REAL, temporary_fatigue REAL,
  current_position TEXT,
  state_json TEXT CHECK(state_json IS NULL OR json_valid(state_json)),
  last_play_sequence INTEGER CHECK(last_play_sequence >= 0),
  PRIMARY KEY(game_id, player_id)
) STRICT;
CREATE TABLE play_participants (
  id TEXT PRIMARY KEY NOT NULL,
  play_id TEXT NOT NULL REFERENCES plays(id) ON DELETE RESTRICT,
  player_id TEXT REFERENCES players(id) ON DELETE RESTRICT,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  role TEXT NOT NULL,
  position_slot TEXT,
  participation_source TEXT,
  UNIQUE(play_id, player_id, team_id, role)
) STRICT;
CREATE INDEX participants_player ON play_participants(player_id, play_id, role);
CREATE TABLE play_line_matchups (
  id TEXT PRIMARY KEY NOT NULL,
  play_id TEXT NOT NULL REFERENCES plays(id) ON DELETE RESTRICT,
  matchup_number INTEGER NOT NULL CHECK(matchup_number >= 0),
  offense_player_id TEXT REFERENCES players(id) ON DELETE RESTRICT,
  defense_player_id TEXT REFERENCES players(id) ON DELETE RESTRICT,
  offense_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  defense_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  offense_slot TEXT, defense_slot TEXT,
  winner_side TEXT CHECK(winner_side IN ('OL','DL')),
  detail_json TEXT CHECK(detail_json IS NULL OR json_valid(detail_json)),
  UNIQUE(play_id, matchup_number)
) STRICT;
CREATE TABLE play_details (
  play_id TEXT PRIMARY KEY NOT NULL REFERENCES plays(id) ON DELETE RESTRICT,
  defense_predicted TEXT,
  prediction_correct INTEGER CHECK(prediction_correct IN (0,1)),
  ol_wins INTEGER CHECK(ol_wins >= 0), ol_losses INTEGER CHECK(ol_losses >= 0),
  dl_wins INTEGER CHECK(dl_wins >= 0), dl_losses INTEGER CHECK(dl_losses >= 0),
  jukes INTEGER CHECK(jukes >= 0), trucks INTEGER CHECK(trucks >= 0), broken_tackles INTEGER CHECK(broken_tackles >= 0),
  stop_reason TEXT,
  run_log_json TEXT CHECK(run_log_json IS NULL OR json_valid(run_log_json)),
  fatigue_recovery_json TEXT CHECK(fatigue_recovery_json IS NULL OR json_valid(fatigue_recovery_json)),
  animation_json TEXT CHECK(animation_json IS NULL OR json_valid(animation_json)),
  resolution_audit_json TEXT CHECK(resolution_audit_json IS NULL OR json_valid(resolution_audit_json)),
  original_payload_json TEXT CHECK(original_payload_json IS NULL OR json_valid(original_payload_json))
) STRICT;
CREATE TABLE app_preferences (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL CHECK(json_valid(value_json)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE TABLE import_batches (
  id TEXT PRIMARY KEY NOT NULL,
  source_filename TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  source_snapshot_at TEXT,
  importer_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('staging','validated','imported','failed')),
  counts_json TEXT CHECK(counts_json IS NULL OR json_valid(counts_json)),
  reconciliation_json TEXT CHECK(reconciliation_json IS NULL OR json_valid(reconciliation_json)),
  imported_at TEXT,
  UNIQUE(source_sha256, importer_version)
) STRICT;
CREATE TABLE source_record_mappings (
  id TEXT PRIMARY KEY NOT NULL,
  import_batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE RESTRICT,
  source_sheet TEXT NOT NULL,
  source_row INTEGER NOT NULL CHECK(source_row > 0),
  source_legacy_key TEXT,
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  original_record_json TEXT CHECK(original_record_json IS NULL OR json_valid(original_record_json)),
  UNIQUE(import_batch_id, source_sheet, source_row, target_table, target_id)
) STRICT;
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  season_id TEXT REFERENCES seasons(id) ON DELETE RESTRICT,
  game_id TEXT REFERENCES games(id) ON DELETE RESTRICT,
  before_json TEXT CHECK(before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK(after_json IS NULL OR json_valid(after_json)),
  reason TEXT,
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX audit_entity ON audit_log(entity_type, entity_id, occurred_at);
CREATE TABLE ai_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE RESTRICT,
  job_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('pending','running','completed','failed')),
  provider TEXT NOT NULL, model TEXT, prompt_version TEXT,
  input_hash TEXT,
  input_json TEXT CHECK(input_json IS NULL OR json_valid(input_json)),
  output_json TEXT CHECK(output_json IS NULL OR json_valid(output_json)),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
  lease_owner TEXT, lease_expires_at TEXT, error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  started_at TEXT, completed_at TEXT
) STRICT;
CREATE INDEX ai_jobs_pending ON ai_jobs(status, lease_expires_at);
