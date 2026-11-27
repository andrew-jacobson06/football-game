# Implemented SQLite tables and columns

Schema version 2: 51 tables, including the migration ledger. Generated from the actual SQL migrations. Nullable historical metrics distinguish unknown from zero.

## ai_jobs

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| job_type | TEXT | No |  |
| idempotency_key | TEXT | No |  |
| status | TEXT | No |  |
| provider | TEXT | No |  |
| model | TEXT | Yes |  |
| prompt_version | TEXT | Yes |  |
| input_hash | TEXT | Yes |  |
| input_json | TEXT | Yes |  |
| output_json | TEXT | Yes |  |
| attempt_count | INTEGER | No |  |
| lease_owner | TEXT | Yes |  |
| lease_expires_at | TEXT | Yes |  |
| error_message | TEXT | Yes |  |
| created_at | TEXT | No |  |
| started_at | TEXT | Yes |  |
| completed_at | TEXT | Yes |  |

## app_preferences

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| key | TEXT | No | 1 |
| value_json | TEXT | No |  |
| updated_at | TEXT | No |  |

## articles

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| game_id | TEXT | Yes |  |
| stage | TEXT | No |  |
| regular_week | INTEGER | Yes |  |
| article_type | TEXT | No |  |
| status | TEXT | No |  |
| title | TEXT | No |  |
| summary | TEXT | Yes |  |
| markdown | TEXT | No |  |
| published_at | TEXT | Yes |  |
| is_featured | INTEGER | No |  |
| hero_image_url | TEXT | Yes |  |
| created_at | TEXT | No |  |
| updated_at | TEXT | No |  |

## audit_log

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| action | TEXT | No |  |
| actor | TEXT | Yes |  |
| entity_type | TEXT | No |  |
| entity_id | TEXT | Yes |  |
| season_id | TEXT | Yes |  |
| game_id | TEXT | Yes |  |
| before_json | TEXT | Yes |  |
| after_json | TEXT | Yes |  |
| reason | TEXT | Yes |  |
| occurred_at | TEXT | No |  |

## award_ballots

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| vote_run_id | TEXT | No |  |
| ballot_number | INTEGER | No |  |
| recorded_at | TEXT | No |  |

## award_definitions

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| code | TEXT | No |  |
| display_name | TEXT | No |  |
| nominee_count | INTEGER | No |  |
| eligibility_json | TEXT | No |  |
| sort_order | INTEGER | No |  |

## award_nominations

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| award_id | TEXT | No |  |
| player_id | TEXT | No |  |
| team_id | TEXT | Yes |  |
| nomination_order | INTEGER | No |  |
| selection_source | TEXT | No |  |
| ai_job_id | TEXT | Yes |  |
| nominated_at | TEXT | Yes |  |

## award_results

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| vote_run_id | TEXT | No |  |
| nomination_id | TEXT | No |  |
| total_points | REAL | No |  |
| final_rank | INTEGER | No |  |
| is_winner | INTEGER | No |  |
| is_tied | INTEGER | No |  |
| finalized_at | TEXT | Yes |  |

## award_vote_runs

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| award_id | TEXT | No |  |
| settings_version_id | TEXT | No |  |
| status | TEXT | No |  |
| expected_ballots | INTEGER | No |  |
| completed_ballots | INTEGER | No |  |
| ai_job_id | TEXT | Yes |  |
| started_at | TEXT | Yes |  |
| completed_at | TEXT | Yes |  |

## award_weights

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| award_id | TEXT | No | 1 |
| settings_version_id | TEXT | No | 2 |
| place | INTEGER | No | 3 |
| points | REAL | No |  |

## ballot_rankings

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| ballot_id | TEXT | No | 1 |
| place | INTEGER | No | 2 |
| nomination_id | TEXT | No |  |

## bracket_slots

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| division_id | TEXT | Yes |  |
| round | TEXT | No |  |
| game_id | TEXT | Yes |  |
| side | TEXT | No |  |
| source_type | TEXT | No |  |
| source_seed_id | TEXT | Yes |  |
| source_game_id | TEXT | Yes |  |
| resolved_team_id | TEXT | Yes |  |
| resolved_at | TEXT | Yes |  |

## coach_season_ratings

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| coach_id | TEXT | No |  |
| version | INTEGER | No |  |
| points_available | REAL | Yes |  |
| special_teams | REAL | Yes |  |
| passing | REAL | Yes |  |
| running | REAL | Yes |  |
| receiving | REAL | Yes |  |
| defending | REAL | Yes |  |
| tackling | REAL | Yes |  |
| physical | REAL | Yes |  |
| conditioning | REAL | Yes |  |
| attributes_json | TEXT | No |  |
| effective_from | TEXT | Yes |  |

## coach_team_assignments

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| coach_id | TEXT | No |  |
| team_id | TEXT | No |  |
| role | TEXT | No |  |
| effective_from | TEXT | No |  |
| effective_until | TEXT | Yes |  |

## coaches

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| league_id | TEXT | No |  |
| display_name | TEXT | No |  |
| coach_type | TEXT | Yes |  |
| image_url | TEXT | Yes |  |
| created_at | TEXT | No |  |
| retired_at | TEXT | Yes |  |

## configuration_tables

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| settings_version_id | TEXT | No |  |
| table_key | TEXT | No |  |
| schema_version | INTEGER | No |  |
| units_json | TEXT | No |  |
| values_json | TEXT | No |  |
| is_active | INTEGER | No |  |

## divisions

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| league_id | TEXT | No |  |
| name | TEXT | No |  |
| display_order | INTEGER | No |  |

## draft_board_snapshots

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| label | TEXT | No |  |
| source_import_batch_id | TEXT | Yes |  |
| source_range | TEXT | No |  |
| board_json | TEXT | No |  |
| captured_at | TEXT | No |  |

## draft_picks

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| draft_id | TEXT | No |  |
| round | INTEGER | No |  |
| pick_in_round | INTEGER | No |  |
| overall_pick | INTEGER | No |  |
| original_team_id | TEXT | No |  |
| selecting_team_id | TEXT | No |  |
| player_id | TEXT | Yes |  |
| picked_at | TEXT | Yes |  |

## drafts

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| status | TEXT | No |  |
| round_count | INTEGER | Yes |  |
| order_rules_json | TEXT | Yes |  |
| started_at | TEXT | Yes |  |
| completed_at | TEXT | Yes |  |

## game_player_state

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| game_id | TEXT | No | 1 |
| player_id | TEXT | No | 2 |
| rating_snapshot_id | TEXT | Yes |  |
| energy | REAL | Yes |  |
| temporary_fatigue | REAL | Yes |  |
| current_position | TEXT | Yes |  |
| state_json | TEXT | Yes |  |
| last_play_sequence | INTEGER | Yes |  |

## game_state

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| game_id | TEXT | No | 1 |
| version | INTEGER | No |  |
| phase | TEXT | No |  |
| period | INTEGER | No |  |
| seconds_remaining | REAL | No |  |
| home_score | INTEGER | No |  |
| away_score | INTEGER | No |  |
| possession_team_id | TEXT | Yes |  |
| down | INTEGER | Yes |  |
| distance | REAL | Yes |  |
| ball_on | REAL | Yes |  |
| drive_start | REAL | Yes |  |
| previous_ball_on | REAL | Yes |  |
| home_timeouts | INTEGER | No |  |
| away_timeouts | INTEGER | No |  |
| opening_receiving_team_id | TEXT | Yes |  |
| pending_conversion_team_id | TEXT | Yes |  |
| pending_action | TEXT | Yes |  |
| overtime_period | INTEGER | Yes |  |
| overtime_phase | TEXT | Yes |  |
| overtime_first_receiving_team_id | TEXT | Yes |  |
| overtime_home_initial_possession_completed | INTEGER | No |  |
| overtime_away_initial_possession_completed | INTEGER | No |  |
| last_play_id | TEXT | Yes |  |
| updated_at | TEXT | No |  |

## games

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| legacy_game_number | INTEGER | Yes |  |
| stage | TEXT | No |  |
| regular_week | INTEGER | Yes |  |
| playoff_round | TEXT | Yes |  |
| home_team_id | TEXT | Yes |  |
| away_team_id | TEXT | Yes |  |
| status | TEXT | No |  |
| kickoff_at_utc | TEXT | Yes |  |
| kickoff_source_local | TEXT | Yes |  |
| kickoff_timezone | TEXT | Yes |  |
| network | TEXT | Yes |  |
| weather_text | TEXT | Yes |  |
| venue_name | TEXT | Yes |  |
| is_neutral_site | INTEGER | No |  |
| field_branding_key | TEXT | Yes |  |
| settings_version_id | TEXT | Yes |  |
| engine_version | TEXT | Yes |  |
| started_at | TEXT | Yes |  |
| ended_at | TEXT | Yes |  |

## honor_selections

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| slot_id | TEXT | No | 1 |
| player_id | TEXT | No |  |
| team_id | TEXT | Yes |  |
| selection_source | TEXT | No |  |
| ai_job_id | TEXT | Yes |  |
| selected_at | TEXT | Yes |  |

## honor_slots

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| division_id | TEXT | No |  |
| side | TEXT | No |  |
| slot_number | INTEGER | No |  |
| position_label | TEXT | No |  |
| sort_order | INTEGER | No |  |

## import_batches

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| source_filename | TEXT | No |  |
| source_sha256 | TEXT | No |  |
| source_snapshot_at | TEXT | Yes |  |
| importer_version | TEXT | No |  |
| status | TEXT | No |  |
| counts_json | TEXT | Yes |  |
| reconciliation_json | TEXT | Yes |  |
| imported_at | TEXT | Yes |  |

## leagues

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| name | TEXT | No |  |
| created_at | TEXT | No |  |

## openness_curve_points

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| settings_version_id | TEXT | No | 1 |
| curve_type | TEXT | No | 2 |
| progress_fraction | REAL | No | 3 |
| openness_score | REAL | No |  |

## play_details

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| play_id | TEXT | No | 1 |
| defense_predicted | TEXT | Yes |  |
| prediction_correct | INTEGER | Yes |  |
| ol_wins | INTEGER | Yes |  |
| ol_losses | INTEGER | Yes |  |
| dl_wins | INTEGER | Yes |  |
| dl_losses | INTEGER | Yes |  |
| jukes | INTEGER | Yes |  |
| trucks | INTEGER | Yes |  |
| broken_tackles | INTEGER | Yes |  |
| stop_reason | TEXT | Yes |  |
| run_log_json | TEXT | Yes |  |
| fatigue_recovery_json | TEXT | Yes |  |
| animation_json | TEXT | Yes |  |
| resolution_audit_json | TEXT | Yes |  |
| original_payload_json | TEXT | Yes |  |

## play_line_matchups

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| play_id | TEXT | No |  |
| matchup_number | INTEGER | No |  |
| offense_player_id | TEXT | Yes |  |
| defense_player_id | TEXT | Yes |  |
| offense_team_id | TEXT | Yes |  |
| defense_team_id | TEXT | Yes |  |
| offense_slot | TEXT | Yes |  |
| defense_slot | TEXT | Yes |  |
| winner_side | TEXT | Yes |  |
| detail_json | TEXT | Yes |  |

## play_participants

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| play_id | TEXT | No |  |
| player_id | TEXT | Yes |  |
| team_id | TEXT | No |  |
| role | TEXT | No |  |
| position_slot | TEXT | Yes |  |
| participation_source | TEXT | Yes |  |

## play_stat_deltas

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| play_id | TEXT | No |  |
| player_id | TEXT | Yes |  |
| team_id | TEXT | No |  |
| metric_key | TEXT | No |  |
| amount | REAL | No |  |
| calculation_version | TEXT | No |  |
| created_at | TEXT | No |  |

## player_aliases

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| player_id | TEXT | No |  |
| alias | TEXT | No |  |
| normalized_alias | TEXT | No |  |
| source | TEXT | Yes |  |

## player_game_stats

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| game_id | TEXT | No | 1 |
| team_id | TEXT | No | 3 |
| player_id | TEXT | No | 2 |
| carries | REAL | Yes |  |
| rushing_yards | REAL | Yes |  |
| rushing_touchdowns | REAL | Yes |  |
| rushing_fumbles | REAL | Yes |  |
| rushing_fumbles_lost | REAL | Yes |  |
| rushing_first_downs | REAL | Yes |  |
| jukes | REAL | Yes |  |
| broken_tackles | REAL | Yes |  |
| negative_rushes | REAL | Yes |  |
| rushes_5_plus | REAL | Yes |  |
| rushes_10_plus | REAL | Yes |  |
| rushes_20_plus | REAL | Yes |  |
| rushes_30_plus | REAL | Yes |  |
| rushes_50_plus | REAL | Yes |  |
| longest_rush | REAL | Yes |  |
| ol_wins | REAL | Yes |  |
| ol_losses | REAL | Yes |  |
| lead_blocks | REAL | Yes |  |
| dl_wins | REAL | Yes |  |
| dl_losses | REAL | Yes |  |
| tackles | REAL | Yes |  |
| tackles_for_loss | REAL | Yes |  |
| defensive_sacks | REAL | Yes |  |
| forced_fumbles | REAL | Yes |  |
| fumble_recoveries | REAL | Yes |  |
| defensive_interceptions | REAL | Yes |  |
| deflections | REAL | Yes |  |
| fumble_return_yards | REAL | Yes |  |
| fumble_return_touchdowns | REAL | Yes |  |
| interception_return_yards | REAL | Yes |  |
| interception_return_touchdowns | REAL | Yes |  |
| safeties_forced | REAL | Yes |  |
| targets | REAL | Yes |  |
| receptions | REAL | Yes |  |
| receiving_yards | REAL | Yes |  |
| receiving_touchdowns | REAL | Yes |  |
| receiving_first_downs | REAL | Yes |  |
| receiving_fumbles | REAL | Yes |  |
| receiving_fumbles_lost | REAL | Yes |  |
| yac | REAL | Yes |  |
| longest_reception | REAL | Yes |  |
| receptions_20_plus | REAL | Yes |  |
| passing_attempts | REAL | Yes |  |
| passing_completions | REAL | Yes |  |
| passing_yards | REAL | Yes |  |
| passing_touchdowns | REAL | Yes |  |
| interceptions_thrown | REAL | Yes |  |
| sacks_taken | REAL | Yes |  |
| sack_yards_lost | REAL | Yes |  |
| longest_pass | REAL | Yes |  |
| participation_verified | INTEGER | No |  |
| metric_availability_json | TEXT | No |  |
| calculation_version | TEXT | No |  |
| source_game_version | INTEGER | No |  |
| calculated_at | TEXT | No |  |

## player_season_ratings

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| player_id | TEXT | No |  |
| version | INTEGER | No |  |
| offense_position | TEXT | Yes |  |
| defense_position | TEXT | Yes |  |
| offense_stars | REAL | Yes |  |
| defense_stars | REAL | Yes |  |
| size | REAL | Yes |  |
| strength | REAL | Yes |  |
| speed | REAL | Yes |  |
| stamina | REAL | Yes |  |
| poise | REAL | Yes |  |
| accuracy | REAL | Yes |  |
| arm_strength | REAL | Yes |  |
| read_defense | REAL | Yes |  |
| juke | REAL | Yes |  |
| vision | REAL | Yes |  |
| acceleration | REAL | Yes |  |
| route_running | REAL | Yes |  |
| jump | REAL | Yes |  |
| hands | REAL | Yes |  |
| ball_security | REAL | Yes |  |
| run_blocking | REAL | Yes |  |
| pass_protection | REAL | Yes |  |
| run_stop | REAL | Yes |  |
| tackling | REAL | Yes |  |
| strip | REAL | Yes |  |
| pass_rush | REAL | Yes |  |
| ball_hawk | REAL | Yes |  |
| read_qb | REAL | Yes |  |
| coverage | REAL | Yes |  |
| qb_favorite | REAL | Yes |  |
| run_defense | REAL | Yes |  |
| tackle_chance | REAL | Yes |  |
| sack_chance | REAL | Yes |  |
| image_url | TEXT | Yes |  |
| image_translate_x | REAL | Yes |  |
| image_translate_y | REAL | Yes |  |
| image_scale | REAL | Yes |  |
| overall_rating | REAL | Yes |  |
| overall_rating_formula_version | TEXT | Yes |  |
| effective_from | TEXT | Yes |  |
| created_at | TEXT | No |  |

## player_team_assignments

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| player_id | TEXT | No |  |
| team_id | TEXT | Yes |  |
| effective_from | TEXT | No |  |
| effective_until | TEXT | Yes |  |
| source | TEXT | Yes |  |
| status | TEXT | No |  |

## players

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| league_id | TEXT | No |  |
| display_name | TEXT | No |  |
| created_at | TEXT | No |  |
| retired_at | TEXT | Yes |  |

## playoff_seedings

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| division_id | TEXT | No |  |
| seed | INTEGER | No |  |
| team_id | TEXT | No |  |
| seeded_at | TEXT | Yes |  |
| source_import_batch_id | TEXT | Yes |  |

## plays

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| game_id | TEXT | No |  |
| sequence | INTEGER | No |  |
| period_before | INTEGER | No |  |
| seconds_before | REAL | Yes |  |
| period_after | INTEGER | Yes |  |
| seconds_after | REAL | Yes |  |
| offense_team_id | TEXT | Yes |  |
| defense_team_id | TEXT | Yes |  |
| down_before | INTEGER | Yes |  |
| distance_before | REAL | Yes |  |
| ball_before | REAL | Yes |  |
| down_after | INTEGER | Yes |  |
| distance_after | REAL | Yes |  |
| ball_after | REAL | Yes |  |
| drive_start | REAL | Yes |  |
| play_type | TEXT | No |  |
| yards | REAL | No |  |
| air_yards | REAL | Yes |  |
| yac | REAL | Yes |  |
| result | TEXT | Yes |  |
| defense_result | TEXT | Yes |  |
| is_complete | INTEGER | Yes |  |
| is_sack | INTEGER | Yes |  |
| is_first_down | INTEGER | Yes |  |
| is_touchdown | INTEGER | Yes |  |
| is_safety | INTEGER | Yes |  |
| is_fumble | INTEGER | Yes |  |
| fumble_lost | INTEGER | Yes |  |
| is_turnover | INTEGER | Yes |  |
| turnover_type | TEXT | Yes |  |
| home_score_after | INTEGER | Yes |  |
| away_score_after | INTEGER | Yes |  |
| description_raw | TEXT | Yes |  |
| created_at | TEXT | No |  |

## route_depth_eligibility

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| settings_version_id | TEXT | No | 1 |
| route_id | TEXT | No | 2 |
| route_depth_id | TEXT | No | 3 |
| is_available | INTEGER | No |  |

## route_depths

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| settings_version_id | TEXT | No |  |
| depth_key | TEXT | No |  |
| display_name | TEXT | No |  |
| sort_order | INTEGER | No |  |
| min_air_yards | INTEGER | No |  |
| max_air_yards | INTEGER | Yes |  |
| base_time_to_open | REAL | No |  |

## routes

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| settings_version_id | TEXT | No |  |
| route_key | TEXT | No |  |
| display_name | TEXT | No |  |
| aliases_json | TEXT | No |  |
| complexity | TEXT | Yes |  |
| curve_type | TEXT | No |  |
| timing_modifier | REAL | No |  |
| release_pct | REAL | No |  |
| stem_pct | REAL | No |  |
| break_pct | REAL | No |  |
| sustain_pct | REAL | No |  |
| preview_shape_json | TEXT | Yes |  |

## schema_migrations

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| version | INTEGER | No | 1 |
| name | TEXT | No |  |
| checksum | TEXT | No |  |
| applied_at | TEXT | No |  |

## season_stat_snapshots

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| scope | TEXT | No |  |
| entity_type | TEXT | No |  |
| player_id | TEXT | Yes |  |
| team_id | TEXT | Yes |  |
| source_kind | TEXT | No |  |
| calculation_version | TEXT | Yes |  |
| totals_json | TEXT | No |  |
| source_import_batch_id | TEXT | Yes |  |
| captured_at | TEXT | No |  |

## seasons

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| league_id | TEXT | No |  |
| season_number | INTEGER | No |  |
| display_name | TEXT | No |  |
| display_year | INTEGER | Yes |  |
| status | TEXT | No |  |
| current_stage | TEXT | No |  |
| current_week | INTEGER | Yes |  |
| settings_version_id | TEXT | Yes |  |
| started_at | TEXT | Yes |  |
| games_completed_at | TEXT | Yes |  |
| finalized_at | TEXT | Yes |  |
| created_at | TEXT | No |  |
| updated_at | TEXT | No |  |

## settings_versions

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| league_id | TEXT | No |  |
| version | INTEGER | No |  |
| label | TEXT | No |  |
| status | TEXT | No |  |
| content_hash | TEXT | Yes |  |
| created_at | TEXT | No |  |
| activated_at | TEXT | Yes |  |

## source_record_mappings

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| import_batch_id | TEXT | No |  |
| source_sheet | TEXT | No |  |
| source_row | INTEGER | No |  |
| source_legacy_key | TEXT | Yes |  |
| target_table | TEXT | No |  |
| target_id | TEXT | No |  |
| original_record_json | TEXT | Yes |  |

## standing_snapshots

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| team_id | TEXT | No |  |
| division_id | TEXT | No |  |
| scope | TEXT | No |  |
| source_kind | TEXT | No |  |
| rank | INTEGER | Yes |  |
| wins | INTEGER | Yes |  |
| losses | INTEGER | Yes |  |
| ties | INTEGER | Yes |  |
| home_wins | INTEGER | Yes |  |
| home_losses | INTEGER | Yes |  |
| home_ties | INTEGER | Yes |  |
| away_wins | INTEGER | Yes |  |
| away_losses | INTEGER | Yes |  |
| away_ties | INTEGER | Yes |  |
| division_wins | INTEGER | Yes |  |
| division_losses | INTEGER | Yes |  |
| division_ties | INTEGER | Yes |  |
| points_for | INTEGER | Yes |  |
| points_against | INTEGER | Yes |  |
| streak | TEXT | Yes |  |
| calculation_version | TEXT | Yes |  |
| captured_at | TEXT | No |  |

## team_game_stats

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| game_id | TEXT | No | 1 |
| team_id | TEXT | No | 2 |
| opponent_team_id | TEXT | No |  |
| plays | REAL | Yes |  |
| drives | REAL | Yes |  |
| first_downs | REAL | Yes |  |
| rushing_attempts | REAL | Yes |  |
| rushing_yards | REAL | Yes |  |
| rushing_touchdowns | REAL | Yes |  |
| passing_attempts | REAL | Yes |  |
| passing_completions | REAL | Yes |  |
| passing_yards | REAL | Yes |  |
| passing_touchdowns | REAL | Yes |  |
| sacks_taken | REAL | Yes |  |
| sack_yards_lost | REAL | Yes |  |
| interceptions_thrown | REAL | Yes |  |
| fumbles | REAL | Yes |  |
| fumbles_lost | REAL | Yes |  |
| offensive_yac | REAL | Yes |  |
| defensive_sacks | REAL | Yes |  |
| tackles | REAL | Yes |  |
| tackles_for_loss | REAL | Yes |  |
| interceptions_made | REAL | Yes |  |
| fumbles_recovered | REAL | Yes |  |
| deflections | REAL | Yes |  |
| safeties_forced | REAL | Yes |  |
| field_goal_attempts | REAL | Yes |  |
| field_goals_made | REAL | Yes |  |
| extra_point_attempts | REAL | Yes |  |
| extra_points_made | REAL | Yes |  |
| two_point_attempts | REAL | Yes |  |
| two_points_made | REAL | Yes |  |
| punts | REAL | Yes |  |
| possession_seconds | REAL | Yes |  |
| metric_availability_json | TEXT | No |  |
| calculation_version | TEXT | No |  |
| source_game_version | INTEGER | No |  |
| calculated_at | TEXT | No |  |

## team_seasons

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| season_id | TEXT | No |  |
| team_id | TEXT | No |  |
| division_id | TEXT | No |  |
| abbreviation | TEXT | No |  |
| location | TEXT | Yes |  |
| nickname | TEXT | No |  |
| logo_url | TEXT | Yes |  |
| home_jersey_url | TEXT | Yes |  |
| away_jersey_url | TEXT | Yes |  |
| home_uniform_url | TEXT | Yes |  |
| away_uniform_url | TEXT | Yes |  |
| primary_color | TEXT | Yes |  |
| secondary_color | TEXT | Yes |  |
| third_color | TEXT | Yes |  |
| cap_space | REAL | Yes |  |

## teams

| Column | Type | Nullable | Primary key |
| --- | --- | --- | --- |
| id | TEXT | No | 1 |
| league_id | TEXT | No |  |
| legacy_team_id | TEXT | Yes |  |
| created_at | TEXT | No |  |
| retired_at | TEXT | Yes |  |

## Views

- `award_rankings`
- `award_vote_totals`
- `player_career_stats`
- `player_season_stats`
- `scoped_team_game_results`
- `season_standings`
- `team_game_results`
- `team_game_statistics`
- `team_season_stats`
